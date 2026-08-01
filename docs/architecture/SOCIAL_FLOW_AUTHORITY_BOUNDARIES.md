# Social Flow Authority Boundaries

**Authority:** ARCHITECTURE (CURRENT)  
**Status:** Elixir/OTP ownership of Social Flow truth — **not** an implementation claim  
**Related:** `SOCIAL_FLOW_ARCHITECTURE.md`, `PYTHON_AI_BOUNDARY.md`, `CONSENT_GATE_EXECUTION.md`, `AI_JOB_LIFECYCLE.md`, `BEAM_AI_CONCURRENCY.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, SF-D003

---

## Locked rule

> **Elixir / OTP owns authoritative relationship and Social Flow state.**  
> **Python returns schema-validated proposals only.**  
> **Mobile holds projections and offline UX — never final social truth.**

Python **never** creates authoritative:

- shared plans  
- RSVPs / participation state transitions  
- availability grants  
- relationship labels (as truth)  
- commitments  
- plan revisions  
- reminder jobs that imply confirmed obligation without Elixir state  
- consent records  

This is SF-D003 and product-truth runtime ownership.

---

## What “authoritative” means

| Property | Elixir responsibility |
|----------|----------------------|
| **Source of truth** | PostgreSQL (or successor) rows written only by core domain APIs under authz |
| **Agreement rules** | When a proposal may become a `SharedPlan`; quorum / dual accept / organizer rules |
| **Visibility** | Membership, surprise exclusion, private holds vs shared fields |
| **Time** | Server clocks for expiry, reminder schedule, grant windows |
| **Identity** | `user_id`, device session, guardian links when present |
| **Audit** | Who changed participation, grants, consents, plan versions |
| **Realtime** | PubSub / channels fan-out of **already committed** state |
| **Idempotency** | Keys for invites, RSVPs, revisions, AI job enqueue, reminder scheduling |

Clients and Python may **suggest**. Only Elixir **commits**.

---

## Authoritative domain objects (conceptual)

Aligned with product primitives; ownership is BEAM-side:

| Object | Authority notes |
|--------|-----------------|
| **Relationship / circle membership** | Who is in which boundary; not inferred permanently by AI |
| **Relationship label (user-confirmed)** | Stored after user confirm; AI may only suggest |
| **ConsentProof / capability grants** | Loaded and validated in Elixir; never trusted from client boolean |
| **AvailabilityGrant** | Scope, precision (exact / free-busy / windows / ask / none), expiry |
| **PlanProposal** (stored proposal) | Artifact from Python or user action; **not** an event |
| **TimeOption / PlanPoll / responses** | Poll tallies and close rules on BEAM |
| **SharedPlan + PlanRevision** | Versioned social agreement |
| **ParticipationState** | invited → … → accepted / declined / withdrawn / removed |
| **Commitment** | Person agreed to do something; user- or rule-confirmed |
| **PersonalHold** | Private; never auto-published |
| **Restricted surprise roster** | Explicit include/exclude; guest excluded |
| **CalendarProjection** | Derived view/export; not primary truth |
| **Reminder / adaptation jobs** | Scheduled from authoritative plan state (Oban or equivalent) |
| **Audit / idempotency records** | Durable |

Historic blockchain “immutable social proof” maps to **private exportable history + audit**, not chain dependency (SF-D006).

---

## Consent and permission proofs

### Hard gate

**Never trust client-supplied consent status.**  
Requests may carry `consent_proof_id` (or equivalent). Elixir loads the row and validates (see `CONSENT_GATE_EXECUTION.md`).

Checks (illustrative; all must pass before AI dispatch or high-trust mutation):

1. Proof exists  
2. Capability matches intended action/job  
3. `user_id` matches requester  
4. Conversation / plan scope matches  
5. Status is granted  
6. Not revoked  
7. Not expired  
8. Policy version accepted  

On failure: **do not** create durable AI work; **do not** call Python; **do not** mutate plan authority.

### Permission dimensions (Social Flow)

| Dimension | Enforced by Elixir |
|-----------|-------------------|
| Conversation membership | Read/write messages; see in-thread proposals |
| Plan membership / role | Invite, revise, close poll |
| Availability grant | What free/busy computation may reveal |
| Feature consent | AI plan interpretation, memory, etc. |
| Action consent | Accept plan, send draft, share private hold |
| Surprise boundary | Projection and notification filters |
| Block lists | Short-circuit invites and messaging |

Python receives opaque proof identifiers for correlation only. **Python cannot approve, grant, or extend consent.**

---

## Supervised processes (OTP shape)

Conceptual topology for Social Flow (extends BEAM concurrency model):

```text
Application Supervisor
├── Endpoint / Channels (realtime)
├── Registry (conversation, plan, user keys)
├── DynamicSupervisor — ConversationRuntime
│     └── ConversationServer
│           - message ordering coordination
│           - projects events to members
├── DynamicSupervisor — PlanNegotiation (optional)
│     └── PlanSessionServer (active negotiation only)
│           - coordinates polls/options for hot plans
│           - durable truth still in DB
├── SocialFlow.Orchestrator (or domain contexts)
│     ├── ConsentGate
│     ├── Authz (membership, grants, blocks)
│     ├── PlanAuthority (proposal → agreement → revision)
│     ├── ContextSelector (bounded AI payload)
│     └── JobDispatcher (Oban)
├── Oban
│     ├── AI process workers
│     ├── Reminder / adaptation workers
│     └── Erasure / export workers (later)
├── PubSub
└── PostgreSQL (authoritative state)
```

### Principles

1. **Active negotiation may be process-shaped**; idle plans hibernate/stop and reload from DB.  
2. **Crash of a PlanSessionServer must not corrupt truth** — state rebuilds from durable rows.  
3. **Messaging path does not await AI** unless the user action is explicitly AI-bound.  
4. **Per-conversation / per-plan fault isolation** — one hot plan cannot take down the node.  
5. **Backpressure** via Oban concurrency, per-user rate limits, and circuit breakers to Python.

---

## Realtime lifecycle for plans

```text
Authoritative mutation in Elixir (transaction)
  → commit SharedPlan / Participation / Poll / Revision
  → publish domain event (PubSub)
  → member channels receive projection
  → mobile updates local store
```

Rules:

- Realtime carries **facts already authorized**, not Python guesses as commitments.  
- Proposals may be pushed as **dismissible affordances** clearly typed as non-binding.  
- Surprise guests are **filtered out** of event topics / payloads.  
- Revoked membership ends further events for that user on that plan.  
- Offline clients reconcile by fetching authority on reconnect — last-write rules per ADR offline sync; **server remains arbiter** of participation and plan version.

---

## Durable scheduling

| Job class | Trigger | Authority check |
|-----------|---------|-----------------|
| AI interpretation | Message create or user “help coordinate” | ConsentGate + membership + capability |
| Reminder | Commitment / plan time / user reminder | Plan or personal-hold ownership; not raw AI text alone |
| Adaptation nudge | Plan revision or time change | Membership; high-trust notify rules |
| Grant expiry | `expires_at` | System clock; revoke computed access |
| Erasure / export | User or guardian request | Authz + audit |

Scheduling is **Oban-durable** (or equivalent): survives node restart; retries are idempotent; terminal failures are observable.

Reminders fire only for **confirmed** commitments or user-accepted candidates — never for unconfirmed AI speculation (relationship safety).

---

## Idempotency

Every mutating Social Flow path that can be retried must carry an idempotency key:

| Path | Why |
|------|-----|
| Message-driven AI job enqueue | Duplicate message delivery / client retry |
| RSVP / participation transition | Double-tap accept |
| Plan create from agreement | Concurrent “looks agreed” clients |
| Invite create | Network retry |
| Plan revision | Concurrent edits → version + idempotency |
| Reminder schedule | Worker retry must not double-notify without policy |

Pattern: unique constraint / upsert on idempotency key; duplicate returns prior result without second side effect (see AI job lifecycle).

---

## Agreement threshold (authority boundary)

Conceptual pipeline (product truth):

```text
Conversation message (Elixir persists)
  → Consent / capability check (Elixir)
  → Bounded Python plan interpretation
  → Schema-validated PotentialPlan proposal
  → Elixir stores proposal (not event)
  → User consents to coordinate
  → Negotiation (options / poll / chat)
  → Agreement threshold met (Elixir rules)
  → Authoritative SharedPlan + version
  → Realtime, commitments, reminders, adaptations
```

**Only Elixir decides** that agreement threshold was met.  
Python may say “both mentioned Thursday” with uncertainty; that is **evidence**, not RSVP.

---

## Python boundary (negative list for authority)

Python **must not**:

| Forbidden write | Reason |
|-----------------|--------|
| Insert/update `SharedPlan` as committed | Authority |
| Set participation to accepted/declined | Authority |
| Create `AvailabilityGrant` | User permission truth |
| Finalize relationship label | User confirm only |
| Fan-out invites or push as committed plan | Side effects |
| Schedule reminders that imply obligation without plan/commitment rows | Side effects |
| Extend or mint consent | Consent ownership |
| Bypass block / membership | Security |

Python **may**:

- Return `PotentialPlan`-shaped proposals with uncertainty and missing fields  
- Suggest prompts, time candidates, draft copy  
- Suggest relationship labels **as suggestions**  
- Return `refused` / safety flags  

All responses schema-validated in Elixir against `packages/contracts` before any persist of artifacts.

---

## Relationship state vs Social Flow state

| Concern | Owner | Notes |
|---------|--------|-------|
| Message order, delivery, membership | Elixir | Messaging runtime |
| Confirmed relationship labels / circle edges | Elixir | After user confirmation |
| Plan and commitment lifecycle | Elixir | This document |
| Inferences and extractions | Python | Non-authoritative |
| Local UX projection | Mobile | May queue optimistic UI; reconcile to server |

Cross-circle leakage is prevented by **authz on read and on AI context selection**, not by hoping the model forgets.

---

## Observability and proof

Authority paths should emit enough structure for:

- consent denials (no Python call)  
- agreement commits (who, plan version)  
- idempotent replays  
- isolation tests (wrong user cannot mutate)

Without turning logs into an intimate data lake — minimize payload content in logs.

---

## Non-goals

- Implementing PlanSession GenServers in this documentation phase  
- Multi-region sequencing final design  
- External calendar provider authority (projection only if added later)  

---

## Open questions

- Exact agreement rules for multi-party plans (unanimous vs organizer+majority)  
- Whether PlanSessionServer is required for MVP two-user slice or DB+Oban suffices  
- Standing rules for auto-accept within a circle (product; must stay visible and revocable)  
