# PASS 23 — Pre-Merge Durability + Social Trust Closure

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Prior:** Pass 22 `7c0f06a`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 22 made economic truth auditable.  
Pass 23 makes social privacy and economic events **durable and consistent**.

```text
HTTP view  ⟷  media access  ⟷  realtime delivery
must agree for every viewer.

Economic events survive restart + concurrency via Postgres unique index.
```

Closed:

- Pass 18 audience selector UX hold  
- Pass 18 realtime PubSub audience routing hold  
- Pass 22 process-Agent economic event store  

Still: **LIVE ECONOMIC VALUE = NOT PROVEN**. No payouts. No auto-merge.

---

## INTELLIGENCE PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
KNOWN OPEN HOLDS: see MASTER_V2_HOLD_LEDGER.md
DURABILITY RISKS: Agent economic store → CLOSED
REALTIME RISKS: unfiltered fanout → CLOSED (authority-based topics)
SOCIAL TRUST RISKS: HTTP/media/realtime disagree → CLOSED
EXPECTED NON-CHANGES: AttributionGraph, EconomicQualification law,
  ReservationExecution, brand, SF15, Attention ranking
```

---

## PASS 18 HOLD #1 — AUDIENCE SELECTOR UX

**CLOSED**

- `MomentAudienceSelector` + `momentAudience.ts`  
- Human: Friends / Specific people / Group / Only me  
- Preview: “Who can see this?” → Jordan + Maya / Friends · N people / Only me  
- API: `POST /social-moments/audience-preview`  
- No ACL jargon  

---

## PASS 18 HOLD #2 — REALTIME AUDIENCE ROUTING

**CLOSED**

- `SocialMomentAudience` — single authority (RelationshipGraph + TrustSafety)  
- `SocialMomentRealtime` — fanout only to `authorized_viewer_ids/1`  
- Publish returns `realtime_delivery` matrix  
- Audience edit re-broadcasts to new authorized set only  

---

## THREE-LAYER MATRICES

### FRIENDS (author Alex)

| Viewer | HTTP | Media | Realtime |
|--------|------|-------|----------|
| Author | ✓ | ✓ | ✓ |
| Jordan (dyad) | ✓ | ✓ | ✓ |
| Maya (establishment) | ✓ | ✓ | ✓ |
| Chris (group-only) | ✗ | ✗ | ✗ |
| Unrelated | ✗ | ✗ | ✗ |
| Blocked | ✗ | ✗ | ✗ |

### SPECIFIC PEOPLE (Jordan + Chris)

Only author + listed IDs; Maya denied all layers.

### GROUP

ConversationMembers only; non-members denied all layers.

### PRIVATE

Author only all layers.

### AUDIENCE EDIT

Friends → specific Jordan: Maya HTTP/media/realtime all denied; media fetch fails.

### RELATIONSHIP REMOVAL

Establishment ended → historical + future friends access denied (dynamic policy).

---

## ECONOMIC EVENT STORE

| | Before | After |
|--|--------|-------|
| Implementation | Process Agent | **Postgres** `provider_economic_events` |
| Dedupe | in-memory | **unique (provider, economic_event_id)** |
| Restart | lost | **reproject from DB** |
| Multi-node | race | **DB uniqueness** |
| source_mode | yes | preserved (not upgraded to live) |

---

## DURABILITY PROOFS

| Test | Result |
|------|--------|
| Concurrent duplicate ingest (5×) | one row, all idempotent |
| Reproject after “restart” | same qualification |
| Out-of-order reverse durable | remains reversed |
| Unknown contract version | error, no qualify |
| Currency missing on value event | reject |
| LIVE economic | still NOT_PROVEN |

---

## MEDIA STATUS

**LOCAL_DEV** unchanged (P2).  
Access control re-checks audience on every fetch. Audience edit revokes media.

---

## ATTRIBUTION PRIVACY

Economic durability does not expand creator visibility of bookers/parties.

---

## MASTER HOLD LEDGER

`docs/evidence/v2-coded-experience/MASTER_V2_HOLD_LEDGER.md`

---

## TESTS

| Suite | Result |
|-------|--------|
| pass23_durability_social_trust_test | multi-matrix + durable econ |
| provider_economic_truth (updated store) | regression |
| relationship_audience_trust | regression |
| momentAudience.test.ts | UX labels |
| intelligence_check | PASS |

---

## FILES

| Path | Role |
|------|------|
| `20260824000001_create_provider_economic_events.exs` | Migration |
| `provider_economic_event_record.ex` | Schema |
| `provider_economic_event_store.ex` | Durable store |
| `social_moment_audience.ex` | Authority |
| `social_moment_realtime.ex` | Fanout |
| `social_moment_publishing.ex` | Wire preview + realtime |
| `MomentAudienceSelector.tsx` / `momentAudience.ts` | UX |
| `MASTER_V2_HOLD_LEDGER.md` | Master holds |
| `PASS23_DURABILITY_SOCIAL_TRUST_CLOSURE.md` | Evidence |

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

Founder still approves. Brand gate still blocked. External live providers still absent.

---

## FINAL LAW

```text
SOCIAL PRIVACY MUST AGREE ACROSS: HTTP · MEDIA · REALTIME
ECONOMIC TRUTH MUST SURVIVE: RESTART · CONCURRENCY · REPLAY
NO MONEY SYSTEM DEPENDS ON PROCESS MEMORY
NO PRIVATE SOCIAL SYSTEM DEPENDS ON CLIENT FILTERING
CLOSE OLD HOLDS BEFORE INVENTING NEW ONES
THEN LET THE FOUNDER DECIDE
```
