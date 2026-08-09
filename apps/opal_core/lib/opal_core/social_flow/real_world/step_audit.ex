defmodule OpalCore.SocialFlow.RealWorld.StepAudit do
  @moduledoc """
  Before/after user-step audit for connectors.

  Measures taps, typing, searches, app switches, comparisons, questions,
  permission decisions — not clicks alone.
  """

  alias OpalCore.SocialFlow.RealWorld.Cognition.EffortBudget

  @baselines %{
    "manual_calendar" => %{
      taps: 8,
      typing_burden: 2,
      context_switching: 2,
      thinking_burden: 3,
      privacy_decision_burden: 0,
      manual_search_burden: 1,
      questions: 1,
      app_switches: 1
    },
    "calendar_freebusy" => %{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 0.5,
      privacy_decision_burden: 1,
      manual_search_burden: 0,
      questions: 0,
      app_switches: 0
    },
    "manual_maps" => %{
      taps: 10,
      typing_burden: 1,
      context_switching: 2,
      thinking_burden: 4,
      privacy_decision_burden: 0,
      manual_search_burden: 3,
      questions: 3,
      app_switches: 1
    },
    "location_travel" => %{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 0.5,
      privacy_decision_burden: 1,
      manual_search_burden: 0,
      questions: 0,
      app_switches: 0
    },
    "browse_places" => %{
      taps: 15,
      typing_burden: 0,
      context_switching: 1,
      thinking_burden: 5,
      privacy_decision_burden: 0,
      manual_search_burden: 4,
      questions: 0,
      app_switches: 1
    },
    "compressed_places" => %{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 1,
      privacy_decision_burden: 0,
      manual_search_burden: 0,
      questions: 0,
      app_switches: 0
    },
    "manual_booking" => %{
      taps: 20,
      typing_burden: 3,
      context_switching: 3,
      thinking_burden: 4,
      privacy_decision_burden: 1,
      manual_search_burden: 2,
      questions: 0,
      app_switches: 2
    },
    "aligned_booking" => %{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 0.8,
      privacy_decision_burden: 1,
      manual_search_burden: 0,
      questions: 0,
      app_switches: 0
    }
  }

  def compare(before_key, after_key) do
    before = Map.fetch!(@baselines, before_key)
    afterw = Map.fetch!(@baselines, after_key)
    eb = EffortBudget.estimate(before)
    ea = EffortBudget.estimate(afterw)

    %{
      "before" => before_key,
      "after" => after_key,
      "before_effort" => eb["effort_score"],
      "after_effort" => ea["effort_score"],
      "effort_reduction" => Float.round(eb["effort_score"] - ea["effort_score"], 2),
      "questions_before" => before.questions,
      "questions_after" => afterw.questions,
      "app_switches_before" => before.app_switches,
      "app_switches_after" => afterw.app_switches,
      "passed" => ea["effort_score"] < eb["effort_score"]
    }
  end

  def connector_audits do
    [
      compare("manual_calendar", "calendar_freebusy"),
      compare("manual_maps", "location_travel"),
      compare("browse_places", "compressed_places"),
      compare("manual_booking", "aligned_booking")
    ]
  end
end
