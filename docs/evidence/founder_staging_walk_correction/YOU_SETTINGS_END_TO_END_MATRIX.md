# YOU / Settings end-to-end matrix (Pass B consumer readiness)

**Branch:** `muse/packet-b-batch-2`  
**HEAD at audit start:** `9286a6bd`  
**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Laws:** `VISIBLE_SETTING_REQUIRES_WORKING_BEHAVIOR` · `CONSUMER_TECHNICAL_LEAK=0`  
**Scope:** Read-only inventory + Pass B hide/leak fixes in `apps/opal_web` only. No Track B WebRTC. Pass 2 stays locked.

## Authority surfaces

| Surface | Path |
|---------|------|
| Nested settings destination | [`apps/opal_web/src/opalUi/YouSettingsDestination.tsx`](../../../apps/opal_web/src/opalUi/YouSettingsDestination.tsx) |
| Wire classifier | [`apps/opal_web/src/opalUi/settingsWireClass.ts`](../../../apps/opal_web/src/opalUi/settingsWireClass.ts) |
| You hub rows | [`apps/opal_web/src/OpalApp.tsx`](../../../apps/opal_web/src/OpalApp.tsx) `YOU_HUB_ROWS` / `YOU_MORE_ROWS` / `YouPane` |
| Prior steward (superseded paint law) | `shots/steward/SETTINGS_WIRE_AUDIT.md`, `PASS1C_SETTINGS_LIVE_WIRE.md` |

## Counts (SCREENS control rows + filed live sections)

| Class | Count | Meaning |
|-------|------:|---------|
| **GREEN** | **13** SCREENS + **7** filed | Working UI → API/DB/local projection; consumer-visible |
| **HIDE** | **43** SCREENS + **1** consent + **1** photo | No working behavior; must not paint (Pass B `return null`) |
| **BLOCKED_INTERNAL** | **0** painted | Inventory `blockedReason` retained in source for engineers; not consumer-visible |
| Notes (consumer-safe after Pass B) | 14 | Non-interactive copy; leak strings scrubbed |

**Hub rows after Pass B:** Privacy, Feed & discovery, Location & travel, Calls & Opal Assist, Notifications, Linked devices, Spending & fit, Account & security (+ Edit profile, Delete nest). **Engagement** and **Safety** hub entries **hidden** (all nested controls were HIDE).

## Theme / Appearance

| Question | Status |
|----------|--------|
| System / Dark / Light preference row? | **GREEN** — You → Appearance (`appearance` screen) |
| Persistence | `localStorage["opal.appearance.theme.v1"]` → `system` \| `dark` \| `light` |
| Apply | `document.documentElement[data-theme]` + semantic tokens in `spectralTokens.css` |
| Proof | `appearanceTheme.test.ts` + `AppearanceThemeSection.test.tsx` + browser D06 light |

---

## GREEN rows (working wire)

| Id | Screen | Kind | API / path | DB / store | Save | Reload persists | Consumer leak |
|----|--------|------|------------|------------|------|-----------------|---------------|
| `name` | edit-profile | field | via `updateProfile` | product profile | with Save | yes (session) | none |
| `username` | edit-profile | field | via `updateProfile` | product profile | with Save | yes | none |
| `save` | edit-profile | action | `updateProfile` | profile | yes | yes | none |
| `home-timezone` | location-travel | field | via `updateHomeTimezone` / `getHomeTimezone` | home TZ store | with Save | yes | none |
| `save-home-timezone` | location-travel | action | `updateHomeTimezone` | home TZ store | yes | yes | none |
| `travel-mode` | location-travel | nav (read) | `getHomeTimezone.active` | projection | n/a | yes | none |
| `assist` | calls-assist | toggle | `get/updateAssistPreference` | assist prefs | immediate | yes | none |
| `messages-calls` | notifications | toggle | `updateMessagingPreferences(message_notifications_enabled)` | messaging prefs | immediate | yes (parent props) | none |
| `read-receipts` | notifications | toggle | `updateMessagingPreferences(read_receipts_enabled)` | messaging prefs | immediate | yes | none |
| `this-phone` | linked-devices | nav (info) | local session | this device | n/a | session-scoped | none |
| `linked-from-account` | account-security | nav | opens `linked-devices` | n/a | n/a | n/a | none |
| `delete-account` | account-security | action | opens nested delete | n/a | n/a | n/a | none |
| `keep-account` | delete-account | action | local dismiss | n/a | n/a | n/a | none |

### Filed GREEN sections (same destination file)

| Section | Host screen | Wire | Notes |
|---------|-------------|------|-------|
| `WhatOpalCanDoSection` | calls-assist | `list/grant/revokeConsent` | `calls_outbound`, `bookings_reserve` GREEN |
| `WhatOpalRemembersSection` | privacy | memory facts, relationships, trust | RU-1/RU-2 live |
| `CelebrationsSection` | privacy | celebrations product API | Phase 10A / D-2 |
| `InviteFriendsSection` | feed-discovery | product invites | NE-1 |
| `SpendingComfortSection` financial | spending-fit | `get/set/deleteFinancialProfile` | trusted+ gate |
| `SpendingComfortSection` wallet | spending-fit | `getOpalWallet`, threshold patch, checkout/load | Load may no-op with consumer-safe copy (no Stripe name) |

---

## HIDE rows (Pass B — inventory kept, not painted)

Consumer paint rule (Pass B): `"blockedReason" in row && row.blockedReason) return null`.

| L# | Screen | Id | Title | Prior blockedReason (internal only) | Hide now? | Real wire later? |
|----|--------|-----|-------|--------------------------------------|-----------|------------------|
| 143 | edit-profile | `bio` | Bio | Bio is not on the user profile API yet — name and username save. | **YES** | profile bio field |
| 163 | privacy | `graph-visibility` | Graph visibility | Needs per-Graph audience API — not wired yet. | **YES** | Graph audience API |
| 171 | privacy | `exact-location` | Exact location after join | Needs live location share session API. | **YES** | location session |
| 179 | privacy | `public-counts` | Public engagement counts | Needs engagement-count preference on SocialMoments. | **YES** | SocialMoment prefs |
| 187 | privacy | `join-requests` | Join requests | Join-request policy API not shipped. | **YES** | join policy |
| 194 | privacy | `blocked-muted` | Blocked & muted | Use Safety → Blocked / Muted once those lists ship. | **YES** | safety lists |
| 212 | feed-discovery | `people-first` | People you know first | Feed ranking prefs need a product preferences API. | **YES** | prefs API |
| 220 | feed-discovery | `local-discovery` | Local discovery | Needs location permission + discovery index. | **YES** | discovery index |
| 228 | feed-discovery | `nearby-range` | Nearby range | Needs discovery-distance preference API — not wired yet. | **YES** | distance prefs |
| 235 | feed-discovery | `suggested-people` | Suggested people | Suggested-people ranking not exposed as a preference yet. | **YES** | ranking prefs |
| 243 | feed-discovery | `suggested-experiences` | Suggested experiences | Suggested-experiences preference API not shipped. | **YES** | experiences prefs |
| 274 | location-travel | `timing` | Use location for timing | Needs device location permission + ETA service. | **YES** | ETA service |
| 282 | location-travel | `live-share` | Share live location | Live share needs a time-bounded location session API. | **YES** | location session |
| 297 | location-travel | `home-area` | Home area | Home-area editor needs places storage. | **YES** | places storage |
| 304 | location-travel | `map-handoff` | Map handoff | Map deep-link preference not persisted yet. | **YES** | deep-link prefs |
| 322 | engagement | `like-counts` | Public like counts | Needs SocialMoment engagement preference fields. | **YES** + hub hidden | SocialMoment prefs |
| 330 | engagement | `view-counts` | Public view counts | Needs SocialMoment engagement preference fields. | **YES** + hub hidden | SocialMoment prefs |
| 338 | engagement | `reposts` | Allow reposts | Repost permission flag not on content schema yet. | **YES** + hub hidden | content schema |
| 346 | engagement | `comments` | Comments | Comment audience picker needs content ACL API. | **YES** + hub hidden | ACL API |
| 353 | engagement | `private-history` | Private shared history | Already private by product law — no toggle surface yet. | **YES** + hub hidden | none (law note only) |
| 379 | calls-assist | `ask-every` | Ask on every call | Per-call confirm needs Assist prompt UI on call start. | **YES** | Assist prompt UI |
| 387 | calls-assist | `suggest-graphs` | Suggest Graph ideas after calls | Post-call Graph suggestions need call→Graph bridge. | **YES** | call→Graph bridge |
| 395 | calls-assist | `remember-signals` | Remember useful call signals | Call-signal memory needs Assist retention policy API. | **YES** | retention policy |
| 403 | calls-assist | `call-privacy` | Call privacy | Call retention policy screen not built. | **YES** | retention screen |
| 435 | notifications | `graph-changes` | Graph changes | Push category needs Expo rebuild + APNs project credentials. | **YES** | push categories |
| 443 | notifications | `live-movement` | Live movement | Push category needs Expo rebuild + live-location session. | **YES** | push + location |
| 451 | notifications | `social-activity` | Social activity | Social push categories need Expo rebuild + preference API. | **YES** | push prefs |
| 459 | notifications | `critical-timing` | Critical timing | Critical timing push needs reservation hold → APNs path. | **YES** | reservation→APNs |
| 485 | linked-devices | `desktop` | Desktop session | QR desktop linking needs signed session mint API. | **YES** | session mint |
| 497 | linked-devices | `revoke` | Revoke a device | Session revoke UI needs device roster API. | **YES** | device roster |
| 510 | safety | `blocked` | Blocked people | Block list UI needs TrustSafety block list endpoint wired. | **YES** + hub hidden | TrustSafety UI |
| 517 | safety | `muted` | Muted people | Mute list UI needs conversation mute roster. | **YES** + hub hidden | mute roster |
| 524 | safety | `reported` | Reported content | Report history surface not built. | **YES** + hub hidden | report history |
| 531 | safety | `unknown` | Unknown contact requests | Cold-contact policy API not shipped. | **YES** + hub hidden | cold-contact policy |
| 538 | safety | `location-safety` | Location safety | Depends on live-location session API. | **YES** + hub hidden | location session |
| 561 | spending-fit | `learn-choices` | Learn from my choices | Preference learning toggle needs recommend feedback store. | **YES** | feedback store |
| 569 | spending-fit | `budget-private` | Keep my budget private | Already private by financial profile policy — no separate flag. | **YES** | none (policy) |
| 577 | spending-fit | `ask-when-cost` | Ask only when cost matters | Cost-interrupt policy not separate from comfort level yet. | **YES** | cost policy |
| 585 | spending-fit | `trip-goals` | Trip goals | Trip goal objects not in Trips domain yet. | **YES** | Trips domain |
| 592 | spending-fit | `per-graph-fit` | Per-Graph fit | Per-Graph spend override needs Graph settings API. | **YES** | Graph settings |
| 610 | account-security | `phone` | Phone number | Change-phone requires re-verify OTP flow — not exposed yet. | **YES** | change-phone OTP |
| 624 | account-security | `two-step` | Two-step security | Phone OTP is the second factor today — no extra step UI. | **YES** | 2FA UI |
| 631 | account-security | `session-alerts` | Session alerts | Needs push + session event feed. | **YES** | session events |

**Also HIDE (non-SCREENS):**

| Location | What | Prior consumer leak |
|----------|------|---------------------|
| Edit profile avatar (was ~L863) | Photo upload affordance | `Photo upload needs media storage — next build` — **removed** |
| `ACT_ON_BEHALF_CAPABILITIES` | `messaging_business` | `Business messaging needs a Twilio/business channel connector — not configured.` — **removed from array** |

---

## Consumer technical leak inventory (pre–Pass B → disposition)

Exact pre-Pass B strings that violated `CONSUMER_TECHNICAL_LEAK=0` (API names, “not wired”, “next build”, infra jargon). Line numbers refer to **pre-edit** inventory; disposition is current.

| File:line (pre) | String (excerpt) | Disposition |
|-----------------|------------------|-------------|
| YouSettingsDestination.tsx:149 | Bio is not on the user profile API yet… | HIDE row |
| :165 | …API — not wired yet. | HIDE |
| :173 | …location share session API. | HIDE |
| :181 | …preference on SocialMoments. | HIDE |
| :192 | Join-request policy API not shipped. | HIDE |
| :199 | …once those lists ship. | HIDE |
| :214 | …product preferences API. | HIDE |
| :222 | …discovery index. | HIDE |
| :233 | …API — not wired yet. | HIDE |
| :237 | …preference yet. | HIDE |
| :245 | …API not shipped. | HIDE |
| :276 | …ETA service. | HIDE |
| :284 | …location session API. | HIDE |
| :302 | …places storage. | HIDE |
| :309 | …not persisted yet. | HIDE |
| :324/:332 | …SocialMoment… | HIDE |
| :340 | …content schema yet. | HIDE |
| :351 | …content ACL API. | HIDE |
| :355 | …no toggle surface yet. | HIDE |
| :381/:389/:397/:408 | Assist/call bridge/API/not built | HIDE |
| :437/:445/:453/:461 | Expo / APNs | HIDE |
| :470 | Expo Dev Client rebuild with APNs | **rewritten** consumer-safe |
| :490/:507 | session mint / device roster API | HIDE |
| :495 | signed desktop session API — not in this build | **removed** note |
| :520–548 | TrustSafety / mute / not built / API | HIDE + hub |
| :553 | Backend TrustSafety exists… | **rewritten** |
| :568–602 | feedback store / Trips / Graph settings API | HIDE |
| :620/:634/:641 | OTP / not exposed / session feed | HIDE |
| :671–672 | Account deletion endpoint is not exposed yet… | **replaced** with support note |
| :679 | Server must revoke sessions… | **removed** (eng note) |
| :863 | Photo upload… — next build | **removed** |
| :973 | Not available in this build | dead path after hide |
| :1189–1190 | Twilio/business channel… | **capability hidden** |
| :1502/:1511/:1621 | Stripe is enabled / connected | **rewritten** consumer-safe |

Render fallback `"Not available in this build"` remains in dead code paths only; blocked rows no longer reach it.

---

## Exact Pass B patch list (implemented)

| # | File | Change |
|---|------|--------|
| 1 | `YouSettingsDestination.tsx` | Early `return null` for any row with `blockedReason` (consumer hide) |
| 2 | `YouSettingsDestination.tsx` | Remove photo “next build” span |
| 3 | `YouSettingsDestination.tsx` | Rewrite `notif-law`, `device-note`, `safety-note`, `location-law`; drop `link-qr-soon` + `delete-law` |
| 4 | `YouSettingsDestination.tsx` | Replace `confirm-delete` blocked action with consumer support note |
| 5 | `YouSettingsDestination.tsx` | Remove `messaging_business` from `ACT_ON_BEHALF_CAPABILITIES` |
| 6 | `YouSettingsDestination.tsx` | Wallet load copy: no Stripe / “not connected” infra names |
| 7 | `OpalApp.tsx` | Hide Engagement + Safety hub rows; honest hub subtitles |
| 8 | `settingsWireClass.ts` | `nearby-range` → `HIDDEN`; Pass B classifier comments |
| 9 | Tests | `settingsWireClass`, `youSettingsComingSoon`, `youSettingsRender`, `WhatOpalCanDo`, `waveBSection06Paint`, wallet mocks in `WhatOpalRemembersSection` |

**Vitest (Pass B touch):** 9 files / 42 tests passed.

---

## HIDE immediately vs real wire path

### Hide immediately (no backend required) — done

All 43 SCREENS `blockedReason` rows + photo + messaging_business + empty Engagement/Safety hub entries.

### Real wire path already exists (keep GREEN)

`save`, `save-home-timezone`, `travel-mode`, `assist`, `messages-calls`, `read-receipts`, `this-phone`, `linked-from-account`, `delete-account` (nav), `keep-account`, plus filed consent / memory / celebrations / invites / spending / wallet.

### Real wire path possible later (un-hide only when GREEN)

Priority candidates when product APIs ship: TrustSafety block/mute lists, change-phone OTP, account delete endpoint, push category prefs (after Expo/APNs), discovery-distance, Graph audience, Assist ask-every / retention.

---

## Summary for steward

| Metric | Value |
|--------|------:|
| GREEN (SCREENS controls) | **13** |
| HIDE (SCREENS controls) | **43** |
| BLOCKED_INTERNAL (consumer-painted) | **0** |
| Theme Appearance System/Dark/Light | **GAP — missing** |
| Pass B implemented in `apps/opal_web` | **YES** |
| Pass 2 unlock | **NO** |
| Track B WebRTC touched | **NO** |
