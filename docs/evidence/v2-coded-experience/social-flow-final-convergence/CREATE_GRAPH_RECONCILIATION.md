# Create Graph reconciliation

**HOLD. DO NOT MERGE.**

## Correction (accepted)

Customer-facing Create Graph must **not** dump into FindTime/planner as the primary UX.

## Approved journey

```
GRAPHS-00
→ Create Graph
→ Figma 149:31  Choose photo / video
→ Figma 145:216 Add to your Graph
→ authoritative Graph creation
→ Graphs / Home / Profile return
```

## Runtime proof

| Step | Component | Status |
|------|-----------|--------|
| Create button | `GraphsHome` `data-testid="graphs-create"` | Opens `GraphCreateFlow` via `setGraphCreateOpen(true)` |
| Exact click destination | `GraphCreateFlow` | **Not** `AvailabilitySheet` / FindTime |
| 149:31 | `step=choose_media` · `data-figma-create="149:31"` · `graph-create-choose-media` | Implemented (library ACTIVE; camera DEPENDENCY on web) |
| 145:216 | `step=compose` · `data-figma-create="145:216"` · `graph-create-compose` | Implemented |
| Time intelligence | `AvailabilitySheet` / FindTime owners | Reusable **under** create when WHEN unresolved — not primary create route |
| Known WHO/WHERE/WHEN | `knownWho` / `knownWhere` / `knownWhen` props | Survive entry; Plan-from-direct seeds WHO |
| Permanent + dock | `data-create-dock="deferred"` | **Absent** |

## Distinction (critical)

| Layer | Behavior |
|-------|----------|
| UI / customer journey | Approved Graph creation (149:31 → 145:216) |
| Intelligence | Reuse existing availability / time-resolution owners |

Do not create a second create engine. Do not delete useful FindTime intelligence. Do not expose old planning UX as the primary create experience.
