# P0-05.9 HOLD RETURN — Splash frost emergency / founder isolation

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

**Re-proof timestamp:** 2026-08-29T04:07:01Z (fresh Playwright against live Vite PID 13073)

## Root cause label

**`LEGACY_PARENT_SHELL`** (+ **`STALE_PROCESS`**)

Splash content existed in the React tree but was delivered through nested first-run / ambient / Motion machinery, with a Vite process started hours earlier. Same failure class as Promise frost.

Figma `618:19` was never the defect (`FIGMA_SPLASH_CONTENT_PRESENT = TRUE`).

## CASE

**CASE 1 (isolation GOOD):** `?opal_force_splash=1` shows complete 618:19 content.  
Therefore Splash component + emblem assets are good; defect was route/parent/shell/stale process.

## Repair (already at HEAD `73f0462`)

1. `FirstRunSplashPage` — top-level Splash owner (no Motion opacity-0, no fr-void)
2. `OpalApp` returns Splash shell when `firstRunStage === "splash"` (before Promise)
3. Auth path forced to `sign_in` so nested FR never remounts fr00
4. `?opal_force_splash=1` isolation probe in `main.tsx`
5. Vite killed and restarted on 5173 (strictPort) — current PID **13073** started **Fri Aug 28 21:02:31 2026**

## Live re-proof (founder route = ground truth)

| Artifact | Result |
|----------|--------|
| FORCE_SPLASH_RUNTIME.png | emblem + OPAL GRAPH + CTAs visible |
| FOUNDER_REAL_SPLASH_AFTER_REPAIR.png | same (exact founder URL) |
| FOUNDER_AFTER_TAP_PROMISE.png | Promise after one tap |
| FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE | **true** |
| ONE_TAP_PROMISE | **true** |
| Geometry vs 618:19 | emblem 107,128,176×176; wordmark top 338; tagline top 408; Skip 129,642,132×44; Tap 43,700,304×52; returning 43,766,304×46 |

## Promise

Unchanged. SHA `20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10`.

## FOUNDER_WALK_READY

**CONDITIONAL YES for Splash→Promise** on this Vite after hard refresh of the founder browser.

P0-05.8 / P0-05.8A Splash GREEN / blanket WALK_READY remain **REVOKED** / `SUPERSEDED_BY_REAL_FOUNDER_FAILURE` (see `INVALIDATED_EVIDENCE.md`).

### Founder walk URL (checkpoint-specific — hard-refresh is not founder duty)

Open once:

`http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=<git_rev_parse_short_7_HEAD>`

`runtime=<git_rev_parse_short_7_HEAD>` clears stale noon-session state and one-shot reloads if the checkpoint is new for that tab. Primary content must appear without redesign.

Expected order:

1. Splash `618:19` (emblem + OPAL GRAPH + TALK. ALIGN. GO. + Skip / Tap / returning)
2. One tap only
3. Exact Promise `646:2` (no intermediate frost)

Then continue Brand V4 auth. If frost appears again — **stop**; inspect browser/runtime identity (Figma + isolation already proven).

See also: `GLOBAL_RUNTIME_VISIBILITY_LAW.md`
