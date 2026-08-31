# B4 — Finite Create state inventory

Figma file `fy69K8cCug9prf5GLwQ7Hy` · root `618:2` · Section 07 Create · Section 08 `866:3` lists `863:284` / `863:338`.

| # | State | Authority | Classification | B4 treatment |
|---|-------|-----------|----------------|--------------|
| 1 | Create entry | `863:284` | EXPLICIT_FIGMA | Formal parity |
| 2 | Camera choice | `863:284` Camera control | EXPLICIT_FIGMA + DEPENDENCY | Real `<input capture>`; truthful note if unsupported |
| 3 | Library choice | `863:284` Library control | EXPLICIT_FIGMA + DEPENDENCY | Real file picker |
| 4 | Permission request | OS/browser | DEPENDENCY | System owns dialog; no custom fake result |
| 5 | Camera permitted | after capture | DERIVABLE_FROM_APPROVED_OWNER | Preview → compose (`863:338`) |
| 6 | Camera unavailable / denied | — | DERIVABLE + ANNOTATED | Concise status + Use Library |
| 7 | Library permitted | after pick | DERIVABLE | Preview → compose |
| 8 | Library unavailable / cancel | — | DERIVABLE | Stay on `863:284`; no mutation |
| 9 | Selected media preview | `863:338` media | EXPLICIT_FIGMA | Continuity required |
| 10 | Replace media | Photo/video control `863:364` | EXPLICIT_FIGMA | Re-open library/camera; stay in Create owner |
| 11 | Cancel / back | `‹` | EXPLICIT_FIGMA | Back from compose→choose; choose→close; no draft Graph |
| 12 | Add to Graph | `863:338` CTA | EXPLICIT_FIGMA | Real `onCreated` → existing `createdGraphs` owner |
| 13 | Add success | navigate Graphs | DERIVABLE_FROM_APPROVED_OWNER | Existing OpalApp path |
| 14 | Loading | — | MICROSTATE `904:15` | Quiet; no fake % |
| 15 | Failure / recovery | — | DERIVABLE | Unsupported type / read fail notes |
| 16 | Unsupported browser | — | DEPENDENCY | Honest camera/library messaging |
| 17 | Return to context | dock Graphs | EXPLICIT_FIGMA (dock on both) | Preserve Graphs tab |
| 18 | Safe-area / dock | dock y758 | EXPLICIT_FIGMA | Rest dock, Graphs active |

**No invented destinations.** Recent grid on `863:284` is empty placeholder tiles in current Figma (not an in-product gallery browser).

## Hit / control map (863:284)

| Control | Class |
|---------|-------|
| Back ‹ | ACTIVE |
| Title Create / lede | INFO |
| Hero + / copy | INFO |
| Camera | ACTIVE → DEPENDENCY (capture input) |
| Library | ACTIVE → DEPENDENCY (file input) |
| Recent tiles (empty) | INFO / CONDITIONAL (no media yet) |
| Hint | INFO |
| Dock | ACTIVE (shell) |

## Hit / control map (863:338)

| Control | Class |
|---------|-------|
| Back ‹ | ACTIVE |
| Title | INFO |
| Media | INFO |
| GRAPH pill | INFO |
| Photo / video | ACTIVE (replace) |
| Title / when / caption | ACTIVE (editable fields matching Figma paint) |
| Close circle | INFO (selected audience) |
| Join requests | ACTIVE |
| Exact spot after join | ACTIVE |
| Add to graph | ACTIVE (mutation) |
| Footer | INFO |
| Dock | ACTIVE (shell) |

## Asset provenance

| Asset | Path | Source | SHA-256 (prefix) | Use |
|-------|------|--------|------------------|-----|
| Add media | `/figma-v2/create/add-to-graph-media-863-338.jpg` | Figma MCP `863:341` fill | `b42d60d8…` | Formal `863:338` + library proof fixture |
| Dock art | existing `/figma-v2/dock/*` | Approved Option B | (existing) | Shell |

**CAMERA_CAPABILITY = SYSTEM_DEPENDENCY** (browser capture input; headless may be UNSUPPORTED — report honestly).  
**LIBRARY_CAPABILITY = REAL** (system file picker).
