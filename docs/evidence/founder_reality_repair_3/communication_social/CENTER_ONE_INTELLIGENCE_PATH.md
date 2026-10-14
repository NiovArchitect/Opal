# CENTER_ONE_INTELLIGENCE_PATH — Repair #4

**Status:** IMPLEMENTED (unit) · PROVEN pending dual A/B browser  
**Baseline rejected:** `ce00c150`  
**Pass 2:** LOCKED · **Freeze:** HOLD

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

DeepSeek understands/drafts. Opal domain + permission laws authorize and execute side effects (`OpalPlanConfirm` → SharedPlan). No uncontrolled model mutations.

## Tests

- `opalCenterLifeGraph.test.ts` — Repair #4 structural contract
- `OpalCenterChat.test.tsx` — `initialMessage` auto-send once
