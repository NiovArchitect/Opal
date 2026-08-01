defmodule OpalCore.SocialFlow.MicroJourney do
  @moduledoc """
  Compatibility helpers for the micro-journey model (SF-3 appendix).

  Does **not** implement a generic workflow engine or SocialJourney table.
  Maps existing SF-1/2/3 domain events to conceptual micro-journey types
  for tests, evidence, and future orchestration.
  """

  @reward_levels %{
    invisible: 0,
    quiet: 1,
    meaningful_completion: 2,
    shared_progress: 3,
    major_milestone: 4
  }

  @doc "Reward intensity levels 0–4 (socially meaningful reward)."
  def reward_levels, do: @reward_levels

  @doc """
  Whether a user-facing signal is appropriate for a transition class.
  """
  def signal_policy(transition) when is_atom(transition) or is_binary(transition) do
    case to_string(transition) do
      "message_delivered" -> :record_only
      "duplicate_suppressed" -> :invisible
      "relevance_ranked" -> :invisible
      "question_answered" -> :quiet_resolve
      "all_agreed" -> :shared_signal
      "private_reminder_created" -> :owner_only
      "commitment_completed" -> :calm_completion
      "open_loop_resolved" -> :calm_completion
      "pre_send_clarified" -> :private_insight
      "ambiguity_flagged" -> :private_insight
      "repair_offered" -> :private_insight
      "trip_ready" -> :major_milestone_rare
      _ -> :contextual
    end
  end

  @doc "Prohibited engagement mechanics (must never be implemented as rewards)."
  def prohibited_mechanics do
    [
      :points_for_app_open,
      :message_volume_reward,
      :daily_use_streak,
      :false_celebration,
      :public_achievement_rank,
      :variable_compulsion_reward,
      :relationship_decline_fear,
      :social_score,
      :partner_driven_interrupt
    ]
  end

  @doc "Map SF-3 insight type to micro-journey type."
  def from_insight_type(type) when is_binary(type) do
    case type do
      "pre_send_clarity" -> :pre_send_clarity
      "open_loop" -> :unanswered_question
      "ambiguity" -> :ambiguity_check
      "repair" -> :impact_repair
      "decision_summary" -> :decision_summary
      _ -> :unknown
    end
  end

  @doc "Next-best action includes leave-it-alone."
  def next_best_actions(micro_type) do
    base =
      case micro_type do
        :pre_send_clarity -> ["help_answer", "send_as_written", "dismiss"]
        :unanswered_question -> ["reply_now", "remind_later", "not_needed", "dismiss"]
        :ambiguity_check -> ["ask_clarify", "continue", "dismiss"]
        :impact_repair -> ["help_respond", "write_myself", "dismiss"]
        _ -> ["dismiss"]
      end

    base ++ ["leave_it_alone"]
  end

  @doc "Partner commercial emission is forbidden in SF-3."
  def partner_commercial_allowed?, do: false
end
