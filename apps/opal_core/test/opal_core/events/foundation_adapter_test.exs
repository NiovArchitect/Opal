defmodule OpalCore.Events.FoundationAdapterTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog

  alias OpalCore.Events.Adapters.FoundationHttpAdapter

  @valid_envelope %{
    "event_id" => "evt_test_001",
    "event_type" => "invitation.accepted",
    "event_version" => 1,
    "occurred_at" => "2026-08-04T12:00:00.000Z",
    "recorded_at" => "2026-08-04T12:00:01.000Z",
    "producer" => "opal_core",
    "partition_key" => "inv_1",
    "topic_family" => "opal.invitation.events",
    "privacy_class" => "shared_authorized",
    "payload" => %{"invitation_id" => "inv_1", "relationship_id" => "rel_1"}
  }

  setup do
    System.delete_env("OPAL_FOUNDATION_INGRESS_URL")
    Application.delete_env(:opal_core, :foundation_http_post)

    on_exit(fn ->
      System.delete_env("OPAL_FOUNDATION_INGRESS_URL")
      Application.delete_env(:opal_core, :foundation_http_post)
    end)

    :ok
  end

  defp enable_ingress! do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")
  end

  defp with_http(fun) do
    Application.put_env(:opal_core, :foundation_http_post, fun)
  end

  # --- enablement ---

  test "disabled when OPAL_FOUNDATION_INGRESS_URL unset" do
    refute FoundationHttpAdapter.enabled?()

    assert {:error, :foundation_ingress_disabled} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "enabled when valid URL configured" do
    enable_ingress!()
    assert FoundationHttpAdapter.enabled?()
  end

  test "empty URL keeps adapter disabled" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "")
    refute FoundationHttpAdapter.enabled?()
  end

  # --- allowlist ---

  test "allowlisted invitation.accepted validates" do
    assert :ok = FoundationHttpAdapter.validate_for_publish(@valid_envelope)
  end

  test "allowlisted relationship.accepted validates" do
    env = Map.put(@valid_envelope, "event_type", "relationship.accepted")
    assert :ok = FoundationHttpAdapter.validate_for_publish(env)
  end

  test "non-allowlisted event types are refused before HTTP" do
    enable_ingress!()
    calls = :counters.new(1, [])

    with_http(fn _, _, _ ->
      :counters.add(calls, 1, 1)
      {:ok, 202, ~s({"ok":true})}
    end)

    for type <- [
          "message.accepted",
          "journey.started",
          "knowledge.created",
          "location.updated",
          "payment.authorized",
          "invitation.created"
        ] do
      env = Map.put(@valid_envelope, "event_type", type)

      assert {:error, {:event_type_not_allowlisted, ^type}} =
               FoundationHttpAdapter.publish(env)
    end

    assert :counters.get(calls, 1) == 0
  end

  # --- privacy ---

  test "raw phone field is permanent rejection without HTTP" do
    enable_ingress!()
    calls = :counters.new(1, [])

    with_http(fn _, _, _ ->
      :counters.add(calls, 1, 1)
      {:ok, 202, "{}"}
    end)

    env = put_in(@valid_envelope, ["payload", "phone"], "+12025550101")

    assert {:error, {:permanent_rejection, :forbidden_payload_keys}} =
             FoundationHttpAdapter.publish(env)

    assert :counters.get(calls, 1) == 0
  end

  test "contact name, message body, share_token, private_guidance, location rejected" do
    enable_ingress!()

    for {key, val} <- [
          {"name", "Grandma"},
          {"message", "hello"},
          {"share_token", "tok_x"},
          {"private_guidance", "secret"},
          {"precise_location", "1,2"},
          {"session_token", "sess"}
        ] do
      env = put_in(@valid_envelope, ["payload", key], val)

      assert {:error, {:permanent_rejection, :forbidden_payload_keys}} =
               FoundationHttpAdapter.publish(env)
    end
  end

  # --- success ---

  test "successful 202 accepted" do
    enable_ingress!()

    with_http(fn url, body, headers ->
      assert String.ends_with?(url, "/v1/events")
      assert Jason.decode!(body)["event_id"] == "evt_test_001"
      assert Enum.any?(headers, fn {k, _} -> k == "x-opal-event-id" end)
      {:ok, 202, ~s({"ok":true,"event_id":"evt_test_001"})}
    end)

    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "successful 200 treated as success" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:ok, 200, ~s({"ok":true})} end)
    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "unexpected success body still ok on 202" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:ok, 202, "not-json-but-accepted"} end)
    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
  end

  # --- permanent 4xx ---

  for status <- [400, 401, 403, 404, 409, 422] do
    test "HTTP #{status} is permanent rejection" do
      enable_ingress!()
      status = unquote(status)
      with_http(fn _, _, _ -> {:ok, status, ~s({"ok":false})} end)

      assert {:error, {:permanent_rejection, ^status}} =
               FoundationHttpAdapter.publish(@valid_envelope)
    end
  end

  # --- retryable ---

  for status <- [408, 429, 500, 502, 503, 504] do
    test "HTTP #{status} is retryable failure" do
      enable_ingress!()
      status = unquote(status)
      with_http(fn _, _, _ -> {:ok, status, ~s({"ok":false})} end)

      assert {:error, {:retryable_failure, ^status}} =
               FoundationHttpAdapter.publish(@valid_envelope)
    end
  end

  test "connection refused is retryable" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:error, :econnrefused} end)

    assert {:error, {:retryable_failure, :econnrefused}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "DNS / network failure is retryable" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:error, :nxdomain} end)

    assert {:error, {:retryable_failure, :nxdomain}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "request timeout is retryable" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:error, :timeout} end)

    assert {:error, {:retryable_failure, :timeout}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "failed_connect tuple is retryable" do
    enable_ingress!()

    with_http(fn _, _, _ ->
      {:error, {:failed_connect, [inet: [:inet], reason: :econnrefused]}}
    end)

    assert {:error, {:retryable_failure, _}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "connection closed unexpectedly is retryable" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:error, :closed} end)

    assert {:error, {:retryable_failure, :closed}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  test "http client exception is retryable" do
    enable_ingress!()
    with_http(fn _, _, _ -> raise "boom" end)

    assert {:error, {:retryable_failure, {:exception, "boom"}}} =
             FoundationHttpAdapter.publish(@valid_envelope)
  end

  # --- retry then success ---

  test "retryable failure followed by success (second call)" do
    enable_ingress!()
    {:ok, agent} = Agent.start_link(fn -> 0 end)

    with_http(fn _, _, _ ->
      n = Agent.get_and_update(agent, fn c -> {c, c + 1} end)

      if n == 0 do
        {:ok, 503, ~s({"ok":false,"error":"not_ready"})}
      else
        {:ok, 202, ~s({"ok":true})}
      end
    end)

    assert {:error, {:retryable_failure, 503}} =
             FoundationHttpAdapter.publish(@valid_envelope)

    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
    Agent.stop(agent)
  end

  # --- duplicate send ---

  test "duplicate event send remains successful (idempotent at foundation)" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:ok, 202, ~s({"ok":true})} end)

    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
    assert :ok = FoundationHttpAdapter.publish(@valid_envelope)
  end

  # --- invalid envelope ---

  test "invalid envelope without event_id" do
    enable_ingress!()
    assert {:error, :invalid_envelope} = FoundationHttpAdapter.publish(%{"event_type" => "x"})
  end

  # --- status classification unit ---

  test "classify_http_status mapping" do
    assert FoundationHttpAdapter.classify_http_status(202) == :success
    assert FoundationHttpAdapter.classify_http_status(200) == :success
    assert FoundationHttpAdapter.classify_http_status(422) == :permanent
    assert FoundationHttpAdapter.classify_http_status(429) == :retryable
    assert FoundationHttpAdapter.classify_http_status(500) == :retryable
    assert FoundationHttpAdapter.classify_http_status(403) == :permanent
  end

  test "timeouts are bounded" do
    assert FoundationHttpAdapter.connect_timeout_ms() == 2_000
    assert FoundationHttpAdapter.receive_timeout_ms() == 5_000
  end

  # --- safe logging ---

  test "safe logging does not include phone or payload secrets" do
    enable_ingress!()

    with_http(fn _, _, _ ->
      {:ok, 422, ~s({"ok":false,"error":"forbidden","phone":"+1secret"})}
    end)

    log =
      capture_log(fn ->
        FoundationHttpAdapter.publish(@valid_envelope)
      end)

    refute log =~ "+1secret"
    refute log =~ "invitation_id"
    refute log =~ "payload"
    assert log =~ "evt_test_001"
    assert log =~ "permanent_rejection" or log =~ "class=permanent"
  end

  test "success log contains event id and type only" do
    enable_ingress!()
    with_http(fn _, _, _ -> {:ok, 202, ~s({"ok":true,"detail":"SENSITIVE_BODY"})} end)
    prev = Logger.level()
    Logger.configure(level: :info)

    log =
      try do
        capture_log(fn ->
          FoundationHttpAdapter.publish(@valid_envelope)
        end)
      after
        Logger.configure(level: prev)
      end

    refute log =~ "SENSITIVE_BODY"
    assert log =~ "evt_test_001"
    assert log =~ "invitation.accepted"
  end
end
