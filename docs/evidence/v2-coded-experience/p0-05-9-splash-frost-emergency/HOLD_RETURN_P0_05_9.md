# P0-05.9 HOLD RETURN — Splash frost emergency / founder isolation

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

## Root cause label

**`LEGACY_PARENT_SHELL`** (+ **`STALE_PROCESS`**)

Splash content existed in the React tree but was delivered through nested first-run / ambient / Motion machinery, with a Vite process started hours earlier. Same failure class as Promise frost.

## CASE

**CASE 1 (isolation GOOD):** `?opal_force_splash=1` shows complete 618:19 content.  
Therefore Splash component + emblem assets are good; defect was route/parent/shell/stale process.

## Repair

1. `FirstRunSplashPage` — top-level Splash owner (no Motion opacity-0, no fr-void)  
2. `OpalApp` returns Splash shell when `firstRunStage === "splash"` (before Promise)  
3. Auth path forced to `sign_in` so nested FR never remounts fr00  
4. `?opal_force_splash=1` isolation probe in `main.tsx`  
5. Vite killed and restarted on 5173 (strictPort)

## Proofs

| Artifact | Result |
|----------|--------|
| FORCE_SPLASH_RUNTIME.png | emblem + OPAL GRAPH + CTAs visible |
| FOUNDER_REAL_SPLASH_AFTER_REPAIR.png | same |
| FOUNDER_AFTER_TAP_PROMISE.png | Promise after one tap |
| ONE_TAP_PROMISE | true |

## Promise

Unchanged.

## FOUNDER_WALK_READY

**CONDITIONAL YES for Splash→Promise** on fresh Vite after hard refresh.  
P0-05.8A blanket YES remains **REVOKED** until founder confirms the real browser session (cache).

Recommended URL (hard refresh):

`http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1`
