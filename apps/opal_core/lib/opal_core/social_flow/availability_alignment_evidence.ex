defmodule OpalCore.SocialFlow.AvailabilityAlignmentEvidence do
  @moduledoc """
  Thin bridge: map availability overlap into **existing** alignment-gap vocabulary.

  Does **not** implement a second alignment engine, Minimum Question runner, or Set
  authority. Consumers of `ALIGNMENT_GAP_MODEL` / minimum-question may call this to
  learn whether *time* is still the unresolved variable.

  Silence remains valid: callers decide whether to surface anything.
  """

  @doc """
  Returns a gap descriptor for the existing intelligence stack.

  - `{:gap, :time_availability, action}` when time is still unresolved
  - `{:resolved, :time_availability}` when a shared-safe overlap exists
  - `{:gap, :trust, :blocked}` when coordination is blocked
  - `:none` when overlap payload is unusable

  Never authorizes Set.
  """
  def from_overlap(overlap) when is_map(overlap) do
    status = Map.get(overlap, "overlap_status") || Map.get(overlap, :overlap_status)

    case status do
      "need_more_shares" ->
        {:gap, :time_availability, :share}

      "no_overlap" ->
        {:gap, :time_availability, :more_windows}

      "overlap_found" ->
        {:resolved, :time_availability}

      "blocked" ->
        {:gap, :trust, :blocked}

      _ ->
        :none
    end
  end

  def from_overlap(_), do: :none

  @doc "Always false — availability evidence never elevates to Set."
  def authorizes_set?, do: false

  @doc """
  Minimum-question *topic* hint for later MINIMUM_QUESTION_ENGINE integration.

  Phase 1 does not ask questions automatically. When a later phase does, use:
  - `time_share` when someone still needs to share
  - `time_pick` when multiple overlaps exist (narrow: "Thursday or Sunday?")
  - `nil` when silence is better
  """
  def minimum_question_topic(overlap) when is_map(overlap) do
    status = Map.get(overlap, "overlap_status")
    n = length(Map.get(overlap, "overlaps") || [])

    cond do
      status == "need_more_shares" -> :time_share
      status == "overlap_found" and n >= 2 -> :time_pick
      status == "overlap_found" and n == 1 -> nil
      true -> nil
    end
  end

  def minimum_question_topic(_), do: nil
end
