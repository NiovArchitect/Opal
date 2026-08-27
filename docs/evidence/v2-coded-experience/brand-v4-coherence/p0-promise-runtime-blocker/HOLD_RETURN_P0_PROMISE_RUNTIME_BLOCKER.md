# P0 BLOCKER — PROMISE RUNTIME REPAIR

**HOLD. DO NOT MERGE. permissionToStartLive = NO. B2-06 PAUSED.**

Date: 2026-08-25  
Branch: `build/v2-coded-experience-closure`  
HEAD: `cb1bd43` (dirty tree preserved)

---

## A. HOLD
HOLD. No merge. No Live. No other product work.

## B. Branch / HEAD / tree
`build/v2-coded-experience-closure` @ `cb1bd43` — no reset.

## C. Exact root cause

**WRONG_ASSET_BYTES (incomplete Promise PNG).**

- Route Splash → Promise was already correct (one tap → `frPromise`).
- Image element mounted, HTTP 200, naturalWidth/Height 941×1672, opacity 1.
- But the file installed as `opal-promise-exact-941x1672.png` was produced by **Figma `exportAsync` of frame 646:2**, which rasterized an **incomplete Brand V4 backdrop** (frost / CTA chrome only — **no people, bubbles, paths, Rooftop Jazz, or headline**).
- Founder therefore saw a “frosted spectral” empty Promise even though DOM proofs falsely passed.
- The **actual IMAGE fill** on 646:2 (transport JPEG ~390×693, same aspect as 941/1672) contains the real founder Promise composition.
- Fix: quarantine incomplete backdrop; install fill content scaled to **941×1672**; remove frost CTA gradient overlay (invisible hit targets only).

**Not:** redesign · route skip · double-advance · image 404 · opacity 0.

## D. Exact files changed
- `apps/opal_web/public/brand/opal-graph/opal-promise-exact-941x1672.png` (replaced)
- `apps/opal_web/public/brand/opal-graph/_quarantine/opal-promise-INCOMPLETE-BACKDROP-ONLY-941x1672.png` (quarantine)
- `apps/opal_web/public/brand/opal-graph/opal-promise-fill-transport-390x693.jpg` (fill evidence)
- `apps/opal_web/src/onboarding/OpalPromiseScreen.tsx` (load state + fail surface)
- `apps/opal_web/src/styles.css` (layer z-index; no frost CTA band)

## E. State transition before/after
| | Before | After one tap |
|--|--------|---------------|
| step | fr00 | **frPromise** |
| Promise mounted | no | **yes** |
| Auth visible | no | **no** |
| TRANSITIONS_AFTER_ONE_TAP | — | **1** |

## F. Image network proof
`opal-promise-exact-941x1672.png` → **HTTP 200**  
See `runtime/PROMISE_IMAGE_LOAD_PROOF.json`

## G. Image DOM / computed style
naturalWidth **941** · naturalHeight **1672** · opacity **1** · visibility **visible** · display **block** · object-fit **contain** · intersects viewport **true**

## H. Layer / z-index
`.fr-void` / ambient **behind** · Promise frame/img **z-index 1+** · CTA hit targets **z-index 3**, **background transparent** (no frost cover)

See `PROMISE_LAYER_STACK.md`

## I. One-tap transition proof
PASS — Splash → Promise only. Rapid double-tap cannot skip to Auth.  
`runtime/PROMISE_ONE_TAP_TRANSITION_PROOF.json`

## J. CTA proof
Enter Opal → Auth (`fr06`). Promise unmounts.  
`runtime/PROMISE_CTA_PROOF.json`

## K. Refresh proof
Reload after Promise returns to first-run reset path (Splash), not dead frost.  
`runtime/PROMISE_REFRESH_PROOF.json`

## L. Returning-user regression
Not forced through Promise on normal returning login (unchanged policy). Founder reset URL still required for Splash→Promise QA.

## M. Screenshots
`SCREENSHOTS/01_SPLASH.png`  
`SCREENSHOTS/02_PROMISE_AFTER_ONE_TAP.png` — **full composition visible**  
`SCREENSHOTS/03_PROMISE_FULL.png`  
`SCREENSHOTS/04_AUTH_AFTER_ENTER_OPAL.png`

## N. Focused test counts
Browser harness proofs in `runtime/*`. Vitest first-run suites remain; Promise visual is asset+CSS (this pass).

## O. Console / network
`runtime/CONSOLE_NETWORK.json` — no Promise-load console errors in harness; Promise asset 200.

## P. Founder URL
```text
http://127.0.0.1:5173/?opal_reset_first_run=1
```

## Q. STOP
**STOP.** Founder must walk Splash → Promise → Auth.

No Home / Chats / Graphs / Opal work until Promise is visually confirmed.
