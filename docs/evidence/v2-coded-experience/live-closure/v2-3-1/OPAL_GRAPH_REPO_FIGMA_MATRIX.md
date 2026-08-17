# Opal Graph — Repository × Final Figma Matrix

**DATE:** 2026-08-17  
**STATUS:** RECONCILIATION ONLY — NO PRODUCT RESET  
**HOLD. DO NOT MERGE.**

---

## 0. Current repository reality (inspected)

```
branch:  build/v2-coded-experience-closure
HEAD:    1ea1dfb260f8408e86c1706d957a5004c0e84e5a
```

| Item | Value |
|------|--------|
| Remote | `origin` → `https://github.com/NiovArchitect/Opal.git` |
| Last **product** SHA | **`3cde1dc`** (WHO-FAST-PATH-01) |
| Last **product** CI | **`31947599166`** SUCCESS |
| Commits after `3cde1dc` | **one:** `1ea1dfb` docs only — V2.3.1 holistic recon |
| V2.3.1 / Opal Graph **product UI** after handoff | **NONE** |
| Final Figma 201/217 screens in code | **NOT IMPLEMENTED** |
| Dirty tree | Unrelated availability, pass9 screenshots, brand media assets, untracked docs/evidence — **not discarded** |

### Commits after 3cde1dc

1. `1ea1dfb` — `docs(v2.3.1): holistic social graph reconciliation before implementation`

**Conclusion:** Grok did **not** land V2.3.1 product implementation after the prior holistic handoff. Only documentation reconciliation exists. Product intelligence remains at **`3cde1dc`**.

---

## 1. Final Figma authority (supersession)

| Role | Node | Supersedes |
|------|------|------------|
| **Visual product** | **`201:2`** | Earlier bright convergence `191:2`; core screens of `145:2` **visually** |
| **First run** | **`217:2`** | Archived first-run `171:2` |
| **Routing / behavior** | **`155:2`** | Still authoritative for action→destination |
| **Brand** | **`159:2` / `162:2`** | Arbitrary SVG reconstructions |
| Continuous discovery behavior | `145:46` | Merged into Home scroll with `201:5` |
| Graph detail behavior | `145:150` | Still behavioral |
| Create / Journey depth | `145:216` / `145:241` | Visual → `201:9`; behavior stays |
| Supporting controls | `149:30` | Still authoritative |

### Final product frames (`201:2`)

| Node | Screen |
|------|--------|
| `201:5` | HOME — social feed |
| `201:6` | WHO — people picker |
| `201:7` | PEOPLE — conversation + Opal consequence |
| `201:8` | LIVE — happening now (**required product**, not walkthrough only) |
| `201:9` | JOURNEY — ambient execution |
| `201:10` | PROFILE — Graph + Memories |

### Final first-run (`217:2`)

| Node | Screen |
|------|--------|
| `217:5` | FR00 Splash — Opal Graph brand |
| `217:18` | FR01 Your World |
| `217:82` | FR02 Who |
| `217:123` | FR03 Ambient AI / relationship |
| `217:196` | FR04 Live |
| `217:254` | FR05 Start with your people |
| `217:287` | FR06 Phone |
| `217:307` | FR07 Verify |
| `217:330` | FR08 Profile |
| `217:354` | FR09 Find people |
| `217:393` | Routing override (+ `155:2`) |

---

## 2. DONE / PARTIAL / NOT IMPLEMENTED / BROKEN matrix

Legend: **D** = Done & preserve · **P** = Partial · **N** = Not implemented · **B** = Broken / wrong for final authority

### Domain intelligence (preserve)

| Capability | Status | Notes |
|------------|--------|-------|
| P0-31-01 exact place continuity | **D** | `liveSocialMomentLoop` |
| P0-31-02 WHEN consequence | **D** | MomentTimeSheet shell mount |
| P0-31-03 same Reality reservation | **D** | `realityExecution` |
| P0-31-04 multi-human speakers | **D** | `messageSpeaker` |
| P31-PATCH-01 Solo WHEN + direct dyad | **D** | product `7256f8e` lineage → still in tree at 3cde1dc |
| WHO-FAST-PATH-01 multi-person, no Jordan monopoly | **D** | product `3cde1dc` / CI 31947599166 |
| SocialReality / next_gap | **D** | Domain authority |
| ExperienceGraph lineage | **D** | Not Home spine yet |
| ExperienceField ranking | **P** | Cap/windows; not continuous Home feed |
| RelationshipGraph / FollowGraph | **D** | Follow ≠ friend preserved |
| Messaging + realtime + history | **D** | Phoenix channels |
| ensure_direct conversation | **D** | Server + client |
| ReservationExecution (synthetic) | **P** | Live partner not claimed |
| Chronology / SharedMemory | **P** | Not Memory publish product |
| AttentionAuthority / ProductSignals Home | **P** | Attention/planner-ish Home, not Opal Graph social Home |
| Availability / calendar composition | **P** | Dirty local edits unrelated — do not bundle |

### Final product UI (`201:2`)

| Screen | Status | Current product vs authority |
|--------|--------|------------------------------|
| Home `201:5` social feed | **N / B** | Home is attention + demo Moment card; not Graph/Live/Memory feed grammar; no continuous media desire spine |
| Continuous discovery `145:46`+`201:5` | **N** | No pagination/refill social continuum |
| WHO `201:6` visual picker | **P** | WHO-FAST-PATH **behavior** D; **list sheet** not visual circle grid; no Separate/Together chrome of 201:6 |
| People/messenger `201:7` | **P / B** | Real messaging D; feels like chat route not person surface; no Call/Video/Plan identity plate; ambient Opal card partial via filaments |
| LIVE `201:8` | **N** | No Happening Now product surface |
| Journey `201:9` | **P** | Plans tab + reservation panels; not trajectory + leave/change/can't make it of 201:9/145:241 |
| Profile Graph+Memories `201:10` | **N** | You tab thin; no Graph ahead + Memories grid |

### First run (`217:2`)

| Screen | Status | Notes |
|--------|--------|-------|
| Splash Opal Graph brand | **N / B** | Older first-run exists; not 217 brand system |
| FR01–FR05 product-shaped walkthrough | **N** | FirstRunExperience is older narrative |
| FR06–FR07 phone + verify | **P** | ActivationFlow real phone/OTP — restyle to 217 |
| FR08 profile initials | **P** | Activation may collect name; not 217 profile plate |
| FR09 find people | **P** | FindPeopleFlow exists |

### Brand

| Item | Status |
|------|--------|
| Public **Opal Graph** wordmark + tagline | **N** in product chrome |
| Transparent symbol from `162:2` | **P** — brand assets untracked/local; not wired as final FR00 |
| Internal module rename to OpalGraph | **N (correct)** — must not mass-rename |

### Social loop features

| Feature | Status |
|---------|--------|
| Graph as social object (visibility, joinability) | **N** domain gaps |
| I'd go / Interested / I'm in distinct semantics | **P** — CTAs partial on Moment card |
| Join this part (segment) | **N** |
| Soft interest → firm commitment | **N** |
| Graph→Live→Memory same lineage | **N** productized |
| Memory human publish (no auto) | **N** |
| Lead / co-lead | **N** product IA |
| Separate vs Together multi-invite | **N** |
| Dock Home · People · **＋** · Plans · You | **P** — 4 tabs, **no ＋** |
| Live location vs Opal location intelligence | **P** / privacy docs |
| Real WebRTC Call/Video | **N** (must stay honest) |
| Endless Home feed API | **N** |

### Working in browser now (expected at 3cde1dc product)

| Path | Expectation |
|------|-------------|
| Auth phone + code | Works (ActivationFlow) |
| Home with SocialMoment | Demo Moment; not final Home |
| I want this → WHO multi-person | WHO-FAST-PATH works |
| Solo → WHEN | Works (shell time sheet) |
| Person → direct dyad | Works (P31-PATCH-01) |
| Chat send/realtime | Works |
| Final 201/217 UI | **Not present** |

---

## 3. What to PRESERVE (do not rebuild)

1. Entire P0-31-01…04 + PATCH-01 + WHO-FAST-PATH logic  
2. Messaging transport, sender_user_id, system consequence  
3. SocialReality gap engine  
4. ExperienceField as ranking brain (extend windows only)  
5. RelationshipGraph / FollowGraph separation  
6. ReservationExecution lineage attachment  
7. ensure_direct dyad API  
8. Dirty unrelated work — leave alone; do not reset  

---

## 4. Implementation order (after this recon accepted)

Aligned with destinations-before-Home and final Figma:

| Slice | Goal | Figma | Compound onto |
|-------|------|-------|---------------|
| **S0** | Brand chrome + dock **＋** + FR00 splash identity | `162:2`, `201:5` dock, `217:5` | Existing FirstRun shell |
| **S1** | First-run visual convergence FR00–FR09 wiring real auth | `217:2` | ActivationFlow / FindPeople |
| **S2** | People surface `201:7` — person primary, Plan skips WHO, Opal ambient card | `201:7` | Messaging + P31 seed |
| **S3** | WHO visual grid `201:6` — keep candidate truth | `201:6` | WHO-FAST-PATH |
| **S4** | Journey `201:9` + leave/change/can't | `201:9`+`145:241` | Plans + ReservationExecution |
| **S5** | Home `201:5` continuum + EF pagination | `201:5`+`145:46` | Attention + ExperienceField + Moments |
| **S6** | LIVE `201:8` real product | `201:8` | ETA / live experience / participation |
| **S7** | Profile `201:10` + Graph detail `145:150` | `201:10` | SocialMoment + SharedPlan |
| **S8** | Engagement grammar + Graph visibility/join | `149:264`, domain gaps | New fields only as needed |

Each slice: end-to-end (UI + server + persist + tests + CI + founder walk). No dead buttons.

---

## 5. Genuine domain gaps (still)

- experience_lineage_id / Graph→Live→Memory state  
- Future Graph visibility + segment joinability  
- Interested vs I'm in persistence  
- Lead/co-lead product roles  
- Memory publish authority  
- Separate/Together invite mode  
- Home feed pagination API  

---

## 6. Last product CI (not for future code)

| SHA | Run | Result |
|-----|-----|--------|
| `3cde1dc` | `31947599166` | SUCCESS |
| `1ea1dfb` | docs only | no product gate required |

Any new product commit needs **new SHA + new CI**.

---

## 7. HOLD

```
HOLD. DO NOT MERGE.
DO NOT ASSUME 3cde1dc IS HEAD — HEAD IS 1ea1dfb (docs).
PRODUCT CODE HEAD FOR IMPLEMENTATION BASELINE: 3cde1dc BEHAVIOR IN TREE.
FINAL VISUAL: 201:2 · FINAL FIRST RUN: 217:2 · ROUTING: 155:2 · BRAND: 159/162.
NO V2.3.1 PRODUCT SCREENS IMPLEMENTED YET.
PRESERVE ALL P31 + WHO-FAST-PATH INTELLIGENCE.
```
