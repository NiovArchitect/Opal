# STATE OWNERSHIP LAW

**Status:** CURRENT AUTHORITY (steward Pass 1)  
**Synced:** 2026-10-12  
**Composes with:** `STATE_SURFACE_CONTRACT.md` · `PRODUCT_INVARIANTS.md` · `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md`

```yaml
authority_class: STATE_OWNERSHIP_LAW
one_authority_owner_per_fact: true
surfaces_are_projections: true
ai_is_not_owner: true
```

## Law

> Every piece of information must have exactly one authority owner.

Surfaces (Home, Chats, Graph, Attention, Notifications, History) **project** ownership.  
They never invent a second truth.

AI suggestions are **candidates**. They become reality only when written through the owner.

## Owners (canonical)

| Fact | Authority owner | Not owners |
|------|-----------------|------------|
| Plan time | `SharedPlan` alignment / `start_at` (via PlanStateArbitration canonical start) | Home card, chat bubble, notification copy, AI suggestion |
| Plan place | SharedPlan alignment place + PlaceIdentity | Graph membership, friendship, prior visit |
| Plan agreement | ConversationAlignment / SharedPlan commitment | Bell badge, UI button alone, notification alone |
| Change proposal / acceptance | Alignment change_proposal + accept/keep actions | Attention deep-link (projects only), banner |
| Execution / booking auth | PlanExecution / BookingAuthorization | Plan agreement language |
| Who to interrupt | AttentionAuthority | Unread counts, Home ambient |
| Memory | MemoryCandidate → confirmed Durable Memory | Completed plan alone, GPS inference, AI assumption |
| User location | Permissioned location service | Graph membership, friendship |
| Attendance / occurrence | Explicit confirmation evidence | Silent plan-past transition |

## Multi-lineage rule

Multiple `SharedPlan` rows per conversation are lawful (history, residue, new intent).

**Current reality** is exactly one open lineage:

```text
ConversationAlignment.active_plan_for_conversation/1
  → newest status in tentative | agreed | changed
```

Never `Repo.get_by(SharedPlan, conversation_id: …)` — that crashes on duplicates and implies a false uniqueness.

Historical duplicates must be **reconciled** (cancelled / superseded), not left as competing active truths.

## Reconciliation posture

Real users will create duplicates, date changes, cancels, calendar conflicts, and relationship changes.

Opal must **reconcile**, not assume perfect data:

```text
Detect ambiguity
  → Choose authority lineage
  → Supersede competitors
  → Project one reality across surfaces
```

Reusable entry: `ConversationAlignment.reconcile_conversation_plans/1` (and future RealityRepair tooling). Do not one-off repair only Fort Oak.

## Required zeros

- `REPO_GET_BY_SHARED_PLAN_BY_CONVERSATION = 0` in product paths
- `MULTIPLE_ACTIVE_PLANS_WITHOUT_RECONCILE = 0` after repair runs
- `SURFACE_INVENTS_TIME_OR_PLACE = 0`
- `AI_ASSUMPTION_BECOMES_DURABLE_WITHOUT_CONFIRM = 0`
