defmodule OpalCore.SocialFlow.CuratorPack do
  @moduledoc """
  Assembles a permissioned curator context for "pick people → Opal curates."

  Accessors used (read-only):
  - `DurablePreferenceMemory.facts_for_participants/1` — explicit durable place/food prefs
  - `DurablePreferenceMemory.list_for_owners/1` — underlying private RelationshipMemory rows
  - `MemoryIntelligence.candidates_for_context/2` — viewer-only A4 candidates (boundaries/prefs)
  - recent_visits / history_rejected — **ABSENT as a durable store**; passed through from opts only

  Privacy:
  - Durable prefs are `permission_class: owner_private`.
  - Other people's prefs enter the pack only as private participant slots for RI scoring.
  - They never land in a shared soft_prefs / shared disclosure layer.
  - Viewer may receive private_reasons downstream when RI `include_private_reasons` is set;
    the pack itself does not invent a shared copy of another person's prefs.

  Does not rank people. Does not invent venues. Does not commit SharedPlan.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.MemoryIntelligence

  @doc """
  Build curator pack for `user_ids` as seen by `viewer_user_id`.

  opts (keyword or map):
  - `:relationship_context` — "friends" | "partner" | "family" | ...
  - `:hard_constraints` — map merged into pack
  - `:recent_visits` / `:history_rejected` — optional lists (no server store yet)
  - `:activity` — forwarded for A4 candidate filter
  """
  def assemble(viewer_user_id, user_ids, opts \\ [])

  def assemble(viewer_user_id, user_ids, opts)
      when is_binary(viewer_user_id) and is_list(user_ids) do
    opts = normalize_opts(opts)
    ids = normalize_ids(user_ids)

    cond do
      ids == [] ->
        {:error, :user_ids_required}

      true ->
        case missing_users(ids) do
          [] ->
            {:ok, build_pack(viewer_user_id, ids, opts)}

          missing ->
            {:error, {:unknown_users, missing}}
        end
    end
  end

  def assemble(_, _, _), do: {:error, :invalid}

  defp build_pack(viewer_user_id, ids, opts) do
    facts_by_owner =
      DurablePreferenceMemory.facts_for_participants(ids)
      |> Enum.group_by(& &1["owner_user_id"])

    viewer_a4 =
      MemoryIntelligence.candidates_for_context(viewer_user_id,
        activity: opts[:activity] || opts["activity"]
      )

    {viewer_a4_prefs, viewer_a4_boundaries} = split_a4(viewer_a4)

    participants =
      Enum.map(ids, fn uid ->
        durable = Map.get(facts_by_owner, uid, [])
        {prefs, boundaries_from_prefs} = split_pref_boundaries(durable)

        prefs =
          if uid == viewer_user_id do
            prefs ++ viewer_a4_prefs
          else
            # Other owners: durable only; never attach viewer's A4 into their slot
            prefs
          end
          |> Enum.map(&mark_private_fact(&1, uid, viewer_user_id))

        boundaries =
          if uid == viewer_user_id do
            boundaries_from_prefs ++ viewer_a4_boundaries
          else
            boundaries_from_prefs
          end

        %{
          "user_id" => uid,
          "prefs" => prefs,
          "boundaries" => boundaries,
          # private? true → RI treats slot as non-disclosable to peers
          "private?" => uid != viewer_user_id,
          "permission_class" => "owner_private"
        }
      end)

    hard =
      stringify(opts[:hard_constraints] || opts["hard_constraints"] || %{})
      |> Map.put_new("party_size", max(length(ids), 2))

    %{
      "participants" => participants,
      "relationship_context" =>
        opts[:relationship_context] || opts["relationship_context"] || "friends",
      "hard_constraints" => hard,
      "recent_visits" => List.wrap(opts[:recent_visits] || opts["recent_visits"]),
      "history_rejected" => List.wrap(opts[:history_rejected] || opts["history_rejected"]),
      "viewer_user_id" => viewer_user_id,
      # Shared soft layer stays empty — private prefs stay on participant slots only
      "soft_prefs" => [],
      "shared_pref_leak" => false
    }
  end

  defp split_pref_boundaries(facts) do
    Enum.reduce(facts, {[], []}, fn fact, {prefs, bounds} ->
      fact = stringify(fact)
      pol = fact["polarity"] || "prefer"

      if pol in ~w(avoid dislike reject) do
        bound = %{
          "kind" => "preference_boundary",
          "summary" => fact["preference"],
          "preference" => fact["preference"],
          "polarity" => pol,
          "owner_user_id" => fact["owner_user_id"],
          "permission_class" => "owner_private"
        }

        {prefs, [bound | bounds]}
      else
        {[fact | prefs], bounds}
      end
    end)
    |> then(fn {p, b} -> {Enum.reverse(p), Enum.reverse(b)} end)
  end

  defp split_a4(candidates) when is_list(candidates) do
    Enum.reduce(candidates, {[], []}, fn cand, {prefs, bounds} ->
      cand = stringify(cand)
      class = cand["memory_class"]
      summary = cand["candidate_summary"] || cand["summary"]
      pol = cand["polarity"] || "prefer"

      cond do
        class == "boundary" or pol in ~w(avoid dislike reject) ->
          bound = %{
            "kind" => cand["kind"] || "memory_boundary",
            "summary" => summary,
            "preference" => summary,
            "polarity" => pol,
            "owner_user_id" => cand["owner_user_id"],
            "permission_class" => "owner_private"
          }

          {prefs, [bound | bounds]}

        class in ~w(preference) and is_binary(summary) ->
          pref = %{
            "preference" => summary,
            "polarity" => pol,
            "confidence" => cand["confidence"] || 0.6,
            "weight_class" => "inferred",
            "owner_user_id" => cand["owner_user_id"],
            "permission_class" => "owner_private",
            "revoked" => false
          }

          {[pref | prefs], bounds}

        true ->
          {prefs, bounds}
      end
    end)
    |> then(fn {p, b} -> {Enum.reverse(p), Enum.reverse(b)} end)
  end

  defp mark_private_fact(fact, owner_id, viewer_id) do
    fact = stringify(fact)

    fact
    |> Map.put("owner_user_id", owner_id)
    |> Map.put("permission_class", "owner_private")
    |> Map.put("private?", owner_id != viewer_id)
    |> Map.put_new("revoked", false)
  end

  defp missing_users(ids) do
    existing =
      from(u in User, where: u.id in ^ids, select: u.id)
      |> Repo.all()
      |> MapSet.new()

    Enum.reject(ids, &MapSet.member?(existing, &1))
  end

  defp normalize_ids(ids) do
    ids
    |> List.wrap()
    |> Enum.map(fn
      id when is_binary(id) -> String.trim(id)
      _ -> nil
    end)
    |> Enum.filter(&(is_binary(&1) and &1 != ""))
    |> Enum.uniq()
  end

  defp normalize_opts(opts) when is_list(opts), do: Map.new(opts)
  defp normalize_opts(opts) when is_map(opts), do: opts
  defp normalize_opts(_), do: %{}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
