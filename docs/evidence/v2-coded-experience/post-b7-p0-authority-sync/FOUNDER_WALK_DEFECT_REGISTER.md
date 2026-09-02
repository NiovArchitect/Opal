# Founder-Walk Defect Register

**Pass:** POST-B7 P0 (authority sync — register only)  
**Product SHA at observation lineage:** `110ca3c`  
**B7 evidence HEAD:** `22d2a01`  
**Status vocabulary:** OBJECTIVE_DEFECT · FOUNDER_REVIEW · FUTURE_RESEARCH  
**Implementation:** NOT in P0. Target **POST-B7 P1** unless noted.

Do **not** rewrite B7 historical evidence. These defects were discovered **after** machine convergence / during founder walk observations.

---

## D1 — Outgoing call presents Incoming treatment

| Field | Value |
|-------|--------|
| **ID** | FW-D1 |
| **Class** | OBJECTIVE_DEFECT |
| **Severity** | High (state machine / trust) |
| **Observed** | User taps telephone intending to **place** a call; runtime shows Incoming (“… is calling” + Answer / Decline) while also stacking “Direct connection / Audio call” |
| **Law** | OUTGOING ≠ INCOMING. Answer/Decline only on `incoming_ringing`. See `CALLS_COMMUNICATION_CONTINUITY.md` |
| **Likely owners** | `apps/opal_web/src/opalUi/CallSurfaces.tsx` (`CallKind` currently `incoming\|audio\|video\|group`); call open routing from Person/Direct/Group; any mount that defaults to `kind="incoming"` |
| **Fix direction** | Explicit outgoing states (`outgoing_dialing` / `outgoing_ringing`); cancel/end affordance; never Answer on outgoing |
| **P0 action** | Documented only |
| **Target** | POST-B7 P1 |

## D2 — Overlapping call title/state copy

| Field | Value |
|-------|--------|
| **ID** | FW-D2 |
| **Class** | OBJECTIVE_DEFECT |
| **Severity** | Medium–High |
| **Observed** | Multiple call state labels paint simultaneously (e.g. Direct connection + Audio call over Incoming headline) |
| **Law** | Only state-relevant copy may render; no stacked old+new mounts |
| **Likely owners** | `CallSurfaces.tsx` conditional branches; CSS absolute layers; parent chrome left mounted |
| **Fix direction** | Single state owner; unmount inactive branches |
| **Target** | POST-B7 P1 (with D1) |

## D3 — Graph / timeline spine not centered under nodes

| Field | Value |
|-------|--------|
| **ID** | FW-D3 |
| **Class** | OBJECTIVE_DEFECT |
| **Severity** | Medium (visual authority) |
| **Observed** | Vertical spine off-center from dots and/or paints **on top of** node circles |
| **Law** | node center x == spine x; spine **behind** nodes; node body masks spine through center; match Figma (`618:161` Home Jordan; Graphs `618:674` timeline) |
| **Likely owners** | `styles.css` `.gsh-gr-timeline*` / `.graphs-timeline*`; any shared spine utility |
| **Fix direction** | Audit **all** shared timeline/spine implementations — not one screenshot patch |
| **Do not** | Change Figma to match the bug |
| **Target** | POST-B7 P1 |

## D4 — Destination stage pops off centered phone shell

| Field | Value |
|-------|--------|
| **ID** | FW-D4 |
| **Class** | OBJECTIVE_DEFECT |
| **Severity** | Medium |
| **Observed** | Some destinations (esp. Graph-related) appear offset from the established centered stage when opened |
| **Law** | Full viewport authority; 390×844 primary; opening must not shift stage sideways/vertically vs phone shell |
| **Likely owners** | App shell / stage CSS; fixed/absolute/portal/sheet mounts; Graph Detail / Journey / Call / Global Opal; responsive transforms |
| **Fix direction** | Mount/layout ownership — **not** screenshot scaling |
| **Target** | POST-B7 P1 |

## Non-defects (explicit)

| Item | Class | Note |
|------|-------|------|
| Activity icon `705:2` | FOUNDER_REVIEW | Destination works; icon judgment not an engineering RED |
| Camera Create | DEPENDENCY | Truthful capability classification |
| AV transport | DEPENDENCY | Do not fake WebRTC in P1 unless real |
| `928:3` / `965:2` / `975:2` proposals | FOUNDER_REVIEW | Not defects; not current |
| Live shopping | FUTURE_RESEARCH | Do not implement |

## Counts

```
OBJECTIVE_DEFECTS_REGISTERED = 4
FOUNDER_REVIEW_ITEMS = Activity icon (+ proposal boards elsewhere)
PRODUCT_FIXES_IN_P0 = 0
```
