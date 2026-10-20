# Repair #19 — Founder Polish Wave, Cluster A (Cards): report

Branch `muse/r19-polish-cards`, commit `7c8b70a2` on base `95319bd7`. Not merged, not pushed. FOUNDER_ACCEPTED = NO. No pack captures taken; no ledger edits.

## WIP audit verdict

A prior worker on this task was killed by a runtime restart, leaving the full implementation uncommitted in the worktree. I audited every hunk against the spec, the ambient rulebook, and the live backend machinery before keeping any of it.

**Kept as-is (verified correct and complete):**

- `reveal.ex` — the P1 derivation (`change_request_for/2`) lives in the one reveal derivation, is attached only to P1 items, and every other item is explicitly backfilled `change_request: nil` in `apply_ceilings/1` (honest absence, never a missing key). Scope-person rule (creator if another participant, else first other participant) verified against `plan_participant_ids/1` and `User` lookup, both already aliased/present.
- `productClient.ts` — `RevealChangeRequest` type + `change_request?` on `RevealItem`; the type's alternative fields match `Availability.shared_safe_projection/1` exactly (`share_id`, `owner_user_id`, `display_start`, `display_end`, `open_ended`, `timezone`).
- `changeRequestLane.ts` (new) — a render gate only; it re-derives nothing. It fails closed on a malformed/mismatched lane (blank label, conversation mismatch with the item, zero alternatives, missing scope person) and on a missing handler (no dead controls).
- `RevealCard.tsx` / `RevealCard.css` — lane button sits between the primary action and Dismiss in both the card form and the chats-list line form (list form stop-propagates, matching its Dismiss); P5 cue is a plain text micro-label with no color, fire, or motion of its own.
- `C2CenterOpening.tsx` — all five deck `RevealCard` sites pass `onRequestChange`; no deck site was missed (verified by grep over every `RevealCard`/`RevealListLine` usage in the web app).
- `C1Surfaces.tsx` — `PeopleChatsList` rows and `ThreadShell` both thread the handler through.
- `C1ShellHosts.tsx` — `changeRequestContext/1` builds the doorway context only from the backend lane object; deck enters via the host's existing `openDoorway`, chats row/thread via the existing `onTalkToOpal` routing, and when `onTalkToOpal` is absent the row handler is `undefined` (button absent, never dead).
- Both test files (see Tests).

**Fixed (WIP defects found in audit):**

1. `availability.ex` — the new function's `@doc` was inserted between `compute_overlap`'s `@doc` and its definition, producing a "redefining @doc previously set" warning and silently detaching `compute_overlap`'s documentation. The `compute_overlap` doc now sits directly above `compute_overlap` again; the new function's doc sits above its own head. Warning gone.
2. `availability.ex` — `alternative_windows_for/3` declared a default (`\\ nil`) on one clause of a multi-clause function, producing the defaults-should-be-in-a-header warning. It now has a proper function head carrying the default.
3. The new backend test file was not `mix format`-clean (over-length lines); formatted. (The two modified `.ex` files' WIP hunks were already format-clean; the formatter differences in those files are entirely pre-existing base drift — base `95319bd7` copies of both files also fail `--check-formatted`, so no whole-file reformat was applied.)

**Discarded:** nothing. No part of the WIP had to be thrown away; the two doc/head defects above were the only incorrect pieces.

## Investigation findings — where the truth lives

- **Permission** is conversation-membership, enforced by the machinery the lane enters: `Availability.ensure_member/2` answers `:not_a_member` for non-members, and `ConversationAlignment.propose_committed_change/5` is member-gated the same way (`conversation_alignment.ex:1141-1144`). The reveal derivation additionally requires: the plan carries a conversation, another party exists to propose to, and no `PlanRevision` in `"proposed"` state is already on the table (that state owns the Accept / Keep respond lane, not a second request).
- **Alternatives** have exactly one truthful source today: availability windows another party has shared into the plan's conversation (`Availability.alternative_windows_for/3`, built on the existing `active_share_rows/1` usability rule — active share, window not expired, not ended). The viewer's own shares are excluded, and a window starting at the plan's current start is excluded (it is the time already on the table). There is no other candidate-time source in the system (no overlap computation is used — alternatives are offered times, not computed intersections).
- **The change flow the action enters** is the existing one: the plan-scoped Opal chat, whose pipeline routes a spoken change through `SocialFlow.apply_nl_schedule_change/1` (`social_flow.ex:2816`, non-lead participants route to `propose_revision/1`) and `ConversationAlignment.propose_committed_change/5` (which itself folds into `propose_revision/1`, `conversation_alignment.ex:1182`). No new endpoint, no parallel path, no migration.
- **Sender-fixed class:** a plan with no conversation (Center / trip / solo origin) has no member-gated change path from the viewer's seat, so the lane is absent for that whole class by construction (`change_request_for/2` falls through to `nil`).

## Builds, file by file

- `apps/opal_core/lib/opal_core/social_flow/availability.ex` (+~44) — `alternative_windows_for/3`: member gate, other parties' still-usable shared windows, current-start exclusion, shared-safe projections only.
- `apps/opal_core/lib/opal_core/social_flow/reveal.ex` (+~115) — `change_request` on P1 items from `change_request_for/2` (permission x alternatives, pending-revision suppression, scope person); explicit `nil` on all other items.
- `apps/opal_core/test/opal_core/social_flow/repair19_polish_cards_change_lane_test.exs` (new) — backend matrix pins.
- `apps/opal_web/src/api/productClient.ts` (+28) — `RevealChangeRequest` type.
- `apps/opal_web/src/opalUi/c1/changeRequestLane.ts` (new) — the one fail-closed render gate.
- `apps/opal_web/src/opalUi/c1/RevealCard.tsx` (+59) / `RevealCard.css` (+27) — third action on card + list forms; P5 lit cue (`LIT_REVEAL_CUE = "Opal's pick"`), rendered only when the item is lit and not P6 (i.e. only where the fire frame actually renders); list form carries no cue.
- `apps/opal_web/src/opalUi/c1/C1Surfaces.tsx` (+10) — row and thread handler plumbing.
- `apps/opal_web/src/c2/shell/C2CenterOpening.tsx` (+15) — `requestChangeReveal` event plumbed to all deck card sites.
- `apps/opal_web/src/c2/shell/C1ShellHosts.tsx` (+46) — `changeRequestContext/1` + host wiring for deck, chats rows, and thread.
- `apps/opal_web/src/opalUi/c1/polishCards.test.tsx` (new) — web pins.

## P5 sanction check

The rulebook's AR-05 entry names the lit reveal's channels as "gradient + state-tinted glow / the gradient ring itself / glyph + kicker text on the card" and AR-00.5 requires a second, non-color channel. The cue is exactly that sanctioned second channel: a plain-words micro-label ("Opal's pick") inside the lit card's existing fire frame. It adds no fire anywhere: unlit cards, P6, and the chats-list form render no cue, and a pin proves exactly one cue across a lit + unlit pair (scarcity intact).

## Novelty mandate record (per pattern)

Judged on: quiet, informative, never noisy, identity bar; clarity is the senior criterion.

### Pattern 1 — time display on cards

- **Floor (current):** one finished absolute string from the backend (`plan_when_label/1`: the author's `time_label`, else weekday/date/time formatted from `start_at` in the plan's own timezone), carried in the card's substance line next to where; the kicker + plan-state word answers "what needs you."
- **Alternative considered — relative-first time ("in 3 days · Sat 7:30 PM"):** rejected. No relative field exists in the one projection; computing it in the web would be a parallel derivation, and computing it server-side goes stale between read and view while still duplicating the absolute time the reader actually needs to decide. It adds words without adding an answer.
- **Alternative considered — proximity made ambient (border warms as the time nears):** rejected. It loads a second meaning onto channels that already have exactly one (state borders mean plan state; fire means Opal is speaking), violating the one-meaning rule, and it gets noisier precisely when many plans cluster. It also fails the not-color-alone parity bar.
- **Pick: the floor, unchanged.** Quietest option, single-source, never stale, and the absolute time is the senior-clear answer to the only question that matters — can I be there then.

### Pattern 2 — request-a-change affordance

- **Floor (current):** a plain third text action, "Request a change" (backend label, verbatim), beside Confirm / Dismiss, present only on permission x alternatives and gone when either closes.
- **Alternative considered — alternative-named label ("Propose Sat 2 PM instead"):** rejected. A lane can carry several alternatives; naming one implies Opal picked it, which is false, and it collides with the lit card's "Opal's pick" meaning. It is also the longest, noisiest label in the action row, and the reader must still open the flow to see the other options.
- **Alternative considered — inline alternative chips on the card, one tap proposes that time:** rejected for this wave. The card sits under a quiet budget and chips multiply controls on every needs-you card; worse, the existing doorway has no truthful pre-selected-alternative input, so wiring chips would mean building a parallel proposal path. Alternatives belong inside the change flow, where the conversation context lives.
- **Alternative considered — count-bearing label ("Request a change · 2 other times"):** rejected. The count is trivia at the decision point and lengthens every card to say it.
- **Alternative considered — gesture-only (long-press / swipe):** rejected outright. Hidden affordances fail the legibility bar and the unsure-user path.
- **Pick: the floor.** The novelty in this pattern is already where it earns its place — presence itself is state-driven signal (the action exists only while a real change is proposable), and a plain discoverable word beats a cleverer label on clarity.

## Tests — exact commands and results

Backend (env: OTP 27.3.4.2 + Elixir on PATH, `ELIXIR_ERL_OPTIONS="+fnu"`, scratch `MIX_DEPS_PATH`/`MIX_HOME`/`MIX_BUILD_PATH` under `~/workspace/opal-graph/polish-scratch-cards/`, `DATABASE_URL="ecto://postgres:postgres@127.0.0.1:5433/opal_core_test"` — Postgres 16 on port 5433 verified up; note the test config alone targets 5432, the URL override is required):

- `mix test test/opal_core/social_flow/repair19_polish_cards_change_lane_test.exs` → **10 tests, 0 failures.** Matrix: both-true present with finished truth (label, conversation, scope person, alternative projection); no shares → absent; viewer's own share only → absent; other party's window at the plan's current start → absent; disappearance on share revoke; disappearance on window expiry; non-member participant → absent (plus `alternative_windows_for/3` itself answering `:not_a_member`); conversation-less sender-fixed plan → absent; proposed revision already on the table → absent; ready (P2) plan → absent.
- `mix test test/opal_core/social_flow/availability_alignment_test.exs test/opal_core/social_flow/availability_hardening_test.exs test/opal_core_web/repair18_dir4_reveal_test.exs` → **28 tests, 0 failures** (adjacent suites, regression guard).
- Full compile of `opal_core` + `opal_core_web` succeeded during these runs; zero warnings reference either touched backend file after the audit fixes (the repo carries many pre-existing warnings elsewhere).

Web (`cd apps/opal_web`, `node_modules` already present):

- `npx vitest run src/opalUi/c1/polishCards.test.tsx` → **17 tests passed.** Gate matrix (lane x handler, malformed lanes fail closed), button order Confirm → Request a change → Dismiss on the deck card, lane present/absent on thread and chats-list forms, P5 cue on lit deck + thread cards only, no cue on unlit / P6 / list form, exactly one cue across a lit + unlit pair.
- `npx vitest run` (full suite) → **23 failed / 1767 passed; 16 failed files / 228** — identical to the base floor, no growth; none of the 16 failing files is a touched file, and `polishCards.test.tsx` passed inside the full run.
- `npx tsc -p tsconfig.json --noEmit` → **exactly 9 errors**, all pre-existing, none in a touched file (3 in `OpalApp.tsx`, 5 duplicate-identifier errors at `productClient.ts:5186+`, 1 in `YouSettingsDestination.tsx`).

## Honest absences

- **Conversation-less plans never show the lane** (sender-fixed class) — by design and declared above; Confirm / Dismiss are their only truthful actions today.
- **No plan class other than P1 conversation plans has an alternatives source.** P2/P3/P4 items carry `change_request: nil` always; if a future wave wants a change lane on ready plans, it needs its own derivation decision, not a surface change.
- **The lane does not preselect an alternative.** It enters the scoped change flow; the specific new time is proposed inside that flow through the existing machinery. The lane object carries the alternative windows as finished truth for that flow to speak from.
- **No pack captures** (per instructions) and no rendered-layer walk was performed by this cluster; the frame list below is the integrator's capture contract.
- `mix precommit` was not run as a gate: its `compile --warnings-as-errors` and `format` steps fail at base `95319bd7` on pre-existing warnings/format drift unrelated to this change (verified on pristine base copies). The scoped equivalents (targeted compile with zero warnings in touched files, format-clean WIP hunks, all suites above) were run instead.

## Frame list (for the integrator)

Seeded-app conditions for the lane to exist at all: the viewer is a participant with a pending answer on a plan that belongs to a conversation the viewer is a member of; another participant has shared an availability window into that same conversation that starts at a time different from the plan's current start and is still open; no revision is in `"proposed"` state on that plan. If the seed lacks that combination, seed it exactly that way — without it the lane's absence is the truthful state, not a defect.

1. **Center deck, Needs-you group — dark mode.** Reach: open the app signed in as the viewer above → Center. The P1 card for the seeded plan shows, in one action row: Confirm, Request a change, Dismiss. If this card is the deck's lit card, it also carries the "Opal's pick" micro-label in its header beside the kicker, inside the fire frame.
2. **Center deck, Needs-you group — light mode.** Same reach, light mode. Same three actions; same lit cue if the card is lit. Any second (unlit) reveal card in the deck shows no cue and no fire.
3. **Chat thread — dark and light modes.** Reach: Chats → the conversation the seeded plan belongs to. The YOUR MOVE card at the thread head shows Confirm, Request a change, Dismiss; the "Opal's pick" cue appears only if this card is the surface's lit card.
4. **Chats list row — dark and light modes.** Reach: Chats list, before opening any thread. The row for that conversation shows the P1 mini-card with Request a change as a real button beside Dismiss. **No** "Opal's pick" cue on this form in any state (the list form never carries fire).
5. **Disappearance frame — either mode, deck or thread.** Reach: revoke (or let expire) the other participant's shared availability window, then reload the surface. The same card now shows only Confirm and Dismiss; no Request a change anywhere on the surface.
6. **Sender-fixed absence frame — either mode, deck.** Reach: a needs-you card for a plan with no conversation (Center-origin). It shows Confirm and Dismiss only — Request a change must not appear.
7. **Doorway frame — either mode.** Reach: tap Request a change on the deck card from frame 1. The plan-scoped Opal chat opens for that plan and person (the existing change-proposal doorway) — no new screen, no separate form.
