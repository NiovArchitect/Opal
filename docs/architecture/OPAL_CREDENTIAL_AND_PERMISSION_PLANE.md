# Credential and Permission Plane

**Status:** ARCHITECTURE CURRENT · product vault NOT YET COMPLETE  
**Flags:** `CREDENTIAL_ISOLATION_DOCTRINE = CURRENT` · `ACTION_GUARDIAN_DOCTRINE = CURRENT` · `ACTION_AUDIT_DOCTRINE = CURRENT`

## Credential isolation

```text
CredentialVault
  → scoped credential handle
  → Connector Executor
```

Reasoning / Intelligence sees a **capability handle**, not password/token.  
Secrets encrypted. Server-only where applicable. Rotation and revocation supported.

**Never place connector credentials in:**

Kafka payload · Phoenix payload · DecisionContext · Graph · Memory · logs · frontend

## ActionGuardian

Independent policy owner. Intelligence proposes; Guardian decides **ALLOW / DENY / ASK**.

Inputs: user permission policy · action class · risk · scope · provider · cost · audience · reversibility · context · current user instruction.

The reasoning model is **not** the sole authorization boundary.

## Permission modes (action classes, not nag every 30s)

Examples:

| Capability | Launch posture |
|------------|----------------|
| Calendar read | Allow (scoped) |
| Calendar create | Ask if new commitment |
| Restaurant availability | Allow (scoped) |
| Restaurant reservation | Always ask |
| Invite friends | Ask |
| Send external message | Ask per policy |
| Spend money | Always ask |
| Location | Foreground / contextual |
| Private relational projection | Never expose raw source |

## Wallet (architect only — do not build general fintech now)

Separate: payment credential · approved amount · merchant/provider · single transaction · action authorization.  
Reasoning never sees raw card credentials.

## Data controls (more complex than Muse)

Distinguish:

| Plane | Meaning |
|-------|---------|
| PRIVATE_MEMORY | Known only for me |
| RELATIONSHIP_MEMORY | Legitimately derived about A↔B |
| SHARED_REALITY | Jointly created Graph/Journey facts |
| ACTION_HISTORY | External actions Opal performed |

User may erase private memory and withdraw private evidence from future reasoning.  
One participant must **not** unilaterally rewrite four-person shared reservation history for everyone.  
Exact shared-deletion semantics = open product/legal authority until founder-approved.  
Do not implement one dangerous “reset everything” across shared Graphs.

## Settings integration

Preserve CURRENT You authority. Additive future surfaces (Connectors, Devices, Secure Credentials, Permissions, Messaging Channels, Action History, Wallet when earned, Notifications, Data Controls) integrate with existing Privacy / Location / Calls / Feed / Safety — do not replace them.
