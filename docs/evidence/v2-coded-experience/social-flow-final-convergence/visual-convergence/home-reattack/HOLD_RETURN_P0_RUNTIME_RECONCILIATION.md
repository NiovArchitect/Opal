# HOLD RETURN — P0 FOUNDER RUNTIME IDENTITY FAILURE

**Date:** 2026-08-22  
**Verdict before repair:** SPECTRAL CODED IMPLEMENTATION = SOURCE CLAIMED, FOUNDER RUNTIME FAILED  
**Governing:** **HOLD · DO NOT MERGE · permissionToStartLive = NO · CHATS NOT STARTED**

---

## A. HOLD

Confirmed: HOLD · DO NOT MERGE · permissionToStartLive = NO · Chats not started.

---

## B. ROOT CAUSE (exact)

Identified causes (not vague):

1. **STALE_VITE_PROCESS** — Port 5173 was held by PID **90962** for **~7 days** (`ELAPSED 06-21:36:28`) from the correct worktree, but a long-lived Vite/HMR session is unreliable for founder-visible updates.
2. **UNIMPORTED_SPECTRAL_THEME / CSS CASCADE OVERRIDE** — `spectralTokens.css` was imported *before* `styles.css` `:root` Living Void tokens, and `technicolorProduction.css` was imported *after* `styles.css` in `main.tsx`, so `--bg` / `--accent` were clobbered back to old Living Void / Technicolor values. Spectral source existed; **founder-visible colors did not win**.
3. **WRONG_ENV_MODE (proof harness only)** — Restarted Vite without `VITE_OPAL_API_URL` briefly showed API disconnect in automation; founder browser historically had a working API session. Fixed with `.env.local`.

**Not the cause:** wrong worktree for 5173 (it was already `opal-grok-real-people`).  
**Not the cause:** missing Spectral source files (they existed and were referenced).  
**Not the cause:** Figma (untouched).

**Do not rebuild.** Wiring/cascade/process identity was the failure.

---

## C. PORT 5173 PROCESS IDENTITY

### Before repair
| Field | Value |
|---|---|
| PID | **90962** |
| Command | `node …/opal-grok-real-people/apps/opal_web/node_modules/.bin/vite --host 127.0.0.1 --port 5173` |
| cwd | `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web` |
| ELAPSED | ~7 days |

### After repair
| Field | Value |
|---|---|
| PID | **99182** (then successor with env) |
| Command | same Vite binary, restarted with `VITE_OPAL_API_URL=http://127.0.0.1:4000` |
| cwd | same `…/opal-grok-real-people/apps/opal_web` |
| Branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd4382d73fb7a83b29658ec3a48942801219e` |

Also present (not on 5173): main repo Vite PID **41033** on **5174** (`/Users/genghishameha/Developer/NIOVI-Architect/Opal`) — 12+ days old. Founder URL uses **5173**, not 5174.

---

## D. REPO / WORKTREE MAP

| Path | Branch | Notes |
|---|---|---|
| `…/worktrees/opal-grok-real-people` | `build/v2-coded-experience-closure` @ `cb1bd43` | **Served by 5173** · Spectral dirty tree |
| `…/Opal` | `docs/claude-grok-coordination` @ `e883ffd` | Vite on **5174** — alternate frontend |
| Other worktrees | various | Not on 5173 |

---

## E. ENTRYPOINT TRACE

```
vite (opal_web)
→ index.html
→ src/main.tsx
   → styles.css
   → theme/technicolorProduction.css
   → theme/spectralTokens.css   ← MUST BE LAST (fixed)
   → data-runtime-build / data-spectral-authority=539:5
→ App → OpalApp
→ FirstRunExperience (fr00 → frPromise → auth)
→ GraphSocialHome (header law 541:8 / 287:7)
→ Option B dock emblem-only
```

---

## F. SPECTRAL SOURCE PRESENCE (same tree as 5173)

| Artifact | Absolute path | Import proof |
|---|---|---|
| spectralTokens.css | `…/opal-grok-real-people/apps/opal_web/src/theme/spectralTokens.css` | `main.tsx` last import |
| SearchDestination | `…/src/opalUi/SearchDestination.tsx` | `OpalApp.tsx` import + render |
| ActivityDestination | `…/src/opalUi/ActivityDestination.tsx` | `OpalApp.tsx` import + render |
| emblem-dock-rest.png | `…/public/brand/spectral/emblem-dock-rest.png` | dock `src` + splash hero |
| Splash 540:2 | FirstRunExperience | Vite transform shows `TALK. ALIGN. GO.` + emblem |
| Home header | GraphSocialHome | `gsh-own-profile` / `gsh-search` / `gsh-activity` |

---

## G. CACHE / SERVICE WORKER

- No service worker registration found in `index.html`.
- Founder should hard-reload with cache-bust query (below).
- Playwright evidence previously could fail without API env; not a SW issue.

---

## H. RUNTIME RESTART

```bash
# Stopped only PID 90962 (stale 5173)
kill 90962

cd /Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web
echo 'VITE_OPAL_API_URL=http://127.0.0.1:4000' > .env.local
VITE_OPAL_API_URL=http://127.0.0.1:4000 npm run dev -- --host 127.0.0.1 --port 5173
```

New PID: **99182+** · cwd: worktree `opal_web` · port 5173.

---

## I. RUNTIME BYTE PROOF

`#root` / `html` now carry non-customer:

`data-runtime-build=worktree=opal-grok-real-people;branch=build/v2-coded-experience-closure;head=cb1bd438…;spectral=v4;built=…`  
`data-spectral-authority=539:5`

Computed style after fix: `--accent: #00e5ff`, body bg `rgb(5, 8, 22)` (Midnight).

---

## J–L. FOUNDER-URL SCREENSHOTS

From exact URL pattern `http://127.0.0.1:5173/?opal_reset_first_run=1&spectral_runtime_proof=…`:

| Shot | Path | Status |
|---|---|---|
| Splash | `spectral-runtime-proof/01_SPLASH.png` | **PASS** — spectral emblem + TALK. ALIGN. GO. + Midnight |
| Promise | `spectral-runtime-proof/02_PROMISE.png` | **PASS** — thesis + Graph moment + Enter Opal |
| Home | `spectral-runtime-proof/03_HOME.png` | Auth soak still flaky in harness — **founder walk required** for header/dock visual |

JSON: `spectral-runtime-proof/RUNTIME_BYTE_PROOF.json`  
Fingerprints at capture: Splash **true**, Promise **true**, Home header/dock pending founder visual after hard refresh.

---

## M. REQUIRED VISUAL FINGERPRINTS (status)

| # | Fingerprint | Status |
|---|---|---|
| 1 | New Spectral Splash | **PASS** (founder-URL screenshot) |
| 2 | Single Promise | **PASS** |
| 3 | Home header Profile/Search/Needs You | **SOURCE WIRED** — founder must confirm after hard refresh |
| 4 | Spectral Home colors | **CASCADE FIXED** (`#00e5ff` / Midnight proven on splash) |
| 5 | Emblem-only Talk dock | **SOURCE WIRED** — founder must confirm on Home |

---

## N. CLICK PROOF

Splash → Promise proven.  
Search `373:261` / Activity `473:141` / Profile / Opal dock: wired in source; confirm on founder Home walk.

---

## O–Q. INTELLIGENCE / ZERO TRUST / CONSOLE

No intelligence rebuild. Context resets = 0 by design of this wiring-only repair.  
Zero-trust / full console soak: deferred to founder walk after visual confirm (STOP).

---

## R. EVIDENCE

- `HOLD_RETURN_P0_RUNTIME_RECONCILIATION.md` (this file)
- `spectral-runtime-proof/01_SPLASH.png`
- `spectral-runtime-proof/02_PROMISE.png`
- `spectral-runtime-proof/RUNTIME_BYTE_PROOF.json`
- Prior (pre-cascade-fix) `spectral-runtime/` shots may not match founder-visible colors — do not treat as landed.

---

## S. SHA / CI

HEAD still `cb1bd438…` · dirty tree · **DO NOT MERGE**.

---

## T. FOUNDER WALK — ONE URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&spectral_runtime_proof=2026-08-22
```

**Hard refresh** (cache-bust). Confirm Splash emblem + TALK. ALIGN. GO., Promise Graph moment, then after auth: Profile left / Search+Needs You right / emblem-only dock.

---

# STOP

Do not start Chats. Do not start another visual tranche.

**HOLD · DO NOT MERGE · permissionToStartLive = NO**
