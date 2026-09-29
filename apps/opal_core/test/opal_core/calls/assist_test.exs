defmodule OpalCore.Calls.AssistTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.Assist
  alias OpalCore.Calls.TranscriptSegment
  alias OpalCore.Calls.VoiceAlignment
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.Calls.CallOutcome
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.HomeProjection
  alias OpalCore.SocialFlow.SharedPlan

  test "assist stays off until both connected participants allow it" do
    {a, b, call} = connected_call()

    assert {:ok, %{assist: :off}} = Assist.state(call.id, a.id)
    assert {:error, :assist_inactive} = Assist.grant(call.id, a.id, fn -> flunk("no grant") end)

    assert {:ok, %{assist: :waiting_for_other}} = Assist.set_allowed(call.id, a.id, true)
    assert {:error, :assist_inactive} = Assist.grant(call.id, a.id, fn -> flunk("no grant") end)

    assert {:ok, %{assist: :active}} = Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{access_token: "short-lived", expires_in: 60}} =
             Assist.grant(call.id, a.id, fn -> {:ok, %{access_token: "short-lived", expires_in: 60}} end)

    assert {:ok, %{assist: :off}} = Assist.set_allowed(call.id, a.id, false)
    assert {:error, :assist_inactive} = Assist.grant(call.id, b.id, fn -> flunk("revoked") end)
  end

  test "interim speech is not stored and does not fold" do
    {a, b, call} = connected_pair()
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: false, folded: false}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually let's make",
               "final" => false,
               "provider_segment_id" => "interim-1"
             })

    assert Repo.aggregate(TranscriptSegment, :count) == 0
  end

  test "a final eight o'clock utterance proposes 8 PM without committing it" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: true, folded: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "seg-8",
               "confidence" => 0.92
             })

    state = ConversationAlignment.sync_conversation(call.conversation_id)
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["exact_time"]["state"] == "locked"
    assert state["change_proposal"]["value"] =~ "8:00 PM"
    assert state["change_proposal"]["source_type"] == "call_transcript"
    assert state["change_proposal"]["speaker_user_id"] == a.id
    assert state["place"]["value"] == "Fort Oak"

    assert {:ok, %{persisted: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "seg-8",
               "confidence" => 0.92
             })

    assert Repo.aggregate(TranscriptSegment, :count) == 1

    low = ConversationAlignment.sync_conversation(call.conversation_id)
    assert low["exact_time"]["value"] == "6:30 PM"

    assert {:ok, %{persisted: true, folded: false}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it nine.",
               "final" => true,
               "provider_segment_id" => "seg-low",
               "confidence" => 0.2
             })

    after_low = ConversationAlignment.sync_conversation(call.conversation_id)
    assert after_low["change_proposal"]["value"] =~ "8:00 PM"
    assert VoiceAlignment.normalize("eight") == "8"
  end

  test "VOICE_FINAL_SEGMENT_TO_ALIGNMENT VOICE_FINAL_SEGMENT_PROVENANCE and VOICE_TIME_PROPOSAL_TO_GRAPH" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    before = ConversationAlignment.sync_conversation(call.conversation_id)
    assert before["exact_time"]["value"] == "6:30 PM"
    assert before["date"]["value"] == "tomorrow"
    assert before["place"]["value"] == "Fort Oak"
    home_before = HomeProjection.from_alignment(before, call.conversation_id, 2)
    assert home_before["when_label"] =~ "6:30 PM"
    assert home_before["pending_change"] == false

    assert {:ok, %{persisted: true, folded: true, segment_id: segment_id}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "voice-eight",
               "confidence" => 0.91,
               "provider" => "deepgram"
             })

    proposed = ConversationAlignment.sync_conversation(call.conversation_id)
    assert proposed["exact_time"]["value"] == "6:30 PM"
    assert proposed["exact_time"]["state"] == "locked"
    assert proposed["change_proposal"]["field"] in ["exact_time", "datetime"]
    assert proposed["change_proposal"]["value"] =~ "8:00 PM"
    assert proposed["change_proposal"]["source_type"] == "call_transcript"
    assert proposed["change_proposal"]["source_call_id"] == call.id
    assert proposed["change_proposal"]["source_segment_id"] == segment_id
    assert proposed["change_proposal"]["speaker_user_id"] == a.id
    assert proposed["change_proposal"]["confidence"] == 0.91
    assert proposed["place"]["value"] == "Fort Oak"
    assert proposed["activity"]["value"] == "Dinner"
    refute Repo.exists?(from m in Message, where: m.body == "Actually, let's make it eight.")

    assert Repo.aggregate(CallOutcome, :count) == 1
    outcome = Repo.one!(CallOutcome)
    assert outcome.outcome_type == "plan_time_proposal"
    assert outcome.call_id == call.id
    assert outcome.entity_id =~ "8:00 PM"

    home_pending = HomeProjection.from_alignment(proposed, call.conversation_id, 2)
    assert home_pending["when_label"] =~ "6:30 PM"
    assert home_pending["pending_change"] == true
    assert home_pending["place"] == "Fort Oak"

    assert {:ok, accepted} =
             ConversationAlignment.accept_committed_change(call.conversation_id, b.id)

    assert accepted["exact_time"]["value"] == "8:00 PM"
    assert accepted["exact_time"]["state"] == "locked"
    assert accepted["change_proposal"] == nil
    assert accepted["place"]["value"] == "Fort Oak"
    assert accepted["date"]["value"] == "tomorrow"
    home_after = HomeProjection.from_alignment(accepted, call.conversation_id, 2)
    assert home_after["when_label"] =~ "8:00 PM"
    assert home_after["place"] == "Fort Oak"
    assert home_after["lineage_id"] == home_before["lineage_id"]
    assert Repo.aggregate(CallOutcome, :count, :id) == 2
  end

  test "VOICE_COMMITTED_PLAN_PROPOSES_WITHOUT_RESERVATION_EXECUTION" do
    {a, b, call} = connected_pair()
    seed_plan_without_reservation(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    before = ConversationAlignment.sync_conversation(call.conversation_id)
    assert before["exact_time"]["state"] == "locked"
    assert before["place"]["state"] == "locked"
    refute get_in(before, ["execution", "state"]) == "agreed"

    assert {:ok, %{persisted: true, folded: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "no-exec-eight",
               "confidence" => 0.9,
               "provider" => "development_fixture"
             })

    proposed = ConversationAlignment.sync_conversation(call.conversation_id)
    assert proposed["exact_time"]["value"] == "6:30 PM"
    assert proposed["exact_time"]["state"] == "locked"
    assert proposed["change_proposal"]["value"] =~ "8:00 PM"
    assert proposed["change_proposal"]["source_type"] == "call_transcript"
    assert proposed["place"]["value"] == "Fort Oak"
  end

  test "VOICE_INTERIM_NO_MUTATION" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: false, folded: false}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually let's make—",
               "final" => false,
               "provider_segment_id" => "interim-cut"
             })

    state = ConversationAlignment.sync_conversation(call.conversation_id)
    assert state["change_proposal"] == nil
    assert state["exact_time"]["value"] == "6:30 PM"
    assert Repo.aggregate(TranscriptSegment, :count) == 0
  end

  test "VOICE_LOW_CONFIDENCE_NO_SILENT_MUTATION" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: true, folded: false}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "low-eight",
               "confidence" => 0.2
             })

    state = ConversationAlignment.sync_conversation(call.conversation_id)
    assert state["change_proposal"] == nil
    assert state["exact_time"]["value"] == "6:30 PM"
    assert Repo.aggregate(CallOutcome, :count) == 0
  end

  test "VOICE_FINAL_SEGMENT_IDEMPOTENCY VOICE_TRANSCRIPT_REPLAY_DUPLICATE is zero" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)
    attrs = %{
      "text" => "Actually, let's make it eight.",
      "final" => true,
      "provider_segment_id" => "same-seg",
      "confidence" => 0.9
    }

    assert {:ok, first} = Assist.accept_transcript(call.id, a.id, attrs)
    assert {:ok, second} = Assist.accept_transcript(call.id, a.id, attrs)
    assert first.segment_id == second.segment_id
    assert second.folded == false
    assert Repo.aggregate(TranscriptSegment, :count) == 1
    assert Repo.aggregate(CallOutcome, :count) == 1
    state = ConversationAlignment.sync_conversation(call.conversation_id)
    assert state["change_proposal"]["value"] == "8:00 PM"
  end

  test "VOICE_ACTIVITY_PROPOSAL_DEPENDENCY church keeps the time until acceptance" do
    {a, b, call} = connected_pair()
    seed_plan(call.conversation_id, a.id, b.id)
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{folded: true}} =
             Assist.accept_transcript(call.id, b.id, %{
               "text" => "Let's do church instead.",
               "final" => true,
               "provider_segment_id" => "church-1",
               "confidence" => 0.88
             })

    proposed = ConversationAlignment.sync_conversation(call.conversation_id)
    assert proposed["change_proposal"]["field"] == "activity"
    assert proposed["change_proposal"]["value"] == "Church"
    assert proposed["change_proposal"]["source_type"] == "call_transcript"
    assert proposed["change_proposal"]["speaker_user_id"] == b.id
    assert proposed["exact_time"]["value"] == "6:30 PM"
    assert proposed["place"]["value"] == "Fort Oak"
    assert proposed["date"]["value"] == "tomorrow"

    assert {:ok, accepted} = ConversationAlignment.accept_committed_change(call.conversation_id, a.id)
    assert accepted["activity"]["value"] == "Church"
    assert accepted["exact_time"]["value"] == "6:30 PM"
    assert accepted["date"]["value"] == "tomorrow"
    refute accepted["place"]["state"] == "locked"
    refute accepted["place"]["value"] == "Fort Oak"
    assert accepted["change_proposal"] == nil
  end

  test "both account defaults make assist active for caller and callee" do
    {a, b, call} = connected_call()
    Repo.update!(User.changeset(a, %{assist_calls_enabled: true}))
    Repo.update!(User.changeset(b, %{assist_calls_enabled: true}))

    assert {:ok, %{assist: :active}} = Assist.state(call.id, a.id)
    assert {:ok, %{assist: :active}} = Assist.state(call.id, b.id)
  end

  test "one account default off does not transcribe the other person" do
    {a, b, call} = connected_call()
    Repo.update!(User.changeset(a, %{assist_calls_enabled: true}))
    Repo.update!(User.changeset(b, %{assist_calls_enabled: false}))

    assert {:ok, %{assist: :waiting_for_other}} = Assist.state(call.id, a.id)
    assert {:ok, %{assist: :off, account_default: false}} = Assist.state(call.id, b.id)
    assert {:error, :assist_inactive} = Assist.grant(call.id, a.id, fn -> flunk("no grant") end)
  end

  test "pausing this call leaves the account default on" do
    {a, b, call} = connected_call()
    Repo.update!(User.changeset(a, %{assist_calls_enabled: true}))
    Repo.update!(User.changeset(b, %{assist_calls_enabled: true}))
    assert {:ok, _} = Assist.state(call.id, a.id)

    assert {:ok, %{assist: :off, account_default: true, self_paused: true}} =
             Assist.set_allowed(call.id, a.id, false, "call")

    assert Repo.get!(User, a.id).assist_calls_enabled == true
    assert {:error, :assist_inactive} = Assist.grant(call.id, b.id, fn -> flunk("paused") end)
  end

  test "a stranger cannot consent or submit a transcript" do
    {a, _b, call} = connected_call()

    stranger =
      %User{}
      |> User.changeset(%{handle: "stranger-#{System.unique_integer([:positive])}", display_name: "Stranger"})
      |> Repo.insert!()

    assert {:error, :forbidden} = Assist.set_allowed(call.id, stranger.id, true)
    assert {:error, :forbidden} = Assist.accept_transcript(call.id, stranger.id, %{"text" => "eight", "final" => true, "provider_segment_id" => "x"})
    refute a.id == stranger.id
  end

  defp connected_call do
    a = user("assist-a")
    b = user("assist-b")
    {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, live} = Calls.mark_media_connected(call.id, a.id)
    {a, b, live}
  end

  defp connected_pair do
    a = user("voice-a")
    b = user("voice-b")
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, %{})
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, live} = Calls.mark_media_connected(call.id, a.id)
    {a, b, live}
  end

  defp seed_plan_without_reservation(conversation_id, a_id, b_id) do
    seed_plan(conversation_id, a_id, b_id, authorize_reservation?: false)
  end

  defp seed_plan(conversation_id, a_id, b_id, opts \\ []) do
    authorize_reservation? = Keyword.get(opts, :authorize_reservation?, true)

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

    actions =
      [
        act("activity_lock", a_id, "dinner", 10, "user_stated"),
        act("place_propose", a_id, "Fort Oak", 11),
        act("place_confirm", b_id, "Fort Oak", 12, "agreed")
      ] ++
        if authorize_reservation? do
          [
            act("reservation_authorize", a_id, "Fort Oak", 13),
            act("reservation_authorize", b_id, "Fort Oak", 14, "agreed")
          ]
        else
          []
        end

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
      |> Conversation.changeset(%{label: "assist-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for person <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: person.id})
      |> Repo.insert!()
    end

    conv
  end
end
