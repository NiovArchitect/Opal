# Repair #22 - Cluster R22-E (WS-6): Create Buttons = Orbit-Button Material + Renames

Branch `muse/r22-create`, base `fd1d34d3` (r21 close-out tip),
code tip `ff12b227` (this report rides one commit above).
No merge, no deploy, `muse/repair-17` untouched. Plain hyphens in
all user-facing copy.

## The ruling implemented

The founder rejected the Create sheet's three tense STONES
("they look like avocados to me") and ruled: the tenses become
buttons in the orbit doorway button's marbled material, each
carrying its own multicolor, renamed Now / Forecast / Memories
(Now = the live moment, Forecast = the graph ahead, Memories =
the settled past).

## How the marble material was reused (not a lookalike)

Per the W-19 marble inventory (coordination/repair19/
r21-marble-report.md), the orbit doorway button's material is
one family sampled from the master, in two layers:

1. The flat five-stop iris the doorway actually wears:
   `--grad-current` (= `--opal-iris-gradient` on
   `.c1-thread-opal-orb`) - the sampled fire peaks
   violet / blue / cyan / magenta / gold.
2. The master's own grain raster the W-19 marble seat carries:
   `ORB_ASSETS.marbleSphere` =
   `/brand/orb/opal-marble-sphere.webp` (the asset `OrbMark`'s
   `marble` seat renders, derived from the keyed hero by
   scripts/orb/build_marble_sphere.py).

The tense buttons (`.c2s-create-tense-btn` in
src/c2/shell/c2shell.css) reuse BOTH layers of that actual
implementation: `background-image` = per-tense iris over
`url("/brand/orb/opal-marble-sphere.webp")`, declared in markup
with `data-marble="sphere"` (the same declaration the OrbMark
marble seat carries). Each tense re-leads the SAME five sampled
fire stops, so each button carries its OWN multicolor within
the shared marble:

- present (Now) - cyan leads (the live moment)
- future (Forecast) - violet leads (the doorway's own order)
- past (Memories) - gold leads (the settled warmth)

Verified at the rendered layer: the capture rig read back the
buttons' computed backgrounds in both modes (cyan #60B9D8 /
violet #7D4DCE / gold #F1AA62 lead stops at 0.84 over the
grain) and the frames show the swirl reading in light and
dark. QUIET law honored: no animation, transition, or filter
targets the grain (pinned by test).

The graph-create form's anchor got the same retirement: the
avocado stone is now a marble DISC (same grain asset, tinted
and ringed by the tense's state fire, `.c2s-create-anchor-stone`).

## The in-tense creation panel (journey truth)

Before this cluster, choosing a tense left the sheet straight
into the graph-create form; photo/video/text were NOT offered
inside a tense's flow. Built: choosing a tense button now opens
that tense's creation panel INSIDE the sheet
(`c2-create-tense-panel`), offering:

- New graph - <tense> (the ONE real graph-create flow carrying
  the tense - unchanged wiring, `creationPlan(tense)`)
- Photo or video (the real media composer, Story | Post inside)
- Text (the real text composer)
- Go live (the real venue step)
- Back (returns to the sheet top level)

The sheet's top level keeps its rows exactly as ruled: the
three tense buttons, Photo or video, Text, Go live, Cancel.

End-to-end completions were proven in the light capture pass
against the served build (see Frames): the Forecast graph was
created (read back via GET /api/v1/product/opal/plans and seen
as a Forming card in June's feed), the Memories photo post and
the Forecast text post were shared and read back in June's
home feed, and Go live completed to an active live_room in
lives/mine.

DECLARED BY NAME - the one step that does not exist: the moment
create contract (publishSocialMoment / createTemporaryStory)
carries NO tense field, so a photo or text post made from
inside Forecast or Memories is a present-tense moment by the
server's own model; the tense scopes the panel the door was
offered in, and the tense is persisted only on the graph-create
path (entry + When label, as in W-17). No fake tense was
stamped on moments.

## Rename sweep evidence

- `CREATION_TENSE_LABELS` (src/c2/shell/flows2.ts) is the only
  source of tense names: present "Now", future "Forecast",
  past "Memories". Every consumer (sheet buttons, panel's New
  graph row, form anchor) renders from it.
- grep over apps/opal_web/src (non-test): the string "Ahead"
  survives ONLY in the flows2 comment recording the ban, and
  `"Settled"` as a TENSE label: NONE.
- Out of scope, deliberately untouched: "Settled" as the
  plan-STATE word on Graphs/density surfaces (the state
  system's past-family label, owned by other clusters) is a
  different lexeme from the tense name and was not renamed.

## Files changed (code tip ff12b227)

- apps/opal_web/src/c2/shell/flows2.ts - tense labels +
  founder-names comment.
- apps/opal_web/src/c2/shell/C2Home.tsx - marble tense buttons,
  the in-tense creation panel, sheet state (tensePanel).
- apps/opal_web/src/c2/shell/C2Shell.tsx - anchor wording
  (marble disc), tense comments.
- apps/opal_web/src/c2/shell/c2shell.css - the marble button
  material (grain + per-tense iris), panel layout, marble disc
  anchor; stone rules deleted.
- apps/opal_web/src/c2/shell/r21Creation.test.tsx - updated
  W-17 pins (labels, sheet inventory) + new R22-E describe
  (marble material pins incl. CSS source pin and QUIET pin,
  panel journeys for every tense incl. Memories photo/text,
  go-live reachability, anchor rename pins). 15 tests, all pass.

## Tests

- Affected suites: r21Creation (15) + r21Marble (11) pass;
  c2ShellSurfaces A1 audit passes (two audit breaks found and
  fixed during the run: bare local var() usages given fallbacks,
  a raw #fff replaced by the --orb-point-light token).
- Scoped battery, name-for-name (src/c2 + src/brand + src/theme
  on base fd1d34d3 vs tip, sequential clean runs): base fails
  exactly r20CardMenu (1) + technicolorProduction (1); tip fails
  exactly the same two names. Tip carries +6 tests (656 vs 650),
  all passing. No new failures in scope.
- Full web battery on the pre-amend tree ran twice at the
  stated baseline counts (24 failed tests / 17 failed suites,
  3373 passed); the only delta after that measurement is the
  CSS-only audit fix above, whose scope is fully covered by the
  scoped name-for-name run.
- Typecheck: exactly 9 errors, identical to base (pre-existing:
  OpalApp Tab x3, productClient duplicate identifiers x5,
  YouSettingsDestination handle x1).

## Frames (the proof set)

Served web build of the code tip (vite preview from this
worktree; the DOM badge `data-git-head-full` was read back in
the browser and asserted equal to ff12b227 before frames were
filed, in both modes), local dev backend (Phoenix from this
worktree, synthetic fixtures only), 390x844, every frame
signature-gated (`assertSurfaceSignature(page, "creation", ...)`
immediately before the shutter).
Directory: `shots/repair22/create/` (+ capture-log.json).

- creation-sheet-{light,dark}.png - the Create sheet: three
  marble tense buttons (Now / Forecast / Memories) over the
  kept rows Photo or video / Text / Go live / Cancel.
- creation-tense-forecast-{light,dark}.png and
  creation-tense-memories-{light,dark}.png - inside a tense's
  creation flow: the panel offering New graph, Photo or video,
  Text and Go live within the tense (Forecast pressed state
  visible in its frame).
- creation-forecast-form-{light,dark}.png - the graph-create
  form entered from Forecast, anchored by the marble disc.
- creation-memories-photo-{light,dark}.png - the media composer
  opened from inside Memories, photo picked, caption written.
- creation-forecast-text-{light,dark}.png - the text composer
  opened from inside Forecast, words written, Share armed.
- creation-live-{light,dark}.png - Go live's venue step from
  the create sheet (light: manual venue entered, Go live armed).

## Environment notes (for the next cluster)

- The shared VM restarted several times during this cluster
  and sibling R22 stacks hold ports 4000-4003 / 5173-5177; this
  cluster's stack used Phoenix :4004 + preview :5179 with its
  own DB (opal_dev_r22create) and self-contained deps under
  ~/workspace/opal-graph/r22create-scratch/ (the shared
  .opal_deps_r19 credo copy is incomplete - its
  .template.debug.html is missing, and credo 1.7 reads that
  template relative to CWD at compile time).
- wt-repair21's node_modules was found broken (no vitest) and
  was repaired with `npm ci` to run the base scoped battery.
