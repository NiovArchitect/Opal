defmodule OpalCoreWeb.R24LivesWriteVisibilityTest do
  @moduledoc """
  Repair #24 cluster D (WS-4) - LIVES WRITE-PATH VISIBILITY.

  The R23 top-up closed the read hole: GET /lives/:id enforces the
  visible list's own visible_to_viewer? predicate (via
  Lives.get_live/2), so a room the list hides reads as 404. It
  named, and did not fix, the same no-visibility-recheck shape on
  the two write paths: a stranger who learns a room id could flag
  or gift into a room the list hides. Both writes now pass the
  SAME gate (Lives.get_live/2) before any write runs:

    - POST /lives/:id/report-presence: a hidden-room write is the
      read path's exact 404 ({"error" => "not_found"}), and leaves
      no presence report row and no count increment behind.
    - POST /lives/:id/stickers: a hidden-room write is the same
      404, and moves no money - no sticker row, no sender debit,
      no host credit.

  Accounts (the livetopup suite's three-real-user family):
    - H: the host
    - F: H's friend (dyad peer via a direct conversation) - the
      viewer the predicate ADMITS to H's friends-audience live
    - B: a stranger with no relationship to H - the viewer the
      list hides H's live from (the control case)

  Matrix pinned: hidden stranger rejected (both endpoints),
  plain friend rejected from a close-circle room (both
  endpoints), admitted friend succeeds (both endpoints), host
  admitted by the gate and still answered by the pre-existing
  own-live rules, unknown id reads as the same 404 on both
  writes (a hidden room is indistinguishable from a missing one).

  Run standalone:
      mix test test/opal_core_web/r24_lives_write_visibility_test.exs
  """

  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Lives
  alias OpalCore.Lives.{LivePresenceReport, LiveRoom, LiveSticker, Venue}
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.Wallets
  alias OpalCore.Wallets.Wallet

  setup do
    host = insert_user!("r24lw_host", "R24 LW Host")
    friend = insert_user!("r24lw_friend", "R24 LW Friend")
    stranger = insert_user!("r24lw_stranger", "R24 LW Stranger")

    # A dyad conversation makes F H's friend under
    # RelationshipGraph (dyad peer) - the same friendship the
    # visible-lives list keys on. B gets no such conversation.
    {:ok, _} = Messages.ensure_direct_conversation(host.id, friend.id)

    %{
      host: host,
      friend: friend,
      stranger: stranger,
      token_host: mint_token(host),
      token_friend: mint_token(friend),
      token_stranger: mint_token(stranger)
    }
  end

  defp authed(token) do
    build_conn() |> put_req_header("authorization", "Bearer #{token}")
  end

  # Go live and promote the fixture venue out of quarantine
  # (status "full"), the Paste K suite's own go_live_full! move,
  # so stickers are enabled for a viewer the gate admits.
  defp go_live!(host_id, opts) do
    place_id = "fixture_r24lw_#{System.unique_integer([:positive])}"

    {:ok, %{live_room: room, venue: venue}} =
      Lives.go_live(
        host_id,
        place_id,
        Keyword.merge(
          [
            allow_fixture: true,
            name: "Harbor Lights Bar",
            address: "100 Skyline Ave, Oceanside, CA",
            types: ["bar", "establishment"]
          ],
          opts
        )
      )

    {:ok, _full} =
      venue
      |> Venue.changeset(%{status: "full", quarantine_until: nil})
      |> Repo.update()

    room
  end

  defp visible_ids(token) do
    conn = authed(token) |> get("/api/v1/product/lives/visible")
    body = json_response(conn, 200)
    Enum.map(body["lives"], & &1["live_room"]["id"])
  end

  defp report_presence(token, room_id) do
    authed(token) |> post("/api/v1/product/lives/#{room_id}/report-presence", %{})
  end

  defp send_sticker(token, room_id, idem) do
    authed(token)
    |> post("/api/v1/product/lives/#{room_id}/stickers", %{
      "sticker_key" => "fire",
      "idempotency_key" => idem
    })
  end

  defp fund!(account_id, cents) do
    {:ok, w} = Wallets.get_or_create_wallet(account_id)
    {:ok, w} = w |> Wallet.changeset(%{balance_cents: cents}) |> Repo.update()
    w
  end

  defp balance(account_id) do
    Repo.get_by!(Wallet, account_id: account_id).balance_cents
  end

  defp presence_report_count(room_id) do
    from(r in LivePresenceReport, where: r.live_room_id == ^room_id, select: count(r.id))
    |> Repo.one()
  end

  defp sticker_count(room_id) do
    from(s in LiveSticker, where: s.live_room_id == ^room_id, select: count(s.id))
    |> Repo.one()
  end

  test "hidden room: a stranger's report-presence is the read path's 404 and writes nothing; the admitted friend's report succeeds",
       %{
         host: host,
         token_friend: token_friend,
         token_stranger: token_stranger
       } do
    room = go_live!(host.id, audience: "friends", location_precision: "venue")

    # Control: the case is real under the list's own rule - the
    # friend's visible list carries the room, the stranger's does not.
    assert room.id in visible_ids(token_friend)
    refute room.id in visible_ids(token_stranger)

    # The stranger's write is rejected exactly as the read is:
    # 404 with the not_found body - and it leaves nothing behind:
    # no presence report row, no count on the room.
    conn = report_presence(token_stranger, room.id)
    assert json_response(conn, 404)["error"] == "not_found"
    assert presence_report_count(room.id) == 0
    assert Repo.get!(LiveRoom, room.id).presence_report_count == 0

    # The admitted friend's write still lands, unchanged.
    conn = report_presence(token_friend, room.id)
    body = json_response(conn, 200)
    assert body["ok"] == true
    assert body["flagged"] == false
    assert body["presence_report_count"] == 1
    assert presence_report_count(room.id) == 1
  end

  test "hidden room: a stranger's sticker is the read path's 404 and moves no money; the admitted friend's sticker succeeds",
       %{
         host: host,
         friend: friend,
         stranger: stranger,
         token_friend: token_friend,
         token_stranger: token_stranger
       } do
    room = go_live!(host.id, audience: "friends", location_precision: "venue")

    assert room.id in visible_ids(token_friend)
    refute room.id in visible_ids(token_stranger)

    fund!(stranger.id, 10_000)
    fund!(friend.id, 10_000)
    fund!(host.id, 0)

    # The stranger's gift into a hidden room: 404, and the write
    # never ran - no sticker row, no debit, no host credit.
    conn = send_sticker(token_stranger, room.id, "idem-r24lw-stranger-1")
    assert json_response(conn, 404)["error"] == "not_found"
    assert sticker_count(room.id) == 0
    assert balance(stranger.id) == 10_000
    assert balance(host.id) == 0

    # The admitted friend's gift still lands with the catalog's
    # own amounts (fire = 500, host share 350).
    conn = send_sticker(token_friend, room.id, "idem-r24lw-friend-1")
    body = json_response(conn, 200)
    assert body["sticker"]["amount_cents"] == 500
    assert body["sticker"]["host_share_cents"] == 350
    assert sticker_count(room.id) == 1
    assert balance(friend.id) == 9_500
    assert balance(host.id) == 350
  end

  test "close-circle room: a plain friend the list hides gets the same 404 on both writes",
       %{
         host: host,
         friend: friend,
         token_host: token_host,
         token_friend: token_friend
       } do
    # The predicate's close_circle leg: friend visibility alone is
    # not enough - F is a plain dyad friend, so the list hides
    # this room from F (control) and both writes must agree.
    room = go_live!(host.id, audience: "close_circle", location_precision: "venue")

    refute room.id in visible_ids(token_friend)
    assert room.id in visible_ids(token_host)

    fund!(friend.id, 10_000)

    conn = report_presence(token_friend, room.id)
    assert json_response(conn, 404)["error"] == "not_found"

    conn = send_sticker(token_friend, room.id, "idem-r24lw-close-1")
    assert json_response(conn, 404)["error"] == "not_found"

    assert presence_report_count(room.id) == 0
    assert sticker_count(room.id) == 0
    assert balance(friend.id) == 10_000
  end

  test "the host is admitted by the gate and still answered by the pre-existing own-live rules",
       %{host: host, token_host: token_host} do
    room = go_live!(host.id, audience: "friends", location_precision: "venue")
    fund!(host.id, 10_000)

    # Not visibility errors: the gate admits the host (the host's
    # own room is visible to the host), so the writes reach the
    # rules that already governed them.
    conn = report_presence(token_host, room.id)
    assert json_response(conn, 422)["error"] == "cannot_report_own_live"

    conn = send_sticker(token_host, room.id, "idem-r24lw-host-1")
    assert json_response(conn, 422)["error"] == "self_gifting_forbidden"

    assert presence_report_count(room.id) == 0
    assert sticker_count(room.id) == 0
  end

  test "an unknown room id is the same 404 on both writes (hidden is indistinguishable from missing)",
       %{token_friend: token_friend} do
    missing = Ecto.UUID.generate()

    conn = report_presence(token_friend, missing)
    assert json_response(conn, 404)["error"] == "not_found"

    conn = send_sticker(token_friend, missing, "idem-r24lw-missing-1")
    assert json_response(conn, 404)["error"] == "not_found"
  end

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end

  defp mint_token(%User{} = user) do
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "test-web",
        platform: "web",
        status: "active",
        session_ref: "ref-r24lw-#{n}",
        refresh_family: "rf-r24lw-#{n}",
        idempotency_key: "idem-r24lw-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end
end
