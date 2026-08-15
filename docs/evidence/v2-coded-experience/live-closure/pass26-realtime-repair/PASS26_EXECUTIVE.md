# PASS 26 — REALTIME ORGANISM REPAIR + LIVE SOCIAL CONTINUITY

**Branch:** `build/v2-coded-experience-closure`  
**Pass 25 baseline:** `86518e8`  
**Verdict:** **HOLD — DO NOT MERGE**  
**H-25-01:** **CLOSED** (root cause + repair + 20-min re-smoke)

---

## EXECUTIVE STATE

Pass 25 found a real organism failure: HTTP multi-client ≠ realtime multi-client.

Pass 26 **did not expand intelligence**. It traced the live path, repaired the seam, and re-smoked.

### One-line root cause

**Channel join was never attempted** because the multi-client harness matched the **Home** tab (`/Chat|Chats|Home/i` → Home first) instead of **People**, so `openChat` → `joinConversation` never ran. Phoenix socket auth and membership were already healthy.

### One-line repair

Open **People** first; expose `data-conversation-id` on Home awaken; add join diagnostics; abort matrix if joins fail.

### One-line proof

**20-minute** six-client soak `soak7-msttwuhs`: **34 PASS / 0 PRODUCT_FAIL**, all six `channel_joined=true`, realtime message matrix green, private isolation green, stranger 403.

---

## GIT VERIFY (start)

| Item | Value |
|------|--------|
| LOCAL HEAD (start) | `86518e8` |
| REMOTE HEAD (start) | `86518e8` |
| MATCH | yes |
| DIRTY | availability/brand/pass9 left unstaged |

---

## INTELLIGENCE PREFLIGHT

```
INTELLIGENCE CONTEXT LOADED
TARGET: REALTIME TRANSPORT / CLIENT AUTH / CHANNEL JOIN CONTINUITY
EXPECTED NON-CHANGES: SocialReality, AttentionAuthority, RelationshipGraph,
  FollowGraph semantics, ExperienceGraph/Fork, PersonalLifeCuration,
  ProviderVertical, ReservationExecution, AttributionGraph,
  EconomicQualification, brand, SF15
intelligence_check.sh --with-tests: PASS
```

No intelligence redesign.

---

## AUTH CONTRACT

| Element | Contract |
|---------|----------|
| Product session | Bearer access_token from OTP verify (memory via `setMemoryAccessToken`) |
| Socket auth | POST `/api/v1/product/socket-ticket` → short-lived `socket_ticket` (memory-only) |
| Socket params | `socket_ticket`, `device_id`, `app_state`, `client_version` |
| UserSocket | `ProductSession.authenticate_socket_ticket/1` |
| Topic | `conversation:<conversation_id>` |
| Join auth | ConversationMember + not blocked |
| Not used for product | localStorage token inject; second auth path |

---

## SIX-MEMBER JOIN MATRIX (20m run)

Run ID: **`soak7-msttwuhs`**  
Conversation: `4fa00238-8130-4aef-823c-76880d921ace`

| Client | socket_connected | channel_joined | topic |
|--------|------------------|----------------|-------|
| founder | true | true | conversation:4fa00238-… |
| chris | true | true | same |
| jess | true | true | same |
| alex | true | true | same |
| maya | true | true | same |
| sam | true | true | same (late membership rejoin) |
| stranger | — | denied | HTTP 403 messages |

---

## REALTIME MESSAGE MATRIX

**PASS** — all peers realtime (no reload-only, no FAIL).

Correct-human attribution: each member sent own message; matrix delivery per sender.

---

## 20-MINUTE SOAK

| Checkpoint | Result |
|------------|--------|
| 0 min | converge, HEALTHY ×6 |
| 5 min | converge, HEALTHY ×6 |
| 10 min | converge, HEALTHY ×6 |
| 15 min | converge, HEALTHY ×6 |
| 20 min | converge, HEALTHY ×6 |

Also PASS:

- private curate UI isolation (peers do not see private sheet)
- explicit share delivery
- network interruption recovery (alex offline → peers change → alex recovers same gap)
- background/foreground
- logout/login recovery
- non_member 403 throughout
- chronology/messages no duplicates
- duration_ms ≈ 1,203,068 (~20.05 min)

**product: 0 · env: 0 · pass: 34**

---

## UI CONTINUITY (auth browser)

| Viewport | Login | Conversation open | channel_joined |
|----------|-------|-------------------|----------------|
| 390 | PASS | PASS | **true** |
| 375 | PASS | PASS | **true** |
| 430 | env OTP timeout (rate) | — | — |

F-25-04 People-list open: **CLOSED**.

---

## FOLLOW / DYAD CLASSIFICATION

| Item | Result |
|------|--------|
| FollowGraph durable | already Pass 25 Postgres |
| Product `/follows` | **P2 OPEN** — not required to close H-25-01; no second FollowGraph |
| Group API ≥3 | **intentional** multi-member path; dyads via invitation/establishment — not pad-in-prod |

---

## H-24-02 SocialReality mirror

No live divergence observed during 20m soak convergence checkpoints. Remains **P2** (shared contract tests still desirable).

---

## REPAIRS (files)

1. `scripts/six_client_realtime_soak.mjs` — People-first open; join diagnostics; abort if pre-matrix join fails  
2. `apps/opal_web/src/opalUi/v2Primitives.tsx` — AwakenSurface `data-conversation-id`  
3. `apps/opal_web/src/OpalApp.tsx` — pass conversationId to AwakenSurface  
4. `apps/opal_web/src/realtime/RealtimeClient.ts` — evidence-only join/auth diagnostics  
5. `apps/opal_web/src/realtime/realtime.test.ts` — assert diagnostics  
6. `scripts/pass25_browser_authenticated.mjs` — People-first open + join assert  

---

## MASTER HOLD UPDATES

| ID | Status |
|----|--------|
| H-25-01 | **CLOSED** |
| H-24-01 | **PARTIAL → largely closed** realtime + viewport; deep multi-persona morning/night UI still expandable |
| H-25-03 | OPEN P2 product `/follows` |
| H-25-02 | DOCUMENTED intentional group min-3 |
| H-V2-MERGE | **OPEN** — DO NOT MERGE |

---

## P0 / P1 / P2

| Sev | Item |
|-----|------|
| P0 | none new |
| P1 | H-25-01 **closed** |
| P2 | `/follows` product API; dyad create path docs; H-24-02 mirror tests; 430 OTP rate in multi-viewport sequential |

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

Nervous system repair verified. Do not confuse transport health with full product organism / merge readiness.

```
HTTP SUCCESS IS NOT REALTIME SUCCESS.
REALTIME SUCCESS IS NOW PROVEN FOR SIX-CLIENT 20-MIN SOAK.
STILL DO NOT MERGE WITHOUT FOUNDER APPROVAL.
```

HOLD.
