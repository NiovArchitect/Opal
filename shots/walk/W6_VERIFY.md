# Paste W6 VERIFY — Color law, Meet repair, OTP keypad, thread chrome, live Center

**Branch:** `muse/packet-b-batch-2`  
**Base tip:** `7853ec83` (W5) · Phase 0 tip `87d3304b` · evidence tip recorded in `W6_VERIFY.json`  
**Law:** Screenshot green is not done. Phone / native-host 390×844 is authority.  
**Script:** `shots/walk/verify_paste_w6.mjs` (+ finish pass) → `W6_VERIFY.json` **42/42 PASS**

---

## Phase 0 — OTP Verify vs keypad (BLOCKER)

| | |
|--|--|
| **Cause** | Absolute / bottom-anchored Verify sat on the code boxes when the iOS keypad opened. |
| **Fix** | Document-flow column: character lockup → "Enter the code." → subline → six boxes → Verify below. `position: relative !important` on verify primary + code wrap. |
| **Brand** | Character lockup (`opal-character.png` + Opal wordmark). Abstract OPALGRAPH mark removed from first-run verify. |
| **Proof** | `w6_00_otp_keyboard_open.png` + `w6_otp_layout.json` |
| **Assert** | Verify frame does not intersect any code-box frame (keyboard sim maxHeight 480). Six boxes visible above keypad. Verify `position: relative`. |

Checks: `p0_*` all PASS.

---

## Phase 1 — Meet Opal repair

| Item | Spec | Proof |
|------|------|-------|
| Headline | "Hey, I'm Opal." | `w6_01_meet_opal.png` |
| Subhead | "Real people. Brighter together." | same |
| Value lines | three punchy lines (no em-dashes) | same |
| Username | "You'll be @sadeil. Change anytime in settings." | `hs-self-username-hint` |
| Permissions | "A few permissions, all worth it." + Contacts / Notifications / Location Allow+Not now | `hs-permissions` |
| Continue | tappable in all-Not-now | `p1_continue_all_not_now` |
| Landing | Opal Center ("Your day has room.") | `w6_01b_after_continue.png` · `p1_lands_center` strip |

`forceMeetOpal` now respects `showFirstRun` so Continue can leave Meet and open Center.

---

## Phase 2 — Canonical pill colors + kill Technicolor

| State | Fill | Text |
|-------|------|------|
| happening / confirmed / live | `#00E5FF` | `#FFFFFF` |
| action needed | `#FF4D5E` | `#FFFFFF` |
| ready / upcoming | `#FFC86B` | `#0A0F1E` |
| past | `#FFFFFF` | `#0A0F1E` |
| forming / idea | `#8B5CF6` | `#FFFFFF` |

Source: `apps/opal_web/src/theme/planStateColors.ts` (sole state-color authority).

Brown / dark wash kill: `W6_BROWN_GREP.txt` empty for `#E8D6C4`, `#1a2233`, `#1a4a5c`, `rgba(180,120,100,…)`. Pill proof: `w6_02_chats_pills.png` + `w6_pill_colors.json`.

---

## Phase 3 — Brand life

| Item | Treatment | Proof |
|------|-----------|-------|
| Avatar tiles | Ear palette gradient by contact id hash; white bold initial | `contactAvatar.ts` + thread/list |
| Bubbles | Self `#00E5FF` @18% + 1px border; friend `#8B5CF6` @18% + 1px; white text | `w6_04b_maya_thread.png` · `w6_bubble_colors.json` |
| Graphs cards | You-settings gold standard (`#050816` + cyan→violet→pink border) + state pills | `w6_03_graphs_timeline.png` (Timeline mode) |
| You settings card | Untouched (gold standard reference) | — |

---

## Phase 4 — Thread chrome

| Item | Result | Proof |
|------|--------|-------|
| Single back chevron | One `gpt-back` SVG on Chanelle + Maya | `w6_04_chanelle_thread.png`, `w6_04b_maya_thread.png` |
| History glyph | Shared-plans (two overlapping rounded rects + check), not clock | `p4_history_shared_plans_glyph` rects=2 |
| Sheet copy | Untouched ("message or call / shared plans / memories together") | — |
| Chat-row photos | Chanelle Direct `618:351` raster on list row | `p4_chanelle_row_photo` |

---

## Phase 5 — Opal Center now strip live

| | |
|--|--|
| Tick | `STRIP_TICK_MS = 60_000` while strip visible |
| Shape | Now + next two only |
| Honesty | Sample day attribution when calendar unlinked (`data-strip-source=sample`) |
| Proof | `w6_05_center_now_t0.png` + `w6_05_center_now_t1.png` (~62s apart) · `w6_center_strip_t0.json` / `_t1.json` |

---

## Phase 6 — Audit

| Gate | Result |
|------|--------|
| Playwright 390×844 | **42/42 PASS** |
| Vitest (W6 suites) | planStateColors, otpVerifyLayout, holyShitFirstRun, centerNowStrip, opalCenterLifeGraph, pasteW4DeviceFixes, founderChatsPlanPills green |
| `tsc --noEmit` | Clean after Wordmark import + minimal pre-existing type fixes (`calendar_unavailable`, Lives `title`) |
| mix test | 2177 tests; 7 failures pre-existing and outside W6 (cold_start quiet hours, profile S1, push worker, celebrations, conversation plan, opal_context preferences) |
| OTP SMS `307937` | Did not match open Twilio challenge after prior wrong-code / re-challenge SMS supersession. Evidence used keyboard-open layout proof + native-session seed shell for member surfaces. No further SMS burns. |

---

## Evidence files

- `shots/walk/W6_VERIFY.json`
- `shots/walk/w6_00_otp_keyboard_open.png`
- `shots/walk/w6_01_meet_opal.png` / `w6_01b_after_continue.png`
- `shots/walk/w6_02_chats_pills.png`
- `shots/walk/w6_03_graphs_timeline.png`
- `shots/walk/w6_04_chanelle_thread.png` / `w6_04b_maya_thread.png`
- `shots/walk/w6_05_center_now_t0.png` / `w6_05_center_now_t1.png`
- `shots/walk/w6_otp_layout.json`, `w6_pill_colors.json`, `w6_bubble_colors.json`, `w6_center_strip_t*.json`, `W6_BROWN_GREP.txt`
