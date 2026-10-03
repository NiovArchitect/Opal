# Past Shared Reality / Occurrence / Memory — checkpoint

**Status:** HOLD for one founder physical walk  
**MERGE:** NO  
**LIVE:** NO  
**Date:** 2026-10-02

**Base HEAD (tracked):** `fc1572aa65655643d2e29b993d6acbc8836d11e7`  
**Branch:** `build/v2-coded-experience-closure`  
**Dirty:** hierarchy pass + Past Shared Reality lifecycle + pre-existing Track B `call*` untracked

## Founder correction applied

```text
PAST SHARED REALITY
≠ PROVEN ATTENDANCE
≠ DURABLE MEMORY
≠ PUBLISHED SOCIAL MEMORY
```

`PAST_PLAN_AUTO_MEMORY = 0` means: do **not** auto-promote Memory.  
It does **not** mean: erase mutually accepted past plans from relationship history.

## Lifecycle (conceptual)

```text
PROPOSED → ACCEPTED / ALIGNED → UPCOMING → CURRENT / EVENT WINDOW
  → PAST SHARED REALITY
  → LIKELY OCCURRED (supporting evidence)
  → CONFIRMED OCCURRED (strong/explicit evidence)
  → MEMORY CANDIDATE
  → DURABLE MEMORY (under Memory law)
  → PUBLISHED MEMORY (explicit social-sharing authority only)
```

Not every object traverses every step.

## Live Fort Oak proof (Oct 2 wall clock)

| Field | Value |
|-------|-------|
| Plan | `70804c05-779f-4991-ab9c-c75c319ebf2f` |
| Conversation | `ace99adc-db67-4258-9d95-f612246c6c84` |
| `canonical_start_at` | `2026-09-30T03:00:00Z` (Sep 29 8:00 PM America/Los_Angeles) |
| `temporal_state` | `past` |
| `past_shared_reality` | `true` |
| `occurrence_state` | `past_unverified` |
| `past_plan_auto_memory` | `false` |
| `past_shared_reality_auto_publishes` | `false` |
| `next_together_eligible` | `false` |
| `upcoming_ready` | `false` |
| `future_execution_actionable` | `false` |
| `memory_candidate_input` | `true` (soft feed only) |
| Home kicker | `Earlier together` |
| `memory_label` | `false` |
| Walk B Attention (needs/waiting/updated) | `0 / 0 / 0` |

## Owners

| Concern | Owner |
|---------|-------|
| Temporal + past_shared + occurrence | `PlanStateArbitration` |
| Home continuity copy | `HomeProjection` → `HomePlanContinuity` |
| Attention quiet on time→past | `AttentionCenter.refresh_from_pending_plans` (no Memory ingest; clears `plan_update:memory:` residue) |
| Next Together exclusion | arbitration `next_together_eligible` |
| Memory durable/publish | existing Memory / FollowThrough law (unchanged; candidate input only) |

## Automated verification

| Suite | Result |
|-------|--------|
| `mix test` PSA + AttentionCenter | **41 tests, 0 failures** |
| Vitest hierarchy (iphoneLayout / nextPlan / chatsHome / authorityRejected) | **56 tests, 0 failures** |

Covered founder-named proofs include:

- `MUTUALLY_ACCEPTED_PAST_PLAN_BECOMES_SHARED_HISTORY`
- `PAST_PLAN_NOT_AUTO_CONFIRMED_ATTENDANCE`
- `LOCATION_OPTIONAL` / permission required for location evidence
- `POST_EVENT_CONVERSATION_CAN_RAISE_OCCURRENCE_CONFIDENCE`
- `PROVIDER_FULFILLMENT_CAN_RAISE_OCCURRENCE_CONFIDENCE`
- `PARTICIPANT_ATTENDANCE_CAN_DIVERGE` / `CONTRADICTORY_ATTENDANCE_EVIDENCE`
- `PAST_SHARED_REALITY_CAN_FEED_MEMORY_CANDIDATE`
- `PAST_SHARED_REALITY_DOES_NOT_AUTO_PUBLISH`
- `EVENT_TIMEZONE_CANONICAL` / `USER_TIMEZONE_PRESENTATION_ONLY`
- `WALL_CLOCK_TRANSITION_WITHOUT_MESSAGE`
- `NEXT_TOGETHER_EXCLUDES_PAST`
- `PAST_EXECUTION_ACTION_ZERO`

## Hierarchy pass reconciliation

Previous hierarchy checkpoint claimed Attention “Fort Oak became a Memory.” That overclaimed Memory vs founder law and is **removed**.

Correct product language for accepted uncanceled past plans:

- Graph: **Past**
- Thread / Home: **Earlier together** / Past Shared Reality
- Attention: quiet history update everywhere; **no** “became a Memory” bell from time alone
- Do **not** label **Memory** unless Memory authority supports that term

## Services

- Phoenix `:4000` /health 200  
- Vite `:5173` 200  
- LAN `http://192.168.86.156:5173/` 200  

## Non-goals honored

- No reliability / flake / social-credit score  
- No location required for past history or Memory  
- No auto-publish of past / confirmed experience  
- No Track B WebRTC work  
- No merge / live  
- No founder QA for listed automated semantics  

## Founder walk (ONE)

See walk gate in final handoff. Track B PLAIN_CALL remains RED / out of scope.
