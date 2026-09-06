# P4.5 Event Materiality Policy

**Version:** `p4.5.materiality.v1`  
**Owner:** Elixir Decision Intelligence (deterministic first pass)

## Classes

| Class | Meaning | Model? | Human? |
|-------|---------|--------|--------|
| `NO_EFFECT` | Event not tied to active decision / dependency | No | No |
| `EVIDENCE_REFRESH_ONLY` | Freshness/provenance update; answer unchanged | No | No |
| `DETERMINISTIC_RESULT_UPDATE` | Provider state / metadata update without ladder | No | Only if shareable truth_state demands |
| `RECOMPUTE_REQUIRED` | Feasibility/ranking/scope/truth may change | Maybe | Only if outcome material |
| `USER_ACTION_REQUIRED` | Human gap or confirmation needed | Maybe | Yes (Coral scarce) |
| `URGENT_INVALIDATION` | Current answer unsafe (closed, hard fail) | Prefer fast deterministic | Yes if actionable |

## Decision order

1. Active DecisionContext?  
2. Entity in dependency index?  
3. Matches `invalidation_conditions` or changes a tracked premise?  
4. Value meaningfully different (hysteresis)?  
5. Changes feasibility, selected identity, mode, truth_state, or actionability?  
6. Commitment stage allows auto-adapt?

## Hysteresis (anti-flap)

- ETA / travel: ignore sub-threshold deltas (policy: ≥5 min or ≥15% for nearby plans).  
- Score-only churn without identity/mode change → `NO_EFFECT` / silence.  
- Track `DECISION_FLAP_COUNT` when answer identity flips twice within 30s without hard invalidation.

## Same answer after recompute

If mode + answer entity + human actions unchanged → settle silently. No P3 breath, Activity, or notification.
