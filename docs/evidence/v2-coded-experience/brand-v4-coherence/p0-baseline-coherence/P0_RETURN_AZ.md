# P0 BASELINE RUNTIME COHERENCE RECOVERY — RETURN A–Z

**HOLD. DO NOT MERGE. permissionToStartLive = NO. LIVE BLOCKED. B2-06 OPAL = PAUSED.**

Date: 2026-08-24  
Branch: `build/v2-coded-experience-closure`  
HEAD (pre-existing worktree tip): `cb1bd43`  
Founder URL: `http://127.0.0.1:5173`  
Evidence: `docs/evidence/v2-coded-experience/brand-v4-coherence/p0-baseline-coherence/`  
Runtime JSON: `runtime/P0_BASELINE_COHERENCE_REPORT.json`

---

## A. HOLD

**HOLD.** No merge. No Live. B2-06 paused. Chats visual tranche not started as promotion.

## B. BYTE IDENTITY

- Worktree tip at start of P0 session: `cb1bd43`
- P0 changes are **local uncommitted** repairs (assets + shell routing/visual/Story). Not merged.

## C. FIGMA AUTHORITIES USED

| Node | Role |
|------|------|
| **594:2** | P0 Runtime Coherence Recovery lock (read first) |
| 570:7 | Governing coherence |
| 562:162 | Recovery |
| 528:25 | Brand V4 palette/ambience only |
| 568:2 / 568:3 | Trio Orb micro-emblem art |
| **594:26 / 594:27** | HD runtime master frames (same IMAGE hash as 568:2; runtime bitmaps 256/512 derived) |
| 433:2 | Dock Option B geometry |
| 327:5 | Splash |
| 287:6 / 287:7 / 287:20 | Home / header / Stories rail |
| 357:418 | Story viewer |
| 476:2 | Chats production owner (visual rejected) |
| 590:* | Communication candidates — **not promoted** |
| 368:23 | Graphs overview |
| 373:385 | Graph detail freeze candidate |
| 254:340 | You |
| 201:10 | Person Profile |
| 160:2 / 161:3 | Hero emblem / wordmark (not dock) |

## D. FIRST-RUN QA VS RETURNING BEHAVIOR

| Path | URL | Behavior |
|------|-----|----------|
| Founder first-run QA | `/?opal_reset_first_run=1&coherence_recovery=<ts>` | Splash (`fr00-splash`) → Promise/auth path |
| Returning authenticated | `/` | Member shell / Home — **not** forced through Splash/Promise |

Proof: `shots/P0_FIRST_RUN_RESET.png`, `shots/P0_RETURNING_USER.png`  
Status: **PASS** for both distinctions.

## E. PROMISE AUTHORITY STATUS

**PROMISE_EXACT_FIGMA_AUTHORITY_PENDING**

Founder supplied new desired Promise visual (conversation signals / spectral paths / Rooftop Jazz / copy). Exact production Figma node not promoted beyond superseded feel of `562:6`. Did **not** invent from prose. Did **not** use `540:14`. Other P0 baseline repairs continued.

## F. TRIO ORB HD

| Field | Value |
|-------|--------|
| source asset | `/brand/opal-graph/opal-dock-orb-trio-512.png` |
| naturalWidth × naturalHeight | **512 × 512** |
| CSS width × height | **56 × 56** |
| devicePixelRatio (runtime host) | 1 (proof also evaluates required pixels for 1/2/3) |
| required @ DPR3 | 56 × 3 = **168** |
| PASS/FAIL | **PASS** DPR1 / DPR2 / DPR3 |

Honest note: Figma ellipses `594:26`/`594:27` share the same IMAGE fill hash as the 112px `568:2` art. Runtime ships true 256/512 PNG derivatives of that **same** art (not hero `160:2`, not a redesigned orb). Crop: `shots/P0_DOCK_ORB_CROP.png`.

## G. STORY PLAYBACK

| Requirement | Status |
|-------------|--------|
| Image default 7s then auto-advance | Implemented (`IMAGE_STORY_MS = 7000`) |
| Video = actual media duration | Implemented (`<video>` + `ended`) |
| Tap right / left | Implemented |
| Hold to pause / release resume | Implemented |
| Progress reflects item | Multi-segment rail; proof saw progress advance (`33%` @ ~1.5s) |
| Advance person → close at end | Queue over `FOUNDER_STORIES`; close returns Home |
| No customer “Temporary Story” | **Removed** |
| Privacy / expiry untouched | Playback is UI-only |

Proof: `shots/P0_STORY_VIEWER.png` — tap-right advanced `story-chanelle` → `story-maya`. **PASS**

## H. HOME VISUAL

Continuous feed owner preserved (`GraphSocialHome` / HomeFeed lineage). No parallel Home. Side-light rails neutralized (see I). Shots: `P0_HOME_TOP|MIDDLE|BOTTOM.png`.

## I. HOME SIDE-LIGHT ROOT CAUSE

**Root cause:** invented `.app-ambient` full-bleed cyan/violet radial washes in `styles.css` + `[data-technicolor="controlled"] .app-ambient` in `technicolorProduction.css` — **not** present as permanent feed edge treatment in `287:6`.

**Fix:** product ambient backgrounds set to `transparent`. Activation-only soft top wash retained for walkthrough phase. Brand V4: discovered, not sprayed.

Status: **PASS** (`backgroundImage: none` on `.app-ambient` in member shell).

## J. HOME INTERACTIONS

Destinations remain wired (Profile / Search / Needs You / Story / Graph / Memory / Discovery / etc.). Story open/close verified clean (no trapped viewer). Full destination matrix not re-proved end-to-end in this P0 pass beyond Story / Graphs / You / Chats entry — prior B2 routing fixes retained.

## K. CHATS OWNER STATUS

Dock Chats → `ChatsHome` (production `476:2` lineage). Route owner **PASS**.

**CURRENT_VISUAL_FOUNDER_REJECTED** — not closed visually.

## L. COMMUNICATION 590 STATUS

`590:*` remains **FOUNDER REVIEW / candidate**.  
`CANDIDATE_AVAILABLE = 590:*`  
`PRODUCTION_PROMOTION_PENDING = YES`  
Did **not** implement 590 as final authority.

## M. GRAPHS ROUTING

Dock Graphs → `GraphsHome` with `data-figma="368:23"`, title **Your Graphs**, lede **What is taking shape**. **PASS**  
Shot: `P0_GRAPHS_OVERVIEW.png`

## N. GRAPH DETAIL FREEZE REGRESSION

Open from Graphs overview → existing `GraphDetailSheet` / `373:385` freeze candidate path. No broad repaint. Shot: `P0_GRAPH_DETAIL.png` (present when card opened).

## O. YOU ROUTING

Dock You → `YouPane` `data-figma-you="254:340"` identity/privacy/settings. **PASS**  
Shot: `P0_YOU.png`

## P. PROFILE SEPARATION

`GraphProfilePage` (`201:10` Message/Call/Video/Plan) **removed** from You embed. Person Profile remains the dedicated overlay owner from Home people. No You→Profile action leakage in You surface. **PASS**

## Q. DOCK OWNER MATRIX

| Tab | Owner |
|-----|--------|
| Home | GraphSocialHome / Home feed |
| Chats | ChatsHome (`476:2`) — visual rejected |
| Center | Trio Orb Talk-to-Opal (`568:2` art @ 512 runtime) |
| Graphs | GraphsHome (`368:23`) |
| You | YouPane (`254:340`) |

Option B geometry retained. No sixth/plus tab. No hero-pin in dock.

## R. MOBILE MATRIX

Proof viewport **390×844**. Shots captured at founder phone width.

## S. HD ASSET MATRIX

| File | Intrinsic | Role |
|------|-----------|------|
| `opal-dock-orb-trio-112.png` | 112 | Legacy source / Figma fill hash — **not** dock `<img>` |
| `opal-dock-orb-trio-256.png` | 256 | HD derivative (≥168) |
| `opal-dock-orb-trio-512.png` | 512 | **Runtime dock source** |

## T. OVERLAY LEAKS

Story close returned Home cleanly in proof. No Temporary Story chrome. You no longer mounts Person Profile overlay chrome.

## U. COMPOUNDING INTELLIGENCE

Not regressively reopened. Plan WHO skip / Direct identity / Graph consequence loops untouched in this P0 (Chats visual not redesigned).

## V. ZERO TRUST

No TemporaryStory privacy authority edits for timers. Playback timing is presentation-only.

## W. CONSOLE / NETWORK

Member shell reachable; Vite `:5173` + Phoenix `:4000` healthy during proof. No P0-blocking console triage package attached beyond functional green paths.

## X. FINAL P0 STATUS MATRIX

| Gate | Status |
|------|--------|
| Dock orb sharp @ DPR3 math | **PASS** (512 ≥ 168) |
| First-run reset route | **PASS** |
| Returning user not forced onboarding | **PASS** |
| Story image auto-advance / nav / no Temporary label | **PASS** |
| Home invented side lighting removed | **PASS** |
| Chats route real owner | **PASS** |
| Chats visual exact | **FAIL / FOUNDER_REJECTED** (honest) |
| 590 promoted | **NO — PENDING** |
| Graphs → 368:23 | **PASS** |
| You → 254:340 ≠ Profile 201:10 | **PASS** |
| Promise exact | **PENDING** |
| B2-06 Opal | **PAUSED** |
| Merge / Live | **NO / BLOCKED** |

## Y. FOUNDER RESET URL

```text
http://127.0.0.1:5173/?opal_reset_first_run=1&coherence_recovery=<timestamp>
```

## Z. RETURNING USER URL

```text
http://127.0.0.1:5173/
```

---

## STOP

P0 baseline coherence recovery returned for founder walk.

**HOLD. DO NOT MERGE. NO LIVE. PAUSE B2-06. RETURN AFTER P0.**
