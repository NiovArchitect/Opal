defmodule OpalCore.SocialFlow.Ambient.FailureRadius do
  @moduledoc """
  Bounded failure radius — invalidate only what depends on the failure.

  Composes with RecoveryPreservation and Incremental.
  Does not clear alignment context on every change.
  """

  alias OpalCore.SocialFlow.Ambient.Incremental

  # failure_kind => dimensions invalidated (others preserved)
  @radius %{
    "restaurant_unavailable" => ~w(provider_slot venue place_candidate),
    "provider_inventory" => ~w(provider_slot venue place_candidate),
    "slot_expired" => ~w(provider_slot),
    "optional_participant_drop" => ~w(participant_count capacity_check),
    "required_participant_drop" => ~w(participants viability required_roles),
    "driver_drop" => ~w(participants viability required_roles transport),
    "host_drop" => ~w(participants viability required_roles),
    "location_expired" => ~w(current_location travel place_feasibility eta),
    "plan_time_changed" => ~w(travel place_feasibility provider_slot leave_by eta),
    "capacity_overflow" => ~w(capacity_check venue_fit),
    "hard_constraint" => ~w(venue place_candidate viability),
    "price_changed" => ~w(payment_prep price),
    "plan_cancelled" => ~w(all),
    "blocked" => ~w(cross_user_share ambient_surface network_opening)
  }

  # Full social dimensions we try to keep unless explicitly invalidated
  @alignment_dimensions ~w(
    time
    place_area
    cuisine_or_category
    participants
    quiet
    budget
    relationship_context
    travel_mode
    willingness
    accessibility
  )

  def alignment_dimensions, do: @alignment_dimensions

  @doc "Dimensions invalidated by a failure kind (not the full plan)."
  def invalidated_dimensions(failure_kind) when is_binary(failure_kind) do
    Map.get(@radius, failure_kind, ~w(surface))
  end

  def invalidated_dimensions(_), do: ~w(surface)

  @doc """
  Apply failure to a set of resolved dimensions.

  Returns what broke, what remains true, and recompute targets.
  """
  def apply(failure_kind, resolved \\ @alignment_dimensions) do
    invalid = invalidated_dimensions(failure_kind)
    full_reset? = "all" in invalid

    preserved =
      if full_reset? do
        []
      else
        resolved
        |> List.wrap()
        |> Enum.reject(&(&1 in invalid))
      end

    {mode, targets} = Incremental.plan([failure_kind_to_change(failure_kind)])

    {:ok,
     %{
       "failure_kind" => failure_kind,
       "invalidated" => if(full_reset?, do: List.wrap(resolved), else: invalid),
       "still_true" => preserved,
       "preserved_count" => length(preserved),
       "full_plan_reset" => full_reset?,
       "recompute_mode" => mode,
       "recompute_targets" => targets,
       "smallest_change_needed" => smallest_change(failure_kind),
       "authorizes_set" => false,
       "restart_social_alignment" => full_reset?
     }}
  end

  @doc "Prefer smallest recovery action for a failure kind."
  def smallest_change("restaurant_unavailable"), do: "different_place_same_constraints"
  def smallest_change("provider_inventory"), do: "different_place_same_constraints"
  def smallest_change("slot_expired"), do: "nearby_time_or_place"
  def smallest_change("optional_participant_drop"), do: "nothing_or_capacity_update"
  def smallest_change("required_participant_drop"), do: "minimum_question_reschedule"
  def smallest_change("driver_drop"), do: "minimum_question_transport"
  def smallest_change("location_expired"), do: "recompute_travel_only"
  def smallest_change("plan_time_changed"), do: "recompute_travel_provider"
  def smallest_change("capacity_overflow"), do: "different_place_or_smaller_group"
  def smallest_change("hard_constraint"), do: "different_candidate"
  def smallest_change("plan_cancelled"), do: "new_intent"
  def smallest_change(_), do: "minimum_question"

  defp failure_kind_to_change("restaurant_unavailable"), do: "provider_inventory"
  defp failure_kind_to_change("provider_inventory"), do: "provider_inventory"
  defp failure_kind_to_change("slot_expired"), do: "slot_expired"
  defp failure_kind_to_change("optional_participant_drop"), do: "participant_affirmation"
  defp failure_kind_to_change("required_participant_drop"), do: "required_role"
  defp failure_kind_to_change("driver_drop"), do: "required_role"
  defp failure_kind_to_change("host_drop"), do: "required_role"
  defp failure_kind_to_change("location_expired"), do: "location_expired"
  defp failure_kind_to_change("plan_time_changed"), do: "plan_time_changed"
  defp failure_kind_to_change("hard_constraint"), do: "hard_constraint"
  defp failure_kind_to_change("plan_cancelled"), do: "topic_changed"
  defp failure_kind_to_change(_), do: "participant_affirmation"
end
