defmodule OpalCoreWeb.Repair18CenterIntelligenceTest do
  @moduledoc """
  Repair #18 (Division A, Center intelligence) - API-level acceptance.

  Covers the track-intelligence acceptance designs through the real
  client-shaped Center endpoints:
  - location question answered from a stored TravelState city, and the
    answer changes when the stored city changes (no hardcoding)
  - location question with nothing stored gets the honest
    needs-location answer, never either "Tell me more" deflection
  - a stated city is remembered and answers the later question
  - a new question is not answered with stale planning_context entities
  - a deflection-fallthrough chat turn is drafted by the LLM when the
    provider is configured (stub adapter), with truthful metadata
  - provider failure / disabled provider falls back to the template
    floor AND logs llm_unavailable_using_templates loudly
  - switch to the already-active conversation is a state-preserving
    no-op across repeated calls
  """
  use OpalCoreWeb.ConnCase, async: false

  import ExUnit.CaptureLog

  alias OpalCore.Center.PlanningContext
  alias OpalCore.FixturesHelper
  alias OpalCore.Intelligence.TravelState
  alias OpalCore.OpalConversations
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"

  @deflection_chat "Tell me more — I can help you plan or check what's coming up."
  @deflection_oracle "Tell me more — I can help with plans, people, or what's coming up."

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    llm_prior = %{
      key: System.get_env("OPAL_LLM_API_KEY"),
      provider: System.get_env("OPAL_LLM_PROVIDER"),
      model: System.get_env("OPAL_LLM_MODEL"),
      http: Application.get_env(:opal_core, :llm_http_client)
    }

    # Deterministic default for this module: provider NOT configured.
    System.delete_env("OPAL_LLM_API_KEY")
    System.delete_env("OPAL_LLM_PROVIDER")
    System.delete_env("OPAL_LLM_MODEL")
    Application.delete_env(:opal_core, :llm_http_client)

    on_exit(fn ->
      restore_env("OPAL_LLM_API_KEY", llm_prior.key)
      restore_env("OPAL_LLM_PROVIDER", llm_prior.provider)
      restore_env("OPAL_LLM_MODEL", llm_prior.model)
      Application.delete_env(:opal_core, :llm_http_client)
      if llm_prior.http, do: Application.put_env(:opal_core, :llm_http_client, llm_prior.http)

      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp restore_env(name, nil), do: System.delete_env(name)
  defp restore_env(name, value), do: System.put_env(name, value)

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r18c-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp post_center(token, body, extra \\ %{}) do
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/opal/conversation/messages", Map.merge(%{"body" => body}, extra))

    json_response(conn, 201)
  end

  defp opal_reply(messages) do
    messages |> Enum.filter(&(&1["role"] == "opal")) |> List.last()
  end

  defp seed_travel_city!(user_id, city) do
    %TravelState{}
    |> TravelState.changeset(%{
      account_id: user_id,
      home_city: "Vista",
      current_city: city,
      home_timezone: "America/Los_Angeles",
      current_timezone: "America/Los_Angeles",
      started_at: DateTime.utc_now(),
      active: true
    })
    |> Repo.insert!()
  end

  defp configure_llm_stub!(reply_text) do
    test_pid = self()
    System.put_env("OPAL_LLM_API_KEY", "sk-test-r18")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    Application.put_env(:opal_core, :llm_http_client, fn url, _body, _headers ->
      send(test_pid, {:llm_http_called, url})

      {:ok,
       %{
         status: 200,
         body: %{
           "choices" => [%{"message" => %{"content" => reply_text}}],
           "usage" => %{"prompt_tokens" => 9, "completion_tokens" => 7, "total_tokens" => 16}
         }
       }}
    end)
  end

  # --- location ------------------------------------------------------------

  test "location question answered from stored city; answer follows the stored row", %{
    conn: conn
  } do
    {token, user_id} = activate(conn, @alex, "R18 Loc", "r18_loc")
    state = seed_travel_city!(user_id, "Oceanside")

    body = post_center(token, "What city am I currently in?")
    reply = opal_reply(body["messages"])
    assert reply["body"] =~ "Oceanside"
    refute reply["body"] =~ "Tell me more"

    state
    |> TravelState.changeset(%{current_city: "Tokyo"})
    |> Repo.update!()

    body = post_center(token, "what city am I in?")
    reply = opal_reply(body["messages"])
    assert reply["body"] =~ "Tokyo"
    refute reply["body"] =~ "Oceanside"
    refute reply["body"] =~ "Tell me more"
  end

  test "location question with nothing stored: honest needs-location, never deflection", %{
    conn: conn
  } do
    {token, _user_id} = activate(conn, @alex, "R18 NoLoc", "r18_noloc")

    body = post_center(token, "Where am I?")
    reply = opal_reply(body["messages"])
    assert reply["body"] =~ "I don't have your current location yet"
    assert reply["body"] =~ "tell me the city"
    refute reply["body"] == @deflection_chat
    refute reply["body"] == @deflection_oracle
  end

  test "a stated city is remembered and answers the later location question", %{conn: conn} do
    {token, _user_id} = activate(conn, @alex, "R18 Stated", "r18_stated")

    _ = post_center(token, "I'm in Oceanside")

    body = post_center(token, "What city am I currently in?")
    reply = opal_reply(body["messages"])
    assert reply["body"] =~ "Oceanside"
    refute reply["body"] =~ "Tell me more"
  end

  # --- entity freshness ------------------------------------------------------

  test "stale planning entities never ride on a new question turn", %{conn: conn} do
    {token, user_id} = activate(conn, @alex, "R18 Stale", "r18_stale")

    _ = post_center(token, "hello")

    {:ok, _} =
      PlanningContext.merge(user_id, %{"who" => "Maya", "what" => "nighthawk"}, %{})

    body = post_center(token, "Where am I?")
    reply = opal_reply(body["messages"])
    refute reply["body"] =~ "Maya"
    refute reply["body"] =~ "nighthawk"

    entities = reply["metadata"]["intent"]["entities"] || %{}
    refute entities["who"] == "Maya"
    refute entities["what"] == "nighthawk"
  end

  # --- LLM engagement --------------------------------------------------------

  @chat_turn "I had a long day and I am just thinking out loud about the weekend"

  test "deflection-fallthrough chat turn is LLM-drafted when provider configured", %{
    conn: conn
  } do
    {token, _user_id} = activate(conn, @alex, "R18 LLM", "r18_llm")
    configure_llm_stub!("That sounds like a full day. Want to shape the weekend into a plan?")

    body = post_center(token, @chat_turn)
    assert_received {:llm_http_called, url}
    assert url =~ "chat/completions"

    reply = opal_reply(body["messages"])
    assert reply["body"] == "That sounds like a full day. Want to shape the weekend into a plan?"
    assert reply["metadata"]["draft_source"] == "llm"
    assert reply["metadata"]["llm_called"] == true
    refute reply["body"] == @deflection_chat
  end

  test "provider failure: template floor, truthful metadata, loud log line", %{conn: conn} do
    {token, _user_id} = activate(conn, @alex, "R18 LLMFail", "r18_llmfail")
    System.put_env("OPAL_LLM_API_KEY", "sk-test-r18")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    Application.put_env(:opal_core, :llm_http_client, fn _url, _body, _headers ->
      {:ok, %{status: 500, body: %{"error" => %{"message" => "provider boom"}}}}
    end)

    log =
      capture_log(fn ->
        body = post_center(token, @chat_turn)
        reply = opal_reply(body["messages"])
        assert reply["body"] == @deflection_chat
        assert reply["metadata"]["draft_source"] == "template"
        assert reply["metadata"]["llm_called"] == false
      end)

    assert log =~ "llm_unavailable_using_templates"
    assert log =~ "deepseek"
  end

  test "provider disabled: template floor, truthful metadata, loud log line with reason", %{
    conn: conn
  } do
    {token, _user_id} = activate(conn, @alex, "R18 LLMOff", "r18_llmoff")
    # setup deleted the key: provider is disabled with :api_key_missing.

    log =
      capture_log(fn ->
        body = post_center(token, @chat_turn)
        reply = opal_reply(body["messages"])
        assert reply["body"] == @deflection_chat
        assert reply["metadata"]["draft_source"] == "template"
        assert reply["metadata"]["llm_called"] == false
      end)

    assert log =~ "llm_unavailable_using_templates"
    assert log =~ "api_key_missing"
  end

  # --- switch idempotency ----------------------------------------------------

  test "switching to the already-active session repeatedly changes no state", %{conn: conn} do
    {token, user_id} = activate(conn, @alex, "R18 Switch", "r18_switch")

    conn = build_conn() |> auth(token) |> get("/api/v1/product/opal/conversation")
    active_id = json_response(conn, 200)["conversation"]["id"]
    assert is_binary(active_id)

    _ = post_center(token, "first chat message")

    # Start a second session and switch back, so two sessions exist.
    conn = build_conn() |> auth(token) |> post("/api/v1/product/opal/conversation/new", %{})
    second_id = json_response(conn, 200)["conversation"]["id"]
    assert second_id != active_id

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/opal/conversations/#{active_id}/switch", %{})

    assert json_response(conn, 200)["conversation"]["id"] == active_id

    snapshot = fn ->
      OpalConversations.list_sessions(user_id)
      |> Enum.map(fn s ->
        {s["id"], s["updated_at"], s["archived_at"], s["message_count"], s["active"]}
      end)
      |> Enum.sort()
    end

    before = snapshot.()

    for _ <- 1..3 do
      conn =
        build_conn()
        |> auth(token)
        |> post("/api/v1/product/opal/conversations/#{active_id}/switch", %{})

      assert json_response(conn, 200)["ok"] == true
    end

    assert snapshot.() == before
  end
end
