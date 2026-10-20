# Repair #19 - Founder Polish Wave - A4 ASSET ACCOUNTABILITY TABLE (DRAFT)

DRAFTER'S DRAFT ONLY - for the integrator's verification. This file edits
no ledger, no code, and no pack. Every status below is taken from the
cluster reports, the wave status file, the R19 complaint ledger and walk
acceptance, the R18 wallet map, and - for the integrated Settings hub
shape only - the integrated tree at `~/workspace/opal-graph/wt-polish`
(`apps/opal_web/src/c2/shell/C2You.tsx` HUB_GROUPS +
`shellData.ts` hub index). Where a report does not disposition an asset,
the row is marked UNVERIFIED-BY-DRAFTER and names the exact file or
suite the integrator should check. Nothing here is guessed.

FOUNDER_ACCEPTED = NO.

Status vocabulary (standing): TRUE = real end to end on the evidence
cited - HONESTLY ABSENT = not there, and nothing paints it as there -
FALSE = a surface claims or implies what is not true. A row whose
evidence is test/code-level only, with rendered frames still owed to
the integrator's pack, says so in its own row; the status word is the
cluster report's, the proof level is stated beside it.

"Questions asked about it" = the founder questions, notes, rulings, or
ledger rows on record for that asset in the sources read. "None on
record" means no founder question about that asset appears in the
polish reports, the R19 ledger, or WALK_ACCEPTANCE - it is a statement
about the record, not about the asset.

---

## PART 1 - THE SETTINGS FAMILY (served hub, integrated build)

Hub shape on the integrated tree: 21 rooms in 6 groups (You / How Opal
works for you / How Opal helps / Feeds and tools / Quiet and privacy /
Account), plus 2 sub-rooms reached through Help & support (Report a
problem, Submit feedback), plus 2 rooms removed in this wave (rows
S-24, S-25). Pack-v2's settings frames predate the polish wave (they
still show the retired Connected sources room and the withdrawn Care
room); every polish-changed room carries a re-shot frame in its
cluster's frame list, owed to the integrator's pack.

| # | Asset (room) | Connects to | User experience it produces | Status | Questions asked about it |
|---|---|---|---|---|---|
| S-01 | Edit profile | Session profile contract (name / username rows in `shellData.buildSettingsSection("edit-profile")`; save path via shell session) | Change your name and username; the hub header and profile surfaces re-read the same facts | TRUE (pack-v2 settings-edit-profile pair; R19) | None on record |
| S-02 | Appearance | Front-end only: mode preference (`setModePreference` system / light / dark) + Reduce motion row; no backend contract | Pick your light; the whole shell re-renders in the chosen mode; mode stamping on the plain entry proven (F7 chain, functional-accountability) | TRUE | N8-protected: named in the founder screen notes as a room NOT to redesign in the polish wave (polish-surfaces addendum, N8 honored) |
| S-03 | Your moments | Backend: moments archive read (`fetchMomentsArchive`, GET /social-moments/mine) + post/story manage writes (`updateSocialMoment`, `deleteSocialMoment`, `deleteTemporaryStory` - polish wave) | Your posts and stories, kept; after N2, every card says what it is (kind - audience - lifetime/date), opening one shows who can see it, and a post's caption/audience can be changed and any moment deleted for real | TRUE (N2 rebuilt the room's legibility; frames owed: polish-surfaces addendum E, your-moments re-shots) | N2 (2026-10-19 17:50 PDT): the room "doesn't tell me anything" - "Story / Live now" mute, unclear whether editable |
| S-04 | Your library | Backend contract by name UNVERIFIED-BY-DRAFTER - check `shellData.ts` `buildSettingsSection("your-library")` and `settingsArchitecture.test.tsx` for the artifacts/media read it renders | "Made by Opal, and your media" - the library of artifacts and media Opal holds for you | UNVERIFIED-BY-DRAFTER (room exists in hub index and pack-v2 settings-your-library pair; no polish cluster dispositioned its contract) - integrator check: `shellData.ts` your-library section builder + `adopt3` library tests | None on record |
| S-05 | Soul | Backend: Soul record - PATCH quiet hours + timezone, GET read-back identical (functional-accountability J8, PROVEN); consumers are the one QuietHours resolver (push, check-in suggestion, follow-through) | How Opal is with you: how forward Opal may be, quiet hours (real On/Off, JA-07), home time zone, proactive-notes daily cap, done-notifications. Flipping the toggle changes the sentence and the resolver's behavior at the same instant | TRUE | W5-11: Soul/Memory rooms showed raw values and unlabeled controls. Founder settings sharpening 2026-10-18 23:34 PDT (soul-report s6 dispositions) |
| S-06 | Memory | Backend: Memory Wallet - capsule list (GET /memory-wallet), capsule create (POST /memory-wallet/capsules, N7), capsule forget (owner DELETE, two-step confirm); call-graphing standing control (PATCH /relationship-access/graphing, J8 PROVEN: decide flips with the record) | What Opal holds for you: capsules with provenance ("You told Opal") and "Saved {date}", manual add (N7), forget for real, and the standing call-graphing permission (mode + pause-all) the in-call default obeys | TRUE for capsules + graphing control. Step-up password check for memory changes: HONESTLY ABSENT, declared in the room's own copy (see P9 draft; blocker: no step-up re-auth endpoint exists - accounts sign in by phone code) | W5-11 (raw values); W5-16 (graphing light / per-call pause control); N7 (2026-10-19): manual add + delete, timestamped, password-protected - password leg declared absent, above |
| S-07 | What Opal remembers | Backend: transparency facts read + forget DELETE (facts room); manual add lives in Memory (S-06), not here. Fact timestamps/provenance: the transparency contract carries neither - declared in the room, not painted (polish-surfaces addendum D) | Facts Opal keeps, in the short form, each forgettable for real; the room now says plainly that these facts carry no date/source here and that the fuller form lives in Memory | TRUE for list + forget; timestamp/provenance per fact HONESTLY ABSENT (backend contract change is the named blocker) | P6: "What Opal remembers" clarity - provenance + control in one line, on the served path (polish-surfaces s2). N7 (timestamped leg, above) |
| S-08 | How Opal helps | Backend: proactivity / Soul forwardness record (same Soul leg as S-05) + nav into Opal Assist and calls (S-09) and Quiet (S-13) | How forward Opal may be, in one room: the forwardness choice, with doorways to the call-assist and quiet controls it governs | TRUE (pack-v2 settings-how-opal-helps pair; section rows in shellData) | None on record beyond the settings-sharpening round (soul-report s6) |
| S-09 | Opal Assist and calls (calls-assist) | Backend: relationship-access graphing policy (call_mode ask/never + global pause - J8 consumer-proven) + the Opal Assist on-calls switch (shared `.you-settings-toggle`) | Allow Assist on future calls, or never; the in-call surface's default respects this record; the switch itself now answers in light (N5: canon happening-cyan when on, settled when off) | TRUE | W5-16 (per-call pause + graphing light); N5 (toggle ambience - founder screen note, audited in polish-ambient appendix) |
| S-10 | Activity (approvals-activity) | Backend: account-activity / audit projection rendered as rows from the settings projection (shellData approvals-activity section). Per-row period dates: NOT carried by the projection (density report s3) | "What Opal did for you, written down" - the account's activity trail as a row list | TRUE as a row list. Archive collapse: HONESTLY ABSENT - the projection carries no period date per row, so the pill grammar cannot be applied truthfully from it (density declaration, Part 3) | W5-24 totality (capabilities silently missing); WALLET_MAP HF-GAP-4: the audit ledger's human form is this room's lineage - the full Opal's Home activity trail remains unbuilt (see P-18) |
| S-11 | Where Opal reads from (key: what-opal-hears; renamed in this wave) | Mixed, per source row, stated on each row itself: Chats in the app - the live conversation store ("Working now"); Phone calls - "Not wired yet" (no live transcription here); Texts - "Waiting on a sending number"; In the room - "Not in Opal today"; Meetings - "Not wired yet". Retry rows re-try that source only (shellData hears section) | Each ingestion feed with its own honest state; the lede now states "This is not Connections: nothing here is a tool plugged into Opal." | TRUE as an honest-state room: 1 of 5 sources live (in-app chats), 4 HONESTLY ABSENT legs, each named on its own row - no source is painted live that is not | Connections-clarity ruling (2026-10-19): the founder's definition - Connections = third-party tools plugged into Opal, MCP-shaped; this room's old name ("What Opal graphs" / "What Opal hears") collided with it and with What Opal remembers (polish-surfaces addendum A) |
| S-12 | Connections | Backend: settings/connections projection, mapped 1:1 (status, status_label verbatim, status_detail, gate reason, last_verified_at, powers - polish-surfaces s3); Google connect/disconnect action row is the real machinery | Apps and tools plugged into Opal, with their real status: at a glance, name + verbatim status; tap a row for What this powers / Status / What is holding it back / Last checked. A simulated provider reads "Simulated - not a real connection", never "Connected" | TRUE | A3 (connections redesign) + the connections-clarity ruling: founder definition above; the pack-review complaint that two near-identical rooms (Connections vs Connected sources) could not be told apart |
| S-13 | Quiet (notifications) | Backend: notification preference rows + quiet-hours doorway into Soul (shellData notifications section: Pause everything, Messages and calls, Read receipts rows) | Notifications, and your peace: pause everything, per-class alert choices, read receipts; your quiet hours live one tap away in Soul | TRUE (pack-v2 settings-notifications pair) | None on record |
| S-14 | Privacy | Mixed: plain-words privacy copy + nav rows (What Opal remembers, Connections) + published-document rows (Privacy Policy, Terms of Service). Per-control backend contracts UNVERIFIED-BY-DRAFTER beyond the nav/copy legs - check `shellData.ts` `buildSettingsSection("privacy")` | You choose who sees what: the room states where each class of control actually lives and routes there; it received exactly one factual copy correction in this wave (it named the retired Connected sources room) and was otherwise NOT redesigned | TRUE for copy/nav legs; UNVERIFIED-BY-DRAFTER for any control rows beyond them - integrator check: shellData privacy section + settingsArchitecture privacy pins | N8-protected: NOT to be redesigned in the polish wave (one-line factual correction only, polish-surfaces addendum A) |
| S-15 | Linked devices | Backend: device/session list (device_label, last_seen, is_current) + per-device sign-out action ("Ends that session on its next request") | Where you are signed in; sign a device out and its session ends | TRUE (pack-v2 settings-linked-devices pair; shellData linked-devices section) | None on record |
| S-16 | Location and travel | Backend: timezone record (home timezone value) + Travel mode toggle + "use this device timezone as home" row (shellData location-travel section) | Timing that follows you: home timezone, travel mode; leave-by and plan timing read this truth | TRUE (pack-v2 pair). Distance/current-position writer: HONESTLY ABSENT everywhere (BS-06 - no writer exists; nothing fakes a distance) | N8-protected: NOT redesigned in this wave. W5-10/BS-06: locations on graph detail must never be faked |
| S-17 | Account and security | Front-end doorway room: nav rows to Linked devices, Saved logins, Help & support, Delete my data or account (shellData account-security section) | Your account, your call - one doorway to the four account destinations | TRUE as a doorway (it connects to the four rooms named; it holds no controls of its own) | None on record |
| S-18 | Saved logins | Backend: saved-login list by site/host + tap-to-remove (shellData saved-logins section renders login.host rows) | Logins Opal keeps for you, by site only - site names, never credentials on the glass | TRUE at the list/remove level on pack-v2 evidence (settings-saved-logins pair); the underlying credential-store contract name is UNVERIFIED-BY-DRAFTER - integrator check: `shellData.ts` saved-logins section builder for the read/write contract it calls | None on record |
| S-19 | Your invite code | Backend: personal-code payload (code + share_url + joined_count, verbatim) + redeem write (`redeemPersonalInviteCode`) + Copy invite link (built this wave, writes the payload's own share_url, never a reconstruction) | Share it - anyone who joins is connected with you; copy the link, or redeem someone else's code in the form below | TRUE. Incentive/reward TERMS for inviting: HONESTLY ABSENT, founder-gated (no terms copy built anywhere - polish-surfaces s5) | Sharing-family verification (P9 journeys, polish-surfaces s5): what does a no-Opal recipient actually reach? (Answer on record: the link used to drop the code silently; the capture leg is now wired - see P-16 row and P9 draft) |
| S-20 | Delete my data or account | Backend: deletion execution (`executeDeletion` mode data/account, returns a reference) behind the armed two-step flow (pack-v2 settings-delete-account + -armed pairs) | Your call, with exactly what goes named: choose data or account, arm it, execute; a reference comes back | TRUE (pack-v2 frames incl. the armed state, both modes) | None on record |
| S-21 | Help & support | Front-end doorway room: nav rows to Report a problem (S-22) and Submit feedback (S-23) | Report a problem, send feedback - one doorway, two destinations | TRUE as a doorway | None on record |
| S-22 | Report a problem (sub-room, via S-21) | Submission path UNVERIFIED-BY-DRAFTER - the room renders problem categories (Something is broken / Opal got something wrong / Hard to use / My account / Payments / Something else, C2You.tsx); whether a submission reaches a backend contract is not dispositioned in any report read - integrator check: `C2Shell.tsx` report-problem event wiring + `shellData.ts` report-problem section | Tell Opal what went wrong, by category | UNVERIFIED-BY-DRAFTER (room + categories verified in the integrated tree; the write leg is not) | None on record |
| S-23 | Submit feedback (sub-room, via S-21) | Submission path UNVERIFIED-BY-DRAFTER - same check as S-22: `C2Shell.tsx` submit-feedback wiring + `shellData.ts` submit-feedback section | Ideas and wishes, "read by a person" | UNVERIFIED-BY-DRAFTER (room verified in the hub index; the write leg is not dispositioned in any report read) | None on record |
| S-24 | Connected sources (RETIRED in this wave) | Was: a Google-Calendar-only room duplicating the Connections catalog's Google row. Now: deleted from the hub, the section builder, and Privacy's nav; the old key is aliased - any stored/deep-linked `connected-sources` request lands on Connections (S-12) | Nothing - the room no longer exists, by design; its content lives inside Connections | HONESTLY ABSENT (retired, with the alias preserving deep links; pinned by settingsArchitecture one-room test) | Connections-clarity ruling (above, S-11/S-12) - two near-identical rooms was the complaint |
| S-25 | Care & household (WITHDRAWN in this wave, N6) | Was: care rotations + household pods via careClient (B3/B45 lineage). Now: no hub row, no mount in C2Shell; a stray `care` key gets the honest "That section is not part of this build." The machinery - CareDestination.tsx, CareRotationView, the care client, every backend care path - is preserved untouched in code | Nothing in Settings - the doorway is gone; the machinery is not deleted | HONESTLY ABSENT as a surface (surface removal only, pinned: hub has no care row AND CareDestination.tsx still exists unmounted) | N6 (2026-10-19): Care & household room withdrawn from Settings |

Settings questions the reports leave open for the founder (not
drafter-invented): the rulebook questions in polish-ambient-report.md ("Rulebook
questions (NOT shipped - founder's call)"; the step-up re-auth blocker
(S-06); incentive terms (S-19).

---

## PART 2 - PRIMARY SCREENS

| # | Asset | Connects to | User experience it produces | Status | Questions asked about it |
|---|---|---|---|---|---|
| P-01 | Home / social | Backend: plans contract (/opal/plans) for plan cards + home feed read for moments (fetchHomeFeed); media through AuthedImage (bearer path, F1 chain PROVEN); presence weight + density stamps from the one density.ts derivation via shellData | A social room: story rail, live presence, a capped ranked river of plan cards and moments with real photography, state borders that mean the plan's state, and (polish wave) the ring-metal room light at the head of the scroll - presence only, no state | TRUE (pack-v2 home pair, 10/10 images loaded both modes post-F1; W5-02 GREEN at W21). Live host/viewer surface: HONESTLY ABSENT (J2 exception - zero live controls render; see P-19) | W5-02: Home not social, imagery fake/absent. W5-13: everything read all-Forming. Founder ambient ask 2026-10-19 16:27 PDT: in stills, ambience reads mainly behind the Your-move card - raise at-rest legibility on Home and the deck |
| P-02 | Center / deck (opening) | Backend: the ONE Reveal derivation (Reveal.for_viewer) incl. the polish change_request lane (P1) and the etiquette limbo stamp; deck groups from the opening projection (shellData openingFromPlans) | Needs-you first, then one hero, then ready, then forming - each card carrying its state in hue + pattern + glow, at most one lit (fire) card, and - when a real change is proposable - a plain "Request a change" action between Confirm and Dismiss | TRUE (pack-v2 center-deck + center-deck-lit-reveal pairs). Density cap at heavy scale: HONESTLY ABSENT for the needs-you/forming counts (declared in its own declaration, Part 3) | W5-14/W5-26 (journeys/wholeness); P1 (request-a-change lane); P5 ("Opal's pick" lit cue sanction) |
| P-03 | Center orbits log | Backend: Opal-conversation (orbit) sessions projection - birth/rename/pin/archive/delete/make-private chains all PROVEN at served level (functional-accountability J7), unlock via the graph-lock contract | Conversations filed by meaning, not time: pinned section holds against recency, groups per person, private groups gated by the passcode prompt (FA-02 fixed: the prompt is now a full hittable overlay, pack-v2 orbit-private-gate pair) | TRUE (pack-v2 center-orbits-log family + orbit-private-gate pair). Density: no collapse grammar applied - declared gap (Part 3) | W5-22 (quick-draw thread to Opal chats); W5-23 (ORBITS - conversations filed by time, not meaning); W5-25 (conversation chrome) |
| P-04 | Chats list | Backend: conversations projection (rows carry next_plan from the one NextPlan pick + the P1 mini-card lane); search field wired in W25 (FA-01: query state + in-place filter over the row's own finished text, honest empty line) | People and group rows with full-width (316px) in-row plan-awareness mini-cards wearing state borders; search narrows the list it sits on; a vaulted plan shows no strip on its row (per-viewer vault, JA-02 lineage + polish vault sweep) | TRUE (pack-v2 chats-list + chats-list-filtered pairs). Density: NOT governed by the density wave's machinery - recency scroll from the server projection, declared (Part 3) | W5-06 (in-row block = stacked word column); FA-01 (the search was a dead control - charged by W22, fixed W25); P1 (mini-card lane, list form carries no lit cue, by design) |
| P-05 | Thread (person/group conversation) | Backend: conversation messages contract (POST /conversations/:id/messages, idempotent client_message_id), voice-note path (POST /conversations/:id/voice_notes, batch transcription), NextPlan + ConversationAlignment for the strip/YOUR MOVE card, thread doorway into the scoped Opal conversation | Messages under a SOLID anchored Next Together strip; the YOUR MOVE card at the head (the pack's quality standard); a top-right orb doorway into "Opal chats about {person}" with a back chip; composer: text send real, voice note real and now presented in the composer bar | TRUE for text + voice (polish-thread truth table, pack-v2 thread frames). Photo attach and file attach: HONESTLY ABSENT - no button painted; blocker named: messages have no media carrier (no message-media model, no conversation-scoped upload route, no contract field, no render path) | W5-07 (strip translucent, bleeds on scroll); W5-18 (Opal chats blend into person threads); P2 (doorway top-right); P7 (composer truth table) |
| P-06 | Call log | Backend: calls projection - per-viewer call_state derivation (one record, viewer-correct states: missed reads "Call back" to the callee, settled/past to the caller); callback writes a real call through the same path; rows read NextPlan.for_peer for the plan link | Every call in the new design: ambient border color-coded by the call's action state (unresolved vs resolved), Call back on a missed row creates the call and the original row settles after the callback connects and ends (J6 PROVEN; before/after pair in pack-v2) | TRUE (pack-v2 calls-log + calls-log-after-callback pairs; A2 containment fixed this wave - pill + glow inside the row border, both modes). Density: no pill/month collapse - declared gap (Part 3) | W5-03 (calls left out of the design); A2 (2026-10-19 16:42 PDT): pill text clipping / glow escape at 390px (first charged as ledger F3, fixed W21; the polish A2 pass + the dark shadow-composition fix in polish-ambient integrity addendum (c) close the remainder) |
| P-07 | In-call surface | Backend: call lifecycle responses now carry next_plan (NextPlan.for_conversation / for_peer - polish-incall, the same derivation as the log); graphing state from the Assist machinery (consent-gated; pause halts ingestion with assist_inactive, lineage records graphing_on / paused / resumed - J6) | A connected call on the spectral stage: quiet timer, participant rows (your own speaking state from a real mic tap; the peer's is never claimed), the plan-in-context line, the graphing light with its capture-truth sentence and pause control, and the Orbit Trace border (fire while graphing, cyan while merely live, gone when neither) | TRUE at code/test level (connectedCall.test.ts, 12 pins; polish-incall). Rendered connected-call frames: HONESTLY ABSENT - F5, headless fake-media ceiling; the voice path itself is FOUNDER-PROVEN (real call, two accounts, separate rooms, 2026-10-19). Peer speaking / peer muted: HONESTLY ABSENT (no signal reaches the surface). Live transcription/captions: HONESTLY ABSENT (F-16). Video: HONESTLY ABSENT as media - video-kind calls are audio calls and the surface says so in one plain line | W5-15 (in-call surfaces legacy/absent); W5-16 (graphing light + per-call pause); P10a (connected-call experience); P10b (Orbit Trace) |
| P-08 | Opal conversation (Center chat) | Backend: opal_conversations / opal_messages store + the ingestion pipeline (EventIngestor persist-first, Extractor/Reasoner/Executor, proposals through the PlanTransition gate); LLM via LlmAdapter (DeepSeek by config today, provider swappable; honest template fallback when unconfigured, never synthesized model text) | A conversation with Opal scoped to a person or a plan: context chip naming the scope, overflow menu with real rename/pin/archive/share/delete, the change-proposal doorway the P1 lane enters | TRUE (pack-v2 opal-conversation + overflow pairs; J-chains in functional-accountability). Live-LLM turn on the review stack: NOT exercised (no provider key there) - the wired path + honest-disabled behavior are what is proven, stated in the source | W5-18 (separation from person threads); W5-25 (chrome); P1 doorway (the lane lands here); P2 return path |
| P-09 | Graphs list | Backend: plans contract through the one adapter (graphListFromPlans) carrying the density stamps (band, weight, temperature) + per-viewer is_private; ties render from the one people universe (DL-03/DL-06: who_label on cards) | Your futures, grouped by the constitution: Needs your answer, Coming up, Needs a day or a detail, Someday, On the horizon (one quiet line per far plan) - past is never a rows group; settled invitations never appear; private graphs never enter groups or counts | TRUE (pack-v2 graphs-list pair, state edges AT-13) | W5-09 (Graphs not futures); DL-06 (the graph never names the tie); P11/P12 (density + horizon) |
| P-10 | Graphs Past | Backend: same plans contract, past records bucketed by density.ts (month pill / year pill / Earlier pill from the record's own dates; a dateless record is never assigned an invented month) | Past as a pill, never a scroll: period + count + up to three real highlights in settled/white; expansion by intent only reveals one-line ledger rows for that period alone; settled invitations rest here as one summarized line each, in your own past area only | TRUE (pack-v2 graphs-past pair; heavy-persona pill frames owed from the density frame list - see P9 draft) | W5-09 (past/completed view); P11 (density constitution) |
| P-11 | Graph detail (the living plan) | Backend: PlanHistory projection + detail contract (who[] with relationshipLabel, leave_by object from the ONE LeaveBy derivation, preparation spine from the plan's own preparation records); Add people writes real PlanParticipant rows (lead-gated, DL-07); share via shareCardFromDetail | The plan alive on open: state, when, where (permission-honest location states - "Not sharing location", never a faked distance), who is joining with their ties, how far only when a real share exists, the preparation spine ("How this plan comes together"), the When-to-leave section, History collapsed behind a toggle, Share, and privacy only via long-press / overflow (A1 - no visible make-private control) | TRUE (pack-v2 graph-detail pair; J3 PROVEN incl. the private seal end to end). Distance/current position: HONESTLY ABSENT (BS-06 - no writer exists). Leave-by: TRUE when the viewer shared location AND the plan carries coordinates; on today's seed/plans it reads "no_place_coordinates" because no writer stamps place coordinates yet - see UNVERIFIED note below the table. Text edit of title/time/place: HONESTLY ABSENT in C2 detail (legacy-only mount, polish-surfaces s5) | W5-10 (detail static, locations faked); P10c (leave-by); P12 (preparation spine); A1 (privacy via long-press) |
| P-12 | Person profile | Backend: person sheet from the thread host (Next together line identical to the thread's facts); relationship read/write through the ONE picker write path (DL-01/DL-02: type + family subtype + age band in one PUT, server read-back, 422 never a silent drop); "What Opal remembers" doorway routes to the viewer's own memory-controls room and its caption says exactly that (P6) | Who this person is to you: avatar, tie, next together, Message (returns to the real thread), the relationship picker ("How do you know {name}?") with the Family accordion and age-band block, "In your close circle" when the backend's derived set says so | TRUE (pack-v2 person-profile + person-identify-picker + person-identify-family pairs; profile-family light counterpart declared in the manifest, not shipped unverified - W28 note) | DL-01..DL-04, DL-12 (relationship layer rendered nowhere / dead ends); P6 (memory doorway clarity); N3 (Family accordion); N4 (age bands) |
| P-13 | Orbits (orbit sheet) | Backend: orbit sessions + plans for the anchor, filtered at the host so viewer-vaulted plans never appear; orbit-hide flag (per user, per anchor) behind the same GraphLock passcode | "Everything Opal keeps together about {name}": purpose header, PLANS block, YOUR CHATS WITH OPAL block - labeled so the two can never be confused - and Orbit options, behind which (only) lives "Hide these Opal chats behind my passcode", with the note that it never hides a plan or graph | TRUE (pack-v2 orbit-sheet pairs; P4 legibility rebuilt this wave; the W28 orbit-sheet frames were NOT re-shot - declared capture limit in WALK_ACCEPTANCE s6, test-pinned instead) | W5-23 (ORBITS); P4 (sheet legibility); the naming collision: orbit "Private" read as graph privacy (vault report s1) |
| P-14 | Search | Backend: the viewer's real loaded data only - Plans, Chats, People (conversation peers), Intentions (the shell's loaded intentions, wired this wave), Places (new: derived from the viewer's own plans' locations only, virtual plans excluded; no directory searched, no place invented); private plans are never passed to it (vault sweep) | One search over your own world: five groups, tap-through to the real plan/thread/chat; empty state names all five groups; plan rows show the contract's time_label verbatim or "Time not set yet." | TRUE (polish-surfaces s4 verification map; frames owed: search-empty / search-results / search-no-match, both modes). The legacy fixture search (opalUi/SearchDestination.tsx) is NOT served - confirmed, pinned | P8 (search verification); W5-24 (totality - a fixture search posing as the real one would be FALSE; it is unmounted) |
| P-15 | Create flows | Backend: createGraphPlan (plan/idea), createTrip (trip), ensureDirectConversation (chat), createConversationCall via the picker call mode (call), uploadSocialMomentMedia + createTemporaryStory / publishSocialMoment (story/post), journeyAddPeople (invite into a plan) | No unified create sheet exists - stated plainly. Four real surface-local entries: Graphs/Center create (Plan / Trip / Idea), Chats "+ New" (chat), Calls "+ New" (call - built this wave), Home story rail (Story / Post). Every entry verified to a real write; on success the shell re-reads | TRUE for all four entries (polish-surfaces s4; frames owed: the create-* set, both modes). Adding a second story while one is live, from the rail: NOT REACHABLE (the cell opens the viewer instead) - declared | P8 (create verification); P9 (journeys) |
| P-16 | Private graphs vault | Backend: per-viewer plan_privacy_marks (this wave - a mark governs the marking viewer's surfaces only; other parties keep their view, their contracts carry is_private: false, no marker leaks) behind the per-account GraphLock passcode | "Private graphs": a plainly titled space behind your passcode; a marked graph vanishes from Home, Chats, thread, call log, Center, Search, Graphs and orbits for YOU, and reappears intact on un-marking - private is a state, never a destruction (round-trip pin: title/status/history/who byte-identical after un-mark) | TRUE (vault report s4 surface sweep, 11 surfaces, two-account cases; frames owed: vault frame list 1-10, both modes). Intentions/goals in the vault: HONESTLY ABSENT - neither contract carries a privacy field or mark write path (N1 use-note, recorded design; follow-up build named in the vault report s7) | P3 (per-viewer vault model - the old global model hid the plan from everyone); P4; A1 (no visible make-private control; long-press only); N1 as corrected (the name IS "Private graphs"; zero lock framing in copy) |
| P-17 | Share sheets (plan + conversation) | Front-end over real projections: plan sheet from shareCardFromDetail (the one adapter); conversation sheet from the thread's own card facts; Copy writes exactly the card's textLines - no URL is ever fabricated (the plan contract carries no share code) | Share this plan / conversation: the card shows the plan's own finished facts (title, state, when, where, attendance, people) and the one action, Copy details, copies exactly what the card shows | TRUE (pack-v2 share-card pair; copy content pinned line-by-line, legacyRecreation + r19FixB BS-11). Onward share / repost / like / comment on a published post: HONESTLY ABSENT on C2 Home (client functions exist, unmounted - nothing painted) | BS-11 (share honesty - state the real mechanism, no fake OS share); sharing-family verification (polish-surfaces s5) |
| P-18 | Opal's Home | Backend: none - no components exist. The approvals queue / activity-trail home is WALLET_MAP W-GAP-12 + DC-GAP-5: designed, sequenced after the wallet build, codeless by design sequence | The designed home of "what Opal did, and what awaits your approval" - presence, activity trail, upcoming, awaiting approval, Soul+Memory cards | HONESTLY ABSENT (registered in the wallet map so the trace is explicit; it becomes a fidelity failure only if the wallet build ships without it). Nearest living relative: Settings Activity (S-10) | Wallet Map sF (W-GAP-12) + human-form register HF-GAP-3/HF-GAP-4 (the "why" and the ledger have no human form today) |
| P-19 | Live (host / viewer) | Backend: none built - the C2 live host + viewer build is an unbuilt wave (J2 exception, carried from W10) | A Live surface on Home | HONESTLY ABSENT - re-verified on the served build: zero live controls render (no Watch / Go Live / Start Live button, no live testid); the JA-06 dead-Watch class stays closed | W5-24 (totality); functional-accountability J2 EXCEPTION |
| P-20 | Splash + first run | Backend: phone-code sign-in (startChallenge / verifyChallenge); invite capture leg wired this wave (C2Shell captures a product-shaped ?invite=CODE into the store verifyChallenge reads, so onboarding joins the pair at sign-up) | Splash 1/2 (orb settle, motion fidelity PASS in pack-v2), landing, and the 60-second first run; a no-Opal invitee opening the shared link now lands somewhere that keeps their code | TRUE (pack-v2 splash family + cold-onboarding frames; W5-05 GREEN). Already-signed-in recipient auto-join from the link: HONESTLY ABSENT in the served build (legacy-only effect; the manual redeem in S-19 is REAL for them) | W5-05 (splash motion/rings); the 60-second onboarding law; P9 external-invite trace (polish-surfaces s5) |

UNVERIFIED note on P-11 (leave-by coordinates): the leave-by report
(Cluster G) verified by grep that nothing in the repo writes
place_lat/place_lon, so real plans read no_place_coordinates. A
worktree named `wt-polish-placewriter` exists on disk, suggesting a
follow-up cluster may have addressed the writer after the leave-by
report was written, but NO placewriter report exists in
coordination/repair19/. Status of the coordinate writer is therefore
UNVERIFIED-BY-DRAFTER - integrator check: the wt-polish-placewriter
branch diff + any plan-creation path in wt-polish that copies candidate
coordinates onto the plan row (grep place_lat in
apps/opal_core/lib/opal_core/social_flow/ place/candidate code).

---

## PART 3 - DENSE-LIST CONSTITUTION DECLARATIONS

Verbatim in substance from polish-density-report.md s3 (the density
cluster's own declarations, written FOR this table). The one bucket
system behind them (density.ts, one derivation, stamped on the
projections): future - today (0d, full, weight 1) / week (1-7d,
present, 0.75) / month (8-30d, quiet, 0.5) / far horizon band (31+d,
distant, 0.25); past - month pill (within 12 months) / year pill /
"Earlier" pill (no date on the record - never an invented month). A
plan migrates far -> month -> week -> today as its start crosses the
thresholds (pinned with a pinned clock). Presence weights are computed
in the projection from start_at; no component counts, buckets, weighs,
or cools a plan on its own.

| List | Declaration (buckets / pinning / summarization thresholds / off-screen-until-asked) |
|---|---|
| Home feed | "A capped, ranked river, never a calendar. At most 14 cards: up to 3 live, up to 10 plans, moments fill the rest. Plans order by state rank - happening, needs-you, ready, forming, past last - stable within a family, never relabeled. Settled invitations (you declined, or it expired) never appear. Nothing is bucketed under date headers; everything past the cap stays off-screen until the user goes to Graphs or Chats." |
| Center deck (opening) | "Needs-you first - every action-family card, in projection order - then one hero: the happening plan, else the next ready plan. Remaining ready plans follow, then forming plans, each naming its one missing slot. Settled invitations never appear. Far-band plans carry no extra weight here beyond their family. Declared gap: the deck does not yet cap the needs-you and forming counts at heavy scale - a cap threshold is future work, honestly unbuilt." |
| Chats list | "NOT governed by this wave's machinery. The list renders the conversation projection's own order (the C1 hosts own it; unread and next-together ride that projection). No summarization threshold, bucket, or collapse was added here. Declared gap: a booked-out user's chat list remains a recency scroll from the server projection - density rules for it belong to the chats cluster's projection, not a component." |
| Call log | "NOT governed by this wave's machinery. The log renders the calls projection (the calls cluster owns it), with ambient borders color-coded by the call's action state. No collapse or threshold was added here. Declared gap: a heavy call history has no pill/month collapse yet; the past-pill grammar in density.ts is the named pattern to apply when the calls projection carries period dates." |
| Graphs list | "The dense-list constitution, implemented. Group order is fixed: Needs your answer (action) first, then Coming up (happening + ready), then Needs a day or a detail (forming with exactly one missing slot named), then Someday (forming, nothing missing), then On the horizon (far band, one quiet line per plan, distant presence) - past is never a rows group. Every card carries its projection-stamped presence weight (full / present / quiet / distant) from its real start date; a plan with no real start carries no weight. Settled invitations are absent from every group. Private graphs never enter groups or counts." |
| Graphs past | "Past is a pill, never a scroll. Past plans collapse into period pills - a month pill within the last 12 months, a year pill before that, one 'Earlier' pill for undated records - each pill showing period, count, and up to three highlights, in settled/white treatment. Expansion is by intent only and reveals one-line ledger rows for that period alone. Settled invitations rest here as one summarized line each, in the viewer's own past area only." |
| Orbits log | "NOT governed by this wave's machinery. The orbit history / Opal-conversation log renders its own projection (C1 hosts). The past-pill grammar was not applied here. Declared gap: orbit history accumulates as a scroll today; if it is to collapse, it should collapse by the same pill grammar from its own projection - named, not improvised in this wave." Pinning note (from J7, served-proven): a pinned orbit holds its own PINNED section against recency - pinning exists in the log's own projection even though the density wave added no buckets to it. |
| Graph detail - History | "Already collapsed before this wave (a History - show/hide toggle, closed by default) and unchanged; it is a per-plan record, not an accumulating list, so the pill grammar does not apply." |
| Settings - Activity | "NOT changed by this wave. The Activity room renders every account-activity entry as a row from its settings projection, which carries no period date per row, so the pill grammar cannot be applied truthfully from that projection. Declared gap: archive collapse belongs in that projection (period dates first), not in the surface." |

Where the collapse grammar WAS applied: Graphs past (lead pattern,
fully), Graphs list horizon band, Home feed and Center deck
settle-filtering. Where it was NOT: chats list, call log, orbits log,
settings Activity - each declared above with its reason (density
report s3, closing line).

Heavy-persona proof state: the density frame list (9 frames, both
modes) renders the REAL surfaces from the heavyPersona fixture - there
is no backend heavy account / sign-in (honest gap 1, density report
s8). Those frames are BUILT-NOT-SHOT until the integrator captures
them; a capture from the fixture must be logged as a fixture render,
not as the real user path.

---

## PART 4 - AMBIENT REGISTER (cross-reference, not a second table)

The ambient accountability for every surface above lives in
coordination/repair19/ambient-rulebook.md, index AR-00 (governing
rules AR-00.1 - AR-00.9) through AR-17, plus the future entries
AR-F1 - AR-F6. The polish wave's ambient dispositions: at-rest
legibility raised to the AR-00.2 envelope top on Home/Center/Chats/
thread registers (polish-ambient, 12 changes, each with its rule and
its one-sentence reason); the N5 toggle treatment (draft rulebook
micro-entry AR-18, "a control answers in light" - DRAFTED, filing
owed to the integrator); the P10b Orbit Trace (spec + draft rulebook
entry in polish-incall s4 - DRAFTED, filing owed). Any ambient element
whose reason cannot be stated in one sentence is cut by AR-00.3 - no
asset in Parts 1-2 carries an unjustified ambient element on the
evidence read.

---

## DRAFTER'S UNVERIFIED LIST (for the integrator)

1. S-04 Your library - backend contract name not dispositioned.
   Check: shellData.ts buildSettingsSection("your-library").
2. S-14 Privacy - control rows beyond copy/nav unverified.
   Check: shellData.ts buildSettingsSection("privacy").
3. S-18 Saved logins - credential-store contract name unverified
   (list/remove level is pack-proven). Check: shellData.ts
   saved-logins section builder.
4. S-22 Report a problem / S-23 Submit feedback - submission write
   legs unverified. Check: C2Shell.tsx event wiring for both keys.
5. P-11 leave-by place-coordinate writer - a wt-polish-placewriter
   worktree exists but no report was filed. Check: that branch's
   diff; grep place_lat writers in wt-polish.

FOUNDER_ACCEPTED = NO. This draft makes no acceptance claim.

## FINALIZATION ADDENDUM (integrator, 2026-10-20)
Rendered-layer outcomes from the capture re-run (pack-v2/
POLISH-MANIFEST.md), for the assets this table examines:
- Connections room: TRUE and FRAMED (settings-connections-dark) -
  quiet rows, server-checked statuses, Twilio honestly "Simulated -
  not a real connection", Gmail/Calendar "Waiting on you". The
  duplicate "Connected sources" entry is gone; ingestion reads
  "Where Opal reads from" (section frame declared - nav).
- Your moments: TRUE and FRAMED (your-moments-room-dark) - clarity
  copy + moment card with live-until line and audience. Manage sheet
  actions (Post a moment / Keep longer / Delete) pinned; sheet frame
  declared.
- What Opal remembers: TRUE and FRAMED (settings-memory-room-dark) -
  honest short-form limits stated on the surface itself; manual
  add/delete live on the real store with timestamps + provenance;
  password check HONESTLY ABSENT (phone-code only); step-up re-auth
  and capsule form remain founder-gated / wallet scope as tabled.
- Call log: TRUE and FRAMED (callog-closeup-dark) - pill containment
  holds at phone width on the real stack.
- Search: TRUE and FRAMED with real mixed-kind results (the earlier
  no-match frames were throttle fallback; charged as defect D-10 -
  a failed search renders as "No match").
- Private graphs vault: TRUE; cycle framed to the unlock step
  (gate, empty-open, absence set); inside-with-card frame declared.
- Density constitutions (Part 3): declarations now carry rendered
  proof via the fixture-fed density frames (declared as fixture-fed).
- Etiquette assets: window + limbo TRUE and FRAMED both seats;
  fork/closure TRUE in machinery (pins), frames declared (D-9).
- Leave-by: honest absent states FRAMED; estimate/leave-now TRUE in
  the API layer (36/36 pins), frames declared (staging blocker).
- Connected call surface: TRUE in build + pins; outgoing initiation
  framed (create-call-picker); connected frames declared (rig).
No asset's status in this table was upgraded on the basis of a frame
its pixels do not prove; thirteen mis-named frames were removed from
the pack during finalization (manifest, campaign-2 final section).
