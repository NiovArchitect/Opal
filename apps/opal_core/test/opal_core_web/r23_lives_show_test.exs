defmodule OpalCoreWeb.R23LivesShowTest do
  @moduledoc """
  Repair #23 top-up - LIVES SHOW CONTRACT: ENRICHMENT + VISIBILITY.

  Two backend observations from the WS-23-3 cluster report, closed
  at the source:

    1. GET /lives/:id used to return the BASE LiveRoom.to_contract
       only - no host_display_name / host_handle, no place_label,
       no mine - while GET /lives/visible merged exactly those onto
       the same contract. Show now goes through the same shared
       enrichment path (Lives.enrich_live_room/4) as the list.
    2. Lives.get_live used to return any room by id to any
       authenticated caller; friend/audience visibility was
       enforced only on the visible-lives list. The show read now
       enforces the list's own predicate (Lives.visible_to_viewer?/2):
       a room not visible to the requester reads as 404.

  Accounts (two-account family style, three real users):
    - H: the host
    - F: H's friend (dyad peer via a direct conversation) - the
      viewer the list DOES show H's friends-audience live to
    - B: a stranger with no relationship to H - the viewer the
      list hides H's live from (the control case)

  Run standalone:
      mix test test/opal_core_web/r23_lives_show_test.exs
  """

  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Lives
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession

  setup do
    host = insert_user!("r23lt_host", "R23 LT Host")
    friend = insert_user!("r23lt_friend", "R23 LT Friend")
    stranger = insert_user!("r23lt_stranger", "R23 LT Stranger")

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

  defp go_live!(host_id, opts) do
    place_id = "fixture_r23lt_#{System.unique_integer([:positive])}"

    {:ok, %{live_room: room}} =
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

    room
  end

  defp show_room(token, room_id) do
    authed(token) |> get("/api/v1/product/lives/#{room_id}")
  end

  defp visible_ids(token) do
    conn = authed(token) |> get("/api/v1/product/lives/visible")
    body = json_response(conn, 200)
    Enum.map(body["lives"], & &1["live_room"]["id"])
  end

  defp visible_row(token, room_id) do
    conn = authed(token) |> get("/api/v1/product/lives/visible")
    body = json_response(conn, 200)
    Enum.find(body["lives"], &(&1["live_room"]["id"] == room_id))
  end

  test "show returns the enriched fields for a visible room, per precision and per viewer",
       %{host: host, token_host: token_host, token_friend: token_friend} do
    # Venue-precision room: place_label names the venue.
    room = go_live!(host.id, audience: "friends", location_precision: "venue")

    conn = show_room(token_friend, room.id)
    shown = json_response(conn, 200)["live_room"]

    assert shown["id"] == room.id
    assert shown["host_display_name"] == "R23 LT Host"
    assert shown["host_handle"] == "r23lt_host"
    assert shown["place_label"] == "Harbor Lights Bar"
    assert shown["location_precision"] == "venue"
    assert shown["audience"] == "friends"
    assert shown["mine"] == false

    # The show contract and the list contract are the SAME enriched
    # record for the same room and viewer - one shared path, no drift.
    assert shown == visible_row(token_friend, room.id)["live_room"]

    # The host's own show: same enrichment, mine true.
    conn = show_room(token_host, room.id)
    own = json_response(conn, 200)["live_room"]
    assert own["host_display_name"] == "R23 LT Host"
    assert own["host_handle"] == "r23lt_host"
    assert own["place_label"] == "Harbor Lights Bar"
    assert own["mine"] == true

    # Area-precision room: place_label carries the formatted
    # address instead of the venue name.
    {:ok, _ended} = Lives.end_live(room.id, host.id)
    area_room = go_live!(host.id, audience: "friends", location_precision: "area")

    conn = show_room(token_friend, area_room.id)
    area = json_response(conn, 200)["live_room"]
    assert area["location_precision"] == "area"
    assert area["place_label"] == "100 Skyline Ave, Oceanside, CA"
    assert area["host_display_name"] == "R23 LT Host"
    assert area["mine"] == false
    assert area == visible_row(token_friend, area_room.id)["live_room"]
  end

  test "a room the list hides from a stranger is 404 on show for that stranger, and opens for the friend",
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

    # The stranger's show is a hard 404 - the room does not exist
    # for B - with the controller's existing not-found body.
    conn = show_room(token_stranger, room.id)
    assert json_response(conn, 404)["error"] == "not_found"

    # The friend opens it, enriched.
    conn = show_room(token_friend, room.id)
    shown = json_response(conn, 200)["live_room"]
    assert shown["id"] == room.id
    assert shown["host_display_name"] == "R23 LT Host"
    assert shown["mine"] == false
  end

  test "close-circle room: a plain friend the list hides also gets 404 on show",
       %{host: host, token_friend: token_friend, token_host: token_host} do
    # The list's own close_circle rule: friend visibility alone is
    # not enough - the viewer must hold a close-circle relationship
    # type. F is a plain dyad friend, so the list hides this room
    # from F (control) and show must agree.
    room = go_live!(host.id, audience: "close_circle", location_precision: "venue")

    refute room.id in visible_ids(token_friend)
    assert room.id in visible_ids(token_host)

    conn = show_room(token_friend, room.id)
    assert json_response(conn, 404)["error"] == "not_found"

    conn = show_room(token_host, room.id)
    assert json_response(conn, 200)["live_room"]["mine"] == true
  end

  test "an ended room still opens on show for its host (WS-23-3 ended state is not a visibility casualty)",
       %{host: host, token_host: token_host} do
    room = go_live!(host.id, audience: "friends", location_precision: "venue")
    {:ok, _ended} = Lives.end_live(room.id, host.id)

    conn = show_room(token_host, room.id)
    shown = json_response(conn, 200)["live_room"]
    assert shown["id"] == room.id
    assert shown["status"] == "ended"
    assert shown["host_display_name"] == "R23 LT Host"
    assert shown["mine"] == true
  end

  test "a room id that does not exist is 404 on show", %{token_host: token_host} do
    conn = show_room(token_host, Ecto.UUID.generate())
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
        session_ref: "ref-r23lt-#{n}",
        refresh_family: "rf-r23lt-#{n}",
        idempotency_key: "idem-r23lt-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end
end
