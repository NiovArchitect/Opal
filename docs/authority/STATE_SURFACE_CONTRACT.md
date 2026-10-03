# STATE → SURFACE CONTRACT

**Status:** CURRENT AUTHORITY (cross-surface presentation law)  
**Synced:** whole-application coherence recovery 2026-10-02  
**Composes:** SharedPlan · ConversationAlignment · AttentionAuthority · SurfaceProjection (A8) · CSO min arbitration

```yaml
authority_class: STATE_SURFACE_CONTRACT
one_truth: true
one_canonical_action: true
multiple_coherent_projections: true
```

## Owners

| Concern | Canonical owner |
|---------|-----------------|
| Agreement truth | SharedPlan / ConversationAlignment |
| Temporal lifecycle | Plan temporal arbitration (Clock + resolved_on/start) |
| Execution / booking | PlanExecution / BookingAuthorization |
| Who to interrupt | AttentionAuthority |
| Where / how to project | SurfaceProjection (A8) |
| Strand + participant UI mode | CSO (minimum now; full later) |

## Matrix

### PLAN SET + FUTURE + EXECUTION AUTH NEEDED

| Surface | Projection |
|---------|------------|
| Home | Quiet plan truth if relevant |
| Chats | Ready · time · place (compact) |
| Thread | Plan set **and** Reservation approval separately identified |
| Graph list | Ready + compact execution substate if useful |
| Graph Detail | Full execution truth |
| Attention | For you → Approve reservation **only** for required authorizer |
| Execution CTA | One canonical owner (Thread or Graph Detail per SurfaceProjection) |

### PLAN PAST

| Surface | Projection |
|---------|------------|
| Home | Not upcoming |
| Chats | Historical consequence only |
| Thread | Historical plan context (no future booking CTA) |
| Graph active list | Not upcoming Ready |
| Graph Detail | History / outcome truth |
| Attention | No future execution CTA |
| Next Together | Not eligible |

### PENDING CHANGE PROPOSAL (e.g. 8:00 vs committed 7:30)

| Surface | Projection |
|---------|------------|
| Thread | Owns Accept / Keep for required responder |
| Attention | Review deep-link to canonical proposal surface |
| Graph Detail | Pending status line only |
| Chats | Compact consequence (e.g. “8:00 PM proposed”) |
| Home | Default none |
| Banner | Suppressed in active canonical context |
| Proposer | Never approval CTA |
| Reservation | Suppressed while proposal pending |

## Dominant interaction copy rules

- Never present plan agreement language as if it were execution authorization.  
- Never present past temporal state as Next Together / upcoming Ready.  
- If nobody needs to act: no CTA.  
- If someone else must act: calm waiting.  
- One casual message must not erase unresolved action (state stability).

## Impossible combinations → regression failures

See `PRODUCT_INVARIANTS.md` and `REGRESSION_LEDGER.md`.
