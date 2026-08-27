# HOLD RETURN — P0 SPECTRAL RUNTIME FIDELITY

**Date:** 2026-08-23  
**Branch:** `build/v2-coded-experience-closure`  
**Governing Figma:** `554:5` (read first)

---

## A. HOLD

**HOLD**  
**DO NOT MERGE**  
**permissionToStartLive = NO**  
**Chats not started**

---

## B. FIGMA AUTHORITIES

| Role | Node |
|---|---|
| Runtime fidelity lock | **554:5** |
| Symbol only | **160:2** |
| Brand board | **528:25** |
| Splash | **540:2** (pixel 539:11) |
| Promise | **540:14** (pixel 539:13) |
| Home spectral | **541:8** |
| Home feed | **287:6** |
| Home header (corrected) | **287:7** |
| Search | **373:261** |
| Needs You | **473:141** |

---

## C. BLACK-SCREEN ROOT CAUSE

`OpalApp` called two member-only `useEffect` hooks **after** `if (showFirstRun \|\| !authenticated) return …`.

Auth completion flipped into the member path → React **“Rendered more hooks than during the previous render”** → blank Midnight after Enter Opal / Auth.

**Fix:** move note-timer effects above the early return; add `OpalErrorBoundary`.

Evidence: `P0_BLACK_SCREEN_ROOT_CAUSE.md`

---

## D. ROUTE TRACE

`Splash 540:2` → `Promise 540:14` → `Auth (phone/OTP/profile)` → `Home 541:8+287:6+287:7`

Skip intro no longer skips Promise. Returning users still use “I already have an account.”

Proof: `P0_FIRST_RUN_ROUTE_PROOF.json` — splash/promise/auth/home all **true**, pageErrors **[]**.

---

## E. BROWSER TAB / FAVICON

| Field | Value |
|---|---|
| href | `/favicon-opal-graph-spectral.png` |
| status | **200** |
| size | 32×32 |
| SHA-256 | `dbc0b94478595a913fda527ef33af525056e4332a28a23a29c4e9c6746fc4da1` |
| source | 160:2 master LANCZOS |

Also: favicon-48, apple-touch 180, `site.webmanifest`.

---

## F. SPLASH

Founder URL shot: `P0_FOUNDER_URL_SCREENSHOTS/01_SPLASH.png`  
Hero: `/brand/opal-graph/opal-graph-emblem-1024.png` · natural 1024 · CSS 220 · DPR 2.

---

## G. PROMISE

Shots: `02_PROMISE_START` · `03_PROMISE_GRAPH` · `04_PROMISE_COMPLETE`  
Beat 3 · Rooftop Jazz present · Enter Opal present.

---

## H. HOME

Shots: `06_HOME_TOP` · `07_HOME_MIDDLE` · `08_HOME_BOTTOM`  
Header: Profile · Search · Needs You · wordmarkHome=**0**  
Feed: Stories · Conversation→Graph · Memory · Discovery · dock.

---

## I. SPECTRAL AMBIENCE

`--accent #00e5ff` · Midnight `#050816` · tokens from `528:25` / `spectralTokens.css` last in cascade · discovered not sprayed.

---

## J. HD ASSET PROOF

See `P0_HD_ASSET_AUDIT.md` — Splash 1024≥440@2x; dock 112≥112@2x; no upscaled 112→Splash.

---

## K. CASCADE HARDENING

`styles.css` → `technicolorProduction.css` → **`spectralTokens.css` LAST**  
Documented in `main.tsx` + `P0_SPECTRAL_CASCADE_MAP.md`.

---

## L. TALK TO OPAL

Dock `opal-graph-emblem-dock.png` · emblem-only · `data-brand-source=opal-graph-emblem-spectral-human-alignment` · aria Talk to Opal.

---

## M. HEADER

`287:7` corrected: Profile left · Search · Needs You · no Home wordmark.

---

## N. FUNCTIONAL PROOF

Brand Vitest: **37 passed**  
Founder route: Splash→Promise→Auth→Home **PASS**  
pageErrors **0** · consoleErrors **0** · failed network **0**

---

## O. COMPOUNDING INTELLIGENCE

CONTEXT_RESET **0** · INTELLIGENCE_REGRESSION **0** · DUPLICATE_OWNER **0** · STATIC_PRODUCTION_HOME **0**

---

## P. ZERO TRUST

**Actual ExUnit rerun:** 6 tests, **0 failures**

1. friends Story outsider denied  
2. deleted Story gone  
3. stale Journey revision denied  
4. withdrawn stale invitation  
5. blocked Journey add  
6. revoked open socket  

`P0_ZERO_TRUST_EXUNIT.txt` · `P0_ZERO_TRUST_REATTACK.md`

---

## Q. CONSOLE / NETWORK

console **0** · pageErrors **0** · logo assets **200**

---

## R. FOUNDER URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&runtime_fidelity=1787538137662
```

---

## S. SHA / CI

Local Vitest + ExUnit green. **DO NOT MERGE.**

---

## STOP

**HOLD · DO NOT MERGE · permissionToStartLive = NO · Chats not started**
