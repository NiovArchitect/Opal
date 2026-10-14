# CENTER_ONE_INTELLIGENCE_PATH — Repair #4

**Status:** PROVEN  
**Product tip:** `84008a97` · **CAPS tip:** `345a1860`  
**Baseline rejected:** `ce00c150`  
**Pass 2:** LOCKED · **Freeze:** HOLD · **Founder accepted:** NO

## Root cause

Rest composer `askAboutDay()` hardcoded `intent: "nearby_now"` into Decision Intelligence for every free-text utterance. Talk to Opal used `postOpalMessage` → OpalConversations → Intent → Response → DeepSeek.

## Fix

| Entry | Before | After |
|---|---|---|
| Composer Enter/Send | `askAboutDay` → DI nearby_now | `openChatWith` → phase `chat` + `initialMessage` |
| Nearby / What's next / Tonight chips | DI nearby_now | same OC path |
| Nudges / mic transcript / week curate | DI | same OC path |
| Talk to Opal button | empty chat | empty chat (unchanged) |
| Conversation Timing/Budget/Vibe | DI card adjust | DI retained (specialized one-answer card) |

`OpalCenterChat` auto-sends `initialMessage` once after hydrate (ref-guarded).

## Authority

DeepSeek understands/drafts. Opal domain + permission laws authorize and execute side effects (`OpalPlanConfirm` → SharedPlan). No uncontrolled model mutations. `plan_create` / `plan_confirm` / `plan_modify` / `coordinate` stay template-controlled.

## Evidence

- `CENTER_ONE_PATH_VERIFY.json` — GREEN (composer → OpalConversation path; DI nearby card absent)
- `CENTER_REAL_REQUEST_DEEPSEEK_TRACE.json` — Center request ↔ DeepSeek draft correlation for a non-side-effect week ask
- Unit: `opalCenterLifeGraph.test.ts` — Repair #4 structural contract
- Unit: `OpalCenterChat.test.tsx` — `initialMessage` auto-send once

## Caps

`CENTER_ONE_INTELLIGENCE_PATH = YES` · `FOUNDER_ACCEPTED = NO` · `FREEZE = HOLD` · `PASS2_UNLOCKED = NO`
