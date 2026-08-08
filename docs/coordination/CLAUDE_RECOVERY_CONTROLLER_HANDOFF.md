# Claude — Recovery Controller Handoff

**Author:** Claude (independent), remote controller mode
**Date:** 2026-08-08
**Context:** Founder's machine was offline ~1-2 days. This is the recovery pass: verify state, do not trust prior session memory, continue PR #61 supervision, assess a new founder product direction against the existing repo.
**Branch:** `architecture/speed-to-alignment-and-complete-journey` (unchanged, correct)

---

## 1. Recovery verification

- Repo state matches expectations: correct branch, no destructive drift, `origin/main` unchanged.
- Two files had **uncommitted local edits** from before the outage: `CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md` and `GROK_TO_CLAUDE_ACK.md`, recording D-004 (PR #62 evidence-hygiene cleanup) as done. Checked against ground truth — matches the actual commit (`c276af7`) and PR #62 comment on `fix/walkthrough-no-halo-aha` exactly. Real, just never committed. Committed now, along with this handoff and a new ledger checkpoint.
- No sign the outage caused any repo corruption or lost work on any branch checked (this worktree, `opal-grok-real-people`, `opal-walkthrough-visual`).

## 2. PR #61 — supervision continued

Full detail in `CLAUDE_GROK_REVIEW_LEDGER.md` checkpoint 4. Short version: the P0 authority gap I found last session (`docs/reviews/CLAUDE_PR61_INDEPENDENT_REVIEW.md`) is fixed and source-verified closed. Grok then independently ran a hosted synthetic dress rehearsal and reports every gate PROVEN, recommending merge (`docs/evidence/real-people/PR61_SCOPE_REVIEW.md`). I spot-checked two hosted claims myself, credential-free (`/health`, `/privacy`) — both real. I did not re-run the full hosted Set-authority journey myself. **Merge decision is the founder's**, not something this handoff resolves.

## 3. New founder direction: relationship-availability / speed-to-alignment scheduling

Founder's framing: help two (or more) people privately understand their own availability, share selected windows, discover overlap, and move toward an experience — generalized across courtship, dating, partners, friends, family, church groups, study partners, travel companions, collaborators. Explicit requirements: private calendar/free-busy intelligence, selected sharing (not full exposure), overlap discovery, relationship-context-aware curation, approximate/familiar-area fit, private habitual-location intelligence never surfaced as surveillance, a few strong experience options, permissioned relationship memory, reminders only after actual agreement, no pressure, wingman-not-manipulator tone. Age-12 copy examples given (e.g. "You both have Thursday open.").

### Does the repo already capture this? Yes, substantially.

This is **not a gap to fill with a new document** — per instruction, no new product doc was created. It's Opal's existing Social Flow domain, already designed and partly implemented:

| Founder requirement | Existing coverage |
|---|---|
| Private calendar/free-busy intelligence, selected sharing | `apps/opal_core/lib/opal_core/social_flow/availability_grant.ex` — implemented, file opened directly. `grant_mode` field with `validate_inclusion` on `~w(exact free_busy preferred_windows unavailable_windows ask_before none)`, scoped per owner + conversation, revocable. |
| Overlap discovery, "Thursday open" copy | `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md` — worked example is almost verbatim the founder's copy: *"Thursday after 6:30 looks possible for both of you."* Domain primitives: **Availability grant**, **Time option**, **Plan poll**, **Personal hold** (private reservation, never exposed as shared event). |
| Approximate/familiar-area fit, location never surveillance | `LOCATION_COLLECTIVE_FIT.md` — full privacy-scope model already: opt-in, purpose-bound, approximate-unless-required, "used privately for option ranking / never shown to others" as the *default*. This is the right pattern to extend, not reinvent. |
| Relationship-context-aware curation, no relationship-label overfitting | `OPAL_RELATIONSHIP_CONTEXTS.md` — already locks "user-confirmed labels," "frequency is not identity," "no public ranking of relationships," multi-label support, a full context catalog (romantic_partner, adult_friend, family_group, trusted_group, etc.) proportionate coordination by context. Directly answers the founder's "relationship-label overfitting" challenge point. |
| A few strong experience options, not a feed | `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` §7 "Collective fit, not average fit" — already the exact design: small number of high-quality possibilities, hard constraints satisfied without exposing private reasons. |
| No pressure, restraint | §10 "Restraint engine" — "silence is a successful product outcome," surface only when expected value clears interruption + privacy cost. General-purpose, not scheduling-specific yet (see gap below). |
| Cold-start / network effects challenge | `OPAL_NETWORK_EFFECT_JOURNEYS.md` — explicit anti-dark-growth guardrails already written, repeatedly warns against shipping growth mechanics ahead of trust mechanics. |
| Minimum-question behavior | `MINIMUM_QUESTION_ENGINE.md` (referenced from `OPAL_SPEED_TO_ALIGNMENT.md`, `OPAL_SOLO_AND_GROUP_ALIGNMENT.md`) — "ask exactly one narrow thing, not a form." |
| Permissioned relationship memory | Named in `MVP_BOUNDARY.md` as "Shared relationship memory product" — see gap below, it's deferred, not built. |

No hits anywhere in the repo for the literal words "wingman," "overlapping availability," "schedule together," or "find a time" — the underlying concept exists under different vocabulary (Availability grant / availability resolution), so a canonical spec should adopt the founder's plainer phrasing without introducing a second, competing vocabulary for the same primitives.

### Real tensions for whoever writes the canonical spec (not blockers to PR #61)

1. **MVP boundary contradiction.** `MVP_BOUNDARY.md` explicitly defers "Social Flow calendar product" — *"Coordination v1 can be commitment-only."* The founder's new ask (overlap discovery UX, area fit, several strong experience options) is materially richer than commitment-only. Needs an explicit founder call: is this direction redefining MVP v1 scope right now, or is it documentation/vision-setting for a later phase? Left unresolved, Grok could reasonably read it either way.
2. **Location-intelligence scope reversal.** SF17 docs explicitly state location intelligence is a **non-goal** — *"Not location intelligence"* (`docs/evidence/social-flow-17/SAME_SITE_API_ARCHITECTURE.md`, non-goals list) and *"Location intelligence is not live"* (`docs/evidence/social-flow-17/FINAL_CLOSURE.md`, both read directly). The founder's new direction explicitly asks for "private habitual-location intelligence." That's a scope *change* from a documented prior decision, not a natural extension of it. Should get an explicit founder decision (candidate `GAPS_AND_OPEN_DECISIONS.md` entry) before any spec assumes it's in scope — `LOCATION_COLLECTIVE_FIT.md`'s existing privacy-scope table is the right mechanism to extend *if* approved.
3. **No explicit "reminders only after agreement" rule yet.** The restraint engine covers general interruption-cost tradeoffs but doesn't yet state the specific anti-pattern the founder named — nudging on raw availability before agreement ("you're free so why haven't you replied"). Worth one explicit, testable line in the existing restraint-engine or Social Flow doc, not a new document. This is also the same discipline class as the PR #61 P0 bug below — worth pointing out to whoever owns both, since it's the same failure mode twice.
4. **Real People vertical collision risk.** Grok's in-flight `PROGRAM_CHARTER.md` (branch `build/real-people-first-alignment`) uses the near-identical north star *"Speed to authentic alignment — not speed to any decision,"* and deliberately avoids "booking" language in favor of "Set." Any scheduling-vertical copy work must inherit that discipline, not introduce booking-pressure framing into a flow that specifically rejected it. Per founder instruction: this new direction should not derail or reprioritize Real People's build-now work.

### Connection worth naming: PR #61's P0 bug *is* this direction's central risk, already caught once

The P0 finding closed this session (§2 above) was exactly the failure mode the founder is pre-emptively worried about for scheduling: a private "no" (`not_this_time`) that the *live* code path silently ignored while the doc-level privacy rule said it shouldn't. Same shape as "never expose another person's private reason unless explicitly shared" — the rule existed in docs and in a well-tested function, but wasn't wired into what users actually see. Whoever builds the availability/scheduling vertical should treat "private answer has real, wired effect on the live path — not just a tested function sitting beside it" as a first-class acceptance test, the same way `set_authority_p0_test.exs` now is for Set.

## 4. Recommended next actions (not performed by me)

- Founder: decide the three items in ledger checkpoint 4 (merge PR #61; MVP calendar-boundary scope; location-intelligence scope).
- Grok: no action required right now — PR #61 is the priority; the scheduling-direction items above are informational for whenever a canonical spec gets written, explicitly not urgent.
