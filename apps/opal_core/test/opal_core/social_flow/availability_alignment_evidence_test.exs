defmodule OpalCore.SocialFlow.AvailabilityAlignmentEvidenceTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.AvailabilityAlignmentEvidence

  test "maps overlap statuses to gap topics without authorizing Set" do
    assert {:gap, :time_availability, :share} =
             AvailabilityAlignmentEvidence.from_overlap(%{"overlap_status" => "need_more_shares"})

    assert {:gap, :time_availability, :more_windows} =
             AvailabilityAlignmentEvidence.from_overlap(%{"overlap_status" => "no_overlap"})

    assert {:resolved, :time_availability} =
             AvailabilityAlignmentEvidence.from_overlap(%{"overlap_status" => "overlap_found"})

    assert {:gap, :trust, :blocked} =
             AvailabilityAlignmentEvidence.from_overlap(%{"overlap_status" => "blocked"})

    refute AvailabilityAlignmentEvidence.authorizes_set?()
  end

  test "minimum question topic stays silent for single clear overlap" do
    assert is_nil(
             AvailabilityAlignmentEvidence.minimum_question_topic(%{
               "overlap_status" => "overlap_found",
               "overlaps" => [%{}]
             })
           )

    assert :time_pick =
             AvailabilityAlignmentEvidence.minimum_question_topic(%{
               "overlap_status" => "overlap_found",
               "overlaps" => [%{}, %{}]
             })
  end
end
