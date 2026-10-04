# M-03 Past-as-present threads — REPORT

**SHA:** working tree on `d2de143` base (uncommitted)  
**Root cause:** Past/future *state* already branched, but plan `when_label` stayed absolute calendar ("Tuesday · Sep 29…") so past plans still read as present. Past chrome also used washed neutrals instead of taxonomy slate `#94A1B8`.

## Fix (display only)
- `formatPastPlanWhen` — Yesterday / Last {weekday} / N days ago / short date (never bare upcoming "Tuesday" / "in N days")
- `planConsequenceLabel` past path uses canonical_start_at → relative voice
- Chats + Graphs + Graph detail canonical when for past → relative; future Ready path unchanged
- CSS past consequence / status / pill / kicker → `#94A1B8`; removed past opacity wash (B-05)

## Files
- `apps/opal_web/src/opalUi/historyTime.ts` (+ test)
- `apps/opal_web/src/opalUi/nextPlan.ts` (+ test)
- `apps/opal_web/src/opalUi/graphReality.ts`
- `apps/opal_web/src/OpalApp.tsx`
- `apps/opal_web/src/styles.css` (color only on past tokens)

## Verify
- Chats past consequence: `Earlier together · Last Tuesday · 8:00 PM` @ `rgb(148,161,184)` (`M03_MEASURE.json`)
- Graphs Past card: when `Last Tuesday · 8:00 PM`, pill Past, color slate, **opacity 1**
- Graphs Ready: `Tonight · 7:30 PM · Chanelle` unchanged absolute voice
- Unit: historyTime + nextPlan 17/17 pass
- C-01: past CSS hexes are `#94A1B8` only

## Evidence
`shots/m03/` — chats/graphs past + ready after PNGs + measure JSON
