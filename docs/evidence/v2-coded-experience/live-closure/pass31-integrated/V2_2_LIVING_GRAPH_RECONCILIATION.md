# V2.2 Living Graph — Architecture Reconciliation

**DATE:** 2026-08-16  
**STATUS:** RECONCILIATION ONLY — NO BROAD IMPLEMENTATION  
**HOLD. DO NOT MERGE.**

| | |
|--|--|
| Product baseline SHA | `f43408d` (P0-31-01…04) |
| Product remote CI | `31939039458` |
| Pass 31 | **NOT CLOSED** — founder live defects confirmed |
| Figma authority | `fy69K8cCug9prf5GLwQ7Hy` · section `135:2` · frames `135:3`–`135:9` |

---

## 0. Operating law (locked)

**KEEP WHAT WORKS · FIX WHAT IS BROKEN · ADD WHAT IS MISSING · COMPOUND.**

Do not replace: SocialReality, ExperienceGraph, ExperienceField, AttentionAuthority, RelationshipGraph, FollowGraph, Curate, ReservationExecution, realtime, provider truth, private preparation, preference memory, permissions.

Living Graph is a **product/design model**, not a new engine name.

---

## 1. Architecture reconciliation

### What already exists (reuse)

| Concept (founder) | Existing owner | Notes |
|-------------------|----------------|-------|
| Past / lived proof | Social Moments, ExperienceGraph (`experienced_as`, `captured_as`), Moments | Past content exists; not yet Home spine |
| Now / attention | AttentionAuthority + ProductSignals home | Home “now” owner today |
| Future / plan | SocialReality dims, SharedPlan, moment-seeded Reality client, ReservationExecution | Future sharing visibility **missing** as social product |
| Journey lineage | ExperienceGraph edges (`inspired_by` → Reality → experience → Moment) | Pure graph, not ranking |
| Follow | FollowGraph / FollowEdge | One-way discovery only |
| Connect / friend | RelationshipGraph + RelationshipEstablishment + dyad membership | Group ≠ friend authority already |
| Invite (relationship) | RelationshipInvitation | Connect invite — not experience invite |
| Join / participate | ExperienceParticipantState, PlanParticipant | Attendance states exist; product UX thin |
| Group | Conversation + ConversationMember, GroupComposition | Multi-party messaging |
| Audience (Moments) | SocialMomentAudience / Visibility + RelationshipGraph | Historical Moments; not plan invites |
| Discovery ranking | ExperienceField | Ranking brain; density is signal |
| Curate / exact place | Curate + moment seed exactPlaceGrounded | P0-31-01 |
| WHEN consequence | applyWhenToSeed + MomentTimeSheet | Domain OK; Solo mount broken |
| Reservation | ReservationExecution + cancel API | Execution ≠ participation |
| Private timing / buffer | Private guidance / ETA envelopes (partial) | Not full personal buffer intelligence |
| Relationship context | RelationshipContext schema + RelationshipMemory (private) | Not surfaced as People UI consequence |

### Living Graph mapping (do not invent engines)

```
FOUNDER "Living Graph" (product model)
├── PAST  → Moments + ExperienceGraph lived edges
├── NOW   → AttentionAuthority / ProductSignals / local now candidates
└── FUTURE → SocialReality / SharedPlan / moment-seeded Reality
             + selective future visibility (GAP)
             + joinable segments (partial participant state)
```

Home continuous discovery should **request windows** from ExperienceField + Moments + future-visible Realities — one ranked continuum — not a second ranker.

### Hard laws already partially encoded

- Follow ≠ friend (`FollowGraph` moduledoc)
- Group membership alone ≠ friend (`RelationshipGraph`)
- Exact place must not reopen as Dinner (P0-31-01)
- WHEN must stick (P0-31-02 domain)
- Reservation same Reality (P0-31-03)
- Multi-human speakers (P0-31-04)

### New hard laws from founder live (must add)

1. **DON'T INVENT DINNER · DON'T ABANDON WHEN**
2. **Selecting one person → direct dyad path; shared group never silently widens audience**
3. **Group membership is context, not audience authority**
4. **Relationship context ≠ permission**
5. **Execution state ≠ participation state**
6. **Future visibility is stricter than past visibility**
7. **Density is a signal; relevance decides**

---

## 2. Solo WHEN — root cause

### Classification

**PRODUCT DEFECT** (cross-seam presentation / routing)  
Not harness-only. Not domain nextGap abandonment.

### Observed journey

Home → Juniper → I want this → Solo → place remains → “When still open / When works?” → **no time sheet**.

### Code path

| Step | Behavior | Correct? |
|------|----------|----------|
| `seedRealityFromMoment(..., solo)` | `exactPlaceGrounded`, `when: "open"`, `nextGap: "when"` | YES |
| `applyMomentSeed(seed, null)` | `activeChatId = "solo-moment-fork"`, `tab = home`, `momentForming = seed` | intentional for forming |
| `RealityFormingSurface` (member shell) | “When works?” | YES |
| `continueFromForming` | `setFindTimeOpen(true)` | YES |
| `MomentTimeSheet` | Only under `if (authenticated && activeChat)` chat early-return | **FAIL for Solo** |
| `activeChat` | `chats.find(solo-moment-fork)` → **null** (synthetic id never in chat list) | **ROOT** |

### Conclusion

P0-31-01 correctly stopped inventing Dinner and set next gap to WHEN.  
P0-31-02 domain (`applyWhenToSeed`) works when the sheet mounts.  
**Solo abandoned WHEN at the UI mount seam**, not in the seed model.

### Smallest fix ownership

**`OpalApp.tsx` presentation only**

- Mount `MomentTimeSheet` on the **member shell** (same predicate as chat) when `findTimeOpen && momentSeed?.exactPlaceGrounded`
- Prefer one shared overlay node rendered in both chat and shell (chat early-return never reaches shell)
- Do **not** change seed/nextGap/P0-31-01 place law
- Do **not** invent a fake peer chat for Solo

### Owner

Client moment loop / OpalApp.  
Server SocialReality unchanged for this bug.

---

## 3. Maya direct → group — root cause

### Classification

**PRODUCT DEFECT** (audience routing + relationship intent)  
Privacy-relevant: dyadic plan may land in multi-party conversation.

### Observed journey

Select Maya → plan appears in group with Maya + Jordan + others.

### Code path

| Component | Failure mode |
|-----------|--------------|
| People / named picker | Treats **conversation list rows as people** |
| `earnedNamedPresence` | Prefer Jordan-in-title; else first non-regex-group name. **No** `composition === "dyad"` / peer id check. Group titles are `"Maya Chen, Chris, Jordan"` → `firstName` → **“Maya”** with **group conversation id** |
| `handleMomentNamedPerson` | `applyMomentSeed(seed, namedPresence.conversationId)` — routes Reality into that conversation |
| `handleMomentPeopleConfirm` | Multi-select chat ids; primary = first selected chat — same topology confusion |
| Server | `RelationshipGraph` already says group ≠ friend authority for Moments — **client fork does not use that law for plan destination** |

### Conclusion

Not “message styling.”  
**Invitation topology is missing.** Shared group membership is being used as audience authority.

### Smallest fix ownership

1. **Client (immediate):**  
   - Named / people pick resolve **peer user**, not conversation title  
   - Prefer dyad where single peer matches selected person  
   - Never select `composition === "group"` / `member_count >= 3` for “With {Name}”  
   - If no dyad: ensure/create direct conversation (existing messaging create-dyad path) before seeding  
2. **Server (same tranche or immediate follow):**  
   - `ensure_direct_conversation(userA, userB)` if not already explicit  
   - Invariant: experience invite audience follows explicit invite topology  
3. **UI (Figma `135:6`):**  
   - Confirm “Only Maya receives this” + independent Add people/group

### Owner

Client: `momentNamedPresence.ts`, people sheet in `OpalApp.tsx`, seed destination.  
Server: messaging dyad resolve + future experience-invite audience (extend, don’t replace RelationshipGraph).

---

## 4. Social topology map

| Human action | Meaning | Existing module | Grants by default | Must not grant |
|--------------|---------|-----------------|-------------------|----------------|
| **FOLLOW** | See eligible public/creator social content | FollowGraph | Discovery | Calendar, Reality, private chat authority, booking |
| **CONNECT** | Mutual relationship | RelationshipGraph / Establishment | Friend Moment visibility (policy), dyad eligibility | Unlimited calendar/finance/location |
| **INVITE** (experience) | Bring person/group into **this** future Reality | **GAP** (relationship invite exists; experience invite topology incomplete) | Scoped participation request | Auto-expand to all shared groups |
| **JOIN** | Request entry into joinable future segment | Partial (participant states) | Request / accepted participation | Full calendar / other segments |
| Group membership | Multi-party conversation context | ConversationMember | Message in that group | Audience for unrelated dyadic plans |
| Participant | On plan/experience | PlanParticipant, ExperienceParticipantState | Attendance states incl. withdrawn/cannot_attend | Reservation cancel for all |
| Audience (Moment) | Who can view past Moment | SocialMomentAudience | Per visibility policy | Plan invite fanout |
| Reservation audience | Execution | ReservationExecution | Provider execution | Social audience |

**Law:** Experience audience follows **explicit invitation topology**, not coincidental shared conversations.

---

## 5. Figma implementation map (`135:3`–`135:9`)

File: `fy69K8cCug9prf5GLwQ7Hy` · Section `135:2`

| Node | Name | Existing capability | Missing | UI gap | Architecture gap | Privacy |
|------|------|---------------------|---------|--------|------------------|---------|
| **135:3** | Home Living Graph orientation | Home attention + demo Moment | Past/Now/Future spine as one surface | Home still chat/attention oriented | Continuous multi-temporal composition | Future vs past visibility |
| **135:4** | Continuous discovery | ExperienceField ranking | Pagination/refill of Home from EF | Artificial small pool feel | EF window ≠ Home attention merge | Avoid commerce-led ranking |
| **135:5** | Friend future / graph-in | SocialReality, plans | Selective future segment visibility + joinable flags | No “Maya’s Saturday” product surface | Future visibility model | Exact logistics until accepted |
| **135:6** | Direct invite Maya only | Moment seed WHO | Correct dyad routing + invite confirm | Audience chrome “Maya only” | Invite topology invariant | **CRITICAL** — no silent group widen |
| **135:7** | People direct + Call/Video/Plan | Dyad chat, thin People | Relationship context consequence UI; Call/Video later | Profile/actions sparse | Call signaling later | Call privacy: no auto-record |
| **135:8** | Plan controls | Reservation cancel partial | Leave plan / cancel reservation / cancel plan / reschedule separation | Controls not visible on journey | Participation ≠ execution productized | Don’t cancel all on leave |
| **135:9** | Unfamiliar city | ExperienceField local signals | Local world without friendship | Home weak-graph mode | Local discovery ≠ relationship authority | No precise people tracking |

**Implementation rule:** frames are additive founder-review authority. Do not overwrite locked V2 baseline frames.

---

## 6. Data model gaps (genuine only)

| Gap | Why real | Suggested compound |
|-----|----------|-------------------|
| Experience invite audience (person/group list on Reality) | Plan currently rides conversation membership | New fields on Reality/plan invite OR invite records; not a second SocialReality |
| Future segment visibility (private / invitees / group / connections / followers / public) | Past Moment visibility ≠ future logistics | Extend visibility policy; stricter defaults for future |
| Joinable segment flag | Graph-in needs per-segment join policy | On plan segment / Reality component |
| Personal buffer preference (learned) | Trajectory timing | Assistance preference / private memory — not calendar UI field |
| Ensure-direct-conversation API usage from moment fork | Dyad resolve | Existing messaging + explicit client call |
| Reschedule as recompose | Cancel exists; reschedule thin | ReservationExecution + SocialReality reopen rules with contradiction evidence |

**Not gaps (already owned):** Follow edge, friend establishment, ExperienceGraph lineage kinds, ExperienceField scoring, SocialReality gaps, ReservationExecution cancel, ExperienceParticipantState attendance.

---

## 7. What NOT to create

- `LivingGraphEngine` / `FutureGraphEngine` / second ranking brain  
- Parallel SocialReality  
- Instagram-style mandatory circle admin  
- Marketplace-first Home  
- TikTok engagement ranker  
- Payout / affiliate ranking  
- Calendar-share clone as the product metaphor  
- Duplicate Follow inside RelationshipGraph  
- Auto-merge journeys into one permanent supergraph  

---

## 8. Proposed phase order

### NOW — Pass 31 patch tranche (founder defects)

1. Solo WHEN mount fix  
2. Direct person → dyad audience routing  
3. Preserve P0-31-01…04  
4. Product SHA + remote CI  
5. Founder re-walk A/B (and C sender)  

### NEXT — Foundation for Living Graph (still not full Home redesign)

6. Direct People / relationship surface (`135:7` subset: Message / Plan first; Call/Video stubs later)  
7. Journey controls: leave vs cancel reservation vs cancel plan vs reschedule (`135:8`)  
8. Explicit Add people / group to invite topology  

### THEN — Social Home orientation

9. Home temporal mix Past/Now/Future (`135:3`)  
10. Continuous discovery refill from ExperienceField (`135:4`)  
11. Future Journey sharing / graph-in (`135:5`)  
12. Unfamiliar city local world (`135:9`)  

### LATER

13. Calling (WebRTC; Phoenix signaling only)  
14. Transportation  
15. Travel execution  
16. Budget composition expansion  
17. Provider depth  
18. Monetization  

---

## 9. First product patch (ONLY)

**Name:** `P31-PATCH-01` — Solo WHEN + direct audience routing  

### Scope (minimal)

**A. Solo WHEN**

- Mount `MomentTimeSheet` on member shell when moment-seeded exact place + `findTimeOpen`  
- Preserve seed/nextGap laws  
- After time select: same Reality, Juniper + Solo stick  

**B. Direct Maya routing**

- Resolve selected person to **peer user + dyad conversation**  
- Reject group conversations as named-person destination  
- People picker lists people/dyads, not multi-party titles as “Maya”  
- If dyad missing: create/resolve direct conversation before seed destination  
- Confirm audience = inviter + selected person only until Add people  

### Explicitly out of scope for first patch

- Full Living Graph Home  
- Continuous scroll  
- Calling  
- Future graph-in  
- Cancellation full IA (record as design debt; optional stub only if zero risk)  
- ExperienceField redesign  

### Ownership proof

| Defect | Owner file(s) | Why not server-first |
|--------|---------------|----------------------|
| Solo WHEN | `OpalApp.tsx` | Sheet not mounted; domain already correct |
| Maya group | `momentNamedPresence.ts` + people confirm + optional dyad ensure | Client routes to conversation id; server already knows dyad vs group |

Server dyad ensure is **recommended same patch** if client cannot safely resolve dyad from list peers alone.

### Success criteria

- Founder Solo: When works? → Saturday options → time sticks  
- Founder Maya: You + Maya only; no Jordan unless Add people  
- P0-31-01…04 tests green  
- New remote CI green on new product SHA  

---

## 10. Regression plan

| Protect | How |
|---------|-----|
| P0-31-01 exact place | Existing unit suite + founder Solo/Maya place visible |
| P0-31-02 WHEN | Unit + Solo browser path after mount fix |
| P0-31-03 reservation same Reality | Unit + no detached booking language |
| P0-31-04 speakers | Unit + group thread C |
| Curate exact / like_this | Unit |
| Idempotency / failed execution | Unit |
| Follow ≠ friend | Existing FollowGraph tests |
| Group ≠ friend visibility Moments | RelationshipGraph tests |
| Reservation cancel API | Existing controller tests |
| AttentionAuthority / ExperienceField | Do not touch modules; smoke only after patch |

New tests (minimal):

1. Solo exact place → `findTimeOpen` shows time sheet on shell (component/integration)  
2. Named presence never returns group composition id  
3. People confirm with Maya dyad id never uses group conversation  

---

## 11. Security / privacy plan

| Risk | Control |
|------|---------|
| Direct plan → group | Invite topology invariant; dyad-only default |
| Future location leakage | Future visibility stricter than past; logistics tiered until accepted |
| Joinable segment → full calendar | Segment-scoped join only |
| Local discovery → people tracking | Local world ≠ friendship; no precise live tracking by default |
| Relationship context → raw passport/payment | Capability without raw data; consent for travel later |
| Follow → friend privileges | Existing FollowGraph hard separation |
| Blocked person → future access | TrustSafety overrides |
| Call content → inference | No record/transcribe without consent |

---

## 12. Figma governance

| Item | Rule |
|------|------|
| Authority section | `135:2` founder-review V2.2 Social Future |
| Frames | `135:3`–`135:9` additive; do not overwrite V2 baseline |
| Implementation drift | Reflect meaningful interaction changes back into Figma |
| Code-first improvements | Update founder-review frames; never silent divergence |
| Product names | Prefer human copy; “Living Graph” internal unless brand chooses otherwise |

---

## Pass 31 status after this reconciliation

| Item | Status |
|------|--------|
| Integrated unit report | Accepted as partial |
| Solo WHEN | **PRODUCT DEFECT** — root caused |
| Maya audience | **PRODUCT DEFECT** — root caused |
| Cancellation semantics | **FOUNDATIONAL GAP** — design now; implement after patch 01 unless blocking A/B |
| Living Graph Home | **DESIGN AUTHORITY** — reconcile done; implement after defects |
| Merge | **HOLD** |

---

## Next execution step (after founder accepts this reconciliation)

Implement **only** `P31-PATCH-01` (Solo WHEN + direct audience).  
New product SHA + remote CI.  
Founder re-walk A/B.  
Then only if green: journey controls + People surface, then Home orientation.
