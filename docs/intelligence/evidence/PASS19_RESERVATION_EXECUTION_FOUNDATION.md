# PASS 19 — Live Execution Foundation (Reservation)

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Prior:** Pass 18 `7cdb96b` (relationship audience trust)  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Opal can discover and rank real-world candidates (Pass 15).  
Pass 19 establishes a **truthful execution path**:

```text
availability (provider fact)
→ human authorization (explicit confirm)
→ reservation request (idempotent)
→ provider result (confirm | hold | fail | unknown)
→ reconcile if timeout
→ Shared Reality shared-safe patch
→ AttributionGraph transaction signal (NOT payout)
```

**LIVE EXECUTION: NOT CLAIMED**

OpenTable public create-reservation is partner-only. Foundation uses  
`SyntheticReservationProvider` (`synthetic_provider` mode). Handoff path  
(`BookingTransport`) remains for non-API reality.

**No payouts. No second brain. No fake live booking.**

---

## PASS 18 HOLDS (TRACKED, NOT BLOCKING)

| Gap | Status |
|-----|--------|
| 390 audience-selector UX incomplete | **HOLD** — social product polish |
| Realtime PubSub audience routing audit | **HOLD** — social product polish |

Encoded in `ReservationExecution.status()["pass18_holds"]`.

Neither blocks the execution lane.

---

## INTELLIGENCE PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
CURRENT EXECUTION ARCHITECTURE:
  ProviderBoundary, Booking.Executor, BookingBridge, BookingTransport,
  ExternalWorldTruth, PaymentReadiness (ambient), AVP² payments-only docs
CURRENT RESERVATION MODELS: ProviderBoundary states; handoff default
CURRENT AUTHORIZATION / AVP²: AVP² = payments only; booking = Opal capability
CURRENT PAYMENT MODELS: not built for reservation path
CURRENT PROVIDER ADAPTERS: places/travel (Pass 15); booking synthetic
CURRENT EVENT CONTRACTS: DomainEvent topic families reservation.* payment.*
EXPECTED NON-CHANGES: RelationshipGraph, SocialMoment*, ExperienceGraph,
  AttributionGraph law, AttentionAuthority, PersonalFlow, SF15, brand
```

`intelligence_check --impact --with-tests` → **PASS** (V2 MERGE HOLD)

---

## EXECUTION INVENTORY

| Capability | Owner | Real/Synthetic/Stub | Notes |
|------------|-------|---------------------|-------|
| Reservation availability | `SyntheticReservationProvider` + `ExternalWorldTruth` | **synthetic** | 3m TTL |
| Booking authorization | `BookingAuthorization` | real contract | not AVP² |
| Execution attempt | `ReservationExecution` + `ReservationExecutionRecord` | durable DB | audit trail |
| Provider boundary states | `ProviderBoundary` | existing | reused |
| Handoff booking | `BookingTransport` | handoff | never claims booked |
| Payment | — | **not required** on synthetic path | stop if required |
| Attribution on confirm | `AttributionGraph.attribute_transaction` | simulation-safe | no payout |
| Cancellation | `ReservationExecution.cancel` | synthetic provider | |
| Reconciliation | `ReservationExecution.reconcile` | synthetic | no blind retry |
| Live OpenTable API | — | **NOT CLAIMED** | partner-only |

---

## RESERVATION PROVIDER

| Field | Value |
|-------|-------|
| Provider | `synthetic_reservation` |
| Mode | `synthetic_provider` |
| LIVE | **NOT CLAIMED** |
| Partner API | false |
| Hold support | yes (distinct from confirmed) |
| Payment | not required (stops at `payment_authorization_required` if forced) |

---

## AVAILABILITY CONTRACT

Required:

- `provider`, `provider_place_id`, `party_size`, date/time/slot
- `observed_at`, `expires_at`, `availability_id` / `slot_id`
- provenance via `ExternalWorldTruth.fact_envelope`
- TTL: **3 minutes** (`reservation_availability`)

Not inferred from: hours, capacity, ratings, LLM.

Query context: place id + party + time only — no transcripts/memory/calendar titles.

Stale slot → `{:error, :availability_expired}`.

---

## AUTHORIZATION OWNER

`BookingAuthorization`

- actor, capability `restaurant_reservation`, place, party, slot
- `explicit_confirm: true` required
- expires_at, revoke, place/party/slot mismatch checks
- human copy: `Reserve Juniper & Ivy\nThursday · 7:30 PM\n2 people`
- **not** `can_book=true` alone
- **not** AVP² (payments)

---

## EXECUTION OWNER

`ReservationExecution` → durable `reservation_executions` table

---

## EXECUTION STATE MODEL

```text
checking | available | unavailable | selected
authorization_required | authorized | requested
held | reconciling | confirmed | failed | expired | cancelled
```

UI does not expose the full machine. Human copy only on outcomes that matter.

---

## RESULTS MATRIX

| Scenario | Result |
|----------|--------|
| AVAILABLE | slots + envelope + freshness |
| UNAVAILABLE | empty slots, plan preserved |
| EXPIRED SLOT | reject book |
| AUTHORIZATION | explicit confirm; revoke works |
| BOOKING REQUEST | durable row, status requested→… |
| CONFIRMATION | only after provider confirmed |
| TIMEOUT | reconciling; no blind retry |
| RECONCILIATION | provider truth → confirmed/failed |
| DOUBLE-BOOK GUARD | same idempotency_key → same execution |
| CANCELLATION | confirmed → cancelled; payout invalidated flag |
| SHARED REALITY | shared-safe patch only (no auth secrets) |
| CHRONOLOGY | social fit ≠ confirmed |
| NOTIFICATION | quiet on checking; human on confirm/fail |
| PERSONAL | party_size=1 OK |
| GROUP | one booking actor; shared consequence |
| SOCIAL MOMENT→EXEC | lineage + attribution chain |
| ATTRIBUTION TX | attributed, `is_payout: false` |
| PAYMENT | synthetic path not_required; pay path stops |
| PRIVACY | booking ≠ moment visibility expand |
| ATTENTION | intermediate silent |
| SOCIAL TRUST | Pass 18 invariants still hold |

---

## IDEMPOTENCY

Key: `reality + provider_place + slot + authorization_id`  
(or explicit `idempotency_key`)

Unique index on `reservation_executions.idempotency_key`.

---

## CONFIRMATION TRUTH

Only provider `status == confirmed` sets `booked: true`.  
HTTP sent / handoff / slot selected ≠ reservation.

---

## FAILURE LAW

Provider fail → WHO/WHAT/WHEN/where preference preserved.  
No plan restart. Human: “Reservation didn't go through. Your plan is still intact.”

---

## ECONOMICS BOUNDARY

```text
BOOKING CONFIRMED ≠ ECONOMIC VALUE EARNED ≠ PAYOUT
```

Attribution receives transaction signal; simulation-safe; no creator dashboard.

---

## 390 UX RESULT

Backend human authorization copy ready.  
Full product “Confirm reservation” surface on 390: **not captured this pass**  
(authority path complete; shell polish later).

---

## TESTS

| Suite | Result |
|-------|--------|
| `reservation_execution_test.exs` | **20 / 0 fail** |
| external_world_truth + provider_vertical | PASS |
| relationship_audience_trust + social_moment_publishing | PASS |
| intelligence golden + social reality core | PASS |

**71** combined related tests, **0 failures**.

---

## FILES

| Path | Role |
|------|------|
| `reservation_execution.ex` | Owner: check → auth → book → reconcile → cancel |
| `reservation_execution_record.ex` | Durable Ecto schema + shared Reality patch |
| `booking_authorization.ex` | Explicit human booking authority |
| `synthetic_reservation_provider.ex` | Synthetic adapter (LIVE not claimed) |
| `20260823000001_create_reservation_executions.exs` | Migration |
| `reservation_execution_test.exs` | Matrices |
| `PASS19_RESERVATION_EXECUTION_FOUNDATION.md` | Evidence |

Reused (not duplicated): `ExternalWorldTruth`, `ProviderBoundary`, `BookingTransport`, `AttributionGraph`.

---

## KNOWN GAPS

1. **LIVE partner reservation API** — not integrated; NOT CLAIMED  
2. **390 product Confirm UX** — backend ready  
3. **Async webhook authentication** — synthetic reconcile only  
4. **Payment tokenization** — intentionally stopped before charge  
5. **Pass 18 holds** — audience selector UX + PubSub routing  
6. **Google Places key** — may still be unset; independent of execution fixture  
7. **LOCAL_DEV media** — separate gap  

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

---

## FINAL LAW (ENCODED)

```text
GOOD FIT IS NOT AVAILABILITY.
AVAILABILITY IS NOT AUTHORIZATION.
AUTHORIZATION IS NOT CONFIRMATION.
A REQUEST IS NOT A RESERVATION.
A TIMEOUT IS NOT FAILURE.
A RETRY MUST NOT CREATE TWO BOOKINGS.
PROVIDER CONFIRMATION IS EXTERNAL TRUTH.
FAILURE DOES NOT DESTROY THE PLAN.
TRANSACTION TRUTH CAN FEED ATTRIBUTION.
ATTRIBUTION STILL DOES NOT MEAN PAYOUT.
LIVE EXECUTION: NOT CLAIMED UNTIL PARTNER PATH IS REAL.
```
