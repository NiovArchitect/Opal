defmodule OpalCore.SocialFlow.ConversationAlignmentW4IntentTest do
  @moduledoc """
  Repair #18 (W4-01) — intent disambiguation gate, pure-fold level.

  The founder's Walk #4 defect: "Schedule 7 am church at Awaken" in a
  thread with an existing 8 PM dinner plan was folded into a
  change_proposal on the dinner plan. The gate must record a NEW-PLAN
  signal instead (sync materializes it as a separate plan), ASK with
  named candidates when the signal is genuinely ambiguous, and leave
  every Division A revision behavior on the ordinary path untouched.

  The real-path versions of these scenarios live in
  shots/regression/cases/fr18-w4-01a/01b/01c.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ConversationAlignment

  defp msg(id, body, sender \\ "user-a"), do: %{id: id, body: body, sender_user_id: sender}

  defp dinner_messages do
    [
      msg("1", "Let's do dinner at Juniper and Ivy on Thursday at 8 PM"),
      msg("2", "Sounds good, 8 PM works for me", "user-b")
    ]
  end

  defp fold_with(extra_messages, opts \\ []) do
    ConversationAlignment.fold(
      dinner_messages() ++ extra_messages,
      ["user-a", "user-b"],
      [],
      opts
    )
  end

  test "founder exact: a scheduling request for a different activity creates a new-plan signal, never a proposal" do
    state = fold_with([msg("3", "Schedule 7 am church at Awaken")])

    assert state["change_proposal"] == nil
    assert [signal] = state["new_plan_signals"]
    assert signal["title"] == "Church at Awaken"
    assert signal["time_label"] == "7:00 AM"
    assert signal["activity"] == "Church"
    assert signal["place"] == "Awaken"
    # The current plan is untouched. (The dinner sentence never locks
    # the activity FIELD - full-sentence intents do not compile to a
    # single activity - so the gate's working keyword carries it.)
    assert get_in(state, ["exact_time", "value"]) == "8:00 PM"
    assert state["activity_keyword"] == "dinner"
  end

  test "varied phrasings record new-plan signals" do
    brunch = fold_with([msg("3", "Schedule 9 am brunch at The Henry")])
    assert brunch["change_proposal"] == nil
    assert [signal] = brunch["new_plan_signals"]
    assert signal["title"] == "Brunch at The Henry"
    assert signal["time_label"] == "9:00 AM"

    soccer = fold_with([msg("3", "Add soccer Saturday 10 am at the park")])
    assert soccer["change_proposal"] == nil
    assert [signal] = soccer["new_plan_signals"]
    assert signal["activity"] == "Soccer"
    assert signal["time_label"] == "Saturday 10:00 AM"
  end

  test "smuggle: scheduling the CURRENT activity asks with named candidates and writes nothing" do
    state = fold_with([msg("3", "Schedule dinner at 7 am")])

    assert state["change_proposal"] == nil
    assert state["new_plan_signals"] in [nil, []]
    assert ask = state["intent_ask"]
    assert ask["kind"] == "new_or_change"
    assert ask["prompt"] =~ "Start a new plan"
    assert ask["prompt"] =~ "change Dinner to 7:00 AM"
    assert state["clarify"] == ask["prompt"]
    assert get_in(state, ["exact_time", "value"]) == "8:00 PM"
  end

  test "an ASK resolves as a new plan when the answer names the new candidate" do
    state =
      fold_with([
        msg("3", "Schedule dinner at 7 am"),
        msg("4", "Start a new one")
      ])

    assert state["intent_ask"] == nil
    assert [signal] = state["new_plan_signals"]
    assert signal["activity"] == "Dinner"
    assert signal["time_value"] == "7:00 AM"
    assert state["change_proposal"] == nil
    assert get_in(state, ["exact_time", "value"]) == "8:00 PM"
  end

  test "a bare yes never resolves an ASK" do
    state =
      fold_with([
        msg("3", "Schedule dinner at 7 am"),
        msg("4", "yes", "user-b")
      ])

    assert state["intent_ask"]["kind"] == "new_or_change"
    assert state["new_plan_signals"] in [nil, []]
    assert state["change_proposal"] == nil
  end

  test "two candidate plans: a bare retarget asks naming both and writes nothing" do
    siblings = [%{"id" => "plan-2", "title" => "Brunch at The Henry", "time_label" => "9:00 AM"}]

    state = fold_with([msg("3", "make it 7 instead")], sibling_plans: siblings)

    assert state["change_proposal"] == nil
    assert ask = state["intent_ask"]
    assert ask["kind"] == "retarget"
    assert String.downcase(ask["prompt"]) =~ "dinner"
    assert String.downcase(ask["prompt"]) =~ "brunch"
    assert get_in(state, ["exact_time", "value"]) == "8:00 PM"
  end

  test "single-plan retarget keeps the ordinary path (no ASK without siblings)" do
    state = fold_with([msg("3", "make it 7 instead")])
    assert state["intent_ask"] == nil
  end

  test "a scheduling phrase naming the current plan's activity never becomes a silent revision" do
    state = fold_with([msg("3", "Schedule a call about dinner tomorrow")])
    # The phrase names the current activity, so rule 4 cannot treat
    # it as a clean new plan: it must ASK (or fall through), and in
    # no case may it mint a new-plan signal or a change proposal.
    assert state["new_plan_signals"] in [nil, []]
    assert state["change_proposal"] == nil
    assert get_in(state, ["exact_time", "value"]) == "8:00 PM"
  end

  test "formation in an empty thread is untouched: a first scheduling message folds as the plan" do
    state =
      ConversationAlignment.fold(
        [msg("1", "Schedule 7 am church at Awaken")],
        ["user-a", "user-b"],
        []
      )

    assert state["new_plan_signals"] in [nil, []]
    assert state["intent_ask"] == nil
    assert get_in(state, ["exact_time", "value"]) == "7:00 AM"
  end
end
