# Claude — Adversarial Review, Relationship Availability Alignment (Phase 1)

**Author:** Claude (independent), remote controller mode
**Reviewed against:** `origin/build/relationship-availability-alignment` @ `dd9f085` (not yet a PR; unpushed-to-main, actively being extended by Grok as of this review)
**Method:** Direct source read of `availability.ex`, `availability_controller.ex`, `router.ex`, the migration, all four test files, and the three new docs — not summaries.
**Last updated:** 2026-08-08

---

## EXECUTIVE VERDICT

Structurally sound, disciplined, and correctly scoped. This is not the "pipes without intelligence" risk the founder flagged rendered as a code fact — the branch's own docs (`PHASE1_STATUS.md`) already say the intelligence layer is deliberately deferred to this Claude pass, not silently skipped. Checked against the eight adversarial categories requested: no privacy leak found, no location surveillance (explicitly out of scope and structurally excluded), no social-pressure pattern found in current copy, no calendar overreach (schema cannot store one), no relationship-label overfitting (no relationship-context coupling exists yet — see gap below), cold-start and network-effect claims are honest about being unbuilt, minimum-question behavior does not exist yet (expected — it's this handoff's job), age-12 copy is genuinely good. One real gap, not a defect: nothing here talks to `ALIGNMENT_GAP_MODEL.md`, `MINIMUM_QUESTION_ENGINE.md`, `CollectiveFit`, or `Restraint` yet — by design, per the branch's own status doc — which is exactly the wiring this review's companion handoff must specify.

---

## VERIFIED — PRIVACY

- **Schema cannot hold a leak.** `availability_windows` has exactly `owner_user_id, start_at, end_at, timezone, source, status, expires_at` — no title, note, or reason column exists at all. This is stronger than an app-level rule; a future engineer cannot accidentally add "event title" to a payload that has no column to read it from.
- **`assert_shared_safe!/1`** (reused convention, matches `PrivateParticipation.assert_shared_safe!` and `Outcome.assert_shared_safe!` already established elsewhere) is called at all three controller response sites (`share`, `list_shared`/`list_mine`, `overlap`) before the payload leaves the server, and raises on `private_reason`, `response_key`, `calendar_title`, `event_title`, `unavailable_reason`, `event_notes`. Test `"private schedule reason never appears in shared payloads"` exercises this directly.
- **`compute_overlap/2`** returns only the merged intersection (`overlaps`, `label`, `participant_count`, `no_private_schedule: true`) — never the peer's individual windows. `shared_safe_projection/1` for a single `AvailabilityShare` does expose `owner_user_id` + that window's own start/end — this is not a leak, it's the literal mechanism of "intentional share": the owner chose to share that specific window into that specific conversation, so a peer seeing it is the feature working, not data escaping its consent boundary. Worth naming for the UI pass below: the copy layer should still default to showing the *overlap* ("You both have Thursday evening open"), not a raw list of "A shared: ..., B shared: ...", even though the latter isn't a privacy bug.
- **Outsider isolation and blocked-pair handling verified in code**, not just claimed: `ensure_member/2` gates every action; `blocked_pair_in_conversation?/1` forces `compute_overlap` to return `empty_overlap("blocked")` rather than erroring or partially computing. Test `"outsider C denied shared and overlap"` and `"block prevents continued sharing and empties overlap"` both exist and match the source.

## VERIFIED — CALENDAR OVERREACH

No calendar OAuth, no external provider, `source` is `validate_inclusion`-restricted to `"manual"` in Phase 1 (`ensure_manual_source/1`), with `calendar_free_busy`/`device_inference` named only as future interface stubs, not implemented. Matches the assignment's explicit boundary ("Availability is one more signal," not the product center).

## VERIFIED — LOCATION / SURVEILLANCE

`LOCATION_PRIVACY_AND_FAMILIARITY.md` correctly treats habitual-location as **not authorized**, not merely unbuilt: *"Not learned or stored in Phase 1. Any later model requires explicit product + privacy review."* This does not *resolve* the open founder-decision item from ledger checkpoint 5 — only the founder can resolve it — but it correctly *defers* rather than assumes: Grok did not quietly treat location intelligence as now in scope, it explicitly gated any future work behind a review that hasn't happened yet. The founder decision stays open; Grok just avoided answering it unilaterally, which is the right behavior while it's open. The shared/forbidden-language table in that doc ("This area is easy for both of you" vs. "He leaves work in Carlsbad at 5:45") is the right instinct and should carry forward unchanged into any future location work. No location field exists in the Phase 1 schema, so there is nothing to leak.

## VERIFIED — SET AUTHORITY BOUNDARY (the PR #61 failure mode, checked again)

Given the P0 finding closed on PR #61 was exactly "a rigorous gate function sitting beside the live path instead of inside it," this is the first thing worth re-checking on any new alignment-adjacent code, and it holds up: `Availability.authorizes_set?/1` is hardcoded `def authorizes_set?(_overlap_or_share), do: false` — not configurable, not conditional. `AlignmentAuthority`, `ProductSignals`, `Restraint`, and `CollectiveFit` are never referenced anywhere in `availability.ex` or `availability_controller.ex` (confirmed by direct grep, not assumption) — meaning availability data cannot currently reach the Set gate as an affirmative even accidentally, because nothing wires it in yet. Two explicit regression tests exist: `"authorizes_set? is always false — overlap is not Set authority"` and `"share + overlap alone never elevates ProductSignals to Set"`, plus a positive control, `"mutual message agreement can still reach Set after availability help"`, proving the existing path still works unmodified. This is the correct order of operations — ship the boundary and its regression test before the integration that could threaten it.

## SOCIAL PRESSURE — no current violation, one rule not yet written down anywhere

Current copy (`overlap_label/1`, `empty_overlap/1`): *"No shared times yet."* / *"One time works for both of you."* / *"Share a couple times that work."* / *"Could not find a shared time."* — calm, no urgency language, no "why haven't you replied," nothing that names or shames the slower sharer. `OPAL_RELATIONSHIP_ALIGNMENT.md`'s "Clean wingman" section explicitly rejects exactly the manipulative framings the founder listed (*"She is free Thursday anyway,"* *"She usually spends Thursdays near Carlsbad"*).

**But:** the specific rule "reminders/nudges fire only after mutual agreement, never as a pre-agreement availability nudge" — the exact anti-pattern named in the founder's brief — has no code surface yet (no reminder system exists in this branch) and, per the recovery-controller handoff two sessions ago, still isn't written down as an explicit, testable line anywhere in the repo. It needs to land in the intelligence-layer design this review's companion handoff produces, specifically as an acceptance criterion for whatever eventually calls the Minimum Question Engine on availability's behalf — not assumed from the current absence of nudges, since absence-of-a-feature isn't the same guarantee as an explicit rule once someone builds notifications later.

## RELATIONSHIP-LABEL OVERFITTING — not applicable yet (by design, flag for the handoff)

Nothing in `availability.ex` reads or branches on relationship context (`OPAL_RELATIONSHIP_CONTEXTS.md`'s catalog) at all — Phase 1 is deliberately relationship-agnostic plumbing. That's correct for Phase 1 and not a defect. It becomes a real risk the moment copy or tone starts varying by context (the founder's "clean wingman... only in courtship contexts" framing implies exactly that variation is coming) — at that point the existing anti-overfitting rules (user-confirmed labels, frequency ≠ identity, no scoring) must be the only mechanism used to determine tone, and this should be an explicit constraint in the intelligence-layer handoff, not left implicit.

## COLD-START / NETWORK EFFECT — honestly scoped, not yet a risk

`OPAL_RELATIONSHIP_ALIGNMENT.md`'s "Network invitation (future shape)" section is explicitly future-shaped, one line, no growth mechanics implemented: *"Phase 1 does not build a viral growth system; domain must allow this invite context later."* Nothing in the current branch pressures a second user to join, broadcasts "who's free" to non-participants, or creates any invite-for-reward loop. Matches `OPAL_NETWORK_EFFECT_JOURNEYS.md`'s standing warning against shipping growth mechanics ahead of trust mechanics — currently satisfied by simply not building the growth mechanics yet.

## MINIMUM-QUESTION BEHAVIOR — does not exist yet; this is the actual work item

No question-asking logic exists anywhere in this branch — "Find a time" is a manual user-initiated action (create window → share → read overlap), not yet an Opal-initiated question. This is expected: `PHASE1_STATUS.md` explicitly defers "Full Alignment Context / gap detector / minimum-question / collective fit engines" to this Claude pass. The canonical `MINIMUM_QUESTION_ENGINE.md` (2026-08-05, read in full) already specifies the exact decision procedure needed — infer first, apply the restraint threshold, ask the single narrowest form, attach to real context, never re-ask — and it requires no new authority boundary. The integration work is naming which specific unknowns availability introduces (nobody has shared yet / only one person has shared / no overlap exists / overlap exists but no place/budget signal) as candidate questions for that existing engine, not building a new one.

## AGE-12 COPY — genuinely good, verified in source not just claimed

Every user-facing string that exists today reads at the founder's target level: *"No shared times yet,"* *"One time works for both of you,"* *"Share a couple times that work."* No jargon, no false certainty, no "confirmed"/"booked" language ahead of real agreement — consistent with the discipline already enforced around the Set/booking distinction in PR #61.

## Correction to a premise in the founder's brief

The brief describes Grok's Phase 1 as including "shared-safe realtime projection." That part is true only partially: `availability:shared` / `availability:revoked` Phoenix broadcasts exist per `AVAILABILITY_ALIGNMENT_ENGINE.md` and are tested (`"realtime shared projection is shared-safe"`), but there is no realtime broadcast for *overlap* itself — `compute_overlap/2` is read-time/HTTP only. A client would need to re-fetch `/overlap` after a `availability:shared` event to see an updated intersection; there's no `availability:overlap_found` push yet (it's listed only as a future optional outbox event name). Not a defect — just worth the design pass knowing the actual realtime surface before assuming overlap updates push themselves.

## Not verified (out of scope for a credential-free source review)

Did not run the test suite myself (trusting `PHASE1_STATUS.md`'s "318/0" claim at the same confidence level as any other unverified branch-status claim — i.e., plausible given the code reads consistently with what the tests claim to cover, not independently re-run). Did not check the `RateLimitBucket.hit/3` module beyond confirming it uses `Repo.transaction` + `lock: "FOR UPDATE"`, which is the correct fix for the P1 race-condition class flagged on PR #61's older `Onboarding.check_rate_limit/3` — worth noting as a positive: this newer module does not repeat that defect shape.
