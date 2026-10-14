# Founder Reality Repair #3 — Full Requirement Reconciliation

**Branch:** `muse/packet-b-batch-2`  
**Baseline tip (contradiction tip):** `1a5600a1`  
**Closure tip:** see git after this commit  
**Freeze:** HOLD · **Pass 2:** LOCKED  
**Completion states:** `IMPLEMENTED` → `PROVEN` → `FOUNDER ACCEPTED`  
**This tranche reaches:** `PROVEN` (Playwright adversarial). **FOUNDER ACCEPTED = PENDING** until founder phone walk.

## Law compliance

| Law | Applied |
|---|---|
| SIMPLIFY_INTERFACE_NOT_ORGANISM | Restored Continuity→Chat, Fit substrate, Live entry; did not delete organism |
| FUNCTIONALITY_BEFORE_VISUAL | Fit controls + Travel activation before polish |
| PHONE_REALITY_BEATS_AUTOMATION | Ledger admitted tip contradictions; FOUNDER ACCEPTED stays PENDING |
| NO_REQUIREMENT_MAY_DISAPPEAR_SILENTLY | Ledger + this matrix |
| NO_GREEN_WITH_RED_EVIDENCE | `VERIFY.json` overall matches machine evidence; FAKE_SUCCESS=0 |

## Caps (from VERIFY.json)

| Cap | Value |
|---|---|
| FOUNDER_SEED_CHAT_WORLD | YES |
| CALL_TO_CHAT_THREAD | YES |
| CENTER_COMPOSER_PREFOCUS | YES |
| CENTER_KEYBOARD_SAFE | YES (geometry + focus) |
| DOCK_FIXED | YES |
| GRAPH_CREATE_LAYER | YES |
| STORY_CREATE | not re-proven this tranche (prior code path) |
| GROW_CIRCLE | Find People intent unified; phone re-proof PENDING |
| PROFILE_PERSISTENCE | prior code path; phone PENDING |
| FIT_FUNCTIONAL | YES (local persist substrate) |
| LIVE_NORMAL_USER_PATH | YES (YOU Go live ungated) |
| TRAVEL_AUTOMATIC | YES (single-reading BE + FE Adapting) |
| ACTIVE_PLAN_THREAD_CONTINUITY | YES |
| FIND_PEOPLE_UNIFIED | YES (intent copy + chooser) |
| YOU_VISIBLE_ACTIONS_REAL | Fit unblocked; other rows prior |
| TECH_LEAK | 0 |
| DEAD_ACTIONS | 0 |
| FAKE_SUCCESS | 0 |
| CAPABILITY_LOSS | 0 |
| PASS2_UNLOCKED | NO |
| FREEZE | HOLD |
| REPORT_MATCHES_MACHINE_EVIDENCE | YES |
| REPORT_MATCHES_FOUNDER_PHONE | PENDING |

## Requirement matrix (P0 + Phase 2)

| REQUEST | AUTHORITY | CURRENT IMPLEMENTATION | RUNTIME PROOF | STATUS | FIX IF NOT GREEN |
|---|---|---|---|---|---|
| Center composer hittable before focus | Repair #3 P0 A | Permanent dock exclusion on `.opal-ambient-destination`; larger content gap; focus-within only for keyboard | VERIFY CENTER_COMPOSER_PREFOCUS | `PROVEN` | Founder phone |
| Founder Chats ≥5 paint | Repair #3 P0 B | Hard fallback to `FOUNDER_CHATS_PLAN_PILL_ROWS` when seedOn && rows&lt;5 | VERIFY FOUNDER_SEED_CHAT_WORLD | `PROVEN` | Founder phone |
| Call → Chat opens thread | Repair #3 P0 C | `openChatForPersonName` seed-first; Calls copy opens Continuity; deferred open | VERIFY CALL_TO_CHAT_THREAD | `PROVEN` | Founder phone |
| Graphs Create opaque | Repair #3 P0 D | `.graphs-create-menu { background:#080e1c; isolation:isolate }` | VERIFY GRAPH_CREATE_LAYER | `PROVEN` | Founder phone |
| Fit functional | Phase 2 | `fitPreferences` localStorage + `FitPreferencesSection` | VERIFY FIT_FUNCTIONAL | `PROVEN` | Optional later API |
| Live normal-user path | Phase 2 | YOU Go live without `isFounderSeedEnabled()` | VERIFY LIVE_NORMAL_USER_PATH | `PROVEN` | Founder phone |
| Travel automatic | Phase 2 | BE single-reading activate; FE On/Adapting/Off | VERIFY TRAVEL_AUTOMATIC | `PROVEN` | Founder phone TZ |
| Active plan in thread | Phase 2 | Seed open sets signalLabel/planProjection; strip fallback | VERIFY ACTIVE_PLAN_THREAD_CONTINUITY | `PROVEN` | Founder phone |
| Find People unified intent | Phase 2 | Chooser copy: connect or invite same intent | VERIFY FIND_PEOPLE_UNIFIED | `PROVEN` | Deeper IA still PARTIAL |
| Splash identity | Walk #2 | Character splash; approval OPEN | — | `PARTIAL` / OPEN | Founder asset acceptance |
| Full Find/Add/Invite unification | Walk #2 | Intent copy; Search still separate surface | — | `PARTIAL` | Continue compound |
| YOU_PERMISSIONS tip RED | Tip 1a5600a1 | Prior JSON FAKE_SUCCESS=1 acknowledged; not re-run as GREEN claim | — | Historical RED at tip | Remint+re-run separate if needed |

## What changed (code)

- `apps/opal_web/src/styles.css` — Center permanent dock exclusion; Graphs Create opaque; dock gap
- `apps/opal_web/src/OpalApp.tsx` — seed chat hard fallback; `openChatForPersonName`; Live ungated; plan continuity on seed open; deferred Continuity Chat
- `apps/opal_web/src/opalUi/ChatsHome.tsx` — Calls row copy opens Continuity
- `apps/opal_web/src/opalUi/fitPreferences.ts` (+ test) — Fit substrate
- `apps/opal_web/src/opalUi/YouSettingsDestination.tsx` — Fit section; Travel projection
- `apps/opal_core/lib/opal_core/intelligence/travel_mode.ex` (+ test) — single-reading activate
- `apps/opal_web/src/people/FindPeopleFlow.tsx` (+ test) — unified intent copy
- Evidence under `docs/evidence/founder_reality_repair_3/`

## Honest non-claims

- This report does **not** say FOUNDER ACCEPTED.
- Splash animated identity remains OPEN for founder acceptance.
- Full Search/Add/Invite one-surface IA remains PARTIAL.
- Prior `YOU_PERMISSIONS_VERIFY.json` at `1a5600a1` was RED — that tip contradiction is why this repair exists.
- Phoenix must be restarted to load Travel BE single-reading in the live API process.

## Proof command

```bash
# remint first
cd apps/opal_core && mix run ../../scripts/mint_walk_sessions.exs
node docs/evidence/founder_reality_repair_3/verify_repair_3.mjs
# → docs/evidence/founder_reality_repair_3/VERIFY.json
```
