# R1B Native Authority Strategy

**Date:** 2026-09-08  
**Chosen strategy:** **SHARED PRODUCT AUTHORITY + NATIVE HOST**  
**(Expo secure shell + WebView product surface)**

## Options evaluated

| Option | Verdict |
|--------|---------|
| 1. Shared RN product code + native host | Rejected for R1B — would require re-implementing Brand V4 / frozen P2–P3 in RN → second product risk |
| 2. Web product inside secure native container | **SELECTED** for product surface |
| 3. Shared domain / separate native renderer | Deferred — R2-scale UI port; not R1B |
| 4. Keep stale AppShell as “Opal” | **FORBIDDEN** — STALE_NATIVE_DUPLICATE |

## Decision

```text
EXPO NATIVE HOST
  owns: installability, SecureStore session, lifecycle, permissions spine,
        R1A activation UI, logout/revoke, deep-link scaffold, EAS internal build

CURRENT opal_web PRODUCT
  owns: Home / Chats / Calls / Graphs / Global Opal / Brand V4 / frozen P2–P3
  rendered post-auth in a WebView pointed at the real product URL/build

SERVER
  remains SoT for identity, session, Phoenix ticket, Graph, decisions
```

## Why this minimizes divergence

- One visual/behavioral authority: **current web product**.
- Native does not redesign Calls Continuity or signal/motion grammar.
- Secure storage and process kill/relaunch are **real native** (not “mobile-sized browser alone”).
- Phoenix auth uses the same R1A ticket model; WebView loads product that already speaks it once session is injected/validated.
- Stale RN Home/Chats/Plans/You remain in tree but are **not** the authenticated product surface.

## What is still “native enough” (anti-wrap-victory)

R1B is **not** “open Safari to localhost.” Closure requires:

1. Installable Expo/EAS artifact on a **real device** (or honest BLOCKED if founder device/signing missing)
2. SecureStore credential write/read/clear
3. Server validation on restore; revoke wins
4. R1A production_sms path (no synthetic OTP)
5. Native lifecycle survival (background/foreground/kill)
6. Phoenix auth with real session (ticket), revoked denied
7. Product shown is current Opal — not SF18 shell

## Non-goals (held)

R3 · TURN · video · push · contacts upload · Continuity hydration · ringing timeout · store submit · merge/live · second auth system · `local.*` as production App Store identity without founder GO.
