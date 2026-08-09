# Claude → Grok — Relationship Availability Alignment: Design + Intelligence Handoff

**Writer:** Claude (independent), remote controller mode
**Reader:** Grok — lead executor for whatever below is ported to production
**Reviewed against:** `origin/build/relationship-availability-alignment` @ `dd9f085` (unmerged as of writing)
**Date:** 2026-08-08

---

## What this is

Your Phase 1 branch (`availability.ex`, `availability_controller.ex`, the migration, four test files, `AVAILABILITY_ALIGNMENT_ENGINE.md`, `OPAL_RELATIONSHIP_ALIGNMENT.md`, `LOCATION_PRIVACY_AND_FAMILIARITY.md`) is genuinely solid — I read all of it directly, not the status doc's summary, and it holds up. `PHASE1_STATUS.md` said the intelligence + presentation layer was "the next design handoff from Claude" — this is that handoff, in the MUST/SHOULD/EXPERIMENT/DO NOT shape you asked for, backed by three artifacts:

1. `docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md` — adversarial review of your actual branch (privacy, location, pressure, calendar overreach, relationship-label overfitting, cold-start/network-effect, minimum-question, age-12 copy). Verdict: no privacy leak, no surveillance, no pressure pattern found; one real gap (nothing wired to the intelligence layer yet — expected, that's this doc's job).
2. `docs/design/ui-ux/relationship-availability-alignment.md` — full component-level design against your actual endpoints (not the founder brief's paraphrase — I re-read your source and corrected two copy assumptions that didn't match the real backend strings; see its §0). Includes an 8-step implementation order.
3. `docs/design/motion/opal-moment-motion-language.md` — concrete motion tokens for the four Opal-moment states this capability needs, extending (not replacing) the existing walkthrough choreography spec and shipped Technicolor system.

I did not build a running local prototype. The UI/UX doc is already component-level (exact file/line references, real code snippets, an explicit implementation order) — a prototype would mostly re-derive what's already concretely specified there, and building one against a branch that isn't merged into this worktree would mean either faking the backend or checking out your branch, neither of which seemed worth the session capacity relative to the design doc's precision. If you want one built anyway before you port anything, say so and I will.

---

## MUST

- **Keep the Set-authority boundary exactly as you built it.** `Availability.authorizes_set?/1` stays hardcoded `false`. No availability function is ever called from `AlignmentAuthority` or `ProductSignals`, and vice versa. This is verified correct today — don't let a future "just auto-suggest Set when there's an overlap" shortcut through it. This is the same failure class as the PR #61 P0 (a correct gate sitting beside the live path instead of inside it) — you've already built the regression tests proving it isn't happening; keep them green forever, not just at merge time.
- **Ship the UI/UX doc's copy-provenance discipline as written.** Every user-facing string is either the real backend `label` verbatim, or new copy clearly marked new — nothing renders an invented specific time. This is the exact defect class (`BOOKING_STATE_COPY_PATCH_PROPOSAL.md`, the pre-fix Join-screen wordmark+kicker) already found and fixed twice in this product. Don't let a third instance ship inside brand-new code.
- **Never surface "X hasn't shared yet" in the main conversation thread**, for 2-person or group. This is the one explicit anti-pressure rule this whole assignment exists to enforce, and it currently has no code surface (no reminder system exists yet) — so there's nothing to accidentally violate today, but treat it as a locked constraint the moment any notification/reminder system touches this capability, not an assumption that holds by default.
- **The overlap moment must never share color, weight, or copy certainty with the Set/Ready label.** UI/UX doc §5.6 spells out three independent guarantees (color family, claim-shape, draft-only prefill) — implement all three, not just one; a viewer should never have to trust just one of them.
- **Reserve the "completion" emerald color for Set only.** The motion doc's §2 vocabulary extension (`option_surfaced → recognition`, `set → completion`) exists specifically so this holds; don't take a shortcut that maps the overlap moment to the same color tier as Set for visual-consistency reasons.
- **Fix the `data-state` dead-attribute issue the UI/UX doc found** (§5.3): `data-state` is written on every `.opal-moment` render today but zero CSS rules key off it — everything actually reads the `.signal-*` class name. Attach the new `availability_overlap` color via the class, or it will silently inherit base cyan and become visually indistinguishable from "Still open." This is a pre-existing latent bug in the current component, not something this feature introduces, but this feature is what will expose it if not fixed.

## SHOULD

- **Follow the UI/UX doc's 8-step implementation order** (§12) — it's sequenced smallest/safest first (chip→button, then new SignalKind+CSS with no behavior yet, then the sheet in two halves, then the realtime wiring, then the composer handoff), each step independently landable and testable.
- **Wire the "one honest interruption" restraint principle through the existing `Restraint` module's spirit, even if you don't call it directly yet.** `Restraint.decide/1` (`dynamic_intelligence/restraint.ex`) is scoped to DSI/experience surfacing today, not directly reusable for availability's simpler binary (overlap found → surface once; anything else → stay in the sheet). The UI/UX design already encodes the right behavior by construction (only `overlap_found` gets a thread moment; everything else is sheet-only, pull not push) — you don't need a new decision engine for Phase 1's binary case. If a later phase adds nuance (e.g., ranking multiple overlaps, deciding whether a second overlap is worth a second interruption), that's the point where this should actually start calling into `Restraint`'s pattern (or a sibling built the same way) rather than growing ad hoc thresholds inside `Availability`.
- **When you build the actual "smallest question" behavior later (e.g., "nobody's shared — should Opal nudge, and with what?"), route it through `MINIMUM_QUESTION_ENGINE.md`'s existing decision procedure, not a new one.** Concretely: infer first (if one person already said "I'm free Thursday" in-message, don't ask them to also fill the sheet), apply the restraint threshold before asking anything, ask the single narrowest form ("Thursday or Sunday?" beats a full-window picker), attach it to real context, never re-ask a declined prompt. This document (`ALIGNMENT_GAP_MODEL.md`'s companion) already exists and needs no changes — availability just becomes one more topic type its `topic` field can reference, alongside `PlanProposal`/`AvailabilityGrant`/`Commitment`. Phase 1 has no such question-asking behavior yet, correctly — this is guidance for when it does.
- **When experience curation (0-3 options after a time is Set-bound) gets built, feed it through `CollectiveFit.rank/3`, which already accepts a `time_window` parameter** (`dynamic_intelligence/collective_fit.ex`) — that parameter exists today for exactly this future input, unused until now. No new ranking engine is needed; availability's overlap output is the natural value for it.
- **Add the four missing `productClient.ts` functions** the UI/UX doc names (`updateAvailabilityWindow`, `deleteAvailabilityWindow`, `revokeAvailabilityShare`, `listMyAvailabilityInConversation`) alongside the five already drafted, same `request<T>()` pattern.
- **Flag the group-copy honesty gap to whoever owns product copy**, don't silently patch client-side: `overlap_label/1` says "both of you" regardless of group size — accurate for 2, slightly off for 5. UI/UX doc §7.2 step 3 recommends flagging, not forking new copy per N — I agree, a group-aware label variant is a backend copy decision, not a client patch.

## EXPERIMENT (worth trying, not yet a commitment)

- The motion doc's **width-convergence beat for Set** (the pill visibly narrowing from a long label down to "Set") is new — nothing in the sibling walkthrough spec does this. Worth building and looking at on a real render before committing; the doc itself flags this as a hypothesis to verify, not a locked spec (§10 fatigue-risk section).
- The UI/UX doc's **one-time discoverability hint** ("Tap to share a time that works.") under the journey chip, gated by a `localStorage` flag — reasonable first attempt at solving "a status pill silently becoming tappable is not self-evident," but worth a real usability look before assuming text-under-a-chip is sufficient versus, say, a first-use animation cue (which the motion doc doesn't currently spec — would need its own pass if you want to explore that direction instead).
- **[PROPOSED, gated]** copy: `"Want a couple ideas?"` as the multi-range disclosure button label, *only* for the 2+-real-options branch where it wouldn't fabricate anything. UI/UX doc uses the plain, already-accurate `"See both times"`/`"See all N times"` until/unless this gets explicit copy-owner confirmation — don't ship the founder's original phrasing as literal text without that confirmation.

## DO NOT

- Do not add a title/note/reason field to the private window editor — no backend column exists, and adding a UI field for it would promise storage that isn't there.
- Do not build a calendar grid, week/month view, or a dedicated Availability nav tab. Already rejected once for this exact domain (`CALENDAR_AUDIT.md`), reconfirmed by both new design docs.
- Do not reintroduce any glow/halo/ring around `OpalMark`/`OpalLockup` as an overlap "celebration" — this exact pattern was built, flagged, and removed once already (PR #62). This feature has no brand-arrival role and should not touch the mark at all.
- Do not build a group roster/checklist ("✓ Maya, ✓ Jordan, ✗ Priya") anywhere, including the sheet's transparency section — one honest participant count is the ceiling.
- Do not push a "someone revoked their share" notice into the thread — per the UI/UX doc, that's surveillance-flavored and manufactures exactly the guilt-pressure pattern this whole assignment exists to prevent. Let a stale moment quietly age out on next fetch instead.
- Do not implement habitual-location learning, location fit ranking, or any location field beyond what `LOCATION_PRIVACY_AND_FAMILIARITY.md` already correctly scopes as future-only. That doc's own language is right — don't let anyone (including a future me) treat the founder's broader "private habitual-location intelligence" framing as authorization for this Phase to build it; it explicitly isn't, and the doc already says any later model needs its own product + privacy review.
- Do not let the overlap moment loop, pulse, or otherwise imply ongoing progress — per the motion doc, refraction/light-movement is explicitly excluded from "Still open" for the same reason, and the "one-breathing-element" rule (only the thread's journey bar may loop) applies here too.
- Do not build this against `AvailabilityGrant` (the SF4 table) — confirmed a separate table, separate purpose, do not conflate.

---

## One thing worth a founder decision, not a Grok decision

`Opal_PRODUCT_TRUTH.md` was edited on your branch (additive section, correctly scoped — I read the diff, it does not silently redefine any locked truth) but it doesn't resolve either open item from `CLAUDE_GROK_REVIEW_LEDGER.md` checkpoint 5. Location scope is handled correctly even though it isn't resolved: `LOCATION_PRIVACY_AND_FAMILIARITY.md` defers it explicitly rather than assuming an answer, which is the right move while the founder decision is still open — keep deferring, don't let a later phase quietly start building against it without that confirmation landing first. The `MVP_BOUNDARY.md` calendar-deferral question is fully open, no doc addresses it either way — worth a one-line founder confirmation before this goes to PR, not something either of us should infer.
