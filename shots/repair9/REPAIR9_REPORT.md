# Repair #9 — Conversational Intelligence + Hackathon Ship

**Branch:** `muse/packet-b-batch-2`  
**Rejected baseline:** `0d6d9a8d`  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**  
**FOUNDER_PHONE_PASS = NOT_CLAIMED**

## Root causes (traces)

1. **Routing monopolization** — sticky restaurant `PlanningContext` + `QuestionEconomy`/`maybe_start_search` could own later turns; DeepSeek polish rewrote greetings using restaurant entities.
2. **Exact venue miss** — “Find The Henry restaurant in Coronado” classified as cuisine **discovery** (venue cleared), not `exact_entity`.
3. **Scroll lock** — `OpalCenterChat` unconditional `scrollToEnd` on every `messages`/`sending` change, including 1.8s provider polls.
4. **No escape hatch** — no New Chat / Clear for transient contamination.
5. **Stale provider paint** — in-flight Geoapify completion could overwrite cancel/New Chat.

## Code repaired

| Area | Files |
| ---- | ----- |
| Exact venue + acts | `plan_context_patch.ex` |
| Conversation owns routing | `action_orchestrator.ex` |
| Stale job rejection | `provider_action.ex` |
| Transient clear | `planning_context.ex`, `opal_conversations.ex` |
| New/Clear API | `opal_conversation_controller.ex`, `router.ex` |
| LLM park / greetings | `opal_response.ex` |
| Scroll + Jump + menu | `OpalCenterChat.tsx`, `styles.css`, `productClient.ts` |
| Harness | `apps/opal_web/scripts/_repair9_conversation_isolation.mjs` |

## Gate results (machine)

See `shots/repair9/VERIFY.json`.

- **UNIT_PASS:** plan_context_patch 22/22
- **API_PASS:** 10-turn sequence + pending-job Chanelle isolation
- **BROWSER_PASS:** task switch, scroll stick (upward hold during poll), New Chat, near-me honesty
- **LIVE_PROVIDER_PASS:** Henry exact lookup started; unresolved Geoapify kept honest; HTTPS 200
- **FOUNDER_PHONE_PASS:** not claimed

### Demonstrated behaviors

| Behavior | Evidence |
| -------- | -------- |
| Exact “The Henry” lookup | API T5 → `Looking up The Henry in Coronado…` / `search_mode=exact_entity` |
| Chanelle while Henry pending | No new venue job; coordinate draft; honest non-delivery |
| Greeting not hijacked | “I'm here and paying attention…” |
| Cancel search | Cancels inflight; keeps other plan language |
| Maya recall vs Henry | “We were working on Maya's birthday plan.” |
| New Chat | Empty “Say hello to Opal” |
| Scroll stick | `scrollTop` stays 0 across poll; Jump affordance appears |
| HTTPS | `https://throbbing-strainer-almanac.ngrok-free.dev` |

## Remaining limitations

1. Founder physical iPhone walk required.
2. Geoapify may not verify The Henry — identity preserved, no fabrications.
3. Outbound messaging remains authorization-gated drafts.
4. Jump-to-latest click settle still flaky in headless; scroll **ownership** (no force-down) is proven. Re-check Jump on phone.
5. Nearby “three things” is permission-honest, not a live ranked list.
6. No merge / Pass 2 / production without founder authorization.

## Hackathon URL

`https://throbbing-strainer-almanac.ngrok-free.dev`  
(Vite FE + proxied Phoenix API; secrets not exposed in this report.)
