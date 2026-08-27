# P1 Visual Closure

**Branch:** `build/v2-coded-experience-closure`  
**Date:** 2026-08-13  
**Scope:** Copy compression · Home dedupe · single place CTA · filament dedupe only.

## Root causes

| P1 | Root cause |
|----|------------|
| **A Copy** | `formatClockAmPm` returned full freeform `"Thursday · 6:30 PM"` as the clock field; Home composed `Thu ·` + that string → double day |
| **B Home dups** | Seed used `Date.now()` invitation keys → new Jordan/Maya dyads every run; Home listed one presence per conversation_id |
| **C Dual CTA** | `ContextChip` (gap chip) + `journey-cta-row` both labeled `Choose a place` when `next_gap=place` |
| **D Filaments** | Durable chronology + recompute both emitted same-dimension labels; interleave rendered every moment |

## Fixes

| Area | Change |
|------|--------|
| `composeHumanReality.ts` | Clock extraction returns clock only; short/long day collision; `isRedundantFilamentLabel` |
| `sharedReality.ts` | `strongestPerHomePresence` by peer/group key |
| `OpalApp.tsx` | Home uses peer grouping; awaken compressed; dual CTA eliminated; filament collapse |
| `founder_review_seed.mjs` | Reuse Maya/Jordan dyads + Friends group; stable invite keys |

## Tests

40 unit tests PASS (compose + sharedReality + grammar + liveJourneyProof)

## Live

- Mid-pass clean place-open: **20/20**
- After heavy reuse/reopen on long Jordan thread: **18/20** (next_gap drifted to `confirm_required_person` — seed episode quality residual, not dual-CTA regression)

## Brand

93:5/7/9 still empty — no brand work.
