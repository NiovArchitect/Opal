# PRODUCT INVARIANTS

**Status:** CURRENT PRODUCT LAW  
**Synced:** whole-application coherence recovery 2026-10-02  
**Related:** `CURRENT_OPAL_STATE.md`, `OPAL_PRODUCT_OPERATING_SYSTEM.md`, `STATE_COMPLETENESS_LAW.md`

```yaml
authority_class: PRODUCT_INVARIANTS
north_star: SPEED_TO_ALIGNMENT
preserve_extend_compound: true
```

## Identity

Opal Graph is Social Flow — an intelligent social and experiential operating layer.  
Optimize for quality of alignment and resulting life experience.

## Permanent ontology

Follow ≠ Connection · Interested ≠ Going · Group ≠ Journey · Conversation ≠ Graph · Graph ≠ Journey · Private intelligence ≠ social visibility · Plan agreement ≠ execution confirmation · Attention ≠ unread · Memory ≠ social post

## State layers (never collapse into one status)

### A. Shared plan state

forming · aligned / set · canceled

### B. Temporal lifecycle

future · approaching · current/live window · past · completed (only with completion evidence)

### C. Execution state

not_started · authorization_required · submitted · confirmed · failed · unavailable

### D. Participant response state

none · waiting · decision_required · authorization_required · answer_required · commitment_follow_through

### E. Attention state

silent · ambient · attention · urgent

### F. Conversation / strand state

casual · exploring · forming · proposal_pending · settled · coordinating · executing · follow_through · resolved

These layers are related. They are **not** interchangeable.

## Dominant UI state

UI derives a **participant-specific** dominant interaction state from the layers.

Example (valid):

- PLAN = SET  
- EXECUTION = AUTHORIZATION_REQUIRED  
- WALK B RESPONSE = AUTHORIZATION_REQUIRED  

Correct language separates layers:

```text
PLAN SET ✓
Tuesday · Sep 29 · 8:00 PM · Fort Oak

RESERVATION
Approval needed before Opal can book

Approve reservation
```

Invalid: “PLAN SET ✓” + “YOUR APPROVAL IS NEEDED” with no explanation of what approval means.

## Temporal gates execution

If event time is already past:

- `PAST_PLAN_EXECUTION_APPROVAL_VISIBLE = 0`  
- `PAST_PLAN_BOOKING_ACTIONABLE = 0`  

unless explicit domain semantics justify retrospective action (do not invent).

## Next Together law

NEXT TOGETHER = the next **future / relevant** shared event.

Query by canonical time + timezone authority.

Exclude: canceled · superseded · past — unless special live/completion semantics explicitly say otherwise.

Required zeros:

- `PAST_PLAN_AS_NEXT_TOGETHER = 0`  
- `PAST_PLAN_AS_UPCOMING_READY = 0`  
- `PAST_PLAN_FUTURE_EXECUTION_CTA = 0`  
- `PAST_PLAN_FUTURE_ATTENTION = 0`  
- `PAST_PLAN_AUTO_MEMORY = 0`  

Past does **not** automatically equal Memory. Memory pipeline decides lived-experience promotion.

## Graph phase

Preserve Forming · Action · Ready · Live · Memory as presentation phases — do not overload one DB field when domain layers differ.

A past plan must not remain upcoming Ready. Live only when product law supports the event window. Memory only under memory law.

## Attention ≠ unread

Dock/Chats badge = canonical unread. Attention badge = actionable For-you only. VIEW ≠ RESOLVE.

## Privacy

Private intelligence ≠ social visibility.

Required zeros:

- `PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST = 0`  
- `MEMORY_CANDIDATE_RENDERED_PUBLICLY = 0`  
- `INFERRED_MEMORY_AUTO_PUBLISHED = 0`  

Published Memory requires explicit user-authorized social object (publish action, audience, provenance).

## Test / founder isolation

`TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI = 0`  
`TEST_RUN_LEAVES_FOUNDER_RESIDUE = 0`

## Mobile shell

`FIXED_844_STAGE_AS_APP_SHELL = 0` on real phones. Use `100dvh` + safe-area. Graph cards/pills must stay within usable viewport (`GRAPH_STATUS_PILL_CLIPPED = 0`, `HORIZONTAL_OVERFLOW = 0`).

## Physical authority

`SIMULATED_PHONE_GREEN ≠ REAL_PHONE_GREEN`  
`REAL_DEVICE_REGRESSION_CAN_BLOCK_COMMIT = YES`

## Track B isolation

PLAIN_CALL_PHYSICAL = RED / UNRESOLVED · CALL_TRANSPORT_COMMIT = NO  
Do not fold WebRTC fixes into Track A recovery. Clean fixture-owned lab call residue only.

## Impossible combinations (must fail tests)

- PAST + NEXT_TOGETHER  
- PAST + BOOKING_APPROVAL_REQUIRED (future execution)  
- ACCEPTED_PROPOSAL + DECISION_REQUIRED_FOR_SAME_PROPOSAL  
- PLAN_VERSION_N + EXECUTION_AUTHORIZATION_FOR_OLD_VERSION AS CURRENT  
- CANCELED + READY  
- COMPLETED + OPEN FUTURE EXECUTION  
- WAITING + CTA THAT REQUIRES SOMEONE ELSE  

## Freeform still works

Buttons accelerate. They do not replace human conversation. `BUTTON_ONLY_FLOW = 0`
