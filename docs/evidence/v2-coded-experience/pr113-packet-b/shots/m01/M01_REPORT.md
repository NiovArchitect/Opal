# M-01 Home feed load/scroll — REPORT

**SHA:** HEAD/FE/BE `d2de143` (pre-commit working tree for M-02/M-03; M-01 needs no code change)  
**Root cause:** Not a scroll-triggered load. Cold-load diagnosis: N0 == N1 with fixture and production owners; below-stories cards visible without scrolling. Founder-reported emptiness was consistent with pre-H-01 seed vanish / misread empty fold — H-01 persist + current compose path already load the first page on mount.

## Diagnosis
| Path | N0 cards | N0 visible below stories | N1 after scroll | Mode |
|---|---|---|---|---|
| founder seed URL | 29 | 2+ | 29 | FOUNDER_FIXTURE |
| persist-only cold | 29 | 2+ | 29 | FOUNDER_FIXTURE |
| seed off production | 22 | 2+ | 22 | PRODUCTION_HYDRATION |

Case: **N0 == N1 > 0** (not a/b/c failure). First card (~Chanelle) sits immediately under stories (~top 218 with storiesBottom ~192). opacity/visibility/transform clean.

## Verify 3/3 cold loads
See `M01_VERIFY_3x.json` — allPass true (N0visible>0 && N0==N1 each run).

## Files changed
None for M-01.

## Evidence
`shots/m01/` — diagnose, paths, verify run1–3 N0/N1 PNGs.
