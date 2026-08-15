# MASTER V2 HOLD LEDGER

**Branch:** `build/v2-coded-experience-closure`  
**Updated:** Pass 23 (2026-08-14)  
**Verdict:** **HOLD — DO NOT MERGE** until founder approval.

Purpose: single checklist of unresolved items across Passes 1–23 so known gaps cannot hide in scattered evidence files.

---

## Severity key

| Severity | Meaning |
|----------|---------|
| **P0** | Safety/privacy/money integrity risk if merged as-is |
| **P1** | Merge-blocking product/infra honesty |
| **P2** | Post-merge acceptable if documented |
| **EXTERNAL** | Blocked on third-party credentials/contracts |
| **FOUNDER** | Requires founder product judgment |

---

## HOLD LEDGER

| ID | Pass | Description | Severity | Owner | Proof required | Status |
|----|------|-------------|----------|-------|----------------|--------|
| H-18-01 | 18 | 390 audience selector UX incomplete | P1 → **closed Pass 23** | Social product | 390 create Moment audience chips + who-can-see preview | **CLOSED** (product surface + tests) |
| H-18-02 | 18 | Realtime PubSub audience routing audit | P0 → **closed Pass 23** | Social trust | Fanout only authorized viewers; matrix HTTP/media/realtime | **CLOSED** (`SocialMomentRealtime` + tests) |
| H-22-01 | 22 | ProviderEconomicEventStore process Agent | P0 → **closed Pass 23** | Economics infra | Postgres unique dedupe; restart reproject | **CLOSED** (`provider_economic_events`) |
| H-17-01 | 17 | Social Moment media LOCAL_DEV / no CDN | P2 | Media | Production object storage + CDN | **OPEN** |
| H-19-01 | 19 | Live reservation provider not claimed | EXTERNAL | Execution | Partner OpenTable/Resy or equivalent | **OPEN** |
| H-20-01 | 20 | 390 Confirm reservation pixel pack partial | P2 | Execution UX | Full automated 390 capture suite | **OPEN** |
| H-21-01 | 21 | No live provider commission contract | EXTERNAL | Economics | Signed provider economic contract | **OPEN** |
| H-21-02 | 21 | Payout / wallet / tax rails unbuilt | FOUNDER + EXTERNAL | Economics | Policy + KYC/tax/compliance | **OPEN** (deliberate) |
| H-22-02 | 22 | Live completion/settlement provider absent | EXTERNAL | Economics | Merchant completion webhook | **OPEN** |
| H-22-03 | 22 | Multi-node durable store was Agent | P0 | Economics | See H-22-01 | **CLOSED** (Pass 23) |
| H-15-01 | 15 | GOOGLE_PLACES_API_KEY may be unset | EXTERNAL | Providers | Live Places key in env | **OPEN** |
| H-BRAND | brand | Brand 93:* blocked / founder orbital working mark | FOUNDER | Brand | Founder brand freeze sign-off | **OPEN** |
| H-V2-MERGE | governance | V2 coded experience merge | FOUNDER | Founder | Explicit merge approval | **OPEN** |
| H-PUBLIC | 17–18 | Public Moment visibility not invented | FOUNDER | Social | Product decision if/when public | **OPEN** (deliberate absent) |
| H-FEED | all | No public engagement feed | FOUNDER | Product | N/A — by design | **OPEN** (deliberate absent) |
| H-SOAK | realtime | Full 20-min six-client soak not re-run Pass 23 | P2 | Realtime | Run if socket transport changes | **OPEN** (routing-only change) |
| H-EVENT-DB-SCALE | 23 | Economic events in app DB (not outbox/Kafka) | P2 | Infra | Scale path when multi-region live money | **OPEN** |
| H-MEDIA-PERM | 17 | Media paths local filesystem | P2 | Media | Shared volume / object store | **OPEN** |
| H-ATTRIB-WINDOW | 21 | Attribution time window not founder-locked | FOUNDER | Economics | Policy duration | **OPEN** |
| H-FRAUD | 21–22 | Fraud engine not built | P2 | Trust | risk_hold supported only | **OPEN** |

---

## REMAINING P0

*None currently open* after Pass 23 closes audience realtime authority + durable economic events.

(If live money were enabled without partner contract, that would re-open P0 — currently blocked by EXTERNAL holds.)

---

## REMAINING P1 (merge-blocking honesty)

| ID | Item |
|----|------|
| H-V2-MERGE | Founder must explicitly approve merge |
| H-BRAND | Brand authority still founder-gated in CI |

---

## REMAINING P2 (post-merge OK)

| ID | Item |
|----|------|
| H-17-01 | LOCAL_DEV media / no CDN |
| H-20-01 | Full 390 reservation screenshot automation |
| H-SOAK | Full realtime soak (routing-only change) |
| H-EVENT-DB-SCALE | Economic outbox/Kafka scale |
| H-MEDIA-PERM | Shared media storage |
| H-FRAUD | Fraud engine |

---

## EXTERNAL DEPENDENCIES

| ID | Dependency |
|----|------------|
| H-19-01 | Live reservation partner API |
| H-21-01 | Live commission contract |
| H-22-02 | Live completion/settlement provider |
| H-15-01 | Google Places API key |

---

## FOUNDER JUDGMENT GATES

| ID | Decision |
|----|----------|
| H-V2-MERGE | Approve V2 branch merge |
| H-BRAND | Freeze brand mark 93:* |
| H-21-02 | When (if) to enable payouts |
| H-PUBLIC | Whether public Moments ever exist |
| H-ATTRIB-WINDOW | Attribution eligibility time window |
| H-FEED | Keep no-feed law (recommended) |

---

## PASS 23 CLOSURE SUMMARY

| Hold | Result |
|------|--------|
| Audience selector UX | Product surface + human preview + tests |
| Realtime audience routing | `SocialMomentRealtime` uses `SocialMomentAudience` |
| Economic event durability | Postgres `provider_economic_events` unique (provider, economic_event_id) |

---

## LAW

```text
CLOSE OLD HOLDS BEFORE INVENTING NEW ONES.
BUILD THE MASTER HOLD LEDGER.
THEN LET THE FOUNDER DECIDE WHETHER V2 IS READY TO MERGE.
DO NOT PAY.
DO NOT MERGE.
```
