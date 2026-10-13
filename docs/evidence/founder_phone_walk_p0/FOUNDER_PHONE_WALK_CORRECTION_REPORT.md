# P0 — Founder Phone Walk Correction (consumer reality repair)

Branch: `muse/packet-b-batch-2`  
Tip: `5b9827f5`  
Operating law: **PRESERVE → CORRECT → CONNECT → POLISH → REGRESSION PROVE**  
Pass 2: **LOCKED** (`PASS2_UNLOCKED=NO`)  
Context Ownership / Temporal Truth: **architecture-only, preserved**

This tranche repairs first-run + YOU consumer surfaces from a real founder iPhone walk. It does **not** implement intelligence.

---

## PRESERVED

- Relationship Access substrate, ConsentProof, standing Graphing, use ≠ disclose
- YOU Trust Layer / Access vs Action architecture
- Opal Center repairs, Dynamic Relationship Clarification
- Context Alignment / Gyroscope architecture docs (no Pass 2 activation)
- Brand V4 palette and approved Splash 2 Promise PNG
- Contacts resolve path (`/api/v1/product/contacts/resolve`) + privacy: only selected contact leaves device
- `shouldUseNativeContactsBridge()` still requires real `ReactNativeWebView` (query `?opal_native_host=1` alone is insufficient)
- Chats / Calls / Graphs / Home prior GREEN behavior (not rewritten)

## FIXED

1. **Brand lockup single source**
   - Production Splash 1 uses `opalLogo` only (no OPAL GRAPH text)
   - Nested `fr00` / `BrandChrome` / Act-on-behalf header: lockup-only (no double composition)
   - `opalGraphEmblemHero` documented as lockup alias, not emblem-only
   - PNG RGBA integrity asserted in vitest (`color_type === 6` for logo/wordmark)

2. **One Splash owner**
   - Production Splash 1 = `FirstRunSplashPage` (`data-splash-owner="FirstRunSplashPage"`)
   - Nested FRE `fr00` remains for legacy/tests only; OpalApp mounts FRE as `sign_in` (phone)

3. **Two-splash journey restored + Skip ambiguity removed**
   - New-user path: Splash 1 → Splash 2 → Phone
   - **Skip intro removed** from production Splash 1 (`AMBIGUOUS_SKIP_INTRO_CONTROL = REMOVE`)
   - Only **I already have an account** bypasses to Phone

4. **Permission bootstrap before Meet payoff**
   - New stage `permission_bootstrap` after OTP
   - `PermissionBootstrapPage` owns contacts / notifications / location Allow + Not now
   - Meet Opal no longer embeds permissions on the same scrolling form

5. **Meet progressive order**
   - Meet turns: `name → friend → ready`
   - Sticky Continue after name + first person (or skip friend)
   - Auto username preserved; contact resolve preserved

6. **Phone autofill display**
   - `splitPhoneForDisplay()` strips matching country prefix from national field
   - Selector owns dial; national field shows local digits
   - Proven: `+18585551212` with +1 → national `8585551212`

7. **YOU consumer declutter**
   - Spending: shortened lede; architecture notes removed; comfort controls preserved
   - Fit: **honestly hidden** from consumer hub (`FIT_PLACEHOLDER_PAGE = 0`) — no wellness preference seam

## IMPROVED

- Permission setup → Meet payoff emotional sequence
- Browser contacts honesty retained (no fake native access)
- Stale CSS absolute-geometry tests updated to match document-flow auth shell

## NATIVE-ONLY PROOF STILL REQUIRED

- Real iOS Contacts Allow → device contacts → type name → match → resolve
- Requires TestFlight / native host with `ReactNativeWebView`
- Browser staging correctly cannot prove native contacts

## GENUINELY MISSING

- Fit preference persistence model (hidden until real seam exists)
- Calendar / microphone as separate bootstrap rows (not claimed; only real capability boundaries shown)
- Wallet load / payment consumer controls (remain hidden / legally gated)

---

## Metrics

| Metric | Result |
|--------|--------|
| `SPLASH_SINGLE_OWNER` | YES |
| `SPLASH_2_RUNTIME` | GREEN |
| `BRAND_ALPHA` | GREEN (RGBA logo/wordmark; counters transparent samples present) |
| `DOUBLE_COMPOSITION` | 0 (production first-run paths) |
| `PHONE_AUTOFILL` | GREEN (`VISIBLE_DUPLICATE_COUNTRY_CODE = 0`) |
| `PERMISSION_BOOTSTRAP_ORDER` | GREEN |
| `MEET_OPAL_PROGRESSIVE_FLOW` | GREEN |
| `FIRST_CONTACT_RESOLVE` | GREEN (code path preserved; native match NATIVE-ONLY) |
| `YOU_CONSUMER_NOISE` | GREEN |
| `SPENDING` | GREEN |
| `FIT` | HONESTLY_HIDDEN |
| `DEAD_ACTIONS` | 0 (this tranche) |
| `FAKE_SUCCESS` | 0 |
| `TECH_LEAK` | 0 (blockedReason still inventory-only) |
| `PRIOR_GREEN_REGRESSIONS` | 0 (P0 vitest suite green) |
| `PASS2_UNLOCKED` | NO |
| `NEW_USER_SKIP_SPLASH_2` | NO |
| `AMBIGUOUS_SKIP_INTRO_CONTROL` | REMOVED |

---

## Proof

- Vitest (85): onboarding + brand + YOU suites
- Playwright clean first-run: `shots/founder_phone_walk_p0/VERIFY.json`
  - Splash 1 → Splash 2 → Phone
  - Skip intro absent
  - Returning account → Phone
  - Autofill strip GREEN
- Shots: `01_splash1.png` … `05_returning_account_phone.png`

## Key files

- `apps/opal_web/src/onboarding/FirstRunSplashPage.tsx`
- `apps/opal_web/src/onboarding/PermissionBootstrapPage.tsx`
- `apps/opal_web/src/onboarding/MeetOpalConversation.tsx`
- `apps/opal_web/src/onboarding/FirstRunExperience.tsx` (`splitPhoneForDisplay`)
- `apps/opal_web/src/OpalApp.tsx` (stage machine)
- `apps/opal_web/src/opalUi/YouSettingsDestination.tsx`
- `apps/opal_web/scripts/_p0_first_run_proof.mjs`
