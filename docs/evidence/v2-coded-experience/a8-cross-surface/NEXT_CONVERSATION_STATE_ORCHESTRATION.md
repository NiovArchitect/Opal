# Conversation State Orchestration — sequencing (updated)

**SUPERSEDED sequencing:** document-only after A8 commit  
**CURRENT:** minimum arbitration **required now** for A8 closure (founder authority reset 2026-10-02)

```yaml
CURRENT_PRIORITY: whole_application_coherence_recovery
A8_COMMIT: held_until_whole_app_GREEN_plus_founder_phone
CSO_MINIMUM_ARBITRATION: REQUIRED_NOW
CSO_FULL_EXPANSION: after_a8_whole_app_freeze
Journey: BLOCKED
implement_authorized: minimum_arbitration_only
```

## Authority

Full model (layers, strands, hysteresis, freeform escape hatch):

→ [`docs/authority/CONVERSATION_STATE_ORCHESTRATION.md`](../../../authority/CONVERSATION_STATE_ORCHESTRATION.md)

Product layer laws:

→ [`docs/authority/PRODUCT_INVARIANTS.md`](../../../authority/PRODUCT_INVARIANTS.md)

Surface matrix:

→ [`docs/authority/STATE_SURFACE_CONTRACT.md`](../../../authority/STATE_SURFACE_CONTRACT.md)

## Sequencing

```text
whole-app coherence recovery
  → min CSO arbitration + temporal gating
  → automation GREEN
  → ONE founder phone walk
  → A8 whole-app freeze
  → full CSO expansion if remaining
  → Journey intelligence
```

## Boundary reminder

- A8 `SurfaceProjection` stays the cross-surface coherence owner.  
- CSO owns per-strand + per-participant → dominant UI mode / impossible-combo prevention.  
- Attention ≠ conversation state; Graph ≠ conversation state; Plan ≠ Execution ≠ Time.  
- No Track B in this path.
