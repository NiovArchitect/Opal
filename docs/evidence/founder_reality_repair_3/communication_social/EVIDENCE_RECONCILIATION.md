# Repair #4 — Evidence Reconciliation

**Scope:** proof integrity only. No Pass 2 unlock. No merge.  
**Product tip:** `84008a97` · **Prior CAPS tip:** `345a1860`  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**

## 1. PHYSICAL_VERIFY against Repair #4

Re-ran `verify_physical_seed_compose.mjs` (not a manual tip edit).

| Field | Value |
|---|---|
| `PHYSICAL_VERIFY_PRODUCT_TIP` | `84008a97` |
| `served_data_git_head` | `84008a9` |
| `served_data_git_head_full` | `84008a97ec447a21…` |
| `SERVED_PRODUCT_TIP` | PASS |
| `FOUNDER_PHONE_CHAT_ROWS` | 5 — Chanelle / Maya / Juniper crew / Sabrina / Alex |
| overall | `GREEN_PHYSICAL_COMPOSE` |

Artifact: `PHYSICAL_VERIFY.json`

## 2. Private reminder token / TECH_LEAK

**Finding:** `W9ISO_PRIVATE_d627448c` **was consumer-visible** in Center history.

Path: W9 isolation fixture seeded reminder task → `ReminderDeliveryWorker.notify/1` painted `r.task` into Center as an opal message (`(overdue) Private reminder W9ISO_PRIVATE_…`). That string appeared in `CENTER_ONE_PATH_VERIFY.json` `sampleBody` because Playwright `innerText()` of the chat DOM included it.

**Repair (minimal):**

- Sanitize consumer-facing reminder copy in `ReminderDeliveryWorker` (strip `W9ISO_(PRIVATE|SHARED)_<hex>`; keep underlying reminder row).
- Scrub Walk A polluted reminder + opal_message bodies already in DB.
- Center verifier now asserts consumer DOM for isolation tokens and records `TECH_LEAK`.

| Field | Value |
|---|---|
| `PRIVATE_REMINDER_TOKEN_VISIBLE` | `false` (after scrub + sanitize) |
| `TECH_LEAK` | `0` (recalculated from consumer DOM; was a real leak before scrub) |

Artifact: `CENTER_ONE_PATH_VERIFY.json`

## 3. Center → DeepSeek correlation

Provider `pong` alone was insufficient. One non-side-effect Center ask:

> “What should I know about my week?”

persists non-secret draft metadata on the opal message (`draft_source`, `llm_called`, `llm_provider`, `model`).

| Field | Value |
|---|---|
| `center_request_id` | `195dbb55-ea9f-433e-a520-26f6a18a2a2e` |
| `opal_intent` | `recommend` |
| `llm_provider` | `deepseek` |
| `model` | `deepseek-chat` |
| `llm_called` | `true` |
| `draft_source` | `llm` |
| `response_id` | `47e1c9c2-3062-488a-aa47-bcd21dd6b9b4` |
| correlated | `true` |

`plan_create` / `plan_confirm` / `plan_modify` / `coordinate` remain template-controlled.

Artifact: `CENTER_REAL_REQUEST_DEEPSEEK_TRACE.json`

## 4. Stale documentation

`CENTER_ONE_INTELLIGENCE_PATH.md` updated from “PROVEN pending dual A/B browser” → **PROVEN**, matching CAPS.

`ADD_STORY_E2E` remains **PARTIAL** (honest).

## Return

```
PHYSICAL_VERIFY_PRODUCT_TIP          = 84008a97
CENTER_REAL_REQUEST_DEEPSEEK_TRACE   = CORRELATED (deepseek-chat, draft_source=llm)
PRIVATE_REMINDER_TOKEN_VISIBLE       = false
TECH_LEAK                            = 0
REPORT_MATCHES_MACHINE_EVIDENCE      = YES
FOUNDER_ACCEPTED                     = NO
FREEZE                               = HOLD
PASS2_UNLOCKED                       = NO
```

**Stop for founder phone walk.**
