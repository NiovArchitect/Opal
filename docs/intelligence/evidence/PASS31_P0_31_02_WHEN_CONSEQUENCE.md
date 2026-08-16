# Pass 31 — P0-31-02 WHEN selection consequence

**Product SHA:** (this commit)  
**Prior:** `c3d10b8` (P0-31-01)  
**HOLD. DO NOT MERGE.**

---

## Root cause

1. After P0-31-01, exact place opened **WHEN** via `setFindTimeOpen(true)`, but UI often routed to **AvailabilitySheet** only when chat `primary.kind === "sheet"` — moment Solo path could open a flag **without a consequential picker**.  
2. Reservation slot taps updated **reservationUx only**, not the Moment-seeded Reality `when`.  
3. Seed type locked `when: "open"` with no apply path → human time could not become authoritative on the same object.

Dead-feeling taps: selection visual without domain consequence on the **same Reality**.

---

## Authoritative state transition

```
seed.when = "open", nextGap = "when", exactPlaceGrounded
  -- human selects "Saturday · 7:30 PM" -->
seed.when = "Saturday · 7:30 PM", nextGap = "none"
place / what / who unchanged
filament shows when
presentationReopensGrounded(when) = true
```

Empty label → `error: empty_when_label`, no state lie.

---

## Files

- `liveSocialMomentLoop.ts` — `applyWhenToSeed`, `whenSelectionConsequence`, filament when  
- `MomentTimeSheet.tsx` — human time options  
- `OpalApp.tsx` — moment time sheet; reservation slot → applyWhenToSeed  
- tests  

---

## Unimplemented

P0-31-03, P0-31-04, Home social, local discovery, travel, transport, payouts.
