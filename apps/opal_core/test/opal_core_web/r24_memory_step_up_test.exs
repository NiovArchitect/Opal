defmodule OpalCoreWeb.R24MemoryStepUpTest do
  @moduledoc """
  Repair #24 (WS-5) - memory step-up re-auth pins.

  The honesty baseline, proven in the first test from the schema
  itself: the account model carries NO password credential, so no
  password check is faked anywhere in this suite. The step-up
  re-verifies the account's actual credential - a fresh phone code
  on the number already verified to the account - and grants a
  short-lived elevation bound to account + session.

  Pins:
  - mutation without elevation is rejected (403 step_up_required);
  - mutation with a live elevation succeeds;
  - an expired elevation is rejected;
  - a wrong code mints no elevation and mutations stay rejected;
  - another account's number cannot start this account's step-up;
  - account B's session can never spend account A's elevation
    (per-account isolation), and B's memory stays unreachable;
  - each gated mutation writes a timestamped audit row.
  """
  use OpalCoreWeb.ConnCase

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.StepUpElevation
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan "+12025550102"

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
        "idempotency_key" => "r24su-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)

    {body["session"]["access_token"], body["user"]["id"],
     body["session"]["session_id"] || body["session"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp step_up!(token, phone) do
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "step-up-web-#{System.unique_integer([:positive])}",
        "idempotency_key" => "r24su-step-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code), "synthetic step-up code must be exposed in test mode"
    assert body["credential"] == "phone_code"
    assert body["password_credential_exists"] == false

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone
      })

    body = json_response(conn, 200)
    assert body["step_up"]["elevated"] == true
    assert body["step_up"]["credential_kind"] == "phone_code"
    assert is_binary(body["step_up"]["granted_at"])
    assert is_binary(body["step_up"]["expires_at"])
    body["step_up"]["elevation_token"]
  end

  defp elevated(token, elevation_token) do
    build_conn()
    |> auth(token)
    |> put_req_header("x-opal-step-up-elevation", elevation_token)
  end

  defp audit_rows(user_id, event_type) do
    Repo.all(
      from(a in AuditEvent, where: a.actor_user_id == ^user_id and a.event_type == ^event_type)
    )
  end

  test "the account model has no password credential - the honesty baseline" do
    fields = User.__schema__(:fields)
    refute :password in fields
    refute :password_hash in fields
    refute :hashed_password in fields
  end

  test "capsule add without elevation is rejected; with elevation it succeeds and is audited", %{
    conn: conn
  } do
    {token, user_id, _session} = activate(conn, @alex, "Step A", "r24_step_a")

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "gated fact"})

    body = json_response(conn, 403)
    assert body["error_code"] == "step_up_required"
    assert body["credential"] == "phone_code"
    assert body["password_credential_exists"] == false

    elevation = step_up!(token, @alex)

    conn =
      elevated(token, elevation)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "gated fact"})

    assert json_response(conn, 201)["capsule"]["summary"] == "gated fact"

    rows = audit_rows(user_id, "memory.mutation.capsule_created")
    assert length(rows) == 1
    row = hd(rows)
    assert not is_nil(row.inserted_at)
    assert row.payload["credential_kind"] == "phone_code"
    assert row.payload["elevation_id"] |> is_binary()
    assert is_binary(row.payload["audited_at"])
  end

  test "capsule forget and fact forget are gated the same way", %{conn: conn} do
    {token, user_id, _session} = activate(conn, @alex, "Step Del", "r24_step_del")
    elevation = step_up!(token, @alex)

    conn =
      elevated(token, elevation)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "forget me"})

    capsule_id = json_response(conn, 201)["capsule"]["id"]

    # Without elevation: rejected, and the capsule survives.
    conn =
      build_conn()
      |> auth(token)
      |> delete("/api/v1/product/memory-wallet/capsules/#{capsule_id}")

    assert json_response(conn, 403)["error_code"] == "step_up_required"

    conn = build_conn() |> auth(token) |> get("/api/v1/product/memory-wallet")
    assert Enum.any?(json_response(conn, 200)["capsules"], &(&1["id"] == capsule_id))

    # With elevation: forgotten, audited.
    conn =
      elevated(token, elevation) |> delete("/api/v1/product/memory-wallet/capsules/#{capsule_id}")

    assert json_response(conn, 200)["forgotten"] == true
    assert length(audit_rows(user_id, "memory.mutation.capsule_forgotten")) == 1

    # Fact forget: same gate.
    assert {:ok, mem, :created} =
             OpalCore.SocialFlow.DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_id,
               "preference" => "quiet restaurants"
             })

    conn = build_conn() |> auth(token) |> delete("/api/v1/product/memory/facts/#{mem.id}")
    assert json_response(conn, 403)["error_code"] == "step_up_required"

    conn = elevated(token, elevation) |> delete("/api/v1/product/memory/facts/#{mem.id}")
    assert json_response(conn, 200)["forgotten"] == true
    assert length(audit_rows(user_id, "memory.mutation.fact_forgotten")) == 1
  end

  test "wrong code mints no elevation; mutations stay rejected", %{conn: conn} do
    {token, _user_id, _session} = activate(conn, @alex, "Step Wrong", "r24_step_wrong")

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => @alex,
        "idempotency_key" => "r24su-wrong-#{System.unique_integer([:positive])}"
      })

    challenge_id = json_response(conn, 201)["challenge"]["id"]

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/verify", %{
        "challenge_id" => challenge_id,
        "code" => "999999",
        "phone" => @alex
      })

    assert json_response(conn, 401)["error_code"] == "invalid_code"

    conn = build_conn() |> auth(token) |> get("/api/v1/product/memory/step-up")
    assert json_response(conn, 200)["step_up"]["elevated"] == false

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "nope"})

    assert json_response(conn, 403)["error_code"] == "step_up_required"
  end

  test "expired elevation is rejected", %{conn: conn} do
    {token, user_id, session_id} = activate(conn, @alex, "Step Exp", "r24_step_exp")
    assert is_binary(session_id)

    {:ok, elevation, token_value} =
      StepUpElevation.grant(user_id, session_id, nil, ttl_sec: -10)

    assert elevation.expires_at != nil
    refute StepUpElevation.live?(elevation)

    conn =
      elevated(token, token_value)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "too late"})

    assert json_response(conn, 403)["error_code"] == "step_up_required"
  end

  test "isolation: B cannot start a step-up on A's number, and A's elevation never spends under B's session",
       %{conn: conn} do
    {token_a, _user_a, _} = activate(conn, @alex, "Step Iso A", "r24_step_iso_a")
    {token_b, _user_b, _} = activate(build_conn(), @jordan, "Step Iso B", "r24_step_iso_b")

    # B presenting A's number: refused, no challenge.
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/memory/step-up/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => @alex,
        "idempotency_key" => "r24su-cross-#{System.unique_integer([:positive])}"
      })

    assert json_response(conn, 403)["error_code"] == "identifier_not_owned"

    # A's elevation token under B's session: rejected.
    elevation_a = step_up!(token_a, @alex)

    conn =
      build_conn()
      |> auth(token_b)
      |> put_req_header("x-opal-step-up-elevation", elevation_a)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "cross spend"})

    assert json_response(conn, 403)["error_code"] == "step_up_required"

    # And B's wallet still holds none of A's memory.
    conn =
      elevated(token_a, elevation_a)
      |> post("/api/v1/product/memory-wallet/capsules", %{"summary" => "A only fact"})

    assert json_response(conn, 201)["capsule"]["summary"] == "A only fact"

    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/memory-wallet")
    summaries = Enum.map(json_response(conn, 200)["capsules"], & &1["summary"])
    refute "A only fact" in summaries
  end
end
