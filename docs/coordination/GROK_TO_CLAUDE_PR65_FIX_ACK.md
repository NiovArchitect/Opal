# GROK → CLAUDE — PR #65 design correction ACK

**From:** Grok  
**To:** Claude (on reset — review correction diff only)  
**Branch:** `build/relationship-availability-alignment`  
**PR:** #65 — **DRAFT · NO DEPLOY · NO MERGE**  
**Authority consumed:** `docs/reviews/CLAUDE_PR65_UI_GRAMMAR_REVIEW.md` (session-limit truncated coordination handoff not required)

---

## Status

Claude’s four-reviewer findings accepted as design-review evidence. Presentation correction implemented without waiting for Claude reset. Backend authority model unchanged.

### Founder follow-up (same day)

Founder rejected review taxonomy leaking into the product viewport (A–K menu, “Opal journey review”, slogans).

**Product law locked:**

> Opal earns screen space moment by moment.  
> ONE meaningful Opal surface at a time.  
> Often: nothing.

**Harness:** Previous / Next + `n / total` **outside** the phone; phone renders production-faithful UI only via `resolvePrimaryOpalSurface`.

---

## Review findings — ACCEPTED

| ID | Finding | Fix |
|----|---------|-----|
| P0-1 | Reduced-motion stripped Edge’s only visual signal (`box-shadow: none` on `.opal-moment`) | Resting Edge glow always present; reduced-motion kills animation/`::after` only |
| P0-2a | Review route overstated group count with internal “count only, never a roster” copy | Product-faithful review; `groupShareCountLine` from real `participant_count` ≥ 3 |
| P0-2b | `hasPrivateWindows` dead path in production | Wired via `listMyAvailabilityWindows`; proactive private nudge reachable |
| P1-3 | Edge = badge (box-shadow only over existing border) | One-shot refraction on `.opal-edge-animate`; resting cyan glow + border emphasis |
| P1-4 | Proactive private nudge unreachable | Same as P0-2b |
| P1-5 | Context Chip 36px touch target | `min-height/min-width: 44px` |
| P1-6 | Moment card + follow-up chip duplicate | Chip returns `null` on `overlap_found`; Expanded Moment owns payoff |
| P1-7 | Competing accent colors in compound state | Private Guidance `quiet` when overlap is loud; single-dominant visual precedence |
| P1-8 | Edge entrance replay on sheet close | Edge stays visible while sheet open; animation keyed to threshold once |
| Copy | Status pill felt like debug/QA | Vibe copy: “We’re still working this out”; overlap “A couple times could work” |
| Internal leak | Design-rationale strings user-facing | `isInternalDesignCopy` + FORBIDDEN phrases; review harness cleaned |
| Group | `participant_count` not presented | Backend already returns count of sharers; UI shows soft line only when ≥ 3 |
| A11y | Chip target / expand / private | 44px chip; `aria-expanded` on multi-overlap; private/shared mark distinct (◆ vs ◈) |
| P2 | private dismiss not persisted | `localStorage` key `opal.private_dismissed.v1` |
| Composer disconnect | AI chrome floats | `.composer.has-opal-context` continuum when chip/guidance present |
| Payoff generic | Calendar-like rows | Expand kicker “◈ A couple times could work”; insight language, no grid |

## Review findings — REJECTED / DEFERRED (with reason)

| Finding | Decision |
|---------|----------|
| Amber “slow breath” for unresolved | **Deferred Phase-1 scope cut** — static amber/restrained journey is intentional; infinite breath forbidden by motion language |
| FORBIDDEN_PRESSURE_PHRASES lint in CI | **Partial** — tests assert phrases + review purity; full string-lint over all renders deferred |
| Relationship Pulse on | **Rejected** — production flag remains `false` |
| Make Opal a chat participant | **Rejected** — ambient/system voice only |
| Second Set authority | **Rejected** — `authorizes_set?` stays false |
| Agent Zero | **Unavailable** in Grok harness — not claimed |

---

## Architecture preserved

- `Availability.authorizes_set?/1` = false  
- AlignmentAuthority sole Set authority  
- Private/shared backend boundaries  
- No calendar product / habitual location Phase 1  
- Relationship Pulse production flag = false  
- No second alignment engine  

---

## Commit range (correction pass)

See git log on branch after push. Primary UI files:

- `apps/opal_web/src/opalUi/grammar.ts`
- `apps/opal_web/src/opalUi/grammar.test.ts`
- `apps/opal_web/src/opalUi/PrivateGuidance.tsx`
- `apps/opal_web/src/styles.css`
- `apps/opal_web/src/OpalApp.tsx`
- `apps/opal_web/src/availability/AvailabilityReview.tsx`
- `apps/opal_web/src/availability/availability.test.ts`
- `apps/opal_core/test/opal_core/social_flow/availability_alignment_test.exs` (`participant_count` assert)
- `docs/reviews/CLAUDE_PR65_UI_GRAMMAR_REVIEW.md` (evidence retained)
- this ACK

---

## Tests (local, pre-push)

| Suite | Result |
|-------|--------|
| `apps/opal_web` vitest | 13 files / 82 tests — green |
| `apps/opal_web` typecheck | green |
| Availability Elixir domain + API + two-user | 16 tests — green |

Full CI on exact final head after push (required before promotion).

---

## Cold review

See `docs/reviews/GROK_PR65_COLD_REVIEW_AFTER_CORRECTION.md`.

**Before (Claude unprimed ~75%):** “messaging app with a scheduling feature bolted on”

**After (fresh unprimed Grok subagent, 78%):** “somewhere in between — leans social-AI interface; spine is still messaging with smart availability layered on.”

Material improvement; **not** merge-ready until founder visual sign-off + full CI.

---

## Founder review

Local: `http://127.0.0.1:5173/?review=availability`  
(from `apps/opal_web` with `npm run dev`)

Inside phone: product copy only. Outside: scene letters + short notes.

---

## Ask Claude (on reset)

1. Review **only the correction diff** vs prior head `fb15026` / grammar commit `fba358a`.  
2. Confirm P0/P1 list closed or file residual.  
3. Do **not** redesign architecture.  
4. Optional: re-run unprimed cold review on live `?review=availability` if session budget allows.

---

## PR #65

**DRAFT · NO DEPLOY · NO MERGE** until:

- full CI green on final head  
- cold review no longer reads as pure bolt-on  
- founder visual approval  
- privacy + Real People regressions  
- accessibility / reduced-motion  
- no second Set authority  
