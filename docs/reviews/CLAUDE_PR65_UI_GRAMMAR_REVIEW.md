# Claude — Bounded Re-Review, PR #65 (Opal UI Grammar + Availability Experience)

**Author:** Claude (independent), remote controller mode
**Reviewed against:** `origin/build/relationship-availability-alignment` @ `fba358a` (grammar integration diff `83829a6..fba358a`; branch tip `fb15026` is a CI-formatting-only follow-up, no UI change)
**Method:** Direct source read of the actual diff, live render of the real app (`npm run dev`, `?review=availability`, 430×900 viewport) via browser automation, 7 saved screenshots, and 4 independent bounded reviewers (3 primed with canonical docs + actual code, 1 given zero design context and only the screenshots).
**Last updated:** 2026-08-08

---

## EXECUTIVE VERDICT

**Both things are true at once, and neither excuses the other.** The felt experience today lands close to where the unprimed reviewer put it — "a messaging app with a scheduling feature bolted on," not yet a visibly new social-AI interface — and every specific cause behind that verdict is a bounded, individually fixable defect, not a structural or architectural problem. The domain/intelligence layer underneath is genuinely clean: no parallel Set authority (verified in source, not just claimed), Relationship Pulse is genuinely off in production (not just flagged off), the new Elixir evidence module is a correct thin bridge into the existing alignment-gap vocabulary, and CI is green (5/5 checks on `fba358a`). The gap is entirely in the presentation layer, and it has a specific, traceable root cause (see OPAL EDGE below), not a vague "needs more polish."

One thing must be fixed before founder visual sign-off regardless of anything else: the `?review=availability` route the founder will actually look at shows two behaviors — a group participant-count line and a proactive "share your windows" private nudge — that **do not exist in the real app** (`OpalApp.tsx`). Signing off on a review route that overstates shipped behavior is the same defect class already caught once on PR #62 (stale screenshots sitting next to real evidence). See MUST FIX.

## WHAT FEELS LIKE OPAL

- **Private Opal Guidance is real, structurally private-by-construction, and reads as intended.** Dominant violet border/label (`#8b5cf6`/`#c4b5fd`), explicit "Only you can see this," first-person copy never asserting anything about the peer. Independently confirmed by three of four reviewers as the one element that visually and conceptually stands apart from ordinary chat chrome.
- **Set-authority isolation held.** `Availability.authorizes_set?/1` (Elixir) and the new `AvailabilityAlignmentEvidence.authorizes_set?/0` are both hardcoded `false`; nothing in `availability.ex`, `availability_controller.ex`, or the new evidence module calls `AlignmentAuthority`/`ProductSignals`, and vice versa. This is exactly the discipline the PR #61 P0 required, applied correctly to new code from day one.
- **The overlap moment's placement is architecturally correct**, not just visually present: it renders as a sibling after the message list, never injected into a synthetic message bubble — matching the exact non-obvious placement reasoning from `relationship-availability-alignment.md` §5.3 (a moment with no message body would break history-sync if treated as a real message).
- **No manipulative copy anywhere in the shipped strings.** "No shared times yet," "Share a couple times that work," "One time works for both of you" — calm, accurate, no urgency, no naming a slower sharer.
- **Group generalization holds in real code**, not just intent: no roster, no per-person checklist, nothing singles out a holdout, verified directly in `grammar.ts` and `OpalApp.tsx`.

## WHAT STILL FEELS GENERIC

- **Opal Edge is indistinguishable from an ordinary colored border.** Root cause, not just opinion — see OPAL EDGE.
- **No distinct visual/typographic voice for Opal beyond a small ◈ glyph.** The unprimed reviewer's strongest point: color and copy carry all the differentiation; there is no consistent "this is Opal speaking" register the way a human bubble has consistent alignment/shape.
- **The payoff moment (the actual overlap result) reads as a generic time-picker widget**, per the unprimed reviewer — two bordered rectangles with times in them, structurally identical to a calendar app's option list.
- **AI chrome and the composer read as two disconnected systems.** Independently flagged by both the unprimed reviewer (item 15: AI scaffolding dominates screen space around a single message) and the finish-gate reviewer ("composer feels bolted on... no shared container, gradient, or connective tissue").
- **Resolution is anticlimactic.** Set collapses to a small green pill with no recap of what was actually agreed and no visual build toward it — flagged by the unprimed reviewer as the buildup (screenshots 3-5) outweighing the payoff (screenshot 6).

## P0

1. **Reduced-motion strips Opal Edge's only visual signal, not just its motion.** `styles.css`'s `prefers-reduced-motion` block sets `.opal-moment { box-shadow: none; }` globally — and Edge's *entire* visual difference from an ordinary journey chip is that box-shadow. A reduced-motion user cannot tell "Opal noticed something actionable" from "Still open" at all. This directly violates the motion doc's own §9 rule ("meaning is preserved in every case... none of that depends on motion having played"). Verified in code by the motion reviewer; this is a binary, confirmable defect, not a felt-experience judgment call.
2. **The founder-facing review route (`?review=availability`) shows unshipped behavior as if it were real.** Two specific cases, both independently found by me and by the ui-ux-pro-max reviewer, from different angles: (a) the group "Based on times people shared — count only, never a roster" line is hardcoded in `AvailabilityReview.tsx` only — `OpalApp.tsx` never reads `participant_count` (confirmed zero usages outside the type declaration in `productClient.ts`) and renders no count-based copy for groups at all; (b) the private "Share a couple times that work when you're ready" nudge shown in the review route requires `hasPrivateWindows: true`, but `OpalApp.tsx` calls `privateGuidanceCopy({ overlap: availabilityOverlap })` — never passing `hasPrivateWindows` — so that branch is dead code in the real app; only the harness's mock state can ever trigger it. Same defect class as the PR #62 stale-screenshot finding: evidence (here, the review route) showing something that isn't the real, current state.

## P1

3. **Opal Edge fails the founder's own "does the light travel/refract/resolve" test.** See OPAL EDGE — this is the single highest-value fix in this review because it has a bounded, already-available solution.
4. **Private Guidance's "you have unshared windows" nudge is unreachable** (same root cause as P0 item 2, restated as a product gap, not just a demo-accuracy problem): the more proactive, arguably more valuable private nudge never fires for real users — they only ever see the reactive "Want a couple ideas?" branch, which requires an overlap to already exist.
5. **Context Chip's touch target is 36px**, below the 44px minimum the grammar doc itself requires (§8) and below every other interactive element in this diff (`.btn`, `.opal-moment-expand button` both correctly use 44px). One-line CSS fix.
6. **Moment card and its follow-up chip do the same job twice.** Finish-gate finding: "One time works for both of you / Thursday 6:30-9:00 PM" (the card) is immediately followed by a "See that time" chip re-surfacing the identical information as a separate tappable element.
7. **Compound states stack competing accent colors.** In the realistic case where Private Guidance + the overlap moment + the Context Chip are all visible at once (confirmed possible by the ui-ux-pro-max reviewer's clutter check), three different glowing borders (violet, cyan, teal) compete in one viewport — the finish-gate reviewer's strongest, most concrete finding.
8. **Edge's entrance can replay with no new underlying event.** `shouldShowOpalEdge` returns `false` while the Find-a-time sheet is open and `true` again once it closes — so opening and closing the sheet re-triggers Edge's entrance animation with nothing new to report. Same risk when the journey element remounts on an auth-state change (`button`↔`div` type swap).

## P2

9. Private Guidance's disambiguating mark glyph (`◈`) is visually identical to the shared-moment mark — only color separates them; the "Only you can see this" hint text is 0.68rem/0.75 opacity, sub-glanceable at 390px.
10. `FORBIDDEN_PRESSURE_PHRASES` is a documented intent, not an enforced guardrail — nothing lints or tests real rendered strings against it; it only prevents the constant itself from containing those phrases.
11. Amber "slow breath" vocabulary from the motion doc isn't implemented for unresolved states — likely intentional (static amber = "not yet, don't oversell"), but worth Grok confirming it's a deliberate scope cut, not an oversight.
12. Reduced-motion may leave a static diagonal refraction band permanently visible on overlap chips (`animation: none` without `content: none`/`opacity:0` on the `::after`) — **flagged as needs-render-check, not confirmed**; this is the one claim in this review reasoned from code rather than observed directly, and it should be verified against an actual reduced-motion render before treating it as a bug.

## OPAL EDGE

**Verdict: TUNE.**

Root cause, not opinion: screenshot 2's visible cyan border comes from the base `.signal-plan_forming` state style (`styles.css:540`), which renders identically whether or not `.opal-edge` is present. `.opal-edge` itself contributes only a diffuse `box-shadow` fade-in (280ms, no angle sweep, no hue shift, no positional travel) layered on top of a border that was already going to be there. This is the mechanical explanation for the unprimed reviewer's "reads as a colored pill/badge" verdict and the finish-gate reviewer's "badge, not edge" — one underlying defect independently observed two ways, not two separate soft opinions.

Bounded fix, not a redesign: the app already ships a working "light travels and resolves" primitive — the overlap moment's `opal-moment-refraction` keyframe (`::after`, diagonal gradient sweep, 500ms, 60ms delay). Reuse that exact technique on `.opal-moment.journey.opal-edge` instead of box-shadow-only. This directly answers the founder's explicit test ("does the light travel, refract, resolve... in a way that feels causally connected to Opal speaking") with something already proven to work elsewhere in the same codebase.

Also fix: the reduced-motion box-shadow strip (P0 #1) and the causally-empty replay on sheet close/remount (P1 #8).

## CONTEXT CHIP

**Verdict: TUNE.** Copy is genuinely good — "Find a time," "See that time," "N times could work" — forward-looking only, never a status statement about another person, correctly guarded (in intent) by `FORBIDDEN_PRESSURE_PHRASES`. Disappears correctly when irrelevant or when the sheet is open. The one real defect is mechanical, not conceptual: 36px touch target vs. the 44px the grammar doc itself mandates (P1 #5).

## EXPANDED MOMENT

**Verdict: PASS**, one reviewer's caveat noted. No date-picker chrome — two real ranges rendered as plain rounded rows, each writing an editable draft message on tap rather than "booking" anything. Collapse is one tap, costs ~90px only while open. The ui-ux-pro-max reviewer traced this specific component against the harness and found no drift — unlike the group-count and private-nudge cases, the Expanded Moment's harness rendering is structurally faithful to the real `OpalApp.tsx` implementation.

## PRIVATE GUIDANCE

**Verdict: TUNE**, structurally sound. Peer-visibility check: there is currently no separate "private data channel" to leak, because the guidance copy is generated client-side from the same shared-safe `overlap` object the viewer already legitimately has (the backend's `compute_overlap` never returns another person's individual windows — confirmed in the prior availability review). This is a minimal-risk design for Phase 1, but it means "Private Guidance" today is a presentation-layer distinction, not yet backed by a genuinely separate secured payload the way `PrivateParticipation` is on the backend — worth Grok knowing precisely, not just "it's private, ship it." Visual distinction (dominant violet, explicit hint) works at a glance per three of four reviewers. Real gap: the proactive nudge branch is unreachable (P0 #2 / P1 #4).

## COPY / VIBE

Real, shipped strings separate canonical state from vibe copy correctly (`contextualSharedCopy` in `grammar.ts`): "Becoming a plan," "This could work," "A couple options fit," "N times could work" — none of the rejected pressure phrases (`waiting on one`, `hasn't answered`, `plans changed`, etc.) appear anywhere in shipped copy. One unprimed-reviewer finding worth taking seriously even though it's about tone, not policy: the status-pill labels ("Still figuring this one out") read to a first-time viewer as "an internal debug/QA state label" rather than natural conversation-adjacent language — worth a copy pass, not a policy violation.

## MOTION

280ms (Edge) / 220ms (Private Guidance) are reasonable durations — the problem is amplitude, not timing, per the motion reviewer: both animate opacity/shadow from zero with no positional or hue change, so they read as "faded in already-lit" rather than "arrived and settled." The refraction primitive already shipped on the overlap chip is the actual "light travels and resolves" language the founder is asking for — Edge should reuse it (see OPAL EDGE). One-breathing-element rule is respected: zero `infinite` animations found anywhere in the stylesheet.

## COLOR TRUTH

Verified directly in source: `deepViolet` (dominant, border+label) renders only on `.opal-private-guidance`; the shared overlap moment uses `--iris`/cyan-violet gradient as a low-alpha background tint only, consistent with the boundary the grammar doc itself drew after the earlier advisor-caught correction. `richEmerald`/completion color renders only on `signal-set`/`signal-ready` — no shared moment renders emerald before an authoritative Set. No color-truth violation found.

## EPHEMERAL LIFECYCLE

Overlap moment and Context Chip: correctly derived/recomputed, not stored — disappear when their underlying state stops being true, no stale-notice pattern. Private Guidance: dismiss is real (`privateDismissed` state) but **not persisted** — it's a plain `useState<Set<string>>` with no `localStorage` backing, unlike the discoverability hint (`showFindTimeHint`), which does persist via `localStorage`. This means a page refresh resets dismissal and the same guidance can reappear, violating the grammar doc's own "never re-ask a declined prompt" rule (§3.4, extending `MINIMUM_QUESTION_ENGINE.md` §3.5). Not filed as P0/P1 because the consequence is mild annoyance, not a privacy or pressure violation — but it's a real, precise gap, filed as P2-adjacent in GROK ACTIONS below.

## PRIVACY / TEMPORARY SHARING

Classification: **NEEDS SMALL EXTENSION**, not an architectural problem. Revoke is fully READY today (`revoke_share`, owner-only, tested). Time-bounded sharing ("share until tonight") would need an `expires_at` on `availability_shares` itself — currently only `availability_windows` has one; the share table has only `shared_at`/`revoked_at`. Plan-scoped sharing (narrower than per-conversation) isn't modeled, but the existing pattern (separate window/share tables, unique-active-share constraint) is exactly the shape that extends cleanly to a `proposal_key`-style scope column, the same pattern `PrivateParticipation` already uses. Nothing in the current schema or authority model blocks either extension.

## SCREEN CLUTTER

Attention hierarchy mostly holds (silence → Edge → one chip → expansion → private → Set), but the realistic compound case — Private Guidance + overlap moment + Context Chip all visible simultaneously around one message bubble — is confirmed possible and is where three separate glowing elements compete, per the finish-gate reviewer's most concrete finding (P1 #7).

## GROUP GENERALIZATION

Principle holds in real code: no roster, no checklist, no holdout-shaming logic anywhere in `grammar.ts` or `OpalApp.tsx`. But the specific reassuring copy shown in the review route ("count only, never a roster") is harness-only and does not correspond to any real rendered string — `OpalApp.tsx` renders zero participant-count copy today (P0 #2). The architecture is right; the presentation for groups specifically is thinner than the demo suggests.

## ALIGNMENT INTEGRATION

Verified by direct source read, not inference: `AvailabilityAlignmentEvidence.from_overlap/1` is a thin, correctly-scoped bridge into the existing `ALIGNMENT_GAP_MODEL.md` vocabulary (`{:gap, :time_availability, action}` / `{:resolved, :time_availability}` / `{:gap, :trust, :blocked}`), implements no new engine, and `authorizes_set?/0` is hardcoded `false`. A `minimum_question_topic/1` helper sketches future integration (`:time_share`/`:time_pick`) without actually asking questions in Phase 1 — correct restraint. No second alignment engine was built. This is exactly the "thin, composable bridge" pattern the original availability handoff asked for.

## FIRST-15-SECOND AHA

Not proven, and the unprimed reviewer's answer is the honest one to lead with: within 15 seconds, the product reads as "a chat app that watches for plan-forming language and offers to find a time" — useful, legible, but not yet legible as *socially intelligent*. The ui-ux-pro-max reviewer's more optimistic read (Edge's cyan glow + ◈ mark + "Becoming a plan" is "more legible than a generic status pill") is a real, defensible observation, but explicitly caveated as unproven without a real user test — and it doesn't contradict the unprimed reviewer, since "more legible than a generic pill" is a lower bar than "obviously an AI that understands our relationship." Both can be true.

## MISSING PRIMITIVE, IF ANY

No new primitive is missing from the design. What's missing is a stronger, causally-connected motion treatment for the one moment that's supposed to prove the intelligence — the overlap discovery itself. The unprimed reviewer named this precisely: the payoff moment (screenshots 4-7) needs to feel more distinct than the buildup toward it, not less. This is answered by the OPAL EDGE fix plus giving the overlap moment's own arrival slightly more weight than a plan Chip's — not by inventing a fifth ephemeral element.

## FOUNDER VISUAL QUESTIONS

Does the interface feel subtly alive when Opal communicates? **Not yet, and now precisely why:** the one primitive built specifically to answer this (Opal Edge) is currently box-shadow-only over an already-present border, not the travel/refract/resolve behavior described. The fix is bounded and already proven elsewhere in the same file (the refraction keyframe). This is the single highest-leverage visual change available before the next review pass.

## GROK ACTIONS

### P0
- Fix reduced-motion so Edge's resting glow survives when animation is disabled (`box-shadow: none` currently sits on the blanket `.opal-moment` selector — scope the reduced-motion rule to `animation`, not `box-shadow`).
- Make `?review=availability` state-faithful before founder sign-off: either wire the group participant-count and "share your windows" private-nudge branches to real data, or clearly label those two specific harness states as "not yet wired to production" so the founder isn't signing off on unshipped behavior.

### P1
- Reuse the existing `opal-moment-refraction` keyframe on `.opal-moment.journey.opal-edge` instead of box-shadow-only (bounded, technique already shipped elsewhere in this diff).
- Wire `hasPrivateWindows` in `OpalApp.tsx`'s call to `privateGuidanceCopy` (e.g., from the count of the user's own windows) so the proactive private nudge is actually reachable.
- Bump `.opal-context-chip` to 44px min-height.
- Merge the overlap moment card and its immediate follow-up chip into one tappable element with one CTA.
- In the compound state, demote either Private Guidance or the Context Chip to a quieter, non-glowing treatment when both are visible with the overlap moment, so only one element is "loud" at a time.
- Guard Edge's entrance from re-firing on sheet close or auth-driven remount — key the animation to a real state transition, not element mount.

### P2
- Persist `privateDismissed` (e.g., `localStorage`, matching the existing `showFindTimeHint` pattern) so a dismissed private suggestion doesn't reappear on refresh.
- Verify (render check, not just code read) whether reduced-motion leaves a static refraction band on overlap chips; fix if confirmed.
- Differentiate Private Guidance's mark glyph from the shared-moment mark; increase the "Only you can see this" hint's size/opacity slightly.
- Add a lint or test asserting `FORBIDDEN_PRESSURE_PHRASES` against actual rendered copy strings, not just the constant's own contents.
- Copy pass on unresolved-state labels ("Still figuring this one out") so they read as natural language rather than an internal state name, per the unprimed reviewer's specific complaint.
- Confirm with Grok whether the amber "slow breath" motion was a deliberate Phase-1 scope cut or an oversight.

---

## Appendix — Independent reviewers used

| Reviewer | Role | Priming level | Main finding | Confidence |
|---|---|---|---|---|
| Agent Zero | — | — | **NOT AVAILABLE as a registered Claude agent in this harness.** Not used, not claimed to be used. Grok may have separate local access to it. | n/a |
| Fresh unprimed reviewer | First-impression felt-experience test | Zero — general-purpose agent given only 7 real screenshots and the founder's 15 questions; no design docs, no repo access, no prior analysis | "Messaging app with a scheduling feature bolted on"; status pill reads as an internal debug label; AI chrome dominates screen space relative to conversation content; private-guidance card is the one genuine standout | Self-reported ~75%, explicitly caveated: static screenshots only, motion not assessable |
| `opal-motion-director` (registered agent) | Motion/timing fidelity vs. `opal-moment-motion-language.md` | High — given the design doc, actual source (`styles.css`, `grammar.ts`, `OpalApp.tsx`), and screenshots | Root-caused the Edge "badge not glow" problem to box-shadow-only styling over a pre-existing border; found the reduced-motion box-shadow strip; flagged causally-empty animation replays | High for code-verified claims (Edge mechanism, reduced-motion selector, one-breathing-element compliance); explicitly flagged the refraction-band claim as needs-render-check, not confirmed |
| `opal-ui-ux-pro-max` (registered agent) | Component-level UX vs. `opal-ui-grammar.md` / `relationship-availability-alignment.md` | High — given both docs, actual component source, and screenshots | Independently found the `hasPrivateWindows` dead-code gap and the unwired group participant-count (matching my own firsthand findings exactly); found the 36px touch-target defect | High — all claims traced to specific file/line evidence |
| `design-ui-finish-gate-reviewer` persona | Final visual-quality gate | Medium — a general-purpose agent given only that one Agency persona document (`docs/coordination/agency-agents-design/design-ui-finish-gate-reviewer.md`, read in full) plus the 7 screenshots; no other design docs, not a registered Claude Code subagent type, fed as a prompt | HOLD verdict; compound-state color competition; moment-card + follow-up-chip redundancy; composer feels visually disconnected from Opal elements | Medium-high — visual/qualitative judgment, but the specific redundancy and clutter findings are concrete and screenshot-cited |

**Consensus findings** (independently reached by 2+ reviewers with no cross-priming): Opal Edge/glow reads as static rather than alive (unprimed reviewer + motion director + finish gate, three different reasoning paths converging on one mechanical cause); AI chrome/composer feel like separate systems (unprimed reviewer + finish gate); the review-harness overstates real behavior for group counts and private nudges (my own review + ui-ux-pro-max, independently, exact same file/line citations).

**One reviewer found something important**: the motion director's reduced-motion accessibility regression (P0) and the ui-ux-pro-max reviewer's 36px touch-target finding were each caught by exactly one reviewer, and both are concrete, code-verified, and easy to miss without a targeted pass.

**Conflicting opinions**: none on evidence. The finish-gate reviewer's HOLD/tune framing and the unprimed reviewer's blunter "bolted on" framing describe the same underlying defects at different severities — this review's own verdict (EXECUTIVE VERDICT, above) states plainly that both are correct simultaneously: the felt experience currently is where the unprimed reviewer put it, and every cause behind that is individually bounded and fixable.
