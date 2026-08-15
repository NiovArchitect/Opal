# PASS 20 — Live Reservation Experience UX Closure

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Prior:** Pass 19 `899e0ca`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 19 built execution truth.  
Pass 20 makes that truth feel like **Opal** — one Reality consequence, not a booking app.

```text
PLACE FITS
→ Check availability
→ 7:30 is available
→ Reserve 7:30
→ Confirm sheet (exact human copy)
→ Reserving… / Checking…
→ Reservation confirmed | failed | held | cancelled
→ drift if Reality later diverges
```

**DEVELOPMENT / SYNTHETIC EXECUTION PROOF**  
Live restaurant booking is **NOT CLAIMED**.

No payouts. No new execution engine. No OpenTable/Resy partnership claim.

---

## PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
TARGET: execution presentation only
EXECUTION OWNER: ReservationExecution
AUTHORIZATION OWNER: BookingAuthorization
ATTENTION OWNER: AttentionAuthority (unchanged)
SHARED REALITY OWNER: SocialReality / OpalResolution path
EXPECTED NON-CHANGES: execution semantics, idempotency, reconcile,
  attribution, relationship trust, brand, attention ranking,
  provider truth boundary
```

`intelligence_check --impact --with-tests` → **PASS** (V2 MERGE HOLD)

---

## FIGMA EXECUTION SURFACES

**File:** Experience World V2 `fy69K8cCug9prf5GLwQ7Hy`

Search for reservation/booking/confirm frames: **no dedicated reservation product frame**.

Only related note: `4:32` “No BOOK THIS scream. Content first…”

**Composition law applied:** execute inside existing Shared Reality / Curate / journey CTA grammar — not a new visual subsystem.

---

## CURRENT PRODUCT ROOT CAUSE (pre-Pass 20)

Execution engine existed (Pass 19) but humans could not naturally:

- check availability as a consequence  
- authorize with concrete copy  
- see held ≠ confirmed  
- recover from fail without plan death  
- detect Reality vs reservation drift  

Root cause: **presentation gap**, not missing state machine.

---

## STATE PROGRESSION (CTA)

| Phase | Primary CTA | Human consequence |
|-------|-------------|-------------------|
| place_selected | Check availability | — |
| checking | (quiet) | — |
| available | Reserve {slot} | {slot} is available. |
| authorize | Confirm | auth sheet body |
| pending | (none) | Reserving… |
| reconciling | (none) | Checking that reservation… |
| held | Confirm / Cancel | Held for a few minutes. |
| confirmed | Cancel reservation | reserved / confirmed copy |
| failed | Try another time / recheck | Couldn't reserve… plan intact |
| expired | Check again | That time needs a fresh check. |
| payment_required | none | Payment required to continue. |
| drift | Review reservation | Your reservation is still for… |
| cancelled | Check availability | Reservation cancelled. Dinner can stay. |

**Looks good does not book.**

---

## RESULTS MATRIX

| Check | Result |
|-------|--------|
| CHECK AVAILABILITY | human slots; no TTL/ids in copy |
| AVAILABILITY UX | selected chip times |
| AUTHORIZATION UX | Reserve place / when / party · Confirm / Not yet |
| DOUBLE TAP | confirmPending + busy ref; server idempotency |
| PENDING | Reserving… quiet |
| CONFIRMED | only server confirmed |
| HELD | not rendered as confirmed |
| FAILED | plan preserved copy |
| TIMEOUT | reconciling copy, no second Confirm |
| RECONCILIATION | same surface updates |
| EXPIRED | fresh check copy |
| PAYMENT-REQUIRED | stop, no card UI |
| SHARED REALITY | same Reality gains consequence |
| GROUP | party size from composition |
| PERSONAL | party_size supported |
| SOCIAL MOMENT | lineage on request; no creator notify |
| CANCELLATION UX | two-step Yes, cancel |
| CANCEL RESULT | plan remains; reservation cancelled |
| EXECUTION DRIFT | detected; no auto-update booking |
| ATTENTION | intermediate quiet |
| NOTIFICATION | Pass 14 path reused (human consequences) |
| ATTRIBUTION PRIVACY | is_payout false; no creator UI leak |
| PASS 18 HOLDS | still open (encoded) |

---

## 390 RESULTS

Product surface wired in chat journey row when place+when ready:

- Check availability  
- slots  
- authorize sheet  
- pending / confirmed / failed / cancel  

**DEVELOPMENT / SYNTHETIC** badge always visible.  
Full pixel 390 capture suite: partial (logic + component + styles ready; visual capture not blocking).

---

## BUTTON SWEEP (logic)

| Button | Expected | Actual (tests) |
|--------|----------|----------------|
| Check availability | → checking → slots | PASS |
| Slot choice | selects label | PASS |
| Reserve | → authorize | PASS |
| Confirm | → pending → server | PASS (double-tap safe) |
| Not yet | back to available | PASS |
| Cancel reservation | cancel confirm | PASS |
| Yes, cancel | cancelled | PASS |
| Check again | expired recovery | PASS |

---

## ACCESSIBILITY

- Auth dialog: `role=dialog`, `aria-modal`, labelled title  
- Escape dismisses authorize/cancel sheet  
- Confirm focuses on open  
- `aria-busy` on pending  
- `aria-live=polite` for consequence  
- Primary disabled while pending  

---

## PASS 18 HOLDS (NOT CLOSED)

```text
390_audience_selector_ux_incomplete
realtime_pubsub_audience_routing_audit
```

Present on every `ExecutionUxState.pass18Holds` and Pass 19 status.

---

## TESTS

| Suite | Result |
|-------|--------|
| `reservationExperience.test.ts` | **16 / 0 fail** (EXEC-UX-01…07 + properties) |
| `reservation_execution_test.exs` | **22 / 0 fail** (incl. drift) |
| relationship audience trust | PASS (non-regression) |
| intelligence golden + social reality | PASS |

---

## FILES

| Path | Role |
|------|------|
| `opalUi/reservationExperience.ts` | CTA machine, drift, human copy |
| `opalUi/ReservationExperiencePanel.tsx` | Product surface |
| `opalUi/reservationExperience.test.ts` | Golden episodes |
| `OpalApp.tsx` | Journey wiring |
| `designTokens.ts` | Human CTAs |
| `api/productClient.ts` | Reservation HTTP |
| `styles.css` | Restrained sheet styles |
| `reservation_execution_controller.ex` | Thin API |
| `router.ex` | Routes |
| `reservation_execution.ex` | `detect_drift/2` |
| `PASS20_RESERVATION_EXPERIENCE_UX.md` | Evidence |

---

## KNOWN GAPS

1. Live partner booking still NOT CLAIMED  
2. Full 390 screenshot pack not automated this pass  
3. Payment tokenization still blocked  
4. Pass 18 audience holds still open  
5. Async webhook UI poll may still thicken  
6. Offline path uses local synthetic confirm for proof  

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

---

## FINAL LAW

```text
THE HUMAN SHOULD NEVER HAVE TO UNDERSTAND:
IDEMPOTENCY · RECONCILIATION · TTL · PROVIDER STATES · EXECUTION IDS

THEY SHOULD UNDERSTAND:
7:30 IS AVAILABLE.
RESERVE IT?
RESERVATION CONFIRMED.
OR: THAT DIDN'T GO THROUGH. YOUR PLAN IS STILL HERE.

THE RESERVATION IS A CONSEQUENCE OF THE REALITY.
NOT A SECOND PRODUCT.
```
