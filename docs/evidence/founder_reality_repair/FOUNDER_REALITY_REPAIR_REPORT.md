# Founder Reality Repair — Closure Report

**Branch:** `muse/packet-b-batch-2`  
**Classification:** P0 foundation infrastructure GREEN · Consumer experience coherence HOLD  
**Freeze:** **HOLD**  
**Pass 2:** **LOCKED** (`PASS2_UNLOCKED = NO`)

Automated gates previously reported green slices. Founder iPhone walk proved the product experience was not coherent end-to-end. This tranche repaired shared shell + first-run coherence without touching architecture, intelligence, or Pass 2.

---

## ROOT CAUSES

1. **Global mobile shell** — `.tabbar.tabbar-option-b` was `position: absolute` inside `.app`. When the shell/content ancestry scrolled or grew past the viewport, the dock moved with content. Native-host rules did not force a hard `100dvh` clip on every member path.
2. **Permission granted visuals** — CSS treated `data-perm-decision="allowed"` the same as `:disabled` (muted gray). Founder saw Allow → muted as if nothing happened.
3. **Meet identity FSM** — Username collision ran on sticky Continue *after* first-person. Accept only cleared status text (`DEAD_ACCEPT`). Name Continue advanced without committing handle (`LATE_USERNAME_COLLISION`).
4. **Meet / permission copy** — Marketing greeting + internal “in You” wording + broken-feeling contacts fallback.
5. **Cross-surface bleed** — `dismissHomeChildren` never cleared `newChatOpen` / plan composer / find-people, so New Chat could paint over Graphs.
6. **Profile name persist (native)** — Edit Profile updated React + localStorage but never `notifyNativeHostSession`; ProductWebSurface ignored `opal_native_session` on the member path; native boot trusted stale SecureStore inject without `/session` refresh.
7. **Splash brand** — Absolute Figma-stage geometry + residual wordmark CSS path; letter-band near-white opaque pixels in lockup asset (punched enclosed counters).

---

## PRESERVED

- P0 onboarding order: Splash → Splash 2 → Phone → OTP → Permission Bootstrap → Meet → Home
- Splash 2 Promise asset / presentation
- Permission-first bootstrap stage
- Relationship Access / ConsentProof / YOU Trust Model / Continuous Permission / Graphing substrate
- Context Ownership / Temporal Truth / Gyroscope laws (untouched)
- Opal Center action ceilings / person-agnostic relationship model
- Real Chats / Calls / Graphs backend wiring
- Pass 2 remains LOCKED

---

## REPAIRED

| Area | Change |
|------|--------|
| App shell | Native-host dock `position: fixed`; app/`#root` hard `100dvh` + `overflow: hidden`; independent pane scroll |
| Center stage | Ambient destination fills real viewport on phone (desktop ≥520 keeps 390 stage) |
| Splash | Flex hero/actions; one lockup img; wordmark CSS `display:none`; cache-bust; counter alpha punch |
| Permissions | Copy without “You”; granted = glow + “Allowed ✓”; declined distinct |
| Meet copy | Companion greeting; “What's your name?”; short handle quiet line; contacts fallback intentional |
| Meet FSM | `commitIdentityAndAdvance` before friend; Accept commits suggested handle; sticky finish requires `handleCommitted` |
| Meet layout | Settled turns hide composers; primary turn spacing |
| Surface bleed | `dismissHomeChildren` clears New Chat / plan composer / find-people; conversation dock mirrors clears |
| Profile persist | `onProfileSaved` → `notifyNativeHostSession`; native boot refreshes from `GET /session`; ProductWebSurface `onSession` → SecureStore + App state |

---

## FOUNDER ISSUES REPRODUCED (from walk brief)

- Splash collage / counter opacity concern
- Permission Allow → muted
- Meet marketing voice
- Dead Continue / late username / Accept no-op
- Dock moves / content trapped / inputs behind dock
- New Chat over Graphs
- Name update does not survive native reload
- Contacts fallback feels broken

---

## FOUNDER ISSUES CLOSED (code + automated mobile proof)

| Issue | Status |
|-------|--------|
| Dock moves with scroll | **CLOSED** in automation — `DOCK_FIXED=YES` @ 390/393/430 |
| Splash runtime logo count | **CLOSED** — `SPLASH_RUNTIME_LOGO_COUNT=1`, `DOUBLE_COMPOSITION=0` |
| Permission granted look | **CLOSED** in code/CSS |
| Meet companion copy + FSM | **CLOSED** in code + vitest |
| Cross-surface New Chat bleed | **CLOSED** in code |
| Profile native persist bridge | **CLOSED** in web + native host code |
| Letter counters near-white | **IMPROVED** — band near-white opaque 46 (was 19k+); `COUNTERS_TRUE_ALPHA=YES` in asset proof |

---

## NATIVE-ONLY REMAINING

- Full physical founder re-walk on iPhone (TestFlight / Expo WebView) remains the acceptance authority for investor-touch readiness.
- Keyboard-open composer clearance on device (automation used viewport shrink only).
- Native contacts path (browser staging stays honest typing fallback).
- Residual anti-aliased letter edges may still read “bright” on some displays — founder screenshot is final arbiter for Splash brand.

---

## TRUE EXTERNAL BLOCKERS

- None introduced by this tranche.
- Browser Contact Picker / WebView contacts remain a platform limitation (honest fallback retained).

---

## STILL RED / HOLD

- **FREEZE = HOLD** until founder repeats the full walk without layout corruption, dead controls, state leakage, or lost navigation.
- **INVESTOR TOUCH READINESS = HOLD** (infrastructure green; coherence pending founder confirmation).

---

## FLAG BOARD

| Flag | Value |
|------|-------|
| `DOCK_FIXED` | **YES** (automated 390/393/430) |
| `SCROLL_OWNERSHIP` | **YES** (shell law; YOU/Center inherit) |
| `KEYBOARD_SAFE` | **PARTIAL** (viewport-shrink proof; device keyboard HOLD) |
| `SURFACE_BLEED` | **0** (code path) |
| `SPLASH_BRAND` | **GREEN** automated / **FOUNDER CONFIRM** |
| `PERMISSION_FEEDBACK` | **YES** |
| `MEET_LAYOUT` | **YES** |
| `IDENTITY_STATE_MACHINE` | **YES** |
| `PROFILE_PERSISTENCE` | **YES** (bridge fixed; founder confirm on device) |
| `CENTER_COMPOSER` | **YES** (existing in-flow + viewport fill) |
| `YOU_SCROLL` | **YES** (shell clip; founder confirm) |
| `DEAD_ACTIONS` | **0** (FSM) |
| `PASS2_UNLOCKED` | **NO** |
| `FREEZE` | **HOLD** |

---

## Proof artifacts

- `docs/evidence/founder_reality_repair/FOUNDER_REALITY_REPAIR_PROOF.json`
- `docs/evidence/founder_reality_repair/SPLASH_LOGO_ALPHA.json`
- `shots/founder_reality_repair/`
- Vitest: onboarding + iphone layout + brand — **164 passed**
- Harness: `apps/opal_web/scripts/_founder_reality_repair_proof.mjs`

---

## Founder re-walk URL

After Vite restart (LAN bind) and hard-refresh / force-quit Expo:

```
http://192.168.86.156:5173/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1
```

Walk: Splash → Splash 2 → Phone → OTP → Permissions → Meet → Name → First Person → Chats → New Chat → Thread → Call → Center → Graphs → YOU → Edit Profile.

Freeze remains **HOLD** until that walk returns clean.
