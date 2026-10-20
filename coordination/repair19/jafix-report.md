# Repair #19 — W20-FIX (journey-audit fixes JA-01..JA-12) — report

Worktree `wt-r19-jafix`, branch `muse/r19-jafix` off merged tip `09e587b2`.
JA-13 (mobile lockfile) untouched per scope — `apps/opal_mobile` not modified.
Not pushed. 13 commits, one per item (JA-04+JA-10 share one, living in the same seed file/test):

```
427870a8 R19 W20: mix format on the JA-02 alignment helper (precommit hygiene)
8333c1ab R19 W20 floor fix: junk viewer id is a clean denial in plan-media authorization
16207641 R19 W20 JA-12: media wells keep their height and take the no-image treatment on error
05ddd8cf R19 W20 JA-11: story rail dedupes the viewer's own story at the projection
b4f929b2 R19 W20 JA-09: location-share copy states the snapshot truth
8b71b485 R19 W20 JA-07: a real quiet-hours On/Off in the Soul room
13583fc8 R19 W20 JA-06: no dead buttons on Home
c2280f3e R19 W20 JA-05: crash boundary in the current design, dead reset path deleted
7f76be5f R19 W20 JA-04 + JA-10: per-viewer seeded calls; seeded Opal conversations
831daebb R19 W20 JA-03: in-row plan cards get the row's full content width at served breadth
d9e33969 R19 W20 JA-08: canonical build green
416c37ef R19 W20 JA-02: creator-only private predicate at the four aggregate projections
0e7d3447 R19 W20 JA-01: wire orbit unlock to the real route contract + joint test
```

## JA-01 — orbit unlock wired to the real contract + the joint test

**Fix.** `verifyOrbitLock(anchorType, anchorId, code, bearer)` in `apps/opal_web/src/api/productClient.ts`
now POSTs `/api/v1/product/opal/conversations/orbit-verify` with body `{anchor_type, anchor_id, code}`
(the real route, router.ex:573). The host (`C1ShellHosts.tsx`) threads the prompt's anchor
(`orbitPromptAnchor`) through `onVerify` and returns false when no anchor is present. Previously the
client POSTed `{code}` alone to a path that does not exist, so no passcode holder could ever unlock.

**Proof — the joint contract test** (`apps/opal_web/src/api/orbitVerifyContract.test.ts`, 5 tests,
drives the REAL client function through its own request/bearer/CSRF/fetch path against a stub that
implements the router contract verbatim; quoted from the test header):

> Repair #19 W20 JA-01 — the JOINT contract test for the orbit unlock seam (NC-2 lesson: FIX-A's
> endpoint tests and FIX-B's mocked-client tests each passed while the shipped client POSTed {code}
> to a path that does not exist, so no user with a passcode could ever unlock a private orbit).
>
>   route (router.ex):  POST /api/v1/product/opal/conversations/orbit-verify
>   controller:         requires anchor_type + anchor_id + code (missing/invalid -> 422 invalid_anchor)
>   OpalConversations.verify_orbit_unlock/4:
>                       anchor not owned by caller -> 404 not_found
>                       wrong code                 -> 403 wrong_code
>                       right code                 -> 200 { unlocked: true }

The test pins: right code → 200 unlocks; wrong code → 403, stays locked; foreign anchor → 404;
the legacy `{code}`-only body to the old dead path → 404/422 (regression pin). The server side of the
same contract is proven over real HTTP in `repair19_opalchat_scope_test.exs`. 12/12 tests pass
(contract test + updated `r19FixB.test.tsx` host assertions).

## JA-02 — creator-only private predicate at the four aggregate projections

**Fix.** The creator-only predicate (`is_private and created_by != viewer` ⇒ sealed) applied at:
(a) `NextPlan.pick_next` filter; (b) `Reveal.plan_items` query predicate
`(p.is_private == false or p.created_by_user_id == ^viewer_id)`; (c) `HomeProjection.from_plan_row`
returns nil for a non-creator on a private plan, and `from_alignment` sealed via a new
`sealed_private?/3`; (d) new `ConversationAlignment.seal_private_for_viewer/3` wired into
`ConversationController.alignment` (resets activity/date/time_window/exact_time/place/execution to
the unknown-field shape and deletes place_projection/pending_revision/change_proposal/plan_set_event/
counts/viewer_state). Named exceptions untouched: GraphPeople counts-only counters; the thread's own
message record.

**Proof.** New `repair19_ja02_private_projections_test.exs` passes: privatize → the participant is
sealed in all four projections + the chats-list row; the creator's payloads are unchanged (Reveal:
`[] == []` captured pre-privatization — a lead gets no item for a fully-formed tentative plan);
post-privatization edits do not leak; the thread message record is unchanged.

## JA-03 — chats-list row layout at served breadth

**Fix.** `PeopleChatsList` rows restructured (`C1Surfaces.tsx`): the identity line (avatar + main +
time) is wrapped in `.c1-chat-row-top`; the reveal / PlanAwareness / PlanCard render BELOW it spanning
the row's content width. CSS (`c1.css`): `.c1-chat-row` is now a column; the 48px avatar and the
timestamp column can no longer starve the card's column.

**Proof — served-breadth measurement** (`ja03ChatsRowBreadth.test.tsx`: node env, `renderToString` of
the REAL `PeopleChatsList`, production CSS sheets in served order, headless Chromium, viewport
390×844; assertions: `revealCard.width >= rowContentWidth - 1`, `revealTitle.width >= 200`):

> Pre-fix (fix stashed, same harness): reveal card **139.6px**, title **111.6px** — matching the
> audit's 142/114. Test fails pre-fix.
> Post-fix: row **350px**, content **318px**, reveal card **318px** (title **290px**),
> awareness card **318px** (title **292px**). Test passes.

## JA-04 — seeded calls attach per viewer

**Fix.** In `human_seed_world.ex` `seed_calls!`, call `correlation_id`s and outcome
`idempotency_key`s are suffixed `-#{viewer_id}`, so a second walk/review account's seed no longer
collides with the first viewer's call world. **Proof:** new two-viewer test in
`human_seed_world_test.exs` (second viewer sees their own call log, not "No calls yet"); 9/9 in file.

## JA-05 — crash boundary in the current design; dead reset path deleted

**Fix.** `OpalErrorBoundary` extracted from `main.tsx` to `apps/opal_web/src/runtime/OpalErrorBoundary.tsx`:
renders the C2 shell face (`c2s-root`, `data-shell="c2"`, `.c2s-boundary` styles in `c2shell.css`,
canon tokens only) with "Back to Opal" (session preserved, `window.location.reload()`). Deleted: the
legacy `app-futura` face, the hardcoded `#050816`, and the "Restart first run" →
`/?opal_reset_first_run=1` recovery path. **Proof:** `ja05ErrorBoundary.test.tsx` 3/3 (face classes,
reload-on-click, absence source-scans); build green.
**Scoping note:** remaining `opal_reset_first_run` references live in the founder checkpoint tooling
(`OpalApp.tsx` — the unmounted legacy app; `founderRuntimeCheckpoint.ts`; the `SplashIsolationProbe`
in `main.tsx`). Those are the founder's own checkpoint/reset tooling, not the crash-recovery path
JA-05 names; deleting them was judged out of scope and risky, so they were deliberately left and are
flagged here for a founder disposition.

## JA-06 — no dead buttons on Home

**Fix.** `C2HomeEvents.feedAction` is now optional in `C2Home.tsx`; card action buttons (live and
generic/discovery branches) render only when a handler exists. The two fake wirings are removed:
`feedAction: () => undefined` in `C2Shell.tsx` and `feedAction: noop` in `C2ShellReview.tsx`. There is
no real Watch outcome yet (watching Live has no viewer — the J2 named exception), so the honest state
is no button; the discovery kind
...[truncated 6422 chars]