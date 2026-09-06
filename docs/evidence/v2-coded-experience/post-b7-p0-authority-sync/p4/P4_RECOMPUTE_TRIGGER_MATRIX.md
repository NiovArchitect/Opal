# P4 Recompute Trigger Matrix

**Checkpoint:** P4.0 · **Implement:** P4.4 (+ stubs from P4.1)

## Pipeline

```text
EVENT → AUTHORIZE/VALIDATE → PERSIST TRUTH
  → FIND AFFECTED DecisionContext(s)
  → MATCH invalidation_conditions
  → IF none match → NOOP (no UI)
  → ELSE delta-recompute affected dimensions only
  → COMPARE prior output vs new output
  → IF not material → NOOP
  → ELSE emit decision.recomputed + Signal Grammar consequence + Phoenix fanout
```

## Materiality (user-visible)

Material if any of:

- confidence_band changes  
- output kind changes (answer↔question↔tradeoff)  
- selected answer identity changes  
- blocking question identity changes  
- tradeoff pair changes  
- truth_state changes (e.g. provisional→needs attention)  
- hard constraint newly violated  

Not material (examples): score jitter, non-selected candidate churn, ambient telemetry.

## Dimension → typical triggers

| Dimension | Example invalidate_if | Example events |
|-----------|----------------------|----------------|
| people | participant leaves / declines | graph.context_changed, availability.changed |
| time | window moves | conversation commitment, journey.* |
| availability | required person unavailable | availability.changed |
| location | outside radius | location.context_changed |
| budget | exceeds hard cap | preference update, correction chip |
| vibe | explicit reject | correction chip, preference_updated |
| provider | venue unavailable / reservation fail | provider.reservation_* |
| weather | outdoor dependency broken | environment (when permitted) |

## Correction operators (Global Opal)

| Operator | Mutates | Preserves |
|----------|---------|-----------|
| Timing | time_window | people, place class, budget, vibe, intent |
| Budget | budget_context | people, time, vibe, intent |
| Vibe | vibe / soft prefs | people, time, budget hard caps |
| Refine | freeform soft constraint | all hard constraints unless contradicted |

## Signal Grammar mapping (consume P3; do not invent hues)

| Outcome | Likely signal |
|---------|---------------|
| Material recompute, still provisional | AQUA (context changed) or VIOLET (new provisional) |
| Needs user attention | CORAL (scarce) |
| Ready/reserved/confirmed earned | GOLD |
| Settled / no action | NEUTRAL / none |
| Do now action | CYAN |

Motion: presence-slow breath family if earned; urgency-fast only for live/incoming.
