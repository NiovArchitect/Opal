# LIVE JOIN AND AUTH SHELL PROOF

**Public URL:** https://opal.niovlabs.com  
**Method:** Brave Browser (Playwright + Brave executable), private-equivalent clean storage, viewport 390×844  

**Credentials, fixture phone numbers, verification codes, cookies, tokens, and private messages are not recorded.**

---

## Locked product truth

> Joining Opal and using Opal are two different states.

---

## 1. Pre-fix proof (blocked activation)

| Item | Value |
|------|--------|
| Source merge | PR #52 → `1bd0e16` |
| Live asset (then) | `index-BNKZM2yZ.js` |
| gh-pages (then) | `040c800` |
| Automated scoreboard | 16 PASS · 1 FAIL |

### Pre-fix results

| Area | Result |
|------|--------|
| Pre-member no tab bar | PASS |
| Screens 1–5 narrative + Skip/Join | PASS |
| Skip → activation; no member nav | PASS |
| Join → activation; no member nav | PASS |
| Activation trust line | **FAIL** |
| Auth reveal / empty member / sign-out | **BLOCKED** |

### Root cause

Static public build was produced **without** baking:

```text
VITE_OPAL_API_URL=https://api.opal.niovlabs.com
```

Runtime selected the unconfigured path and showed:

> Could not connect. The hosted Opal service is not configured for this build.

CSP already permitted accepted production hosts. Shell correction itself was not defective.

---

## 2. Configuration repair

| Item | Value |
|------|--------|
| Source commit | `1bd0e16` (current `main` after PR #52) |
| Node | v24.13.1 |
| npm | 11.8.0 |
| Build env (names only) | `VITE_OPAL_API_URL` |
| Build value (public config) | `https://api.opal.niovlabs.com` |
| Socket | Derived from API base → `wss://api.opal.niovlabs.com/socket` via client `${socketBase}/socket` |
| Separate socket env | Optional `VITE_OPAL_SOCKET_URL` (not required when API URL set) |
| Web tests | 52/52 PASS |
| Generated JS | `index-L6EzdZwO.js` |
| Generated CSS | `index-49mfC7Cz.css` |

### Bundle audit (pre-deploy)

| Check | Result |
|-------|--------|
| Contains `https://api.opal.niovlabs.com` | PASS |
| Join Opal / trust / contact trust copy | PASS |
| Fallback “not configured” string compiled | Present (inactive when API URL set) |
| `localhost` as active API base | Absent (only `isLocalhost` guard) |
| Secrets / Foundation / Kafka URLs | Absent |

### Deploy

| Item | Value |
|------|--------|
| Method | GitHub Pages branch `gh-pages` |
| Deploy commit | `37fd06a` |
| Message | `deploy(web): bake VITE_OPAL_API_URL from main 1bd0e16` |
| Deployment time (UTC) | 2026-08-05 ~07:49 |

---

## 3. Live configuration verification (post-deploy)

| Check | Result |
|-------|--------|
| Live HTML references `index-L6EzdZwO.js` | PASS |
| New asset HTTP 200 | PASS |
| Old asset `index-BNKZM2yZ.js` | HTTP 404 |
| Live bundle includes API host | PASS |
| Browser network: `https://api.opal.niovlabs.com/api/v1/product/activation/challenges` | PASS |
| Browser network: `https://api.opal.niovlabs.com/api/v1/product/session` | PASS |
| Socket base convention | `wss://api.opal.niovlabs.com/socket` (client-derived) |
| Unconfigured error | **Gone** |

---

## 4. Full Brave authenticated journey (post-fix)

### Pre-auth

| Expectation | Result |
|-------------|--------|
| Home / Chats / Plans / You absent | PASS |
| Skip on screens 1–4 | PASS |
| No Skip on screen 5 | PASS |
| Join visible; aria Join Opal | PASS |
| Join opens activation | PASS |

### Activation

| Expectation | Result |
|-------------|--------|
| No member navigation | PASS |
| Trust line visible | PASS |
| Hosted API reachable | PASS |
| No unconfigured-service error | PASS |

### Authenticated

| Expectation | Result |
|-------------|--------|
| Member shell after valid verification | PASS |
| Home, Chats, Plans, You visible | PASS |
| Refresh restores member shell | PASS |

### Empty member (clean synthetic fixture with no residual relationships)

| Expectation | Result |
|-------------|--------|
| No Alex | PASS |
| No Jordan | PASS |
| Intentional empty / invite path | PASS |
| Find People available | PASS |
| Contact trust: “Only the people you select are invited.” | PASS |

Note: A previously used fixture retained residual chats (not product seed). Clean fixture path confirmed empty of Alex/Jordan and showed intentional social entry.

### Sign-out

| Expectation | Result |
|-------------|--------|
| Member navigation removed | PASS |
| Pre-member / walkthrough returns | PASS |
| Refresh remains signed out | PASS |

### Skip path (fresh context)

| Expectation | Result |
|-------------|--------|
| Skip screen 1 → activation | PASS |
| No member nav | PASS |
| Activation configured | PASS |

### Post-fix automated scoreboard

**33 PASS · 1 instrumentation-only FAIL** (early network host list race; subsequent dedicated capture confirmed API host). Product journey fully green.

---

## 5. Defects

| ID | Status |
|----|--------|
| Missing `VITE_OPAL_API_URL` on public static build | **Resolved** by gh-pages `37fd06a` |
| Pre-member shell isolation | No reopen |
| Product seed of Alex/Jordan for new members | Not observed on clean fixture |

---

## 6. Acceptance

**Join through real authentication is live-proven.**  
Member shell appears only after session authority.  
New clean member starts without Alex/Jordan seed.  
Sign-out removes membership surfaces and survives refresh.

Do not reopen pre-member decisions without a reproduced defect.  
Do not claim Social Flow 18 closure from this proof.
