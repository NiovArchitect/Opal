defmodule OpalCore.SocialFlow.MicroJourneyTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.MicroJourney

  test "signal policy distinguishes invisible vs user-facing transitions" do
    assert MicroJourney.signal_policy(:duplicate_suppressed) == :invisible
    assert MicroJourney.signal_policy(:relevance_ranked) == :invisible
    assert MicroJourney.signal_policy(:commitment_completed) == :calm_completion
    assert MicroJourney.signal_policy(:all_agreed) == :shared_signal
  end

  test "prohibited engagement mechanics are enumerated" do
    assert :social_score in MicroJourney.prohibited_mechanics()
    assert :daily_use_streak in MicroJourney.prohibited_mechanics()
    assert :points_for_app_open in MicroJourney.prohibited_mechanics()
  end

  test "next-best actions always allow leave-it-alone" do
    for t <- [:pre_send_clarity, :unanswered_question, :ambiguity_check, :impact_repair] do
      assert "leave_it_alone" in MicroJourney.next_best_actions(t)
    end
  end

  test "partner commercial not allowed in SF-3" do
    refute MicroJourney.partner_commercial_allowed?()
  end

  test "insight types map to micro-journey types" do
    assert MicroJourney.from_insight_type("pre_send_clarity") == :pre_send_clarity
    assert MicroJourney.from_insight_type("open_loop") == :unanswered_question
  end

  test "reward levels are bounded 0-4" do
    levels = MicroJourney.reward_levels()
    assert levels.invisible == 0
    assert levels.major_milestone == 4
  end
end
