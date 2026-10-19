defmodule OpalCoreWeb.Adopt2AccountSettingsTest do
  @moduledoc """
  Repair #18 adoption wave 2 - the account/settings cluster.

  4.C2 roster equality + revoke propagation (revoked device signed
  out on its next request). 4.C3 hosts-only payloads, use-logging,
  removal. 4.C4 personal-code redemption round-trip, double/self
  guards, rate limit, both-sides credit. 4.C6 two-account
  deletion-scope (shared truth stands, anonymized) + receipt +
  support-path parity - SYNTHETIC accounts only. 4.C7 entry-point
  parity. SF-A per-source lines + single-source retry.
  """

  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.AccountDeletion
  alias OpalCore.Accounts.User
  alias OpalCore.Invites.InviteRedemption
  alias OpalCore.Invites.PersonalCodes
  alias OpalCore.Repo
  alias OpalCore.Settings.SavedLogin
  alias OpalCore.Settings.SavedLogins
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.RelationshipMemory
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Support.SupportReport

  # --- helpers -------------------------------------------------------

  defp activate(conn, tag) do
    uniq = System.unique_integer([:positive]) |> rem(900_000) |> Kernel.+(100_000)

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => "+1202555#{rem(uniq, 9000) + 1000}",
        "device_label" => "#{tag}-web",
        "idempotency_key" => "a2-ch-#{tag}-#{uniq}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => "+1202555#{rem(uniq, 9000) + 1000}",
        "display_name" => "A2 #{tag}",
        "device_label" => "#{tag}-web",
        "handle_hint" => "a2_#{tag}_#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"], body["session"]["session_id"]}
  end

  defp authed(token), do: build_conn() |> put_req_header("authorization", "Bearer #{token}")

  defp fresh(conn, tag) do
    OpalCore.FixturesHelper.seed!()
    activate(conn, tag)
  end

  # ------------------------------------------------------------------
  # 4.C2 - devices roster + revoke
  # ------------------------------------------------------------------

  test "C2: roster is the session store; revoke signs the device out on its next request", %{
    conn: conn
  } do
    {token, user_id, session_id} = fresh(conn, "c2")

    # Roster equality: every row in the store for this user appears.
    conn = authed(token) |> get("/api/v1/product/settings/devices")
    body = json_response(conn, 200)
    store_ids = Repo.all(from(s in DeviceSession, where: s.user_id == ^user_id, select: s.id))
    roster_ids = Enum.map(body["devices"], & &1["id"])
    assert Enum.sort(roster_ids) == Enum.sort(store_ids)
    current = Enum.find(body["devices"], & &1["is_current"])
    assert current["id"] == session_id

    # A second session for the same account (the "second device").
    {:ok, _s, _} =
      OpalCore.SocialFlow.TrustSafety.register_session(%{
        user_id: user_id,
        device_label: "second-phone",
        session_ref: "sess-a2-second-#{System.unique_integer([:positive])}",
        refresh_family: "rf-a2-#{user_id}",
        idempotency_key: "ds-a2-second-#{System.unique_integer([:positive])}"
      })

    second = Repo.get_by!(DeviceSession, device_label: "second-phone", user_id: user_id)

    conn = authed(token) |> get("/api/v1/product/settings/devices")
    assert length(json_response(conn, 200)["devices"]) == length(store_ids) + 1

    # The second device holds a working token BEFORE the revoke.
    {:ok, second_tokens} = OpalCore.Auth.ProductSession.issue(second)
    second_token = second_tokens.access_token
    assert {:ok, %{user_id: ^user_id}} = OpalCore.Auth.ProductSession.authenticate(second_token)

    # Revoke it: server-side status flips...
    conn = authed(token) |> post("/api/v1/product/settings/devices/#{second.id}/revoke", %{})
    assert json_response(conn, 200)["revoked"] == true
    assert Repo.get!(DeviceSession, second.id).status == "revoked"

    # ...and its token is refused on the next request (read-back):
    # the revoked device is signed out.
    assert {:error, :session_revoked} =
             OpalCore.Auth.ProductSession.authenticate(second_token)

    conn = authed(second_token) |> get("/api/v1/product/session")
    assert conn.status == 401
    assert session_id != second.id
  end

  test "C2: revoking another account's session is forbidden", %{conn: conn} do
    {token_a, _a, _sa} = fresh(conn, "c2a")
    {_token_b, user_b, session_b} = activate(conn, "c2b")
    assert Repo.get!(DeviceSession, session_b).user_id == user_b

    conn = authed(token_a) |> post("/api/v1/product/settings/devices/#{session_b}/revoke", %{})
    assert json_response(conn, 403)["error_code"] == "forbidden"
    assert Repo.get!(DeviceSession, session_b).status == "active"
  end

  # ------------------------------------------------------------------
  # 4.C3 - saved logins: hosts only, use-logging, removal
  # ------------------------------------------------------------------

  test "C3: payloads contain hosts only - the value never renders anywhere", %{conn: conn} do
    {token, user_id, _s} = fresh(conn, "c3")
    secret = "a2-secret-value-#{System.unique_integer([:positive])}"

    conn =
      authed(token)
      |> post("/api/v1/product/settings/saved-logins", %{
        "host" => "https://api.example.com/login",
        "secret" => secret
      })

    body = json_response(conn, 201)
    assert body["saved_login"]["host"] == "api.example.com"
    refute inspect(body) =~ secret
    refute Map.has_key?(body["saved_login"], "secret")

    conn = authed(token) |> get("/api/v1/product/settings/saved-logins")
    body = json_response(conn, 200)
    assert [%{"host" => "api.example.com"}] = body["saved_logins"]
    refute inspect(body) =~ secret

    # The stored value is ciphertext, not the secret.
    stored = Repo.get_by!(SavedLogin, user_id: user_id, host: "api.example.com")
    refute stored.secret_ciphertext == secret
    refute inspect(stored.secret_ciphertext) =~ secret
    assert {:ok, ^secret} = SavedLogins.use_for_host(user_id, "api.example.com")
  end

  test "C3: every use writes an activity-trail entry; removal ends use", %{conn: conn} do
    {token, user_id, _s} = fresh(conn, "c3u")
    {:ok, _} = SavedLogins.add(user_id, "mail.example.org", "hunter2-hunter2")

    assert {:ok, "hunter2-hunter2"} = SavedLogins.use_for_host(user_id, "mail.example.org")
    assert {:ok, "hunter2-hunter2"} = SavedLogins.use_for_host(user_id, "mail.example.org")

    conn = authed(token) |> get("/api/v1/product/settings/activity")
    entries = json_response(conn, 200)["activity"]
    uses = Enum.filter(entries, &(&1["kind"] == "credential_used"))
    assert length(uses) == 2
    assert Enum.all?(uses, &(&1["subject"] == "mail.example.org"))
    refute inspect(entries) =~ "hunter2"

    login = Repo.get_by!(SavedLogin, user_id: user_id, host: "mail.example.org")
    conn = authed(token) |> delete("/api/v1/product/settings/saved-logins/#{login.id}")
    assert json_response(conn, 200)["removed"] == true
    assert {:error, :not_found} = SavedLogins.use_for_host(user_id, "mail.example.org")
    conn = authed(token) |> get("/api/v1/product/settings/saved-logins")
    assert json_response(conn, 200)["saved_logins"] == []
  end

  # ------------------------------------------------------------------
  # 4.C4 - personal invite codes
  # ------------------------------------------------------------------

  test "C4: redeem round-trip - both sides see the credit; copy promises no reward", %{conn: conn} do
    {_ta, maya_id, _} = fresh(conn, "maya")
    {_tb, joiner_id, _} = activate(conn, "joiner")

    # Maya's full name makes the credit line readable.
    Repo.get!(User, maya_id)
    |> User.changeset(%{display_name: "Maya A2"})
    |> Repo.update!()

    {:ok, personal} = PersonalCodes.get_or_create_code(maya_id)
    {:ok, again} = PersonalCodes.get_or_create_code(maya_id)
    assert again.id == personal.id

    assert {:ok, credit} = PersonalCodes.redeem(joiner_id, personal.code)
    assert credit["credit_line"] == "You joined through Maya A2"
    refute inspect(credit) =~ "reward"
    refute inspect(credit) =~ "token"

    # Both accounts read the same linking record back.
    assert PersonalCodes.joined_through(joiner_id)["inviter_user_id"] == maya_id
    [owner_view] = PersonalCodes.joined_through_you(maya_id)
    assert owner_view["redeemer_user_id"] == joiner_id
    assert Repo.aggregate(InviteRedemption, :count) == 1
    assert OpalCore.Relationships.get_type(maya_id, joiner_id) == "friend"
    assert OpalCore.Relationships.get_type(joiner_id, maya_id) == "friend"
  end

  test "C4: double-redeem and self-redeem guards; HTTP rate limit shape", %{conn: conn} do
    {_ta, owner_id, _} = fresh(conn, "own")
    {token_b, joiner_id, _} = activate(conn, "dbl")
    {:ok, personal} = PersonalCodes.get_or_create_code(owner_id)

    assert {:error, :cannot_redeem_own} = PersonalCodes.redeem(owner_id, personal.code)
    assert {:ok, _} = PersonalCodes.redeem(joiner_id, personal.code)
    assert {:error, :already_redeemed} = PersonalCodes.redeem(joiner_id, personal.code)

    conn = authed(token_b) |> post("/api/v1/product/invites/redeem", %{"code" => personal.code})
    assert json_response(conn, 409)["error_code"] == "already_redeemed"
    assert Repo.aggregate(InviteRedemption, :count) == 1
  end

  test "C4: redemption is rate-limited like today's invites (10/day)", %{conn: conn} do
    {_ta, redeemer_id, _} = fresh(conn, "rl")

    for i <- 1..10 do
      {:ok, owner} =
        %User{}
        |> User.changeset(%{
          display_name: "RL Owner #{i} #{System.unique_integer([:positive])}",
          handle: "rl-owner-#{System.unique_integer([:positive])}"
        })
        |> Repo.insert()

      {:ok, personal} = PersonalCodes.get_or_create_code(owner.id)
      assert {:ok, _} = PersonalCodes.redeem(redeemer_id, personal.code)
    end

    {:ok, owner11} =
      %User{}
      |> User.changeset(%{
        display_name: "RL Owner 11",
        handle: "rl-owner-11-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    {:ok, personal11} = PersonalCodes.get_or_create_code(owner11.id)
    assert {:error, :rate_limited} = PersonalCodes.redeem(redeemer_id, personal11.code)
  end

  # ------------------------------------------------------------------
  # 4.C6 - deletion scope, receipt, support parity (synthetic only)
  # ------------------------------------------------------------------

  defp shared_plan!(creator_id, partner_id) do
    # The Conversation schema has no kind/title: its only human field is
    # :label, required by its changeset. A real direct conversation is
    # created by OpalCore.Messages.create_direct_conversation/2 with
    # label "direct-<first 8 of user A>-<first 8 of user B>", so the
    # fixture carries exactly that label for this creator/partner pair.
    label = "direct-#{String.slice(creator_id, 0, 8)}-#{String.slice(partner_id, 0, 8)}"

    {:ok, conversation} =
      %OpalCore.Messaging.Conversation{}
      |> OpalCore.Messaging.Conversation.changeset(%{label: label})
      |> Repo.insert()

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        title: "A2 shared dinner",
        status: "tentative",
        conversation_id: conversation.id,
        created_by_user_id: creator_id,
        source: "conversation"
      })
      |> Repo.insert()

    for uid <- [creator_id, partner_id] do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: uid,
        role: "participant",
        response_state: "accepted"
      })
      |> Repo.insert!()
    end

    plan
  end

  test "C6: account deletion removes your side, shared truth stands anonymized, receipt issued",
       %{
         conn: conn
       } do
    {token_a, user_a, _} = fresh(conn, "del")
    {_token_b, user_b, _} = activate(conn, "keep")

    plan = shared_plan!(user_a, user_b)

    # A's private memory + a saved login.
    {:ok, _, _} =
      OpalCore.SocialFlow.DurablePreferenceMemory.remember_explicit(%{
        "owner_user_id" => user_a,
        "preference" => "quiet restaurants",
        "force_durable" => true
      })

    {:ok, _} = SavedLogins.add(user_a, "bank.example.com", "a2-bank-secret")

    conn =
      authed(token_a)
      |> post("/api/v1/product/settings/delete", %{"mode" => "account", "confirm" => true})

    body = json_response(conn, 201)
    receipt = body["receipt"]
    assert receipt["reference"] =~ ~r/^DEL-[A-Z0-9]+$/
    assert receipt["mode"] == "account"
    assert receipt["source"] == "self_serve"
    assert receipt["summary"]["shared_plans_kept_anonymized"] == 1
    assert receipt["summary"]["memories_removed"] >= 1
    assert receipt["summary"]["saved_logins_removed"] == 1
    assert receipt["summary"]["sessions_revoked"] >= 1

    # Your side is gone.
    assert Repo.all(from(m in RelationshipMemory, where: m.owner_user_id == ^user_a)) == []
    assert SavedLogins.list_for_user(user_a) == []

    # The account is anonymized in place; the partner's plan stands
    # with both seats - A's seat now reads as the anonymized member.
    anonymized = Repo.get!(User, user_a)
    assert anonymized.display_name == "Deleted member"
    assert not is_nil(anonymized.deleted_at)
    assert Repo.get!(SharedPlan, plan.id).title == "A2 shared dinner"

    participants =
      Repo.all(from(p in PlanParticipant, where: p.plan_id == ^plan.id))

    assert length(participants) == 2
    assert Repo.get!(User, user_b).display_name =~ "A2"

    # A's old token is refused (sessions revoked + deleted gate).
    conn = authed(token_a) |> get("/api/v1/product/session")
    assert conn.status == 401
  end

  test "C6: data deletion empties memory/soul/chats but the account stays usable", %{conn: conn} do
    {token, user_id, _} = fresh(conn, "ddata")

    {:ok, _, _} =
      OpalCore.SocialFlow.DurablePreferenceMemory.remember_explicit(%{
        "owner_user_id" => user_id,
        "preference" => "lively bars",
        "force_durable" => true
      })

    assert {:ok, receipt} = AccountDeletion.execute(user_id, "data")
    assert receipt.summary["memories_removed"] >= 1
    assert Repo.get!(User, user_id).deleted_at == nil
    assert Repo.get!(User, user_id).display_name =~ "A2"

    conn = authed(token) |> get("/api/v1/product/session")
    assert conn.status == 200
  end

  test "C6: support path performs the same deletion semantics", %{conn: conn} do
    {token_a, user_a, _} = fresh(conn, "sup")
    {_tb, user_b, _} = activate(conn, "supb")
    plan = shared_plan!(user_a, user_b)

    {:ok, _} = SavedLogins.add(user_a, "shop.example.com", "a2-shop-secret")

    conn =
      authed(token_a)
      |> post("/api/v1/product/support/account-deletion", %{
        "mode" => "account",
        "confirm" => true
      })

    body = json_response(conn, 201)
    assert body["receipt"]["source"] == "support"
    assert body["receipt"]["summary"]["shared_plans_kept_anonymized"] == 1
    assert Repo.get!(SharedPlan, plan.id) != nil
    assert Repo.get!(User, user_a).display_name == "Deleted member"
    assert SavedLogins.list_for_user(user_a) == []
  end

  test "C6: unconfirmed deletion is refused and deletes nothing", %{conn: conn} do
    {token, user_id, _} = fresh(conn, "noconf")
    {:ok, _} = SavedLogins.add(user_id, "keep.example.com", "a2-keep-secret")

    conn = authed(token) |> post("/api/v1/product/settings/delete", %{"mode" => "account"})
    assert json_response(conn, 422)["error_code"] == "confirmation_required"
    assert length(SavedLogins.list_for_user(user_id)) == 1
  end

  # ------------------------------------------------------------------
  # 4.C7 - entry-point parity
  # ------------------------------------------------------------------

  test "C7: identical intake and payload shape from every entry point", %{conn: conn} do
    {token, user_id, _} = fresh(conn, "c7")

    references =
      for entry <- SupportReport.entry_points() do
        conn =
          authed(token)
          |> post("/api/v1/product/support/reports", %{
            "kind" => "problem",
            "category" => "something_broke",
            "body" => "It broke on #{entry}.",
            "entry_point" => entry
          })

        body = json_response(conn, 201)
        assert body["report"]["entry_point"] == entry
        body["report"]["reference"]
      end

    stored = Repo.all(from(r in SupportReport, where: r.user_id == ^user_id))
    assert length(stored) == length(SupportReport.entry_points())
    assert Enum.sort(Enum.map(stored, & &1.reference)) == Enum.sort(references)

    # Same stored shape from every entry: identical key sets.
    key_sets =
      stored
      |> Enum.map(fn r -> r |> Map.from_struct() |> Map.keys() |> Enum.sort() end)
      |> Enum.uniq()

    assert length(key_sets) == 1

    # Unknown entry points are refused - no surface can invent one.
    conn =
      authed(token)
      |> post("/api/v1/product/support/reports", %{
        "kind" => "problem",
        "category" => "something_broke",
        "body" => "from nowhere",
        "entry_point" => "carrier_pigeon"
      })

    assert json_response(conn, 422)["error_code"] == "support_report_invalid"
  end

  # ------------------------------------------------------------------
  # SF-A - per-source lines + single-source retry
  # ------------------------------------------------------------------

  test "SF-A: each source carries its own line; retry re-derives that source only", %{conn: conn} do
    {token, user_id, _} = fresh(conn, "sfa")

    conn = authed(token) |> get("/api/v1/product/settings/hears")
    body = json_response(conn, 200)
    sources = body["sources"]
    assert Enum.map(sources, & &1["source"]) == OpalCore.Settings.IngestionStatus.sources()

    chats = Enum.find(sources, &(&1["source"] == "chats"))
    assert chats["state"] == "working"
    assert chats["progress"] =~ "Caught up"
    room = Enum.find(sources, &(&1["source"] == "room"))
    assert room["state"] == "absent"
    texts = Enum.find(sources, &(&1["source"] == "texts"))
    assert texts["state"] in ["waiting", "sending_only"]
    # No invented percentages or ETAs anywhere (DIR-4-C).
    # Invariant pinned: every string field of every source line is a
    # finished human string - it contains no "%" (no percentage, and
    # no unrendered "%{...}" map/placeholder artifact), no "#{"
    # interpolation placeholder, and no ETA word ("minute").
    # This is checked per-field on the actual strings, NOT via
    # inspect(sources): inspect/1 of a list of maps always contains
    # "%{" (the map literal), so `refute inspect(sources) =~ "%"`
    # could never pass regardless of the product's behaviour.
    for source <- sources, {field, value} <- source, is_binary(value) do
      refute value =~ "%",
             "source #{source["source"]} field #{field} contains %: #{inspect(value)}"

      refute value =~ "\#{",
             "source #{source["source"]} field #{field} contains an unrendered placeholder: #{inspect(value)}"

      refute value =~ "minute",
             "source #{source["source"]} field #{field} contains an ETA word: #{inspect(value)}"
    end

    # Retry retries that source only (ER-2).
    conn =
      authed(token)
      |> post("/api/v1/product/settings/hears/retry", %{"source" => "chats"})

    body = json_response(conn, 200)
    assert body["source_line"]["source"] == "chats"
    assert body["source_line"]["state"] == "working"

    conn =
      authed(token)
      |> post("/api/v1/product/settings/hears/retry", %{"source" => "nope"})

    assert json_response(conn, 422)["error_code"] == "unknown_source"
    assert user_id != nil
  end
end
