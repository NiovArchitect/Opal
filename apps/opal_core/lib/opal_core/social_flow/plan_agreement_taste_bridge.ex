defmodule OpalCore.SocialFlow.PlanAgreementTasteBridge do
  @moduledoc """
  Phase 5A — plan-agreement → taste candidate bridge.

  When a SharedPlan transitions TO `agreed`, submit taste attributes
  (cuisine / vibe / price / area / time-of-day) that already exist on the
  plan into `MemoryIntelligence.consider/1` — once per (participant ×
  dimension). Existing MemoryIntelligence gates decide admission and
  promotion. Never writes durable memory itself.

  Laws:
  - Does not call RecommendationIntelligence.record_acceptance
  - Does not invent taste attributes (missing → silent skip)
  - cancelled / non-agreed plans submit nothing
  - Idempotent on (plan_id, owner, dimension)
  """

  import Ecto.Query

  alias OpalCore.GroupTastes
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.CandidateProvider
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.MemoryIntelligence
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.RealWorld.Place.Catalog
  alias OpalCore.SocialFlow.SharedPlan

  @taste_dims ~w(cuisine vibe price area time_of_day)

  @doc """
  Hook after a SharedPlan becomes `agreed`.

  Accepts a plan struct or id. Reloads participants. Returns a summary map.
  """
  def after_agreed(%SharedPlan{} = plan) do
    plan = Repo.preload(plan, :participants)

    cond do
      plan.status == "cancelled" ->
        %{submitted: 0, skipped: :cancelled, results: []}

      plan.status != "agreed" ->
        %{submitted: 0, skipped: :not_agreed, results: []}

      true ->
        tastes = extract_taste_attrs(plan)
        group_taste = maybe_record_group_taste(plan, tastes)

        individual =
          if tastes == %{} do
            %{submitted: 0, skipped: :no_taste_attrs, results: []}
          else
            submit_for_participants(plan, tastes)
          end

        Map.put(individual, :group_taste, group_taste)
    end
  end

  def after_agreed(plan_id) when is_binary(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan -> after_agreed(plan)
      nil -> %{submitted: 0, skipped: :not_found, results: []}
    end
  end

  def after_agreed(_), do: %{submitted: 0, skipped: :invalid, results: []}

  # Phase D-1 — learn group patterns from agreed plans (2+ members).
  defp maybe_record_group_taste(%SharedPlan{} = plan, tastes) do
    member_ids = participant_user_ids(plan)

    attrs = %{
      vibe: tastes["vibe"],
      cuisine: tastes["cuisine"],
      day_of_week: day_of_week_from_plan(plan)
    }

    case GroupTastes.record_plan(member_ids, attrs) do
      {:ok, gt} -> %{status: :recorded, group_hash: gt.group_hash, plan_count: gt.plan_count}
      {:error, reason} -> %{status: :skipped, reason: reason}
    end
  end

  defp day_of_week_from_plan(%SharedPlan{start_at: %DateTime{} = dt}) do
    case Date.day_of_week(DateTime.to_date(dt)) do
      1 -> "monday"
      2 -> "tuesday"
      3 -> "wednesday"
      4 -> "thursday"
      5 -> "friday"
      6 -> "saturday"
      7 -> "sunday"
      _ -> nil
    end
  end

  defp day_of_week_from_plan(_), do: nil

  @doc """
  Extract present taste attributes only. Never invents missing fields.

  Sources (first non-empty wins per dimension):
  - SharedPlan.alignment taste keys
  - Catalog / CandidateProvider place identity for location name
  - start_at / clear clock in time_label → time_of_day
  """
  def extract_taste_attrs(%SharedPlan{} = plan) do
    alignment = stringify(plan.alignment || %{})
    place_name = place_name(plan, alignment)
    place_facts = place_facts(place_name)

    %{}
    |> put_dim("cuisine", first_present([
           alignment["cuisine"],
           alignment["food"],
           place_facts["cuisine"]
         ]))
    |> put_dim("vibe", first_present([
           alignment["vibe"],
           alignment["atmosphere"],
           place_facts["vibe"]
         ]))
    |> put_dim("price", first_present([
           alignment["price"],
           alignment["price_band"],
           place_facts["price"],
           place_facts["price_band"]
         ]))
    |> put_dim("area", first_present([
           alignment["area"],
           alignment["area_label"],
           place_facts["area"],
           place_facts["area_label"]
         ]))
    |> put_dim("time_of_day", first_present([
           alignment["time_of_day"],
           alignment["daypart"],
           time_of_day_from_start(plan.start_at),
           time_of_day_from_label(plan.time_label)
         ]))
  end

  def extract_taste_attrs(_), do: %{}

  @doc "Taste dimensions this bridge may emit."
  def taste_dimensions, do: @taste_dims

  # --- submit ---

  defp submit_for_participants(%SharedPlan{} = plan, tastes) when is_map(tastes) do
    owners = participant_user_ids(plan)

    results =
      for owner <- owners,
          {dim, value} <- tastes,
          reduce: [] do
        acc ->
          case maybe_consider(plan, owner, dim, value) do
            {:skip, reason} ->
              [%{owner_user_id: owner, dimension: dim, status: :skipped, reason: reason} | acc]

            {:ok, payload} ->
              [
                %{
                  owner_user_id: owner,
                  dimension: dim,
                  status: :submitted,
                  action: payload[:action] || payload["action"],
                  candidate_id: candidate_id(payload)
                }
                | acc
              ]

            {:reject, reason} ->
              [%{owner_user_id: owner, dimension: dim, status: :rejected, reason: reason} | acc]
          end
      end

    submitted = Enum.count(results, &(&1.status == :submitted))
    %{submitted: submitted, skipped: nil, results: Enum.reverse(results)}
  end

  defp maybe_consider(%SharedPlan{} = plan, owner, dim, value) do
    if already_submitted?(plan.id, owner, dim) do
      {:skip, :idempotent}
    else
      MemoryIntelligence.consider(%{
        "owner_user_id" => owner,
        "subject_user_id" => owner,
        "conversation_id" => plan.conversation_id,
        "memory_class" => "preference",
        "kind" => "preference",
        "value" => "taste:#{dim}:#{value}",
        "evidence_kind" => "accepted_plan_pattern",
        "force_candidate" => true,
        "observation_count" => 1,
        "auto_promote" => false,
        "source_type" => "plan_agreed",
        "source" => "plan_agreed",
        "idempotency_key" => idem_key(plan.id, owner, dim, value),
        "context_dims" => %{
          "plan_id" => plan.id,
          "taste_dimension" => dim,
          "taste_value" => value,
          "source" => "plan_agreed"
        },
        "evidence" => %{
          "plan_id" => plan.id,
          "dimension" => dim,
          "value" => value,
          "source" => "plan_agreed"
        }
      })
      |> case do
        {:ok, payload} -> {:ok, payload}
        {:reject, reason} -> {:reject, reason}
        other -> {:reject, other}
      end
    end
  end

  defp already_submitted?(plan_id, owner, dim) when is_binary(plan_id) do
    pattern = "plan-agreed:#{plan_id}:#{owner}:#{dim}:%"

    from(c in MemoryCandidate,
      where: c.owner_user_id == ^owner,
      where: like(c.idempotency_key, ^pattern),
      select: c.id,
      limit: 1
    )
    |> Repo.one()
    |> is_binary()
  end

  defp idem_key(plan_id, owner, dim, value) do
    "plan-agreed:#{plan_id}:#{owner}:#{dim}:#{slug(value)}"
  end

  # --- extract helpers ---

  defp place_name(%SharedPlan{} = plan, alignment) do
    first_present([
      plan.location,
      alignment["location"],
      alignment["place_name"],
      alignment_place_value(alignment["place"]),
      get_in(alignment, ["place", "value"])
    ])
  end

  defp alignment_place_value(v) when is_binary(v), do: v
  defp alignment_place_value(%{"value" => v}) when is_binary(v), do: v
  defp alignment_place_value(_), do: nil

  defp place_facts(nil), do: %{}

  defp place_facts(name) when is_binary(name) do
    catalog =
      Catalog.list_candidates()
      |> Enum.find(fn p ->
        String.downcase(to_string(p["display_name"] || "")) == String.downcase(name)
      end) || %{}

    identity = CandidateProvider.identity(name) || %{}

    %{
      "cuisine" => catalog["cuisine"],
      "vibe" => catalog["vibe"],
      "price" => identity["price"] || catalog["price_band"],
      "price_band" => catalog["price_band"],
      "area" => identity["area"] || catalog["area_label"],
      "area_label" => catalog["area_label"]
    }
  end

  defp time_of_day_from_start(%DateTime{} = dt) do
    hour_to_daypart(dt.hour)
  end

  defp time_of_day_from_start(_), do: nil

  defp time_of_day_from_label(label) when is_binary(label) do
    case Regex.run(~r/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i, label) do
      [_, hour_s, _, meridiem] ->
        hour = String.to_integer(hour_s)
        hour = normalize_hour(hour, meridiem)
        hour_to_daypart(hour)

      _ ->
        cond do
          Regex.match?(~r/\bmorning\b/i, label) -> "morning"
          Regex.match?(~r/\bafternoon\b/i, label) -> "afternoon"
          Regex.match?(~r/\bevening\b/i, label) -> "evening"
          Regex.match?(~r/\bnight\b/i, label) -> "night"
          true -> nil
        end
    end
  end

  defp time_of_day_from_label(_), do: nil

  defp normalize_hour(hour, meridiem) do
    m = String.downcase(meridiem)

    cond do
      String.starts_with?(m, "p") and hour < 12 -> hour + 12
      String.starts_with?(m, "a") and hour == 12 -> 0
      true -> hour
    end
  end

  defp hour_to_daypart(h) when h >= 5 and h < 12, do: "morning"
  defp hour_to_daypart(h) when h >= 12 and h < 17, do: "afternoon"
  defp hour_to_daypart(h) when h >= 17 and h < 21, do: "evening"
  defp hour_to_daypart(h) when is_integer(h), do: "night"
  defp hour_to_daypart(_), do: nil

  defp participant_user_ids(%SharedPlan{participants: parts}) when is_list(parts) do
    parts
    |> Enum.map(& &1.user_id)
    |> Enum.filter(&(is_binary(&1) and &1 != ""))
    |> Enum.uniq()
  end

  defp participant_user_ids(%SharedPlan{id: id}) do
    from(p in PlanParticipant, where: p.plan_id == ^id, select: p.user_id)
    |> Repo.all()
    |> Enum.filter(&(is_binary(&1) and &1 != ""))
    |> Enum.uniq()
  end

  defp put_dim(map, _dim, nil), do: map
  defp put_dim(map, _dim, ""), do: map
  defp put_dim(map, _dim, "nil"), do: map

  defp put_dim(map, dim, value) when is_binary(value) do
    trimmed = value |> String.trim() |> String.downcase()

    if trimmed == "" or trimmed == "nil" do
      map
    else
      Map.put(map, dim, trimmed)
    end
  end

  defp put_dim(map, dim, value) when is_atom(value) and not is_nil(value) do
    put_dim(map, dim, Atom.to_string(value))
  end

  defp put_dim(map, _dim, _), do: map

  defp first_present(list) do
    Enum.find_value(list, fn
      nil ->
        nil

      v when is_binary(v) ->
        t = String.trim(v)
        if t == "" or t == "nil", do: nil, else: t

      v when is_atom(v) ->
        # nil is an atom — already matched above; other atoms are rare labels
        Atom.to_string(v)

      _ ->
        nil
    end)
  end

  defp candidate_id(%{candidate: %MemoryCandidate{id: id}}), do: id
  defp candidate_id(%{"candidate" => %{"id" => id}}), do: id
  defp candidate_id(%{candidate: cand}) when is_map(cand), do: cand[:id] || cand["id"]
  defp candidate_id(_), do: nil

  defp slug(s) when is_binary(s) do
    s
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
    |> String.slice(0, 80)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(%{} = m), do: stringify(m)
  defp stringify_val(v), do: v
end
