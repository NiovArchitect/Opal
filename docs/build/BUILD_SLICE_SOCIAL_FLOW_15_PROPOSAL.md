# Build Slice Proposal: Social Flow 15

**Title:** Real User Activation Vertical (Synthetic Provider, Authoritative Paths, Client Wiring)  
**Status:** PROPOSAL ONLY. Not started. Not authorized to implement until founder confirms.  
**Depends on:** SF10 domain onboarding, SF1 messaging, SF9 trust/safety, SF14 product shell  
**Baseline HEAD at proposal:** `2f2c3e35a53dd6df87912d8312744bca7adde1e4`

---

## Problem

Live Opal is polished and seeded. Elixir already has synthetic verification, invitations, relationships, messages, and sessions under tests. There is **no product HTTP surface** and **no client path** that turns a first-time public user into a real (even synthetic-OTP) account with a friendship and chat.

## Goal

Prove the **first real relationship journey** end to end using:

- Existing `OpalCore.SocialFlow.Onboarding`  
- Existing `Messages` + `ConversationChannel`  
- Existing `TrustSafety` sessions/blocks  
- Bounded **synthetic SMS provider** (honest labeling; production SMS remains EXTERNALLY_BLOCKED)  
- Minimal **authenticated API + session** so clients stop using only DevAuth fixtures for this journey  
- Wire **opal_web** (and optionally mobile) from walkthrough → activation → invite → chat → one signal  

Preserve Lumen Lens UI quality. No architecture rewrite.

## Non-goals

- Production Twilio/SMS go-live  
- Full address-book harvest  
- Visual redesign of SF14  
- Public discovery / feeds  
- Replacing DevAuth fixtures for all internal tests overnight  
- Claiming production telecom readiness  

## Smallest vertical (ordered)

### A. Product docs already landed

- `docs/evidence/real-user-activation/CURRENT_STATE_TRUTH_MATRIX.md`  
- `docs/product/FOUNDER_DIRECTION_REAL_USER_ACTIVATION.md`  

### B. Session and HTTP product surface (Elixir)

1. Session token model usable by HTTP + socket (build on `DeviceSession` / session_ref).  
2. Routes under `/api/v1` (names illustrative):  
   - `POST /activation/verification/start`  
   - `POST /activation/verification/complete`  
   - `POST /activation/session/revoke` (sign-out)  
   - `POST /contacts/resolve`  
   - `POST /invitations`  
   - `GET /invitations/:id`  
   - `POST /invitations/:id/accept`  
   - `GET /me` (account + devices summary)  
3. Socket connect accepts **session_ref** (or equivalent) in addition to existing dev_user path when dev_auth enabled; production path uses session only.  
4. Never return raw phone in logs; keep digests.  
5. Synthetic provider responses labeled (`provider: synthetic`, not_legal_identity).  

### C. Public web wiring (preserve SF14 chrome)

1. After first-run: **Continue with phone** screen (Signal-level calm, Opal brand).  
2. Enter number → verify code (show synthetic code only in non-prod).  
3. Profile display name.  
4. Add someone (manual E.164 + label) → resolve → invite.  
5. Accept invite path (deep link or code).  
6. Chats list from **API/channel**, not `data.ts` seeds, when session present.  
7. Seed remains fallback only for logged-out marketing shell OR removed from primary path.  
8. Copy pass: remove em dashes per founder rule.  

### D. First signal (bounded)

1. After two-user dinner messages, use existing plan-extract / follow-through domain **or** deterministic server-side open-loop from message text for the vertical.  
2. Surface one chip: **Becoming a plan** in conversation + Home needs-you.  
3. Python optional; must degrade if down.  

### E. Proof required for closure

| Proof | Method |
|-------|--------|
| Two human accounts | Synthetic phones +1555… fixture numbers |
| Invitation accept | Creates relationship + conversation |
| Messages both ways | Persist + realtime |
| Restart | Session survives; revoke clears access |
| Block | Stops further messages |
| Isolation | Third user denied |
| Live honesty | UI labels synthetic verify when not production provider |
| CI | Full green |
| No secret leakage | Review |

### F. Explicit residual after SF15 (expected)

- Production SMS still EXTERNALLY_BLOCKED  
- Broad contact sync still absent  
- Mobile visual parity may lag web  
- Physical device matrix incomplete  

## Success definition

**SLICE CLOSED** only if:

- Static seed is not the primary authenticated journey on the exercised client  
- Two users complete invite → chat → one signal with **AUTHORITATIVE DOMAIN PATH**  
- Synthetic provider is labeled honestly  
- SF14 brand quality not regressed  

**IMPLEMENTATION COMPLETE BUT EXTERNALLY BLOCKED** if domain+clients work but founder withholds production SMS (acceptable for this slice if synthetic path is the authorized proof path).

## Agency ownership (when authorized)

| Agent | Scope |
|-------|-------|
| Agent Zero | Isolation, merge, CI, closure |
| Security / Privacy | Session tokens, rate limits, no enumeration, no raw phone logs |
| Backend Elixir | Routes, session, onboarding wiring |
| Frontend Web | Activation UI + chat binding |
| Mobile Architect | Parity plan; no RN Motion misuse |
| Test Architect | Two-user E2E + negative paths |
| UX / Brand | Signal-level calm; Lumen Lens; copy rules |

## Recommendation

Authorize **Social Flow 15** as this vertical only. Do not start SF16 (media, booking, feeds) in the same run.
