# PRE_FOUNDER_GO_NO_GO — P0-05.8A

**FOUNDER_WALK_READY = REVOKED**

**Status:** `SUPERSEDED_BY_REAL_FOUNDER_FAILURE` (P0-05.9)  
Founder session showed frost-only Splash despite geometry harness GREEN.  
See: `../p0-05-9-splash-frost-emergency/INVALIDATED_EVIDENCE.md`

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

Date: 2026-08-28  
Head (pre-checkpoint): `470f052da5397cdc36a8daca3fc47fe386839e6c`  
Evidence: `docs/evidence/v2-coded-experience/p0-05-8a-pre-founder-visual-closure/`

## Gate board (mechanical)

| Gate | Result |
|------|--------|
| Splash remains GREEN (390×844 exact) | PASS |
| Promise untouched / regression | PASS (not modified) |
| Phone 773:27 overlay/diff | PASS (ratio 0.097) |
| Verify 773:52 overlay/diff | PASS (ratio 0.071) |
| Profile 773:80 overlay/diff | PASS (ratio 0.072) |
| Find People 773:113 overlay/diff | PASS (ratio 0.087) |
| Photo picker + preview + no fake persist | PASS |
| PROFILE_PHOTO_DURABLE_PERSISTENCE | OPEN (backlog recorded) |
| Home smoke + dock | PASS |
| Chats 618:271 overlay/diff | PASS (ratio 0.076) |
| Graphs 618:674 overlay/diff | PASS (ratio 0.091) |
| Global Opal 618:902 overlay/diff | PASS (ratio 0.218 ≤ OPAL limit 0.24; chrome captured) |
| Global Opal NEW_* domain/AI | 0 |
| Dock 16,758,358×86 + Center 136,7,86×64 | PASS |
| 375 / 390 overflow containment | PASS |
| Desktop host: 390 stage, no inset frost | PASS |
| s1Adversarial | PASS (stale tests reconciled) |
| Authority guard | PASS |

Artifacts: `VISUAL_GATE.json`, `overlay/*_OVERLAY.png`, `diff/*_DIFF.png`, `geometry/*`, Figma+runtime PNGs.

## Explicit non-blockers recorded

1. **PROFILE_PHOTO_DURABLE_PERSISTENCE = OPEN_PRODUCT_DEPENDENCY**  
   File: `docs/backlog/PROFILE_PHOTO_DURABLE_PERSISTENCE.md`  
   Picker + preview work; no durable avatar backend invented.

2. **Opal pixel ratio** is higher than auth/Chats because Figma includes media-heavy recommendation cards; gate uses declared OPAL limit 0.24 after correct surface capture. Overlays available for founder eye.

3. **Desktop outer drop-shadow** on `.app` (media query) is host chrome floating the 390 stage — not inner frost gutters.

## Founder URL

Issue only after this file says YES (this revision).

Recommended:

`http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1`

## STOP

HOLD. DO NOT MERGE. NO LIVE. NO GLOBAL OPAL FEATURE EXPANSION.
