# Native Shell Parity Matrix — 2026-09-10

**Physical device screenshots:** BLOCKED (iPhone not attached to this Mac; xctrace/devicectl empty).  
**Proxy evidence:** Playwright WebView-equivalent at 430×932 with `opal_native_host=1`.

| Surface | Figma | Before (430) | After (430) | Status | Residual |
|---------|-------|--------------|-------------|--------|----------|
| Shell systemic | 1075:2 | gutters x=20 w=390 | x=0 w=430 | **GREEN** (web host) | Physical confirm pending |
| Splash | 618:19 | letterboxed | edge-to-edge | PARTIAL | Physical + exact paint |
| Phone | 773:27 | — | — | PARTIAL | Needs physical auth walk |
| OTP | 773:52 | — | — | PARTIAL | Needs physical auth walk |
| Home | 618:44 | letterboxed seed | edge seed | PARTIAL | Physical |
| Chats | 618:271 | — | — | BLOCKED | No physical session capture |
| Direct | 618:348 | — | — | BLOCKED | |
| Search | 618:2299 | — | — | BLOCKED | |
| Graphs | 618:674 | — | — | BLOCKED | |
| Graph Detail | 618:758 | — | — | BLOCKED | |
| Global Opal | 618:902 | — | — | PARTIAL | Mode still available via `?opal_global_opal=1` |
| Solo Opal | 1075:644 | n/a | implemented additive | PARTIAL | Physical screenshot pending |
| Person | 618:1257 | — | — | BLOCKED | |
| You | 618:1344 | — | — | BLOCKED | |
| Calls | 618:581+ | — | — | BLOCKED | |

## Metrics

**Before** (`metrics/before-430.json`): viewport 430×932 · `.app` x=20 w=390 max-width=390px  
**After** (`metrics/after-430.json`): viewport 430×932 · `.app` x=0 w=430 max-width=none · `html.opal-native-host`
