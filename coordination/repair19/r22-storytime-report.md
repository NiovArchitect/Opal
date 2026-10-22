# Repair #22 - WS-3 Storytime: finisher proof report

Branch: muse/r22-storytime
Build commit: 64a86882 (R22 WS-3 story temporality)
Finisher fix commit: 2bbc3a95 (test harness only, see below)
Phase: PROOF ONLY - verification, tests, captures. No merge, no prod,
muse/repair-17 untouched.

## Per-semantic verdicts (WS-3 spec vs commit 64a86882)

| # | Semantic | Verdict | Evidence |
|---|----------|---------|----------|
| a | DWELL - video plays actual length; image holds a defined dwell | EXISTS | `IMAGE_STORY_MS = 7000` in apps/opal_web/src/opalUi/storyPlayback.ts, the single source shared by both viewers (legacy StoryViewer imports it after the commit; its private copy was deleted). Video: StoryViewerC2 advances on the media element `ended`, progress driven by the media clock (onTimeUpdate); storyDwellMs returns the real duration when known, null (advance on ended) when not. A failed video falls back to the image dwell. |
| b | AUTO-ADVANCE at dwell end, rail order, clean exit at rail end | EXISTS | StoryViewerC2: rAF dwell tick fills progress then calls advance(); queue = buildStoryQueue / storyQueueFromRail flattening per-person groups in rail order from the opened group to the rail end; goTo past the last story calls onClose (Home never unmounted, so stream/scroll are untouched). Tap left/right and arrow keys share the same goTo. Pinned by r22StoryTime.test (dwell/fill/jump/exit, video ended advance, tap nav). |
| c | RAIL PROGRESS visible - segments, current filling | EXISTS | StoryViewerC2 renders one segment per story of the person on stage; earlier segments full (data-done), current segment's fill width = dwell progress %, later segments empty; progress also exposed as data-progress on the progress container. Proven live in captures: mid-story fill 54% (light) / 53% (dark); advance frame shows segment 1 full, segment 2 at 3%. |
| d | EXPIRY from posting time, server-enforced | EXISTS | Server (Elixir, pre-existing, verified by reading): TemporaryStoryPublishing sets expires_at = posted_at + ttl at create, @default_ttl_hours 24, ttl_hours accepted 1..72; list_for_viewer returns only rows with expires_at > now (temporary_story_publishing.ex:22, :94, :118, :146). Client in this commit: the record's own expires_at is carried through projections.ts, shellData.ts and socialAuthority.productionStoryToItem; expired records are dropped at rail compose time (shellData), again at viewer open time (storyQueueFromRail), and in resolveHomeStories (liveStories) - closing the expired-while-open gap. Client mirror constant: STORY_LIFETIME_DEFAULT_MS = 24h in storyPlayback.ts; the row's expires_at is the authority. |
| e | Graph-stories under the same law | EXISTS for graph content in the viewer; DECLARED for graph-story posting | Same law: the GRAPH-pulse story test in storyViewerTemporality.test.tsx pins a graph piece (pulseState GRAPH, e.g. the trip-graph memories queue) dwelling, filling and advancing identically to a moment story - one timing regime, no second clock. DECLARED (not built, carried from the build commit and re-verified): graph-story POSTING has no server path - TemporaryStory has no graph reference and its contract asserts "not_graph" => true (apps/opal_core/lib/opal_core/social_flow/temporary_story.ex:66). Building it needs a server contract change, out of this finisher's proof scope. |

## Values and where they live

- Image dwell: 7000 ms - apps/opal_web/src/opalUi/storyPlayback.ts (IMAGE_STORY_MS).
- Video dwell: the media's actual duration; advance on `ended` - StoryViewerC2.tsx.
- Story lifetime: default 24 h from posting (ttl_hours 1..72 accepted) -
  server apps/opal_core/lib/opal_core/social_flow/temporary_story_publishing.ex
  (@default_ttl_hours 24); enforcement at create (expires_at set) and at
  list_for_viewer (expires_at > now filter). Client mirror:
  STORY_LIFETIME_DEFAULT_MS in storyPlayback.ts.

## Finisher fix (follow-up commit 2bbc3a95)

One failure in the build commit's own new test:
storyViewerTemporality.test.tsx, "segments per story, current fills with
the 7s dwell, advance jumps, rail end exits" - onClose never called.
Diagnosis: test-harness artifact, not a product gap. The test advanced
fake timers by two dwells in ONE synchronous sweep; a dwell chain cannot
complete inside one sweep because the next dwell's rAF is armed by the
effect React runs when it flushes the advance (between frames in a real
browser, between act steps under fake timers). The legacy viewer's
dwell/advance/exit code was read and is correct. Fix: split the final
sweep into one act step per dwell and assert the intermediate jump to
s3 - same behavior asserted, one more pin. No product code changed.

## Tests

- WS-3 suites (storyPlayback.test, storyViewerTemporality.test,
  r22StoryTime.test): 18/18 pass after the finisher fix (17/18 before,
  the one failure being the harness step above). Fake timers and explicit
  instants only - the clock convention holds, no wall-clock sleeps.
- Full web battery (vitest run, apps/opal_web): 24 failed / 2155 passed /
  2179 total, 17 failed files - identical counts to the pre-existing
  baseline (24 failed / 17 files). No new failures; no WS-3 file fails.
  (The build worker's earlier run at 64a86882 read 26 failed, including
  the harness failure fixed here; battery counts vary under box load, as
  the R21 annotation already records.)
- Typecheck (tsc --noEmit): exactly 9 errors, the pre-existing set
  (OpalApp.tsx 3, api/productClient.ts 5, YouSettingsDestination.tsx 1).
  None in any WS-3 file.

## Captures

Stack: this worktree served locally - Phoenix :4002 from
wt-r22-storytime/apps/opal_core, vite preview :5176 of the worktree dist
(dist verified to embed 64a8688). Capture script
r22storytime-scratch/cap-storytime.mjs: phone viewport 390x844, real
stories created through the product API (ttl_hours 72) as the viewer,
viewer opened from the self stone. In-page gitHead reads 64a8688 in every
state (the badge gate). The capture run itself was completed by the build
worker before the restart drain (frames and measurements written
20:56-20:59 UTC); the finisher verified the frames visually and against
measurements.json, and a duplicate re-run was attempted - it timed out
on the self-stone wait (240 s) under current box load (load avg ~25,
sibling suites running) and produced nothing the existing frames do not
already prove.

Frames (~/workspace/opal-graph/shots/repair22/storytime/):
- story-viewer-light-mid.png - mid-story, light: segment 1 filling,
  progress 0.542, fill 54%, caption visible.
- story-viewer-dark-mid.png - mid-story, dark: progress 0.529, fill 53%.
- story-viewer-light-advance.png - advance moment N -> N+1, light:
  story id changed, index 1, progress reset 0.016.
- story-viewer-dark-advance.png - advance moment, dark: segment 1 full,
  segment 2 at 3%, next story's caption on stage.
- measurements.json - expectedSha 64a8688 + opened/mid/after states for
  both modes (queue count 4, 3 segments for the self group).

## Declarations

- Graph-story POSTING: DECLARED, not built (see verdict e). Server
  contract asserts not_graph; graph content reaches the viewer today via
  the trip-graph memories queue under the same law (pinned by test).
- No other gaps found: all five semantics exist in 64a86882 as specified.
