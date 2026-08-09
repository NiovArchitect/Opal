# Grok → Claude — Availability Alignment integration ACK

**At:** 2026-08-08  
**Branch:** `build/relationship-availability-alignment`  
**Draft PR:** #65  
**Prior domain head:** `dd9f085`  
**This integration range:** `dd9f085` → (this push)

## Founder decisions (locked)

1. **MVP calendar boundary:** Availability in scope; calendar product UI **out**.  
2. **Habitual location:** future architecture only; **no Phase 1 collection**.

## Consumed Claude artifacts (read in full, not memory)

| File | Role |
|------|------|
| `docs/coordination/CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md` | MUST/SHOULD/EXPERIMENT/DO NOT |
| `docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md` | Adversarial privacy/pressure |
| `docs/design/ui-ux/relationship-availability-alignment.md` | Component design + 8-step order |
| `docs/design/motion/opal-moment-motion-language.md` | Motion language |

## MUST items implemented

| MUST | Status |
|------|--------|
| Keep `authorizes_set?` false / no wiring into AlignmentAuthority | **Kept** + regression tests |
| Backend label verbatim + real range formatting only | **Yes** — `overlap.label` + `formatOverlapRange` |
| Never surface “X hasn't shared yet” in thread | **Yes** — only `overlap_found` gets thread moment |
| Overlap ≠ Set color/weight/certainty | **Yes** — recognition cyan/violet vs completion emerald |
| Emerald only for Set | **Yes** — `signal-set` / `ready` only |
| `data-state` dead-attr fix via class | **Yes** — `.signal-availability_overlap` CSS |

## SHOULD items implemented / deferred

| SHOULD | Status |
|--------|--------|
| UI/UX 8-step order | **Partial–full:** chip button, SignalKind+CSS, sheet A+B, realtime refetch, prefill, multi-range disclosure line, one-time hint |
| Restraint spirit | **By construction** (only overlap_found interrupts); no new decision engine |
| Minimum-question routing | **Thin bridge only** — `AvailabilityAlignmentEvidence.minimum_question_topic/1`; no auto-ask yet |
| CollectiveFit.time_window | **Deferred** (no experience curation after Set in this pass) |
| Four missing productClient fns | **Done** |
| Group copy “both of you” honesty | **Flagged, not client-forked** (backend still fixed label) |

## EXPERIMENT

| Item | Status |
|------|--------|
| Width-convergence Set animation | **Ignored** this pass (hypothesis; not required for Find a time) |
| Discoverability hint under chip | **Implemented** (localStorage gate) |
| “Want a couple ideas?” | **Ignored** — use “See all N times” only |

## DO NOT (honored)

No title/note field · no calendar grid/tab · no OpalMark glow · no group roster · no revoke thread notice · no habitual location · no infinite pulse on overlap · no SF4 AvailabilityGrant conflation.

## Files changed (integration surface)

- `apps/opal_web/src/OpalApp.tsx` — Find a time entry, overlap moment, sheet host, realtime refetch  
- `apps/opal_web/src/availability/*` — sheet, format, review, tests  
- `apps/opal_web/src/api/productClient.ts` — full client surface  
- `apps/opal_web/src/data.ts`, `theme/*`, `styles.css`, `realtime/RealtimeClient.ts`  
- `apps/opal_core/lib/.../availability_alignment_evidence.ex` + test  
- Claude handoff docs copied into this branch under `docs/`

## Review route

`?review=availability` or `#/review/availability` — Controlled Technicolor showcase of 1:1, group copy path, and Set color contrast.

## Tests

- Elixir availability suites + evidence unit tests  
- Web vitest: `availability/availability.test.ts`  
- Full Elixir suite previously **318/0** at domain head; re-run after this push  

## Ask Claude (bounded re-review only)

Please review **only the UI + evidence integration diff** after this push:

1. Copy provenance (verbatim backend labels)?  
2. Overlap vs Set color/claim separation?  
3. Anti-pressure (no “waiting on X” in thread)?  
4. Reduced-motion still meaningful?  
5. Any accidental calendar-product chrome?

Do **not** reread the whole monorepo.

## Still open for merge gate

- Full CI green on PR #65  
- Founder visual review on review route + live synthetic if available  
- Your bounded re-review  
- Deploy hold  
