# PRODUCT INVARIANTS

**Status:** CURRENT PRODUCT LAW  
**Synced:** physical-contradiction recovery 2026-10-03  
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

Follow ≠ Connection · Interested ≠ Going · Group ≠ Journey · Conversation ≠ Graph · Graph ≠ Journey · Private intelligence ≠ social visibility · Plan agreement ≠ execution confirmation · Attention ≠ unread · Memory ≠ social post · Past Shared Reality ≠ proven attendance · Past Shared Reality ≠ Durable Memory · Confirmed experience ≠ published Memory · Destination place ≠ user location

## Past is accessible, not prominent

```text
PAST_IS_ACCESSIBLE_NOT_PROMINENT = 1
HISTORY_ENRICHES_PRESENT = 1
```

Product principle: **History should enrich the present, not occupy it.**

Temporal surface hierarchy:

NOW → WHAT NEEDS ME → NEXT → FORMING / UPCOMING → RECENT PAST → OLDER HISTORY

Past Shared Reality remains valuable historical context. Default surfaces demote it. Past must not consume the same visual authority as today, upcoming plans, pending decisions, current execution, or forming Graphs.

Required zeros:

- `PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL = 0`
- `PAST_DETAIL_FOREGROUNDS_LEAVE_BY = 0`
- `PAST_DETAIL_FOREGROUNDS_LOCATION_PERMISSION = 0`
- `PAST_STRAND_FIND_A_TIME_DOMINANT = 0`

## Runtime provenance

```text
RUNTIME_PROVENANCE_REQUIRED = 1
FOUNDER_TESTS_UNKNOWN_RUNTIME = 0
```

Every founder test URL must prove served frontend/backend SHA, dirty fingerprint, fixture generation, server time, and schema. Hand off only when EXPECTED_* matches SERVED_*.

## Founder identities are not automation dump accounts

```text
FOUNDER_IDENTITIES_NOT_AUTOMATION_ACCOUNTS = 1
GENERAL_AUTOMATION_WRITES_WALK_A_B = 0
TEST_RUN_LEAVES_WALK_A_B_RESIDUE = 0
TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI = 0
```

Walk A / Walk B are founder fixtures. General automation must use dedicated automation identities. Fixture reset must be idempotent and return `FOUNDER_FIXTURE_GENERATION_ID`.

## Destination identity before Journey

```text
DESTINATION_IDENTITY_REQUIRED_BEFORE_JOURNEY = 1
KNOWN_REAL_PLACE_STAYS_UNRESOLVED_WITHOUT_ATTEMPT = 0
USER_LOCATION_PRIVATE = 1
```

Catalog name/area is not enough for Journey. Resolve through PlaceIdentity → provider candidates → canonical place (address, provider place id, coordinates, timezone, locality, provenance). Do not invent coordinates. User location remains permissioned/private and distinct from durable destination identity.

## Screen noise budget

```text
SCREEN_NOISE_BUDGET = 1
```

Do not expose implementation architecture as user copy. Prefer automatic resolution; if impossible, one compact confirmation action.

## Home is social-first

```text
HOME_SOCIAL_BODY_REQUIRED = 1
HOME_ONLY_STORIES_PLUS_BLANK_BODY = 0
```

Home must show intentional social objects below Stories for founder fixtures. Stories alone do not satisfy Home. Empty state must be explicit onboarding/discovery — never a mysterious blank canvas.

## Dock and Center geometry

```text
DOCK_PILL_NEAR_SAFE_AREA = 1
CENTER_ORB_MAY_PROTRUDE_INDEPENDENTLY = 1
DOCK_EXCESSIVE_LIFT = 0
NO_ILLEGAL_INTERACTIVE_OVERLAP = 1
CENTER_COMPOSER_OVERLAPS_TABS = 0
CENTER_COMPOSER_OVERLAPS_CONTENT = 0
DOCK_EXCLUSION_DOUBLE_COUNT = 0
```

## Founder-visible lab residue

```text
FOUNDER_VISIBLE_LAB_CALL_RESIDUE = 0
TRACK_B_EVIDENCE_PRESERVED = 1
```

## Background intelligence

```text
BACKGROUND_STATE_REEVALUATION_IS_IDEMPOTENT = 1
STALE_JOB_CANNOT_MUTATE_CURRENT_PLAN = 1
STALE_BACKGROUND_JOB_MUTATES_CURRENT_STATE = 0
WHOLE_USER_JOURNEY_AUTOMATION_REQUIRED = 1
```

Opal manages its own state: temporal ticks, plan-version invalidation, foreground/reconnect reconciliation, and projection refresh without user-managed refresh.

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
- `PAST_ACCEPTED_PLAN_DISAPPEARS_FROM_HISTORY = 0`  
- `PLAN_PARTICIPANT_IMPLIES_ATTENDANCE = 0`  
- `LOCATION_REQUIRED_TO_CREATE_PAST_HISTORY = 0`  
- `LOCATION_REQUIRED_TO_CREATE_MEMORY = 0`  
- `PAST_SHARED_REALITY_AUTO_PUBLISHES = 0`  
- `CONFIRMED_EXPERIENCE_AUTO_PUBLISHES = 0`  
- `COMPONENT_LOCAL_PAST_CALCULATION = 0`  

**Past Shared Reality ≠ proven attendance ≠ Durable Memory ≠ Published Memory.**

A mutually accepted, uncanceled plan whose event time has passed **is** Past Shared Reality (relationship history / Earlier together). That does **not** auto-confirm attendance, auto-promote Durable Memory, or publish socially. Occurrence confidence may rise from independent evidence (explicit “we went,” Journey arrival, provider fulfillment, post-event conversation, permissioned location, attached media). Location strengthens occurrence; it is never required. No reliability / flake / social-credit score.

Temporal state is always derived from **canonical plan timestamp + plan timezone + server now**. `PLAN_TIMEZONE` owns event meaning; `USER_TIMEZONE` owns presentation only.

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
