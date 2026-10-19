defmodule OpalCoreWeb.SettingsGroupATest do
  @moduledoc """
  Repair #18 DIR-2 / Muse settings audit Group A — back-end cases.

  A5: the support intake round-trip (submit -> reference -> read back
  by reference, owner-scoped), with the payload guards (empty body,
  oversize body, unknown category) and proof that the stored row
  holds exactly the disclosed fields.
  A2: the Quiet master switch round-trip — pause writes its own flag,
  suppresses the notification gate, and unpausing restores the
  per-kind values exactly (they are never rewritten).
  """

  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Repo
  alias OpalCore.Support
  alias OpalCore.Support.SupportReport

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "ga-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)

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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp authed(token) do
    build_conn() |> put_req_header("authorization", "Bearer #{token}")
  end

  defp fresh_pair(conn, tag) do
    OpalCore.FixturesHelper.seed!()
    activate_more(conn, tag)
  end

  # Second account in the same test: seed! is not re-runnable, and
  # activation does not need it again.
  defp activate_more(conn, tag) do
    uniq = System.unique_integer([:positive]) |> rem(9000) |> Kernel.+(1000)
    activate(conn, "+1202555#{uniq}", "GA #{tag}", "ga_#{tag}_#{uniq}")
  end

  # ------------------------------------------------------------------
  # A5 — support intake
  # ------------------------------------------------------------------

  test "A5: submit returns a quotable reference and reads back owner-scoped", %{conn: conn} do
    {token, user_id} = fresh_pair(conn, "a5")

    conn =
      authed(token)
      |> post("/api/v1/product/support/reports", %{
        "kind" => "problem",
        "category" => "something_broke",
        "body" => "The plan card never loaded.",
        "build_ref" => "deadbeef"
      })

    body = json_response(conn, 201)
    reference = body["report"]["reference"]
    assert reference =~ ~r/^OPAL-[A-Z0-9]+$/
    assert body["report"]["status"] == "received"
    assert body["report"]["kind"] == "problem"

    # Read-back by reference (the spec's read-back), same account.
    conn = authed(token) |> get("/api/v1/product/support/reports/#{reference}")
    read_back = json_response(conn, 200)
    assert read_back["report"]["reference"] == reference

    # The stored row holds exactly the disclosed payload.
    stored = Repo.get_by!(SupportReport, reference: reference)
    assert stored.user_id == user_id
    assert stored.body == "The plan card never loaded."
    assert stored.build_ref == "deadbeef"

    # Another account cannot resolve the reference.
    {other_token, _other_id} = activate_more(conn, "a5b")
    conn = authed(other_token) |> get("/api/v1/product/support/reports/#{reference}")
    assert json_response(conn, 404)["error_code"] == "not_found"
  end

  test "A5: feedback kind lands tagged as feedback", %{conn: conn} do
    {token, user_id} = fresh_pair(conn, "a5f")

    conn =
      authed(token)
      |> post("/api/v1/product/support/reports", %{
        "kind" => "feedback",
        "category" => "something_else",
        "body" => "I would love group polls."
      })

    body = json_response(conn, 201)
    assert body["report"]["kind"] == "feedback"
    assert {:ok, report} = Support.fetch_for_user(user_id, body["report"]["reference"])
    assert report.kind == "feedback"
  end

  test "A5: empty body, oversize body, and unknown category are refused", %{conn: conn} do
    {token, _user_id} = fresh_pair(conn, "a5g")

    for payload <- [
          %{"kind" => "problem", "category" => "something_broke", "body" => "   "},
          %{
            "kind" => "problem",
            "category" => "something_broke",
            "body" => String.duplicate("x", 4_001)
          },
          %{"kind" => "problem", "category" => "nonsense", "body" => "hello"},
          %{"kind" => "rant", "category" => "something_broke", "body" => "hello"}
        ] do
      conn = authed(token) |> post("/api/v1/product/support/reports", payload)
      assert json_response(conn, 422)["error_code"] == "support_report_invalid"
    end

    assert Repo.aggregate(SupportReport, :count) == 0
  end

  # ------------------------------------------------------------------
  # A2 — Quiet master switch
  # ------------------------------------------------------------------

  test "A2: pause round-trips and restores per-kind values exactly", %{conn: _conn} do
    uid = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "Quiet #{uid}", handle: "quiet-#{uid}"})
      |> Repo.insert()

    # Per-kind values set first.
    {:ok, user} =
      ProductSession.update_messaging_preferences(user, %{
        "message_notifications_enabled" => false,
        "read_receipts_enabled" => true
      })

    prefs = ProductSession.messaging_preferences(user)
    assert prefs["notifications_paused"] == false
    assert prefs["message_notifications_enabled"] == false

    # Pause on: flag flips, per-kind values untouched.
    {:ok, paused} =
      ProductSession.update_messaging_preferences(user, %{"notifications_paused" => true})

    prefs = ProductSession.messaging_preferences(paused)
    assert prefs["notifications_paused"] == true
    assert prefs["message_notifications_enabled"] == false
    assert prefs["read_receipts_enabled"] == true

    # Pause off: everything back exactly as it was.
    {:ok, restored} =
      ProductSession.update_messaging_preferences(paused, %{"notifications_paused" => false})

    prefs = ProductSession.messaging_preferences(restored)
    assert prefs["notifications_paused"] == false
    assert prefs["message_notifications_enabled"] == false
    assert prefs["read_receipts_enabled"] == true
  end
end
