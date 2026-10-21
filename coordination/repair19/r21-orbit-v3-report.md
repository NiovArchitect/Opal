# Repair #21 - Orbit v3: Radical Calm Rebuild (Cluster W-1)

Branch: `muse/r21-orbit` - tip `1ea04f54` (base `70584ad8`, Repair #20 tip + Flows label fix).
Scope: presentation only. `OrbitScreen.tsx` / `OrbitScreen.css`, host wiring in
`C1ShellHosts.tsx`, an `embedded` mode in `CenterChat` (`C1Surfaces.tsx`), one new
reusable component (`OrbitInfoBubble.tsx` / `.css`), one contract widening in
`productClient.ts`, and doctrine pins in `r20Orbit.test.tsx`. No backend changes;
`OrbitProjection.for_conversation/3` semantics untouched.

## The Calm Law

One quiet column, in this order, and nothing else on first paint:

1. A minimal header: the topic, the parties, a back control. Nothing more.
2. The Where-we're-at card.
3. The Opal conversation (past chats folded into ONE row).
4. The composer.

No banners, no purpose headers, no kickers, no teaching sentences. Rows inside
the Where card are separated by hairlines and never run together; the values
that carry the state (Next together, Your move, window state) are bold and in
their state color; everything else is quieter but legible. Clickable rows look
clickable (chevron, full-row button). Chrome is back only - the room carries no
hamburger and no second back (see Embedded chat below).

## The Discovery Lens (acceptance)

The room explains nothing in advance. Its delight is discovered: the
done-and-loved row rewards a second look, the Where card rewards re-reading as
its state colors shift, and the one explanation the room owns lives behind a
small italic (i) the user may tap - or never. If a frame needs a caption to be
understood, the frame fails. All seven frames below were read against this
lens: each is understandable from its own surface, in both modes, with no
caption.

## Discovery Doctrine - removal ledger

Every string killed, at its line in the v2 base (`70584ad8`):

| # | Killed copy | v2 location | Disposition |
|---|---|---|---|
| 1 | "Start a new chat in this orbit" (banner) | `OrbitScreen.tsx:426` | Deleted. New chats live inside the folded Past chats row ("+ New chat"). |
| 2 | "Ask Opal about this conversation - or tell Opal where you're coming from." (field purpose header) | `OrbitScreen.tsx:434` | Deleted. No replacement copy. |
| 3 | "This room keeps what this conversation becomes - where you're at, what you've done together..." (room explainer) | `OrbitScreen.tsx:545` | Moved behind the info bubble (empty state only); never on first paint. |
| 4 | "No chats with Opal about this group yet. Ask the first question - or tell Opal where you're coming from." / "No chats with Opal about {name} yet. Ask the first question..." (empty-state sentence) | `OrbitScreen.tsx:552-553` | Dies as first-paint copy. The room is simply empty + the info bubble; the explanation (incl. the room-keeps sentence, #3) is the bubble's tap text. |
| 5 | "Ask Opal for another take" | `OrbitScreen.tsx:521` | Replaced with the minimal affordance "↻ Another take". Function unchanged. |
| 6 | "OPAL'S READ" (insight kicker) | `OrbitScreen.tsx:296` | Deleted. The insight itself survives as one quiet row inside the Where card (`data-testid="orbit-insight"` kept). |
| 7 | "PAST CHATS WITH OPAL HERE" (kicker) | `OrbitScreen.tsx:387` | Deleted. Replaced by the folded row label "Past chats (N)". Period pills removed from the UI; `periodPillsForSessions` stays exported and pinned for other consumers. |
| 8 | "A DRAFT FOR YOU" (recommendation kicker) | `OrbitScreen.tsx:459` | Deleted. The draft card carries no kicker. |
| 9 | "Ask Opal, or tell Opal where you're coming from" (orbit landing title) | `C1ShellHosts.tsx:1329` | Deleted; the orbit landing composer placeholder is "Message Opal". |
| 10 | "Ask, or tell Opal where you're coming from..." (field composer placeholder) | `OrbitScreen.tsx` (v2 placeholder) | Replaced with "Message Opal". All orbit composers use the "Message Opal" family. |
| 11 | "Back to your chat with {name}" (back control sentence) | `OrbitScreen.tsx` (v2 back control) | Replaced with "‹ Back" (aria-label "Back to chat"). |
| 12 | Hamburger + back duplication inside the room | `C1Surfaces.tsx` (`CenterChat`) + host | `CenterChat` gains an `embedded` mode used only by the orbit host: no hamburger, no second back, no repeated title, no context chip, no destination pill. Standalone chat chrome is unchanged. The overflow actions menu stays. |

Doctrine note: the killed explanations still exist as the info bubble's tap
text (that is where explanation is allowed to live). The doctrine pin is
therefore a rendered-DOM absence test - first paint must not contain them -
not a source grep.

## Info bubble pattern spec (reusable)

New files: `apps/opal_web/src/opalUi/c1/OrbitInfoBubble.tsx` + `OrbitInfoBubble.css`.

- Contract: `<OrbitInfoBubble label={string} text={string} />` - `text` is the
  full explanation; `label` is the accessible name for the control.
- Render: a single small italic "(i)" glyph in a quiet circular outline,
  sitting where the explanation would have gone. Nothing else on first paint.
- Interaction: tap toggles the explanation in place beside the glyph;
  `aria-expanded` tracks state; a second tap folds it away. No modal, no
  navigation, no persistence.
- Test id: `orbit-info-bubble` (other clusters can pin against the same id).
- Rule for reuse: if a surface needs an explanation to be usable, the surface
  is wrong; the bubble is only for the genuinely-needed aside, and it is
  never the only carrier of state the user must act on.

First use: the empty orbit. The room renders header, Where card, the bubble,
and the composer - no empty-state sentence anywhere on first paint
(frames `orbit-v3-empty-dark/light`; tapped state in
`orbit-v3-empty-info-light`).

## Where card - separation and emphasis

- Hairline separators between every row, in both modes, at 390px.
- Key rows carry `data-state`; key values are bold and colored by state via
  per-mode `--state-*-ink` tokens. Deliberate deviation, recorded: the canon
  hexes (action #FF4D5E, ready #FFC86B, forming #8B5CF6, happening #00E5FF,
  past white) are the dark-mode values; light mode uses deepened ink variants
  of the same hues because raw canon hexes (notably #FFC86B and #00E5FF) are
  illegible on the light ground. Hue identity is preserved per state; only
  lightness moves. Verified in frames: action reads red-pink, happening
  reads teal-cyan, in both modes.
- Next-together and past-plan rows are real full-row buttons wired to the
  already-existing `onOpenPlan`; the loved row ("What we've done - and loved
  (N)") is one folded row, closed on first paint - the discovery surface.

## Projection notes (recorded, not invented client-side)

1. `where_lines` carry no per-line state or kind. Lines that are not the
   recognized key rows render quiet and plain; no color or emphasis was
   invented for them client-side. If the projection later tags lines with
   state, the card will light them with no structural change.
2. `OrbitProjectionContract` (`productClient.ts`) gained the optional fields
   the server already emits: `subject`, `where_lines`, `past_plans`. No
   client-side derivation was added; the header renders `subject` as sent.
3. `past_plans` items arrive shaped as `NextPlanFact` plus loved fields;
   the folded rows consume only `plan_id` / `title` / `when` / `where`.
4. Observed in the seed room (1:1 frames): a Where line reads "Still waiting
   on Ethan Walker for Talk tonight about Saturday." while the viewing seat
   is Ethan Walker. That is projection text rendered verbatim (Law 3 truth
   as emitted); it is flagged here for the backend owner, not rewritten
   client-side.
5. Observed in the empty frames: for a brand-new direct conversation with
   no topic yet, the projection's `subject` is the counterparty's name, so
   the header shows the name as subject with "You, {name}" as parties.
   Rendered as emitted; flagged for the backend owner against the Center
   Law (topic at center) for topic-less threads.

## Tests

- Pins: `r20Orbit.test.tsx` (24), `f6OrbitPrivacy.test.tsx` (5),
  `orbitVerifyContract.test.ts` (5) - 34/34 green, re-run against the
  committed tip after capture.
- Assertion changes (doctrine pins): every test that asserted killed copy
  now asserts its ABSENCE on first paint - the new-chat banner, the purpose
  header, the empty-state sentence, "Ask Opal for another take", the three
  kickers, the period-pill past-chats structure, and the C1ShellHosts orbit
  landing title. Each change is in `r20Orbit.test.tsx` in the same commit
  as the rebuild (`1ea04f54`).
- Full web suites (`src/c2/shell/` + `src/opalUi/c1/`): 54 files, 522
  tests, all green.
- Typecheck: 9 errors, byte-identical to the clean base `70584ad8` (same
  pre-existing errors, shifted line numbers only). Zero new.

## Frames

Served stack for branch tip `1ea04f54`: shared PG :5433, Phoenix :4000 on a
fresh additive DB `opal_dev_r21`, vite preview :5173 of the built dist.
Synthetic sessions via the rendered harness; founder seed run once into the
fresh DB (comm 200, graph 200, machine-speak gate passed), then a staged
A-B direct conversation (`bae78f63-d44a-43a0-8b46-a1d063a6b0ee`, one message
from seat A) so seat B has exactly one thread whose orbit is empty. Capture
at 390x844, fresh browser context per shot, entry carries `opal_dev=1`;
every frame shows the `seed - 1ea04f5` chip, proving the served tip. Light
frames are genuinely shot in light mode, not derived.

All seven frames are in `~/workspace/opal-graph/shots/repair19/pack-v2/`:

- `orbit-v3-1to1-dark.png` - seed 1:1 room (Maya Torres thread): header,
  Where card with action-colored Next together / Open window / Your move
  rows, folded "Past chats (2)".
- `orbit-v3-1to1-light.png` - same room, light mode; state inks deepen,
  hues hold.
- `orbit-v3-group-dark.png` - group room (Farmers market run): happening
  cyan Next together, folded loved row, "Message Opal" composer.
- `orbit-v3-group-light.png` - same room, light mode.
- `orbit-v3-empty-dark.png` - seat B on the staged A-B thread: room simply
  empty, quiet Where card, the (i) bubble untapped above the composer.
- `orbit-v3-empty-light.png` - same, light mode.
- `orbit-v3-empty-info-light.png` - the bubble tapped open: the explanation
  appears beside the (i), in place, nothing else moves.

Frame inspection (against the Calm Law + Discovery lens): no frame needs a
caption; no explanations on any first paint; no hamburger, no duplicated
back, no kickers; rows separated and legible at 390px in both modes;
clickable rows carry chevrons.

## Declarations / blockers

- None outstanding. All six required frames plus the optional tapped-bubble
  frame were captured from the real served build.
- Environment notes (method, not blockers): the fresh `opal_dev_r21` DB
  needed the one-time founder seed + A-B staging described above before
  capture (the R20 captures relied on a pre-seeded DB); the worktree's
  `shots/regression/node_modules/playwright-core` is a symlink to the
  Repair #20 install, matching how the R20 worktree resolves it (untracked,
  gitignored - the worktree is clean).
- Not done, by design: no backend changes, no merge, no deploy,
  `muse/repair-17` untouched.
