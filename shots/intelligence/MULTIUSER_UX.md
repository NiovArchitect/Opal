# Paste I — MULTIUSER_UX

Per-test UX verdict (finding → fix, or no ux issue).  
Suite: `multiuser_pressure_test.exs` 30/30 PASS.

| ID | Surface | Finding → fix |
|----|---------|---------------|
| T1 | Plan card dual TZ | **Finding:** plan contract lacked per-viewer local time. **Fix:** `SharedPlan.viewer_card/3` + `local_times` / `viewer_local_time`. |
| T2 | Mediation card ×4 TZ | **Finding:** needed readable local times + phone-width choices. **Fix:** mediation card contract includes `local_times` map + `choices` + `ux_width_ok_390`. |
| T3 | Travel home | **no ux issue** — travel prompt section has no false streak alarm. |
| T4 | Midnight day names | **Finding:** `viewer_day_name` nil without tzdata shift. **Fix:** fixed-offset day-name fallback in `SharedPlan`. |
| T5 | DST plan/reminder | **no ux issue** — absolute `remind_at` / `start_at`. |
| T6 | Halfway venues | **Finding:** Places LIVE gated. **Fix:** `Places.Midpoint` demo venues with `distance_from` per viewer (honest `gated: true`). |
| G1 | Losing proposal | **Finding:** risk of dead losing card. **Fix:** graceful `group_chose` contract (`dead_card: false`). |
| G2 | Silent member | **Finding:** silence must not read as accusation. **Fix:** `quiet_lately` avatar state + mediation “haven't heard from D”. |
| G3 | Late joiner catch-up | **Finding:** catch-up must be a card not wall-of-text. **Fix:** `MultiuserHarness.catch_up_card/2` from real plan fields. |
| G4 | Dropout notify | **no ux issue** — shame_free headcount notify; no ghost coming. |
| G5 | Saturday conflict | **Finding:** warning-only was insufficient. **Fix:** private alert with real choices `move_x` / `move_y` / `decline_one`. |
| G6 | Plus-one | **Finding:** +1 must not be a broken avatar. **Fix:** alignment `B's guest` label + capacity flag. |
| I1 | Cold invite join | **no ux issue** — shame_free invite_copy; real cold-start maturity. |
| I2 | Ignored invite | **Finding:** eternal `sent` limbo. **Fix:** `display_status` → `no_response_yet` after 7d. |
| I3 | Re-invite | **no ux issue** — fresh shame_free copy; no rejected language. |
| I4 | Group invite ×3 | **no ux issue** — three independent cards / statuses. |
| M1 | Split request | **Finding:** no split API/FE. **Fix:** `Wallets.Split.request/confirm` card with amount + confirm/decline; `shows_balance: false`. |
| M2 | Group booking gate | **no ux issue** — per-member confirm/decline; clear totals; no partial charges. |
| M3 | Insufficient | **Finding:** crash/silent-skip risk + balance leak. **Fix:** “Not enough — load or decline” + group `waiting_on` without numbers. |
| M4 | Refund receipt | **no ux issue** — `Refunded $X` receipt; idempotent. |
| P1 | Solo vs shared | **no ux issue** — access contract only. |
| P2 | Ex in group | **no ux issue** — mediation stays clean (privacy). |
| P3 | Money surfaces | **no ux issue** after Split contracts strip balances. |
| P4 | Leakage probes | **no ux issue** — refusal/empty recall (privacy). |
| E1 | Group voice note | **no ux issue** — stub TTS + playable `audio_url` path. |
| E2 | Artifact share | **no ux issue** — signed URL; outdated banner path on regenerate. |
| E3 | Remind us | **Finding:** reminder slots hit quiet hours. **Fix:** AttentionBudget `quiet_bypass` for `reminder`. |
| E4 | Live plan edit | **Finding:** `plan_updated` not in allowed broadcast list. **Fix:** allow `intelligence:plan_updated`. |
| E5 | Notification storm | **Finding:** time_critical blocked by daily cap. **Fix:** time_critical/mediation do not count against daily budget. |
| E6 | Remove from plan | **no ux issue** — 404 access; “A updated the plan”; no broken link flag. |

## Summary

- Real UX gaps fixed narrowly: local_times on plan cards, invite terminal status, split contracts, quiet/budget bypasses for reminder + time_critical, plan_updated broadcast, midpoint demo distances.
- Several tests had **no ux issue** once backend contracts were honest.
- Places LIVE and wallet loads remain **gated** (documented, tests still PASS).
