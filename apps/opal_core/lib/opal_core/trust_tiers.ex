defmodule OpalCore.TrustTiers do
  @moduledoc """
  Phase RU-2 — progressive trust tiers.

  Opal earns deeper context over time. Not a paywall. Not a score.
  `inner_circle` is user-granted only — never automatic.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo
  alias OpalCore.TrustTiers.TrustTier

  @tier_rank %{"new" => 0, "known" => 1, "trusted" => 2, "inner_circle" => 3}

  @categories_by_tier %{
    "new" => [:basic],
    "known" => [:basic, :taste, :celebrations, :plans],
    "trusted" => [:basic, :taste, :celebrations, :plans, :financial, :relationships],
    "inner_circle" => [
      :basic,
      :taste,
      :celebrations,
      :plans,
      :financial,
      :relationships,
      :intimate
    ]
  }

  @friendly_names %{
    "new" => "Getting to know you",
    "known" => "Finding your rhythm",
    "trusted" => "Deep understanding",
    "inner_circle" => "Complete trust"
  }

  @access_labels %{
    basic: "Name, handle, and timezone",
    taste: "Taste preferences",
    celebrations: "Celebration dates",
    plans: "Plan history",
    financial: "Financial comfort",
    relationships: "How you know people",
    intimate: "Deeper personal details you choose to share"
  }

  @doc "Allowed tier strings."
  def allowed_tiers, do: TrustTier.allowed_tiers()

  @doc "Friendly display name for a tier."
  def friendly_name(tier) when is_binary(tier), do: Map.get(@friendly_names, tier, tier)
  def friendly_name(_), do: @friendly_names["new"]

  @doc "Plain-language labels for categories the tier can access."
  def access_labels_for(tier) when is_binary(tier) do
    (@categories_by_tier[tier] || [:basic])
    |> Enum.map(&Map.get(@access_labels, &1))
    |> Enum.reject(&is_nil/1)
  end

  def access_labels_for(_), do: access_labels_for("new")

  @doc "Categories atoms available at this tier."
  def categories_for(tier) when is_binary(tier), do: @categories_by_tier[tier] || [:basic]
  def categories_for(_), do: [:basic]

  @doc "Return the tier string for `user_id` (default `\"new\"`)."
  def get_tier(user_id) when is_binary(user_id) do
    case Repo.get_by(TrustTier, user_id: user_id) do
      %TrustTier{tier: tier} -> tier
      nil -> "new"
    end
  end

  def get_tier(_), do: "new"

  @doc """
  Grant `tier` to `user_id`.

  Progression only (no skipping). `inner_circle` requires `granted_by: \"user\"`.
  Does not demote.
  """
  def grant_tier(user_id, tier, granted_by)
      when is_binary(user_id) and is_binary(tier) and is_binary(granted_by) do
    current = get_tier(user_id)
    current_rank = Map.get(@tier_rank, current, 0)
    target_rank = Map.get(@tier_rank, tier)

    cond do
      is_nil(target_rank) ->
        {:error, :invalid_tier}

      granted_by not in ~w(system user) ->
        {:error, :invalid_granted_by}

      tier == "inner_circle" and granted_by != "user" ->
        {:error, :inner_circle_requires_user}

      target_rank < current_rank ->
        {:error, :cannot_demote}

      target_rank == current_rank ->
        {:ok, fetch_or_build(user_id, current)}

      target_rank > current_rank + 1 ->
        {:error, :cannot_skip}

      true ->
        upsert(user_id, tier, granted_by)
    end
  end

  def grant_tier(_, _, _), do: {:error, :invalid}

  @doc """
  Whether `user_id` may use `data_category` at their current tier.

  Categories: `:basic | :taste | :celebrations | :plans | :financial | :relationships | :intimate`
  """
  def can_access?(user_id, category) when is_binary(user_id) and is_atom(category) do
    tier = get_tier(user_id)
    category in categories_for(tier)
  end

  def can_access?(_, _), do: false

  @doc "Same as `can_access?/2` but with an explicit tier string (no DB)."
  def can_access_tier?(tier, category) when is_binary(tier) and is_atom(category) do
    category in categories_for(tier)
  end

  def can_access_tier?(_, _), do: false

  @doc """
  Auto-promote `new → known → trusted` from activity thresholds.

  - known: active 7+ days OR 10+ conversations (Opal turns or messaging memberships)
  - trusted: active 30+ days
  Never auto-grants `inner_circle`. Idempotent. Does not demote.
  """
  def maybe_promote(user_id) when is_binary(user_id) do
    current = get_tier(user_id)

    if current in ["trusted", "inner_circle"] do
      {:ok, current}
    else
      {days, convs} = activity(user_id)

      cond do
        current == "new" and (days >= 7 or convs >= 10) ->
          case grant_tier(user_id, "known", "system") do
            {:ok, _} ->
              if days >= 30, do: grant_tier(user_id, "trusted", "system"), else: {:ok, get_tier(user_id)}

            other ->
              other
          end

        current == "known" and days >= 30 ->
          grant_tier(user_id, "trusted", "system")

        true ->
          {:ok, current}
      end
    end
  end

  def maybe_promote(_), do: {:error, :invalid}

  @doc "API contract for GET /trust/tier."
  def tier_info(user_id) when is_binary(user_id) do
    tier = get_tier(user_id)
    next = next_tier(tier)

    %{
      "tier" => tier,
      "friendly_name" => friendly_name(tier),
      "can_access" => categories_for(tier) |> Enum.map(&Atom.to_string/1),
      "can_access_labels" => access_labels_for(tier),
      "next_tier" => next,
      "next_friendly_name" => next && friendly_name(next),
      "next_requirements" => next_requirements(tier)
    }
  end

  def tier_info(_), do: tier_info_for_new()

  def to_contract(%TrustTier{} = t) do
    %{
      "id" => t.id,
      "user_id" => t.user_id,
      "tier" => t.tier,
      "granted_at" => datetime(t.granted_at),
      "granted_by" => t.granted_by,
      "inserted_at" => datetime(t.inserted_at),
      "updated_at" => datetime(t.updated_at)
    }
  end

  defp tier_info_for_new do
    %{
      "tier" => "new",
      "friendly_name" => friendly_name("new"),
      "can_access" => ["basic"],
      "can_access_labels" => access_labels_for("new"),
      "next_tier" => "known",
      "next_friendly_name" => friendly_name("known"),
      "next_requirements" => next_requirements("new")
    }
  end

  defp next_tier("new"), do: "known"
  defp next_tier("known"), do: "trusted"
  defp next_tier("trusted"), do: "inner_circle"
  defp next_tier("inner_circle"), do: nil
  defp next_tier(_), do: "known"

  defp next_requirements("new"),
    do: "Active 7+ days or 10+ conversations"

  defp next_requirements("known"),
    do: "Active 30+ days or grant manually"

  defp next_requirements("trusted"),
    do: "Grant complete trust yourself"

  defp next_requirements(_), do: nil

  defp activity(user_id) do
    days =
      case Repo.get(User, user_id) do
        %User{inserted_at: %DateTime{} = dt} ->
          DateTime.diff(DateTime.utc_now(), dt, :day)

        _ ->
          0
      end

    messaging =
      from(cm in ConversationMember, where: cm.user_id == ^user_id)
      |> Repo.aggregate(:count, :id)

    opal_turns =
      from(m in OpalMessage,
        join: c in OpalConversation,
        on: c.id == m.conversation_id,
        where: c.user_id == ^user_id and m.role == "user"
      )
      |> Repo.aggregate(:count, :id)

    {days, max(messaging, opal_turns)}
  end

  defp fetch_or_build(user_id, tier) do
    case Repo.get_by(TrustTier, user_id: user_id) do
      %TrustTier{} = row ->
        row

      nil ->
        {:ok, row} = upsert(user_id, tier, "system")
        row
    end
  end

  defp upsert(user_id, tier, granted_by) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    attrs = %{user_id: user_id, tier: tier, granted_at: now, granted_by: granted_by}

    case Repo.get_by(TrustTier, user_id: user_id) do
      nil ->
        %TrustTier{}
        |> TrustTier.changeset(attrs)
        |> Repo.insert()

      %TrustTier{} = existing ->
        existing
        |> TrustTier.changeset(%{tier: tier, granted_at: now, granted_by: granted_by})
        |> Repo.update()
    end
  end

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
