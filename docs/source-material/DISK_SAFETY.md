# Disk Safety — Social Flow Context Foundation

**Date:** 2026-07-31  
**Phase:** Documentation only  

## Measurements (Opal repo)

| Metric | Before docs commit (approx) | After sources staged |
|--------|----------------------------|----------------------|
| Free space (volume) | ~31–32 GiB available | unchanged material order |
| Repo working tree | ~585–586 MiB | +~0.66 MiB originals |
| `.git` | ~1.7 MiB (pre-commit) | grows modestly with commit |

## Added payload

| File | Size |
|------|-----:|
| NIOV-Social-Flow-Calendar.md | 131 724 B |
| Opal-Commercial-The-AI-That-Moves-Like-You.pdf | 117 664 B |
| Opal-Developer-Docs.pdf | 130 624 B |
| Opal-MVP-Development-Roadmap.docx | 280 827 B |
| **Total originals** | **~661 KB** |

No LFS. No home-directory scan. No `node_modules` / `_build` / caches copied.

## Source origin

```text
/Users/genghishameha/Desktop/NIOV Labs/Opal/
```

Only the four founder documents above were copied into:

```text
docs/source-material/original/
```

## Cleanup

None required beyond normal git hygiene. No temporary multi-GB worktrees.
