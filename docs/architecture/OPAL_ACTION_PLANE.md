# Opal Action Plane

**Status:** ARCHITECTURE CURRENT · implementation HOLD until R1B physical blocker clears (controlled vertical only)  
**Extends:** P4 Decision Intelligence (`What should happen?`) → **Make it happen.**  
**Law:** `PROVIDER_TRUTH_BEFORE_CONFIRMED_STATE = CURRENT`

## Lifecycle

```text
DecisionResult
  → ActionIntent
  → PolicyGate (ActionGuardian)
  → ActionPreparation
  → Human confirmation if required
  → Executor
  → Provider / Browser / Handoff
  → ProviderReceipt
  → RealityEvent
  → Graph / Journey / Memory
  → personal consequences (Material Time / Phoenix)
```

## Required ActionIntent attributes

| Field | Notes |
|-------|-------|
| `action_id` | Stable id |
| `decision_id` | Link to DecisionResult |
| `graph_id` | When in shared scope |
| `actor_user_id` | Who initiated |
| `scope` | solo / relationship / shared |
| `action_kind` | e.g. `restaurant_reservation` |
| `risk_class` | read / propose / commit_external / spend / … |
| `provider` | OpenTable / browser / deep_link / … |
| `status` | drafted → awaiting_approval → executing → succeeded/failed |
| `requested_at` / `approved_at` / `executed_at` | Timestamps |
| `idempotency_key` | Mandatory for external commit |
| `provider_reference` | From ProviderReceipt only |
| `failure_class` | Structured, not free text dump |
| `retry_policy` | Safe retries only |
| `reversible` | Bool |
| audit metadata | Concise rationale — not raw chain-of-thought |

## Autonomy / approval ladder

**Action policy classes:** READ · PROPOSE · PREPARE · WRITE_REVERSIBLE · COMMUNICATE · COMMIT_EXTERNAL · SPEND · DESTRUCTIVE  

**User modes:** ALLOW_WITHIN_SCOPE · ASK_FOR_SOME · ALWAYS_ASK · DENY  

Launch defaults: conservative. Reservation commitment = ask. Payment / destructive = always ask.

## Separation of concerns

| Role | Owns |
|------|------|
| Opal Intelligence | Understands / proposes |
| ActionGuardian | ALLOW / DENY / ASK (sole auth boundary ≠ model) |
| CredentialVault | Secrets; reasoning sees handles only |
| Connector Executor | Scoped operations only |
| Action Ledger | What / when / for whom / why / provider / outcome |

## Anti-patterns

- Inferring provider success from UI tap  
- “Reserved” without ProviderReceipt  
- Deep-link handoff recorded as completed reservation  
- Credentials in Kafka / Phoenix / Graph / Memory / logs / frontend  

## First vertical (when authorized)

Dining/reservation preferred. One vertical proves the plane. Breadth race rejected.
