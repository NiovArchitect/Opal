# Repair #19 - WAVE W5: CHATS LIST LAYOUT + THREAD STRIP - report

Branch `muse/r19-chatsthread` off `muse/repair-19` base `f2981dbf`,
worktree `~/workspace/opal-graph/wt-r19-chatsthread`. Three commits,
no push (coordinator merges):

- `fde2f343` W5-06 chats list: in-row reveal/plan blocks become
  full-width mini-cards; rows wear state-coded ambient borders
- `10cd7ce8` W5-07 thread: Next Together strip anchored + solid
  (supersedes deckfix F2b in-flow form)
- `58c7d75d` W5 regression: `r19ChatsThread.test.tsx` (14 tests)

FOUNDER_ACCEPTED stays NO. Backend untouched (no projection needed
changing - both fixes are presentation of facts that already ride
the contracts), so backend/API baselines are untouched by
construction (no backend files in the diff).

---

## 1. Root causes (diagnosed at source)

### (A) Chats list stacked column - DIR-4 P1 line takeover, compounded by DIR-1

The founder's screenshot text - "Confirm / - / Dinner / at /
Juniper / and Ivy", one word per line, Dismiss floating beside it -
is `RevealListLine` (`apps/opal_web/src/opalUi/c1/RevealCard.tsx`,
the DIR-4 entry-7 chats-list form), word for word: it rendered
`` `${action_label} - ${title}` `` ("Confirm - Dinner at Juniper
and Ivy") as ONE text run.

Three structural defects composed the collapse:

1. **Flattened grammar.** The list form discarded the reveal's own
   card grammar (kicker / title / substance / actions) and squeezed
   the whole item into a single inline text string plus a button.
   The item's `substance` (when/where) was not rendered at all.
2. **No width contract.** `.reveal-list-line` was `display:flex;
   align-items:center` with two children - a bare text span and the
   Dismiss button - and NEITHER the line, the text span, nor any
   ancestor up to the row's main column carried
   `flex: 1 / min-width: 0 / width: 100% / overflow-wrap` rules for
   it. The Dismiss button (non-wrapping, shrink-resistant) claimed
   its width first and the text span took the remainder at
   min-content pressure inside the row's flex chain - the classic
   one-word-per-line column.
3. **Invalid nesting.** The line lived inside the row, and the row
   was a `<button>` - so the Dismiss `<button>` was a button inside
   a button, whose flex descendants have no reliable layout in the
   row.

The DIR-1 PlanAwareness row variant had the same disease in milder
form: one `white-space: nowrap` text run ("Title - When - Where")
inside an inline-flex pill, and on the legacy surface it rendered
inside the flex `.chats-home-meta-row`, squeezed beside the
connection label.

### (B) Thread strip translucency

The C1 Next Together strip (`.c1-next-strip`,
`ThreadShell`/`NextTogetherStrip` in `C1Surfaces.tsx`) had NO
background at all - `display:flex; flex-direction:column; gap:8px`
- and the element it carries, PlanAwareness variant `strip`, paints
`background: transparent` (its ambient unify treatment is a
color-mix TOWARD transparent). The deckfix F2b in-flow form removed
the old sticky overlap but left the strip with no ground of its
own, so on scroll the eye reads message content through/behind the
strip zone - the founder's "you can see through it". The legacy
family confirms the pattern in CSS: the (dead) `.next-together-strip`
rule painted `rgba(110, 231, 245, 0.04)` - a 4% tint ground. The
live legacy `.next-plan-strip` was already opaque (F12-08,
`background: rgb(8, 16, 28)`) - verified, left as is.

## 2. What was built

### (A) The in-row block is now a mini-card (new layout spec)

`RevealListLine` (same export, same testid `reveal-list-line`, same
slot in the row) now renders the RevealCard grammar as a mini-card:

- head line: category glyph + kicker ("Your move") + entity dot
  (DIR-1 `--person-tint-*` token) + state word in `--reveal-state`;
- TITLE on its own full-width line (`data-testid="reveal-list-title"`),
  weight 650, `white-space: normal; overflow-wrap: anywhere`;
- SUBSTANCE on its own line (the derivation's finished string -
  rendered for the first time in the list form);
- ACTIONS ROW at the card's foot: the primary action ("Confirm") as
  a state-edged pill (the row itself is the open target, so no
  nested button is faked), Dismiss as the card's one real button,
  placed deliberately at the row's end (`margin-left: auto`).

Layout contract (pinned in tests AND measured in the rendered
probe, section 4): the card is `display:flex; flex-direction:
column; width: 100%; min-width: 0; box-sizing: border-box;
padding: 10px 12px`, state border at ambient intensity mixed from
`--reveal-state` (PLAN_STATE_HEX via the component), left edge 3px.

`PlanAwareness` variant `row` gets the same mini-card layout:
state pill owns the head line (`plan-awareness-head`), title owns
its own full-width line (`plan-awareness-title`), when/where ride
a separate meta line (`plan-awareness-meta`). Strip/call variants
keep the compact one-line form unchanged. On the legacy surface
the DIR-1 card moved OUT of the flex meta-row to the copy column's
full width below it (the legacy pill fallback stays in the row).

`PeopleChatsList` rows are no longer `<button>` elements: a row is
a `div` with `role="button"`, `tabIndex={0}`, click + Enter/Space
activation - the Dismiss button is no longer invalidly nested, and
no flex child of the row can be button-collapsed again.

### (A2) Rows wear the state-coded ambient border

Both chats lists (C1 `PeopleChatsList`, legacy `ChatsHome`):

- The row element carries `data-plan-state` ONLY from its existing
  single-source plan facts, in the order the row already renders
  them - C1: DIR-4 reveal `plan_state`, else DIR-1 `next_plan.state`,
  else the plan projection's `state`; legacy: DIR-1 `next_plan.state`,
  else the plan-consequence pill's `state` - normalized through the
  ONE `planStateFamily`. No new derivation anywhere (MP-3 law).
- `theme/unifyChats.css` paints the border ONLY under
  `[data-plan-state]`: `1px solid color-mix(in srgb,
  var(--orb-indicator-<state>) 52%, transparent)` plus the token's
  own glow at 40% - the canonical tokens (`--orb-indicator-*` ==
  PLAN_STATE_HEX, drift-pinned by test). Forming is dashed (its
  pattern cue). The previously borderless C1 default now applies
  only to `:not([data-plan-state])` rows.
- **Border reasons (ambient justification register, also recorded
  in `layoutContract.css` L8):** action border = "your answer is
  pending on this conversation's plan"; ready = "this
  conversation's plan is agreed and complete"; forming = "this
  conversation's plan is still taking shape"; happening = "this
  conversation's plan is in its live window"; past = "this
  conversation's plan has settled" (canon white, quieted, no glow -
  the stone at rest). A row with no plan wears NO state border -
  the border enters with the fact and exits with it (presence
  discipline).

### (B) The strip is SOLID and ANCHORED

`.c1-next-strip` (c1.css) is now:

```css
position: sticky; top: 0; z-index: var(--layer-chrome);
background: var(--canvas);
padding: 8px 0 10px; border-bottom: 1px solid var(--line-1);
```

- `--canvas` is the thread's own field token, a solid hex in BOTH
  modes (c2Tokens: light `#fffefb`, dark `#18141c`) - no rgba, no
  color-mix toward transparent, no backdrop-filter. Messages
  scroll UNDER the anchored strip and are covered by its opaque
  ground (measured, section 4). This is SOLID, not frosted:
  per the founder's blur-dissolve vs ghost-through precision note,
  the strip must never become frosted glass - the test pins
  `backdrop-filter` ABSENT from the rule. Frosted chrome (nav pad,
  top bars) is W3/W14's seam; the thread's own top bar
  (`.c1-header`, already sticky + opaque `var(--canvas)`) was NOT
  restyled - that is the seam, noted for W14, whose "Talk to Opal
  about this" doorway will build additively on the strip's
  plan-awareness area (the strip's structure - kicker + one
  PlanAwareness element in a clean container - was kept exactly so
  it can).
- State treatment intact: the PlanAwareness border/glow from
  `--pa-state` (unify sheet) is untouched, and the PROTECTED thread
  YOUR MOVE fire-frame card is untouched - no diff hunk touches
  `RevealCard`'s card form, `FireFrame`, or the thread reveal slot.
- The deckfix F2b pin was amended (not deleted) with the reason
  recorded in the test: F2b's law was "no see-through strip"; W5-07
  closes it by the opaque ground instead of by un-anchoring, per
  the founder's explicit ruling. The layout contract's L8 registry
  now records the strip's anchored/solid form and the chats-row
  border row. Legacy: `.next-together-strip`'s 4% tint ground
  becomes the opaque `var(--surface-raised)` token.

## 3. Design notes - Apple discipline, Opal identity, parity/invention

- **Journey-first, hierarchy (Apple bar):** the chats list is a
  scanning journey - name, preview, then ONE thing that may need
  you. The mini-card restores a strict reading order inside the
  row (what state -> what plan -> when/where -> the one action),
  so the eye never has to reassemble a flattened string. The strip
  stays the thread's single anchored summary at the journey's head.
- **Restraint / nothing decorative without a job:** the ONLY new
  visual elements are the row borders, and each carries exactly
  one job (state, in the indicator language) with its reason on
  record; ambience is mixed to 52%/40% of canon, never saturated.
  No new motion was added - no transition here is earned, so none
  was spent. The mini-card spends its space on words, not chrome:
  one pill, one button.
- **Functional parity, experiential invention:** every function is
  unchanged - same facts, same dismiss permanence, same row
  activation, same strip presence/exit. The EXPERIENCE is Opal's
  physics, not an incumbent chat clone's: a conversation row that
  glows in the plan's own state color at ambient strength, an
  entity-tinted mini-card in the fire-line family, a strip that
  sits on the thread's field like a stone on its ground. Nothing
  on these surfaces could be mistaken for another product's
  screen with our logo on it - the state-coded border language
  exists nowhere else. Where invention would have harmed clarity
  (the founder's precision note: frosted glass on the strip),
  clarity won and the strip stayed solid.
- **Typography as voice:** titles get the row's full measure and
  phrase wrapping (tested at human length); kicker stays micro
  caps; the state word always accompanies its color (never color
  alone).

## 4. Evidence

### Web unit/integration (new + suites)

New file `apps/opal_web/src/opalUi/c1/r19ChatsThread.test.tsx` -
14 tests, all passing: mini-card structure with a human-length
title ("Dinner at Juniper and Ivy with the whole crew to celebrate
the new place"), old flattened run asserted absent, CSS width/wrap
contracts, row `data-plan-state` source order + plan-less absence
on BOTH lists, canon-only border mapping (orb tokens ==
PLAN_STATE_HEX, no raw hex in the unify sheet), strip
sticky/opaque/canvas in both modes + legacy strips solid.

Targeted suites verbatim:

```
deckfix.test.tsx        11 passed
dir4Reveal.test.tsx     17 passed   (DIR-4 suite green)
dir1PlanAwareness       13 passed   (DIR-1 suite green)
r19ChatsThread          14 passed
c1 / unifyDrift / planStateColors / c1ShellWiring /
chatsHome / w4LayoutContract / repair18Layering   69 passed
```

### Full web suite (serial, this worktree)

```
Test Files  16 failed | 180 passed (196)
Tests       23 failed | 1511 passed (1534)
```

The 23 failures are in EXACTLY the 16 documented baseline files
(activation, availability, designTokens, firstRun,
authorityRejectedStates, grammar, graphCalendaring, graphDetail,
graphScroll, graphSpine, liveJourneyProof, pasteW4DeviceFixes,
technicolorProduction, waveBChatsExact, waveBGraphsExact,
waveBHomeExact) - zero new failures; 1,511 passed = baseline
1,497 + the 14 new R19 tests. Log:
`~/workspace/opal-graph/w5-scratch/web-full.log`.

### Typecheck

Exactly the 9 documented pre-existing errors (3x OpalApp
`SetStateAction<Tab>`, 5x productClient duplicate
`plan_type`/`online`, 1x YouSettingsDestination `handle`). Zero in
any touched file.

### Rendered-surface proof (breadth rule: surface-level, not only components)

A served vite build of THIS worktree was driven in headless
Chromium (playwright-core, 430px viewport) rendering the real
components through the real CSS cascade with the founder's exact
scenario - probe entry was scratch (removed after measurement);
script + raw output + screenshots kept at
`~/workspace/opal-graph/w5-scratch/` (`probe.mjs`, `probe-out.json`,
`probe-chats-{dark,light}.png`, `probe-thread-{dark,light}.png`).

Chats list, BOTH modes, verbatim measurements:

- Reveal title box: **207px wide x 62px high** for the 78-character
  title - phrase wrapping over ~3 lines at the card's full inner
  width. The pre-fix failure geometry (one-word column) would read
  ~60px wide x ~260px high. Card box 235 x 202.
- PlanAwareness row title box: **207px wide** (47px high).
- Dismiss: inside the actions row (`dismissInActionsRow: true`),
  below the title (`dismissBelowTitle: true`) - never floating.
- Row borders (computed): action rows `1px solid` at
  `color(srgb 1 0.301961 0.368627 / 0.52)` = canon #FF4D5E at 52%;
  ready row = #FFC86B at 52%; plan-less row `0px / none` - in both
  modes identically.

Thread, BOTH modes, SCROLLED state (30 messages):

- Internal scroll moved **scrollTop 2563** (max); strip
  `beforeTop 76 = afterTop 76`, `anchored: true`,
  `position: sticky`.
- Computed background: dark `rgb(24, 20, 28)` (#18141c canvas),
  light `rgb(255, 254, 251)` (#FFFEFB canvas) - fully opaque
  `rgb()`, no alpha channel.
- Hit test at the strip's centre after max scroll:
  `hitInStrip: true` - the topmost element is the strip itself;
  messages pass under it and are never hit-testable or visible
  through it. The thread screenshots show the strip solid at the
  head with the scrolled message column clipped at its bottom
  edge - no ghost-through.

## 5. Pack capture notes (exact seed rows/states that show the fix)

For the pack run (served build, both modes, phone size):

1. **Chats list - the reveal row:** the account whose P1 is lit
   (viewer's answer pending on "Dinner at Juniper and Ivy") - the
   row shows the mini-card: "YOUR MOVE" kicker, full title on its
   own lines, "Saturday 7:30 PM - Juniper and Ivy" substance,
   Confirm pill + Dismiss in the foot row; the ROW border is
   action-red at ambient strength.
2. **Chats list - DIR-1 rows:** a row with an `action` next_plan
   (mini-card: state pill head, title line, meta line; red ambient
   row border) and a row with a `ready` next_plan (gold border),
   beside **one row with no plan** (no card, no border) - the
   presence-discipline pair.
3. **Thread - strip anchored + solid:** open the Juniper thread,
   capture at rest, then SCROLLED to the bottom: the Next Together
   strip stays at the top of the scroll column, opaque field
   ground, state glow intact, zero message text visible through
   it; the YOUR MOVE fire-frame card in the same thread unchanged
   (protected pattern - capture it in the same frame if it
   coexists).
4. Repeat 1-3 in the other mode (token luminance varies; mapping
   and geometry were measured identical).

## 6. Files changed

Web only. `RevealCard.tsx/.css` (RevealListLine mini-card),
`PlanAwareness.tsx/.css` (row mini-card), `C1Surfaces.tsx`
(row element + data-plan-state, strip containers unchanged in
structure), `ChatsHome.tsx` (legacy row state + card placement),
`c1.css` (strip anchored/solid), `unifyChats.css` (row ambient
borders, both lists), `styles.css` (legacy strip ground),
`layoutContract.css` (L8 registry), `deckfix.test.tsx` (F2b pin
amended with reason), `r19ChatsThread.test.tsx` (new, 14 tests).

Residuals / seams: (i) the legacy member-conversation strip keeps
its F12-08 opaque form and the layout contract's in-flow rule for
the structured layout - it cannot bleed (solid ground), but it is
not sticky-anchored there; if the founder wants the anchor there
too, that is a layout-contract change for the coordinator to
rule. (ii) W14's doorway builds on the strip area (section 2B) -
expect a small additive diff near the strip at merge. (iii) No
conversation-type rendering was touched or blended in this wave.
