# Repair #9 — Failure Ledger

**Branch:** `muse/packet-b-batch-2`  
**Rejected baseline:** `0d6d9a8d`  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**  
**FOUNDER_PHONE_PASS = NOT_CLAIMED**

## Root causes (from runtime traces)

| ID | Failure | Layer | Root cause | Repair |
| -- | ------- | ----- | ---------- | ------ |
| FL-R9-01 | Stuck Henry capture / Chanelle → venue | Orchestration | Sticky `ready_for_restaurant_search?` + QuestionEconomy/`maybe_start_search` monopolized non-venue turns; LLM polish rewrote greetings using restaurant entities | `skip_provider_search_this_turn?` + `handle_conversational_turn`; strip search entities; template-only chat when `conversation_owns_routing` |
| FL-R9-02 | “Find The Henry restaurant in Coronado” → discovery | Entity | `extract_exact_venue` treated `\bfind\b` as cuisine discovery; `/i` name capture matched “somewhere Mediterranean” | Named-find case-sensitive patterns; cuisine-token reject; “The Henry restaurant in LOCALITY” → `exact_entity` |
| FL-R9-03 | Henry person vs venue vs Coronado | Entity | Place/region stop words split incorrectly (`~w(san diego)` → tokens); discovery wiped venue name | Multi-word `place_confused_as_venue?`; preserve requested identity on unresolved Geoapify |
| FL-R9-04 | Cancel Henry search ignored | Acts | `classify_conversation_act` missed “cancel … search”; cancel restaurant regex required “restaurant\|venue” | `cancel_search` act + inflight job cancel + clear search slots |
| FL-R9-05 | Stale Geoapify paint after New Chat | Provider | Worker finished after cancel and `finish_ready` overwrote cancelled status then painted | Stale rejection in `finish_ready`/`fail`; `stale_provider_paint?` vs `cleared_at` / cancelled |
| FL-R9-06 | Center scroll forced to bottom | UI | Unconditional `scrollToEnd` on every `messages`/`sending` change; 1.8s provider poll | Stick/near-bottom gate; Jump to latest; user-send force pin |
| FL-R9-07 | No escape from contaminated thread | UX | One conversation/user with no New Chat / Clear | `POST /opal/conversation/new` + `/clear`; header menu; clears messages + transient planning only |
| FL-R9-08 | Maya recall answered with Henry | Memory/acts | `recall_prior_copy` preferred sticky venue over question topic | Question-aware recall (Maya/birthday outranks venue) |

## Layered gates

| Layer | Result |
| ----- | ------ |
| UNIT_PASS | `plan_context_patch_test.exs` 22/22 |
| API_PASS | Founder/hackathon 10-turn + pending isolation (see VERIFY.json) |
| BROWSER_PASS | Task switch, scroll stick, New Chat, near-me honesty |
| LIVE_PROVIDER_PASS | Exact Henry lookup started; Geoapify unresolved kept honest; HTTPS 200 |
| CROSS_SESSION_PASS | Not fully re-proven this tranche |
| FOUNDER_PHONE_PASS | **NOT_CLAIMED** |

## Remaining limitations

1. Physical iPhone walk still required — machine GREEN ≠ FOUNDER_PHONE_PASS.
2. Geoapify may not verify The Henry; product preserves requested identity and asks next step (no fabricated match).
3. Outbound Center→human message remains draft/authorization-gated (no invented delivery).
4. “Near me” is honest about location permission; full nearby ranking not claimed.
5. Jump-to-latest affordance is present and scroll stick holds; headless jump settle may still flake — re-verify on phone.
6. Pass 2 remains LOCKED. No merge / production without founder authority.
