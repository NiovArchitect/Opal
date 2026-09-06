# P4 Evidence Arbitration Contract

**Checkpoint:** P4.0 · **Implement with engine:** P4.1+

## Evidence envelope (minimum)

| Field | Meaning |
|-------|---------|
| `evidence_id` | Stable id |
| `dimension` | e.g. people, time, budget, vibe, availability, provider |
| `claim` | Structured claim |
| `visibility` | `PRIVATE_USER` \| `RELATIONSHIP` \| `SHARED_GROUP` \| `INFERRED` \| `EXTERNAL_VERIFIED` |
| `source` | user \| conversation \| graph \| provider \| system \| model |
| `confidence` | Local strength of this claim (not decision band alone) |
| `freshness` | `fresh` \| `aging` \| `stale` |
| `observed_at` | When known |
| `consent_purpose` | Why this may be used |
| `stale` / `conflicted` | Flags |

## Precedence (high → low)

1. **Explicit user correction** (this revision)  
2. **Shared group truth** (accepted/committed)  
3. **Externally verified provider / world**  
4. **Relationship-shared** permitted facts  
5. **Private user** (engine may use; **never** surface to others)  
6. **Inferred** model hypotheses  
7. **Stale** demoted / must refresh or become unknown  

## Hard vs soft

- **Hard constraints:** violate → cannot be HIGH; may force MEDIUM question or LOW tradeoff.  
- **Soft preferences:** bendable; do not alone create CORAL needs-you.

## Unknown ≠ false

Missing availability is **unknown**, not “unavailable.” Unknowns should appear in `unknowns[]` and may lower confidence band or generate one blocking question.

## Group-safe explanation

Shared UI may only cite evidence with visibility ≤ SHARED_GROUP / EXTERNAL_VERIFIED / explicit relationship share. Private preferences may shape the answer silently.
