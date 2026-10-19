defmodule OpalCoreWeb.Repair19OpalchatScopeTest do
  @moduledoc """
  Repair #19 W14 + Orbits (FR-19-W14) — Opal-chat structure:
  scoped Opal sessions, the primary anchor, the person-orbit index
  query, real removal, and the orbit-private flag.

  Scoping proofs (the heart of the wave):
  - a session scoped to person B never appears in person C's index;
  - a doorway binding that mismatches (plan of A–C with person B,
    conversation of A–C with person B) is refused fail-closed and
    creates nothing;
  - removing a scoped session leaves the person thread and the
    plan untouched.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @a "+12025550301"
  @b "+12025550302"
  @c "+12025550303"

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

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r19-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
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

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp get_json(token, path) do
    build_conn() |> auth(token) |> get(path) |> json_response(200)
  end

  defp post_json(token, path, params, status \\ 201) do
    build_conn() |> auth(token) |> post(path, params) |> json_response(status)
  end

  defp direct(token, peer_id) do
    body = post_json(token, "/api/v1/product/conversations/direct", %{"peer_user_id" => peer_id})
    body["conversation_id"]
  end

  defp create_plan(token, conversation_id, attrs) do
    body =
      post_json(token, "/api/v1/product/conversations/#{conversation_id}/plans", attrs)

    body["plan"]
  end

  defp sessions(token, person_id \\ nil) do
    path =
      if person_id,
        do: "/api/v1/product/opal/conversations?person_id=#{person_id}",
        else: "/api/v1/product/opal/conversations"

    get_json(token, path)["conversations"]
  end

  defp setup_people do
    {token_a, user_a} = activate(@a, "R19 A", "r19_a")
    {token_b, user_b} = activate(@b, "R19 B", "r19_b")
    {token_c, user_c} = activate(@c, "R19 C", "r19_c")
    conv_ab = direct(token_a, user_b)
    conv_ac = direct(token_a, user_c)

    plan_ab =
      create_plan(token_a, conv_ab, %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })

    plan_ac =
      create_plan(token_a, conv_ac, %{
        "title" => "Hike with C",
        "place" => "Torrey Pines",
        "location" => "Torrey Pines",
        "time_label" => "Sunday 9 AM"
      })

    %{
      token_a: token_a,
      user_a: user_a,
      token_b: token_b,
      user_b: user_b,
      token_c: token_c,
      user_c: user_c,
      conv_ab: conv_ab,
      conv_ac: conv_ac,
      plan_ab: plan_ab,
      plan_ac: plan_ac
    }
  end

  test "FR-19-W14-01: scoped birth carries person+plan+conversation and the plan anchor; the person index is exact" do
    ctx = setup_people()

    body =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "plan_id" => ctx.plan_ab["id"],
        "conversation_id" => ctx.conv_ab
      })

    conv = body["conversation"]
    assert conv["context"]["person_id"] == ctx.user_b
    assert conv["context"]["person_name"] == "R19 B"
    assert conv["context"]["plan_id"] == ctx.plan_ab["id"]
    assert conv["context"]["plan_title"] == "Dinner at Juniper"
    assert conv["context"]["conversation_id"] == ctx.conv_ab

    assert conv["anchor"] == %{
             "type" => "plan",
             "id" => ctx.plan_ab["id"],
             "label" => "Dinner at Juniper",
             "private" => false
           }

    # The person index is an equality query over the scope: B's index
    # holds it, C's never does, and B (the person) does not own it.
    assert Enum.map(sessions(ctx.token_a, ctx.user_b), & &1["id"]) == [conv["id"]]
    assert sessions(ctx.token_a, ctx.user_c) == []
    assert sessions(ctx.token_b, ctx.user_b) == []
    assert Enum.any?(sessions(ctx.token_a), &(&1["id"] == conv["id"]))
  end

  test "FR-19-W14-02: mismatched bindings are refused fail-closed and create nothing" do
    ctx = setup_people()
    before = length(sessions(ctx.token_a))

    # Plan of A–C scoped to person B.
    conn =
      build_conn()
      |> auth(ctx.token_a)
      |> post("/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "plan_id" => ctx.plan_ac["id"]
      })

    assert json_response(conn, 422)["error_code"] == "invalid_scope"

    # Conversation of A–C scoped to person B.
    conn =
      build_conn()
      |> auth(ctx.token_a)
      |> post("/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "conversation_id" => ctx.conv_ac
      })

    assert json_response(conn, 422)["error_code"] == "invalid_scope"

    # Unknown person: not_found, nothing created.
    conn =
      build_conn()
      |> auth(ctx.token_a)
      |> post("/api/v1/product/opal/conversations/scoped", %{
        "person_id" => Ecto.UUID.generate()
      })

    assert json_response(conn, 404)["error_code"] == "not_found"
    assert length(sessions(ctx.token_a)) == before
    assert sessions(ctx.token_a, ctx.user_b) == []
  end

  test "FR-19-W14-03: anchor accept / redirect / unanchor round-trips (one-tap undo = re-issue with the prior value)" do
    ctx = setup_people()

    # A plain session starts unanchored.
    plain = post_json(ctx.token_a, "/api/v1/product/opal/conversation/new", %{}, 200)
    session_id = plain["conversation"]["id"]
    assert plain["conversation"]["anchor"] == nil

    set = fn anchor ->
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/#{session_id}/anchor",
        %{"anchor" => anchor},
        200
      )["conversation"]
    end

    accepted = set.(%{"type" => "person", "id" => ctx.user_b})
    assert accepted["anchor"]["type"] == "person"
    assert accepted["anchor"]["id"] == ctx.user_b
    assert accepted["anchor"]["label"] == "R19 B"
    # The person index picks the session up under its new anchor scope.
    assert Enum.any?(sessions(ctx.token_a, ctx.user_b), &(&1["id"] == session_id))

    redirected = set.(%{"type" => "plan", "id" => ctx.plan_ab["id"]})
    assert redirected["anchor"]["type"] == "plan"
    assert redirected["anchor"]["id"] == ctx.plan_ab["id"]

    # Undo: re-issue with the prior anchor restores it exactly.
    undone = set.(%{"type" => "person", "id" => ctx.user_b})
    assert undone["anchor"] == accepted["anchor"]

    cleared = set.(nil)
    assert cleared["anchor"] == nil

    # Foreign session: anchor writes are owner-only, existence hidden.
    conn =
      build_conn()
      |> auth(ctx.token_b)
      |> post("/api/v1/product/opal/conversations/#{session_id}/anchor", %{
        "anchor" => %{"type" => "person", "id" => ctx.user_b}
      })

    assert json_response(conn, 404)
  end

  test "FR-19-W14-04: removal deletes the Opal chat from every listing and leaves the person thread + plan untouched" do
    ctx = setup_people()

    body =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "plan_id" => ctx.plan_ab["id"],
        "conversation_id" => ctx.conv_ab
      })

    session_id = body["conversation"]["id"]

    # Give the Opal chat a real message.
    msgs =
      post_json(ctx.token_a, "/api/v1/product/opal/conversation/messages", %{
        "body" => "What still needs deciding for dinner?",
        "conversation_id" => session_id
      })

    assert length(msgs["messages"]) == 2

    removed =
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/#{session_id}/remove",
        %{},
        200
      )

    assert removed["removed"] == true
    assert removed["deleted_messages"] == 2

    # Gone from the full list and from the person index.
    refute Enum.any?(sessions(ctx.token_a), &(&1["id"] == session_id))
    assert sessions(ctx.token_a, ctx.user_b) == []

    # The person thread is untouched: it still loads, and the plan
    # still reads on the thread contract + the plans list.
    thread = get_json(ctx.token_a, "/api/v1/product/conversations/#{ctx.conv_ab}/messages")
    assert thread["next_plan"]["plan_id"] == ctx.plan_ab["id"]

    plans = get_json(ctx.token_a, "/api/v1/product/opal/plans")["plans"]
    assert Enum.any?(plans, &(&1["id"] == ctx.plan_ab["id"]))

    # Removing a foreign session is a 404.
    other =
      post_json(ctx.token_b, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_a
      })

    conn =
      build_conn()
      |> auth(ctx.token_a)
      |> post("/api/v1/product/opal/conversations/#{other["conversation"]["id"]}/remove", %{})

    assert json_response(conn, 404)
  end

  test "FR-19-W14-06: chrome pin + the one user-archive, distinct from rotation and removal" do
    ctx = setup_people()

    scoped =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "conversation_id" => ctx.conv_ab
      })

    session_id = scoped["conversation"]["id"]

    pinned =
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/#{session_id}/pin",
        %{
          "pinned" => true
        },
        200
      )["conversation"]

    assert pinned["pinned"] == true
    assert is_binary(pinned["pinned_at"])

    archived =
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/#{session_id}/archive",
        %{
          "archived" => true
        },
        200
      )["conversation"]

    assert archived["user_archived"] == true
    # Still listed (retained), still pinned, NOT rotation-archived away.
    row = Enum.find(sessions(ctx.token_a), &(&1["id"] == session_id))
    assert row["user_archived"] == true
    assert row["pinned"] == true

    unarchived =
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/#{session_id}/archive",
        %{
          "archived" => false
        },
        200
      )["conversation"]

    assert unarchived["user_archived"] == false

    # Foreign pin/archive: 404.
    conn =
      build_conn()
      |> auth(ctx.token_b)
      |> post("/api/v1/product/opal/conversations/#{session_id}/pin", %{"pinned" => true})

    assert json_response(conn, 404)
  end

  test "FR-19-W14-05: the orbit-private flag covers the whole orbit and nothing else" do
    ctx = setup_people()

    scoped =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "plan_id" => ctx.plan_ab["id"],
        "conversation_id" => ctx.conv_ab
      })

    res =
      post_json(
        ctx.token_a,
        "/api/v1/product/opal/conversations/orbit-private",
        %{
          "anchor_type" => "plan",
          "anchor_id" => ctx.plan_ab["id"],
          "private" => true
        },
        200
      )

    assert res["updated"] == 1

    row = Enum.find(sessions(ctx.token_a), &(&1["id"] == scoped["conversation"]["id"]))
    assert row["anchor"]["private"] == true

    # A different orbit (A–C plan) is unaffected.
    other =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_c,
        "plan_id" => ctx.plan_ac["id"],
        "conversation_id" => ctx.conv_ac
      })

    row2 = Enum.find(sessions(ctx.token_a), &(&1["id"] == other["conversation"]["id"]))
    assert row2["anchor"]["private"] == false
  end

  test "FR-19-FIXA-BS02: orbit unlock verifies the ONE graph-lock passcode, scoped to the caller's own orbits" do
    ctx = setup_people()

    scoped =
      post_json(ctx.token_a, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_b,
        "plan_id" => ctx.plan_ab["id"],
        "conversation_id" => ctx.conv_ab
      })

    _session_id = scoped["conversation"]["id"]

    post_json(
      ctx.token_a,
      "/api/v1/product/opal/conversations/orbit-private",
      %{"anchor_type" => "plan", "anchor_id" => ctx.plan_ab["id"], "private" => true},
      200
    )

    verify = fn token, anchor_id, code ->
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/opal/conversations/orbit-verify", %{
        "anchor_type" => "plan",
        "anchor_id" => anchor_id,
        "code" => code
      })
    end

    # No passcode set yet: nothing verifies (same answer as a wrong code).
    conn = verify.(ctx.token_a, ctx.plan_ab["id"], "2468")
    assert json_response(conn, 403)["unlocked"] == false

    # Set the ONE graph lock through the W7 endpoint — no second store.
    conn =
      build_conn()
      |> auth(ctx.token_a)
      |> post("/api/v1/product/opal/graph-lock", %{"code" => "2468"})

    assert json_response(conn, 200)["passcode_set"] == true

    # Wrong code refuses; the correct graph-lock code verifies.
    conn = verify.(ctx.token_a, ctx.plan_ab["id"], "0000")
    assert json_response(conn, 403)["unlocked"] == false
    assert json_response(conn, 403)["error"] == "wrong_code"

    conn = verify.(ctx.token_a, ctx.plan_ab["id"], "2468")
    body = json_response(conn, 200)
    assert body["unlocked"] == true
    assert body["anchor_id"] == ctx.plan_ab["id"]

    # Service level agrees.
    alias OpalCore.OpalConversations

    assert :ok =
             OpalConversations.verify_orbit_unlock(
               ctx.user_a,
               "plan",
               ctx.plan_ab["id"],
               "2468"
             )

    assert {:error, :wrong_code} =
             OpalConversations.verify_orbit_unlock(
               ctx.user_a,
               "plan",
               ctx.plan_ab["id"],
               "1111"
             )

    assert {:error, :invalid_anchor} =
             OpalConversations.verify_orbit_unlock(ctx.user_a, "bogus", ctx.plan_ab["id"], "2468")

    # Another user's orbit can never be unlocked by my verification:
    # B sets their OWN passcode and tries A's orbit — with B's correct
    # code and with A's code alike, the orbit is not B's to unlock.
    conn =
      build_conn()
      |> auth(ctx.token_b)
      |> post("/api/v1/product/opal/graph-lock", %{"code" => "9999"})

    assert json_response(conn, 200)["passcode_set"] == true

    conn = verify.(ctx.token_b, ctx.plan_ab["id"], "9999")
    assert json_response(conn, 404)["unlocked"] == false

    conn = verify.(ctx.token_b, ctx.plan_ab["id"], "2468")
    assert json_response(conn, 404)["unlocked"] == false

    assert {:error, :not_found} =
             OpalConversations.verify_orbit_unlock(
               ctx.user_b,
               "plan",
               ctx.plan_ab["id"],
               "9999"
             )

    # And A cannot unlock an orbit only B holds (B's person-orbit on A).
    b_scoped =
      post_json(ctx.token_b, "/api/v1/product/opal/conversations/scoped", %{
        "person_id" => ctx.user_a
      })

    assert b_scoped["conversation"]["anchor"]["type"] == "person"

    assert {:error, :not_found} =
             OpalConversations.verify_orbit_unlock(ctx.user_a, "person", ctx.user_a, "2468")

    assert :ok =
             OpalConversations.verify_orbit_unlock(ctx.user_b, "person", ctx.user_a, "9999")
  end
end
