# Repair #17 — Track W3: Walk-Surface UI Integrity

Branch: `muse/repair-17-w3` (base: R16 tip `2c1bdcd2`). Web: `apps/opal_web`.
One backend projection field added (see Finding 3) — genuinely missing, per orders.

New tests: `apps/opal_web/src/opalUi/repair17UiIntegrity.test.tsx` (12 tests, all green)
plus 2 backend tests in `home_projection_test.exs` (see Backend note).

---

## Finding 1 — Add Story composer renders BEHIND the social/Home screen

**Root cause.** `StoryCreateFlow` was rendered inline as a child of the `.app`
member shell (`OpalApp.tsx`, `{storyCreateOpen ? <StoryCreateFlow/> : null}`).
Its CSS is `position: fixed; z-index: 80` (native host: 10060), but a fixed
element's z-index only competes inside its own stacking context — the shell
and the Home surface's layered descendants (transformed/filtered surfaces
create their own contexts) painted over it, so the founder saw the composer
trapped inside a frame behind Home. Other top-layer surfaces in this codebase
(`CallSurfaces`, the full-live destination) already avoid this by portaling
to `document.body`; the story composer never got that treatment.

**Fix** (`src/opalUi/StoryCreateFlow.tsx`). The flow JSX is built once and
returned via `createPortal(flow, document.body)` (SSR-guarded), tagged
`data-top-layer="portal-body"`. Mount point is now the root stacking level;
the existing `.story-create-flow` layer rules (z-index 80, native-host
10060 !important, full-bleed) apply there and it is fully interactive.

**Proof.** Component test renders `StoryCreateFlow` inside a fake app shell
and asserts the `[data-testid="story-create-flow"]` node's parent is
`document.body` and the host does not contain it; CSS source assertions pin
the z-index 80 / native 10060 rules.

## Finding 2 — Chat-list pill overflow ("coast" hangs outside its pill)

**Root cause.** In `ChatsHome.tsx` the plan pill (`.chats-plan-pill`) rendered
its label as a bare text node. The pill is `display: inline-flex`, so the text
became an *anonymous flex item* — `text-overflow: ellipsis` on the pill never
applies to anonymous items, so nothing truncated. Compounding it, the pill had
`flex-shrink: 0` inside a `white-space: nowrap` flex meta-row: with a long
label (Maya's "Farmers market + coast") the pill could not shrink to its
`max-width: 58%`, the row overflowed, and the tail of the label painted
outside the pill's border/background.

**Fix.**
- `ChatsHome.tsx`: label now renders inside
  `<span className="chats-plan-pill-label">` — a real box that can truncate.
- `styles.css` `.chats-plan-pill`: `flex-shrink: 0` → `flex: 0 1 auto` +
  `min-width: 0`, so `max-width: 58%` actually binds in the row.
- New `.chats-plan-pill-label`: `display:block; min-width:0; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap` — no text can render outside
  the pill bounds.
- Audit of the same component's other pills/chips: `.chats-home-connection`
  already ellipsized; `.chats-unread-badge` is numeric and capped by
  `formatUnread`; the Calls-surface sibling `.calls-signal-label` /
  `.calls-signal-action` could overflow its row on a single long word — added
  `min-width: 0; overflow-wrap: anywhere`. Other chip classes in the app
  (`.gsh-chip` filters etc.) are not chat-list pills and wrap in flow; no
  other instance of the bare-text-in-flex-pill class exists in ChatsHome.

**Proof.** Component test renders a row with a very long pill label and
asserts the label lives in `.chats-plan-pill-label`, the pill has no bare
text child nodes, and CSS source assertions pin the shrink + ellipsis rules.

## Finding 3 — Status colors must come from a single source

**Root cause (two layers).**
1. Every projection-backed surface hand-rolled its own `planSurfaceState`
   call from `chats[].planProjection`: the chat list (OpalApp rows builder),
   the Graphs live-cards builder (OpalApp), `canonicalGraphFromChat`
   (graphReality.ts), and the thread's strand check — four copies of the same
   derivation that could (and did) drift.
2. A real divergence the copies could not even express: the thread header
   derives "action needed" from `alignment.change_proposal.proposed_by_user_id`
   (a change proposed by the *other* person needs this viewer → red #FF4D5E),
   but the backend plan projection (`HomeProjection`) only projected
   `pending_proposal_value` / `pending_proposal_field` — **the proposer field
   was genuinely missing**. List/Graphs therefore mapped every pending change
   to "forming" (violet) while the thread showed "action" (red) for the same
   plan at the same moment: exactly the founder's "status changed in the
   thread, chat-list color didn't."

**Fix.**
- Backend `apps/opal_core/lib/opal_core/social_flow/home_projection.ex`:
  `maybe_put_pending_proposal` now also projects
  `pending_proposal_by_user_id` from `change_proposal["proposed_by_user_id"]`
  (participant-scoped card; participants already see the proposer in-thread).
  Two tests added (projects the id; absent when no proposal).
- Web `data.ts` + `graphReality.ts` `clientPlanFields`: carry
  `pending_proposal_by_user_id` through the client projection type.
- Web `src/opalUi/nextPlan.ts`: new `planProjectionSurfaceState(projection,
  viewerUserId)` — the ONE derivation for projection-backed surfaces,
  including the thread's `needsViewer` term (pending change proposed by
  someone other than the viewer → `action`).
- Rewired all projection consumers to it: chat-list rows (OpalApp),
  Graphs `liveGraphs` builder (OpalApp), thread strand check (OpalApp),
  `canonicalGraphFromChat` (graphReality.ts). `GraphsHome` renders the
  `status` it is handed, so it converges through the builder. Colors still
  resolve through the canonical `planStateColors` mapping / `--plan-state-*`
  tokens (action #FF4D5E, ready #FFC86B, past white, forming #8B5CF6,
  happening #00E5FF) — unchanged product law, now fed by one state source.
- Residual, by design: the thread *header* strip still derives from the live
  `alignment` object (it additionally knows reservation-approval state that
  the projection does not carry). Its change-proposal term is now identical
  in shape to the shared derivation, and both read the same underlying plan
  state; the list can no longer lag a proposal-driven change.

**Proof.** Unit tests: other-proposed change → `action` + `planStateColor`
= #FF4D5E; viewer-proposed → `forming`; ready/past/happening resolve through
the same function to the canonical hexes. Source assertions pin the OpalApp
call sites to the shared function, assert the old list-local derivation is
gone, and pin the proposer plumbing in `data.ts` / `graphReality.ts`.

## Finding 4 — Composer integrity

**(a) Stray "›" chevron inside the composer.** Root cause: the voice button
(`data-testid="composer-voice"`, OpalApp thread composer) rendered the text
glyph `〉` when idle (`{voiceRecording ? "■" : "〉"}`) — a chevron character
sitting between the "Message Chanelle" input and the send button, exactly as
the founder described. Fix: the button now renders a proper mic SVG
(`VoiceMicIcon`, same stroke family as `SendIcon`); recording state is
carried by `data-recording` (existing red CSS) + aria-label. No text glyph
remains in the composer; a test asserts the chevron character appears nowhere
in `OpalApp.tsx` and the composer form region contains no `›`/`〉`.

**(b) Elements clash into the composer while typing.** Verified the Repair
#11 KEYBOARD_SAFE CSS still matches the current markup: the form carries
`composer glass composer-618`, the dock carries `tabbar tabbar-option-b`,
and the `:has(.composer-618:focus-within)` rules (composer → `position:fixed`
at the visual viewport, dock hidden) are intact for both the phone media
query and the native host — pinned by test. One real clash remained: the
input's text ran *under* the absolutely-positioned voice button while typing
— the form's right padding is 48px but the voice button spans 44–76px from
the right edge, overlapping the input's content box by ~28px (the send button
at right:10 sits inside the padded zone). Fix: `.composer-618 .composer-input`
gains `padding: 0 36px 0 8px`, so typed text and the caret always clear both
controls.

**(c) NEXT TOGETHER / plan card overlaps bubbles, ghost text at 0.94 alpha.**
Root cause: `.alignment-card` (the in-thread plan card that docks over the
thread scroll in its `is-sheet` sticky form) had
`background: rgba(11, 18, 38, 0.94)` — the exact 0.94 alpha in the founder's
screenshot — so message bubbles scrolling beneath it showed through. Fix:
background is now fully opaque `rgb(11, 18, 38)` (same opaque law the
next-plan-strip received in F12-08; the strip itself was already opaque).
The card remains in flow / properly docked (sticky), and at full opacity no
bubble text can ghost through it. Test pins the opaque background on the
`.alignment-card` rule.

---

## Verification

- New web tests: `repair17UiIntegrity.test.tsx` — 12/12 green.
- Touched-area suites (ChatsHome/founder pills/chats hydration, story
  repair15/16, home social actions, physical closeout, planStateColors,
  native host media bridge): green, except `graphDetail.test.ts` (1 failure)
  which fails identically on the pristine R16 tip — pre-existing, part of
  the R16 baseline set.
- Typecheck: 7 `tsc` errors, set-identical to the R16 baseline (same files,
  modulo line numbers) — no new type errors.
- Backend: this VM has no Erlang runtime (`erl` not installed — only the
  Elixir launcher scripts in `~/workspace/elixir/bin`), so `mix test` could
  not execute here. The backend change is one `maybe_put_binary` pipe step
  mirroring the two adjacent lines, plus tests. Command for a host with OTP:
  `cd apps/opal_core && export PATH=~/workspace/elixir/bin:$PATH MIX_DEPS_PATH=/tmp/opal_deps && mix test test/opal_core/social_flow/home_projection_test.exs`
  (and `mix precommit` per apps/opal_core/AGENTS.md).

## Full web suite result

Full suite run on this branch and, for comparison, on the pristine R16
worktree in the same environment:

- Baseline (R16 tip, this VM): 1163 tests, **25 failed**, 1138 passed.
- This branch: **25 failed** — the failing test names are **byte-identical**
  to the baseline set (verified by diffing the sorted failing-name lists
  from both runs; empty diff). 12 new tests added, all green.
- Caveat: during this branch's full run, 9 test files failed at suite level
  with `ENOSPC: no space left on device` (transient overlay exhaustion —
  disk healthy before/after), so their 45 tests were uncounted in that run
  (1130 counted). Re-run immediately after: all 9 files, 45/45 tests green.
  Effective totals: 1175 tests (1163 + 12 new), 25 failing (baseline set),
  1150 passing.
