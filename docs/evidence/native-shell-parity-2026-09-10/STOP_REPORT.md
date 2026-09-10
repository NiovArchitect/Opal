# STOP — POST-R1B NATIVE SHELL + SOLO OPAL

**Date:** 2026-09-10  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `5743831`  

## R1B_COMPLETE

**YES** — not reopened. Shell/CSS/Solo changes do not alter SecureStore / Twilio / socket_ticket contracts.

## XCODE

| Field | Value |
|-------|-------|
| Version | 15.2 (15C500b) |
| Physical device | **Not attached** (xctrace: Mac only; devicectl: none) |
| Device OS | unknown this session |
| Native debugging supported | Limited — no device |
| View-hierarchy proof | Code + Playwright metrics (`logs/NATIVE_HIERARCHY.md`) |
| Limitation | No sim runtimes; no USB iPhone; cannot capture physical screenshots this session |

## NATIVE SHELL ROOT CAUSE

| | |
|--|--|
| **Cause** | Web `.app { max-width: 390px; margin: 0 auto }` letterboxes inside full-bleed WKWebView on phones wider than 390 |
| **Owner** | `apps/opal_web/src/styles.css` (+ desktop `@media min-width:520` card chrome) |
| **Why nested** | 20px gutters each side at 430px width; body background visible around Opal stage |
| **Fix** | `html.opal-native-host` forces `max-width:none`, full width/height, no radius/shadow; class set in `main.tsx` + WebView inject |
| **Files** | `styles.css`, `main.tsx`, `NativeFirstRunSurface.tsx`, `ProductWebSurface.tsx` |

Proven: before `{x:20,w:390}` → after `{x:0,w:430}` at 430×932.

## PHYSICAL APP SCREENSHOTS

**BLOCKED** — device not connected. Proxy web captures listed under Evidence.

## SOLO OPAL

| | |
|--|--|
| Figma 1075:644 founder approved | **YES** (directive + label rename attempted) |
| Runtime owner | `OpalAmbient` `participantMode="solo"` |
| Participant context | SELF ONLY · People chip = `Solo` · no fake “18” |
| Immediate value | Default prompt “I’ve got two hours…” · Nearby resolve still `scope_type:solo` |
| No invite prerequisite | Center Opal defaults to Solo |
| No fake social data | Solo context chips avoid fabricated friend counts |
| Status | **PARTIAL** (code GREEN; physical screenshot pending) |

## META MUSE

Competitor recorded as **Meta Muse** in `OPAL_MUSE_RESPONSE_2026-09-08.md`. Breadth race rejected. Relationship-intelligence moat preserved. No connector marketplace.

## TESTS

```
apps/opal_web: vitest soloOpal1075 + waveBGlobalOpalExact → 6 passed
apps/opal_mobile: jest r1bNativeHost → 5 passed
```

## FINAL GATES

```text
R1B_COMPLETE = YES
NATIVE_SHELL_PHYSICAL_PARITY = PARTIAL  (web metric GREEN; physical BLOCKED)
AUTH_VISUAL_PARITY = PARTIAL
SOLO_OPAL_IMPLEMENTED = PARTIAL→YES code / physical pending
SOLO_ZERO_NETWORK_VALUE = YES (architecture)
MUSE_RESPONSE_RECONCILED = YES
STORE_READY = NO
R2 = NO · R3 = NO · TURN = NO · PUSH = NO · PROD_LIVE = NO
```

## NEXT CONTROLLED SQUARE

Reconnect physical iPhone → Metro reload → capture full-screen device shots for shell + Solo → promote `NATIVE_SHELL_PHYSICAL_PARITY` / `SOLO` to GREEN if edges match.

## STOP
