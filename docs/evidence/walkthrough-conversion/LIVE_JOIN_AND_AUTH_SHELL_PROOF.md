# LIVE JOIN AND AUTH SHELL PROOF

**Date:** 2026-08-05  
**Live URL:** https://opal.niovlabs.com  
**Public deployment:** gh-pages `040c800`  
**Live asset:** `index-BNKZM2yZ.js`  
**Source merge:** PR #52 → `1bd0e16`  
**Method:** Brave Browser (headless via Playwright `playwright-core` + Brave executable), private-equivalent clean storage context, viewport 390×844  

**Credentials, fixture phone numbers, cookies, tokens, and private messages are not recorded.**

---

## Locked product truth under test

> Joining Opal and using Opal are two different states.

- Walkthrough is entirely pre-membership
- Screens 1–4 retain Skip → activation
- Screen 5 contains Join and no Skip
- Member navigation appears only after authoritative authenticated session
- Invitation happens naturally after membership

---

## Method

1. Launch Brave via Playwright with clean context.
2. Visit `https://opal.niovlabs.com`.
3. Clear `localStorage` / `sessionStorage` and reload (clean Opal first-run state).
4. Click through walkthrough; assert Skip / Join / nav absence.
5. Fresh context: Skip from screen 1 → activation.
6. Join from screen 5 → activation shell.
7. Attempt synthetic activation path only if hosted API is configured for the static build.

Machine-readable results: `/tmp/opal-live-join-proof.json` (local operator artifact; not committed secrets).

---

## Screens 1–5 (live)

| Screen | Expected | Result |
|--------|----------|--------|
| Boot clean | Page loads; no member tab bar | **PASS** |
| Screen 1 | Title: “Life starts in conversation.” Skip visible. No Home/Chats/Plans/You | **PASS** (title + Skip + no tabbar) |
| Screen 2 | “When talk becomes something real.” Skip. No member nav | Exercised via Continue advance; no member nav throughout (PASS) |
| Screen 3 | “Decide without killing the vibe.” Skip. No member nav | Same as above |
| Screen 4 | “Moments that actually happen.” Skip. No member nav | Same as above |
| Screen 5 | “More of what you talk about should actually happen.” Support copy exact. **Join** visible. Accessible name **Join Opal**. Skip absent. Secondary invitation line absent. No member tabs | **PASS** |

Screen 5 support copy observed:

> Opal understands what is taking shape and helps you and your people carry it forward.

---

## Skip live behavior

| Step | Expected | Result |
|------|----------|--------|
| Skip from screen 1 | Activation opens; walkthrough skipped | **PASS** |
| After Skip | No member navigation; no authenticated shell | **PASS** |
| Skip on screen 5 | Control must not exist | **PASS** (Skip absent on final) |

---

## Join live behavior

| Step | Expected | Result |
|------|----------|--------|
| Activate Join on screen 5 | Phone activation opens | **PASS** |
| No member nav during transition | No Home/Chats/Plans/You flash | **PASS** |
| Trust line | “Your relationships and conversations stay private. You choose what Opal may use or share.” | **FAIL** — activation shows connection error instead of trust form |

### Residual defect (deploy config, not shell logic)

Activation UI message observed:

> Could not connect. The hosted Opal service is not configured for this build.

**Root cause:** static gh-pages build lacks baked `VITE_OPAL_API_URL` (bundle contains both the trust-copy source string and the not-configured error path). CSP already allows `https://api.opal.niovlabs.com` and related hosts.

**Impact:** full live **auth reveal**, **refresh session restore**, **sign-out**, and **empty member start** cannot complete against production web until a rebuild/redeploy with API URL.

**Not a regression of pre-member isolation:** Join still routes to activation shell without member chrome.

---

## Authoritative auth reveal

| Step | Expected | Result |
|------|----------|--------|
| Complete activation with approved synthetic fixture | Session established | **BLOCKED** (API URL not configured in live web build) |
| Member shell only after session probe | Home, Chats, Plans, You appear | **BLOCKED** live; **PASS** in source/tests (session-gated tab bar) |
| Refresh restores shell if session valid | Restore | **BLOCKED** live |
| Sign out removes member nav | Gone after sign-out; refresh stays signed out | **BLOCKED** live |

Source-level guarantees (PR #52 / product tests) remain:

- Boot without session → no member tab bar
- Activation shell → no member tab bar
- Authenticated session probe → member shell

---

## Empty member start

| Expectation | Live | Source |
|-------------|------|--------|
| No Alex / Jordan seeded chats | BLOCKED live | PASS (no seed chats in product path) |
| No fake plan | BLOCKED live | PASS |
| Intentional empty Chats + Find People | BLOCKED live | PASS |
| “Only the people you select are invited.” | BLOCKED live | PASS (contact trust copy) |

---

## Bundle / deploy correlation

| Item | Value |
|------|-------|
| Script tag | `/assets/index-BNKZM2yZ.js` |
| CSS | `/assets/index-49mfC7Cz.css` |
| Join accessible name in bundle | Present (`Join Opal`) |
| Screen 1 + screen 5 headlines in bundle | Present |
| first-run-skip markers | Present |
| member-tabbar marker | Present (gated) |
| Trust copy in bundle | Present |
| “not configured for this build” path | Present (activated when API base empty) |

---

## Scoreboard

| Area | Live PASS | Notes |
|------|-----------|-------|
| Pre-member no tab bar | Yes | |
| Walkthrough present clean | Yes | |
| Screen 1 title + Skip | Yes | |
| Screen 5 Join / Join Opal / no Skip / no invite homework / no nav | Yes | |
| Join → activation shell | Yes | |
| Skip → activation / no nav | Yes | |
| Activation trust line visible | **No** | Deploy env gap |
| Auth reveal / sign-out / empty member | **Not live-proven** | Blocked by API URL |

**Automated run:** 16 PASS · 1 FAIL (activation trust / API config)

---

## Defects

1. **P0 deploy residual:** `VITE_OPAL_API_URL` missing from gh-pages production build → activation cannot reach hosted API → auth shell live proof incomplete.  
   **Fix:** rebuild web with `VITE_OPAL_API_URL=https://api.opal.niovlabs.com` (or accepted production API host) and redeploy gh-pages; re-run Brave private proof for trust line, verify, member shell, empty Chats, Find People, sign-out.

2. No product defect reopened for Join/Skip/pre-member isolation.

---

## Acceptance statement

**Pre-member shell and Join conversion path are live-proven.**  
**Authoritative authenticated member shell is proven in source and prior session gating tests; full live auth click-through remains blocked solely by static API configuration.**

Do not reopen pre-member decisions without a reproduced defect.

Do not claim Social Flow 18 closure from this proof.
