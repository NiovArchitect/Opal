# PR #65 — Engineering gate status

**Head under review:** `1a28892` (format fix on top of `fba358a`)  
**Branch:** `build/relationship-availability-alignment`  
**Draft PR:** #65  
**Date:** 2026-08-09  

## CI (GitHub Actions)

| Check | `fba358a` | `1a28892` |
|-------|-----------|-----------|
| Contracts + Python | SUCCESS | **SUCCESS** |
| Elixir core | FAIL (format) | **SUCCESS** |
| Docker build | SUCCESS | **SUCCESS** |
| Mobile shell | SUCCESS | **SUCCESS** |
| Public web | SUCCESS | **SUCCESS** |

All 10 checks green on `1a28892`.

## Local validation matrix (this machine)

| Gate | Result |
|------|--------|
| `mix format --check-formatted` | PASS after format |
| `mix credo --strict` | PASS (0 issues) |
| Full `opal_core` tests | **320 / 0** |
| Availability-focused + Real People suite | **40 / 0** |
| Web `tsc --noEmit` | PASS |
| Web `vitest run` | **76 / 0** |
| Mobile `tsc` | PASS |
| Mobile jest | **75 / 0** (17 suites) |
| Docker | CI SUCCESS (not re-run locally this pass) |

## Real People regression

PASS via:

- `real_people_two_user_set_journey_test.exs`
- `set_authority_p0_test.exs`
- `private_participation_non_leak_test.exs`

Availability optional: zero-row conversation still valid (`availability_alignment_test`).

## Availability journey

PASS (HTTP two-user journey + domain matrix + Set isolation):

- private windows, peer cannot list
- intentional share, shared-safe only
- overlap
- revoke / delete / block
- **no auto-Set**; message agreement still reaches Set

## Privacy

| Surface | Proof |
|---------|--------|
| Peer HTTP shared list | `shared_safe` ranges only; assert_shared_safe! |
| Peer WS | `availability:shared` projection only (tested) |
| Private Guidance | Client-only strip; no peer endpoint; not in shared history |
| Logs | No Logger of private windows in Availability domain |
| Outsider | 403 / `:not_a_member` |

## Realtime

PASS: share/revoke broadcasts shared-safe; clients refetch overlap on event (no private dump).

## Temporary sharing readiness (founder future)

| Need | Classification |
|------|----------------|
| Share this time only / this conversation | **READY** — share is already per-window, per-conversation |
| Share until tomorrow | **SMALL EXTENSION** — `availability_windows.expires_at` exists; **share-level** `expires_at` missing (window expiry soft-deletes all shares of that window) |
| Share for this plan only | **SMALL EXTENSION** — optional nullable `proposal_key` / `purpose` on `availability_shares` |
| Keep rest private | **READY** — selective window share is default model |

**Not an architectural problem.** Do not overbuild now.

## Motion implementation truth (no redesign)

| Element | Property | Duration | Trigger | Loop? | Rest | Reduced motion |
|---------|----------|----------|---------|-------|------|----------------|
| Journey Edge `.opal-edge` | `box-shadow` via `opal-edge-enter` | 280ms | Actionable journey state (plan_forming/open_loop/overlap) | **No** | Static elevated glow | animation none |
| Overlap moment `.moment-enter` | opacity + translateY | 220ms | Mount when `overlap_found` | **No** | Static chip | animation none |
| Overlap refraction `::after` | gradient translate | 500ms @ +60ms | Overlap enter only | **No** (count 1) | Gone | animation none |
| Private guidance | same enter keyframes | 220ms | Mount when private copy present | **No** | Static violet card | animation none |
| Context chip | none | — | Label non-null | — | Static | — |
| Relationship Pulse | flag **false** | — | not production | — | — | — |

## Copy provenance (review flow)

| Phrase | Class |
|--------|--------|
| Becoming a plan / Still open / Set | STATIC or BACKEND signal label |
| One time works for both of you. / N times… | BACKEND-DERIVED (`overlap.label`) |
| Thursday, 6:30–9:00 PM | CONTEXTUAL formatted from real `display_*` |
| Find a time / See that time / N times could work | STATIC PRODUCT (context chip) |
| Want a couple ideas? / Share a couple times… | PRIVATE GUIDANCE |
| …works for me — does that work for you? | HUMAN DRAFT (composer prefill) |
| This could work / A couple options fit | CONTEXTUAL STATE COPY (vibe helpers; review surfaces) |

## Attention / clutter

Hierarchy intended:

1. quiet  
2. Edge (journey bar)  
3. Context chip (composer)  
4. Expanded moment (thread)  
5. Private guidance (owner strip)  
6. Set (journey only)

Overlap + private + chip can coexist after share (owner assistance). Sheet open suppresses Edge-as-action noise via `findTimeOpen`. **Not fixed further during Claude review** — note for visual judgment.

## Accessibility (static audit)

| Item | State |
|------|--------|
| Journey chip as button when interactive | aria-haspopup, full aria-label |
| Touch targets 44px on share/remove | sheet actions min-height 44 |
| Private vs shared | color + explicit “Only you can see this” text |
| Set vs overlap | different labels + emerald vs cyan/violet |
| Reduced motion | CSS media disables Edge/enter/refraction |
| Sheet | dialog, modal, labelled title, Close |

Keyboard focus-trap on sheet: inherits FindPeople pattern; not re-audited with aXe this pass.

## Performance (static)

| Concern | State |
|---------|--------|
| Phoenix handlers | one join; availability:shared/revoked → single overlap GET |
| No infinite loops | animations one-shot or none |
| Pulse | disabled |
| Sheet | local state only |

## Claude review files

Pending local presence of:

- `docs/reviews/CLAUDE_PR65_UI_GRAMMAR_REVIEW.md`
- `docs/coordination/CLAUDE_TO_GROK_PR65_UI_REVIEW.md`

## Founder review

Local URL after `npm run dev` in `apps/opal_web`:

```text
http://127.0.0.1:5173/?review=availability
```

15s path: quiet → Edge → Find a time → private violet → share → overlap → expand → still-open vibe → Set → group → reduced-motion note.

## MERGE

**HOLD** — draft; await CI green post-format, Claude review, founder visual.
