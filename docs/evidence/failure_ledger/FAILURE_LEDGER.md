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

## FL-R8-01 — Birthday inherited Coronado / Night Hawk (Repair #8)

- **Scenario:** Birthday planning turn after exact-venue search.
- **Root cause:** Prior exact-venue slots + sticky `explicit_constraints` / `conversation_act` survived scope change.
- **Fix:** Birthday + scope-change clears venue/dest/constraints/act; exact-venue clears inherited WHEN unless explicit in utterance.
- **Regression:** Mixed-intent birthday turns.
- **Last verified:** Repair #8 · 10 BROWSER_PASS + 5 API_PASS (ship `b67a7b70`, tip `0d6d9a8d`, product `3944906f`)
- **Status:** FIXED (machine)

## FL-R8-02 — Henry Sunday 10 AM softened to 7:30 (Repair #8)

- **Root cause:** Soft-assume / inherited clock outranked explicit time.
- **Fix:** `when_time_explicit` + `explicit_constraints`; soft assumption blocked when explicit.
- **Last verified:** Repair #8 · API_PASS
- **Status:** FIXED (machine)

## FL-R8-03 — "Why did you change the time?" triggered venue lookup (Repair #8)

- **Root cause:** Challenge classified as new plan.
- **Fix:** `conversation_act=challenge_prior_action` → `handle_conversation_challenge`, `no_provider_restart`.
- **Last verified:** Repair #8 · API_PASS
- **Status:** FIXED (machine)

## FL-R8-04 — Multi-turn Center blocked after first send (Repair #8)

- **Root cause:** Global `sending` boolean locked composer until POST completed.
- **Fix:** Per-conversation ordered send queue; composer stays enabled; causal flush. (Founder decision: queue follow-ups, not unrestricted concurrent sends.)
- **Last verified:** Repair #8 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R8-05 — Chanelle message disappeared after navigation (Repair #8)

- **Root cause:** Seed `openChat` wiped local `me` rows with fixture.
- **Fix:** Preserve local-/failed- extras; sessionStorage keyed by name + id.
- **Note (superseded):** Contemporary review flagged sessionStorage as NOT production-grade durable messaging. Repair #11 `STATE_AUTHORITY.md` requires durable per-participant delivery; do not build on the sessionStorage approach.
- **Last verified:** Repair #8 · BROWSER_PASS
- **Status:** GUARDED (machine fix; durable solution pending Repair #11)

## FL-R8-06 — Next Together / plan strip dead for remapped Chanelle (Repair #8)

- **Root cause:** Remapped Chanelle lacked `planProjection`; strip click missing seed fallback.
- **Fix:** `withSeedPlan` on remapped open; Juniper → `seed-chanelle-juniper` fallback.
- **Last verified:** Repair #8 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R8-07 — Graph detail painted under chat chrome (Repair #8)

- **Root cause:** `z-index: 56 !important` beat spectral 68.
- **Fix:** Raised to `z-index: 68 !important`.
- **Last verified:** Repair #8 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R8-08 — Harness false confidence (Repair #8)

- **Root cause:** API jobs polluted Center thread; `fill()` skipped React controlled-input `draft` sync.
- **Fix:** Clear fixture conversation before browser runs; `pressSequentially` / native value setter for real typing.
- **Last verified:** Repair #8 · harness
- **Status:** FIXED (process)

## FL-R9-01 — Stuck Henry capture; Chanelle message triggered venue search (Repair #9)

- **Root cause:** Sticky `ready_for_restaurant_search?` + QuestionEconomy/`maybe_start_search` monopolized non-venue turns; LLM polish rewrote greetings using restaurant entities.
- **Fix:** `skip_provider_search_this_turn?` + `handle_conversational_turn`; strip search entities; template-only chat when `conversation_owns_routing`.
- **Last verified:** Repair #9 · API_PASS (product `7eb3e48b`, stamp `f8b94294`)
- **Status:** FIXED (machine)

## FL-R9-02 — "Find The Henry restaurant in Coronado" routed to discovery (Repair #9)

- **Root cause:** `extract_exact_venue` treated `\bfind\b` as cuisine discovery; case-insensitive name capture matched "somewhere Mediterranean".
- **Fix:** Named-find case-sensitive patterns; cuisine-token reject; "The Henry restaurant in LOCALITY" → `exact_entity`.
- **Last verified:** Repair #9 · API_PASS
- **Status:** FIXED (machine)

## FL-R9-03 — Henry person vs venue vs Coronado conflated (Repair #9)

- **Root cause:** Place/region stop words split incorrectly; discovery wiped venue name.
- **Fix:** Multi-word `place_confused_as_venue?`; preserve requested identity on unresolved Geoapify.
- **Last verified:** Repair #9 · API_PASS
- **Status:** FIXED (machine)

## FL-R9-04 — "Cancel Henry search" ignored (Repair #9)

- **Root cause:** `classify_conversation_act` missed "cancel … search"; cancel-restaurant regex required "restaurant|venue".
- **Fix:** `cancel_search` act + inflight job cancel + clear search slots.
- **Last verified:** Repair #9 · API_PASS
- **Status:** FIXED (machine)

## FL-R9-05 — Stale Geoapify paint after New Chat (Repair #9)

- **Root cause:** Worker finished after cancel; `finish_ready` overwrote cancelled status then painted.
- **Fix:** Stale rejection in `finish_ready`/`fail`; `stale_provider_paint?` vs `cleared_at` / cancelled.
- **Last verified:** Repair #9 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R9-06 — Center scroll forced to bottom (Repair #9)

- **Root cause:** Unconditional `scrollToEnd` on every `messages`/`sending` change; 1.8s provider poll.
- **Fix:** Stick/near-bottom gate; Jump-to-latest affordance; user-send force pin.
- **Last verified:** Repair #9 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R9-07 — No escape from contaminated thread (Repair #9)

- **Root cause:** One conversation/user with no New Chat / Clear affordance.
- **Fix:** `POST /opal/conversation/new` + `/clear`; header menu; clears messages + transient planning only (durable plans/messages preserved).
- **Last verified:** Repair #9 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R9-08 — Maya recall answered with Henry (Repair #9)

- **Root cause:** `recall_prior_copy` preferred sticky venue over question topic.
- **Fix:** Question-aware recall (Maya/birthday outranks venue).
- **Last verified:** Repair #9 · API_PASS
- **Status:** FIXED (machine)

## FL-R10-01 — "Remind me what Opal can do" triggered Maya re-engagement (Repair #10)

- **Root cause:** `render_chat` preferred `recent_who` before capability/help questions.
- **Fix:** `capability_question?/1` checked before sticky who; capability copy with plan / Graph / places.
- **Last verified:** Repair #10 · 28/28 mixed-intent API_PASS (product `5e7a7b4a`, stamp `c474d95f`)
- **Status:** FIXED (machine)

## FL-R10-02 — Jump-to-latest click mis-settled (Repair #10)

- **Root cause:** `setShowJump(false)` + focus restoration snapped `scrollTop` to 0; pin timers from prior send fought history-read.
- **Fix:** Focus-safe Jump (`preventDefault` on pointerdown); hide Jump after pin measures near; cancelable pin timer gen; `overflow-anchor: none` on Center thread.
- **Last verified:** Repair #10 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R10-03 — Scroll-stick false fail after Jump harden (Repair #10)

- **Root cause:** Late `scrollToEnd(true)` timeouts from send re-pinned after `scrollToTop`.
- **Fix:** `clearScrollPinTimers` + `scrollPinGenRef` invalidated on history-read and new pin.
- **Last verified:** Repair #10 · BROWSER_PASS
- **Status:** FIXED (machine)

## FL-R10-OPEN — Deferred / honest gaps (Repair #10, not product fails)

- The Henry exact Geoapify unresolved — honest empty, no fabricated venue.
- Mediterranean discovery names not clearly Mediterranean — provider order; cuisine filter quality deferred.
- Near-me coordinates not wired in Center — honest location-gap copy; browser permission path not Center-wired. (Confirmed still true at Repair #11 baseline.)
- Physical iPhone acceptance — checklist in `shots/repair10/FOUNDER_PHONE_WALK_R10.md`; never claimed.

## Open / founder-only / limitations

- **FOUNDER_PHONE_PASS:** NOT claimed. Physical iPhone keyboard geometry, OS permissions, and Expo shell remain founder-only.
- **P0-G UI edit controls:** API founder-led time patch PROVEN (`plan_patched`, same plan_id, slots_changed=[when_time]). Dedicated Graph Detail time-picker chrome not separately browser-proven this repair.
- **P0-H real vs seed messaging:** Seed Chanelle replies are fixture intelligence under `opal_founder_seed`; harness proves human-chat proposals do not illicitly `plan_patched`. Production must not present fixture replies as live humans.
- **Call ingestion semantic:** Not re-proven in Repair #7; mark unproven.
- **Geoapify locality:** Mediterranean results may include San Diego addresses near Coronado (provider geography); names are cuisine-tagged. Not hardcoded.
- **Harness false-path:** Clicking Chanelle name can open Contact Profile; tests must enter Message / wait for `human-message-row` before asserting chat order or Back.

## Repair #11 — Phase 3 fix-test-fix-test (2026-10-15)

**Scope:** Merged 4 repair tracks (routing/seed/socialflow/verify) + integration + 5 test loops to green.  
**Result:** 79/79 Repair #11 tests pass. Full suite 2319 tests, 26 failures — all 26 verified pre-existing on HEAD+compile-fix baseline. Zero regressions.

- **Root cause (compile):** Routing track shipped `~r/...*{0,3}/` in `named_find_no_locality` — `Regex.CompileError`, whole `opal_core` app did not compile. No test had ever executed on the merged tree.
- **Root cause (intent):** Named-venue verb regex was lowercase-only; "Find Nighthawk" never classified. Fixed with `(?i:...)` verb group.
- **Root cause (errors):** 5× `Repo.rollback({:error, reason})` double-wrapped to `{:error, {:error, reason}}`. Unwrap before rollback.
- **Root cause (idempotency):** `respond_to_option` rejected repeat accepts on converted proposals before the conversion guard; added `converted` → `recover_raced_plan/1` short-circuit (founder addendum C).
- **Root cause (sender safety):** `ensure_safe_sender/1` leaked `:opal_sender_not_configured`; now fails closed with `:unsafe_sender`.
- **Root cause (NL confirm):** Extractor `@confirm` lacked any `confirm` alternative; "I confirm" unreachable end-to-end. Added `i confirm` / `^confirm$`.
- **Test hygiene:** Non-UUID ids (`bot-repair11`, `d-*-1`) vs `:binary_id`; unpersisted Decision/Event vs FK. Fixed fixtures, no weakened assertions.
- **Status:** FIXED (machine-verified). Loop log: 15 → 9 → 8 → 1 → 0 failures.
