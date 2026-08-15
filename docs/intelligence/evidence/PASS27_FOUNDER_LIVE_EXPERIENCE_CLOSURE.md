# PASS 27 — Founder-Grade Live Experience Closure

**Branch:** `build/v2-coded-experience-closure`  
**Baseline:** `960de7a` (Pass 26)  
**Verdict:** **HOLD — DO NOT MERGE**

---

## EXECUTIVE STATE

Pass 26 fixed the nervous system.  
Pass 27 made the **human product path** use it cleanly:

1. **Thin `/follows` product API** over durable FollowGraph  
2. **H-24-02 presentation bounds** — server Reality wins; client no longer hardcodes “Extend the night”  
3. **Daypart API episodes** morning → night + remote + solo — no dinner bleed on coffee  
4. **Private selection ≠ send** re-proven  
5. Viewports optional via `PROOF_BROWSER=1`

**INTELLIGENCE DIFF = NONE** (API + presentation only).

---

## FOLLOW API

### Before
- FollowGraph durable Postgres  
- Product `/follows` → 404

### After
| Method | Path | Behavior |
|--------|------|----------|
| POST | `/api/v1/product/follows` | follow (idempotent) |
| DELETE | `/api/v1/product/follows/:creator_user_id` | unfollow |
| GET | `/api/v1/product/follows/status?creator_user_id=` | status |
| GET | `/api/v1/product/follows` | following list (cap 200, no fanout) |

Authority: `grants_friend_visibility: false`, permission_matrix deny Reality/calendar/location/group.

### Proof
- ExUnit `follow_api_test.exs` green  
- Live harness `follow_product_path` PASS  
- Friends-only Moment not granted via follow  
- Unauth POST → 401  

---

## H-24-02 CLIENT MIRROR

| Role | Owner |
|------|--------|
| SERVER | `SocialReality.project` → `ProductSignals` → `shared_reality` |
| CLIENT | `deriveSocialReality` **presentation** only |

| Field | Server | Client |
|-------|--------|--------|
| what/when/where | canonical | prefer server |
| next_gap | canonical | **server wins when present** |
| primary_action | optional | server first; daypart continuation labels |
| label inference | — | only if structure absent |

Repair: removed universal “Extend the night”; `continuationLabel` mirrors `ExperienceContinuation` dayparts.

---

## DAYPART / CONTINUATION

| Episode | Result |
|---------|--------|
| morning coffee | PASS — no dinner bleed |
| brunch group | PASS |
| afternoon museum | PASS |
| evening dinner | PASS |
| night concert | PASS |
| remote FaceTime | PASS |
| solo day | PASS |
| continuation matrix | PASS — daypart owner ExperienceContinuation |

---

## INTERACTION COST (API episodes)

Typical thread: ~2–4 human messages, ~3 steps to thread, no Opal interrogation dump in signals.

---

## REALTIME REGRESSION

Socket/channel code **untouched** this pass. Pass 26 soak remains authoritative. No 20-min re-soak required.

---

## HOLDS

| ID | Status |
|----|--------|
| F-25-03 /follows | **CLOSED** thin product API |
| H-24-02 | **CLOSED presentation bound** (server-first + daypart cont.) |
| Daypart UI gap | **PARTIAL→API closed**; full 390 founder visual pack with PROOF_BROWSER |
| H-V2-MERGE | OPEN |

---

## LAW

```
FOLLOWING ≠ FRIEND.
CREATOR EXPERIENCE → YOUR POSSIBILITY, NOT THEIR INVITATION.
SERVER OWNS TRUTH. CLIENT SHOWS TRUTH.
NO NEW BRAIN. NO PAYOUTS. DO NOT MERGE.
```
