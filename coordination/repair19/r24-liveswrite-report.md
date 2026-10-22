# Repair #24 Cluster D - WS-4: Lives write-path visibility enforcement

Branch: muse/r24-liveswrite (base c74adfe3, muse/repair-23 tip)
Commits:
- 3e63cc02 R24 WS-4 failing-first: lives write-path visibility suite
- c889c966 R24 WS-4 Lives write-path visibility (the fix)
- this report

Zero migrations. Additive-only: one controller file changed, one
test file added. No other worktree touched.

## Background

The R23 top-up (branch muse/r23-livetopup, code b4cc8fe5) closed
the read hole: GET /lives/:id enforces the visible list's own
visible_to_viewer? predicate via Lives.get_live/2, so a room the
list hides reads as 404 ({"error" => "not_found"}). It named, and
did not fix, the same no-visibility-recheck shape on the two
write paths. This cluster closes exactly those two.

## Enforcement points

File: apps/opal_core/lib/opal_core_web/controllers/lives_controller.ex

- LivesController.report_presence/2 (POST /lives/:id/report-presence)
  and LivesController.send_sticker/2 (POST /lives/:id/stickers)
  now both pass through Lives.get_live/2 - the read path's own
  enforcement function, predicate and all - before any write
  runs. On {:error, :not_found} the action answers with the read
  path's exact shape: status 404, body {"error" => "not_found"},
  and the write underneath never runs (the former bodies moved
  unchanged into do_report_presence/2 and do_send_sticker/3).
  Because the gate IS the read path's function, the predicate
  cannot drift between read and write, and a hidden room is
  indistinguishable from a missing one.
- The sticker gate runs before sticker_key / idempotency_key
  validation: for a hidden room, no payload probing either.
- One consequential shape alignment inside do_send_sticker: a
  downstream {:error, :not_found} from Lives.send_sticker (room
  or venue gone) now takes the same 404 clause instead of falling
  into the generic 422 clause. This also moves the pre-existing
  unknown-id sticker response from 422 "not_found" to 404
  "not_found" - required for hidden == missing indistinguishability;
  pinned by the new suite.
- Why the endpoint layer, not the context delegates: the two
  endpoints are the only production callers of
  Lives.report_host_not_here/2 and Lives.send_sticker/5 (grep over
  apps/: the controller is the sole caller of each), so gating the
  actions covers the entire exposed write surface. The delegates
  underneath (Verification.report_host_not_here/2,
  Stickers.purchase/5) are context units the Paste K suite drives
  with synthetic account ids that hold no user rows and no
  relationships; a predicate check at that layer would change
  those units' contract, which is not the hole that was named.
  The named hole was the POST routes, and the routes are gated.

What a rejected write leaves behind: nothing. No
LivePresenceReport row, no presence_report_count increment, no
LiveSticker row, no wallet debit or credit. All pinned.

What an admitted write keeps: everything. The gate admits the
host (own room), friends for a friends-audience room, and
close-circle viewers for a close_circle room - the same matrix
the visible list and GET /lives/:id already apply - and the
write then meets its pre-existing rules unchanged (pinned for
the host: report own live still 422 cannot_report_own_live,
sticker own live still 422 self_gifting_forbidden).

## list_live_at_venue/1 - named disposition: LEAVE, unchanged

Verified in this worktree: grep for list_live_at_venue over the
whole apps/ tree returns exactly one hit - its definition at
apps/opal_core/lib/opal_core/lives.ex:264. No caller in the
backend, the web app, or any test; it is not routed, so it is
not exposed. It is a public context function, so deleting it
would be an API removal outside this cluster's scope, bought
with no security gain today. Left exactly as found. Latent-risk
note for whoever wires it first: it returns raw LiveRoom rows
with no visibility filter - any future caller must apply
visible_to_viewer? (or route through the list/show paths) before
surfacing its rows.

## Test matrix (new suite: r24_lives_write_visibility_test.exs, 5 tests)

Livetopup suite style: three real users (host H, dyad friend F,
stranger B), real tokens, list-visibility control asserted in
every hidden-room case.

1. Friends-audience room, stranger report-presence: 404
   not_found, zero presence rows, room count stays 0. Admitted
   friend report-presence: 200, ok true, count 1 (non-regression).
2. Friends-audience room, stranger sticker: 404 not_found, zero
   sticker rows, stranger balance unchanged, host balance 0.
   Admitted friend sticker: 200, fire 500 / host share 350,
   friend 10000 -> 9500, host 0 -> 350 (non-regression).
3. Close-circle room, plain friend (list hides the room from F,
   control asserted): both writes 404, nothing written, balance
   unchanged.
4. Host matrix: host admitted by the gate; report own live 422
   cannot_report_own_live; sticker own live 422
   self_gifting_forbidden; nothing written.
5. Unknown room id: both writes 404 not_found (hidden ==
   missing, same body).

Failing-first: the suite was written and run before the fix.
Red run (saved log r24int-scratch/r24lw-red.log): 5 tests,
4 failures - the four visibility/unknown cases fail (writes
landed, sticker money moved, unknown-id sticker answered 422);
the host own-live test passed, as its semantics pre-date the fix.

## Exact commands and counts (read from run output)

Env: source ~/workspace/opal-graph/w28-scratch/env.sh;
MIX_ENV=test; MIX_BUILD_PATH=~/workspace/opal-graph/r24int-scratch/build-liveswrite;
DATABASE_URL=ecto://postgres:<pw>@127.0.0.1:5433/opal_test_r24lives
(DB created for this cluster, mix ecto.migrate run first).

- Targeted: mix test test/opal_core_web/r24_lives_write_visibility_test.exs
  -> 5 tests, 0 failures (log r24int-scratch/r24lw-green.log)
- Lives family: mix test test/opal_core/lives/paste_k_lives_test.exs
  test/opal_core_web/r23_lives_show_test.exs
  test/opal_core_web/r24_lives_write_visibility_test.exs
  -> 28 tests, 0 failures (Paste K 18 + R23 show 5 + R24 write 5;
  log r24int-scratch/r24lw-family.log)

Notes: one environment fight worth recording - credo would not
compile into the fresh per-cluster build path under full parallel
load (rotating module-availability errors); mix deps.compile
credo --force on its own generated the app cleanly and every run
after that was warm and fast. No code or deps were changed for
this. mix format --check-formatted flags only pre-existing hunks
in lives_controller.ex - the base file at c74adfe3 fails the same
check the same way (declared precommit baseline, as the R23
top-up report also recorded); the new lines add no format
violations and the new test file is format-clean. Full
mix precommit not run: it would rewrite unrelated baseline
across the tree, outside this cluster's scope.

## DISPOSITION: FIXED + evidence

Both named write paths enforce the read path's visibility rule
through the read path's own function; hidden-room writes are the
read path's exact 404 with zero side effects; admitted writes
are pinned working. Evidence: commits 3e63cc02 (red suite) and
c889c966 (fix) on muse/r24-liveswrite; red log 5 tests /
4 failures, green targeted 5 / 0, lives family 28 / 0 (counts
read from the run outputs, logs in r24int-scratch/).
