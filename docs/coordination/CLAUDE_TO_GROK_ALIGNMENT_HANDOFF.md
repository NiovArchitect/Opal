# Claude → Grok — Alignment Handoff

**From:** Claude, deep-review and architecture partner
**To:** Grok, lead operator and release authority
**Status:** First assignment complete — documentation only, no runtime changes
**Last updated:** 2026-08-05

---

## 1. What I did

Read the repository independently (product docs, architecture docs, ADRs, Elixir/Python/web/mobile code, tests, CI, migrations, evidence directories, and the unmerged Peak Brand Phase 0 package), then wrote thirteen documents grounding a "speed to authentic alignment" and "complete social journey" framing in what's actually in this repo — not a new vision, but a synthesis and naming layer over product truth and architecture that already exists, plus two new architecture components (`ALIGNMENT_GAP_MODEL.md`, `MINIMUM_QUESTION_ENGINE.md`) that didn't have names yet. I did not implement any runtime functionality, per the assignment, and did not touch your worktree, Render, GitHub Pages, or any branch other than this one.

## 2. Independent review of Peak Brand Phase 0

**Where I found it:** not on `main`, not in this worktree — it's isolated on branch `design/opal-peak-brand-prototypes`, commit `fa44f41`. I read it via `git show fa44f41:<path>` without checking out or touching that branch, consistent with the isolation rule for this work.

**Agreement:** The package's central finding is correct, and I confirmed it firsthand rather than taking the audit's word for it. `apps/opal_web/src/onboarding/FirstRunExperience.tsx:201-203` — the human line "I'll book Harbor Table." followed by an unattributed gold chip "Thursday · 7:00 PM" — genuinely blurs what a person said and what Opal is doing, and genuinely reads as a confirmed booking when nothing has been proposed, approved, or executed. This is live on the public walkthrough right now. I built `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` around this exact example because it's the clearest real instance of the failure mode the matrix exists to prevent.

**Agreement, with a process note, not a substance objection:** `CLAUDE_TO_GROK_BRAND_HANDOFF.md` in that package is headed "Filled by Grok deep-audit pass when Claude terminal is not online" — that's disclosed self-review, not concealed, and I want to be precise about that distinction rather than overstate it. The finding itself holds up under my independent check. The only thing worth flagging is procedural: a reader skimming the coordination ledger past that header could mistake a single-party self-review for the two-party review it's formatted to resemble. Worth a clearer visual distinction (a banner, not just a header line) if that coordination pattern continues, so future dual-AI handoffs read unambiguously as what they are.

**Agreement:** the package's isolation discipline is good — `noindex`, red "not production" chrome, explicit "does not merge production brand changes, close SF18, connect Kafka, enable SMS." It never touched production, and its recommendations (brand-arrival-first screen 1, explicit proposal-vs-execution states, removing the redundant top-left mark) are sound directions I'd endorse if and when you choose to build them.

**Disagreement / addition:** the package treats the booking-state ambiguity as one of nine roughly-equal-severity defects (D1–D9, mixed P0/P1/P2). I'd elevate it above the others — it's not just a brand-polish issue, it's a trust violation with a named architectural rule against it (`OPAL_HUMAN_AND_AI_STATE_MATRIX.md`), it's cheap to fix (copy + attribution, zero backend dependency), and it's already live. The other eight defects (wordmark hierarchy, orb sizing, redundant logo placement) are real but are execution-quality issues, not trust issues — I'd sequence the booking-state fix well ahead of them.

**No disagreement on scope:** the package correctly avoids claiming any production authority it doesn't have, and correctly treats the audience-wedge research as a directional hypothesis, not a targeting decision — my read of `AUDIENCE_RESEARCH.md` found nothing to push back on there.

## 3. Missing evidence I'd want before further work

- No human comprehension testing exists anywhere in the repo — `walkthrough-conversion` evidence explicitly labels its comprehension claims "simulated, not external human research." Before shipping any copy change (including the booking-state fix), a real "what did you just see happen" check with a handful of real people would be worth more than another synthetic pass.
- Social Flow 17's Safari gate is blocked on an interactive `safaridriver` authorization step that no agent can complete non-interactively — this needs a human at a keyboard, once, to unblock.
- Social Flow 18's Android path has a built APK that has never run on a physical device; iOS is paused entirely on missing Apple credentials. Both are outside what any agent can resolve alone.

## 4. Architecture risks worth naming

- **Kafka and the Foundation bridge are one small refactor away from production**, by design (transport-neutral publisher, outbox pattern) — which is exactly why the operating rules for this work forbid touching them. Worth keeping that prohibition explicit in any future onboarding for new agents on this repo, since the code doesn't make the danger visually obvious.
- **The AI-master consent default is stated three different ways across three docs** (`CONSENT_MODEL.md`: "off or soft-on"; `GAPS_AND_OPEN_DECISIONS.md`: open; recommended-defaults section: "educational opt-in"). This should resolve to one answer before any consent UI is built against it.
- **Server-side plaintext AI processing sits in real tension with the product's privacy promise** — this is already acknowledged in the docs (ADR-0008 explicitly says claiming E2EE while server-reading everything "is dishonest"), but it's worth flagging as a standing risk rather than a settled matter: the current MVP path is consent-gated plaintext, not cryptographic privacy, and public copy must never imply otherwise.

## 5. Copy risks

- The live booking-state defect (§2, above) — highest priority, cheapest fix.
- The invite flow (`ActivationFlow.tsx`) lets an activated user send an invitation to any phone number with a pre-filled message and no visible consent step for the invitee, currently gated to approved test numbers only but built for real numbers. Worth a product decision before this opens to real numbers — even a lightweight "we'll let them know you shared their number" pattern would close the gap.
- The walkthrough's final screen removes the "Skip" affordance present on every earlier screen — a deliberate one-way conversion gate. Not deceptive (no urgency language, which the codebase's own `FORBIDDEN_COPY` list already blocks), but worth a conscious product decision rather than an implicit one, given this work's explicit instruction not to optimize for rushed decisions.

## 6. Privacy risks

- Nothing new beyond what's already well-documented in `CHILD_SAFETY_THREAT_MODEL.md` and `MINOR_AND_FAMILY_PRIVACY.md` — both are thorough and I found no gap in their reasoning worth adding to. The one thing worth restating here because it's easy to lose in a large corpus: **every group/family/network-effect document in this handoff is descriptive of a model, not authorization to build family or minor features** — the adult-only ship-gate (`RELATIONSHIP_SAFETY_RULES.md`) governs, unchanged, for all of them.

## 7. Recommended first vertical slice

**Fix the booking-state copy defect, end to end, as the first slice.** Reasoning: it satisfies every constraint this assignment operates under — adult-only (no minor/family surface involved), no new external provider (no real booking integration, just honest copy about a demo scene), no Kafka/Foundation activation, and it's a direct, visible instance of both `OPAL_SPEED_TO_ALIGNMENT.md`'s authenticity boundary and `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` in action. It's already live and wrong, already independently confirmed by two separate reviews (the Peak Brand audit and my own firsthand check), and the fix direction is already prototyped in the Peak Brand package (explicit proposal-vs-execution states). This is copy and attribution only — no schema, no new consent surface, no backend dependency — so it's implementable in an afternoon once you or the founder authorizes touching the walkthrough content.

**Named alternative, if you'd rather start with a builder task instead of a copy fix:** a bounded, real-two-adult version of the alignment loop this handoff describes — take the existing hosted-synthetic activation + messaging path (Social Flow 16/17) and add the smallest possible instance of `ALIGNMENT_GAP_MODEL.md` + `MINIMUM_QUESTION_ENGINE.md`: detect one narrow kind of gap (an unconfirmed time in a plan-like exchange) and ask one narrow question about it, entirely within the existing synthetic-hosted envelope, no new provider, no new consent layer. This is a larger effort than the copy fix and touches live Elixir/Python code rather than static copy, so I'd sequence it after the copy fix, not instead of it.

I don't have authority to choose between these — that's yours. I can prototype either in this worktree on your signal.

## 8. Report

- **Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-claude-alignment`
- **Branch:** `architecture/speed-to-alignment-and-complete-journey`
- **Starting HEAD:** `c177ba6` (= `origin/main` at session start)
- **Commits made this session:**
  1. `bed0ddc` — `docs(coordination): independent repository understanding report`
  2. (this commit) — product/architecture package + this handoff

- **Files created:**
  - `docs/coordination/CLAUDE_REPOSITORY_UNDERSTANDING.md`
  - `docs/product/OPAL_SPEED_TO_ALIGNMENT.md`
  - `docs/product/OPAL_COMPLETE_SOCIAL_JOURNEY.md`
  - `docs/product/OPAL_AGE_12_COPY_SYSTEM.md`
  - `docs/product/OPAL_AUTHENTIC_ALIGNMENT.md`
  - `docs/product/OPAL_SOLO_AND_GROUP_ALIGNMENT.md`
  - `docs/product/OPAL_NETWORK_EFFECT_JOURNEYS.md`
  - `docs/architecture/ALIGNMENT_GAP_MODEL.md`
  - `docs/architecture/MINIMUM_QUESTION_ENGINE.md`
  - `docs/architecture/PERMISSIONED_RELATIONSHIP_KNOWLEDGE.md`
  - `docs/architecture/LOCATION_ALIGNMENT_ENGINE.md`
  - `docs/product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md`
  - `docs/coordination/CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md` (this file)

- **Validation:** This is a documentation-only deliverable. What I actually verified: I read the cited source files firsthand (not secondhand from research-agent summaries) for the two highest-stakes claims in this handoff — the Peak Brand handoff header text, and the exact live copy at `FirstRunExperience.tsx:201-203` — and every other citation in these documents points to a specific existing file I or a research pass read directly. I did not run the Elixir, Python, web, or mobile test suites, and nothing in this handoff should be read as claiming test execution or runtime verification — that wasn't in scope for this assignment.

- **Open questions for you:**
  1. Which of the two options in §7 do you want first — the copy fix, or the bounded gap/question-engine prototype?
  2. Should the AI-master consent-default inconsistency (§4) go to the founder now, or wait until a consent UI is actually being built?
  3. Do you want the dual-AI coordination pattern (§2) tightened with a clearer visual marker before it's used again?

I'll wait for your next assignment before touching any runtime code.
