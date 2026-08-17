# V2.3.1 Holistic Social Graph — Reconciliation

**DATE:** 2026-08-16  
**STATUS:** RECONCILIATION COMPLETE — FIRST TRANCHE AUTHORIZED IN PLAN ONLY  
**HOLD. DO NOT MERGE.**

| | |
|--|--|
| Product baseline | **`3cde1dc`** |
| Remote CI (WHO-FAST-PATH-01) | **`31947599166`** SUCCESS |
| Figma file | `fy69K8cCug9prf5GLwQ7Hy` |

**Laws:** PRESERVE → COMPOUND → INTEGRATE → REGRESSION TEST  
**Not:** rebuild everything because a new interface exists.

---

## A. Three Figma authorities (verified)

| Authority | Node | Name | Role |
|-----------|------|------|------|
| **A — Core social UI** | `145:2` | FOUNDER LOCK — V2.3.1 SOCIAL COHERENCE / GRAPH LANGUAGE | What it looks like |
| **B — Supporting controls** | `149:30` | V2.3.1 ADDITIONS — YOU / CREATE / ROLES | Settings not on Home |
| **C — Routing / behavior** | `155:2` | FOUNDER LOCK — V2.3.1 EXPERIENCE ROUTING / END-TO-END AUTHORITY | How it behaves |

### Screen registry (from `155:2` + `145:2` inspection)

| ID | Node | Screen | Nav contract |
|----|------|--------|--------------|
| S01 | `145:3` | HOME · Your world | Default landing; people pulse + Graph/Live/Memory feed |
| S02 | `145:46` | HOME · continuous discovery | **Same Home route** — scroll continuation, not second page |
| S03 | `145:76` | WHO · visual people grid | Only if WHO unresolved; multi-select; Separate/Together |
| S04 | `145:123` | LIFECYCLE · Graph → Live → Memory | Reference / lineage teaching; not a main nav tab |
| S05 | `145:150` | GRAPH · joinable detail | Selective shared upcoming life; join/save |
| S06 | `145:181` | PEOPLE · direct relationship | Dyad: Call/Video/Plan/shared graph/messaging |
| S07 | `145:216` | CREATE · Add to your graph | Compose Graph post |
| S08 | `145:241` | PLAN · Journey controls | Execution after intent grounded |
| S09 | `146:2` | PROFILE · Graph + Memories | Person social page |
| S10 | `146:35` | COMMITMENT · Interested → I'm in | Soft vs firm commitment |
| S11 | `146:58` | TRIP · shared graph | Collaborative travel (later) |
| S12 | `146:92` | CALL · direct A/V | Media not via Phoenix (later) |
| A01 | `149:31` | CREATE · choose media | Global + entry |
| A02–A05 | `149:56`…`149:173` | YOU settings | Privacy, location, calls consent |
| A06 | `149:206` | PLAN · roles | Lead/co-lead, leave/cancel/end |
| A07 | `149:238` | ACTIVITY | Contextual only — **not** fifth dock tab |
| A08 | `149:264` | MEMORY DETAIL · engagement | Like/view + I want to do this |
| A09 | `149:279` | INTERNAL · temporal rules | Engineering only |

**Dock lock:** Home · People · **＋** · Plans · You  
**+** opens A01 → S07.

---

## B. Node inventory (implementation checklist)

Core (`145:2`):  
`145:3`, `145:46`, `145:76`, `145:123`, `145:150`, `145:181`, `145:216`, `145:241`, `146:2`, `146:35`, `146:58`, `146:92`

Supporting (`149:30`):  
`149:31`, `149:56`, `149:103`, `149:142`, `149:206`, `149:238`, `149:264` (+ `149:173` Calls)

Routing (`155:2`): full screen registry + action→destination map.

Designer chrome (e.g. “V2.3.1 HOME”) must **never** appear in customer UI.

---

## C. Existing owner map → V2.3.1

| V2.3.1 concept | Existing owner | Reuse / extend | Do not create |
|----------------|----------------|----------------|---------------|
| **Graph** (future shared life) | SocialReality dims + SharedPlan + ExperienceGraph `planned_from` / inspired_by | Add visibility + joinability + presentation label **Graph** | `LivingGraphEngine` |
| **Live** | Live experience / ETA / ReservationExecution happening state | Infer “happening” from time/location/provider | Separate Live product |
| **Memory** (presentation) | SocialMoment + Chronology + SharedMemory (consent) | Publish Memory as intentional share after live | Auto-publish Memory |
| Domain **Moment** | SocialMoment* | Keep domain name; UI may say Memory | Rename all Moments to Memory |
| Continuous Home | AttentionAuthority + ProductSignals home + ExperienceField | **Merge windows**: attention now + EF refill + Moments + joinable Graphs | Second Home route / second ranker |
| People pulse | RelationshipGraph + FollowGraph + plan/moment signals | Project most relevant Graph/Live/Memory per peer | Instagram Stories clone |
| WHO grid S03 | WHO-FAST-PATH-01 `buildWhoFastPath` + dyad ensure | Visual grid + Separate/Together; keep P31 gates | New people engine |
| Direct relationship S06 | Messaging dyad + P31 seed destination | Identity plate + Plan (skip WHO) + Shared Graph strip | Fake Call/WebRTC |
| Journey S08 | SharedPlan + ReservationExecution + PersonalFlow | Trajectory copy + leave/cancel/reschedule IA | Calendar UI |
| Engagement grammar | SocialMomentCard CTAs (want this / I'm in) | Distinct Like/View/Save/Interested/I'm in/I'd go/Join | One generic Like |
| Follow | FollowGraph | Keep hard separation from friend | Follow→friend |
| Friend / connection | RelationshipGraph + Establishment | Intelligence only; not unlimited permission | Circle admin UX |
| Ranking | ExperienceField | Extend for continuous windows; relationship > vanity | Commerce/watch-time engine |
| Provider truth | ReservationExecution + ExternalWorldTruth | Preserve synthetic honesty | Detached booking mini-app |
| P31 continuity | liveSocialMomentLoop + applyWhen + realityExecution + messageSpeaker | Regression-lock every tranche | Silent reopen |

---

## D. Genuine data gaps only

| Gap | Why | Compound onto |
|-----|-----|----------------|
| **experience_lineage_id** (or reuse Reality seed + ExperienceGraph) for Graph→Live→Memory | One human experience across states | ExperienceGraph edges |
| **Future Graph visibility** (private/invitees/friends/group/followers/public) | Stricter than past Moments | SocialMomentVisibility patterns |
| **Segment joinability** (joinable / visible-not-joinable / invite-only) | Graph-in without full calendar | Plan segment / SharedPlan meta |
| **Soft interest vs firm commitment** | Interested ≠ I'm in | PlanParticipant + new intent enum or signals |
| **Lead / co-lead product roles** | Authority for cancel/reschedule | PlanParticipant.role + A06 rules |
| **Memory publish draft** | Human authority after live | SharedMemory / SocialMoment publish |
| **Separate vs Together share mode** | Multi-person WHO | Invite topology (not group auto-merge) |
| **Global + create entry** | Dock missing + | Nav only + A01/S07 |

**Not gaps:** FollowEdge, friend establishment, SocialReality next_gap, ExperienceField scoring, ReservationExecution cancel, dyad ensure, WHO-FAST-PATH, multi-human speakers.

**Do not invent:** FutureGraphEngine, second SocialReality, second ranker, mandatory circle taxonomy.

---

## E. First tranche plan (file-level)

### Principle order (founder)

1. Destination surfaces before Home flood  
2. Context deletes steps  
3. Preserve P31 + WHO-FAST-PATH  

### V2.3.1-T0 — Nav + create dock (minimal)

| Work | Files |
|------|--------|
| Dock: Home · People · **＋** · Plans · You | `OpalApp.tsx`, styles |
| + opens create stub → later A01/S07 | shell only |

### V2.3.1-T1 — Direct People (S06 / was T1-A)

| Work | Files |
|------|--------|
| Dyad identity plate: name + “Direct connection” | new `DirectRelationshipSurface.tsx` or OpalApp header |
| Plan from Maya **skips WHO** | `shouldShowWhoSheet` + seed path |
| Shared Graph strip from existing seed/signal | momentSeed / ProductSignals |
| Call/Video: omit or disabled honest | no WebRTC |
| Group open ≠ person plate | composition check |

### V2.3.1-T2 — Journey / roles (S08 + A06)

| Work | Files |
|------|--------|
| Trajectory presentation | Plans + PersonalFlow |
| Leave plan ≠ cancel reservation ≠ end plan ≠ reschedule | ReservationExecution + PlanParticipant |
| Lead/co-lead rules surface | plan roles |

### V2.3.1-T3 — WHO visual grid (S03)

| Work | Files |
|------|--------|
| Supersede list fork with visual grid UI | `OpalApp` + styles |
| Preserve WHO-FAST-PATH candidates + dyad/group gates | `momentNamedPresence.ts` |
| Separate / Together modes | invite topology fields |

### V2.3.1-T4 — Home social continuum (S01+S02)

| Work | Files |
|------|--------|
| Media-primary feed; people pulse | HomePane / new Home social components |
| Continuous scroll = same route | pagination from ExperienceField windows |
| Graph/Live/Memory cards + CTAs | presentation mapping only |
| Keep ExperienceField + AttentionAuthority | no second ranker |

### V2.3.1-T5 — Graph detail + engagement (S05, S10, A08)

Join/save/interested/I'm in; Memory detail; joinable segments.

### Later

S11 trip, S12 call media, travel/providers, budget, monetization.

---

## F. Risk list

| Risk | Mitigation |
|------|------------|
| P31 exact place / WHEN reopen | Continuity unit suite each tranche |
| Silent group audience widen | P31-PATCH-01 + invite topology tests |
| Home becomes planner cards | Media-first gate; no Ready/All set as Home spine |
| ExperienceField 3–5 becomes permanent ceiling | Window/refill API; continuous scroll contract |
| Fake Call | Capability-honest UI only |
| Auto Memory publish | Explicit consent required |
| Future location leakage | Strict Graph visibility defaults |
| Performance continuous scroll | Paginate EF; don't load all Graphs |
| Realtime regression | Smoke after messaging touch |
| Dirty tree pollution | Stage only tranche files |

---

## G. Test matrix (minimum)

### Automated
- P0-31-01…04 + P31-PATCH-01 + WHO-FAST-PATH unit  
- shouldShowWhoSheet: person/group/solo skip WHO  
- Graph joinability privacy: follower cannot see exact logistics  
- Leave plan does not cancel reservation by default  
- System consequence ≠ peer speaker  

### Browser
- Home feels social (media desire), not admin  
- Continuous scroll refill  
- Maya → Plan → no WHO sheet  
- Juniper Memory → I want to do this → WHO only if needed → WHEN  
- Group open stays group  
- Interested does not count as I'm in  

### Founder
- 1s/3s gates per surface  
- “Does this feel like work?” → fail  
- Network desire without spam  

---

## Primary loop (product behavior lock)

```
DISCOVERY (S01/S02)
→ GRAPH / POSSIBILITY
→ SOCIAL INTEREST (Interested / I'd go / I want to do this)
→ ALIGNMENT (context deletes steps)
→ COMMITMENT (I'm in / join)
→ JOURNEY (S08)
→ LIVE
→ MEMORY (human publish)
→ DISCOVERY AGAIN
```

---

## What this recon does **not** claim

- V2.3.1 implemented  
- Home complete  
- Calling complete  
- Social network complete  
- Merge ready  

---

## Next step after founder acceptance of this recon

Execute **V2.3.1-T0 + T1** (dock + direct People S06) first — destinations before Home flood.

**HOLD. DO NOT MERGE.**  
**RECONCILE FIRST. THEN IMPLEMENT END TO END.**  
**ALL SIGNAL. NO NOISE. CONTEXT DELETES STEPS.**  
**ONE COHERENT OPAL = intelligence we built + social experience we approved.**
