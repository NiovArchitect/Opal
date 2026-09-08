# R1B Native Existing State Inventory

**Date:** 2026-09-08  
**HEAD at inventory:** `3e589b9`  
**Branch:** `build/v2-coded-experience-closure`  
**R1A:** COMPLETE (`R1A_COMPLETE_LOCK_2026-09-08.md`)  
**R1B:** AUTHORIZED · NOT COMPLETE

## Git / tree

| Check | Value |
|-------|--------|
| HEAD | `3e589b9` |
| Branch | `build/v2-coded-experience-closure` |
| Remote | `origin` → `NiovArchitect/Opal.git` |
| Clean | **NO** — untracked `apps/opal_core/docs/`, `apps/opal_web/docs/` (unrelated; leave alone) |

## Actual native technology

| Claim | Truth |
|-------|--------|
| Framework | **EXPO ~53 + React Native 0.79** (`apps/opal_mobile`) |
| Capacitor | **NOT PRESENT** |
| Pure native iOS/Android projects in-repo | **NOT PRESENT** (EAS-managed) |
| WebView wrapper today | **NOT YET** (product UI is RN screens) |
| EAS | **PRESENT** (`eas.json`, projectId set) |

**Classification:** `EXPO` / `REACT_NATIVE` (managed) — **not** a responsive website.

## Bundle / display identity

| Field | Value | Status |
|-------|--------|--------|
| Expo name | `Opal` | PARTIAL — should be **Opal Graph** for Brand V4 |
| iOS bundleIdentifier | `local.opal.mobile` | **development/internal** — not production candidate |
| Android package | `local.opal.mobile` | **development/internal** |
| Owner (EAS) | `sadeil` | record only |
| Contacts permission | declared | R1B must **not** request contacts for shell proof |

`IOS_BUNDLE_ID_STATUS` = `DEVELOPMENT_LOCAL`  
`ANDROID_APPLICATION_ID_STATUS` = `DEVELOPMENT_LOCAL`  
Production IDs → **FOUNDER_ACTION_REQUIRED** (Apple/Google account + non-`local.*` IDs).

## Owner classification

| Owner | Path | Class |
|-------|------|--------|
| Expo app entry | `App.tsx` | **CURRENT_REUSABLE** (session restore shell) |
| Activation | `screens/ActivationScreen.tsx` | **PARTIAL** — wired to product API but synthetic-oriented defaults |
| Product session + SecureStore | `api/productSession.ts` | **CURRENT_REUSABLE** — expo-secure-store; server validate on restore |
| Secure identity (dev) | `storage/secureIdentity.ts` | **STALE / DO_NOT_USE** for R1B product auth |
| Phoenix helper | `realtime/opalSocket.ts` | **STALE** — uses `user_id` connect params; R1A requires **socket_ticket** |
| AppShell + Home/Chats/Plans/You | `shell/*`, `screens/*` | **STALE_NATIVE_DUPLICATE** vs current web Brand V4 / frozen P2–P3 product |
| Social Flow SF18 modules | `socialFlow/*` | **PARTIAL / PROOF_ONLY** — not current product authority |
| SQLite message repo | `storage/messageRepository.ts` | **PROOF_ONLY** — not SoT (Postgres is) |
| EAS profiles | `eas.json` | **CURRENT_REUSABLE** for internal RC |
| Release torture harness | `release/*` | **PROOF_ONLY** |
| Web product | `apps/opal_web` | **CURRENT PRODUCT AUTHORITY** (Brand V4, P2/P3 frozen) |

## Auth integration state

- Challenges: `POST /api/v1/product/activation/challenges` — **missing `otp_consent_accepted`** in mobile client (blocks production_sms).
- Verify: product verify with `include_bearer` — reusable.
- Restore: load SecureStore → `GET /session` → clear if revoked — **CORRECT pattern**.
- Sign-out: `DELETE /session` + clear SecureStore — **CORRECT pattern**.
- Default UI still hints synthetic / fixture numbers — **must remove for R1B physical path**.

## Secure storage state

- **expo-secure-store** used for access token + user metadata.
- Fallback to in-memory Map when SecureStore unavailable (tests) — OK for Jest; **device must use SecureStore**.
- Not AsyncStorage for tokens — **GOOD**.

## Phoenix connectivity state

- Present but **pre-R1A**: connects with `user_id` / `device_id` query params.
- Must move to **socket-ticket** flow matching web `RealtimeClient`.

## Product parity risk (critical)

Native AppShell navigation (`Home · Chats · Plans · You`) is **not** the current Opal Graph dock / Calls Continuity / Global Opal authority.

Declaring those RN screens “current Opal” would create **WEB OPAL vs MOBILE OPAL**.

**Forbidden.** Treat as `STALE_NATIVE_DUPLICATE`.

## Physical devices / builds

- EAS `development` / `internal_rc` profiles exist.
- No in-repo claim of last successful physical install on this HEAD.
- Simulator ≠ physical device (anti-hallucination lock).

## Bottom line for strategy

Reuse Expo + SecureStore + activation/session spine.  
Do **not** promote stale RN product screens.  
Host **current** `opal_web` product authority inside native after auth (see strategy doc).
