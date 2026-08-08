# Controller handoff — Opal Relationship Availability Alignment

**Author:** Claude (independent), remote controller mode
**Date:** 2026-08-08
**Status:** Next product slice. **Not yet runtime.** No code exists for this slice beyond the pre-existing `availability_grant.ex` primitive; no directive is Active.
**Predecessor:** PR #61 (Real People synthetic) — closed. See `CLAUDE_GROK_REVIEW_LEDGER.md` checkpoint 5.

---

## Scope

Help two or more people privately understand their own availability, share selected windows, discover overlap, and move toward an experience — generalized across courtship, dating, partners, friends, family, church groups, study partners, travel companions, collaborators.

**This is not a dating product.** It must work identically well for a study pair, a church group, and siblings scheduling a visit — the mechanism (availability → selective sharing → overlap → suggestion) is relationship-agnostic; only copy tone and context-appropriate defaults vary. If a canonical spec's examples, defaults, or UI skew toward romantic/dating framing, that's a defect against this requirement, not a style choice.

## Review requirements for the eventual canonical spec

A reviewer (Claude or otherwise) should check the spec against each of these before it's accepted. None of these need a new document written from scratch — the repo already has load-bearing precedent for most; the spec should cite and extend it, not reinvent it.

1. **Selective availability sharing.** Must be grant-based and revocable, never full calendar exposure by default. Existing mechanism: `availability_grant.ex` (`grant_mode`: `exact | free_busy | preferred_windows | unavailable_windows | ask_before | none`). Spec should say which mode is default per relationship context and why.

2. **Calendar privacy.** Raw calendar data (event titles, reasons for unavailability) must never cross to another person. Only derived fit signals ("Thursday works") may be shared. Check for a `Personal hold`-style concept (private reservation, never exposed as shared event) surviving into the spec.

3. **Overlap computation.** Where does it run, on what data, and what does the *other* person see if I decline privately? This is the exact class of bug closed in PR #61 (`AlignmentAuthority` P0): a private "no" must have real, wired effect on the live output, not just exist as a tested-but-unwired function beside it. Any overlap/availability spec needs an explicit acceptance test for "private decline changes the shared result, without leaking why," proven against the actual serving path — not asserted in isolation.

4. **Relationship context.** Must reuse `OPAL_RELATIONSHIP_CONTEXTS.md`'s existing rules: user-confirmed labels (never auto-inferred from message frequency), no relationship scoring, no "most important contact" ranking, multi-label support. A spec that invents its own relationship taxonomy for scheduling purposes is a defect — one taxonomy, reused everywhere.

5. **No social pressure.** No "you're free so why haven't you replied." Reminders/nudges fire only after actual mutual agreement, never as an availability nudge before agreement. This specific rule is not yet written anywhere as an explicit, testable line (the general restraint engine in `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` §10 covers interruption cost broadly but not this exact anti-pattern) — the spec should add it explicitly and a reviewer should hold it to that line.

6. **Habitual-location privacy.** Any location signal must follow `LOCATION_COLLECTIVE_FIT.md`'s existing scope table: opt-in, purpose-bound, approximate-unless-required, "used privately for ranking / never shown to others" as default. **Flag, don't assume:** SF17 evidence docs explicitly logged location intelligence as a non-goal ("not live"). Habitual-location inference is a scope expansion past that prior explicit decision — a reviewer should confirm the founder has actually authorized this expansion before accepting a spec that assumes it, not infer authorization from the product-direction prompt alone.

7. **Age-12 copy.** Match the standard already set: "You both have Thursday open." / "A couple times could work." / "This area works well for both of you." Plain, no jargon, no false certainty ("booked," "confirmed") ahead of real agreement — same discipline PR #61's Set-vs-booking distinction already enforces.

8. **Network effect.** Must not ship growth mechanics ahead of trust mechanics — `OPAL_NETWORK_EFFECT_JOURNEYS.md` already states this as a standing warning for exactly this kind of feature. A reviewer should check the spec doesn't add invite-pressure, visible "who's free" broadcasts, or anything that turns private availability into a growth lever.

9. **Clean-wingman behavior.** Opal may suggest, never decide or apply social pressure on Opal's own initiative. Check: does the spec let Opal message a third party on a user's behalf without an explicit per-instance send action from that user? If yes, that's a manipulator pattern, not a wingman pattern — reject.

## What's genuinely open (not yet decided anywhere in the repo)

- `MVP_BOUNDARY.md` defers "Social Flow calendar product" as commitment-only for v1 — does this direction expand that boundary now, or stay documentation-only? Founder call, unresolved as of checkpoint 5.
- Is habitual-location intelligence actually in scope, given SF17's explicit prior non-goal? Founder call, unresolved as of checkpoint 5.
- No `GAPS_AND_OPEN_DECISIONS.md` entry exists yet for either question — recommend adding one once the founder decides, so the decision has a permanent, citable record instead of living only in coordination files.

## Not requested here

No spec, no schema, no UI, no code. This is the review checklist for whenever a canonical spec is written — by Grok, by the founder, or by a future Claude session. Do not start building against this slice ahead of an explicit founder go-ahead.
