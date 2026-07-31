defmodule OpalCore.ConsentAiTest do
  use OpalCore.DataCase

  alias OpalCore.{AI, Fixtures, FixturesHelper, Messages}
  alias OpalCore.AI.TestClient

  setup do
    FixturesHelper.seed!()
    TestClient.reset()
    :ok
  end

  defp create_message!(user_id, conversation_id, body \\ "hello slice1") do
    {:ok, msg, :created} =
      Messages.accept_message(%{
        conversation_id: conversation_id,
        sender_user_id: user_id,
        client_message_id: "cm-" <> Ecto.UUID.generate(),
        message_type: "text",
        body: body
      })

    msg
  end

  test "valid consent dispatches and completes ai_echo" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-valid-001",
               trace_id: "trace-valid-00000001"
             })

    assert job.status == "completed"
    assert job.result.output["normalized_text"] == "hello slice1"
    assert TestClient.call_count() == 1
  end

  test "missing consent refuses without calling Python" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:error, :not_found} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Ecto.UUID.generate(),
               idempotency_key: "idem-missing-001",
               trace_id: "trace-missing-000001"
             })

    assert TestClient.call_count() == 0
  end

  test "denied consent refuses without calling Python" do
    msg = create_message!(Fixtures.user_jordan_id(), Fixtures.conv_alex_jordan_id())

    assert {:error, :denied} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_jordan_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_jordan_denied_id(),
               idempotency_key: "idem-denied-001",
               trace_id: "trace-denied-00000001"
             })

    assert TestClient.call_count() == 0
  end

  test "revoked consent refuses without calling Python" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_taylor_id())

    assert {:error, :revoked} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_taylor_revoked_id(),
               idempotency_key: "idem-revoked-001",
               trace_id: "trace-revoked-0000001"
             })

    assert TestClient.call_count() == 0
  end

  test "expired consent refuses without calling Python" do
    msg = create_message!(Fixtures.user_taylor_id(), Fixtures.conv_alex_taylor_id())

    assert {:error, :expired} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_taylor_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_taylor_expired_id(),
               idempotency_key: "idem-expired-001",
               trace_id: "trace-expired-0000001"
             })

    assert TestClient.call_count() == 0
  end

  test "wrong user cannot use another user's consent" do
    msg = create_message!(Fixtures.user_jordan_id(), Fixtures.conv_alex_jordan_id())

    assert {:error, :user_mismatch} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_jordan_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-wrong-user-001",
               trace_id: "trace-wrong-user-00001"
             })

    assert TestClient.call_count() == 0
  end

  test "wrong conversation consent refuses" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    # Alex has revoked consent on Taylor conversation — wrong conversation for Jordan conv message
    assert {:error, :conversation_mismatch} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_taylor_revoked_id(),
               idempotency_key: "idem-wrong-conv-001",
               trace_id: "trace-wrong-conv-00001"
             })

    assert TestClient.call_count() == 0
  end

  test "wrong capability refuses" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:error, :capability_not_executable} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "translation",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-wrong-cap-001",
               trace_id: "trace-wrong-cap-000001"
             })

    assert TestClient.call_count() == 0
  end

  test "duplicate AI idempotency key does not re-execute" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    attrs = %{
      message_id: msg.id,
      requester_user_id: Fixtures.user_alex_id(),
      capability: "ai_echo",
      consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
      idempotency_key: "idem-once-only-001",
      trace_id: "trace-once-only-000001"
    }

    assert {:ok, j1, :created} = AI.request_job(attrs)
    assert {:ok, j2, :idempotent} = AI.request_job(attrs)
    assert j1.id == j2.id
    assert TestClient.call_count() == 1
  end

  test "Python unavailable becomes failed without corrupting message authority" do
    TestClient.set_mode(:unavailable)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id(), "body")

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-unavail-001",
               trace_id: "trace-unavail-0000001"
             })

    assert job.status == "failed"
    assert job.error_code == "service_unavailable"
    reloaded = Messages.get_message!(msg.id)
    assert reloaded.body == "body"
    assert reloaded.server_seq >= 1
  end

  test "timeout becomes failed" do
    TestClient.set_mode(:timeout)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-timeout-001",
               trace_id: "trace-timeout-0000001"
             })

    assert job.status == "failed"
    assert job.error_code == "timeout"
  end

  test "malformed response rejected as failed" do
    TestClient.set_mode(:malformed_json_map)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-malformed-001",
               trace_id: "trace-malformed-00001"
             })

    assert job.status == "failed"
    assert job.error_code == "schema_invalid_response"
    assert is_nil(job.result)
  end

  test "wrong job id rejected" do
    TestClient.set_mode(:wrong_job_id)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-wrongjob-001",
               trace_id: "trace-wrongjob-000001"
             })

    assert job.status == "failed"
    assert job.error_code == "job_id_mismatch"
  end

  test "wrong trace id rejected" do
    TestClient.set_mode(:wrong_trace_id)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-wrongtrace-001",
               trace_id: "trace-wrongtrace-0001"
             })

    assert job.status == "failed"
    assert job.error_code == "trace_id_mismatch"
  end

  test "unsupported response version rejected" do
    TestClient.set_mode(:unsupported_version)
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-badver-001",
               trace_id: "trace-badver-00000001"
             })

    assert job.status == "failed"
    assert job.error_code == "schema_invalid_response"
  end

  test "safety refusal marker yields refused" do
    msg =
      create_message!(
        Fixtures.user_alex_id(),
        Fixtures.conv_alex_jordan_id(),
        "please OPAL_TEST_FORCE_REFUSAL now"
      )

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-refuse-001",
               trace_id: "trace-refuse-00000001"
             })

    assert job.status == "refused"
    assert job.result.safety["decision"] == "refused"
  end

  test "isolation: user cannot access another user's job" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-isol-001",
               trace_id: "trace-isol-0000000001"
             })

    assert is_nil(AI.get_job_for_user(job.id, Fixtures.user_jordan_id()))
    assert AI.get_job_for_user(job.id, Fixtures.user_alex_id())
  end

  test "bounded context only includes message body, not other conversation" do
    msg =
      create_message!(
        Fixtures.user_alex_id(),
        Fixtures.conv_alex_jordan_id(),
        "secret-to-jordan-only"
      )

    # seed a message in the other conversation that must not appear in context
    _other =
      create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_taylor_id(), "secret-to-taylor")

    assert {:ok, _job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-bound-001",
               trace_id: "trace-bound-0000000001"
             })

    req = TestClient.last_request()
    values = Enum.map(req["context"], & &1["value"])
    assert values == ["secret-to-jordan-only"]
    refute Enum.any?(values, &String.contains?(&1, "taylor"))
  end

  test "pubsub completion event emitted once" do
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "ai_jobs:#{Fixtures.user_alex_id()}")
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-pubsub-001",
               trace_id: "trace-pubsub-00000001"
             })

    assert_receive %{"event_type" => "ai_job.completed", "payload" => %{"job_id" => id}}
    assert id == job.id
    refute_receive %{"event_type" => "ai_job.completed"}, 50
  end

  test "terminal job does not return to processing" do
    msg = create_message!(Fixtures.user_alex_id(), Fixtures.conv_alex_jordan_id())

    assert {:ok, job, :created} =
             AI.request_job(%{
               message_id: msg.id,
               requester_user_id: Fixtures.user_alex_id(),
               capability: "ai_echo",
               consent_proof_id: Fixtures.consent_alex_jordan_granted_id(),
               idempotency_key: "idem-terminal-001",
               trace_id: "trace-terminal-000001"
             })

    assert job.status == "completed"
    assert {:ok, again} = AI.process_job(job)
    assert again.status == "completed"
  end
end
