# Opal Failure Ledger

Survives context resets. Every discovered defect gets a reproducible scenario, root cause, regression guard, and last verified build.

Statuses: `OPEN` · `FIXED` · `GUARDED` · `EXTERNAL_BLOCKER`

Proof levels: `UNIT` · `API` · `BROWSER` · `FOUNDER_PHONE`

---

## FL-R7-001 — Exact venue ask silenced after prior results_ready

- **Scenario:** Center: "Arrange dinner at Nighthawk in Coronado." after a recent successful Nighthawk (or other Coronado) job.
- **Founder symptom:** Never resolved / irrelevant chat fluff.
- **Root cause:** `ActionOrchestrator.already_running?/3` treated `results_ready` as blocking, so `maybe_start_search` returned nil override and Opal fell through to generic chat.
- **Fix:** Only `queued`/`running` jobs block; completed results do not silence a fresh ask. Exact-venue patch clears prior who/plan/cuisine scope.
- **Regression:** `plan_context_patch_test.exs` exact venue; Repair #7 harness `API_NIGHTHAWK_*`, `BROWSER_NIGHTHAWK`.
- **Last verified:** Repair #7 WIP · API_PASS + BROWSER_PASS (Night Hawk, 1315 Orange Avenue, Coronado)
- **Status:** GUARDED

## FL-R7-002 — Mediterranean discovery inherited exact_entity / Quinn / Nighthawk / Friday

- **Scenario:** After Nighthawk exact resolve (or Friday open-window), type "Find three Mediterranean restaurants in Coronado."
- **Founder symptom:** Same irrelevant suggestions / never discovery / "Got it — Friday night in Coronado".
- **Root cause:** (1) Prior `search_mode=exact_entity` + who bled through; (2) cuisine category not sent; (3) `when`/`when_resolved`/`when_time` inherited; (4) override copy defaulted `when_s || "Saturday"`.
- **Fix:** Discovery patch clears exact/who/plan/when/when_resolved/when_time; Geoapify cuisine category; transport retry; override uses "Looking for {Cuisine} restaurants in {dest}…" when WHEN absent.
- **Regression:** patch test isolates Friday prior; harness `API_MED_*` asserts `when=undefined` and no Friday in body; `BROWSER_MEDITERRANEAN`.
- **Last verified:** Repair #7 WIP · API_PASS + BROWSER_PASS (Night Hawk, Mimosa, Callie)
- **Status:** GUARDED

## FL-R7-003 — Multiline composer text escaped shell

- **Scenario:** Type 3–10 lines in Center composer on native-host viewport.
- **Founder symptom:** Text overflows composer.
- **Root cause:** `html.opal-native-host .opal-composer { height: 54px !important }` beat Center chat autosize; shell stayed 54px while textarea grew.
- **Fix:** Higher-specificity `html.opal-native-host .opal-center-chat-composer.opal-composer { height: auto !important; align-items: flex-end }`.
- **Regression:** harness `BROWSER_COMPOSER_LINES_{1,3,5,10}`.
- **Last verified:** Repair #7 WIP · BROWSER_PASS
- **Status:** GUARDED

## FL-R7-004 — Chat → plan → Back landed on Graphs

- **Scenario:** Chanelle Chat → shared Juniper & Ivy plan → Back.
- **Founder symptom:** Returns to Graphs instead of Chanelle Chat.
- **Root cause:** `openGraphDetail(..., "graphs")` hard-coded from chat entry points; `activeChatId` cleared; onClose only restored Graphs.
- **Fix:** `graphDetailEntrySource` includes `chats`/`opal`; chat opens pass `"chats"`; `graphDetailReturnChatId` restored on Back via `openChat`.
- **Regression:** harness `BROWSER_BACK_TO_CHAT` requires `graph-detail-back` + `human-message-row` after Back (rejects contact-profile false pass).
- **Last verified:** Repair #7 WIP · BROWSER_PASS
- **Status:** GUARDED

## FL-R7-005 — Human chat message order (new above old)

- **Scenario:** Send a new message in Chanelle thread.
- **Founder symptom:** New messages appear above older ones.
- **Root cause (partial):** `Messages.list_messages/3` used `ASC + LIMIT` (oldest window on long threads); realtime sort ignored `createdAt` when `serverSeq` missing.
- **Fix:** Fetch newest `limit` then reverse to ascending; sort fallback uses `createdAt`.
- **Regression:** harness `BROWSER_CHAT_ORDER_LAYOUT`, `BROWSER_CHAT_NEW_BELOW`.
- **Last verified:** Repair #7 WIP · BROWSER_PASS
- **Status:** GUARDED (FOUNDER_PHONE still required for native keyboard/OS)

## FL-R7-006 — Generic Friday required fixture card

- **Scenario:** "Let's arrange dinner Friday." with no Home card.
- **Founder symptom:** Never produced usable flow.
- **Root cause:** Open-window path existed but destination/venue/plan from prior intents polluted; WHEN not always stamped.
- **Fix:** `generic_open_window?` stamps Friday + clears who/destination/venue/plan/cuisine; soft 7:30 assumption retained.
- **Regression:** patch test + harness `API_FRIDAY_GENERIC`, `BROWSER_FRIDAY`.
- **Last verified:** Repair #7 WIP · API_PASS + BROWSER_PASS
- **Status:** GUARDED

## FL-R7-007 — Discovery override invented Saturday / Friday when WHEN cleared

- **Scenario:** Cuisine discovery after clearing inherited WHEN.
- **Founder symptom:** "Got it — Friday night in Coronado" / Saturday default.
- **Root cause:** `when_s = planning["when"] || "Saturday"` in search override.
- **Fix:** Cuisine-specific copy without inventing a day; only use TemporalPhrase when WHEN present.
- **Regression:** `API_MED_QUEUED_DISCOVERY` rejects Friday/Saturday in body.
- **Last verified:** Repair #7 WIP · API_PASS
- **Status:** GUARDED

## FL-R7-008 — "Got it: dinner Friday Friday" duplicate day

- **Scenario:** Generic Friday plan_create response.
- **Founder symptom:** Awkward duplicate day in lead copy.
- **Root cause:** `what` already contained day; lead appended `when_s` again.
- **Fix:** `OpalResponse` lead_core skips appending when when already ends what.
- **Regression:** covered indirectly by Friday harness body sanity.
- **Last verified:** Repair #7 WIP · code fix landed
- **Status:** FIXED

## FL-R6-PASS — Preserve from Repair #6

- Non-organizer protection: PASS (preserve)
- Graph background isolation: PASS (preserve)

## Open / founder-only / limitations

- **FOUNDER_PHONE_PASS:** NOT claimed. Physical iPhone keyboard geometry, OS permissions, and Expo shell remain founder-only.
- **P0-G UI edit controls:** API founder-led time patch PROVEN (`plan_patched`, same plan_id, slots_changed=[when_time]). Dedicated Graph Detail time-picker chrome not separately browser-proven this repair.
- **P0-H real vs seed messaging:** Seed Chanelle replies are fixture intelligence under `opal_founder_seed`; harness proves human-chat proposals do not illicitly `plan_patched`. Production must not present fixture replies as live humans.
- **Call ingestion semantic:** Not re-proven in Repair #7; mark unproven.
- **Geoapify locality:** Mediterranean results may include San Diego addresses near Coronado (provider geography); names are cuisine-tagged. Not hardcoded.
- **Harness false-path:** Clicking Chanelle name can open Contact Profile; tests must enter Message / wait for `human-message-row` before asserting chat order or Back.
