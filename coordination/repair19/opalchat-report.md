# Repair #19 — WAVE W14: OPAL-CHAT STRUCTURE + THE THREAD DOORWAY
## + Addition A (person-scoped Opal chats) + ORBITS supersession + conversation CHROME + FROSTED GLASS

Branch `muse/r19-opalchat` off `muse/repair-19` base `f2981dbf`, worktree
`~/workspace/opal-graph/wt-r19-opalchat`. Not pushed (coordinator merges).
FOUNDER_ACCEPTED stays NO — machine-proven only; rendered pack captures are
owed by the pack phase using the testid list in §9.

Commits:
- `f961f5bb` web: separation + doorway + Orbits log/sheet + chrome (see §2–§7)
- `ce00a56a` backend 1/3: scope+anchor schema + additive migration
- `a32cfbad` backend 2/3: scoped birth / anchor / remove / orbit-private / pin / archive + endpoints
- `eae20e54` backend 3/3: FR-19-W14-01..06 scope-proof cases
- backend completion + results: §12

---

## 1. SEPARATION AUDIT (original brief item 1)

### How the two conversation kinds actually stand at base

| | Opal conversations | Person threads |
|---|---|---|
| Backend store | `opal_conversations` + `opal_messages` (`OpalCore.OpalConversations`, R17 server-first sessions: list/switch/rename/clear, one active per user) | `conversations` + `messages` + `conversation_members` (`OpalCore.Messages`) |
| Endpoints | `/opal/conversation`, `/opal/conversations…` | `/conversations`, `/conversations/:id/messages` |
| Web producers | `threadMsgFromOpalMessage` (C1ShellHosts) — kinds `person`(viewer)/`opal` only; legacy `OpalCenterChat` over its own endpoints | `threadMsgFromProductMessage` — kinds `person`/`system` only (call-invite → system line via the deckfix F2a call-record resolution) |
| Surfaces | C1 `CenterChat` (CenterHost), legacy `OpalCenterChat`/`OpalCenterLifeGraph` | C1 `ThreadShell` (ChatsHost), legacy `ChatsHome` thread in OpalApp |

The backend stores and endpoints were already fully separate. The blend
risk was entirely at the WEB COMPONENT layer, and it was real:

### Blends found and closed

1. **Shared message flow, no kind discipline (structural).** `CenterChat`
   and `ThreadShell` both render through one `MessageFlow` over the shared
   `ThreadMsg` type whose `authorKind` includes `"opal"` — nothing stopped
   an Opal-authored message (body + plan card + listen button) from
   rendering inside a person thread, or a system line inside the Opal
   chat. **Closed at the component level:** `MessageFlow` now takes a
   `surface` and filters through `messagesForSurface` (`opalChatScope.ts`):
   person-thread allows `person|system`; opal-chat allows `person|opal`.
   A blended kind renders NOTHING. Tests fail if blending returns
   (`opalChatDoorway.test.tsx` separation block, incl. adapter-lane pins).
2. **The C1 review fixture itself blended them.** `C1Review`'s
   `THREAD_MESSAGES` carried an `authorKind: "opal"` plan message inside a
   person `ThreadShell`. Changed to a person-authored plan message (the
   graph record belongs to the thread's people); the Opal-authored form
   remains only in `CENTER_MESSAGES`. Review-only surface, but it was the
   canonical example of the blend.
3. **Seed/scripted ghosts: none left to close.** R17 already deleted the
   scripted seed layer (`seedKillGuard.test.ts` pins this and stays
   green); no seed conversation can be listed as an Opal chat or vice
   versa — the two lists come from different endpoints and different
   adapters, and the sessions list is owner-scoped server-side.
4. **Legacy shell:** OpalApp's person thread renders only `Messages`
   records; its Opal conversation is `OpalCenterChat` over the Opal
   endpoints. No shared renderer exists there; the C1/C2 path above is
   where the doorway lives and where enforcement was added.

## 2. THE DOORWAY (original brief item 2) + CONTEXT (item 3)

- **Placement (strip-area diff, stated exactly):** the ONLY touch to the
  Next Together strip is additive INSIDE the existing strip `<div>` in
  `ThreadShell` (`C1Surfaces.tsx`): after `<PlanAwareness variant="strip">`,
  two quiet text buttons — `opal-doorway` (the plan doorway) and
  `opal-chats-index-open` (the person's orbit doorway, Addition A). When
  no strip renders (no fact), the index doorway alone renders in a slim
  `thread-opal-zone` div in the same zone. No strip markup, classes, or
  solidity behavior changed — W5's strip work merges against a purely
  additive diff. YOUR MOVE card pattern untouched.
- **Presence rules (derivation source: ONLY the projections DIR-1/DIR-4
  already compute — `planIsDiscussable` / `opalDoorwayContext` in
  `opalChatScope.ts`, fed by ChatsHost from the thread contract's
  `next_plan` + the conversation-scoped reveal feed):** a doorway exists
  iff the thread's own shared plan fact exists AND
  (a) `state === "action"` (DIR-1: the viewer's own participant response
  is pending), or
  (b) a DIR-4 reveal is `lit` whose `plan_id` equals the fact's plan_id, or
  (c) `state === "forming"` with an open question: the fact itself carries
  no `when_label` or no `where_label`, or a DIR-4 P3 item for THIS plan
  names a `missing_slot`.
  Ready/happening/forming-complete with nothing pending → no doorway
  (honest absence). A group thread scopes to no person → no doorway.
- **Context mechanism:** the doorway context
  `{personId, personName, conversationId, planId, planTitle}` takes its
  plan ONLY from the thread's own fact (never from a reveal) and its
  person/conversation ONLY from the thread being viewed — a doorway in
  thread A cannot scope to plan B (pure-function tests + backend
  fail-closed validation, §5). On the shell, the tap routes to Center;
  CenterHost reuses the existing session already scoped to this
  person+plan (`doorwayTargetSessionId`, exact equality on both ids) or
  starts a new scoped session (backend §5). The context is VISIBLE in the
  Opal conversation as `opal-context-chip` ("<plan> — with <person>"),
  with `Back to your chat with <person>` (→ shell's existing
  chat-open-request → the person thread) and `Opal chats about <person>`
  (→ the orbit sheet). Both directions navigable, always; unscoped chats
  render no chip.
- **Copy:** "Talk to Opal about this plan — <plan title>"; plain and
  graph-native; no listening metaphors anywhere in the new copy.

## 3. ADDITION A — PERSON-SCOPED OPAL CHATS (absorbed; superseded in shape by §4)

Delivered inside the Orbits shape (§4): the person index is
`sessionsForPerson` — an exact-equality filter over the sessions
contract's carried context — presented as the person orbit sheet.
Operations are real: open (switch endpoint), start-new (scoped birth),
remove (server delete behind the plain confirmation), all keyed off the
person id generally (nothing hardcoded to any person; the dyad rule is
`dyadPersonOf`: a thread with exactly one peer scopes to them, a group
to no one). Scoping proofs: §5 backend FR-19-W14-01/02/04 + web filter
tests (X's sessions never in Y's index/orbit).

## 4. ORBITS (supersession, 23:42 PDT)

- **Model:** anchor = `(type, id)` on the conversation — additive backend
  columns (§5): `anchor_type`/`anchor_id` (string id: place anchors carry
  provider ids)/`anchor_label`, beside the birth scope
  `context_person_id`/`context_plan_id`/`context_conversation_id`. ONE
  primary anchor per conversation; the anchor is the one filing truth
  (gyroscope: surfaces group from the contract's anchor/scope only —
  `buildOrbitLog`/`sessionsForAnchor`; mentions are searchable facets,
  never stored). Unanchored = no anchor (birth scope alone does not file
  a chat under an anchor it wasn't given: scoped births DO set anchor —
  plan if a plan is carried, else the person).
- **The Center log** (`CenterSessionList`, rewritten): CONTINUING (the
  live session) pinned at top → PINNED zone → orbit groups COLLAPSED BY
  DEFAULT (header = anchor disc + name, conversation count, latest line;
  dormant orbits sink by latest activity) → EARLIER (unanchored recency)
  → ARCHIVED section. Search crosses everything; a group containing a
  match renders open while searching. The name rides ONE copy constant:
  `ORBITS_NAME = "Orbits"` in `opalChatScope.ts` (provisional, founder
  may rename — one-line change).
- **Proposals, never silent filing:** detection =
  `anchorProposalFromMessages` — the latest Opal message's
  `context_snapshot` person name (the Center pipeline's own stamp),
  resolved UNIQUEly against the account's relationship contacts;
  ambiguity/none → no proposal. An unanchored chat shows the quiet chip
  `About <name>?` [Yes] [Choose different → candidate picker: the
  account's real contacts + real plans, plus "Leave unanchored"]. Every
  accept/redirect/unanchor writes through the ONE anchor endpoint and
  shows a notice with **Undo** (one tap re-issues the same write with
  the previous anchor). **Drift:** a detected subject different from the
  filed anchor offers a SPLIT ("This is moving toward <name>. Start a
  new chat about them? This chat stays where it is.") — accepting starts
  a new scoped chat in the new orbit; the original is never moved.
- **Orbit sheet** (`OrbitSheet.tsx`, replaces the index sheet): from the
  thread doorway zone, the log's orbit header (`orbit-open-sheet`), and
  the Opal context chip. Shows the anchor's PLANS (only proven sources:
  in ChatsHost the thread's own DIR-1 fact; in CenterHost the plans the
  orbit's own scoped sessions carry, or the plan anchor itself) + its
  Opal conversations (pinned first, openable) + start-new + per-row
  Archive + Remove-behind-confirmation + the orbit-private toggle +
  quick-draw back to the anchor's thread. Archive/delete touch the
  CONVERSATION ONLY (backend proof FR-19-W14-04: thread `next_plan` and
  the plans list read back intact after removal).
- **Ingestion landing:** the rule is implemented at the layer this wave
  owns — the scoped-birth endpoint (§5) IS the anchored landing path: any
  Opal chat born from ingested material enters through
  `POST /opal/conversations/scoped` with its plan/person binding and is
  anchored at birth. **Seam for integration (honest):** no ingestion
  pipeline at this base creates Opal sessions (the meeting/transcript
  paths create capsules/plans, not Opal conversations — grep-verified:
  Opal session creation points are the controller + workers'
  `get_or_create` for the owner's own active chat). The coordinator
  routes the future ingestion-born creation point through the scoped
  endpoint; the capsule side (Memory Wallet) is W-other's layer.
- **Privacy seam (honest):** the orbit-private FLAG is real end to end
  (column, whole-orbit write endpoint, contract `anchor.private`, sheet
  toggle). The Center log renders a private orbit as HEADER ONLY (name +
  "Private" — no latest line, no count, no contents) behind the small
  `OrbitGate` interface (`isUnlocked`/`requestUnlock`). **No passcode
  verification is implemented or faked:** the host's gate currently
  unlocks for the local session only and says so in its notice. The
  coordinator wires W7's real verification (POST /opal/graph-lock
  pattern) behind `OrbitGate` at integration.

## 5. BACKEND (additive only)

Migration `20261030010001_add_scope_and_anchor_to_opal_conversations`
(hand-authored to the repo's migration convention — `mix
ecto.gen.migration` was invoked first but the VM restarted mid-generation
and deps were unavailable on retry; the file follows the generated shape
exactly). Columns: the §4 scope/anchor set + `orbit_private` +
chrome's `pinned_at`/`user_archived_at` (user-archive is deliberately
DISTINCT from `archived_at` rotation — conflating them would hide every
rotated session from the log). Indexes on (user_id, context_person_id)
and (user_id, anchor_type, anchor_id).

`OpalConversations` additions: `create_scoped_session/2` (fail-closed
binding validation: person must exist; a given thread must contain BOTH
caller and person via `Messages.member_user_ids/1`; a given plan must
read through `SocialFlow.get_plan_for_user/2` AND include the person in
`SocialFlow.plan_participant_ids/1` — no direct plan-table reads in this
module, so no gyroscope registry change), `set_anchor/3`,
`remove_session/2` (real delete; person threads/plans are different
tables and are never read), `set_orbit_private/4`, `set_pinned/3`,
`set_user_archived/3`, `list_sessions/2` with `:person_id`.
Contracts: every session contract + summary now carries `context`
(names re-derived LIVE — person from the user record, plan title
through the sanctioned plan reader), `anchor`, `pinned`, `user_archived`.

Endpoints (all owner-scoped, foreign → 404):
`POST /opal/conversations/scoped`, `GET /opal/conversations?person_id=`,
`POST /opal/conversations/:id/anchor`, `POST /opal/conversations/:id/remove`,
`POST /opal/conversations/:id/pin`, `POST /opal/conversations/:id/archive`,
`POST /opal/conversations/orbit-private`. Declared before the `:id`
routes so `scoped`/`orbit-private` are never captured as ids.

Cases (`repair19_opalchat_scope_test.exs`, ConnCase, real activation
flow): FR-19-W14-01 scoped birth + exact person index; -02 mismatched
bindings refused, nothing created; -03 anchor accept/redirect/undo/
unanchor + foreign 404; -04 removal leaves thread + plan untouched;
-05 orbit-private covers exactly one orbit; -06 pin + the one archive.

RESULTS: see §12 (backend completion) — 6 tests, 0 failures; full
pinned backend suite 3176/0; API regression 101/101.

## 6. CHROME (addition, 23:50 PDT)

Scope: Opal (Center) conversations only. Person threads keep their
established chrome — nothing duplicated into `ThreadShell`'s header.

- **Top-right overflow:** `•••` in a glass circle (`center-chat-overflow`)
  on the open Opal chat. Items exist ONLY when the host wires the real
  handler: RENAME (inline form → the existing PATCH title endpoint; the
  returned summary re-renders header + list — one title truth, proven by
  the rename-propagation test) / PIN / ARCHIVE / SHARE / DELETE (inline
  plain confirmation → the §5 remove; same statement as the orbit
  sheet's). **PIN RULE implemented:** pinned conversations hold a
  Pinned zone directly under Continuing, ordered by `pinned_at` desc —
  the zone precedes every group/list, so a pin survives recency
  ordering by construction; a pinned row renders ONLY there (anchor
  unchanged; inside the orbit sheet pinned rows sort first + carry a
  Pinned marker). **ARCHIVE unity:** overflow Archive and orbit-sheet
  Archive are the same `setOpalChatArchived` write over the same
  `user_archived_at`; the log's Archived section reads the same flag.
- **SHARE wiring truth (honest):** no conversation share-card surface
  exists at this base (W13 owns it, sibling wave). Share therefore wires
  to the platform share path that exists (`navigator.share`, clipboard
  fallback, honest unavailable notice) carrying the conversation's
  TITLE + anchor reference only — never message content. The single
  seam is CenterHost's `shareConversation`; W13's card surface replaces
  its body at integration.
- **Top-left navigator:** glass `☰` (`center-chat-navigator`) opens the
  **conversation rail** — `ConversationRail` renders the SAME
  `CenterSessionList` component over the SAME sessions state inside a
  glass drawer. One truth, two presentations (rail == log proven by
  test: identical orbit-group keys + continuing id from both).

## 7. FROSTED GLASS (addition, 23:53 PDT) + DESIGN NOTES

- W3's pad glass token had NOT landed on this base (checked
  `coordination/repair19/halo-report.md` — not yet filed — and the tree:
  no shared glass token). Per the rider's fallback, this wave defines
  ONE interim token pair in `c1.css` with the same shape —
  **`--opal-glass-tint` + `--opal-glass-blur` (18px), per mode**
  (dark default tint `rgba(18,20,30,0.55)`; light
  `rgba(255,255,255,0.66)`) — consumed via the single `.c1-glass` class
  (background tint + composited `backdrop-filter: blur + saturate`).
  **Integration unifies this with W3's token; the names above are the
  ones to replace.**
- Frost goes ONLY on chrome: the overflow circle + menu, the navigator
  button, the rail panel (fixed, small, composited — no per-scroll
  work). READABILITY surfaces stay SOLID by design and by test:
  the Next Together strip, plan-awareness, cards, bubbles, the orbit
  sheet panel carry no backdrop blur (`opalChatDoorway.test.tsx` glass
  block pins this).
- **Experience-level choices (interpretive key: functional parity,
  experiential invention):**
  - The log files by MEANING, not time — orbits are the identity move:
    no incumbent's chat list looks like anchored, collapsed orbits
    under a pinned live conversation. Restraint is the mechanism:
    collapsed and quiet by default; ambience is the anchor disc +
    entity naming, nothing decorative without a job.
  - The doorway is a sentence in the plan's own strip, not a banner or
    a FAB: the function (ask Opal about this plan) inherits the
    strip's gravity instead of inventing chrome.
  - Proposals use the incumbent-familiar pattern (a quiet chip) but
    the Opal physics: filing is by anchor, undo is one tap, drift
    splits instead of moving — the feel is "conversations live
    somewhere", not "messages in a pile".
  - Places where invention would harm clarity stayed plain: the
    delete/archive confirmations are unadorned sentences; the sheet
    is a solid list, not glass.

## 8. FILES CHANGED

Backend: migration above; `opal_conversations/opal_conversation.ex`
(fields, scope changeset, contract context/anchor/chrome);
`opal_conversations.ex` (scoped birth, anchor, remove, orbit-private,
pin, user-archive, person-filtered list, live name derivation);
`opal_conversation_controller.ex` + `router.ex` (endpoints);
`repair19_opalchat_scope_test.exs` (new).

Web: `api/productClient.ts` (context/anchor contracts + scoped/anchor/
pin/archive/remove/orbit-private calls); `opalUi/c1/opalChatScope.ts`
(new: separation guards, doorway derivation, orbit log projection,
sessions-for-person/anchor, ORBITS_NAME); `opalUi/c1/C1Surfaces.tsx`
(MessageFlow surface filter, ThreadShell doorway — the strip-area diff
in §2, CenterSessionList → orbit log, ConversationRail, CenterChat
context chip + chrome + proposal/split/notice);
`opalUi/c1/OrbitSheet.tsx/.css` (new); `opalUi/c1/c1.css` (doorway,
chip, chrome, orbit log, rail, glass token);
`opalUi/c1/C1Review.tsx` (de-blended fixture; log fixture anchored);
`c2/shell/C1ShellHosts.tsx` (adapters + Center/Chats host wiring);
`c2/shell/C2Shell.tsx` (doorway routing + quick-draw back);
`opalUi/c1/opalChatDoorway.test.tsx` (new, 39 tests).

**Strip-area diff (explicit, for the W5 merge):** `C1Surfaces.tsx`
ThreadShell — inside the existing `next-together-strip` div only:
two additive buttons after PlanAwareness + one conditional slim zone
when no strip renders. Nothing else in the strip changed.

## 9. PACK CAPTURE LIST (testids for the pack phase)

Doorway: thread with discussable plan (`opal-doorway` inside
`next-together-strip`, dark+light); thread with ready plan (doorway
absent — same frame, no element); thread with no plan (only
`opal-chats-index-open` in `thread-opal-zone`).
Scoped chat: `opal-context-chip` (plan + person), both modes.
Orbit sheet: from thread and from Opal chat (`orbit-sheet`,
plans + rows + pinned marker), clear-out confirmation
(`orbit-sheet-confirm`), both modes.
Addition A additions: index sheet from thread, index from Opal chat —
both ARE the orbit sheet above (person anchor frames).
Orbits additions: Center log collapsed (`center-session-list` with
`orbit-group` collapsed, `center-log-continuing`, `center-log-pinned`),
Center log expanded (one orbit open), proposal chip
(`anchor-proposal`), redirect picker (`anchor-picker`), split offer
(`split-proposal`), undo notice (`anchor-notice` + `anchor-undo`),
private orbit locked (header-only group), both modes.
Chrome additions: overflow open (`center-chat-overflow-menu`), rename
result (renamed title in log + sheet), rail expanded
(`conversation-rail`), both modes.

## 10. RESULTS

See §12 — the backend completion section carries the verbatim suite
results for the whole wave (backend + web re-verification + API
regression) at the final tip `eae20e54`.

## 11. RESIDUALS / SEAMS NAMED

- OrbitGate verification is a seam (§4): local-session unlock only,
  notice says so; W7 wiring owed at integration.
- Share cards are W13's (§6): platform share path wired; card surface
  replaces the handler body at integration.
- Glass token unification with W3 (§7): `--opal-glass-tint` /
  `--opal-glass-blur` are this wave's interim pair.
- Ingestion-born Opal chats (§4): scoped endpoint is the landing rule;
  no pipeline creation point exists at base to route yet.
- Legacy `OpalCenterChat` (OpalApp shell) does not render the context
  chip/doorway chrome — the doorway's landing surface is the C1/C2
  Center chat (the shell the pack serves); the backend context rides
  both, since both read the same session contracts.

## 12. BACKEND COMPLETION (continuation worker, 2026-10-19)

The first worker was killed by a runtime restart mid-backend-phase,
leaving the §5 backend as a complete-but-uncommitted working-tree
diff (4 modified files + migration + test, +599/−6). This section
records what that backend half was, the two changes made while
completing it, and the verbatim verification at the final tip.

### What the backend half was (as inherited, design reconstructed from the diff)

Exactly §5 as written: migration `20261030010001` (additive only —
nine new columns + two indexes on `opal_conversations`, down drops
exactly those); schema fields + `scope_changeset/2` (programmatic
writes only, anchor type inclusion-validated) + contract `context` /
`anchor` / `pinned` / `user_archived`; `OpalConversations` additions
(`create_scoped_session/2` fail-closed, `set_anchor/3`,
`remove_session/2`, `set_orbit_private/4`, `set_pinned/3`,
`set_user_archived/3`, person-filtered `list_sessions/2`, live
person/plan name derivation through the user record and the
sanctioned `SocialFlow.get_plan_for_user/2` — no direct plan-table
reads, so no gyroscope registry change); controller actions +
router lines with `scoped`/`orbit-private` declared before the
`:id` routes. The diff was internally complete: every function the
new code calls (`Messages.member_user_ids/1`,
`SocialFlow.plan_participant_ids/1`, `get_conversation_for_user/2`,
`session_summary/2`) exists at base with the expected shape.

### Changes made during completion (2, both small)

1. **Provider-job parity in scoped birth** (`a32cfbad`):
   `create_scoped_session/2` archived the previous session "exactly
   as `start_new_chat/1`" but did not cancel in-flight provider
   jobs, which `start_new_chat/1` does — sticky provider state
   could have leaked into a doorway-born session. Added
   `OpalCore.Center.ProviderAction.cancel_inflight_for_user(user_id)`
   before the archive/insert transaction, matching `start_new_chat`.
2. **Format**: `mix format` applied to the five files that were
   formatted at base (schema, controller, router, migration, test).
   `opal_conversations.ex` was already unformatted at base and was
   deliberately NOT wholesale-reformatted (would churn unrelated
   code); its diff grew only +2 lines from the parity edit.

Committed in three increments as the work landed (`ce00a56a`
schema+migration, `a32cfbad` context+controller+router, `eae20e54`
tests) so no large uncommitted diff ever sat in the tree across the
two further runtime restarts that hit during verification — the
commits survived both; only /tmp state (deps, logs) was lost and
rebuilt. Branch tip: **`eae20e54`**. Not pushed.

### Verification (verbatim, at tip `eae20e54`)

Env: `PATH=~/workspace/elixir/bin:~/workspace/otp/OTP-27.3.4.2/bin:$PATH`,
`ELIXIR_ERL_OPTIONS="+fnu"`, `MIX_DEPS_PATH=/tmp/opal_deps`,
Postgres 16 on 127.0.0.1:5433 (own DBs `opal_test_r19opalchat`,
`opal_dev_r19opalchat2` — 111 migrations, max version
`20261030010001`, this wave's migration at the tip).

W14 scope cases (the scoping proofs):

```
6 tests, 0 failures
```

(FR-19-W14-01 exact person index — B's index holds the scoped
session, C's never does, the person does not own it; -02 plan-of-A–C
scoped to B and thread-of-A–C scoped to B both refused 422
`invalid_scope` creating nothing, unknown person 404; -03 anchor
accept/redirect/undo-by-reissue/unanchor + foreign 404; -04 removal
deletes the Opal chat from every listing while the person thread's
`next_plan` and the plans list read back intact; -05 orbit-private
covers exactly the one orbit; -06 pin + the one user-archive,
distinct from rotation and removal.)

Backend full suite, PINNED 02:00 LA
(`OPAL_CLOCK_OVERRIDE=2026-10-18T09:00:00Z mix test`):

```
3176 tests, 0 failures
```

= the 3,170 pinned baseline + this wave's 6 new cases, zero
regressions.

API regression suite — own stack from this tip (fresh dev DB
migrated to this tip, `mix phx.server` on :4105, synthetic
provisioning, clock pinned 2026-10-18T21:00:00Z):

```
summary: 101/101 PASS
```

Transparency: the first completed regression attempt scored 95/101
with all 6 failures cascading from HTTP 429s on conversation/plan
creation — a prior SIGTERM-killed attempt had already run 23 cases
against the same dev DB/accounts, so the second pass exhausted
creation rate limits. On a fresh DB with a single run (the battery's
own conditions) the suite is 101/101; no product code was changed
between the two attempts.

Web re-verification (web half untouched by the backend commits —
re-verified, not rebuilt): after a clean `npm ci` (the inherited
`node_modules` was install-skewed and produced a spurious 38
failed / 19 files on the first pass),

```
 Test Files  16 failed | 180 passed (196)
      Tests  23 failed | 1536 passed (1559)
```

— exactly baseline (23 failed / 16 files), including
`opalChatDoorway.test.tsx` 39/39 green. Typecheck: exactly **9**
errors, the baseline set (OpalApp ×3 TS2345, productClient ×5
duplicate-identifier TS2300/TS2717, YouSettingsDestination ×1
TS2339; line numbers shifted by the W14 web commit's productClient
additions).

### Seams left for integration (unchanged from §11, restated for the backend)

- **Orbit-private gate**: the backend truth is complete — the
  `orbit_private` column + whole-orbit write
  (`POST /opal/conversations/orbit-private`, FR-19-W14-05) store the
  flag only. No verification exists backend-side by design: the
  coordinator wires W7's graph-lock verification behind the web
  half's `OrbitGate` interface (`isUnlocked`/`requestUnlock`) at
  integration, at which point a verify endpoint in the
  `POST /opal/graph-lock` pattern is the expected addition — it is
  an interface seam, NOT implemented or faked here.
- **Ingestion landing**: `POST /opal/conversations/scoped` remains
  the anchored landing path; no pipeline creation point exists at
  this base to route through it.
- Share cards (W13) and glass-token unification (W3) are web-side
  seams, §6/§7 — no backend component.
- FOUNDER_ACCEPTED stays NO: machine-proven only; the §9 rendered
  pack is still owed by the pack phase.
