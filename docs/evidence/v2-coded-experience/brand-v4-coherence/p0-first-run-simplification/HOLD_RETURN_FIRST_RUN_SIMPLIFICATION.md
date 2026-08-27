# HOLD RETURN — P0 Final First-Run Simplification

**Date:** August 25, 2026  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD. DO NOT MERGE. permissionToStartLive = NO. B2-06 PAUSED. NO LIVE. STOP.**

---

## A. HOLD

Confirmed. Dirty tree preserved. No merge. No other product work.

## B. Exact old first-run path (before repair)

```
OpalApp premember shell (.app-premember + .app-ambient)
  └─ FirstRunExperience (.first-run.first-run-standalone)
       ├─ .fr-void                          ← frost/ambient gradients
       └─ AnimatePresence + motion.div.fr-frame  ← opacity/y animation
            └─ OpalPromiseScreen (nested .opal-promise-exact)
                 └─ img + transparent CTAs
```

Splash tap: `advanceFrom("fr00")` → internal `frPromise` step.  
Reset flag cleared on first boot tick. `existingSession` could short-circuit.

## C. Exact new first-run path

```
OpalApp stage machine: splash | promise | auth

splash:
  premember shell + FirstRunExperience (Splash only)
  Tap to begin → preventDefault/stopPropagation → firstRunStage="promise"

promise:
  EARLY RETURN — FirstRunPromisePage ONLY
  (no .fr-void, no Motion, no .first-run, no .app-ambient)
  CTA → firstRunStage="auth"

auth:
  FirstRunExperience mode="sign_in" (fr06+)
  → Home on completeFirstRun
```

Diagnostic: `?opal_force_promise=1` → same `FirstRunPromisePage` immediately.

## D. Legacy components removed from active path

| Component / wrapper | Status on Splash → Promise → Auth |
|---|---|
| `frPromise` render of nested Promise | **REMOVED** from active path (`{false && …}`) |
| `OpalPromiseScreen` inside FirstRunExperience | **REMOVED** (re-export only; critical path uses `FirstRunPromisePage`) |
| `.fr-void` during Promise | **ABSENT** (Promise is outside FirstRunExperience) |
| `AnimatePresence` / `motion.div.fr-frame` around Promise | **ABSENT** |
| premember `.app-ambient` over Promise | **ABSENT** |
| `fr01`–`fr05` demo | Still `{false && …}` off-route |
| Nested `.opal-promise-exact` CSS path | Unused on critical path |

## E. Reset-state override logic

- `?opal_reset_first_run=1` → `clearFirstRunDone()` + `saveSession(null)` + sticky `sessionStorage opal.forcedFirstRun=1`
- `forcedFirstRun` **not** cleared on boot tick (survives Splash → Promise)
- Cleared only on Promise CTA → auth (`advancePromiseToAuth`) or `completeFirstRun`
- While forced: `existingSession` passed as `null` (no authenticated Home shortcut)
- Gate: `showFirstRun \|\| forcedFirstRun \|\| !authenticated`

## F. Auth-state matrix

| Case | Result |
|---|---|
| A. Reset URL (storage conflict / prior “done”) | Splash → Promise (**forced**) |
| B. Unauthenticated + reset | Splash → Promise |
| C. First-run done, no live session, no reset | Sign-in (`premember-activation-shell`) — not Splash/Promise |
| D. Signed-out returning (first-run done) | `mode=sign_in` phone auth |

Note: true member **Home** requires a live authenticated product session. Without bearer/cookie session, case C correctly lands on sign-in rather than Home. Reset still defeats stored “done” flags.

## G. localStorage conflict matrix

Seeded under reset: `opal.firstRun.v14.completed=1`, `walkthroughDone`, `firstRunComplete`, historical fr step.

**Result:** Splash (`forced=1`, firstRun key cleared) → one tap → Promise page (`nw=941`).

Evidence: `runtime/G_STORAGE_CONFLICT_PROMISE.png`, `PROOF_MATRIX.json`.

## H. Direct Promise URL screenshot

`http://127.0.0.1:5173/?opal_force_promise=1`  
File: `runtime/A_FORCE_PROMISE.png`

**Visible:** people, bubbles, paths, Rooftop Jazz, Tonight at 8 PM, headline, TALK. ALIGN. GO., Enter Opal, I already have an account.  
**Absent:** `.fr-void`, `.first-run` shell.

## I. Splash → Promise screenshot

`http://127.0.0.1:5173/?opal_reset_first_run=1&first_run_v2=20c5210f` → Tap to begin  
File: `runtime/B_AFTER_TAP_PROMISE.png`

Same visible Promise composition. Auth not shown until CTA.

## J. Pixel comparison A vs B

| Metric | A (force) | B (reset+tap) |
|---|---|---|
| Component | `FirstRunPromisePage` | same |
| img src | `…png?v=20c5210ff89e9113` | same |
| natural | 941×1672 | 941×1672 |
| object-fit | contain | contain |
| fr-void / first-run shell | false | false |
| Screenshot bytes | ~1,195,446 | ~1,195,444 |

`BINARY = A_AND_B_SAME_COMPONENT`  
Visually identical canonical Promise (founder acceptance content present in both).

## K. Promise source SHA (disk)

`20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10`

## L. Runtime source SHA

`20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10`  
`SHA_MATCH = true`

## M. CTA routing

| CTA | Result |
|---|---|
| Enter Opal | → phone auth (`Start with your phone number.`) · stage=auth |
| I already have an account | → same auth entry (`advancePromiseToAuth`) |

Transparent hit targets only. No replacement button chrome.

## N. Console / network

- Promise asset HTTP 200 on force and after tap
- No Promise load failure
- Evidence: `runtime/PROOF_MATRIX.json`

## O. Vite PID / cwd

| Field | Value |
|---|---|
| PID | 42907 |
| cwd | `…/opal-grok-real-people/apps/opal_web` |

## P. Founder URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&first_run_v2=20c5210f
```

Direct binary:

```
http://127.0.0.1:5173/?opal_force_promise=1
```

## Q. STOP

**STOP.** No Home / Chats / Graphs / Journey / Profile / You / Settings / Global Opal / Live work.

Center Opal untouched this pass.

---

## Absolute pass standard (factual)

Both:

1. `?opal_force_promise=1`
2. Splash → Tap to begin

render the **same** visible canonical Promise, outside legacy frost/onboarding shell.

**HOLD. DO NOT MERGE. NO LIVE. STOP.**
