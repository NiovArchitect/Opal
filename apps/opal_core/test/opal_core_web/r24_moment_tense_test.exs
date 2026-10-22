defmodule OpalCoreWeb.R24MomentTenseTest do
  @moduledoc """
  Repair #24 (WS-6) - moment tense persistence pins.

  The tense vocabulary is the creation walkthrough's own
  (SocialMomentRecord.tenses/0 mirrors the web CreationTense:
  present = Now, future = Forecast, past = Memories) - asserted
  against the record module so a second vocabulary cannot drift in.

  Pins:
  - create under Forecast reads back "future" on the create
    response, the detail read, the list read, and the home feed;
  - create under Memories reads back "past";
  - create with NO tense reads back the honest default "present"
    (never an error, never a client-side stamp);
  - an unknown tense is refused (422 invalid_tense), never coerced;
  - the graph-create tense path is untouched: SharedPlan creation
    still works exactly as before (non-regression smoke).
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{SharedPlan, SocialMomentRecord}
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550103"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r24tense-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp publish!(token, attrs) do
    conn = build_conn() |> auth(token) |> post("/api/v1/product/social-moments", attrs)
    json_response(conn, 200)["moment"]
  end

  test "the moment tense vocabulary is exactly the creation walkthrough's" do
    assert SocialMomentRecord.tenses() == ~w(present future past)
    assert SocialMomentRecord.default_tense() == "present"
  end

  test "create under Forecast reads back future everywhere; Memories reads back past", %{
    conn: conn
  } do
    {token, _user_id} = activate(conn, @alex, "Tense A", "r24_tense_a")

    forecast = publish!(token, %{"caption" => "tomorrow at the pier", "tense" => "future"})
    assert forecast["tense"] == "future"
    # Persisted on the record itself, not painted on the response.
    assert Repo.get!(SocialMomentRecord, forecast["id"]).tense == "future"

    memories = publish!(token, %{"caption" => "last summer", "tense" => "past"})
    assert memories["tense"] == "past"
    assert Repo.get!(SocialMomentRecord, memories["id"]).tense == "past"

    # Detail read.
    conn = build_conn() |> auth(token) |> get("/api/v1/product/social-moments/#{forecast["id"]}")
    assert json_response(conn, 200)["moment"]["tense"] == "future"

    # List read.
    conn = build_conn() |> auth(token) |> get("/api/v1/product/social-moments")
    by_id = Map.new(json_response(conn, 200)["moments"], &{&1["id"], &1})
    assert by_id[forecast["id"]]["tense"] == "future"
    assert by_id[memories["id"]]["tense"] == "past"

    # Own archive read.
    conn = build_conn() |> auth(token) |> get("/api/v1/product/social-moments/mine")
    posts = Map.new(json_response(conn, 200)["posts"], &{&1["id"], &1})
    assert posts[forecast["id"]]["tense"] == "future"
    assert posts[memories["id"]]["tense"] == "past"

    # Home feed read.
    conn = build_conn() |> auth(token) |> get("/api/v1/product/home/feed")
    cards = Map.new(json_response(conn, 200)["objects"], &{&1["id"], &1})
    assert cards[forecast["id"]]["tense"] == "future"
    assert cards[memories["id"]]["tense"] == "past"
  end

  test "create with no tense reads back the present default", %{conn: conn} do
    {token, _user_id} = activate(conn, @alex, "Tense Default", "r24_tense_def")

    moment = publish!(token, %{"caption" => "right now"})
    assert moment["tense"] == "present"
    assert Repo.get!(SocialMomentRecord, moment["id"]).tense == "present"

    conn = build_conn() |> auth(token) |> get("/api/v1/product/social-moments/#{moment["id"]}")
    assert json_response(conn, 200)["moment"]["tense"] == "present"
  end

  test "an unknown tense is refused, never coerced", %{conn: conn} do
    {token, _user_id} = activate(conn, @alex, "Tense Bad", "r24_tense_bad")

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/social-moments", %{"caption" => "whenever", "tense" => "someday"})

    assert json_response(conn, 422)["error"] == "invalid_tense"
  end

  test "graph-create tense path untouched: a plan still creates through its own contract", %{
    conn: conn
  } do
    {token, _user_id} = activate(conn, @alex, "Tense Graph", "r24_tense_graph")

    # The graph-create flow's server truth is the SharedPlan row and
    # its time_label - WS-6 changed no plan code. Creating one the
    # way the creation walkthrough does (its When words carried as
    # the time label) still persists exactly as before, through the
    # real graph-create endpoint.
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/opal/plans/graph-create", %{
        "title" => "Forecast graph",
        "time_label" => "Saturday",
        "participant_user_ids" => [],
        "idempotency_key" => "r24-tense-graph-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    plan_id = body["plan"]["id"]
    assert is_binary(plan_id)
    assert Repo.get!(SharedPlan, plan_id).time_label == "Saturday"
  end
end
