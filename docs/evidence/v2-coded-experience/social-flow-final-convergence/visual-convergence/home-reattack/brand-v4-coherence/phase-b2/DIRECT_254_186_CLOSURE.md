# DIRECT 254:186 CLOSURE — Phase B.2 B2-04 (in progress / honest)

**HOLD · DO NOT MERGE**

## Before → After

| | |
|---|---|
| Before | **MAJOR_DIFF** — opened Direct not reliably capturable; often crashed ErrorBoundary |
| After (functional) | **Reliable open PASS** via production Chats → `member-conversation` `data-figma=254:186` |
| After (visual) | **MINOR_DIFF** candidate — Call/Video/Plan present; full Figma exactness not claimed |

## Root causes fixed

1. **Hooks crash on Direct open:** `useEffect` note timers lived *below* `if (authenticated && activeChat) return …`, so opening a thread rendered fewer hooks → `Rendered fewer hooks than expected` → ErrorBoundary (“Something interrupted Opal.”). Moved timers **above** the conversation branch.
2. **Call/Video hidden:** Figma requires Call/Video chrome. Now always shown, `data-mode="dependency"` when AV capability absent (truthful gate — no fake call UI).
3. **Chats empty refresh:** selecting Chats tab with empty list re-runs `refreshLive` (same production owner).

## Proof (founder URL `:5173`)

| Check | Result |
|---|---|
| conversation id | `chats-row-b1b3f9a7-…` → opened |
| composition | direct (`Second Friend`) |
| routed component | `member-conversation` + `data-figma=254:186` |
| Call / Video | present · `dependency` gated |
| Plan | present |
| Plan → WHO picker | **0** (whoAfterPlan=false) |
| pageErrors | 0 |

## Residuals (do not freeze as EXACT yet)

- Full Figma 254:186 geometry / Opal consequence plate / composer / typography Δ not exhaustively measured this slice.
- Quality ref 201:7 used for header chrome only.
- Visual still needs founder walk vs Figma screenshot before EXACT / freeze.

## Evidence

`DIRECT_OPEN_PROOF.json` · `runtime/DIRECT_254_186.png`

**Not yet `FROZEN_AFTER_PHASE_B2` as EXACT** — functional open + Plan WHO law green; visual exactness remains founder-reviewable **MINOR_DIFF**.
