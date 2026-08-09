defmodule OpalCore.SocialFlow.Physical.LocationPolicy do
  @moduledoc """
  Location privacy policy for physical feasibility.

  Invariants:
  - OS permission ≠ social share
  - Block terminates location sharing
  - No arbitrary peer location query API
  - Shared output is benefit-only (never routine)
  - Retention classes are explicit
  """

  alias OpalCore.SocialFlow.Feasibility.Probing
  alias OpalCore.SocialFlow.RealWorld.Location.{ApproximateStore, Grant, Retention}
  alias OpalCore.SocialFlow.TrustSafety

  @retention_classes %{
    "current_location" => "current_approximate_location",
    "plan_location" => "plan_scoped_area",
    "eta" => "eta",
    "shared_destination" => "explicit_shared_location",
    "familiar_area" => "familiar_area",
    "raw_movement" => :do_not_retain
  }

  def retention_classes, do: Map.keys(@retention_classes)

  def ttl_for(class) when is_binary(class) do
    case Map.get(@retention_classes, class) do
      :do_not_retain -> 0
      kind when is_binary(kind) -> Retention.ttl_seconds(kind)
      _ -> Retention.ttl_seconds("current_approximate_location")
    end
  end

  @doc """
  Authorize a private location evaluation.

  Requires conversation scope + not blocked + probing rate limit.
  Never a free-form peer location query.
  """
  def authorize_private_use(actor_user_id, conversation_id, opts \\ [])
      when is_binary(actor_user_id) and is_binary(conversation_id) do
    target = Keyword.get(opts, :about_user_id)
    blocked? = Keyword.get(opts, :blocked, false)

    cond do
      blocked? ->
        {:error, :blocked}

      is_binary(target) and target != actor_user_id and
          TrustSafety.blocked?(actor_user_id, target) ->
        {:error, :blocked}

      is_binary(target) and target != actor_user_id and
          TrustSafety.blocked?(target, actor_user_id) ->
        {:error, :blocked}

      Keyword.get(opts, :peer_location_query) == true and target != actor_user_id ->
        # No arbitrary "where is X?" API
        {:error, :peer_location_query_forbidden}

      true ->
        Probing.authorize_evaluation(actor_user_id, conversation_id,
          max: Keyword.get(opts, :max, 30)
        )
    end
  end

  @doc """
  On relationship block: stop ETA, plan-scoped grants, derived shared location outputs.
  """
  def on_block(owner_user_id, peer_user_id) when is_binary(owner_user_id) do
    ApproximateStore.revoke(owner_user_id)

    %{
      "owner_user_id" => owner_user_id,
      "peer_user_id" => peer_user_id,
      "eta_sharing" => :stopped,
      "plan_scoped_grants" => :revoked,
      "movement_updates" => :stopped,
      "derived_shared_location" => :stopped,
      "private_store_revoked" => true,
      "lingering_plan_permission" => false
    }
  end

  def on_block(_, _), do: %{"lingering_plan_permission" => false}

  @doc "Revoke a grant and cascade stop of derived authority."
  def revoke_grant(grant) when is_map(grant) do
    revoked = Grant.revoke(grant)

    %{
      "grant" => revoked,
      "future_private_use" => :stopped_where_required,
      "eta_sharing" => :stopped,
      "movement_updates" => :stopped,
      "new_derived_shared" => :stopped,
      "stale_location_authority" => false
    }
  end

  @doc """
  Project shared-safe location benefit. Never coordinates, routine, or exact place of peer.
  """
  def shared_projection(area_label, opts \\ []) do
    copy =
      cond do
        Keyword.get(opts, :both_close) ->
          "You're both close enough for this."

        is_binary(area_label) ->
          "#{area_label} looks convenient."

        true ->
          "This area works well."
      end

    %{
      "shared_safe" => true,
      "benefit_copy" => copy,
      "no_coordinates" => true,
      "no_routine" => true,
      "no_exact_peer_location" => true,
      "no_work_home_inference" => true
    }
  end

  @doc "Reject shared copy that would expose behavioral routine."
  def routine_leak?(text) when is_binary(text) do
    lower = String.downcase(text)

    Enum.any?(
      [
        "usually",
        "always at",
        "works at",
        "stays near",
        "is currently at",
        "thursdays",
        "home is"
      ],
      &String.contains?(lower, &1)
    )
  end

  def routine_leak?(_), do: false
end
