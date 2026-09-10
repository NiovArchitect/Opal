# STOP — PHYSICAL CHROME FINAL CONVERGENCE + CENTER V2 BEHAVIOR

**Date:** 2026-09-10  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `e794396`

## PART A — Physical chrome

| Gate | Result |
|------|--------|
| GLOBAL_DOCK_COMPONENT | **GREEN** — single `.tabbar.tabbar-option-b` / 1114:2 |
| HOME_DOCK_REFERENCE | **GREEN** — founder-validated compact float |
| CHATS/CALLS/GRAPHS/YOU/CENTER_DOCK_PARITY | **GREEN** — cross-route proof identical L/W/H/bottom |
| CALLS_SEMANTIC_FILTER_COLORS | **GREEN** — Chats Cyan, Calls Violet, All Cyan, Missed Coral |
| GRAPHS_SEMANTIC_FILTER_COLORS | **GREEN** — All Cyan, Action Coral, Ready Gold |
| CALLS/GRAPHS_STICKY_VISUAL_COHERENCE | **GREEN** (code) — same-plane `rgba(7,16,28,0.74)` + fade, not giant card |
| GRAPH_SAFE_TOP_DOUBLE_COUNT | **0** — sticky owns safe-top; page `padding-top: 0` |
| CONTENT_BEHIND_DOCK | **0** |

**Figma layering:** Center content `1094:*` / `1105:*` approved; embedded 92pt dock subframes **stale** — shared dock = **1114:2** only.

**Calls rows:** unchanged (no content simplification).

## PART B — Center V2 Behavior Convergence (not R2/R3)

| Capability | Status |
|------------|--------|
| `resolveDecision` wired from Solo Center | **YES** |
| `idempotency_key` on resolve | **YES** |
| Stale-async guard (`requestGen`) | **YES** |
| Accept double-tap lock | **YES** |
| Claim provenance surface | **YES** (source tagged; no fabricated distance/traffic) |
| Durable Graph seed on accept | **PARTIAL** — `onSeedGraph` path; full Graph write/Material Time deepen next |
| Medium/Low question UI | **NO** this square (High path + honest empty) |
| ACTION_PLANE_REAL_VERTICAL | **NO** unless separately proven |

## Proofs

```text
31 tests passed
GEOMETRY_PROOF = GREEN
DOCK_CROSS_ROUTE_PARITY = GREEN
```

## Flags

```text
R1A_COMPLETE = YES
R1B_COMPLETE = YES
P4_COMPLETE = YES
OPAL_CENTER_V2_FOUNDER_APPROVED = YES
OPAL_CENTER_V2_IMPLEMENTED = PARTIAL
STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = HOLD FOR FOUNDER
```
