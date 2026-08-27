# P0-03 DATED HOME RUNTIME AUDIT

**Date:** 2026-08-25  
**Authority:** Figma `fy69K8cCug9prf5GLwQ7Hy` · page `618:2` · Home `618:44`  
**Wiring map read:** `618:3288`  
**First Run:** FOUNDER ACCEPTED · FROZEN (not reopened)  
**HOLD. DO NOT MERGE. permissionToStartLive = NO. B2-06 PAUSED.**

**Status language:** AUTOMATED evidence only. **FOUNDER_REVIEW_REQUIRED.**  
No claim of FIXED / EXACT / CLOSED.

---

## A. HOLD

Confirmed. Audit only. No Home CSS/layout repair started. First Run / Promise / Center Opal untouched.

## B. Branch / HEAD / tree

| Field | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd43` (`cb1bd4382d73fb7a83b29658ec3a48942801219e`) |
| Tree | Dirty (prior first-run + core work preserved). No reset. |
| Promise freeze SHA | `20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10` (unchanged) |

## C. Actual Vite PID / cwd / start time

| Field | Value |
|---|---|
| PID | `42907` |
| cwd | `…/opal-grok-real-people/apps/opal_web` |
| Start | Tue Aug 25 23:25:44 2026 |
| URL | `http://127.0.0.1:5173/` |
| Phoenix | `:4000` up (`beam.smp`) |

Runtime fingerprint for this package: authenticated member shell via live OTP session (`Founder Review` / `47aa5856-…`), not Storybook / not isolation harness.

## D. Proof 618:44 read

- `get_metadata` on `618:44` — frame **CURRENT — HOME — 287:6**, native **390 × 3040**
- Children inventoried: Header `618:48`, Stories `618:59`, Conversation `618:84`, Memory `618:124`, Graph `618:149`, Discovery `618:182`, Carousel `618:194`, Live `618:211`, Next peek `618:226`, Dock `618:235`
- `get_design_context` on `618:44` (skill `figma-design-to-code`) — structure + asset URLs captured
- `get_metadata` on wiring map `618:3288` — end-to-end destination law read
- Figma screenshot saved: `figma/FIGMA_618_44_HOME.png`, `figma/FIGMA_618_48_HEADER.png`

## E. Figma Home measurements (390 column)

| Object | Node | Figma box (approx) | Notes |
|---|---|---|---|
| Home frame | 618:44 | 390 × 3040 | Full continuous scroll |
| Header | 618:48 | 0,0 · 390 × 58 | Profile 40@16,9 · Search 42@290,8 · Needs You 42@338,8 · **NO wordmark** |
| Stories | 618:59 | 0,58 · 390 × 122 | **Your Story** first (ring+badge+Add) · peer row · label hidden |
| Conversation→Graph | 618:84 | 12,194 · 366 × 366 | Bubbles + spectral align rail + shared history + Open Graph |
| Memory | 618:124 | 12,576 · 366 × 500 | Media 338×286 · social actions |
| Graph | 618:149 | 12,1092 · 366 × 444 | Trajectory · Interested soft · Open Graph |
| Discovery | 618:182 | 12,1552 · 366 × 410 | Not followed · Follow / See experience |
| Carousel Memory | 618:194 | 12,1978 · 366 × 400 | Horizontal carousel · dots |
| Rare Live | 618:211 | 12,2394 · 366 × 452 | **Single** `● LIVE VIDEO` badge |
| Next peek | 618:226 | 12,2862 · 366 × 184 | Voice memory continuation |
| Dock | 618:235 | floating · 358 × 86 | Home/Chats/Center/Graphs/You |

## F. Figma Home asset ledger (material)

| Asset role | Figma | Runtime path observed |
|---|---|---|
| Search magnifier | 637:2 / header lock | `/figma-v2/header/icon-search.svg` |
| Needs You radar | 637:5 + unread | `/figma-v2/header/icon-needs-you.svg` |
| Story avatars | ellipse fills | founder seed `/figma-v2/...` avatars |
| Memory media | friends photo fill | seed/demo media |
| Discovery media | city fill | seed media |
| Carousel media | travel fill | **not clearly observed as carousel object** |
| Live media | city live fill | seed live media |
| Align nodes | time/place/travel vectors | `/figma-v2/feed/align-*.svg` |
| Center Opal | 645:3 / dock trio | frozen Center Opal path (not reopened) |

## G. Actual runtime measurements (390 × 844, DPR2)

Source: `runtime/HOME_RUNTIME_AUDIT.json`

| Object | Runtime | Notes |
|---|---|---|
| Component | `GraphSocialHome` | `data-figma-home="287:6"` (**not** 618:44) |
| Mode | `FOUNDER_FIXTURE` | feedCount **86** |
| Header | y0 · ~388 × 58 | Profile / Search / Needs You · wordmark=false · markers `287:7` |
| Stories | y58 · ~388 × 122 | rows=1 · overflow-x auto · **visible STORIES label** · Create Story **corner control** · **no Your Story cell** |
| Consequence card | h≈372 | Content matches Juniper fixture |
| Memory card | h≈449 | Media + engagement |
| Graph card | h≈444 | Timeline + I'm interested + Open Graph |
| Discovery/near | h≈400 | Present |
| Live card | h≈441 | **LIVE pill + VIDEO LIVE** both visible |
| Dock | present · top≈748 | dockOcclusionPx **0** at bottom scroll sample |
| Horizontal overflow | false | 375/390/393/430 all green for page overflow |

## H. Actual runtime screenshots

Under `runtime/`:

- `HOME_390_TOP.png` / `HOME_390_HEADER_STORIES.png`
- `HOME_390_CARD_CONSEQUENCE.png`
- `HOME_390_CARD_MEMORY.png`
- `HOME_390_CARD_GRAPH.png`
- `HOME_390_CARD_DISCOVERY.png` / `NEAR`
- `HOME_390_CARD_LIVE.png`
- `HOME_390_BOTTOM_DOCK.png`
- `HOME_{375,390,393,430}*.png`
- Destinations: `DEST_SEARCH.png`, `DEST_NEEDS_YOU.png`, `DEST_OPEN_GRAPH.png`, `DEST_STORY_CREATE.png`, `DEST_MEMORY.png`

**Pixel-visible (founder-eyes method):** conversation bubbles, align steps, Open Graph, Memory media+actions, Graph trajectory, Live dual badges, Search destination chrome, Needs You / Activity destination, Graph Detail sheet — all inspected as images, not DOM-only.

## I. Home object status matrix

| Object | Figma | Runtime owner | Status | Delta (honest) |
|---|---|---|---|---|
| HEADER | 618:48 | `gsh-top` | **MINOR_DIFF** | Correct triad, no wordmark; dated markers still 287:7; icon chrome vs 637:* unverified byte-exact |
| STORIES | 618:59 | `gsh-stories` | **MAJOR_DIFF** | Missing **Your Story** first cell + Add badge; visible STORIES label (Figma hidden); Create is detached corner `+` |
| CONVERSATION→GRAPH | 618:84 | `gsh-card-consequence` | **MINOR_DIFF** | Signature object present and readable; shared history + Open Graph; spacing/icon polish TBD |
| MEMORY | 618:124 | `gsh-card-memory` | **MINOR_DIFF** | Media + Like/Comment/Repost/Forward/Save visible; fixture order ≠ dated Maya card first |
| GRAPH | 618:149 | `gsh-card-graph` | **MINOR_DIFF** | Future-shape trajectory + soft Interested + Open Graph present |
| DISCOVERY | 618:182 | `gsh-card-discovery` / near | **MINOR_DIFF** | Not-followed framing + Follow / See experience affordances present |
| CAROUSEL | 618:194 | expected `is-carousel` | **CONDITIONAL** | No reliable carousel object captured in this runtime feed pass |
| LIVE | 618:211 | `gsh-card-live` | **MAJOR_DIFF** | Dual status (**LIVE** + **VIDEO LIVE**); violates single LIVE VIDEO indication |
| CONTINUATION | 618:226 | feed tail / continuation | **MAJOR_DIFF** | **86** cards / **62** consequence clones — destroys dated continuous rhythm |
| DOCK | 618:235 | member dock | **MINOR_DIFF** | Geometry present; Center Opal frozen; full EXACT reserved for founder |

## J. Interaction destination matrix

| ACTION | SOURCE | DEST NODE (dated / wiring) | RUNTIME | DOMAIN | CONTEXT | BACK | HOME-TAB | Audit note |
|---|---|---|---|---|---|---|---|---|
| Own Profile | Header | Person/You law 618:1257 / 201:10 where appropriate | `onOpenOwnProfile` | session identity | self | prior | Home root | Wired; not deep-audited this pass |
| Search | Header | 618:2299 / 373:261 | `SearchDestination` | search | — | dismiss | Home root | **Opens** (screenshot) |
| Needs You | Header | 618:2384 / 473:141 | `ActivityDestination` | activity | — | dismiss | Home root | **Opens** (Activity) |
| Create Story | Stories | 618:3232 | `StoryCreateFlow` | Story privacy | self | dismiss | Home root | Opens |
| Open peer Story | Stories rail | story viewer | `StoryViewer` | Temporary Story | story id | dismiss | Home root | Present; privacy owner preserved in code |
| Open Graph (consequence) | Conversation card | 618:758 / Graph Detail | `GraphDetailSheet` | Graph/Reality | card lineage | dismiss | Home root | **Opens** Graph Detail |
| I'm interested | Graph card | soft interest in-feed | local soft set + handlers | soft ≠ Going | card id | n/a | n/a | Soft path present |
| Memory media / detail | Memory | 618:2447 | `MemoryDetailSheet` | SocialMoment | content id | dismiss | Home root | Opens |
| Comment | Memory actions | 618:2512 | comments sheet | SocialMomentComments | content id | dismiss | Home root | Wired in OpalApp |
| Forward | Memory actions | 618:2569 | `ForwardSharePicker` | share | content id | dismiss | Home root | Wired |
| Follow (Discovery) | Discovery | FollowGraph only | follow handlers | FollowGraph | person | n/a | n/a | Law encoded; verify no Connection mutation in repair |
| See experience | Discovery | 618:2629 | Discovery detail | discovery | card | dismiss | Home root | Wired |
| Open Live | Live card | 618:2801 visual only | live visual route | **NO Live domain** | card | dismiss | Home root | Visual only; Live blocked |

## K. Domain owner matrix

| Concern | Owner | Parallel risk |
|---|---|---|
| Home feed UI | `GraphSocialHome` + `homeHydration` | Fixture mode can overwhelm production hydration |
| Soft interest | in-feed / existing soft handlers | Must not restart WHO |
| Memory engagement | SocialMomentEngagement (+ likes/comments/reposts/saves) | LOCAL_ONLY_ENGAGEMENT forbidden |
| Stories | Temporary Story publishing + privacy | No “Temporary Story” customer chrome |
| Follow | FollowGraph | Follow ≠ Connection |
| Graph / Journey | existing Graph + Journey authority | Graph ≠ Journey; Interested ≠ Going |
| Auth/session | product session + Phoenix | Preserved for this audit login |
| Realtime | Phoenix channels | Not mutated this pass |
| Live domain | **blocked** | permissionToStartLive=NO |

## L. Context preservation matrix

| Risk | Observed |
|---|---|
| CONTEXT_RESET | Not proven 0 — Open Graph sheet opened; lineage claim needs repair-pass verification |
| PARALLEL_HOME | NO second Home shell observed |
| STATIC_PRODUCTION_HOME | **RISK HIGH** — FOUNDER_FIXTURE with 86 cards / 62 consequences |
| WHO/WHEN/WHERE restart | Soft interest path exists; must stay soft |
| First Run regression | Not touched; Promise SHA frozen |

## M. Mobile issues

| Viewport | Home | Horizontal overflow | Dock |
|---|---|---|---|
| 390×844 | yes | no | yes |
| 375×812 | yes | no | yes |
| 393×852 | yes | no | yes |
| 430×932 | yes | no | yes |

**AUTOMATED_PASS** for page-level overflow. Founder visual acceptance still required per size.

## N. Dock clearance issues

Sample at bottom scroll: `dockOcclusionPx = 0`, `unreachableCTA = 0` (automated).  
Still **FOUNDER_REVIEW_REQUIRED** across all four sizes after content rhythm is corrected (current feed height ~34k px is unnatural).

## O. Image-density issues

| Area | Issue |
|---|---|
| Header icons | SVG paths present; not SHA-proven against Figma 637 exports |
| Story / Memory / Live media | Seed/demo assets; DPR/crop vs dated fills not byte-audited |
| Live | Dual badge chrome (visual defect), not blur |
| Promise/Center | Frozen — out of scope |

## P. Console / network baseline

- Console errors/warnings captured in audit run: **none** in error/warning filter
- Failed brand/api responses: none recorded in failure filter
- Session probe succeeded for authenticated Home

## Q. Exact proposed repair sequence (DO NOT START YET)

Per authority order — after founder acknowledges this audit:

1. **Home Header** — retarget markers to `618:48`; verify Search/Needs You icon fidelity vs 637:*; no wordmark  
2. **Stories** — replace detached corner `+` with **Your Story** first cell (ring + add badge + Add); hide STORIES label if dated hidden; keep one-row rail  
3. **Conversation → Graph** — polish to 618:84 geometry; keep signature intelligence treatment  
4. **Memory** — order/media/actions vs 618:124; ensure same content id into detail  
5. **Graph** — 618:149 trajectory chrome; keep Interested soft  
6. **Discovery** — 618:182; FollowGraph only  
7. **Carousel** — restore real horizontal Memory carousel (618:194) if missing from hydration  
8. **Rare Live** — **one** LIVE VIDEO indication; remove duplicate red LIVE pill; visual-only  
9. **Continuation / feed rhythm** — collapse fixture spam (86→dated continuous set); bottom clearance re-proof  
10. **Dock regression** — interaction state only; Center Opal frozen  

Then: Home destination wiring pass → founder Home walk → **only then** Communication.

---

## Absolute audit conclusion

Home is a **real authenticated member route** on the correct Vite process with recognizable social objects and working Search / Needs You / Open Graph destinations.

It is **not** founder-exact against `618:44`.

Largest blockers before any EXACT language:

1. Stories Your Story affordance (**MAJOR_DIFF**)  
2. Live dual status pills (**MAJOR_DIFF**)  
3. Fixture-bloated feed rhythm (**MAJOR_DIFF** / STATIC risk)  
4. Carousel presence (**CONDITIONAL**)  
5. Dated authority markers still on historical 287:*  

**AUTOMATED_PASS** ≠ founder acceptance.

**FOUNDER_REVIEW_REQUIRED.**

**HOLD. DO NOT MERGE. NO LIVE. STOP AFTER AUDIT.**
