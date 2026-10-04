# Phase 9A — end-to-end integration proof

Branch: `muse/packet-b-batch-2`  
Evidence: `shots/p9a/`  
No new features. No copy changes. No merge.

## Journeys

### 1. ONBOARD → CONSENT — **PROVEN**
- Activate → POST grant `calls_outbound` + `bookings_reserve` → GET `/consents` lists both.
- FE: `what-opal-can-do` + fr10 ActOnBehalfOptIn (vitest 7/7 + browser You hub @ 390).
- Evidence: `mix_integration.log` J1; `you_hub_390.png`; `fe_surfaces.log`.

### 2. TRIP → CURATE → PLAN → LEARN — **PARTIAL (1 BREAK)**
- **PROVEN:** Create Joshua Tree trip → curate 7 (lodging/activity/meal) → add meal leg → create-plan (tentative, `source=trip_leg`) → accept-going (both participants) → HTTP accept-going 200.
- **PROVEN (5C path):** Durable italian preference → Palm Springs curate ranks Birba first.
- **BROKEN (escalation):** `accept_going` on a trip-leg plan does **not** call `PlanAgreementTasteBridge`. Plan stays `tentative`. Zero `taste:*` candidates after accept.
  - **Where:** `JourneyAuthority.accept_going/2` vs `PlanAgreementTasteBridge.after_agreed/1` (wired only on `activate` `:created` and SocialFlow agree).
  - **Why:** 5A was scoped to SharedPlan → `agreed` with recommendation context. Trip legs carry `place_label` only — wiring blind would invent taste attrs.
  - **Fix:** Focused follow-up paste (design call): when/whether trip-leg plans transition to `agreed` and what attrs to extract.
- Evidence: `mix_integration.log` J2; `curate_joshua_tree.json`; `trip_detail_390.png`; `suggest_panel_390.png`.

### 3. TEMPORAL — **PROVEN**
- Seed 8 Friday-evening agreed plans → `TemporalHabitMiner.mine/1` → `temporal:prefers:friday_evening` candidate.
- Evidence: `mix_integration.log` J3.

### 4. PUSH — **PROVEN**
- Register mock `ExponentPushToken[…]` → ingest urgent → `DeliverPushWorker` → Expo adapter ticket (not synthetic).
- Evidence: `mix_integration.log` J4.

### 5. MEMORY TRANSPARENCY — **PROVEN**
- List facts with plain labels → Forget → DB `deletion_state=forgotten` + empty list → ranking equalizes (italian boost removed, engine still works).
- FE: `what-opal-remembers` present on You hub.
- Evidence: `mix_integration.log` J5; `you_hub_390.png`; WhatOpalRemembers vitest 3/3.

### 6. SMS — **PROVEN**
- No Twilio env → adapter `{:disabled, :account_creds_missing}` → invitation 201 with `sms_sent=false`, `honest_no_production_sms=true`, no crash.
- Evidence: `mix_integration.log` J6.

## Regression
- A8 surface projection: **13/13**
- FE surfaces (consent / fr10 / trips / memory): **29/29**
- Browser @ 390: **GREEN** (`browser_VERIFY.json`)

## Close

**The product is HAS 1 BREAK.**

Break: trip-leg `accept_going` ↛ 5A taste candidates (design escalation — do not invent wire).
All other requested journeys are PROVEN end-to-end.
