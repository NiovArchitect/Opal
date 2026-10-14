# Opal State → Language Contract

**Status:** AUTHORITY + runtime guard — **IMPLEMENTED/PROVEN** on Center response path (this tip)  
**Freeze:** HOLD · **Pass 2:** LOCKED · **FOUNDER_ACCEPTED:** NO  
**Module:** `OpalCore.Center.ResponseFactContract`  
**Doctrine:** PRESERVE → EXTEND → COMPOUND  
**Last updated:** 2026-10-14

---

## Product law

**LLM language must be entailed by authoritative state.**

The LLM may phrase domain truth creatively. It must not invent unsupported semantic claims.

Validate / repair at least:

- surprise / visibility
- booking status
- participant state
- confirmation status
- provider completion
- payment state
- calendar availability
- travel attached / not attached
- **one question maximum** (Minimum Question Engine — global)

Pipeline:

```text
authoritative_state + allowed_response_facts + LLM_draft
→ ResponseFactContract.validate
→ render or repair
```

Do not hardcode full responses. Keep language dynamic. Constrain factual claims.

## Travel class (DependencyPlanner)

```text
local_activity | regional_outing | trip | destination_travel
```

Travel dependency only when facts justify meaningful travel (distant destination, overnight, explicit travel intent). Local San Diego dinner must not invent a travel next-dependency.

## Proven now (canonical E2E)

Evidence: `shots/center/ORCHESTRATION_CAPABILITY_BOARD.json` · `ORCHESTRATION_E2E.json` · `PERSON_AGNOSTIC_BEHAVIOR_E2E.json`

```text
LLM_INVENTED_SURPRISE = 0
QUESTIONS_BATCHED_GLOBAL = 0
LOCAL_SOLO_FALSE_TRAVEL_DEPENDENCY = 0
STATE_LANGUAGE_CONTRACT = PROVEN
SOLO_FLOW = PROVEN
ONE_TO_ONE_FLOW = PROVEN
PERSON_AGNOSTIC_BEHAVIOR_TEST = YES
PLAN_ID_STABLE_AFTER_CORRECTION = PROVEN
FAKE_SUCCESS = 0
DEAD_ACTIONS = 0
CAPABILITY_LOSS = 0
FOUNDER_ACCEPTED = NO
FREEZE = HOLD
PASS2_UNLOCKED = NO
```

Still honest / not claimed:

```text
GROUP_FLOW = STILL_MISSING_E2E
HOME_PROJECTION = STILL_MISSING_E2E
CALL_LOG_PROJECTION = STILL_MISSING_E2E
```
