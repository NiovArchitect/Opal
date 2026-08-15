# PASS 25 — LIVE PRODUCT ORGANISM BREAKER

**Branch:** `build/v2-coded-experience-closure`  
**Pass 24 baseline:** `f4dda8e` (MATCH origin before Pass 25 work)  
**Verdict:** **HOLD — DO NOT MERGE**  
**Primary objective H-24-01:** **PARTIAL** — API multi-persona + viewport shells closed; **authenticated realtime multi-client channel join FAILED**

---

## EXECUTIVE STATE

Pass 24 is accepted as **domain organism** proof only.

Pass 25 attacked the **living product** with:

| Layer | Result |
|-------|--------|
| 15 deterministic product personas (API sessions) | **PASS** |
| Morning / brunch / afternoon / date / remote / night / family / solo / messy-8 | **PASS** (API) |
| Private leadership + private selection ≠ send | **PASS** (API message counts) |
| Malicious / stranger fail-closed | **PASS** |
| Multi-client HTTP delivery matrix (6 + stranger) | **PASS** |
| Multi-day personal curation (domain 7-day) | **PASS** (`MultiDayPersonalCuration`) |
| FollowGraph Postgres durability (domain) | **PASS** (migration + tests) |
| Product `/follows` HTTP API | **SKIP** (404 — domain only) |
| 390 / 375 / 430 opening + authenticated shells | **PASS** (screenshots) |
| Phoenix conversation channel join (6 browsers) | **PRODUCT_FAIL** |
| Full 20-minute socket soak | **NOT COMPLETE** (aborted after channel-join failure thrash) |

**Law held:** domain green ≠ product green. The server can be right while the socket and UI seams break.

---

## GIT VERIFY (required first action)

```
HEAD:   f4dda8e2f4f529b23e34a0b60c2d97b08339e083  (pre-Pass25 worktree baseline)
origin: f4dda8e2f4f529b23e34a0b60c2d97b08339e083  MATCH
```

Dirty tree included unrelated availability/brand/pass9 assets — **not committed** with Pass 25.

---

## CAST (15)

solo · date_lead · date_partner · friend_org · chaotic · silent · late · family · coworker · creator · follower · low_budget · access · malicious · stranger

Real product activation OTP sessions. No founder-only surrogate for all roles.

---

## PRODUCT ORGANISM LAW (cross-layer)

For API episodes, recorded where available:

- conversation_id
- reality projection (what/when/where/next_gap/authorizes_set)
- peer message counts (private boundary)
- stranger 403 on group read
- product group min **3** members (dyad-intent padded with silent member — honest product constraint)

**Not fully closed for browser:** server/client/UI/peer/refresh/reauth agreement on one authenticated conversation (channel join blocked deeper matrix).

---

## EPISODE SCORECARD

| Episode | Result | Notes |
|---------|--------|-------|
| morning_coffee | PASS | no dinner bleed in that thread; pad member |
| brunch_group | PASS | multi-time; silence ≠ consent; no forced set |
| afternoon_museum | PASS | early leave language recorded |
| date_private_leadership | PASS | peer msg count stable until explicit share |
| private_selection_not_send | PASS | selection pause no accidental messages |
| chaotic_user | PASS | chaos did not force Set |
| messy_group_8 | PASS | 8 members delivery; stranger denied |
| remote_facetime | PASS | no set leak |
| night_fixed_concert | PASS | fixed event thread recorded |
| family_organizer | PASS | |
| solo_product_day | PASS | timeline without forced set |
| malicious_closed | PASS | inject/moment/calendar/financial probes closed |
| creator_moment_boundary | PASS | stranger denied friends Moment |
| creator_follower_api | SKIP | no product `/follows` route |
| multi_client_message_matrix | PASS | HTTP 6-of-6 + stranger denied |
| multi_day_personal_curation | PASS | domain 7d ≥2 silence |
| browser_390/375/430 | PASS | opening + auth shells |
| socket channel joins | **PRODUCT_FAIL** | all 6 `joinedChannels` false |
| 20-min soak | NOT_RUN complete | aborted after join failure |

---

## MULTI-CLIENT / REALTIME (H-24-01 core)

### HTTP matrix — PASS

6 members received `Group dinner Saturday?`; stranger 403.

### Browser socket — PRODUCT_FAIL (P1)

`six_client_realtime_soak.mjs` (SOAK_MINUTES=5):

- All 6 browsers **logged into member shell**
- Group membership Sam add **PASS** (count=6)
- `sam_post_membership_rejoin` → `channel_joined=false`
- `pre_matrix_channel_joins` → **all false**
- Matrix then thrashed on reloads; soak **killed** after ~27m without completing 5m idle loop

**Finding:** authenticated multi-client **HTTP** works; **Phoenix conversation channel join diagnostics never reported joined**. Realtime product soak cannot be claimed green.

### 20-minute soak

**NOT_RUN** as completed evidence. Partial pre-matrix PRODUCT_FAIL is the durable signal.

---

## AUTHENTICATED 390 UI (founder-eyes)

### Home 3-second

- Dominant: **“Tonight needs you.”** + primary CTA **Where should dinner be?**
- Secondary social: Chanelle Moment (media card)
- Tab bar: Home · People · Plans · You
- **Attention:** one primary consequence — **KEEP** grammar holds
- Note: dinner framing is coherent with messy Saturday dinner seed; not a morning-coffee UI (morning was API-only thread)

### Plans 3-second

- Horizon card: **Dinner · Saturday · 7** · Choose a place
- Not a notification dump — **PASS** grammar

### Scroll

- Home/Plans: scrollHeight ≈ viewport (844) — compact shell

### Element survival (Home)

| Object | Why visible | Class |
|--------|-------------|-------|
| “Tonight needs you.” | primary temporal consequence | KEEP |
| Where should dinner be? CTA | next gap place | KEEP |
| Chanelle Moment card | social propagation / media | KEEP |
| Tab bar | navigation | KEEP |
| Brand Opal mark | identity | KEEP |

### Technicolor (observed, not expanded)

- Dark field + cyan/teal CTA outline (primary action)
- Gradient mark (brand orbital)
- Pearl/white type for human consequence
- No extra decorative color invented for the test

### Motion

- Not instrumented frame-by-frame this pass. No constant noise observed on static capture.

### Tab model vs pass prompt

Product tab bar is **Home / People / Plans / You** — not separate Chat/Curate/Social labels. “People” is the conversation surface. Do not invent tabs to satisfy test names.

### Conversation open by `data-conversation-id`

**SKIP/FAIL seam:** seeded conversation row not found for deep chat open — list may not expose that attribute on all cards.

---

## FOLLOWGRAPH DURABILITY

- Migration `follow_edges`
- `FollowGraph.follow_durable/unfollow_durable/following_durable?`
- Tests green
- **Never** grants friend visibility
- Product HTTP follow surface still absent → **SKIP** for creator/follower product path API

Closes Pass 24 “FollowGraph ephemeral” at **domain durable** level; product API still open.

---

## MULTI-DAY PERSONAL CURATION

`MultiDayPersonalCuration.simulate/1`:

- 7 day classes including stay-home + busy silence
- silent_days ≥ 2
- low-budget does not leak $80 tasting
- engagement not mandatory
- `not_browser_timeline: true`

Closes Pass 24 multi-day **NOT_RUN** at domain policy level only.

---

## FAILURE CORPUS

| ID | Sev | Finding |
|----|-----|---------|
| F-25-01 | **P1** | Phoenix conversation channel join never true for 6-client browser soak |
| F-25-02 | P2 | Product group API forbids true dyad create (must pad ≥3) |
| F-25-03 | P2 | Product `/follows` not exposed (domain durable only) |
| F-25-04 | P2 | Auth browser could not open conversation via `data-conversation-id` |
| F-25-05 | P2 | Token localStorage inject does not authenticate (must use OTP UI) |
| F-25-06 | P2 | 20-min soak incomplete (blocked by F-25-01 thrash) |
| F-25-07 | FOUNDER | Full founder-eyes journey across Chat deep thread / Extend / Curate private sheets not exhaustively screenshot-proved |

**Product API episode PRODUCT_FAIL count (main harness):** **0**  
**Realtime PRODUCT_FAIL:** **yes (F-25-01)**

---

## SELF-DERIVED LIVE ATTACKS EXERCISED

- dyad_via_group_api_too_small (discovered → padded)
- unauthorized_message_inject
- unauthorized_moment_read
- calendar_probe / financial_probe
- stranger_conversation_read
- silence_as_consent
- chaos_force_set
- private_selection_as_send
- channel_join_after_membership

---

## REPAIRS THIS PASS (allowed scope)

- Durable FollowGraph + migration
- MultiDayPersonalCuration domain sim
- Live harness + authenticated browser capture scripts
- **No** OrganismBreaker rewrite
- **No** SocialReality / PrivatePreparation / brand / SF15 rewrite
- **No** payouts

---

## DOES NOT CLAIM

- Opal cannot be broken
- Full 20-minute healthy socket soak
- Authenticated realtime multi-client delivery without reload
- Complete private Extend sheet UI soak with peer proof in browser
- Follow product API
- Figma pixel match
- Live reservation / money

---

## MASTER HOLD UPDATES

| ID | Status |
|----|--------|
| H-24-01 | **PARTIAL** — API + viewport; realtime channel join OPEN |
| H-23A-01 | **CLOSED domain** durable follow_edges; product API still absent |
| H-25-01 | **OPEN** — Phoenix conversation channel join diagnostics |
| H-25-02 | **OPEN** — dyad product create path (if desired) |
| H-V2-MERGE | **OPEN** — DO NOT MERGE |

---

## FILES

```
apps/opal_core/lib/opal_core/social_flow/follow_edge.ex
apps/opal_core/lib/opal_core/social_flow/follow_graph.ex
apps/opal_core/lib/opal_core/social_flow/multi_day_personal_curation.ex
apps/opal_core/priv/repo/migrations/20260825000001_create_follow_edges.exs
apps/opal_core/test/opal_core/social_flow/pass25_product_organism_test.exs
scripts/pass25_live_product_organism.mjs
scripts/pass25_browser_authenticated.mjs
docs/evidence/v2-coded-experience/live-closure/pass25-product-organism/*
docs/intelligence/evidence/PASS25_LIVE_PRODUCT_ORGANISM.json
docs/evidence/v2-coded-experience/MASTER_V2_HOLD_LEDGER.md
```

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

Pass 24 proved the domain brain under pressure.  
Pass 25 proved large slices of the **HTTP product organism** and **authenticated 390 shell grammar**, and **broke** the claim of healthy multi-client realtime by measuring channel join = false across the cast.

```
THE SERVER CAN BE RIGHT
AND THE PRODUCT CAN STILL BE WRONG.
```

HOLD.
