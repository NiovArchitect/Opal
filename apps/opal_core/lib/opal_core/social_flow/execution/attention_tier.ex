defmodule OpalCore.SocialFlow.Execution.AttentionTier do
  @moduledoc """
  Internal plan attention levels — never user-visible labels.

  DORMANT — no active work justified
  WATCH — cheap local re-evaluation only
  PREPARE — background/private preparation justified
  ACTIONABLE — human decision may be worth surfacing
  URGENT_ACTIONABLE — time-sensitive human action required

  Prepare early. Interrupt late.
  Watch ≠ notify. Prepare ≠ ask.
  """

  @tiers ~w(dormant watch prepare actionable urgent_actionable)

  def tiers, do: @tiers

  @doc "Rank for comparison (higher = more attention)."
  def rank(tier) when is_binary(tier) do
    case tier do
      "dormant" -> 0
      "watch" -> 1
      "prepare" -> 2
      "actionable" -> 3
      "urgent_actionable" -> 4
      _ -> 0
    end
  end

  def rank(_), do: 0

  @doc "Allowed private work classes at this tier (not surfaces)."
  def allowed_work(tier) when is_binary(tier) do
    case tier do
      "dormant" ->
        []

      "watch" ->
        ~w(local_re_eval freshness_check plan_version_check)

      "prepare" ->
        ~w(
          local_re_eval
          freshness_check
          plan_version_check
          opportunity_zone
          travel_estimate
          leave_by_context
          execution_requirements
          provider_preflight_cheap
          group_viability
        )

      "actionable" ->
        ~w(
          local_re_eval
          opportunity_zone
          travel_estimate
          leave_by_context
          execution_requirements
          provider_preflight_cheap
          provider_live_if_justified
          surface_candidate
        )

      "urgent_actionable" ->
        ~w(
          leave_by_context
          navigation_prepare
          reminder_prepare
          surface_candidate
          provider_live_if_justified
        )

      _ ->
        []
    end
  end

  def allowed_work(_), do: []

  @doc "Whether any user-visible surface may be considered."
  def may_surface?(tier) when is_binary(tier), do: tier in ~w(actionable urgent_actionable)
  def may_surface?(_), do: false

  @doc "Whether push/lock is even eligible (still needs debt repayment)."
  def may_push?(tier), do: tier == "urgent_actionable"

  @doc "Whether background preparation is justified."
  def may_prepare?(tier) when is_binary(tier), do: rank(tier) >= rank("prepare")
  def may_prepare?(_), do: false

  @doc "Minimum surface cost budget — higher tiers allow more expensive surfaces."
  def max_surface(tier) when is_binary(tier) do
    case tier do
      "dormant" -> nil
      "watch" -> nil
      "prepare" -> nil
      "actionable" -> "in_app_passive"
      "urgent_actionable" -> "lock_screen"
      _ -> nil
    end
  end

  def max_surface(_), do: nil

  @doc "Normalize unknown to dormant."
  def normalize(tier) when is_binary(tier) do
    if tier in @tiers, do: tier, else: "dormant"
  end

  def normalize(_), do: "dormant"
end
