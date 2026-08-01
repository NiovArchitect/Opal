defmodule OpalCore.SocialFlow.MeaningTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, Messages, SocialFlow}
  alias OpalCore.SocialFlow.Meaning

  setup do
    FixturesHelper.seed!()
    :ok
  end

  test "Journey A: pre-send clarity without auto-send or mind-reading" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_alex_jordan_id()

    {:ok, jordan_msg, :created} =
      Messages.accept_message(%{
        conversation_id: conv,
        sender_user_id: jordan,
        client_message_id: "cm-j-sat",
        message_type: "text",
        body: "I thought we were spending Saturday together. Are you still planning to come?"
      })

    draft = "I already told you I might be busy. I don't know why this is such a big deal."

    assert {:ok, %{insight: insight, draft_assist: assist}, :created} =
             Meaning.pre_send_check(%{
               owner_user_id: alex,
               conversation_id: conv,
               draft_text: draft,
               prior_messages: [%{id: jordan_msg.id, body: jordan_msg.body}],
               idempotency_key: "presend-a1",
               trace_id: "trace-a1"
             })

    assert insight.privacy_class == "private"
    assert insight.owner_user_id == alex
    assert insight.copy =~ "still coming" or insight.copy =~ "does not answer"
    refute insight.copy =~ "angry"
    refute insight.copy =~ "needy"
    assert assist.suggested_draft =~ "not sure yet"
    assert assist.owner_user_id == alex

    # Help me answer clearly
    assert {:ok, %{suggested_draft: suggested}} =
             Meaning.act_pre_send(%{
               insight_id: insight.id,
               user_id: alex,
               action: "help_answer"
             })

    assert is_binary(suggested)
    assert suggested =~ "not sure yet"

    # Taylor cannot access
    assert {:error, :forbidden} = Meaning.get_insight_for_user(insight.id, taylor)
    assert {:error, :forbidden} = Meaning.get_draft_for_user(assist.id, jordan)
    assert {:error, :forbidden} = Meaning.get_draft_for_user(assist.id, taylor)

    # Jordan sync does not include Alex private insights
    assert {:ok, jsync} = Meaning.sync_meaning(jordan, conv)
    refute Enum.any?(jsync["insights"], &(&1["id"] == insight.id))
  end

  test "Journey B: unanswered second question open loop" do
    maya = Fixtures.user_maya_id()
    chris = Fixtures.user_chris_id()
    conv = Fixtures.conv_maya_chris_id()

    {:ok, m1, :created} =
      Messages.accept_message(%{
        conversation_id: conv,
        sender_user_id: maya,
        client_message_id: "cm-m-dual",
        message_type: "text",
        body: "Can you pick me up at 6, and did you make the dinner reservation?"
      })

    {:ok, _m2, :created} =
      Messages.accept_message(%{
        conversation_id: conv,
        sender_user_id: chris,
        client_message_id: "cm-c-partial",
        message_type: "text",
        body: "Yes, 6 works."
      })

    assert {:ok, results} =
             Meaning.detect_open_loops(%{
               owner_user_id: chris,
               conversation_id: conv,
               messages: [
                 %{id: m1.id, body: m1.body},
                 %{id: "x", body: "Yes, 6 works."}
               ],
               idempotency_key: "ol-b1",
               trace_id: "trace-b1"
             })

    assert match?([_ | _], results)

    {:ok, %{insight: insight, open_loop: loop}, :created} =
      Enum.find(results, fn
        {:ok, %{insight: _}, :created} -> true
        _ -> false
      end)

    assert insight.copy =~ "reservation" or insight.copy =~ "pickup"
    assert loop.status in ~w(open partially_answered)
    assert loop.owner_user_id == chris

    # Maya cannot see Chris open loops
    assert {:ok, msync} = Meaning.sync_meaning(maya, conv)
    refute Enum.any?(msync["open_loops"], &(&1["id"] == loop.id))

    # Resolve
    assert {:ok, resolved} =
             Meaning.resolve_open_loop(%{
               open_loop_id: loop.id,
               user_id: chris,
               action: "resolved"
             })

    assert resolved.status == "resolved"

    # Idempotent — does not recreate active
    assert {:ok, results2} =
             Meaning.detect_open_loops(%{
               owner_user_id: chris,
               conversation_id: conv,
               messages: [
                 %{id: m1.id, body: m1.body},
                 %{id: "x", body: "Yes, 6 works."}
               ],
               idempotency_key: "ol-b1",
               trace_id: "trace-b1-dup"
             })

    assert Enum.all?(results2, fn
             {:ok, _, :idempotent_terminal} -> true
             {:ok, _, :idempotent} -> true
             _ -> false
           end)
  end

  test "Journey C: what did we decide excludes private reminders" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    # Minimal plan via SF1 path
    assert {:ok, %{proposal: proposal, options: options}} =
             SocialFlow.create_proposal_from_ai_result(%{
               conversation_id: conv,
               requester_user_id: alex,
               output: %{
                 "result_type" => "plan_candidate",
                 "candidate" => %{
                   "activity" => "dinner",
                   "normalized_time_candidates" => [
                     %{"label" => "Thursday at 7:30 PM", "confidence" => 0.9}
                   ],
                   "recommended_signal_copy" => "Dinner may be a plan.",
                   "confidence" => 0.9,
                   "participant_mentions" => [],
                   "possible_commitments" => [],
                   "missing_information" => []
                 },
                 "uncertainty" => []
               },
               source_message_ids: [],
               trace_id: "trace-c-plan"
             })

    SocialFlow.approve_coordination(%{proposal_id: proposal.id, user_id: alex, trace_id: "c1"})
    option = hd(options)

    SocialFlow.respond_to_option(%{
      option_id: option.id,
      user_id: alex,
      response: "accept",
      trace_id: "c2"
    })

    {:ok, %{plan: plan}} =
      SocialFlow.respond_to_option(%{
        option_id: option.id,
        user_id: jordan,
        response: "accept",
        trace_id: "c3"
      })

    SocialFlow.create_private_reminder(%{
      plan_id: plan.id,
      user_id: alex,
      content_summary: "SECRET private prep",
      trace_id: "c-rem"
    })

    assert {:ok, summary} =
             Meaning.what_did_we_decide(%{
               owner_user_id: alex,
               conversation_id: conv
             })

    texts =
      (summary["confirmed"] ++ summary["still_open"] ++ summary["handled"])
      |> Enum.map(& &1["text"])
      |> Enum.join(" ")

    assert texts =~ "7:30" or texts =~ "Thursday" or texts =~ "Dinner"
    refute texts =~ "SECRET private prep"
    assert summary["privacy_class"] == "private"
    assert summary["source_lineage"]["excludes"]
  end

  test "Journey D: ambiguity without diagnosis" do
    chris = Fixtures.user_chris_id()
    maya = Fixtures.user_maya_id()
    conv = Fixtures.conv_maya_chris_id()

    {:ok, msg, :created} =
      Messages.accept_message(%{
        conversation_id: conv,
        sender_user_id: maya,
        client_message_id: "cm-amb",
        message_type: "text",
        body: "Do whatever you want."
      })

    assert {:ok, insight, :created} =
             Meaning.detect_ambiguity(%{
               owner_user_id: chris,
               conversation_id: conv,
               message_id: msg.id,
               body: msg.body,
               idempotency_key: "amb-1"
             })

    assert insight.copy =~ "more than one way"
    refute insight.copy =~ "angry"
    refute insight.copy =~ "passive"
    assert insight.suggested_draft =~ "make sure I understand"

    assert {:ok, corrected} =
             Meaning.correct_insight(%{
               insight_id: insight.id,
               user_id: chris,
               label: "opal_misunderstood"
             })

    assert corrected.status == "corrected"
  end

  test "Journey E: repair after explicit impact statement" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    {:ok, msg, :created} =
      Messages.accept_message(%{
        conversation_id: conv,
        sender_user_id: jordan,
        client_message_id: "cm-impact",
        message_type: "text",
        body: "That felt dismissive. I was trying to explain why this mattered to me."
      })

    assert {:ok, insight, :created} =
             Meaning.detect_repair_opportunity(%{
               owner_user_id: alex,
               conversation_id: conv,
               message_id: msg.id,
               body: msg.body,
               idempotency_key: "repair-1"
             })

    assert insight.copy =~ "felt dismissive"
    assert insight.suggested_draft =~ "logistics"
    refute insight.suggested_draft =~ "I'm sorry I am a bad partner"
    assert insight.privacy_class == "private"

    assert {:error, :forbidden} = Meaning.get_insight_for_user(insight.id, jordan)
  end

  test "diagnosis language refused on pre-send" do
    alex = Fixtures.user_alex_id()
    conv = Fixtures.conv_alex_jordan_id()

    assert {:error, :diagnosis_language_refused} =
             Meaning.pre_send_check(%{
               owner_user_id: alex,
               conversation_id: conv,
               draft_text: "You are so manipulative and unhealthy",
               prior_messages: [],
               idempotency_key: "bad-1"
             })
  end
end
