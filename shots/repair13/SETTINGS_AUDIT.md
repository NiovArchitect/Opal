# SETTINGS_AUDIT — Repair #13 (W3: YOU-screen settings audit)

**Branch:** `muse/repair-13-w3` · **Date:** 2026-10-16
**Method:** every control on the YOU/settings surfaces inventoried from
`apps/opal_web/src/opalUi/YouSettingsDestination.tsx` (+ hub in
`apps/opal_web/src/OpalApp.tsx`, `apps/opal_mobile/src/screens/YouScreen.tsx`),
traced UI → handler → persisted setting → behavior, and proven by test.
Verdicts: **WIRED** (toggle changes a real observable), **DECORATIVE** (claims
behavior, does nothing), **DEAD** (no handler / unreachable), **NOISE** (text
with no user benefit), **HIDDEN** (blocked inventory, not painted to
consumers), **INFO** (read-only projection of real state).

F12 regression guard: no F12-01..F12-63 contract was altered. The plan
lifecycle assertions reuse the F12-02 (change mutates) and F12-62 (terminal
plans stay terminal) contracts. Em-dash rule holds: new copy uses plain
hyphens only (remaining em-dashes in the file are pre-existing code
comments, untouched per F12-22).

## Control inventory

### Web — Edit profile

| Control | Backing (UI → API → DB → behavior) | Verdict | Action |
|---|---|---|---|
| Name field + Save profile | `updateProfile` → `PATCH /api/v1/product/profile` → `ProductSession.update_profile` → `User.display_name`; parent updates session + native host | WIRED | proven by test (persistence) |
| Username field + Save profile | same path → `User.handle` (unique constraint, normalized) | WIRED | proven by test (persistence) |
| Bio field | `blockedReason` — not on the user profile API | HIDDEN | kept in inventory, not painted |
| Identity note | info text | NOISE | trimmed to "Phone number changes under Account & security." |
| Screen lede | "Your identity. Social preferences..." | NOISE | trimmed to "Your name and handle." |

### Web — Privacy

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Graph visibility / Exact location / Public engagement counts toggles, Join requests, Blocked & muted | per-Graph audience API, live-location session API, etc. — not shipped | HIDDEN | kept in inventory, not painted |
| What Opal may access (4 rows, static "On") | product-law projections (transparency/correction always available) | INFO | subtitles trimmed |
| Memory facts + Forget button | `forgetMemoryFact` → `DELETE` → `DurablePreferenceMemory.forget` → list | WIRED | proven: fact disappears from list |
| People + relationship type picker | `setRelationshipType` → `Relationships.set_type` → type map | WIRED | proven: type persists, reads back |
| Trust tier + Grant/Revoke complete trust | `grantInnerCircleTrust`/`revokeInnerCircleTrust` → `TrustTiers.grant_tier(…, "user")` / `revoke_inner_circle` | WIRED | proven: tier steps up and back |
| Celebrations: add / delete | `createCelebration`/`deleteCelebration` → `Celebrations.create/delete` | WIRED | proven: list round-trip |
| Celebration curation + "Plan this" | `curateCelebration` → `CelebrationCuration.curate_for`; plan-this posts a real message to Center | WIRED | proven: budget note changes with comfort |
| "Deeper understanding…" note | honest gate copy | NOISE | trimmed |
| privacy-law note | confusing, low benefit | NOISE | replaced with "Opal's location use is separate from what others can see." |

### Web — Feed & discovery

| Control | Backing | Verdict | Action |
|---|---|---|---|
| People-first / Local discovery / Nearby range / Suggested people / Suggested experiences | ranking/preference APIs not shipped | HIDDEN | kept in inventory, not painted |
| Invite friends: create link, SMS, copy, share, status list | `createProductInvite` → `Invites.create_invite` (rate-limited, honest SMS note when Twilio unconfigured) | WIRED | proven: code resolves via `get_by_code` |
| feed-law note | low benefit | NOISE | trimmed to "Exact location is never shared from here." |

### Web — Location & travel

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Home timezone field + Save | `updateHomeTimezone` → `PATCH /travel/home_timezone` → `TravelMode.set_home_timezone` → `AssistancePreference.timezone`; drives travel-mode projection, effective TZ, prompt section | WIRED | proven: set → read-back; invalid refused |
| Travel mode row | read projection of `getHomeTimezone.active` + device/home TZ diff (On / Adapting / Off) | INFO | real, not a fake toggle |
| Use-location-for-timing / Share live location / Home area / Map handoff | device permission + ETA service / session APIs not shipped | HIDDEN | kept in inventory, not painted |
| location-law note ("Opal knows your timezone, never your precise location") | real privacy law, short | INFO | kept |

### Web — Engagement / Safety (REMOVED)

Both screens were **DEAD**: unreachable from the YOU hub (no hub row, no
`onOpenSetting` path, no deep link ever set `"engagement"` or `"safety"`),
and every row carried a `blockedReason`, so each screen rendered exactly one
note and zero controls. Per the founder's no-dead-surface law, both screen
defs were removed from `SCREENS`, `YouSettingKey`, `YOU_SETTING_FIGMA`, and
the semantic mapping. `authorityRejectedStates.test.ts` key list updated.

### Web — Calls & Opal Assist

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Opal Assist on calls toggle | `updateAssistPreference` → `PATCH /preferences/assist` → `User.assist_calls_enabled`; on call start `Assist.apply_defaults` writes `AssistConsent(source: "account_default")` only when true | WIRED | proven: consent row written when on, none when off |
| Ask on every call / Suggest Graph ideas / Remember call signals / Call privacy | prompt UI / bridge / retention APIs not shipped | HIDDEN | kept in inventory, not painted |
| Graphing: Pause + 4 call modes | `updateGraphingPolicy` → `RelationshipAccess` → `graphing_decision` (`:global_paused` / `:never` / `:ask` / `:auto` / `:selected`) | WIRED | proven: pause blocks, mode changes decision, persists |
| Per-person Graphing grants (selected_only) | `upsertRelationshipAccessGrant`/`revokeRelationshipAccessGrant` → `may_access?` gates `graphing_decision` | WIRED | (covered by existing relationship_access tests) |
| Act-on-behalf: Place calls for you / Make reservations for you | `grantConsent`/`revokeConsent` → `Consent.grant/revoke`; execution gates `Calls.invite` (`calls_outbound`) and `PlanExecution` (`bookings_reserve`) via `Consent.require_for_action` | WIRED | proven: gate opens on grant, closes on revoke; unknown capability refused |
| assist-law note | real product law | INFO | trimmed |

### Web — Notifications

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Messages & calls toggle | `updateMessagingPreferences` → `User.message_notifications_enabled` → `Inbox.message_notice["in_app"]` gate (push enqueue + badge) | WIRED | proven: `in_app` flips false/true, persists |
| Read receipts toggle | same path → `User.read_receipts_enabled` → `Inbox.fanout_read` skips peer broadcast when off | WIRED | proven: peer-visible receipt suppressed when off, reader's own cursor notice still fires |
| Graph changes / Live movement / Social activity / Critical timing | push categories need Expo rebuild / session APIs | HIDDEN | kept in inventory, not painted |
| notif-law note | restated the screen | NOISE | trimmed to "These save for this account." |

### Web — Linked devices

| Control | Backing | Verdict | Action |
|---|---|---|---|
| This phone (Active) | local session projection | INFO | honest, real |
| Desktop session (QR) / Revoke a device | signed session mint / roster APIs not shipped | HIDDEN | kept in inventory, not painted |
| device note | useful | INFO | trimmed |

### Web — Appearance

| Control | Backing | Verdict | Action |
|---|---|---|---|
| System / Dark / Light picker | `setAppearancePreference` → localStorage `opal.appearance.theme.v1` → `data-theme` + `color-scheme` on `documentElement` (immediate) | WIRED | local-only, real observable |

### Web — Spending

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Comfort level / dining range / notes + Save/Update | `setFinancialProfile` → `FinancialProfiles.set_profile` (trusted+ gate, comfort validated against allowlist); consumed by `GroupTastes.mode_price_comfort` and `CelebrationCuration.budget_note_for` | WIRED | proven: below trusted → `:forbidden`; trusted → persists; curation budget note changes |
| Remove spending data | `deleteFinancialProfile` → `FinancialProfiles.delete_profile` | WIRED | proven: profile gone after delete |
| Learn from my choices / Keep my budget private / Ask only when cost matters / Trip goals / Per-Graph spend | feedback store / override APIs not shipped | HIDDEN | kept in inventory, not painted |

### Web — Fit

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Activity picker / Wellness goal / Share toggle + Save | `saveFitPreferences` → per-user localStorage; share gate consumed by `OpalCenterChat` via `readFitSliceForOpal` → Center context `:fit` | WIRED | proven by existing `fitPreferences.test.ts` (share-off → null slice) |
| fit-prefs-note | duplicated section copy | NOISE | trimmed |

### Web — Account & security

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Linked devices nav | `onOpenSetting("linked-devices")` | WIRED | nav works |
| Delete account nav | `onOpenSetting("delete-account")` | WIRED | nav works |
| Phone number / Two-step / Session alerts | re-verify OTP / push event feed not exposed | HIDDEN | kept in inventory, not painted |
| account-law note | restated other screens | NOISE | trimmed to "Delete is nested and confirmed - never one tap." |

### Web — Delete account

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Warning notes | honest: self-serve delete not available, contact support | INFO | trimmed lede ("Take your time. This is permanent.") |
| Keep my account | local dismiss → back to Account & security | WIRED | no fake delete |

### Mobile — YouScreen (`apps/opal_mobile/src/screens/YouScreen.tsx`)

| Control | Backing | Verdict | Action |
|---|---|---|---|
| Account card (name/handle) | real props from shell | INFO | kept |
| People you know | `onFindPeople` | WIRED | kept |
| Devices card | **hardcoded `deviceCount={1}`** → "1 active session(s)" | DECORATIVE (fabricated count) | FIXED: props removed; card now reads "This phone / Active session" (true of the current session) |
| Privacy card | product-law claim | INFO | kept |
| Safety card | **hardcoded `blockCount={0}`** → "No active blocks" | DECORATIVE (fabricated count) | FIXED: now "Quiet safety controls / Blocking stays private" — no false count |
| Family card | conditional, real prop | INFO | kept |
| Accessibility card | product-law claim | INFO | kept |
| Sign out | `onSignOut` | WIRED | kept |

## Text trimmed (copy rule: plain hyphens, no em-dashes)

- Edit profile lede/note; privacy-law note; feed-law note; assist subtitle + assist-law note;
  read-receipts subtitle; notif-law note; linked-devices lede/note; appearance note;
  account-law note; delete-account lede + warning note; Graphing standing note;
  act-on-behalf ladder note; access-law note; pass2-hold note; access row subtitles (4);
  memory-empty + people-empty states; spending "fits your life" line; Fit section copy +
  fit-prefs-note; mobile YouScreen Devices/Safety cards.
- Removed outright: Engagement + Safety dead screens (zero live controls, unreachable).

## Tests

### New: `apps/opal_core/test/opal_core/repair13_settings_audit_test.exs` — 17 tests, all green

Each test drives the exact context function the settings UI calls, then
asserts a real observable changes:

1. read-receipts off → no peer-visible `inbox:read` broadcast (reader's own
   cursor notice still fires); on → broadcast resumes; persists across reload
2. message-notifications off → `message_notice["in_app"] == false`; on → true;
   persists across reload
3. messaging-preferences endpoint shape round-trips both flags
4. assist on → `Assist.apply_defaults` writes `AssistConsent(source:
   "account_default")`; off → no row; preference persists + `assist_preference/1` shape
5. home timezone set → read-back; invalid refused, never persisted as garbage
6. grant `bookings_reserve` → `Consent.require_for_action` opens; revoke → closes
7. grant `calls_outbound` → gate opens; revoke → closes
8. unknown consent capability refused
9. graphing pause → `:global_paused`; mode `never` → `:never`; `ask_each` → `:ask`;
   unpause restores; policy persists
10. financial profile: below trusted → `:forbidden`; trusted → set/get round-trip;
    `CelebrationCuration` budget note becomes "Fits your comfortable comfort.";
    delete → profile gone
11. relationship type set → `get_type`/`type_map_for` read back
12. memory fact remember → forget → absent from list
13. celebration create → delete → absent from list
14. trust: known → trusted → inner_circle (user-granted) → revoke → trusted
15. invite create → code resolves via `get_by_code` + `validate_code`
16. (web-side, pre-existing) `fitPreferences.test.ts`: share-off → null slice
17. settings × plans interplay: with read-receipts off (owner) and message
    notifications off (peer) mid-plan-flow, `change_plan_time` still mutates
    (F12-02), the `social_flow:plan` broadcast still reaches the conversation
    topic, and `cancel_plan` still terminates (F12-62)

### Web settings tests

- `settingsWireClass.test.ts` (7, incl. 2 new Repair #13 guards: dead
  engagement/safety screens gone; mobile You screen has no fabricated counts),
  `youSettingsComingSoon.guard.test.ts` (4), `youHubHierarchy.test.ts` (4),
  `fitPreferences.test.ts` (6), `WhatOpalRemembersSection.test.tsx` (10),
  `youSettingsRender.proof.test.tsx` (2) — all green after the audit.
- Two test expectations updated to the intentional trimmed copy
  (memory-empty state) and the real screen title (stale `/Privacy & audience/`
  assertion predated the audit and never matched any rendered title).

### Full suite

- Backend (`apps/opal_core`, `mix test`): **2473 tests, 16 failures.**
  2456 + 17 new = 2473. All 16 failures are in the documented pre-existing
  categories from the Repair #12 TEST_REPORT (Voice/Deepgram key-gated,
  Metrics, VirtualPlan, FounderGraphCommitmentSeed, OpalIntent check_status,
  OpalConversations OC-3/OC-4, Pipeline 1.3, Cardinality N3) — verified by
  name against the baseline list; the baseline's other categories (e.g.
  Relationships) passed in this run. Zero failures in `social_flow`,
  `center`, `conversation_channel`, `repair12_*`, or `repair13_*` areas.
  Zero new failures: no backend logic was changed (one new test file only).
- Web (vitest, full suite): **1078 tests, 25 failures after the audit fixes —
  all 25 verified byte-identical on the base commit** (same files, same
  tests: activation/CSP, availability, designTokens, firstRun/S1 brand,
  s1Adversarial, OpalCenterChat send-error, authorityRejectedStates P0-05
  dock geometry, grammar, graphCalendaring ×2, graphDetail, graphScroll ×2,
  graphSpine em-dash, liveJourneyProof orbital mark, pasteW4DeviceFixes ×2,
  waveBChats ×3, waveBGraphs, waveBHome, technicolor). The audit's own
  settings files are all green.
- TypeScript (`tsc --noEmit`): 7 errors on base, 7 on branch — identical,
  pre-existing (OpalApp ChatPreview planProjection ×6, RelationshipContact
  handle ×1). No new type errors.

## Final SHA

`9fe611719570f0a95fec681263d91e3c1c99e519` on `muse/repair-13-w3`
(pushed 2026-10-16; tree `2f8a67a41040e054d4a5e41656aac19ebeb6220e`,
byte-identical to the local commit's tree). Pushed via the GitHub Git
Data API because `git push` over HTTPS has no credential helper in this
worktree (surrogate auth is api.github.com-only); no merge, no
production, no Pass 2.

## Worktree incident (2026-10-16 ~23:48–23:55 UTC)

During this task, another party's work appeared in this worktree
(`muse/repair-13-w3`): backend modifications (action_orchestrator,
opal_conversations, opal_intent, opal_response, oracle,
opal_conversation_controller, router), an untracked
`repair13_w4_chat_test.exs`, and a new migration — plus merge conflicts
(router.ex, OpalApp.tsx, GraphDetailSheet.tsx, graphCalendaring.ts,
graphSurfaceInterop.ts) from an interleaved `git stash`/`pop` with that
party's own stash. My 8 tracked frontend files were reverted by the
interleave; they were redone byte-for-byte afterward and re-verified
(web settings tests green). The foreign conflicts were NOT touched and
remain for their owner. The `OpalApp.tsx` hub comment fix WAS applied (clean region,
far from the 8 conflict markers); the conflicts themselves were not touched.
Backend re-run of the audit tests after the redo is blocked by the foreign
conflict markers in `router.ex` (won't compile); the 17 tests were verified
green on the uncontaminated tree with the identical test file.
