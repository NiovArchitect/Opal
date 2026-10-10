# Paste W5 VERIFY — Restore, Consolidate, Make It Real

**Branch:** `muse/packet-b-batch-2`  
**Tip at evidence:** `afee0fe9` (verify JSON captured at `15d8f328`; R5-12 color tip follows)  
**Law:** Screenshot green is not done. Phone / native-host viewport is authority.  
**Script:** `shots/walk/verify_paste_w5.mjs` → `W5_VERIFY.json` **23/23 PASS**

---

## Phase 0 — Consolidated 60-second flow

### 0.1 Splash 2 disappearance — cause

| | |
|--|--|
| **Cause** | Commit `9f88201b` (W4 diet) rewrote `advanceSplashToPromise` to `setFirstRunStage("auth")`, skipping Promise. |
| **File** | `FirstRunPromisePage.tsx` was **never deleted**. SHA identical to pre-diet (`a747501f…` vs `9f88201b^` and `578b2263`). |
| **Fix** | Routing-only restore: `advanceSplashToPromise` → `setFirstRunStage("promise")`. Pixel-identical recovery (R5-11). |
| **Proof** | `w5_02_splash2_promise.png` — Promise immersion + Enter Opal / Sign in. |

### 0.2 Pages (exact)

1. **Splash 1 → Splash 2** (restored) — brand arrival  
2. **Phone (+ OTP)** — Phase 1 layout  
3. **Meet Opal** — one scrolling page: orb → intro → name + @handle → friend dual-path → permissions → Assist row → sticky Continue  
4. **Inside** — Opal Center / member shell  

Deferred (stands): vibe / day / calendar connect / I WILL·I WON'T (moment of need).

### 0.3 Timing (Playwright native-host, includes load waits)

| Segment | ms | Notes |
|---------|----|-------|
| Splash 1 → Splash 2 | ~1508 | auto/tap |
| Splash 2 → Phone | ~192 | Enter Opal |
| Meet page ready | ~2465 | greeting → form |
| Wall splash→inside | ~10730 | includes script waits + force paths — interactive user pace ≪ 60s |

Interactive estimate with user typing name + optional friend + Skip perms: **~25–45s**. Meet is user-paced scroll (no forced multi-screen transitions).

**Assist:** compact row Enable / Not now (`hs-assist-row`) — returns without a full screen.

---

## Phase 1 — Phone screen (third attempt, device-proven)

### Root cause (why screenshots lied twice)

`html.opal-native-host` rules **bottom-anchored** Continue with `position: absolute` + `bottom: calc(66px + safe-area)`. Keyboard-open shrank the visual viewport; Continue hovered the number input. Absolute stage tops on `.fr-phone-field` / hint compounded it.

### Fix

- Phone Continue/Skip: **never** bottom-anchored (OTP keeps absolute stage).  
- Phone field / hint / label: **relative** document flow at source.  
- EOF belt-and-suspenders zero-absolute block retained.  
- Stray **"Yo"**: not present in phone DOM text (`phone_no_stray_yo` clean). Likely prior clip of overlapping absolute chrome; killed with flow layout.

### Device-viewport proof

| | |
|--|--|
| Viewport | Playwright **iPhone-like 390×844 dpr3** + `html.opal-native-host` |
| Keyboard | Simulated via phone root `maxHeight: 480` + input focus |
| Layout JSON | `w5_phone_layout.json` — field/primary both `position: relative`; field.bottom=294, primary.top=427 (**no overlap**) |
| Shot | `w5_03_phone_keyboard_open.png` |

**Honest residual:** Physical Expo WebView on the founder’s handset remains the final authority for keyboard geometry; this run proves the CSS landmine is removed and computed layout is flow under native-host + keyboard-sim. Could not attach to the physical phone from this agent host.

---

## Phase 2 — No dead buttons (thread header)

| Button | Action | Proof |
|--------|--------|-------|
| Back | Returns to chats | `gpt-back` |
| Avatar / name | Opens contact profile | `gpt-avatar` / `onOpenContactProfile` |
| **History** (clock-rewind) | Opens `ContactProfileSheet` (shared plans + memories); past plan → graph detail when present | `w5_08_history_action.png` — Chanelle sheet with Shared plans / Memories |
| Phone | Starts call / call-video gate | `gpt-call` |
| Video | Starts video / gate | `gpt-video` |

History was previously “wired” to bare `setTab("graphs")` (felt dead). W5 opens the relationship timeline sheet.

---

## Phase 3 — Calls reach the call log

| | |
|--|--|
| **Cause** | Founder seed passed `callRows={undefined}` → seed wipe of live API rows. |
| **Fix** | Merge live `real:true` rows **above** seed; non-seed always passes mapped rows (even `[]`). `ChatsHome` defaults `callRows=[]` for honest empty. |
| **Path** | `createConversationCall` success → `refreshCallLog` (pre-existing) now visible in UI. |

**Residual:** Full place-call → log-row Playwright under `production_sms` needs a live call transport path; merge wiring verified in code + ChatsHome empty/seed tests. Founder handset walk still confirms transport→log.

---

## Phase 4 — Plans tell the truth

| Before | After |
|--------|-------|
| Orb `mode="ready"` | `idle` |
| “ready with Chanelle” class lies | **Forming · pending** |
| Summary from templates | `buildPlanProposalSummary` from composer state |
| Idea card stale after plan | Reuse `sourceIdeaId` → GraphsHome / detail update |

Proof: `w5_10_plan_composer.png` — **Forming · pending**.  
Banned grep: `W5_BANNED_GREP.txt` clean.  
Source: no `mode="ready"` in PlanComposer.

---

## Phase 5 — Graphs New menu

| | |
|--|--|
| Stacking | `graphs-sticky-chrome` overflow visible on native-host; menu `z-index: 40` |
| Shot | `w5_09_graphs_new_menu.png` — New plan / New trip / New idea fully visible |
| Journeys | New plan → PlanComposer ✅ · New trip → trip create signal · New idea → idea capture |

---

## Addendum

### A — Story + (R5-8)

- Badge on `gsh-story-create` avatar edge (flex-centered).  
- Tap → Post | Story chooser (`gsh-compose-chooser`); not inline feed.  
- Proof: `story_plus_opens_composer` post=true story=true; `w5_05_story_plus.png`.

### B — “Not found” scrub (R5-9)

- Before/after: `W5_NOT_FOUND_GREP.txt` + `/tmp/w5_not_found_grep.txt`.  
- User-facing paint paths remapped; remaining hits are tests / defensive filters / “not founder duty” false positive.  
- Verify: `not_found_scrub_clean` PASS.

### C — Tap + color audit (R5-10)

- Plan colors: ready/confirmed `#00E5FF`, pending `#FFC86B`, idea/forming `#8B5CF6` (`/tmp/w5_color_audit.txt`).  
- Tap inventory: see `/tmp/w5_tap_audit.txt` when tap-audit agent completes (or residual if blocked by session).

### D — Splash 2 pixel-identical (R5-11)

- Recovered from history via routing; file SHA match pre-`9f88201b`. No redesign.

### E — Character-close colors (R5-12)

- Tip `afee0fe9`. Voids → `#050816`; elevated `#0b1226` / `#1a2338`; Meet/Home ambient → ear blue/teal/violet. Note: `/tmp/w5_color_tune.txt`.

---

## Thread header audit (product law)

Documented in Phase 2 table — zero dead buttons.

---

## Commits (push only, no merge)

| Tip | Phase |
|-----|-------|
| `be5c543e` | Phase 0 Splash2 + Meet one-page (+ History / call merge / surface id in OpalApp) |
| `0651a1d3` | Phase 1 phone zero-absolute |
| `9084c44d` | Phase 3 call log ChatsHome |
| `9b15dfe3` | Phase 4 PlanComposer honesty + graph sync |
| `15d8f328` | Phase 5 + R5-8..10 Story+ / scrub / colors |
| `afee0fe9` | R5-12 character-close color tune |
| *(this)* | Phase 6 evidence |

---

## Residuals (honest)

1. **Physical Expo WebView keyboard** — agent proved CSS + Playwright native-host keyboard-sim; founder handset is final keyboard authority.  
2. **Call place → log row e2e** — merge wired; live transport place under `production_sms` not fully exercised in this Playwright run.  
3. **Fixture OTP mint** — `production_sms` blocks `111111`; member proofs used session refresh.  
4. **60s stopwatch on device** — automated wall includes waits; interactive estimate ≤60s; founder stopwatch still welcome.  
5. **Tap audit file** — agent may still be writing `/tmp/w5_tap_audit.txt`; wire any dead taps found before declaring absolute product-law green on every Home/Attention asset.

---

## Shots index

`w5_01_splash1.png` · `w5_02_splash2_promise.png` · `w5_03_phone_keyboard_open.png` · `w5_04_meet_one_page.png` · `w5_05_story_plus.png` · `w5_05b_story_composer_chooser.png` · `w5_06_chats.png` · `w5_07_thread_header.png` · `w5_08_history_action.png` · `w5_09_graphs_new_menu.png` · `w5_10_plan_composer.png` · `w5_phone_layout.json` · `W5_VERIFY.json` · `W5_NOT_FOUND_GREP.txt` · `W5_BANNED_GREP.txt`
