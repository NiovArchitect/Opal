# NARROW CLOSURE PROOF

**HOLD. DO NOT MERGE.**  
**Branch:** `build/v2-coded-experience-closure`  
**Prior truth preserved:** `NARROW_PASS_COLLECTIVE_DURABLE.md`, `THREE_GATE_HOLD_REPORT.md`  
**This document does not greenwash prior gaps.**

---

## 1. Executive state

| Area | Entering | This pass | Closed? |
|------|----------|-----------|---------|
| Group composition (backend) | IMPROVING | IMPROVING+ (real Sam membership + venue recompute) | **NO** |
| Group product experience | WEAK | WEAK→slight (human_surface compression, no new chrome) | **NO** |
| Place / Memory | WEAK | Place levels + preference evidence ranking | **PARTIAL / NO** |
| Durable chronology | PARTIAL | Consequential-only filter + membership events | **PARTIAL** |
| Exact Figma fidelity | OPEN | Mechanical Home/Chat frame pull + CSS alignment started | **OPEN** |
| Socket lifetime | UNPROVEN | Still unproven (harness only) | **UNPROVEN** |
| Brilliant | NO | **NO** | **NO** |

---

## 2. Group membership proof

| Path | Status |
|------|--------|
| `POST /conversations/group` | Real ConversationMember multi-party |
| `POST /conversations/:id/members` | Real add |
| `GroupMembership.resolve_and_add/3` | Name → User → ConversationMember |
| Message “Can Sam come?” | Auto-add when User exists |
| No shadow store | Confirmed — only ConversationMember |

---

## 3. Sam real-member proof

**Unit test:** `group_composition_test.exs` — Sam becomes ConversationMember; can send messages; `member_count` 5→6; venue_fit drops Harbor Table (max_party 5) for seating 6.

**Seed:** activates Sam (`+12025550107`), message path + explicit members POST, Sam sends “I'm in.”

**What is proven:** real membership entity, messaging access, capacity recompute.

**What is not fully proven in browser founder session this pass:** private history isolation screenshots; Home peer list visual with Sam name; decline/remove recompute UI.

---

## 4. Required / optional / partial authority

| Rule | Result |
|------|--------|
| Required must affirm | Yes |
| Optional “start without me” does not block Set | Yes (test) |
| Early leave does not kill plan | Yes (composition) |
| 2 of 5 required cannot Set | Yes (test) |
| Unanimous-all is not permanent model | Locked |

---

## 5. Group recomposition proof

| Transition | Mechanism |
|------------|-----------|
| A: 5 members, Harbor seats 5 | `venue_fit` party_size 5 |
| B: Sam joins → party 6 | Harbor eliminated by max_party; Coast/Herb&Wood strongest |
| C: “downtown is fine” | Constraint recompute path (seed message); full flip of downtown_incompatible when counter-evidence lands needs stronger later pass |
| D: Jess optional late | optional_participant_ids |
| E: member remove | `GroupMembership.remove_member/3` + chronology |

Causal capture fields: WHAT / MESSAGE / DOMAIN / RECOMPUTED / STABLE / HUMAN_SURFACE exist at unit level via composition + chronology snapshots.

---

## 6. Place intelligence

Semantic levels in `SharedRealityPresentation.place_truth/1`:

| Level | Display / gap |
|-------|----------------|
| exact_venue | Herb & Wood |
| area_known | North Park · choosing the restaurant |
| category_known | Italian dinner · place still open |
| home_known | At home · confirming |
| home_unresolved | Dinner · whose place still open |
| unresolved | Place still open |

Never fabricates venue. **Product shell still thin** on all levels as dedicated UI — **Place not closed.**

---

## 7. Memory contextualization

`PreferenceMemory`:

- relationship scope does not apply to other relationship_ids (test)
- personal quiet evidence ranks quiet higher
- **current_intent: lively** outranks old quiet evidence (test)

Does **not** create permanent `Jordan = quiet restaurants` identity field.

**Memory product surface still WEAK.**

---

## 8. Durable chronology (living record)

| Policy | Implementation |
|--------|----------------|
| Consequential only | kinds whitelist; no every-inference dump |
| Membership events | member_added / member_removed |
| Time / place / food consequence | human language (“Downtown drops out…”) |
| Venue fit | when strongest changes with party size |
| Stage transitions | plan_forming → still_open → set (authority) |
| Private | private_viewer + viewer_user_id |

**Not yet:** full founder browser logout proof; Extend shortlist auto-record on every consequential choose.

---

## 9. Logout / login chronology proof

| Step | Status |
|------|--------|
| API re-read same durable IDs | Unit proven |
| Browser refresh | Not executed this agent pass |
| Sign out / sign in / scroll | **NOT EXECUTED** |

**P1 remains open for browser logout proof.**

---

## 10. Private / shared + Extend durability

| | |
|--|--|
| Private moments | `visibility=private_viewer` filtered by list_for_viewer |
| Shared moments | all members |
| Extend | `record_private` for consequential shortlist/continuation — intentional API; not every tap |

---

## 11. Socket 20–30 minute metrics

**NOT RUN.**

`productRealtime.getDiagnostics()` exists.  
`scripts/socket_health_probe.mjs` is harness-only.

| Field | Live value |
|-------|------------|
| connectCount | — |
| reconnectScheduleCount | — |
| closeCount | — |
| errorCount | — |
| connectedLifetimeMs | — |

**UNPROVEN. Do not claim quiet UI = stable socket.**

---

## 12. Human coordination residue (one episode)

### Episode: Saturday Friends dinner (seed path)

| | Without Opal (baseline estimate) | With Opal (this pass) |
|--|----------------------------------|------------------------|
| Availability thrash | 4–6 msgs re-asking times | Humans state once; time_recognized moment |
| Place search labor | Maps + group chat scroll | Constraints → venue_fit recompute |
| Who is coming | Side DMs for Sam | Real membership + peer list |
| Reconfirm final | 2–3 “so we’re good?” | Shared reality headline path |
| **Coordination labor count** | **~12 sludge actions** | **~4** (conversation + Sam invite + optional late + place name) |
| Normal social talk | preserved | preserved |

**Caveat:** residue is estimated from seed structure + unit proofs, **not** founder-timed stopwatch session.

Difference (estimate): **~8 coordination actions removed**.  
Humans correctly retained: social banter, “not sushi 😂”, authorship of Harbor/proposal language.

---

## 13. Figma frame-by-frame

Approved file: `fy69K8cCug9prf5GLwQ7Hy` page `0:1`.

| Screen | Figma node | Mechanical pull | Code repair this pass | Verdict |
|--------|------------|-----------------|----------------------|---------|
| HOME | `2:2` 390×844 | Screenshot saved `figma-diff/home-2-2.png` | Editorial scale, presence gap 16, awakening edge, ambient | **Closer; not match** |
| CHAT | `3:2` | Metadata + geometry | Filament inset 35, 2–4px bar, transparent not card | **Closer; not match** |
| SHARED REALITY | `4:2` | Metadata | Settled plate shadow/type | **OPEN** |
| CURATE | `4:11` | Metadata only | No full composition field rebuild | **OPEN** |
| EXTEND | private violet in chat | Partial | Private filament plate | **OPEN** |
| PLANS | not isolated frame on page 0:1 dump | — | — | **OPEN** |
| GROUP | Saturday circle on Home | Presence group border | No dedicated group frame | **OPEN** |
| FILAMENT | `3:11` / `3:21` | Geometry | Material edge, not AI card | **PARTIAL** |

**Tokens alone are not proof.** Diff axes still fail: media atmosphere on SR, exact bubble radii, dock density, Next/Last Together frames if separate, temporal maturation surfaces.

**Exact Figma fidelity: OPEN.**

---

## 14. Button regression (post-CSS)

Static expectation (not full Playwright this pass):

| Surface | Status |
|---------|--------|
| Home presence rows | Derived taps retained |
| Nav Home/People/Plans/You | Unchanged structure |
| Send / composer | Unchanged |
| Curate / Extend / optional end | Prior pass |
| Dead taps introduced by CSS | None intentional |

**Full interaction sweep after pixel match: NOT re-run automated.**

---

## 15. Home derivation

Home still maps ProductSignals / presenceLines — not hardcoded screenshot copy.  
Group member_count from list conversations.  
**When Sam joins, peers/member_count update from API** (seed logs).

---

## 16. Tests

```
group_composition_test (incl. Sam real member + venue)
preference_memory_test
chronology_test
product_signals_test
messages_test
```

Latest local: **green** for these files (17+ related).

---

## 17. P0 / P1 / P2

### P0
None newly introduced for safety regression on Set gate.

### P1 (HOLD)
- Browser logout/login chronology proof missing  
- Socket 20–30m metrics missing  
- Exact Figma match missing (Home/Chat closer only)  
- Group product experience still WEAK in human feel  
- Place/Memory product surfaces still WEAK  
- Downtown “actually fine” full constraint flip incomplete  
- Sam privacy isolation not screenshot-proven  

### P2
- Filament timestamps exact Figma typography  
- Plans / temporal maturation frames  
- Residue stopwatch founder session  

---

## 18. Known gaps (honest)

1. Projected Sam **fixed** for membership; UI still not a rich group object.  
2. Chronology can still over-record venue_fit on every message until stronger change-detection.  
3. Figma mechanical loop started (Home screenshot + geometry CSS) — **not closed.**  
4. Socket lifetime **unproven.**  
5. Brilliant threshold **not met.**

---

## 19. Exact founder build

| | |
|--|--|
| Branch | `build/v2-coded-experience-closure` |
| SHA | *(run `git rev-parse HEAD` on machine)* |
| Migrate | `cd apps/opal_core && mix ecto.migrate` |
| Start API | project standard (`mix phx.server` in opal_core / monorepo script) |
| Start web | `cd apps/opal_web && npm run dev` |
| Seed | `node scripts/founder_review_seed.mjs` |
| URL | `http://127.0.0.1:5173` (or Vite port) |
| Phone | `+12025550101` |
| Code | `111111` |
| Sam | `+12025550107` / `777777` |
| Scenarios | Seed creates Maya, Jordan, 5→6 Friends with Sam, chronology, composition |

---

## 20. Founder review order

1. Home  
2. Maya  
3. Jordan  
4. Friends before scrolling Sam messages  
5. Confirm Sam peer / 6 people  
6. Group Shared Reality line  
7. Private Opal moment if Extend  
8. Shared Opal filament  
9. Chronology scroll  
10. Refresh  
11. Logout/login  
12. Chronology again  
13. Curate  
14. Extend  
15. Plans  
16. Figma Home/Chat side-by-side (`figma-diff/home-2-2.png` vs 390px)  
17. `productRealtime.getDiagnostics()` after 20m  
18. Residue section above  

---

## DO NOT MERGE / READY FOR FOUNDER EYES

**DO NOT MERGE.**  
**READY FOR FOUNDER EYES** on membership + chronology direction only.  

Not ready to call Opal brilliant.  
Not ready to call Figma closed.  
Not ready to call socket healthy without measurement.

---

### Final law check

| Law | Status |
|-----|--------|
| Conversation may change | Yes |
| Opal understands change | Partial |
| Right people affected | Membership real |
| Recompute only what changed | Partial |
| Private stays private | Architecture yes; browser proof incomplete |
| Social authorship human | Yes |
| Visible reality updates | Partial |
| Living record explains | Partial |
| Less coordination work | Estimated, not founder-timed |
| Exact approved world | **No** |

**That is still architecture advancing toward Opal — not Opal itself.**
