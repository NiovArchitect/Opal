# P4 DecisionContext Contract

**Checkpoint:** P4.0 (contract) · **Implement:** P4.1  
**Truth owner:** Elixir / Postgres  
**Companion JSON:** `P4_DECISION_CONTEXT_CONTRACT.json`

## Purpose

First-class domain object for what Opal is deciding, why, for whom, and when it becomes invalid. Not a prompt string.

## Required fields (conceptual)

| Field | Meaning |
|-------|---------|
| `decision_id` | Stable id |
| `decision_revision` | Monotonic revision (current wins) |
| `initiator_user_id` | Who started |
| `scope_type` | `solo` \| `dyad` \| `group` \| `family` \| `graph` \| `journey` |
| `scope_ids` | Participant / graph / journey ids |
| `intent` | Job declared (e.g. date_ideas, nearby_now) |
| `people` | WHO in scope |
| `relationship_context` / `group_context` | Dyad/group nuance |
| `time_window` | When |
| `location_context` | Where (privacy-classed) |
| `availability` | Feasibility |
| `budget_context` | Spending fit |
| `preference_context` / `vibe` | Soft experiential fit |
| `past_moments` | Prior lived evidence (non-mechanical repeat) |
| `conversation_evidence` | Permitted excerpts / refs |
| `graph_context` / `journey_context` | Same Reality linkage |
| `provider_context` | External feasibility |
| `environment_context` / `world_context` | Weather/traffic/etc when permitted |
| `privacy_scope` | Default visibility of this decision |
| `hard_constraints` | Must satisfy |
| `soft_preferences` | Prefer |
| `unknowns` | Explicit unknowns (≠ false) |
| `conflicts` | Material conflicts |
| `evidence` | Evidence envelopes (see arbitration contract) |
| `invalidation_conditions` | Machine-usable invalidate_if set |
| `confidence_band` | `high` \| `medium` \| `low` |
| `truth_state` | e.g. `provisional` until accepted/reserved |
| `output` | Compressed visible decision (answer / question / tradeoff) |
| `created_at` / `updated_at` | Timestamps |

## Laws

- **DECISION_CONTEXT_SCOPE_INTEGRITY:** visible WHO = engine WHO. DYAD ≠ SOLO.  
- **Evidence + invalidation required** on every produced decision.  
- Revisions: clients may hold stale revision; server current revision wins; idempotent apply.  
- Private evidence never appears in shared group explanation.

## Output shapes (visible)

```text
HIGH   → { kind: "answer", candidate: one, hue: violet_provisional }
MEDIUM → { kind: "question", question: one_blocking }
LOW    → { kind: "tradeoff", options: exactly_two_meaningful }  // not a dump
EXPLORE→ { kind: "explore", ... }  // only via More ideas / explicit ask
```

Gold only when truth_state earns shared/confirmed/reserved/ready.
