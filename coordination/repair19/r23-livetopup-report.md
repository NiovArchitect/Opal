# REPAIR #23 TOP-UP - LIVES SHOW CONTRACT: ENRICHMENT + VISIBILITY - REPORT

Workstream: top-up worker closing the two backend observations
named in the WS-23-3 cluster report (r23-live-report.md,
DECLARATIONS): "SHOW CONTRACT ENRICHMENT GAP" and "SHOW HAS NO
VISIBILITY RE-CHECK". Backend only; no web changes.
Branch: muse/r23-livetopup, worktree wt-r23-livetopup, based on
the merged R23 tip muse/repair-23 at 1535d314 (the muse/r23-live
merge, verified as HEAD at worktree creation).
Code commit: b4cc8fe5.

## ITEM 1 - SHOW ENRICHMENT (closed at the source)

THE SHARED ENRICHMENT PATH: OpalCore.Lives.enrich_live_room/4
(private, apps/opal_core/lib/opal_core/lives.ex) - the one function
that builds an enriched live contract:

    LiveRoom.to_contract(room, venue)
    |> Map.merge(%{
      "audience" => room_audience(room),
      "location_precision" => room_precision(room),
      "place_label" => place_label(venue, precision),
      "host_display_name" => name,
      "host_handle" => handle,
      "mine" => room.host_account_id == viewer_id
    })

place_label/2 is the existing precision-honored label: venue-
precision rooms name the venue (Venue.display_name/1),
area-precision rooms carry venue.formatted_address.

BOTH CALL SITES (no second implementation exists):
- Lives.list_visible_lives/1 - its inline Map.merge was replaced
  by enrich_live_room(room, venue, host, viewer_id), where host
  is the {display_name, handle} tuple from its existing batched
  hosts map. List output is byte-for-byte the same shape as
  before (pinned by the existing paste_k suite and by the new
  show == list equality assertion below).
- Lives.get_live/2 - the show read. It loads the venue and the
  host identity (host_identity/1, a single User lookup returning
  {display_name, handle} or {nil, nil}, the show counterpart of
  the list's batched map) and returns
  {:ok, enrich_live_room(room, venue, host_identity, viewer_id)}.

LivesController.show now renders that enriched map as
"live_room", so GET /lives/:id carries host_display_name,
host_handle, place_label, audience, location_precision, and mine
computed for the requesting viewer - the seed/fallback dance in
C2LiveWatch is no longer load-bearing (the web lane is untouched;
it already reads these fields when the record carries them).

SIGNATURE NOTE: get_live/1 became get_live/2 (id, viewer_id).
Repo-wide grep before the change showed LivesController.show was
its only caller; the viewer-less form was the hole itself, so it
was removed rather than kept as a bypass. A non-binary viewer
falls to {:error, :not_found}.

## ITEM 2 - SHOW VISIBILITY (closed, list's own predicate)

THE PREDICATE AND ITS SOURCE: Lives.visible_to_viewer?/2 (private,
lives.ex, pre-existing) is the exact function list_visible_lives/1
filters with:

- host == viewer -> visible
- not RelationshipGraph.friend_visibility_authorized?(host, viewer)
  -> hidden (blocks and non-peers included, per that function)
- audience == "close_circle" -> visible only when
  Relationships.get_type in either direction is one of
  spouse / partner / family / close_friend
- otherwise visible

HOW SHOW REUSES IT: get_live/2 runs visible_to_viewer?(room,
viewer_id) before loading the venue or enriching; a hidden room
returns {:error, :not_found} and reaches the controller's
EXISTING not-found path (404, %{"error" => "not_found"}) - the
room does not exist for that viewer. No new visibility model was
invented; list and show can no longer disagree about audience.

STATUS NOTE (deliberate, stated for the record): the list ALSO
filters status == "live" at query level. That is a freshness
filter, not part of the visibility predicate, and show does not
import it: WS-23-3's truthful ended state opens a room by id, and
this top-up preserves that - an ended (or flagged) room still
opens for a viewer the predicate admits (its host, a permitted
friend), and is 404 for anyone the predicate hides it from. Every
room the list shows still opens; the new suite pins the ended
case for the host.

## TESTS

New suite: apps/opal_core/test/opal_core_web/r23_lives_show_test.exs
(5 tests, two-account family style - three real authenticated
users: host H, dyad friend F, unrelated stranger B; friendship is
a real direct conversation, the same peer the list keys on):

(a) Enrichment - venue-precision room: F's show carries
    host_display_name "R23 LT Host", host_handle, place_label
    naming the venue, mine false; H's show carries mine true;
    and F's show record EQUALS F's visible-list row for the same
    room (one shared path, no drift). Area-precision room:
    place_label is the formatted address, not the venue name,
    with the same show == list equality.
(b) Visibility - friends-audience room: control first (room IS
    in F's visible list, IS NOT in B's), then B's GET /lives/:id
    is 404 not_found while F opens it enriched. Second case from
    the list's own rules: a close_circle room that plain friend
    F is hidden from by the list (control: absent from F's list,
    present in H's) is also 404 for F on show.
(c) Ended room still opens for its host with status "ended" and
    enrichment intact; an unknown room id is 404.

Commands and counts (MIX_ENV=test, MIX_BUILD_PATH=
r23lt-scratch/build-test, DATABASE_URL database
opal_test_r23lt on :5433, from apps/opal_core):

- mix test test/opal_core_web/r23_lives_show_test.exs
  -> 5 tests, 0 failures.
- Existing lives suites (every lives test file found by grep for
  Lives / /lives / go_live, plus the live social-flow suites):
  mix test test/opal_core/lives/paste_k_lives_test.exs
    test/opal_core/social_flow/live_experience_test.exs
    test/opal_core/social_flow/live_group_collective_proof_test.exs
    test/opal_core/social_flow/pre_live_zero_trust_test.exs
  -> 31 tests, 0 failures.
- Neighboring social API suites:
  mix test test/opal_core_web/r23_audience_invisibility_test.exs
    test/opal_core_web/follow_api_test.exs
    test/opal_core_web/social_moment_engagement_api_test.exs
  -> 7 tests, 0 failures.

No other backend behavior changed: go_live, end_live (already
host-ownership checked), visible list output, and the mine read
(host-scoped) are untouched in behavior.

## DECLARATIONS (found, NOT fixed - named for the coordinator)

- REPORT-PRESENCE HAS THE SAME NO-RECHECK SHAPE (write path):
  POST /lives/:id/report-presence -> Verification.
  report_host_not_here/2 loads any room by id and accepts a
  host-isnt-here report from any authenticated non-host - no
  visible_to_viewer? check. Three such reports flag a room and
  freeze its heat, so an invisible room can be acted on by id.
  Not touched: it is a write/flag path, outside this item's
  read-fix scope.
- STICKER PURCHASE HAS THE SAME NO-RECHECK SHAPE (write path):
  POST /lives/:id/stickers -> Stickers.purchase/5 loads the room
  by id and checks self-gift, live status, venue stickers,
  velocity, cap, circularity - but never whether the sender may
  see the room. A stranger who learns a room id can gift into a
  room the list hides from them. Not touched, same reason.
- Lives.list_live_at_venue/1 (context function) returns raw
  LiveRooms for a venue with no visibility filtering. It has NO
  callers anywhere in the repo today (grep-verified - no route
  exposes it), so it is a latent shape, not a live exposure;
  named so it is not wired to a route without a predicate.
- mix precommit was NOT run as the apps/opal_core AGENTS.md
  suggests: the alias is compile --warnings-as-errors + format
  (whole tree) + full test, and it is not green at the base -
  lives.ex and lives_controller.ex are already format-dirty at
  1535d314 in regions this change does not touch (formatter diff
  verified confined to pre-existing lines; the new test file is
  format-clean and the new hunks introduce no format diff and no
  new compile warnings). The targeted suites above are the
  evidence; the full battery is the coordinator's leg.
- ENVIRONMENT NOTE: the VM restarted once mid-setup (Postgres
  :5433 down); the shared cluster was restarted from
  polish-scratch/pgdata2 per the standing self-healing stack
  script's PG leg only (no Phoenix/preview started), WAL
  recovery completed clean, and opal_test_r23lt - created before
  the restart - survived and was migrated after it. No test
  result above predates the recovery.
