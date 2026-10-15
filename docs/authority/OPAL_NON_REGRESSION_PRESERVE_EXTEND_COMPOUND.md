# Opal Non-Regression Law — PRESERVE → EXTEND → COMPOUND

**Status:** AUTHORITY — absolute development invariant  
**Freeze:** HOLD · **Pass 2:** LOCKED · **FOUNDER_ACCEPTED:** NO  
**Last updated:** 2026-10-14

---

## Hard invariant

```text
PRESERVE → EXTEND → COMPOUND
```

Never replace working behavior merely to add a new capability.

New systems consume existing domain events and state. They do not invent parallel truth stores.

Examples:

- Home reminder references the same `plan_id` — does not create a “feed plan.”
- Dynamic leave-by derives from the existing commitment — does not fork the plan.
- Commercial opportunity attaches to experience context — does not mutate the organic recommendation.
- Group-specific projection filters shared reality — does not clone five conflicting Graphs.

## Required flags on every tranche

```text
CAPABILITY_LOSS = 0
PRIOR_GREEN_REGRESSIONS = 0
DEAD_ACTIONS = 0
FAKE_SUCCESS = 0
```

If a proposed implementation requires breaking a currently working contract: **STOP**, return the conflict, preserve the functioning contract.

## Do not

- Remove, rename away, disable, hide, or behaviorally weaken GREEN/PROVEN capability
- “Clean up” functioning paths because a new architecture appears more elegant
- Replace a real provider with a fixture
- Replace dynamic LLM behavior with hardcoded copy
- Weaken permission boundaries for convenience
- Reopen locked architecture unless the founder explicitly authorizes it
- Mark AUTHORITY_ONLY / NEXT TRANCHE items as PROVEN because docs landed

## Working baseline to preserve (non-exhaustive)

Center send + follow-up · DeepSeek conversational path · NL planning · ProviderActionJob · Geoapify geocoding + live Places · solo discovery · 1:1 planning · WHO/destination separation · plan ID continuity · PlanContext patching · Saturday→Sunday correction · cancel venue keep trip · question economy · relationship permissions · Use ≠ Disclose · surprise architecture · Fit / Spending · Center/Graph/Chat projection · Chats · Calls · Live · Travel · YOU trust/control · dock/keyboard safety · existing Home/social experience · current founder fixture behavior

## Per modified subsystem

```text
BEFORE_CAPABILITY → AFTER_CAPABILITY → REGRESSION_TEST → RESULT
```

A tranche is not PROVEN if any previously working founder path turns RED.

## Evidence hierarchy (added 2026-10-15 — absolute)

The process failure that produced the Repair #5→#10 cycle was AI repeatedly claiming readiness because automation passed while the physical phone experience was broken. Claims are therefore ranked, highest authority first:

```text
founder phone reality
  > runtime evidence (traces, request/response, DB state)
  > automation (unit / API / browser suites)
  > comments / docs / source-code assertions
```

Rules:

- A green automated test **does not overrule** a founder-observed physical failure. If the test says the splash logo is correct and the iPhone shows two collaged assets, the test is incomplete.
- Machine `PASS` without `FOUNDER_PHONE_PASS` is a machine result, never a product claim. Label every gate separately: `UNIT_PASS`, `API_PASS`, `BROWSER_PASS`, `LIVE_PROVIDER_PASS`, `CROSS_SESSION_PASS`, `FOUNDER_PHONE_PASS`.
- A successful HTTP request does not prove the requested task succeeded. A valid provider response does not prove the correct entity was presented. A passing isolated turn does not prove the conversation remains coherent.
- Do not falsely declare `PASS` from screenshots alone or browser automation alone.
- When a failure is observed on the phone, do not troubleshoot around it during the walk — capture: where I was → what I did → what I expected → what actually happened. Note whether a hard refresh or second tap was required: a feature that works only after the workaround is known is not founder-accepted.
