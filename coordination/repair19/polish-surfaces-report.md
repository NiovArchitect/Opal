# Repair #19 - Founder Polish Wave, Cluster D: Surfaces (P6 + P8 + A3 + P9)

Branch: `muse/r19-polish-surfaces` (base 95319bd7, Repair #19 final tip). No merge, no push.
FOUNDER_ACCEPTED=NO. All verdicts below are TRUE / HONESTLY ABSENT / FALSE per file evidence.
Served shell fact used throughout: `apps/opal_web/src/App.tsx` returns `<C2Shell />` unconditionally
(the R17 legacy shell `OpalApp` is not imported or mounted). Anything reachable only through
OpalApp / legacy destinations is marked LEGACY-ONLY, never "served".

## 1. WIP audit verdict (prior worker, killed by runtime restart)

The uncommitted WIP (15 modified files + 2 new test files) was audited line by line against the
full spec. Verdict: KEEP ALL of it - every change was correct and in-spec; nothing was discarded.
Two gaps were found and completed by this finisher (section 2 and section 5):

- WIP P6 landed on the files the spec named (`GroupInfoDestination.tsx`,
  `PersonMemoryView.tsx`, legacy `WhatOpalRemembersSection`), which are legacy-path only.
  The served C2 equivalents (person profile doorway + You > What Opal remembers section)
  carried no clarifying line; added here.
- WIP did not include the P9 external-invite landing trace outcome: the served shell dropped
  `?invite=CODE` entirely. The one missing capture link was wired here (section 5).

WIP inventory (all kept, all test-green):
- P6: `GroupInfoDestination.tsx` per-member button relabeled "Memory" -> "What Opal remembers"
  (+ `.group-info-member-memory` style, name ellipsis so the label never crushes the name);
  `PersonMemoryView.tsx` plain-language intro + section heading fix ("Knows about you" ->
  "What Opal knows about {name}"); legacy `YouSettingsDestination.tsx` WhatOpalRemembersSection
  provenance/control note.
- P8 search: `C2Shell.tsx` passes the shell's real loaded intentions (adopt1Data from
  `listIntentions`) into SearchDestination (the group previously could never render from the
  served mount); new Places group derived from the viewer's own plan locations (see section 4).
- P8 create: `C1ShellHosts.tsx` + `C1Surfaces.tsx` - the one people picker gains a call mode;
  Calls tab gets "+ New" (`calls-new-call`) which places a real conversation call.
- A3: `C2You.tsx` + `c2shell.css` connections redesign (section 3).
- Tests: `groupInfoMemoryClarity.test.tsx` (new), `searchCreateWiring.test.ts` (new), plus
  pins added in adopt3 / settingsArchitecture / r19CallsHost / WhatOpalRemembersSection /
  PersonMemoryView test files.

## 2. P6 - "What Opal remembers" clarity

Changes:
- `opalUi/GroupInfoDestination.tsx` (spec-named surface): per-member entry now reads the full
  destination name "What Opal remembers" (aria-label "What Opal remembers about {name}");
  the viewer's own row carries no entry; no entry renders when the host wires no handler.
  Test: `groupInfoMemoryClarity.test.tsx` (2 tests).
- `opalUi/intelligence/PersonMemoryView.tsx` (destination): one intro line under the header -
  "What Opal holds about {name} - from what you have told Opal and what came up in your chats
  and plans together. You control it: correct or remove any fact below."
- Served C2 path (finisher): `c2/shell/PersonProfile.tsx` - under the "What Opal remembers"
  doorway button, one quiet caption: "Your memory controls - what Opal keeps, and forgetting
  it." (Truth note: in C2 this doorway routes to the viewer's own memory-controls room,
  You > What Opal remembers - not a per-person record - and the caption says exactly that.)
  Pin: `legacyRecreation.test.tsx`.
- Served C2 destination (finisher): `c2/shell/shellData.ts` what-opal-remembers lede now
  "Facts Opal keeps from your chats and plans. You control them - forget any of them, for
  real." (provenance + control, one line, both load branches).
- Crew-level entry: HONESTLY ABSENT - no crew/group-level memory entry exists in either path.
  GroupInfo offers per-member entries only; PersonMemoryView is per-person only; the C2 memory
  rooms are the viewer's own. Nothing was painted to fill this.

## 3. A3 - Connections redesign (served: You > Connections, C2You `C2SettingsSection`)

Truth base unchanged: `shellData.ts` connections adapter maps the server settings/connections
projection 1:1 (status, status_label, status_detail, gate.reason_plain, last_verified_at,
powers). The redesign is presentation only - no status is re-derived, shortened, or repainted;
DOM status text is still the payload's `status_label` verbatim (pinned by
settingsArchitecture.test.tsx: the simulated Google row still reads "Simulated - not a real
connection", never "Connected").

Row model:
- AT A GLANCE (the row): provider name (row title) + verbatim status label + chevron. One idea
  per row. Category notes render as quiet uppercase group labels
  (`connection-category-<category>`), not body text inside the card.
- BEHIND THE ROW (tap opens `connection-detail-<id>`, one open at a time, aria-expanded /
  aria-controls wired): "What this powers" (payload subtitle), "Status" (payload detail),
  "What is holding it back" (gate reason, only when gated), and the last-checked line
  ("Last checked <date>" / "Never checked").
- The Google connect/disconnect descriptor still renders as its own real action row below the
  list (unchanged machinery).
- Files: `c2/shell/C2You.tsx` (row render + open-state), `c2/shell/c2shell.css`
  (`.c2s-connection*`, `.c2s-connection-cat` - token-built, both modes),
  `settingsArchitecture.test.tsx` updated with justification: the old assertion read the gate
  reason from the whole container text (it was on the row before); it now asserts the reason
  is NOT on the closed row, then taps the row and asserts it verbatim in the detail panel.
  No truth assertion was weakened.

## 4. P8 - Search + Create verification map

### Search (served: `c2/shell/C2Shell.tsx` SearchDestination)
- CONFIRMED: the legacy `opalUi/SearchDestination.tsx` fixture is NOT served. App.tsx mounts
  only C2Shell; the shell mounts its own SearchDestination export and never imports the legacy
  one. Pin: `searchCreateWiring.test.ts`.
- Entry reachability: REAL - Home header search icon (`c2-home-search`) and the Center
  opening search both call `setSearchOpen(true)` in the shell (C2Shell.tsx:731, :1296 area).
- Groups over the viewer's real data: Plans (title match -> tap opens the plan graph),
  Chats (title/preview match -> tap opens the thread via chatOpenRequest), People (real
  conversation peers -> tap opens that peer's chat), Intentions (the shell now passes its
  loaded adopt1Data intentions; group absent when none exist), Places (new, below).
- PLACES group: BUILT, truthfully derived - from the viewer's own plans' `location` in the
  plan contract only, with the same virtual guard the plan projection uses
  (`plan_type !== "virtual" && online !== true`); one row per distinct place; a tap opens the
  plan that carries it (`c2-search-group-places` / `c2-search-place`). No place directory is
  searched and no place is invented; a plan without a location contributes nothing. Venue/place
  search for new plans remains in the create-plan flow only, as before.
- People-hit routing assessment: person hits land on the chat ("Open your chat") - KEPT, no
  fix. Reason: the person profile (PersonProfileSheet) is owned by the thread host and opens
  from the open thread's header for that peer (C1ShellHosts onOpenProfile -> profileOpen), so
  the profile is truly reachable for that peer one tap after the chat opens; for group threads
  the sheet presents the conversation identity, not an individual peer, so a direct-to-profile
  route from a person hit is not well-defined. No dead end exists.
- Empty state: REAL - "No match in your plans, chats, people, places, or intentions."
  (`c2-search-no-match`, pinned). Empty query renders no groups.
- Time display (novelty record, section 6): plan rows show the contract's `time_label`
  verbatim, or "Time not set yet." when unset.

### Create (no unified create sheet exists - stated plainly)
There is NO single unified create sheet in the served build. Create lives in four real,
surface-local entries; each was verified to a real write:
- New plan / trip / idea: REAL - Graphs create sheet (`c2-graphs-create-sheet`: Plan / Trip /
  Idea) and Center "make something happen" both open the shell CreateFlow (`c2-create-flow`).
  Plan + idea write via `createGraphPlan` (entry "c2-plan" / "c2-idea"); trip via `createTrip`.
  On success the shell re-reads plans. Pins: `searchCreateWiring.test.ts`.
- New chat: REAL - Chats tab "+ New" (`chats-new-chat`) opens the C1 people picker
  (`c2-c1-people-picker`, mode "chat"); a tap opens the existing conversation or ensures the
  real direct conversation (`ensureDirectConversation`) then opens it. (The legacy
  `opalUi/NewChatPicker.tsx` is LEGACY-ONLY - not mounted by the served shell.)
- New call: REAL (built by WIP) - Calls tab "+ New" (`calls-new-call`) opens the same picker
  in call mode (`data-picker-mode="call"`, "Start a call"); a tap ensures the conversation if
  needed, then places the REAL call through the same `placeCall` path as the call log's Call
  button (`createConversationCall`), lands on the Calls tab, and the outcome note shows the
  server's status ("Calling {name} - ringing.") with the log re-read. Pin: r19CallsHost.test.tsx.
- New story / post: REAL - Home rail "Your story" cell (`c2-story-self`) opens the Share
  something sheet (`c2-create-sheet`: Story / Post) -> ShareComposer (`c2-share-composer`):
  real camera/library file inputs, `uploadSocialMomentMedia`, then `createTemporaryStory`
  (story) or `publishSocialMoment` (post, the R15/R16 persistence path); the C2 shell reaches
  it because C2Home is the shell's Home and `onShared` bumps homeNonce so Home re-reads.
  Failure keeps the draft with one error line. PARTIAL note: with a live story, the cell tap
  opens the story viewer (the rail's "Add more" is a caption, not a separate entry), so adding
  a second story while one is live is not reachable from the rail.
- Invite: REAL - Settings > Your invite code (payload code + share_url, redeem form wired to
  `redeemPersonalInviteCode` via C2Shell events) and plan detail Add people (real
  `journeyAddPeople` participant add over the people universe; see P9).

## 5. P9 - Journeys verification map

### (1) New post, end to end
create (Home rail -> Share something -> Post) -> compose (ShareComposer: media required,
caption optional, audience line "Friends") -> publish (`uploadSocialMomentMedia` ->
`publishSocialMoment` POST /api/v1/product/social-moments) -> present in the world: REAL via
two read-backs - Home feed re-read (`fetchHomeFeed` moments become memory cards; the W9/B-11
composition reads back what was actually posted) and You > Your moments archive
(`fetchMomentsArchive` GET /social-moments/mine, adopt3 MomentsArchive). -> share (onward):
HONESTLY ABSENT - the C2 feed memory card carries no share/repost/like/comment actions;
client functions for like/comment/repost exist in productClient but no C2 surface mounts
them, so nothing is painted. The publish action itself is the share ("Share post").

### (2) Sharing family
- Share a plan: REAL - Graphs plan detail -> Share -> SharePlanSheet (EventShareCard built by
  the one adapter `shareCardFromDetail` from the plan's real detail projection). The sheet's
  one action is Copy details.
- COPY actions - each verified to write the real value:
  - Plan share Copy details: writes `card.textLines.join("\n")` - exactly the lines the card
    shows (title, state label, when, where, attendance, people) plus nothing else; NO URL is
    ever fabricated (the plan contract carries no share code). Pinned exactly:
    legacyRecreation.test.tsx asserts textLines equality and no-URL.
  - Conversation share Copy details: thread overflow -> Share -> ConversationShareSheet;
    writes its card's textLines (title, anchor line, anchor plan lines, privacy line); no URL,
    no message content, no navigator.share. Pinned: r19FixB.test.tsx BS-11 (asserts the copied
    string content line by line).
  - Invite link Copy: BUILT here - Settings > Your invite code previously displayed code +
    share_url as text with NO copy action. Added "Copy invite link" (`c2-invite-copy-link`)
    writing the payload's own share_url verbatim (never reconstructed), with the share sheets'
    copied/unavailable note pattern. Pin: adopt2Settings.test.tsx C4 asserts writeText called
    with the exact payload share_url.
  - Copy dates: no standalone copy-dates action exists in the served build; the date/time
    travels inside the plan card's copied lines (whenLine). Stated plainly.
  - Legacy-only copy surfaces (NOT served): ForwardSharePicker, FindPeopleFlow,
    YouSettingsDestination invite copy - OpalApp path only.
- EDIT something shared: PARTIAL - C2 plan detail edits that exist propagate truthfully
  because every one re-reads the server before re-rendering: convert place type
  (`convertPlanPlaceType`; a shared plan returns applied:false with a proposed revision and
  the UI says exactly that - it never claims the move happened), Add people (re-reads detail
  history + plans), share/stop my location, food actions (`refreshDetailFromServer`).
  Text edit of a shared plan's title/time/place is HONESTLY ABSENT in the served C2 detail:
  `patchOpalPlan` exists in the client and is mounted only by the legacy GraphDetailSheet /
  PlanEditControls. No C2 surface offers it; declared, not painted.
- Share INSIDE Opal: REAL - Add people on a plan (real recipients from the people universe,
  `journeyAddPeople`, lead-gated server-side, refusal stays as a plain line in the sheet);
  plan/chat shares above stay inside the app until the user pastes the copied text.
- Share EXTERNALLY: PARTIAL, one link FIXED here - what a no-Opal recipient actually reaches:
  the personal-code share_url ({origin}/?invite=CODE, as displayed from the payload). Before:
  they landed on the served C2Shell, which never read `?invite` anywhere (the capture +
  validate + join machinery lived only in the unmounted OpalApp), so the code was silently
  dropped; the connection could only happen if they later typed the code into Settings >
  Your invite code redeem. Now: C2Shell captures a product-shaped `?invite=` code on mount
  into the same store `verifyChallenge` already reads (`storeProductInviteCode`), and C2
  onboarding's verify sends it with activation, so the server joins the pair at sign-up.
  Capture only - nothing is validated, joined, or painted by the capture itself
  (pin: searchCreateWiring.test.ts). Remaining PARTIAL: an already-signed-in recipient
  opening the link does not auto-join in the served build (that post-auth join effect is
  legacy-only); the manual redeem path in Settings is REAL for them.
- Incentive terms: FOUNDER-GATED - no incentive/reward terms copy was built anywhere in these
  flows (the invite section's payload copy promises the connection only). The commercial model
  is a founder decision; declared gated, per instructions.

## 6. Novelty mandate record (per pattern: alternatives, pick, reason)

- INVITATIONS. Alternatives considered: (a) floor - static code + copy-link + redeem (current
  product truth); (b) Opal-native living invitation - an invitation rendered as a small
  plan-like card whose ambient state cools as it ages toward expiry (the density cluster owns
  this exploration); (c) invitation folded into the plan share card's copied text.
  Pick: (a) for this cluster, deliberately non-foreclosing on (b): nothing in these surfaces
  strips age/expiry - the per-recipient `ProductInvite` client contract keeps `expires_at` and
  `inserted_at` untouched, and no projection built or touched here drops them. The served
  personal-code contract itself carries NO age/expiry fields (code, share_url, joined_count,
  promise only), so there is nothing truthful to surface for the personal code today -
  declared absent rather than fabricated. (c) rejected: the plan card's law is that its copied
  text is exactly what the card shows; smuggling an invite into it would break that law.
  Reason: quiet + truthful beats novel-but-invented; the cooling design needs the density
  cluster's state language, not a one-off here.
- TIME DISPLAY in search/create. Alternatives: (a) floor - the contract's `time_label`
  rendered verbatim (search rows; "Time not set yet." when unset), free-text When field in
  CreateFlow stored as `time_label`; (b) Opal-native relative time derived on the client
  ("in 3 days", "this Saturday") - REJECTED: the front end would re-derive state from a
  free-text label, violating the one-projection law and risking FALSE readings; (c) structured
  date/time picker replacing the free-text When - REJECTED for this cluster: the contract
  stores `time_label` as the plan's own words, and swapping the input model is a contract
  change beyond these surfaces. Pick: (a). Reason: the label is the server's finished string;
  surfaces render outputs, they do not recompute them.

## 7. Builds, tests, floors

- Build: `npm run build` (vite) - PASS (chunk-size warning only, pre-existing).
- Typecheck: `tsc --noEmit` - exactly 9 errors, all pre-existing in untouched files
  (OpalApp.tsx x3, productClient.ts x5, YouSettingsDestination.tsx x1). Floor held (9).
- Touched suites (this cluster): 10 test files, 75 tests - ALL PASS (run twice, including after the final edit).
- Full web suite: Test Files 23 failed | 137 passed (160); Tests 15 failed | 1024 passed (1039). The failing set did NOT grow (floor 23 files / 16 tests; failures are in untouched areas - e.g. settingsWireDrift, angleFloor). None of this cluster's touched files appear in the failing set. (floor: failing set 23 files / 16 tests must
  not grow).

## 8. FRAME LIST (re-shots named; both modes - dark and light - for every frame)

Reach instructions are precise; testids are the on-screen anchors.
- search-empty: Home -> search icon (top right, `c2-home-search`) -> SearchDestination
  (`c2-search`) with no query typed.
- search-results: same, type a term matching a plan, a person, and a plan location - groups
  Plans / Chats / People / Places / Intentions render (`c2-search-group-*`).
- search-no-match: same, type "zzz-no-match" -> `c2-search-no-match` line naming all five groups.
- create-plan / create-trip / create-idea: Graphs tab -> create (`c2-graphs-create-sheet`) ->
  Plan / Trip / Idea -> CreateFlow form (`c2-create-flow`, title/when/place fields).
- create-chat: Chats tab -> "+ New" (`chats-new-chat`) -> people picker
  (`c2-c1-people-picker`, `data-picker-mode="chat"`, title "Start a chat").
- create-call: Chats tab -> Calls segment (`chats-segment-calls`) -> "+ New"
  (`calls-new-call`) -> picker (`data-picker-mode="call"`, title "Start a call"); after picking
  a person, the Calls tab outcome note (`c2-calls-note`).
- create-story / create-post: Home -> "Your story" cell (`c2-story-self`) -> Share something
  sheet (`c2-create-sheet`) -> Story / Post -> composer (`c2-share-composer`).
- share-plan: Graphs -> open a plan -> Share -> sheet (`r19-share-sheet`, card
  `r19-event-share-card`, Copy `r19-share-copy`, note `r19-share-note` after tapping Copy).
- share-chat: Center -> open a thread -> overflow -> Share -> sheet
  (`conversation-share-sheet`, Copy `conversation-share-copy`).
- share-invite: You -> Your invite code -> code row + Copy invite link (`c2-invite-copy-link`,
  note `c2-invite-copy-note` after tapping) + redeem form (`c2-redeem-form`).
- settings-connections (re-shots): You -> Connections - (1) list at rest: quiet rows, name +
  verbatim status + chevron, category labels (`connection-category-*`); (2) one row tapped:
  detail panel open (`connection-detail-<id>`) showing What this powers / Status / What is
  holding it back / last checked; capture one working, one gated (Twilio), and the simulated
  Google row in both modes.

## 9. Honest absences + gating declarations (summary)

- Legacy fixture search (`opalUi/SearchDestination.tsx`) is NOT served - confirmed.
- No unified create sheet exists - create is four surface-local real entries (above).
- Crew-level memory entry: ABSENT in both paths.
- Onward share/repost/like/comment of a published post on C2 Home: ABSENT (client fns exist,
  unmounted).
- Shared-plan title/time/place text edit in C2 detail: ABSENT (legacy-only mount).
- Standalone copy-dates action: ABSENT (dates travel inside the plan card text).
- Already-signed-in invite-link auto-join: ABSENT in served build (manual redeem REAL).
- Personal-code age/expiry: contract carries none - nothing to display; ProductInvite
  age/expiry fields preserved untouched for the density cluster's cooling exploration.
- Adding a second story while one is live, from the rail: NOT REACHABLE (viewer opens instead).
- Incentive terms for invites/sharing: FOUNDER-GATED - no terms copy built anywhere.
- No pack captures were taken (per instructions); no ledger edits.

---

# ADDENDUM - Founder screen notes of 2026-10-19 (17:50-17:51 PDT): N2, N6, N7 + Connections naming fix

Second commit on `muse/r19-polish-surfaces`: `505b46ea` (on top of
`13eb802a`). N8 honored: Appearance, Location & Travel, and Privacy rooms
untouched (Privacy received only a one-line copy correction where it
named the retired room - see naming map).

## A. Connections clarity - the naming collision, fixed

Founder definition (binding): CONNECTIONS = third-party tools and apps
plugging into Opal the way MCP tools plug into Meta Muse, so Opal can use
and harmonize their data. The served Settings had TWO near-identical rooms:
"Connections" (the all-provider catalog) and "Connected sources" (a
Google-Calendar-only room). There is now exactly ONE Connections room.

### Before / after naming map

| Before | After | Why it cannot be confused now |
| --- | --- | --- |
| Connections (catalog of providers, `connections`) | **Connections** - subtitle "Apps and tools plugged into Opal, with their real status" | Unchanged name, now the ONLY room of its kind; the subtitle states the MCP-shaped definition in plain words. |
| Connected sources (Google Calendar only, `connected-sources`) | **RETIRED as a room.** Its content (Google Calendar status + connect/disconnect) already lived inside the Connections catalog's Google row and actions; the standalone room is deleted from the hub, the section builder, and the Privacy room's nav. The old key is aliased in `buildSettingsSection`: any stored/deep-linked `connected-sources` request lands on Connections. | There is no second name to confuse. One room, one name, for everything plugged into Opal. |
| What Opal graphs (ingestion feeds: your chats, calls, texts, in-room, meetings - `what-opal-hears`) | **Where Opal reads from** - subtitle "Your chats, calls, and texts - each with its own state"; the room's lede adds: "This is not Connections: nothing here is a tool plugged into Opal." | "Where ... reads from" describes a source of data in the user's own words; it shares no words with Connections, and it breaks the "What Opal hears / What Opal remembers" family resemblance that made three rooms sound alike. The hub group above it is now "Feeds and tools" (was "What Opal graphs"). |
| Hub group "Care and account" | **Account** | Care withdrawn (N6 below); the group name follows the content. |
| Privacy room line: "...lives in Connected sources and Connections..." + nav row "Connected sources" | "...The apps and tools plugged into Opal live in Connections..." + nav row "Connections" -> `connections` | Privacy is N8-protected and was NOT redesigned; this is a factual correction only - the old sentence named a retired room. |
| Hub header summary: "Connected sources are checked when you open them." | "Your connections are checked when you open them." | Same reason: the retired name no longer appears anywhere in served copy. |

Notes:
- The room key `what-opal-hears` is unchanged (internal key, not a name);
  deep links and stored state keep working.
- Legacy lineage (`opalUi/YouSettingsDestination.tsx`, its
  `connectedSources.test.tsx`, `settingsWireClass.ts`) still carries the
  old names - it is NOT the served Settings (same status as the legacy
  search fixture in P8) and was left untouched per cluster discipline.
- Tests: the FR-18-09 "connected-sources paints simulated" test is replaced
  by a one-room pin: `buildSettingsSection("connected-sources")` returns the
  Connections section (key `connections`, connection rows, no "Connected
  sources" anywhere in the rows); hub index has exactly one `connections`
  entry and no `connected-sources` entry. The simulated-Google truth itself
  remains pinned by the Connections payload test (DOM == payload verbatim).
  The ingestion-room test was retitled and now asserts the new title and
  the absence of the old one; its per-source honest-state assertions are
  unchanged.

## B. N6 - Care & household room withdrawn (surface removal only)

- Hub: the `care` inventory row is deleted from `youHubFromSession`;
  `HUB_GROUPS` no longer lists it ("Account" group remains).
- Mount: `C2Shell` no longer imports or renders `CareDestination`; the
  section-load skip for "care" is removed, so a stray `care` key falls to
  the generic section path, whose honest answer is "That section is not
  part of this build."
- Preserved untouched: `CareDestination.tsx`, `CareRotationView`, the
  client care reads/writes, and every backend care path (B3/B45 lineage).
  Nothing about the machinery changed; only its Settings doorway is gone.
- Tests: the findability registry (`SECTION_KEYS`) no longer expects
  `care`; a new pin asserts the hub has no care row and renders no
  "Care and household" text, AND that `CareDestination.tsx` still exists
  with its content while `C2Shell.tsx` neither imports nor mounts it.

## C. N2 - Your Moments clarity pass

Founder verdict: the room "doesn't tell me anything" ("Story / Live now",
mute; unclear whether editable). The machinery survey found real support:
posts support owner edit (caption + visibility) and delete; stories
support owner delete only (no story edit exists anywhere).

What the room now says and does (`c2/shell/adopt3.tsx` `MomentsArchive`):
- A lede above the list, always visible: "Moments are the posts and
  stories you have shared in Opal, and they are yours. A post stays until
  you delete it. A story is temporary - it ends on its own within a day.
  Open one to see who can see it, change it, or delete it."
- Every card's one line now answers "what is this": kind + audience +
  lifetime/date, each part from the record itself - e.g. "Post - Friends -
  Oct 18", "Story - live until Oct 19, 11:00 AM - Your close circle".
  "Live now" survives only as the fallback when a story record carries
  no expiry (the archive read only returns live stories).
- Opening a moment (new `MomentDetail`) shows: the meta line, the shared
  date, for stories the exact end time, and "Who can see it: ..." in
  plain words from the record's own visibility.
- Real manage affordances (new client fns `updateSocialMoment`,
  `deleteSocialMoment`, `deleteTemporaryStory`):
  - Post: caption edit (PATCH, owner-only server-side); audience change
    between the two self-contained audiences (Friends / Only you) via
    the same PATCH. Group / specific-people audiences are shown with
    "That audience was set when you shared it." and are NOT silently
    re-scoped; delete behind a two-step arm ("Delete for good?").
  - Story: the surface says in words "Stories can't be edited. If you
    need a change, delete this one and share a new one." Delete is real
    (DELETE /stories/:id, armed first).
  - Every success re-reads the archive projection; nothing is painted
    locally. Failures show an honest error line and change nothing.
- Novelty record (per the mandate): alternatives considered - (1) an
  inline swipe/long-press action row on each card; (2) a timeline
  grouped by day with expiring stories pinned in a "ending soon" band.
  Pick: neither - the tap-to-open detail with the full sentence of
  facts. Reason: the founder's complaint was illegibility, not missing
  gestures; a hidden gesture keeps the room mute for a first-time user,
  and day-grouping adds chrome without adding truth. The current shape
  CAN be made legible (the founder's fallback condition), so it was kept
  and made to speak.

## D. N7 - What Opal remembers: manual add + delete, timestamped, honestly protected

Built on the memory machinery that exists today (the Memory Wallet
capsule store), per the spec's "build what is TRUE" rule:

- MANUAL ADD - REAL. The served Memory room (`C2You` `C2SettingsSection`,
  key `memory`) now carries an add form ("Tell Opal something to
  remember... Remember this"). Submit calls the new client fn
  `createMemoryCapsule` -> `POST /api/v1/product/memory-wallet/capsules`
  (owner = the session's user; there is no parameter that names another
  account). The server stamps provenance "You told Opal" and the stored
  date; the shell then re-reads the section, so the new entry appears
  from the wallet projection with its provenance and "Saved {date}" -
  the read-back is the proof, asserted by test.
- DELETE - REAL (pre-existing, kept). Capsule forget is the wallet's
  owner-scoped DELETE behind the shell's two-step confirm; the facts
  room's forget is the transparency DELETE. Both remove the record
  everywhere it surfaces (one store per kind).
- TIMESTAMP + PROVENANCE - REAL for capsules (contract carries
  `created_at` + provenance label on every row). For the short-form
  FACTS room, the transparency contract carries neither a date nor a
  source per fact - declared, not painted: the room now states "These
  facts are the short form - Opal picked them up from your chats and
  plans, and you can only forget them here, not add to them. The fuller
  form lives in Memory..." with a nav row into Memory. Exposing fact
  timestamps/provenance needs a backend contract change (the underlying
  record has `inserted_at`; the transparency projection does not carry
  it) - recorded here as the blocker, out of this web cluster's scope.
- PASSWORD CHECK - HONESTLY ABSENT, declared in the room's own copy.
  Opal accounts have no password: sign-in is a phone code
  (`startChallenge`/`verifyChallenge`), and no step-up re-auth endpoint
  exists; the graph passcode is a different credential for private
  graphs and may be unset, so checking it would be theater. Per the
  spec's own rule, no password prompt is painted. The Memory room
  carries the truth as a note row: "Adding and forgetting here happen
  only while you are signed in, and forgetting always asks you to
  confirm first. There is no separate password check for memory yet:
  Opal signs you in with a code sent to your phone, and your account
  has no password to check against." The blocker: a real step-up
  re-auth (fresh phone-code challenge scoped to memory changes) is a
  backend build; until it exists, this leg stays declared-absent.
- UNAUTHENTICATED CHANGE REFUSED: the client fns require the session
  bearer; the shell's `addMemory` throws before any request when there
  is no bearer; the wallet routes sit in the authenticated pipeline and
  are owner-scoped server-side (401 / not-yours without a session). The
  unwired-host case is pinned by test: no event -> honest error line,
  zero create calls.
- Long-form = capsules: the facts-room copy above names the direction
  ("As the memory wallet is built, these facts move into that fuller
  form") for the integrator's wallet gap register.

## E. Frame list additions (both modes - dark and light - for every frame)

- your-moments (re-shot): You -> Your moments - (1) list at rest: lede +
  cards reading "Post - Friends - Oct 18" / "Story - live until ... -
  Your close circle" (`c2-archive-lede`, `c2-archive-item`); (2) a post
  opened (`c2-archive-detail`): audience line, caption field
  (`c2-archive-caption-input`), Friends / Only you segmented control,
  Delete armed state (`c2-archive-delete-confirm`); (3) a story opened:
  the "Stories can't be edited" line (`c2-archive-story-note`) + its
  ends-at line.
- settings-connections (re-shot, supersedes the earlier entry): You ->
  Connections - one room only; hub shows NO "Connected sources" row
  anywhere (capture the hub group "Feeds and tools" with exactly two
  rows: Where Opal reads from, Connections).
- settings-reads-from (new): You -> Where Opal reads from - per-source
  honest states under the new name, lede carrying the "This is not
  Connections" sentence (bearer path).
- settings-memory-add (new): You -> Memory - the add form
  (`c2-memory-add-form`, input `c2-memory-add-input`, submit
  `c2-memory-add-submit`), the protection note row, and after a save the
  new capsule row at the top with "You told Opal - Saved {today}".
- settings-hub-account (new): You hub scrolled to the "Account" group -
  no Care row anywhere on the hub.

## F. Amendment verification

- Typecheck: exactly 9 (floor held; same pre-existing set).
- Build: `vite build` PASS.
- Touched suites: settingsArchitecture (21 tests), adopt3 (15),
  memoryAdd (3, new), adopt2Settings, harmony2 (13), smSoulMemory,
  r19CallsHost, searchCreateWiring, legacyRecreation - ALL PASS.
- Full web suite: Test Files 23 failed | 138 passed (161); Tests 16
  failed | 1053 passed (1069). EXACTLY the floor (23 files / 16
  tests) - not grown. Every failing file is in untouched baseline
  areas (opalUi legacy exact/authority sets, activation, availability,
  designTokens, onboarding firstRun, theme technicolor); no file this
  cluster touched appears in the failing set.
- Suite-count note: the suite grew from 160 to 161 files / 1069 tests
  because of the new memoryAdd.test.tsx and the added N2/N6/N7 tests
  in existing files.
