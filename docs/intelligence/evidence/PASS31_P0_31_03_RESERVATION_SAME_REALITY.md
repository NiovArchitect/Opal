# Pass 31 — P0-31-03 Reservation → same Reality → human consequence

**Product SHA:** (this commit)  
**Prior:** `b78ceae`  
**HOLD. DO NOT MERGE.**

---

## Root cause

1. Booking used `reality_id: activeChatId` and updated **reservationUx panel only**.  
2. Moment-seeded Reality (`momentSeed.realitySeedId`) was not given execution state.  
3. No sparse **system** consequence on the conversation thread — felt like a detached reservation mini-product.  
4. `nextGap: none` could be confused with reserved without execution truth.

**Authoritative owner remains:** server `ReservationExecution` / `ReservationExecutionRecord`.  
**Client:** `applyExecutionToSeed` attaches status to the **same** `MomentSeededContext` and may emit one idempotent system consequence.

---

## Lineage IDs

| Object | Field |
|--------|--------|
| Moment | `momentSeed.momentId` |
| Reality seed | `momentSeed.realitySeedId` |
| Place | `providerPlaceId` + `placeCandidateName` |
| WHEN | `momentSeed.when` |
| WHO | `participantNames` |
| Execution | `executionId` + `executionStatus` |
| Conversation | `activeChatId` (delivery surface; not a second Reality) |
| Consequence message | `realitySeedId`, `executionId`, `opalSystemConsequence: true` |

---

## State transitions

### Before booking
```
exactPlaceGrounded, when=Sat 7:30, nextGap=none, executionStatus=none
compositionSettledIsNotReserved = true
```

### After confirmed
```
same realitySeedId
executionStatus=confirmed
executionId set
human: "Juniper & Ivy is reserved for Saturday · 7:30 PM."
WHAT/WHERE/WHO/WHEN unchanged
```

### After failed
```
executionStatus=failed
composition intact
"Reservation couldn't be completed. Your plan is still intact."
```

### Intermediate pending
```
no human chat consequence
```

---

## Unimplemented

P0-31-04 group human sender chrome · Home · local discovery · travel · payouts
