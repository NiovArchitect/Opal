# DOCK CLEARANCE SYSTEM

**Date:** 2026-08-20  
**P0 global layout primitive**

## Formula

```
--dock-clearance =
  --dock-overlap (86)
  + --dock-offset (18)
  + --dock-breath (48)
  + env(safe-area-inset-bottom)
```

Applied via:

* CSS variables on `:root`
* `.app[data-member-nav="true"]` scroll regions
* destination sheets already using `var(--dock-clearance)`

## Automated proof

`scripts/dock_occlusion_proof.mjs` → `DOCK_OCCLUSION_PROOF.json`

| Surface | Result |
| --- | --- |
| HOME | PASS |
| MEMORY_DETAIL | PASS |
| CHATS | PASS |
| GRAPHS | PASS |
| YOU | PASS |

**5/5 PASS**
