# TRACK W5 — Sessions UI, Settings Continuation, Walk-Surface Sweep (Repair #17)

**Branch:** `muse/repair-17-w5` · **Base:** R16 tip `2c1bdcd2` · **Scope:** web only (`apps/opal_web`). Not pushed.
**Law applied:** every control REAL or HIDDEN (R13 standard); design freeze (structure/labels/function only); quiet law around sessions (no badges, no prompts).

---

## 1. Opal chat sessions UI

### Assumed backend REST shapes (RECONCILE AT INTEGRATION)

The backend session track builds these concurrently. Every session call
is isolated in one block of `apps/opal_web/src/api/productClient.ts`
(search "Repair #17 W5 — Opal chat SESSIONS") so the coordinator can
rename routes/shapes in exactly one place:

| Operation | Assumed route | Assumed response |
|---|---|---|
| List sessions | `GET /api/v1/product/opal/conversations` | `{ conversations: OpalChatSessionSummary[] }` — `id, title?, message_count?, last_message_preview?, inserted_at?, updated_at?` |
| Create session | `POST /api/v1/product/opal/conversations` (body `{}`) | `{ conversation: OpalChatConversation }` (new, empty) |
| Get one session | `GET /api/v1/product/opal/conversations/:id` | `{ conversation: OpalChatConversation }` (with `messages`) |
| Send in session | `POST /api/v1/product/opal/conversations/:id/messages` (body `{ body, client_context? }`) | `{ messages: OpalChatMessage[] }` — mirrors legacy `postOpalMessage` |
| Clear one session | `POST /api/v1/product/opal/conversations/:id/clear` (body `{}`) | `{ ok, cleared, deleted_messages?, conversation }` — mirrors legacy clear |

Client functions: `listOpalChatSessions`, `createOpalChatSession`,
`getOpalChatSession`, `postOpalSessionMessage`, `clearOpalChatSession`.

### Behavior (honest degradation by design)

- Sessions mode turns on **only when the list route answers successfully**
  (even with an empty list). Until then the chat runs entirely on the
  pre-existing single-conversation endpoints (`getOpalConversation`,
  `postOpalMessage`, `startOpalNewChat`, `clearOpalConversation`), which
  are real today. The UI never paints a session the API did not return.
- When the loaded legacy conversation's id appears in the sessions list,
  it is adopted as the active session; sends, the queued-action poll, New
  chat, and Clear then route to that session's endpoints.
- **UI** (`OpalCenterChat.tsx` + new `OpalChatSessionsDrawer.tsx`):
  - Conversation menu (···): **New chat**, **All chats**, **Clear this chat**.
  - All chats opens the sessions drawer: real sessions newest-first,
    untitled rows labeled by their own last-message preview (never an
    invented title), current chat marked "Current chat" in plain words.
    Distinct honest states: loading / failed-with-retry / empty
    ("No chats yet. Start a new one above."). New chat button in the drawer.
  - Switching loads that session's messages from the API; a pending
    rest-composer seed is never replayed into a switched session.
  - **Clear is real and two-step in plain language:** menu → confirm bar:
    "Clear this chat? Every message in this conversation will be deleted.
    Plans you made stay on your Graph." with **Clear chat** / **Keep
    messages**. The delete happens server-side first; local state resets
    only on success. On failure the bar stays up with "Couldn't clear
    this chat. Nothing was deleted. Try again." — no fake clear.
  - The old in-menu two-tap label ("Confirm clear visible history") is
    replaced by this bar; "New Chat"/"Clear Conversation" labels are now
    "New chat"/"Clear this chat".
- **Rename applied:** the founder's lean "Opal chat center" is the surface
  label now — dock button `aria-label` ×2 in `OpalApp.tsx` and the
  sr-only "Close Opal chat center" in `OpalCenterLifeGraph.tsx`.
  Labels/strings only; no route, id, testid, or component name changed.

## 2. Center header strip — live data only

**Was:** when no Google calendar was linked, the strip rendered the
founder-seed SAMPLE day — literally "Appointment 3:30 PM / Dinner 7:30 PM"
(`SAMPLE_DAY_SPECS`) — disclosed only by a small attribution line.

**Now** (`OpalCenterLifeGraph.tsx`, `centerNowStrip.ts`):
1. Linked calendar connected → its real events (unchanged path,
   `fetchCalendarToday`), attribution "From your linked calendar."
2. Else → the user's **real plans** via the existing live plans endpoint
   (`listOpalPlans`, `GET /api/v1/product/opal/plans`), projected by the
   new pure function `planEventsForToday`: a plan is painted only when its
   own `time_label` proves it belongs to today (a "today"/"tonight" token
   or a weekday token matching today) AND carries an explicit clock time.
   "Saturday after 10" (no AM/PM), "Open window", other days' plans, and
   cancelled/completed plans are never placed — no fabricated times.
   Attribution "From your plans."
3. Else → honest empty state: a single Now/Open node, attribution
   "Nothing on your day yet.", lede "Nothing on your day yet - ask and
   I'll shape one answer."

`sampleDayEventsFor` / `SAMPLE_DAY_SPECS` remain exported from
`centerNowStrip.ts` for their unit tests but have **zero render-path
callers** (guard-asserted in `opalChatSessions.test.tsx`).

Also fixed in Center: after "Go with this", the accepted strip painted a
fabricated third node ("Later / Next event") — removed; the strip shows
Now plus the accepted plan only.

## 3. Settings continuation (from `shots/repair15/SETTINGS_MAP.md` + R16 decisions)

The map's remaining buildable-now increments were P-1..P-8 proposals,
all gated on missing backend except two web-layer items, both built:

| Change | Disposition |
|---|---|
| **YOU hub settings search** (`OpalApp.tsx` YouPane + new pure filter `opalUi/youHubSearch.ts`) | REAL. Search field at the top of the YOU hub filters the hub's real destinations by section label / title / subtitle (all-token match). A result tap is the exact same navigation as the unfiltered row. Action rows (Grow Your Circle, Go live) step aside while searching. No match → honest "No settings match "…"." state. Hidden destinations stay unsearchable — search invents nothing. |
| **Connected sources status refinement** (`YouSettingsDestination.tsx` `projectGoogleConnection`) | REAL. When the backend status payload reports `last_synced_at` (already returned, previously dropped), the connected Google row now says "Last checked {Mon D, h:mm AM}." Absent/unparseable → nothing painted (no guessed freshness). New pure helper `formatConnectionSyncTime`. |

**Not built (map proposals, still backend-gated, unchanged):** P-1
Connected-sources destination (needs a 2nd real connector), P-2 contacts/
social standing grants, P-3 health/business substrate, P-4 device roster
API, P-5 export + self-serve delete endpoints, P-6 push categories
(Expo/APNs), P-7 mobile settings parity, P-8 prepared-and-kept surface
(product decision). No control was painted for any of these.

**Real-or-hidden disposition of every control touched this pass:**
sessions New/All chats/Clear (real, §1), hub search (real, above),
Google row detail (real data, above). No control in YOU/settings needed
hiding — the R13/R15 render gate (`blockedReason` rows return null) was
re-verified intact; guards `youSettingsComingSoon.guard.test.ts` and
`settingsWireClass.test.ts` green.

## 4. Blind-spot sweep — walk surfaces (Home, Chats list, thread, Center, Graphs, YOU)

### Fixed

| # | Finding | Fix |
|---|---|---|
| S-1 | Center strip painted fixture sample day (3:30/7:30) as the day view | §2 — live calendar → live plans → honest empty |
| S-2 | Center accepted-phase strip fabricated a "Next event" node | Removed (§2) |
| S-3 | Center "Shared" lens header painted a static day: kicker "SHARED · SATURDAY", title "Family Saturday", on every day of the week | Now "SHARED" / "Shared plans" (the phase's empty state was already honest) |
| S-4 | Global-Opal (query-gated Center variant) context sheet painted internal tranche language to consumers: "…is the intended UX. Full intelligent recompose after correction is P4_REQUIRED."; explore note "…one-answer in P4." | Plain-language copy in `OpalAmbient.tsx` (2 strings). Internal `ownership` tokens remain data-attributes only (behind the glass) |

### Filed (evidence, not fixed here)

| # | Finding | Evidence |
|---|---|---|
| F-1 | YOU hub "QR" button advertises QR but only navigates to Linked devices, where QR desktop linking is itself blocked ("QR desktop linking needs signed session mint API") | `OpalApp.tsx` `data-testid="you-qr"` → `setYouSetting("linked-devices")`; `YouSettingsDestination.tsx` linked-devices inventory row "Browser or desktop access via QR" with that blockedReason. Not removed: `pasteWProtectList.test.ts` founder-protects the `you-qr` element's presence — founder call (relabel vs. build the mint API) |
| F-2 | Center rest nudges are fixed sample prompts ("Maya's birthday in 3 days…") | `OpalCenterLifeGraph.tsx` `CENTER_SAMPLE_PROMPTS`. Disclosed in-UI ("Ideas to try. Live reminders connect as Opal learns your people.", `data-sample-prompt="true"`) — not presented as live, so not an R13 violation; replacing them needs the live Attention projection wired into Center rest (backend/other track) |
| F-3 | Graphs timeline seed items ("Saturday · 7:30" Juniper/Chanelle etc.) | `GraphsTemporalTimeline.tsx` `SEED_TIMELINE_ITEMS`, consumed only under founder-seed gate in `graphsHydration.ts` with `seedLabeled` + `FOUNDER_FIXTURE` mode; production/empty modes exclude them. Seed layer is another track's job per brief |
| F-4 | Home stories/feed fixture extras | `GraphSocialHome.tsx` `fixtureExtras` composed only when `isFounderSeedEnabled()`; production hydration is the default path. Same seed-track note as F-3 |
| F-5 | `waveBChatsExact` baseline failures expect Chats "New chat" to open Search People; the shipped handler deliberately opens the real NewChatPicker instead ("Search People remains available elsewhere; do not use seed rows as DM targets") | `OpalApp.tsx` `onNewChat` (~line 9447). The button performs a real operation — stale test authority, not a dead control. Pre-existing baseline failure, left name-identical |

### Swept clean (no findings)

- Chats list (`ChatsHome.tsx`): every button wired to a real prop
  callback or local surface state; plus-menu items all route.
- Conversation thread (OpalApp thread pane + `OpalCenterChat`): no static
  times/dates painted; timestamps derive from message `inserted_at`.
  (OpalApp send-path region untouched per brief.)
- Graphs (`GraphsHome.tsx`): create/filter/empty/error states all wired;
  honest `graphs-home-empty` / `graphs-home-error` states present.
- Home (`GraphSocialHome.tsx`): header search/activity buttons wired to
  real callbacks with a real attention count; no handler-less buttons
  (two regex candidates verified as multi-line `onClick` props).
- YOU/settings destinations: no dead `onClick`s; blocked inventory still
  renders null.
- Layer check: new sessions drawer + clear bar are in-flow chrome in the
  chat column (same pattern as the existing conversation menu) — no new
  overlays, no z-index stacking over the composer or dock.

## 5. Tests

New: `apps/opal_web/src/opalUi/opalChatSessions.test.tsx` — 14 tests, all
green: sessions drawer list/current-marking, session switch loads via
API, send routing to the active session endpoint, New chat creates +
switches, clear confirm copy + real clear + failure honesty + cancel,
sessions-list failure honesty, row label/time helpers; strip
`planEventsForToday` placement rules (incl. rejecting "Saturday after
10", other-day, cancelled), plans/empty attributions, sample-day
render-path source guard; hub search filter units + OpalApp wiring
guard; connected-source last-sync projection.

Touched-area suites re-run green: OpalCenterChat (except the 1
pre-existing baseline failure, identical signature `expected '' to
match /salvage me/`), OpalCenterChat.planSurface, ProfileGap*,
centerNowStrip, opalCenterLifeGraph, connectedSources,
settingsWireClass, youSettingsComingSoon.guard, youHubHierarchy,
youSettingsRender.proof, pasteWProtectList.

One lawful test disposition: `opalCenterLifeGraph.test.ts` "Investor
honesty" asserted the old `/Sample day below/` lede — updated to the new
honest empty-state lede (`/Nothing on your day yet/`) plus a
`not.toMatch(/Sample day below/)` guard, per the founder's strip
direction. No assertion weakened elsewhere.

TypeScript: 7 errors before and after, identical set (6 pre-existing
OpalApp + `RelationshipContact.handle` in YouSettingsDestination);
zero in any file this track created or touched.

Full web suite: see §6 (filled at commit time).

## 6. Full-suite result

Full web suite on the final tree: **25 failed tests** — the failing test
names are **identical to the R16 baseline set (25)**, verified three ways:
(1) a full-suite run on the pristine base in this same worktree before
any edit; (2) the final tree's Failed Tests list extracted name-by-name;
(3) the three files whose baseline attribution was ambiguous from the
reporter stream (grammar, graphSpine, graphScroll) re-run on a pristine
`2c1bdcd2` worktree — they fail at base with exactly the names the final
tree fails with (`chat_single_primary_next_gap_cta…`, `founder-locked
201 spine surfaces > forbids em dashes…`, graph list scroll ×2).
Collected-test totals wobble between runs (1,134–1,177 observed) due to
the known intermittent collection of two unrelated suites
(`onboarding/phoneAutofillDisplay`, `opalUi/callSubstrate`) in this VM —
the failing name set never varied. Zero new failures; the 14 new W5
tests pass in the full suite. No backend or mobile code touched.
