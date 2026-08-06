# Walkthrough — Finish Gate

**Author:** Claude (independent) via Agency `design-ui-finish-gate-reviewer.md` + `design-brand-guardian.md` framework
**For:** Grok, before porting any of Pass A/B into production
**Last updated:** 2026-08-05

---

## Gate results, per proposed change

| Change | Source | Gate | Why |
|---|---|---|---|
| Booking-state chip copy fix (`plan` scene) | `BOOKING_STATE_COPY_PATCH_PROPOSAL.md` | **SHIP** | One line, no new component, fixes a live trust defect, already independently confirmed twice |
| `sr-only` Opal-attribution on `spark`/`follow` chips | Pass A §4 | **SHIP** | Zero visual risk, closes a real a11y/attribution gap, no new dependency |
| Join CTA escalation (`data-final`) | Pass A §3–4 | **SHIP** | CSS-only, isolated to screen 5, reuses existing tokens, no brand drift |
| Slow amber breath on `plan` chip | Pass B Stage 4 | **SHIP, with the period fix already noted** | Use ~5.5–6s period, not 3.2s, to avoid competing with the existing 4.5s `float` loop — Pass B flags this itself |
| Directional settle on `follow` chip | Pass B Stage 5 | **SHIP** | One-shot, no loop, correctly distinct from the breathing motif |
| Join bloom (one-shot) | Pass B Stage 6 | **SHIP** | Explicitly non-looping — passes the "not desperate" bar |
| Remove/reduce top-left mark on screens 2–4 | Pass A §4 | **SHIP, verify first** | Low risk, but confirm the dot-progress indicator alone still gives orientation before removing the mark — quick manual check, not a redesign |
| `OpalMark` → `OpalLockup` wordmark swap on screen 1 | Pass A §1a, §4 | **HOLD — sequence after Pass B Stage 1 lands** | This is the biggest single visual change in the package. Ship it choreographed (with the fragment-converge timing in Pass B), not as a static drop-in, or it'll read as a half-finished swap rather than a brand-arrival moment |
| Fragment-converge brand-arrival sequence (full Stage 1) | Pass B §1 | **NEEDS FOUNDER — new visual sequence, not a bugfix** | Everything else in this package is a fix to something already broken (missing attribution, missing wordmark, identical CTAs). This is new production motion work. Recommend founder sign-off before implementation time is spent, consistent with this handoff's standing rule not to build ahead of authorization |

## Anti-generic-UI check (finish-gate framework)

Nothing in this package introduces a dashboard, card grid, or generic empty state — out of scope for a 5-screen walkthrough. The one genuine risk flagged: shipping the `OpalLockup` swap *without* its choreography (i.e., skipping the HOLD above) would look like an unfinished asset swap, not a considered brand moment — exactly the "capable code, weak interface" failure this framework exists to catch. Sequence matters here more than any individual change.

## Brand-guardian check

All proposed colors/tokens are reused from `OPAL_SPECTRUM` and existing semantic-state mappings — no new hex values introduced anywhere in Pass A or B. No brand-consistency risk in the SHIP items.

## Net

Six of eight proposed changes are ready to port as-is (small, isolated, no new dependencies). One needs simple verification before removal. One (the full brand-arrival sequence) is real production effort and should go to the founder before Grok spends implementation time on it.
