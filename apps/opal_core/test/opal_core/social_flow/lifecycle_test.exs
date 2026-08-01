defmodule OpalCore.SocialFlow.LifecycleTest do
  use OpalCore.DataCase

  alias OpalCore.{AI, Fixtures, FixturesHelper, Messages, SocialFlow}
  alias OpalCore.AI.TestClient
  alias OpalCore.Consent.ConsentProof
  alias OpalCore.Repo

  setup do
    FixturesHelper.seed!()
    TestClient.reset()
    :ok
  end

  defp msg!(user_id, body) do
    {:ok, m, :created} =
      Messages.accept_message(%{
        conversation_id: Fixtures.conv_alex_jordan_id(),
        sender_user_id: user_id,
        client_message_id: "cm-" <> Ecto.UUID.generate(),
        message_type: "text",
        body: body
      })

    m
  end

  test "full adult two-user lifecycle with private reminder isolation" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_alex_jordan_id()

    m1 = msg!(alex, "We should get dinner next Thursday.")
    _m2 = msg!(jordan, "I'm free after 6:30.")

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: m1.id,
               requester_user_id: alex,
               capability: "social_flow_plan_extract",
               consent_proof_id: Fixtures.consent_alex_jordan_sf_id(),
               idempotency_key: "sf-life-extract-001",
               trace_id: "trace-sf-life-extract-01"
             })

    assert job.status == "completed"
    assert TestClient.call_count() == 1

    {:ok, sync} = SocialFlow.sync_for_user(conv, alex)
    assert length(sync["proposals"]) >= 1
    proposal = hd(sync["proposals"])
    assert proposal["status"] == "visible"
    assert proposal["recommended_signal_copy"] =~ "Dinner"

    assert {:ok, %{proposal: proposal_a, options: options}} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal["id"],
               user_id: alex,
               trace_id: "trace-sf-coord"
             })

    assert proposal_a.status == "approved_for_coordination"
    assert length(options) >= 1

    option =
      Enum.find(options, &(&1.label =~ "7:00")) || List.first(options)

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: alex,
               response: "accept",
               trace_id: "trace-sf-opt-a"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: jordan,
               response: "accept",
               trace_id: "trace-sf-opt-j"
             })

    assert plan.status == "agreed"
    assert plan.time_label =~ "7:00" or plan.time_label != nil

    m3 = msg!(alex, "I'll make the reservation.")

    assert {:ok, job2, :created} =
             AI.request_job(%{
               message_id: m3.id,
               requester_user_id: alex,
               capability: "social_flow_plan_extract",
               consent_proof_id: Fixtures.consent_alex_jordan_sf_id(),
               idempotency_key: "sf-life-commit-001",
               trace_id: "trace-sf-life-commit-01"
             })

    assert job2.status == "completed"

    {:ok, sync2} = SocialFlow.sync_for_user(conv, alex)
    commitments = sync2["commitments"]
    assert length(commitments) >= 1
    commitment = hd(commitments)
    assert commitment["visibility"] == "private"

    assert {:ok, confirmed} =
             SocialFlow.confirm_commitment(%{
               commitment_id: commitment["id"],
               user_id: alex,
               trace_id: "trace-sf-confirm"
             })

    assert confirmed.status == "confirmed"

    assert {:ok, %{reminder: reminder}} =
             SocialFlow.create_private_reminder(%{
               plan_id: plan.id,
               user_id: alex,
               content_summary: "Book the restaurant",
               commitment_id: confirmed.id,
               trace_id: "trace-sf-rem"
             })

    assert reminder.visibility == "private"
    assert reminder.owner_user_id == alex

    # Jordan cannot see private reminder via sync
    {:ok, jordan_sync} = SocialFlow.sync_for_user(conv, jordan)
    jordan_reminder_ids = Enum.map(jordan_sync["reminders"], & &1["id"])
    refute reminder.id in jordan_reminder_ids

    # Jordan direct get denied
    assert {:error, :forbidden} = SocialFlow.get_reminder_for_user(reminder.id, jordan)

    # Taylor not a member
    assert {:error, :not_a_member} = SocialFlow.sync_for_user(conv, taylor)
    assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, taylor)
    assert {:error, :forbidden} = SocialFlow.get_reminder_for_user(reminder.id, taylor)

    # Revision
    assert {:ok, %{revision: rev}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex,
               changes: %{"time_label" => "7:30 PM"},
               trace_id: "trace-sf-rev"
             })

    assert rev.status == "proposed"

    assert {:ok, %{plan: plan2, revision: rev2}} =
             SocialFlow.respond_to_revision(%{
               revision_id: rev.id,
               user_id: jordan,
               decision: "accept",
               trace_id: "trace-sf-rev-acc"
             })

    assert plan2.status == "changed"
    assert plan2.time_label == "7:30 PM"
    assert plan2.current_revision_id == rev2.id
    assert rev2.status == "accepted"

    # Reconnect sync preserves state
    {:ok, alex_sync} = SocialFlow.sync_for_user(conv, alex)
    assert hd(alex_sync["plans"])["time_label"] == "7:30 PM"
    assert Enum.any?(alex_sync["reminders"], &(&1["id"] == reminder.id))
    refute Enum.any?(jordan_sync["reminders"], &(&1["id"] == reminder.id))

    # Revoke SF consent — no new extract
    proof = Repo.get!(ConsentProof, Fixtures.consent_alex_jordan_sf_id())

    proof
    |> ConsentProof.changeset(%{
      status: "revoked",
      revoked_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
    })
    |> Repo.update!()

    m4 = msg!(alex, "We should get brunch Saturday.")
    before_calls = TestClient.call_count()

    assert {:error, :revoked} =
             AI.request_job(%{
               message_id: m4.id,
               requester_user_id: alex,
               capability: "social_flow_plan_extract",
               consent_proof_id: Fixtures.consent_alex_jordan_sf_id(),
               idempotency_key: "sf-life-revoked-001",
               trace_id: "trace-sf-revoked-00001"
             })

    assert TestClient.call_count() == before_calls

    # Existing plan intact
    {:ok, plan_still} = SocialFlow.get_plan_for_user(plan2.id, alex)
    assert plan_still.time_label == "7:30 PM"
  end

  test "missing consent never calls Python for plan extract" do
    m = msg!(Fixtures.user_alex_id(), "We should get dinner next Thursday.")

    assert {:error, :not_found} =
             AI.request_job(%{
               message_id: m.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "social_flow_plan_extract",
               consent_proof_id: Ecto.UUID.generate(),
               idempotency_key: "sf-missing-consent-01",
               trace_id: "trace-sf-missing-cons-01"
             })

    assert TestClient.call_count() == 0
  end

  test "AI failure does not corrupt existing plan" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    m1 = msg!(alex, "We should get dinner next Thursday.")
    _m2 = msg!(jordan, "I'm free after 6:30.")

    {:ok, _, :created} =
      AI.request_job(%{
        message_id: m1.id,
        requester_user_id: alex,
        capability: "social_flow_plan_extract",
        consent_proof_id: Fixtures.consent_alex_jordan_sf_id(),
        idempotency_key: "sf-fail-safe-extract",
        trace_id: "trace-sf-fail-safe-ex-01"
      })

    {:ok, sync} = SocialFlow.sync_for_user(Fixtures.conv_alex_jordan_id(), alex)
    proposal = hd(sync["proposals"])

    {:ok, %{options: options}} =
      SocialFlow.approve_coordination(%{
        proposal_id: proposal["id"],
        user_id: alex,
        trace_id: "t1"
      })

    option = hd(options)

    SocialFlow.respond_to_option(%{
      option_id: option.id,
      user_id: alex,
      response: "accept",
      trace_id: "t2"
    })

    {:ok, %{plan: plan}} =
      SocialFlow.respond_to_option(%{
        option_id: option.id,
        user_id: jordan,
        response: "accept",
        trace_id: "t3"
      })

    TestClient.set_mode(:unavailable)
    m3 = msg!(alex, "We should also get coffee.")

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: m3.id,
               requester_user_id: alex,
               capability: "social_flow_plan_extract",
               consent_proof_id: Fixtures.consent_alex_jordan_sf_id(),
               idempotency_key: "sf-fail-safe-ai",
               trace_id: "trace-sf-fail-safe-ai-01"
             })

    assert job.status == "failed"
    {:ok, still} = SocialFlow.get_plan_for_user(plan.id, alex)
    assert still.id == plan.id
    assert still.status == "agreed"
  end
end
