defmodule OpalCoreWeb.ProductInviteApiTest do
  use OpalCoreWeb.ConnCase
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.FixturesHelper
  alias OpalCore.Invites
  alias OpalCore.Relationships
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @maya "+12025550102"

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
        "idempotency_key" => "ne1-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "POST creates invite; GET lists; validate works", %{conn: conn} do
    {tok, _user_id} = activate(conn, @alex, "Maya Chen", "ne1_maya")

    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    conn =
      build_conn()
      |> auth(tok)
      |> post("/api/v1/product/invites", %{"invitee_phone" => "+12025550999"})

    created = json_response(conn, 201)
    assert is_binary(created["code"])
    assert created["share_url"] =~ "/invite/"
    assert created["invite"]["status"] == "sent"
    # Honest: Twilio unset → do not claim SMS queued
    assert created["delivery"]["sms_queued"] == false
    assert created["delivery"]["sms_honest"] =~ "Twilio"

    code = created["code"]

    conn = build_conn() |> get("/api/v1/product/invites/#{code}/validate")
    valid = json_response(conn, 200)
    assert valid["valid"] == true
    assert valid["inviter_display_name"] == "Maya Chen"

    conn = build_conn() |> auth(tok) |> get("/api/v1/product/invites")
    listed = json_response(conn, 200)
    assert length(listed["invites"]) >= 1
    assert listed["pending_count"] >= 1
  end

  test "authenticated join creates friend relationship", %{conn: conn} do
    {tok_a, inviter_id} = activate(conn, @alex, "Maya Chen", "ne1_join_host")
    assert {:ok, inv} = Invites.create_invite(inviter_id, %{})

    {tok_b, invitee_id} = activate(build_conn(), @maya, "Chris Guest", "ne1_join_guest")

    conn =
      build_conn()
      |> auth(tok_b)
      |> post("/api/v1/product/invites/#{inv.code}/join", %{})

    body = json_response(conn, 200)
    assert body["invite_joined"] == true
    assert body["welcome_message"] =~ "Maya Chen invited you to Opal"
    assert Relationships.get_type(inviter_id, invitee_id) == "friend"
    assert Relationships.get_type(invitee_id, inviter_id) == "friend"

    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/invites")
    listed = json_response(conn, 200)
    assert Enum.any?(listed["invites"], &(&1["status"] == "joined"))
  end

  test "validate 404 for unknown code", %{conn: conn} do
    conn = get(conn, "/api/v1/product/invites/ZZZZ-9999/validate")
    assert json_response(conn, 404)["valid"] == false
  end

  test "activation with invite marks joined and creates friend", %{conn: conn} do
    {tok, inviter_id} = activate(conn, @alex, "Maya Chen", "ne1_host")
    assert {:ok, inv} = Invites.create_invite(inviter_id, %{})

    # Second user activates with invite code
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => @maya,
        "device_label" => "ne1-guest-web",
        "idempotency_key" => "ne1-guest-#{System.unique_integer([:positive])}"
      })

    ch = json_response(conn, 201)

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
        "challenge_id" => ch["challenge"]["id"],
        "code" => ch["development_code"],
        "phone" => @maya,
        "display_name" => "Chris Guest",
        "device_label" => "ne1-guest-web",
        "handle_hint" => "ne1_guest",
        "platform" => "web",
        "include_bearer" => true,
        "invite" => inv.code
      })

    body = json_response(conn, 200)
    assert body["invite_joined"] == true
    assert body["welcome_message"] =~ "Maya Chen invited you to Opal"
    invitee_id = body["user"]["id"]

    assert Relationships.get_type(inviter_id, invitee_id) == "friend"
    assert Relationships.get_type(invitee_id, inviter_id) == "friend"

    # List shows joined
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/invites")
    listed = json_response(conn, 200)
    assert Enum.any?(listed["invites"], &(&1["status"] == "joined"))
  end
end
