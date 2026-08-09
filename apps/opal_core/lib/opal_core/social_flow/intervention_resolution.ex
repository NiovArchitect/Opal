defmodule OpalCore.SocialFlow.InterventionResolution do
  @moduledoc """
  General intervention resolution — *what is the smallest useful thing Opal
  should do right now?*

  Carefully generalizes from `AvailabilitySufficiency` without deleting or
  destabilizing it. Availability decisions remain authoritative for time;
  this composer merges gap class, restraint, privacy, and interruption cost.

  Internal outcomes:
  - silence
  - recognize
  - ask_permission
  - ask_confirmation
  - ask_input
  - surface_result
  - offer_choice
  - prepare_action

  Set remains separate authority. Silence is success.
  """

  alias OpalCore.SocialFlow.AvailabilitySufficiency
  alias OpalCore.SocialFlow.DynamicIntelligence.Restraint

  @type outcome ::
          :silence
          | :recognize
          | :ask_permission
          | :ask_confirmation
          | :ask_input
          | :surface_result
          | :offer_choice
          | :prepare_action

  @doc """
  Pure resolve from a composed facts map.

  Keys (all optional except as used):
  - availability sufficiency fields (blocked, shared_overlap_found, ...)
  - `:forming?` boolean planning signal
  - `:context_confidence` float
  - `:recent_suggestion_count`
  - `:ignored_suggestion` boolean
  - `:topic_changed` boolean
  - `:humans_solving` boolean
  - `:stale_opportunity` boolean
  - `:overlap_count` integer
  - `:privacy_risk`
  - `:permission_revoked`
  """
  @spec resolve(map()) :: %{
          required(:outcome) => outcome(),
          required(:availability_decision) => atom(),
          required(:restraint) => atom() | String.t(),
          required(:authorizes_set) => false,
          optional(:reason) => String.t()
        }
  def resolve(facts) when is_map(facts) do
    facts = normalize(facts)
    av = AvailabilitySufficiency.resolve(availability_facts(facts))

    restraint_input = %{
      "forming?" => truthy?(facts[:forming?]),
      "context_confidence" => facts[:context_confidence] || default_confidence(av),
      "participant_count" => facts[:participant_count] || 2,
      "option_count" => option_count(av, facts),
      "preferred_quality" => facts[:preferred_quality] || 2.0,
      "recent_suggestion_count" => facts[:recent_suggestion_count] || 0,
      "missing_information_count" => missing_count(av),
      "permission_revoked" => truthy?(facts[:permission_revoked]),
      "group_suppressed" => truthy?(facts[:group_suppressed]),
      "privacy_risk" => facts[:privacy_risk]
    }

    force_silence =
      truthy?(facts[:ignored_suggestion]) or
        truthy?(facts[:topic_changed]) or
        truthy?(facts[:humans_solving]) or
        truthy?(facts[:stale_opportunity]) or
        truthy?(facts[:casual_chat])

    case {force_silence, Restraint.decide(restraint_input), av} do
      {true, _, _} ->
        pack(:silence, av, "forced_quiet")

      {_, {:silence, reason}, _} ->
        pack(:silence, av, reason)

      {_, {:surface, _}, :enough_to_compute} ->
        if (facts[:overlap_count] || 1) >= 2 do
          pack(:offer_choice, av, "multiple_overlaps")
        else
          pack(:surface_result, av, "enough")
        end

      {_, {:surface, _}, :needs_permission} ->
        pack(:ask_permission, av, "share_required")

      {_, {:surface, _}, :needs_confirmation} ->
        pack(:ask_confirmation, av, "stale")

      {_, {:surface, _}, :needs_input} ->
        pack(:ask_input, av, "missing")

      {_, {:surface, _}, :no_useful_intervention} ->
        pack(:silence, av, "no_useful")

      {_, _, _} ->
        pack(:silence, av, "default")
    end
  end

  def resolve(_), do: pack(:silence, :no_useful_intervention, "invalid")

  @doc "Map general outcome → existing availability decision surface when applicable."
  def to_availability_surface(:surface_result), do: :enough_to_compute
  def to_availability_surface(:offer_choice), do: :enough_to_compute
  def to_availability_surface(:ask_permission), do: :needs_permission
  def to_availability_surface(:ask_confirmation), do: :needs_confirmation
  def to_availability_surface(:ask_input), do: :needs_input
  def to_availability_surface(:silence), do: :no_useful_intervention
  def to_availability_surface(:recognize), do: :no_useful_intervention
  def to_availability_surface(:prepare_action), do: :enough_to_compute
  def to_availability_surface(_), do: :no_useful_intervention

  defp pack(outcome, av, reason) do
    %{
      outcome: outcome,
      availability_decision: av,
      restraint: reason,
      authorizes_set: false,
      reason: to_string(reason)
    }
  end

  defp availability_facts(facts) do
    Map.take(facts, [
      :blocked,
      :shared_overlap_found,
      :has_fresh_windows,
      :stale_only_windows,
      :private_preview_overlap,
      :peer_has_shares,
      :actor_has_active_share
    ])
  end

  defp option_count(:enough_to_compute, facts), do: max(facts[:overlap_count] || 1, 1)
  defp option_count(:needs_permission, _), do: 1
  defp option_count(:needs_confirmation, _), do: 1
  defp option_count(:needs_input, _), do: 1
  defp option_count(_, _), do: 0

  defp missing_count(:needs_input), do: 2
  defp missing_count(:needs_confirmation), do: 1
  defp missing_count(:needs_permission), do: 1
  defp missing_count(_), do: 0

  defp default_confidence(:enough_to_compute), do: 0.9
  defp default_confidence(:needs_permission), do: 0.8
  defp default_confidence(:needs_confirmation), do: 0.7
  defp default_confidence(:needs_input), do: 0.65
  defp default_confidence(_), do: 0.3

  defp truthy?(true), do: true
  defp truthy?(false), do: false
  defp truthy?(nil), do: false
  defp truthy?(_), do: true

  defp normalize(facts) when is_map(facts) do
    Map.new(facts, fn
      {k, v} when is_atom(k) -> {k, v}
      {"blocked", v} -> {:blocked, v}
      {"shared_overlap_found", v} -> {:shared_overlap_found, v}
      {"has_fresh_windows", v} -> {:has_fresh_windows, v}
      {"stale_only_windows", v} -> {:stale_only_windows, v}
      {"private_preview_overlap", v} -> {:private_preview_overlap, v}
      {"peer_has_shares", v} -> {:peer_has_shares, v}
      {"actor_has_active_share", v} -> {:actor_has_active_share, v}
      {"forming?", v} -> {:forming?, v}
      {"context_confidence", v} -> {:context_confidence, v}
      {"participant_count", v} -> {:participant_count, v}
      {"recent_suggestion_count", v} -> {:recent_suggestion_count, v}
      {"ignored_suggestion", v} -> {:ignored_suggestion, v}
      {"topic_changed", v} -> {:topic_changed, v}
      {"humans_solving", v} -> {:humans_solving, v}
      {"stale_opportunity", v} -> {:stale_opportunity, v}
      {"casual_chat", v} -> {:casual_chat, v}
      {"overlap_count", v} -> {:overlap_count, v}
      {"privacy_risk", v} -> {:privacy_risk, v}
      {"permission_revoked", v} -> {:permission_revoked, v}
      {"group_suppressed", v} -> {:group_suppressed, v}
      {"preferred_quality", v} -> {:preferred_quality, v}
      {_, v} -> {:_ignored, v}
    end)
    |> Map.delete(:_ignored)
  end
end
