# Repair #15 — Track G: Canonical Venue Surgery

Branch: `muse/repair-15-gh` (from Repair #14 tip `025a0289`).
File: `apps/opal_core/lib/opal_core/social_flow/conversation_alignment.ex`
(+ `candidate_provider.ex`, which now owns catalog recognition).

## Outcome: DONE (not stopped)

The surgery proved safe: every old behavior is either preserved exactly or
extended along the system's own existing semantics, and each call site has a
regression test (below). No call site needed behavior the fold could not
prove equivalent-or-better, so the STOP/revert path was not taken.

## Old semantics

`canonical_from_text/1` (private, ~line 2004 at base) recognized exactly
three places by substring:

- contains "juniper" → "Juniper & Ivy"
- contains "herb" AND "wood" → "Herb & Wood"
- contains "fort" AND "oak" → "Fort Oak"
- anything else → `nil` (= not a place, everywhere it was used)

That list — not confirmation, not any provider — decided place semantics at
six call sites. Consequences at base:

- The CandidateProvider catalog has SIX places; its coffee / active / quiet
  candidates (Bird Rock Coffee, Torrey Pines, Meditation Gardens) were
  offered in the UI but could never be proposed, locked, restored, or
  nominated. Tapping Bird Rock Coffee in the UI called `nominate_place/3`,
  which returned `{:error, :unknown_place}` for it.
- A plan stored with any other locked place silently LOST its place on the
  next resync (restore synthesis skipped it).
- Chat could never surface a place the group actually named unless it was
  one of the three.

## New semantics (the design rule)

**A place locks because participants confirmed it, and it is recognized
because a real pipeline produced it — never because its name is on a list.**

The fold's lock mechanics were already name-agnostic (`lock_place/5`,
`accept_place`, `propose_place`, conflict/converge never checked the list);
only the *entry gates* checked it. The surgery genericizes the gates:

1. **Catalog recognition lives in the provider.** `CandidateProvider.
   catalog_match/1` matches a text against the provider's own catalog
   (full name, all name tokens, or distinctive first token — preserving
   the old partial-mention behavior, e.g. "juniper" → "Juniper & Ivy").
   The alignment module hardcodes no venue names anymore.
2. **Structured values are trusted as structured.** `place_propose` and
   `place_lock` are explicit actions whose value IS a name (the same trust
   the fold gives `exact_time_lock` / `activity_lock` values). Replay
   resolves them via `place_name_from_value/1`: catalog mention →
   catalog spelling; any other *plausible* name → verbatim; implausible
   values (blank, bare time "6:30 PM", bare activity "dinner", generic
   words) → ignored, exactly as unknown names were ignored before.
3. **Chat extraction is generic.** After a proposal cue ("let's do / lets
   do / make it / actually"), the fold first tries the catalog, then a
   generic capitalized-phrase extraction from the original body (the R14
   extractor grammar): "Let's do Harbor Table" proposes Harbor Table.
   Guards: trailing day/month words trimmed; activities, generic words,
   times, and days rejected; a single capitalized word followed by a
   speech verb is a person, not a place ("Actually Maya said…" proposes
   nothing). Extraction only ever creates a CANDIDATE — locking still
   requires peer confirm / both-selected / convergence.
4. **Nomination resolves through pipelines, in authority order**
   (`nominate_place/3`): (1) a candidate currently offered by
   CandidateProvider for the plan's activity; (2) a name already carried
   by this plan's own place state (candidate / conflict proposal /
   conflict option — the gyroscope: the plan's state is the authority);
   (3) a catalog place not offered for this activity →
   `:activity_not_ready` (preserved); anything else → `:unknown_place`
   (preserved, honest). A brand-new real-world venue enters via chat
   proposal or the Center Geoapify exact-entity pipeline, not via this
   button endpoint inventing a resolution it did not perform.
5. **Restore trusts stored state.** Synthesis of a `place_lock` from a
   stored alignment now fires for ANY locked non-blank place value:
   locked stays locked because it was locked, not because it is listed.
6. **Accepted place changes** already fell back to the raw value
   (`canonical || value`); they now use `catalog_match || value` — same
   shape, provider-owned recognition.

Gyroscope note: no new place state was introduced. All paths write through
the same `propose_place` / `lock_place` fold fields; Center/Geoapify venues
continue to live in their existing fields and enter conversation state only
through the same explicit actions as before.

## Per-call-site proof

| # | Call site (base line) | Old | New | Regression tests |
|---|---|---|---|---|
| 1 | `note_place` chat extraction (~871) | 3 names only | catalog (all 6) + generic named-place after cue; candidate only | `conversation_alignment_canonical_venue_test.exs`: Harbor Table propose→peer-yes lock; Contramar trailing-talk; Bird Rock chat; guards (times/activities/days/people); retarget of locked generic place |
| 2 | `place_propose` action replay (~1061) | ignored unless 3 names | any plausible structured name proposes; garbage still ignored | coffee Bird Rock propose+confirm locks; Torrey Pines both-selected locks; garbage values ("6:30 PM", "", "dinner", "7") ignored; generic conflict/converge |
| 3 | `place_lock` action replay (~1098) | ignored unless 3 names | any plausible name restores verbatim; partial catalog mentions still normalize | place_lock "Harbor Table" → locked/restored; place_lock "juniper" → "Juniper & Ivy" |
| 4 | `apply_accepted_change` place (~1609) | `canonical \|\| value` | `catalog_match \|\| value` | accepted place change locks "Harbor Table" (lock_reason change_accepted) |
| 5 | `maybe_synth_place` restore synthesis (~1698) | synth only for 3 names; other locked places dropped on resync | synth for any locked non-blank value | DB tests: stored locked "Harbor Table" survives `sync_conversation` (locked/restored); stored locked "Fort Oak" still survives |
| 6 | `nominate_place` via `canonical_place` (~342) | `:unknown_place` unless 3 names (even for offered Bird Rock Coffee) | offered → ok; in-plan → ok; catalog-but-wrong-activity → `:activity_not_ready`; otherwise `:unknown_place`; `:place_locked` and `:not_a_member` precedence preserved | DB tests on fresh randomized accounts: coffee/Bird Rock nominates; Juniper under coffee → activity_not_ready; "Harbor Table" fresh → unknown_place; conflict-option re-nomination of generic place locks it; non-member refused |

All pre-existing alignment tests (19 in `conversation_alignment_test.exs`
plus the contract / datetime / execution / calls suites that fold places)
continue to pass unchanged — the three original restaurants behave exactly
as before, including partial mentions, conflict options ordering, and
lock reasons.

Final verification (this branch, `mix test --seed 0`): **2,682 tests,
0 failures** = 2,655 (R14 baseline) + 27 new (14 fold + 7 DB + 6 Track H).
New Track G tests: 21, all passing.

## What was deliberately NOT done

- No Geoapify/Google call inside the fold. The fold is a pure, replayed
  projection of messages + explicit actions; a network/provider call there
  would make replay non-deterministic. Resolution-by-provider happens in
  the Center pipeline (as before); conversation places resolve by
  participant confirmation (as the lock mechanics always required).
- `CandidateProvider`'s catalog itself is unchanged (it is a labeled
  curated catalog boundary, dispositioned as such in R14's audit). What
  changed is that recognition is read from the provider instead of a
  second, smaller, hardcoded list in the alignment module.
- No place can lock on a single mention: every lock path still requires a
  second participant's confirm, a both-selected convergence, an accepted
  committed change, or a prior locked state being restored.
