# MASTER V2 HOLD LEDGER

**Branch:** `build/v2-coded-experience-closure`  
**Updated:** Pass 29 Correction (2026-08-15)  
**Verdict:** **HOLD — DO NOT MERGE** until founder approval.

Purpose: single checklist of unresolved items across Passes 1–25 so known gaps cannot hide in scattered evidence files.

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
| H-23A-01 | 23-addon | Follow graph not durable Postgres yet (structural domain) | P2 → **closed domain Pass 25** | Social network | Persist follow edges when product live | **CLOSED domain** (`follow_edges`); product `/follows` API still absent |
| H-23A-02 | 23-addon | ExperienceField product naming not locked | FOUNDER | Product | Moments / Discover / Field / Trail | **OPEN** |
| H-23A-03 | 23-addon | Live bank/financial intelligence not claimed | EXTERNAL | PersonalFlow | Real financial data sources if ever | **OPEN** (deliberate) |
| H-23A-04 | 23-addon | Public creator Moments not enabled | FOUNDER | Social | Public visibility decision | **OPEN** (deliberate absent) |
| H-23A-05 | 23-addon | Full multi-persona adversarial soak (UI 390/375/430) | P2 → **partial Pass 25** | Product lab | Visual capture pass | **PARTIAL** (opening + auth shells 375/390/430) |
| H-24-01 | 24 | Multi-client / 390 UI organism soak still NOT_RUN | P1 → **largely closed Pass 26** | Product lab | Multi-client delivery + visual proof | **PARTIAL→CLOSED realtime** — 6-client 20m PASS; deep multi-persona daypart UI suite still expandable |
| H-24-02 | 24 | Client `socialReality.ts` mirror may drift from Elixir | P2 → **closed Pass 27** | Web | Server-first presentation; daypart continuation | **CLOSED** (server next_gap wins; no hard-coded night only) |
| H-24-03 | 24 | Domain soak 1536 seeds PROVEN; product organism incomplete | — | Evidence | Honest scorecard | **DOCUMENTED** |
| H-25-01 | 25 | Phoenix conversation channel join never true (6-client soak) | P1 → **closed Pass 26** | Realtime | Diagnostics `joinedChannels` true + message matrix without reload | **CLOSED** — root: People-tab open path; transport was healthy |
| H-25-02 | 25 | Product group API requires ≥3 (no true dyad create) | P2 | Messaging | Dyad path or documented pad law | **DOCUMENTED intentional** group-only create; dyad via invite |
| H-25-03 | 25 | Product `/follows` HTTP API absent | P2 → **closed Pass 27** | Social network | Thin FollowController over FollowGraph | **CLOSED** |
| H-25-04 | 25 | Full 20-min healthy socket soak incomplete | P2 → **closed Pass 26** | Realtime | SOAK_MINUTES=20 after H-25-01 fix | **CLOSED** (`soak7-msttwuhs` 34 pass / 0 product) |
| H-25-05 | 25 | Deep conversation open via `data-conversation-id` flaky | P2 → **closed Pass 26** | Web | Stable conversation list selectors | **CLOSED** People-first + AwakenSurface id |

**Pass 23 add-on note:** Follow ≠ Friend, experience fork, propagation, ExperienceField, financial fit, and compound lab are **structurally present**. They extend — do not replace — RelationshipGraph / SocialReality / AttributionGraph.

**Pass 24 note:** OrganismBreaker ran **512 + 1024** domain seeds with cross-layer invariants. This is **not** multi-client UI soak and must not be reported as full product organism proof.

**Pass 25 note:** Live product organism harness (15 personas) + multi-day domain curation + durable FollowGraph. HTTP multi-client PASS. Authenticated 390 Home/Plans grammar captured. **Realtime channel join PRODUCT_FAIL (H-25-01)** — closed in Pass 26.

**Pass 26 note:** Root-caused H-25-01 as People-tab open path (join never attempted). Phoenix ticket auth was healthy. Repaired harness + AwakenSurface identity + join diagnostics. **20-min six-client soak PASS** (`soak7-msttwuhs`). No intelligence expansion.

**Pass 27 note:** Thin `/follows` product API; client SocialReality presentation server-first + daypart continuation (no universal “Extend the night”); daypart API suite PASS. Intelligence diff NONE.

**Pass 28 note:** Make this mine / Just you | With people Moment fork on Home (media-first, no commerce). Founder visual pack under `live-closure/pass28/`. Intelligence diff NONE. Founder eyes still required before V2 merge.

**Pass 29 note:** ExperienceField extended — not a feed; visible cap 3; commission/views/volume cannot rank; daypart + different-city pattern; scale_probe 1000. HOME≠FIELD jobs.

**Pass 29 Correction:** **P1 language regression** — removed live “Make this mine/yours”; CTA → **I want to do this** / Just me · With people. Durable guard + `OPAL_HUMAN_LANGUAGE_CANON.md`. Figma page **`116:2` FOUNDER REVIEW — SOCIAL EXPERIENCE NETWORK** with nodes `116:3`–`116:102`. Inspired public scoreboard remains off. Multi-Moment Field UX still FOUNDER OPEN.

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
| H-SOCIAL-COPY | Founder social language approval (mine/yours rejected; “I want to do this” under review) |
| H-SOCIAL-VISUAL | Founder eyes on Moment/fork/Field warmth + V2 SR continuity |
| H-FIELD-SURFACE | Multi-Moment Experience Field product UX (ranking ready; surface open) |

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
