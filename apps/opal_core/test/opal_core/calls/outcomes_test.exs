defmodule OpalCore.Calls.OutcomesTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.Assist
  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Calls.Outcomes
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.SharedPlan

  test "OUTCOME_TIME_PROPOSAL creates plan_time_proposed without mutating canonical time" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, %{folded: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-propose-8",
               "confidence" => 0.93
             })

    state = ConversationAlignment.sync_conversation(call.conversation_id)
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["change_proposal"]["value"] =~ "8:00 PM"

    proposed = outcomes_of(call.conversation_id, "plan_time_proposed")
    assert length(proposed) == 1
    [row] = proposed
    assert row.before_value =~ "6:30 PM"
    assert row.after_value =~ "8:00 PM"
    assert row.proposer_user_id == a.id
    assert row.source_type == "call_transcript"
    assert row.call_id == call.id
    refute Enum.any?(outcomes_of(call.conversation_id, "plan_time_changed"))
  end

  test "OUTCOME_TIME_ACCEPTED records plan_time_changed with before/after and parties" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, %{segment_id: segment_id}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-accept-8",
               "confidence" => 0.94
             })

    before_plan = ConversationAlignment.sync_conversation(call.conversation_id)
    assert before_plan["exact_time"]["value"] == "6:30 PM"

    assert {:ok, accepted} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)
    assert accepted["exact_time"]["value"] == "8:00 PM"
    assert accepted["change_proposal"] == nil

    changed = outcomes_of(call.conversation_id, "plan_time_changed")
    assert length(changed) == 1
    [row] = changed
    assert row.before_value =~ "6:30 PM"
    assert row.after_value =~ "8:00 PM"
    assert row.proposer_user_id == a.id
    assert row.accepter_user_id == b.id
    assert segment_id in row.source_segment_ids
    assert is_integer(row.plan_version)
    plan = Repo.get_by!(SharedPlan, conversation_id: call.conversation_id)
    assert row.plan_id == plan.id
    assert get_in(row.provenance, ["kind"]) == "acceptance"
    assert get_in(row.provenance, ["source_segment_id"]) == segment_id

    listed = Outcomes.list_for_conversation(call.conversation_id)
    assert Enum.any?(listed, &(&1["outcome_type"] == "plan_time_changed"))
    assert Enum.any?(listed, &(&1["presentation"]["label"] == "Plan updated"))

    call_listed = Outcomes.list_for_call(call.id)
    assert Enum.any?(call_listed, &(&1["outcome_type"] == "plan_time_changed"))
  end

  test "OUTCOME_TIME_KEEP_CURRENT records keep and never plan_time_changed" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-keep-8",
               "confidence" => 0.9
             })

    assert {:ok, kept} = ConversationAlignment.keep_committed_plan(call.conversation_id, b.id)
    assert kept["exact_time"]["value"] == "6:30 PM"
    assert kept["change_proposal"] == nil

    assert length(outcomes_of(call.conversation_id, "plan_time_proposed")) == 1
    assert length(outcomes_of(call.conversation_id, "plan_time_kept")) == 1
    assert outcomes_of(call.conversation_id, "plan_time_changed") == []

    [kept_row] = outcomes_of(call.conversation_id, "plan_time_kept")
    assert kept_row.before_value =~ "6:30 PM"
    assert kept_row.after_value =~ "6:30 PM"
    assert kept_row.accepter_user_id == b.id
    assert get_in(kept_row.provenance, ["rejected_value"]) =~ "8:00 PM"
  end

  test "OUTCOME_ACTIVITY_ACCEPTED and OUTCOME_DEPENDENCY_PARITY" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Let's do church instead.",
               "final" => true,
               "provider_segment_id" => "out-church",
               "confidence" => 0.9
             })

    proposed = ConversationAlignment.sync_conversation(call.conversation_id)
    assert proposed["activity"]["value"] == "Dinner"
    assert proposed["change_proposal"]["value"] == "Church"
    assert length(outcomes_of(call.conversation_id, "plan_activity_proposed")) == 1

    assert {:ok, accepted} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)
    assert accepted["activity"]["value"] == "Church"
    assert accepted["date"]["value"] == "tomorrow"
    assert accepted["exact_time"]["value"] == "6:30 PM"
    refute accepted["place"]["state"] == "locked"
    refute accepted["place"]["value"] == "Fort Oak"
    refute get_in(accepted, ["execution", "state"]) == "agreed"

    changed = outcomes_of(call.conversation_id, "plan_activity_changed")
    assert length(changed) == 1
    [row] = changed
    assert row.before_value == "Dinner"
    assert row.after_value == "Church"
    assert row.proposer_user_id == a.id
    assert row.accepter_user_id == b.id
  end

  test "OUTCOME_IDEMPOTENCY transcript and accept replay produce zero duplicates" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    attrs = %{
      "text" => "Actually, let's make it eight.",
      "final" => true,
      "provider_segment_id" => "out-idem-8",
      "confidence" => 0.91
    }

    assert {:ok, first} = Assist.accept_transcript(call.id, a.id, attrs)
    assert {:ok, second} = Assist.accept_transcript(call.id, a.id, attrs)
    assert first.segment_id == second.segment_id
    assert length(outcomes_of(call.conversation_id, "plan_time_proposed")) == 1

    assert {:ok, _} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)
    assert length(outcomes_of(call.conversation_id, "plan_time_changed")) == 1

    proposal = %{
      "field" => "exact_time",
      "value" => "8:00 PM",
      "current" => "6:30 PM",
      "proposed_by_user_id" => a.id,
      "accepted_by_user_id" => b.id,
      "accepted_plan_version" => 2,
      "source_segment_id" => first.segment_id,
      "source_call_id" => call.id,
      "source_type" => "call_transcript",
      "proposal_id" => "replay-key"
    }

    # Force same idempotency key as would be derived from segment.
    assert {:ok, _} =
             Outcomes.record_acceptance(
               call.conversation_id,
               Map.put(proposal, "proposal_id", nil)
               |> Map.put("source_segment_id", first.segment_id)
             )

    assert length(outcomes_of(call.conversation_id, "plan_time_changed")) == 1
  end

  test "OUTCOME_STALE_PROPOSAL never generates changed outcome for superseded proposal" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-stale-8",
               "confidence" => 0.9
             })

    first = ConversationAlignment.sync_conversation(call.conversation_id)
    first_proposal = first["change_proposal"]
    assert first_proposal["value"] =~ "8:00 PM"

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it nine.",
               "final" => true,
               "provider_segment_id" => "out-stale-9",
               "confidence" => 0.9
             })

    second = ConversationAlignment.sync_conversation(call.conversation_id)
    assert second["change_proposal"]["value"] =~ "9:00 PM"
    assert second["exact_time"]["value"] == "6:30 PM"

    # Old proposal cannot be accepted once superseded.
    if is_binary(first_proposal["proposal_id"]) do
      assert {:error, :stale_proposal} =
               ConversationAlignment.accept_committed_change(
                 call.conversation_id,
                 b.id,
                 first_proposal["proposal_id"]
               )
    end

    assert Outcomes.record_acceptance(
             call.conversation_id,
             Map.put(first_proposal, "status", "superseded")
           ) == :skipped

    assert outcomes_of(call.conversation_id, "plan_time_changed") == []
    assert second["exact_time"]["value"] == "6:30 PM"

    assert {:ok, accepted} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)
    assert accepted["exact_time"]["value"] == "9:00 PM"
    changed = outcomes_of(call.conversation_id, "plan_time_changed")
    assert length(changed) == 1
    assert hd(changed).after_value =~ "9:00 PM"
  end

  test "OUTCOME_PROVENANCE is complete for proposal and acceptance" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, %{segment_id: segment_id}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-prov-8",
               "confidence" => 0.92
             })

    [proposed] = outcomes_of(call.conversation_id, "plan_time_proposed")
    assert proposed.provenance["kind"] == "proposal"
    assert proposed.provenance["source_segment_id"] == segment_id
    assert proposed.provenance["source_call_id"] == call.id
    assert proposed.provenance["source_type"] == "call_transcript"
    assert proposed.provenance["field"] in ["exact_time", "datetime"]

    assert {:ok, _} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)
    [changed] = outcomes_of(call.conversation_id, "plan_time_changed")
    assert changed.provenance["kind"] == "acceptance"
    assert changed.provenance["source_segment_id"] == segment_id
    assert changed.provenance["proposer_user_id"] == a.id
    assert changed.provenance["accepter_user_id"] == b.id
    assert is_integer(changed.plan_version)
  end

  test "OUTCOME_NO_LONG_TERM_MEMORY plan and operational outcomes never write memory" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-mem-8",
               "confidence" => 0.9
             })

    assert {:ok, _} = ConversationAlignment.accept_committed_change(call.conversation_id, b.id)

    for row <- Repo.all(from o in CallOutcome, where: o.conversation_id == ^call.conversation_id) do
      assert Outcomes.write_long_term_memory?(row) == false
      assert {:reject, _} = Outcomes.memory_candidate_eligibility(row)
    end
  end

  test "OUTCOME_CROSS_SOURCE_MODEL chat and call share one CallOutcome model" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)

    assert {:ok, chat_state} =
             ConversationAlignment.propose_committed_change(
               call.conversation_id,
               a.id,
               "exact_time",
               "8:00 PM"
             )

    assert chat_state["change_proposal"]["value"] == "8:00 PM"
    [chat_row] = outcomes_of(call.conversation_id, "plan_time_proposed")
    assert chat_row.source_type == "chat"
    assert is_nil(chat_row.call_id) or chat_row.call_id == call.id

    assert {:ok, _} = ConversationAlignment.keep_committed_plan(call.conversation_id, b.id)

    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "out-cross-8",
               "confidence" => 0.9
             })

    voice_rows =
      outcomes_of(call.conversation_id, "plan_time_proposed")
      |> Enum.filter(&(&1.source_type == "call_transcript"))

    assert length(voice_rows) == 1
    assert hd(voice_rows).__struct__ == CallOutcome
    assert chat_row.__struct__ == CallOutcome
  end

  test "commitment open_question and waiting_on narrow proofs without memory write" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    activate_assist(call, a, b)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "I'll bring the tickets.",
               "final" => true,
               "provider_segment_id" => "out-commit",
               "confidence" => 0.95
             })

    [commitment] = outcomes_of(call.conversation_id, "commitment_created")
    assert commitment.actor_user_id == a.id
    assert commitment.after_value =~ "tickets"
    assert {:reject, _} = Outcomes.memory_candidate_eligibility(commitment)

    assert {:ok, _} =
             Assist.accept_transcript(call.id, b.id, %{
               "text" => "What hotel are we staying at?",
               "final" => true,
               "provider_segment_id" => "out-hotel-q",
               "confidence" => 0.95
             })

    [question] = outcomes_of(call.conversation_id, "open_question_created")
    assert question.after_value == "hotel"
    assert question.entity_id == "hotel"

    assert {:ok, _} =
             Assist.accept_transcript(call.id, b.id, %{
               "text" => "I'll know Friday if I can go.",
               "final" => true,
               "provider_segment_id" => "out-wait-fri",
               "confidence" => 0.95
             })

    [waiting] = outcomes_of(call.conversation_id, "waiting_on_created")
    assert waiting.after_value =~ "Friday"
    assert waiting.provenance["participation"] == "not_confirmed"

    state = ConversationAlignment.sync_conversation(call.conversation_id)
    refute state["exact_time"]["value"] == "8:00 PM"
  end

  defp outcomes_of(conversation_id, type) do
    Repo.all(
      from o in CallOutcome,
        where: o.conversation_id == ^conversation_id and o.outcome_type == ^type,
        order_by: [asc: o.inserted_at]
    )
  end

  defp activate_assist(call, a, b) do
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)
  end

  defp connected_pair do
    a = user("out-a")
    b = user("out-b")
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, %{"consent_proof_id" => grant_act_on_behalf!(a.id, "calls_outbound", conversation_id: conv.id)})
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, live} = Calls.mark_media_connected(call.id, a.id)
    {a, b, live}
  end

  defp seed_plan(conversation_id, a_id, b_id) do
    for {body, seq, sender} <- [
          {"Can you meet tomorrow?", 10, a_id},
          {"Any time after 6 works.", 11, b_id},
          {"Let's do 6:30.", 12, a_id}
        ] do
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conversation_id,
        sender_user_id: sender,
        client_message_id: "m-#{seq}-#{System.unique_integer([:positive])}",
        message_type: "text",
        body: body,
        server_seq: seq
      })
      |> Repo.insert!()
    end

    actions = [
      act("activity_lock", a_id, "dinner", 10, "user_stated"),
      act("place_propose", a_id, "Fort Oak", 11),
      act("place_confirm", b_id, "Fort Oak", 12, "agreed"),
      act("reservation_authorize", a_id, "Fort Oak", 13),
      act("reservation_authorize", b_id, "Fort Oak", 14, "agreed")
    ]

    state =
      ConversationAlignment.fold(
        [
          %{id: "1", body: "Can you meet tomorrow?", sender_user_id: a_id, seq: 10},
          %{id: "2", body: "Any time after 6 works.", sender_user_id: b_id, seq: 11},
          %{id: "3", body: "Let's do 6:30.", sender_user_id: a_id, seq: 12}
        ],
        [a_id, b_id],
        actions
      )

    %SharedPlan{}
    |> SharedPlan.changeset(%{
      conversation_id: conversation_id,
      title: "Fort Oak",
      status: "agreed",
      timezone: "America/Los_Angeles",
      created_by_user_id: a_id,
      alignment: state
    })
    |> Repo.insert!()

    ConversationAlignment.sync_conversation(conversation_id)
  end

  defp act(kind, actor, value, seq, truth \\ "proposed") do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "seq" => seq,
      "truth" => truth,
      "explicit" => true
    }
  end

  defp user(prefix) do
    %User{}
    |> User.changeset(%{handle: "#{prefix}-#{System.unique_integer([:positive])}", display_name: prefix})
    |> Repo.insert!()
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "outcomes-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for person <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: person.id})
      |> Repo.insert!()
    end

    conv
  end
end
