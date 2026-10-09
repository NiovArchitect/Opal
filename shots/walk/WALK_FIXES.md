# Paste W — Founder Walk Findings → Fixes (2026-10-09)

Branch: `muse/packet-b-batch-2`  
Tip at evidence: see `git log` below / `WALK_VERIFY.json`.

## Commits (phase order)

| Phase | SHA | Message |
|-------|-----|---------|
| 0 | `a6e374da` | brand composer tokens and plan color code |
| 5 | `da346146` | you page file and brand |
| 6 | `c8965265` | protect list regressions |
| 2 | `d3ade4b1` | chat threads touchable |
| 3 | `55160984` | graphs truth sync |
| 4 | `6b6fc9db` | home real numbers |
| 1 | `e054d2bd` | onboarding permissions before friend |

## Brand / color code

See `shots/walk/BRAND_TOKENS.md`.

- Composer SOT: Opal Center day bar → `opalComposerTokens.css`
- Plan states (L2): confirmed=`#00E5FF`, pending=`#FFC86B`, idea=`#8B5CF6`
- Lifecycle (L6): idea → forming → pending → locked → happening → past

## Finding → fix map (34)

### Phase 0 — Brand
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 0.1 | Composer tokens not shared | Extracted gradient/glow/radius/mic into `opalComposerTokens.css` | `BRAND_TOKENS.md`, `02_center_composer_after.png` |
| 0.2 | Chat/composers diverge from Center | Apply `.opal-composer-brand` / native-host composer rules to chat composers | CSS cascade |
| 0.3 | Muddy mustard/olive | Purged `#c4a574` `#d4b483` `#ffe0a8` → `#ffc86b` | styles.css |
| 0.4 | Plan color code inconsistent | `planStateColors.ts` + CSS `[data-plan-state]` | planStateColors.test.ts |
| 0.5 | Seed em-dashes | User-facing seeds use short punctuation (`Perfect. I'll…`) | founderChatsPlanPills |

### Phase 1 — Onboarding
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 1.1 | Splash 2 top bubble clip | Promise clip `padding-top: 8px` / status crop clear (B3) | `08_splash2_promise_after.png` |
| 1.2 | Friend before permissions | `ask_permissions` → contacts/calendar/notifications → friend/vibe | holyShitFirstRun.test.ts |
| 1.3 | Friend step off-brand | Token polish on Meet Opal bubbles/pills | styles HS section |
| 1.4 | No-phone dead-end | Manual phone + Continue without sending | TrustContractCard |
| 1.5 | Permission dumps to home | Stay in Meet Opal; no location.assign | OpalWorking / MeetOpal |

### Phase 2 — Chat
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 2.1 | Plan filament not tappable | `opal-plan-filament-hit` → openGraphDetail | `04_thread_header_after.png` |
| 2.2 | Avatar not opening profile | `ContactProfileSheet` from gpt-avatar | ContactProfileSheet.tsx |
| 2.3 | Calendar icon in header | Removed `gpt-plan` (L5; create stays on Graphs) | physicalCloseout/callEntry tests |
| 2.4 | Attach types fake | Honest gates per type | OpalApp attach menu |
| 2.5 | Menu only closes via + | Outside pointer + Escape | useEffect dismiss |
| 2.6 | Confirm not syncing log | Confirm → filament `data-plan-state=locked` | OpalApp confirm path |
| 2.7 | Shared Graph header always | Show only with active shared plan | GraphPeopleThread gate |

### Phase 3 — Graphs
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 3.1 | Ideas dead | “Start planning” → GraphCreateFlow prefilled | GraphSocialHome / Ambient |
| 3.2 | Happening lie | `happeningInLabel` gated for forming/idea | founderGraphSeed |
| 3.3 | Add someone | Wired to `add_members` search | Graph detail |
| 3.4 | Mysterious + | `aria-label="Create graph"` | GraphsHome |
| 3.5 | Timeline polish | Spacing + plan-state colors | GraphsTemporalTimeline |
| 3.6 | Dead Adjust | `TimelineAdjustSheet` time/venue/people/message/cancel | TimelineAdjustSheet.tsx |

### Phase 4 — Home
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 4.1 | Badge clip | Dock chats overflow visible | styles PASTE_W_DOCK_BADGE_CLIP |
| 4.2 | Fake 42 comments | Seed `commentCount: 0` (L7 no fake materialization) | founderGraphSeed |
| 4.3 | Seed · SHA visible | Gate behind `?opal_dev=1` | `01_home_after.png` |

### Phase 5 — You
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 5.1 | Loose settings | Filed into Calls/Assist, Privacy, Feed & discovery (L8) | YouSettingsDestination |
| 5.2 | Edit profile overlap | Absolute tops retuned | styles you-edit |
| 5.3 | You unbranded | Composer gradient/glow on cards | `06_you_after.png` |

### Phase 6 — Protect
| # | Finding | Fix | Evidence |
|---|---------|-----|----------|
| 6.1 | Japan deal gold standard | Locked in pasteWProtectList + restaurant almost-full | pasteWProtectList.test.ts |
| 6.2 | Sabrina watch live | Regression locked | same |
| 6.3 | Story rings labels | Kept + tested | same |
| 6.4 | You QR | Kept + tested | `06_you_after.png` |
| B1 | I WILL / I WON'T | Kept + branded | TrustContractCard |
| B2 | Watch Opal work honesty | Kept | OpalWorking |

## Screenshots

After shots in this folder: `01_home_after.png`, `02_center_composer_after.png`, `03_chats_after.png`, `04_thread_header_after.png` (Chanelle filament), `04b_juniper_shared_graph_after.png` (Shared Graph reference), `05_graphs_after.png`, `05b_timeline_after.png`, `06_you_after.png`, `07_splash1_after.png`, `08_splash2_promise_after.png`.  
Before: founder walk phone captures from the paste (not re-hosted here); compare against after for polish delta.

## Residual / honest gaps

1. Chat attach is **honest-gated**, not full media pipeline E2E (Center attach remains the richer path).
2. Timeline Adjust saves locally / gate notes until SharedPlan write path is wired.
3. Filament → plan open uses seed/planId heuristics when live projection is thin.
4. ContactProfileSheet is compact (not full Graph profile).
5. Light mode out of scope (B6). Founder phone re-walk still required for final human judgment.
6. B4 60fps glow: soft single-layer glow used; no heavy multi-blur stack.


## Phase 7 hotfix

Dash scrub in `seedThreadIntelligence.ts` used an invalid character class `[.--]` (range out of order), crashing the app on boot. Fixed to `[-–—.]`.

Browser evidence: `WALK_VERIFY.json` PASS @390×844 dark; flags `opal_founder_seed=1`, `opal_native_host=1`, `opal_reset_first_run=1`.
Vitest: planStateColors + pasteWProtectList + seedThreadIntelligence + holyShitFirstRun = 23/23.
