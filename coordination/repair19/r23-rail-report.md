# REPAIR #23 - STORY RAIL CLUSTER REPORT (muse/r23-rail)

Date: 2026-10-21. Branch: muse/r23-rail, based on the merged
R23 tip 83c910bc (merge of muse/r23-audience into
muse/repair-23, containing WS-23-1 and WS-23-2; HEAD verified
at setup). Scope: three founder items on the Flows story
rail - (A) the story-state caption taxonomy, (B) rail
typography parity, (C) the IF-1 two-tier ring glow.

Gates held: no merge, no production, muse/repair-17 never
touched, commits on muse/r23-rail only. Plain hyphens only.

---

## ITEM A - STORY STATE TAXONOMY (founder charge 2026-10-21 18:04)

The WS-1 closed word-map was AMENDED, and the amendment is
recorded where the map lives (the MomentStones header comment
in C2Home.tsx) and in the amended suite's header
(r22Stories.test.tsx) - it was not silently edited.

Amended map - captions speak ONLY the story's own state:
- happening -> "Live"
- new (unseen, fresh) -> "New"
- seen -> NO caption word (the state line renders empty, so
  the two-line rhythm and baseline hold across the rail)
- loved -> NO caption word, ever

The self stone keeps its name "Your moment" and follows the
same map (live self -> "Live"). Its "+" and "Add" are the
door's affordance, not a caption, and they stay.

### The loved signal - TRUE DATA SOURCE (traced)

"loved" is NOT the viewer's light/history with the story.
Traced in shellData.ts (homeFromSession, the W-9 ordering
block, now carrying an R23 trace comment): stoneState
"loved" is derived from relTypeByName - the AUTHOR's
relationship type on the viewer's own relationship rows.
Source reads: listRelationships - relationships[].type
keyed by contact_user_id, joined to contacts by display
name; the tier fires when the type is in lovedTypes =
{spouse, partner, family, close_friend} and the author is
not a live host (happening outranks it). "seen", by
contrast, comes from the story record's own seen flag
(listTemporaryStories payload).

That same signal now drives the ring, per the charge:
C2Home stamps data-warmth="warm" on a loved stone, and CSS
(.c2s-stone[data-warmth="warm"] .c2s-stone-ring) carries the
warm trace - warm ring-metal border + 10px warm glow - that
previously hung off data-state="loved". No new signal was
invented. The internal state name "loved" is unchanged
(ordering, orbit motion, and other suites' data-state pins
are untouched); only its caption died and its ring home
became explicit.

Vocabulary separation kept: the Create tenses (Now /
Forecast / Memories) and all post vocabulary are untouched;
no rail word leaked into creation or vice versa.

Pins (r22Stories.test.tsx, amended): the rail's sub-caption
sequence is now ["Live", "Live", "", "New", "", "New", ""]
(self live, happening, loved, new, seen, new, seen); the
rail text matches neither /Loved/ nor /Seen/; a loved-input
story renders NO "Loved" caption and DOES carry
data-warmth="warm" (and no other stone does); a seen story
renders no state word.

## ITEM B - RAIL TYPOGRAPHY PARITY (founder charge)

Cause, found: an element split under one class. The self
name and plain names are <p class="c2s-stone-name">, but a
person's name is a <button class="c2s-stone-name
c2s-stone-name-btn"> (the W-12 bond door, rendered whenever
onBond is wired - i.e. always in the real shell). c2shell.css
sits in @layer c2, and the unlayered global reset in
styles.css (button, input { font: inherit }) beats EVERY
layered rule, including the layered .c2s-stone-name rule
(font: var(--type-caption) = 12px, then font-weight 600).
Button names therefore computed to the inherited body type
(15px, weight 400) while paragraph names got 12px/600 -
"Your moment" (a <p>) read bolder than "Maya Torres" (a
<button>). The file already records this exact cascade
species twice (the chip comment and the W21 primary-button
fix); the rail names were its third victim.

Fix (c2shell.css, unlayered on purpose, beside the
primary-button precedent, under a "RAIL CAPTION PARITY"
comment recording the cause): unlayered class rules restate
the one treatment exactly -
.c2s-stone-name { font: var(--type-caption); font-weight:
600; color: var(--ink-1) } and .c2s-stone-sub { 11px/14px,
weight 500, letter-spacing 0.01em, color var(--ink-2) } -
plus .c2s-stone-name-btn { display: block; width: 100% } so
the button's baseline and ellipsis match the paragraphs.
LAW as charged: one caption treatment rail-wide - identical
size, weight, and baseline for the self stone and every
other stone, name line and state line alike.

Pin (r22Stories.test.tsx): rendered with openBond wired,
the self name is a P and Maya's name is a BUTTON, both
carrying the single c2s-stone-name class with no per-stone
variant class; the unlayered parity rules are pinned as CSS
text (the r20Connect / r22StreamRhythm precedent - jsdom
loads no stylesheet, so computed-style equality is not
available in this harness and the pin follows the house
CSS-text pattern).

## ITEM C - IF-1 TWO-TIER RING GLOW

Provenance: founder-delegated PARENT DECISION, 2026-10-21
18:04 - recorded here, in the amended r20Connect pin's
header comment, and in the CSS and C2Home comments.

The law as implemented: the story ring is EXEMPT from the
flat 8px glow-room token, tiered.
- RESTING tier (default): rings sit at the 8px glow-room
  (var(--stream-glow-room)). For the happening ring this is
  its base rule's shadow, unchanged from the integrated R22
  tree; WS-4's stream coherence governs the default.
- ATTENTION tier: the founder-pinned 14px glow
  (0 0 14px var(--orb-indicator-happening-glow)) blooms ONLY
  on an earned trigger. C2Home computes the tier from the
  projection's own fields (stoneState, derived by the one
  adapter from the story/live records and the viewer's
  relationship rows) and stamps data-glow="attention" |
  "rest" on the stone element - self stone included (live
  self = attention, quiet self = rest). CSS keys the bloom
  off [data-glow="attention"]; a warm stone at attention
  keeps its warmth trace inside the bloom (a combined
  two-shadow rule at higher specificity).

### Trigger-wiring table (every named trigger)

| Named trigger | Status | Signal wired |
|---|---|---|
| Story is LIVE (state happening) | WIRED | stoneState "happening": shellData derives it from the lives leg's own records (liveHostNames - a lives record of kind "live" whose host name matches the story author); the self stone from rail.self.hasLiveStory (the viewer's own live story record) |
| Response / mention involving the viewer | DECLARED - not wired | Missing signal: the story record (listTemporaryStories payload, read in shellData) carries id, author name/id, seen, media_ref, caption, expires_at - no mention flag, no response flag, and StoryRailProjection has no such field. Nothing was faked; wiring waits on a server story-engagement/mention field (same absence class as the audit's D-M story-engagement gap) |
| Author is the viewer's close people | WIRED | The traced loved signal itself: author relationship type in {spouse, partner, family, close_friend} on the viewer's listRelationships rows -> stoneState "loved" -> data-glow="attention" + data-warmth="warm" |
| Matches the viewer's demonstrated interests / interactions | DECLARED - not wired | Missing signal: no interest-overlap or interaction field exists on the story record or in StoryRailProjection; the adapter reads no interest data in the rail path. Nothing was faked |

Pin amendment (r20Connect.test.tsx): the F-10 compass test's
flat-14px regex was replaced by the two-tier pins - resting:
the happening ring rule carries box-shadow 0 0
var(--stream-glow-room) var(--orb-indicator-happening-glow);
attention: [data-glow="attention"] carries box-shadow 0 0
14px var(--orb-indicator-happening-glow) - with the
amendment and its provenance in the file header. IF-1 is
CLOSED by this amendment: the only R23-tip web failure
attributable to the collision is gone (see Tests).

DOM pins (r22Stories.test.tsx): a plain new story renders
data-glow="rest"; a seen story renders "rest"; a live
(happening) story renders "attention"; the wired
viewer-relevance case (close-people / loved-input) renders
"attention"; the self door renders "attention" live and
"rest" quiet.

r22StreamRhythm reconciliation: the suite stays green
unamended (10/10). Its token law governs stream CARDS; its
CSS sweep checks the live card, the plan stone, and the
trivia region - the ring rules live outside those scopes,
and the ring's RESTING tier still uses the token, so no
text in the suite contradicted the two-tier law and none
was edited.

## FILES CHANGED

- apps/opal_web/src/c2/shell/C2Home.tsx - amended
  STONE_STATE_WORD (null for loved/seen), stoneGlowTier,
  data-glow stamps (self + media + no-media stones),
  data-warmth stamp (loved), amendment + two-tier law
  recorded in the MomentStones header comment.
- apps/opal_web/src/c2/shell/shellData.ts - R23 trace
  comment at the loved derivation (comment only; no logic
  change - the signal was already computed here).
- apps/opal_web/src/c2/shell/c2shell.css - happening ring
  resting comment; warmth treatment re-keyed from
  data-state="loved" to data-warmth="warm"; two-tier
  attention rules (14px bloom; warm+attention combined);
  unlayered caption-parity rules (.c2s-stone-name,
  .c2s-stone-sub, .c2s-stone-name-btn block/width).
- apps/opal_web/src/c2/shell/r22Stories.test.tsx - header
  amendment note; amended word-map pins; new pins for
  warmth, glow tiers (incl. the close-people trigger case),
  and caption parity.
- apps/opal_web/src/c2/shell/r20Connect.test.tsx - header
  amendment note with provenance; F-10 compass pin amended
  to the two-tier law.
- coordination/repair19/r23-rail-report.md - this report.

## TESTS (exact commands + counts)

From apps/opal_web, ./node_modules/.bin/vitest run <files>:

1. Target set: src/c2/shell/r22Stories.test.tsx
   src/c2/shell/r20Connect.test.tsx
   src/c2/shell/r22StreamRhythm.test.ts
   src/c2/shell/r22StoryTime.test.tsx
   src/opalUi/storyPlayback.test.ts
   src/opalUi/storyViewerTemporality.test.tsx
   -> 6 files, 50 tests, ALL PASS. (At the merged base the
   same set showed 1 failure: the r20Connect IF-1 pin.)
   r22Stories grew 3 -> 8 tests; r22StoryTime and
   storyPlayback untouched and green, as charged.
2. Folder set: src/c2/shell/ -> 51 files, 494 tests, ALL
   PASS - no failures at all, so no new failures vs the
   merged base (whose folder carried the IF-1 failure).
3. Baseline spot-check outside the folder:
   src/c2/r20CardMenu.test.tsx -> 1 failed / 5 passed, the
   named baseline canon-token test ("the state accent uses
   the canon tokens with each state's own pattern").
   Verified identical at base by reverting this branch's
   diff and re-running: base fails that same test AND the
   IF-1 pin (2 failed / 18 passed across the two files);
   with this branch's diff, only the canon-token baseline
   remains.
4. Typecheck: tsc -p tsconfig.json --noEmit -> exactly 9
   errors, the baseline set (OpalApp.tsx x3,
   productClient.ts x5, YouSettingsDestination.tsx x1);
   none in any file this cluster touched.

## CAPTURE SPEC (for the coordinator's signature-gated rig)

Badge: the served R23 integrated build at this cluster's
tip (frames assert the served badge as usual). LIGHT first,
then dark; phone size. The rail must be seeded so one frame
set shows, left to right: the self stone, a LIVE stone, a
close-people stone (relationship type spouse / partner /
family / close_friend on the viewer's rows), a plain new
stone, and a seen stone.

- firstpaint, light + dark: a live stone at ATTENTION glow
  (14px bloom on the ring, caption "Live") beside a new
  stone at REST (no bloom, caption "New") in the same frame;
  the seen stone in frame carries NO caption word and no
  bloom.
- rail close frame (light; dark if the set allows): caption
  parity proven at the glass - "Your moment" and every
  person's name at the same size and weight on one baseline;
  the close-people stone shows the WARM ring trace with NO
  "Loved" caption under it (its state line is empty).
No frames were captured by this cluster worker (the
signature-gated rig is the coordinator's instrument); this
spec is the audited requirement handed up.

## DECLARATIONS

- DECLARED (Item C triggers): the response/mention trigger
  and the demonstrated-interests trigger are NOT wired -
  the missing signals are named in the trigger table above.
  Only happening and close-people are wired, both from real
  fields. No trigger was faked.
- DECLARED (Item A signal truth): the "loved" input is the
  author's close relationship type, not the viewer's light
  or viewing history - stated here and in code comments
  because the charge's premise ("the viewer's history")
  does not match the traced source; the ring treatment is
  keyed to the truth.
- DECLARED (capture): no served-stack capture was run by
  this worker; glass proof of the three items rides on the
  coordinator's run of the CAPTURE SPEC above.
  FOUNDER_PHONE_PASS remains NOT_CLAIMED.
- DECLARED (baseline): r20CardMenu's canon-token failure is
  the standing baseline, verified name-identical at base;
  it is not this cluster's to close and was not touched.
- The WS-2 reduced-motion specificity fragility carried
  from R22 is untouched by this cluster (no orbit rule
  changed); it remains carried, founder-gated.
