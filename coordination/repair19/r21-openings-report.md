# Repair #21 - Cluster W-8..W-11 Report: F-18 REOPENED / Capture Integrity / Flows Rebuild / Pad Active State / Center Discovery

Branch `muse/r21-openings`, base `22744b3c`, tip `4e98f089`
(after the parent-inspection charges round; the charges
section at the end of this report is the latest word).
No merge, no deploy, `muse/repair-17` untouched. Plain hyphens
in all user-facing copy (the founder-given name "Know Me?
Trivia" is the exception, per his pick).

## Frames first (the proof set)

All frames: served stack on this branch's tip tree (web dist
built from `8749cd11`; Phoenix from the same tree against
`opal_dev_r21`), synthetic sessions, 390x844, `opal_dev=1`.
EVERY frame passed the W-8 content-signature assertion before
its file was written - the gate is in the capture path, not
around it. Frame provenance: the final set was shot on dist
builds of the tip tree (the charges-round builds `637334f9` /
`4e98f089`); the dev chip in a frame is stamped from the seed
record its session was provisioned under, so chips vary
(`d1dba00`, `637334f`) - the served file tree at capture time
is the tip tree in every case, verified by build order.
Directory: `shots/repair19/r21-openings/`.

1. `flows-vs-center-dark.png`, `flows-vs-center-light.png` -
   the side-by-sides. One-second test: left is people, stones,
   occasions, the game (Play); right is the orb, the greeting,
   the actions, the Needs-you deck (Opal working). Distinct
   compositions, same house.
2. `flows-opening-dark.png`, `flows-opening-light.png` -
   Moment Stones at first paint, occasions stone, the Know Me?
   Trivia card, the stream below.
3. `flows-stream-mid-dark.png`, `flows-stream-mid-light.png` -
   mid-stream (scroll verified by read-back: scroller
   clientHeight 784, scrollTop 1684 when shot).
4. `flows-trivia-dark.png` - the Trivia card after a real round
   was played in the browser: the sent guess reads back as
   waiting ("You said October 23 - waiting for Maya Torres to
   say if it is right.").
5. `center-opening-dark.png`, `center-opening-light.png` -
   Center after the discovery pass.
6. `pad-active-{flows,chats,center,graphs,you}-{dark,light}.png`
   - one frame per surface; the capture log records the single
   active dock marker per surface (center = the orb itself).

## W-8 - Capture integrity

### (a) Root cause: EVIDENCE defect, not product routing

The shell's routing is correct. In `C2Shell.tsx`, route `home`
mounts `HomeRoute -> homeFromSession -> C2Home` (the social
surface) and route `center` mounts `CenterHost ->
C2CenterOpening`. The product defect theory fails on one
frame: `home-scrolled-light.png` in the earlier packs shows
the real social Home (story rail + feed) - the surface exists
and the route reaches it.

The defect is in the capture rigs. `C2Shell` holds
`useState<C2Route>("center")` - the shell OPENS on Center. The
R21 close-out rigs that produced the Flows-named frames
(`r21close-scratch/cap-close-padA.mjs`, `cap-close-padB.mjs`,
`cap-close-pad2.mjs`) navigated "flows" with a bare
`sleep(page, 500)`: no click on the Flows dock slot, no wait
for the Home surface, and no assertion about what was in the
DOM before the shutter. `r20-scratch/cap-flows-label.mjs`
(flows-rest / flows-dock) has the same shape. The earlier v1
rig (`cap-close-pad.mjs`) DID click `c2-dock-home`; v2
overwrote its frames. Every preamble in the chain
(`r20-preamble.mjs`, `r21-preamble.mjs`,
`r21close-scratch/close-preamble.mjs`) shoots with no
content check. So "Flows" frames were photographs of the
shell's default route - Center - filed under Flows names.

R20's F-18 fix declared divergent purposes in MARKUP
(`data-surface-purpose`) and never verified composition at
the glass. That is the second offense of the evidence-hygiene
species (V-4 was the first): a metadata claim standing in for
a rendered fact.

### (b) The structural fix: content-signature assertion

`shots/regression/rendered/lib/surfaceSignature.mjs` (+
`surfaceSignature.test.mjs`, node tests 7/7) now sits in the
rendered-capture lib every close-out rig imports. Signatures
are defined from the real DOM testids of each surface:

- flows: `c2-home` + any of `c2-moment-stones` / `c2-feed` /
  `c2-trivia-card`, and NONE of the other surfaces' roots
- center: `c2-center-opening` + `c2-center-orb`
- chats: `people-chats-list` / `chats-row`
- graphs: `c2-graphs`
- thread: `thread-shell` + `thread-composer`
- plan-detail: `c2-graph-detail`
- you: `c2-you`

`assertSurfaceSignature(page, surface, frameName)` throws
`SurfaceSignatureError` on mismatch: no file is written, the
capture fails loudly. The suite pins the cross-cases (a Center
DOM fails the Flows signature and vice versa; an empty DOM
fails; an unknown surface fails closed). The gate fired for
real during this run: a light-mode Center frame whose DOM had
not rendered (rate limiter, below) was REFUSED - "DOM actually
carries: (no signature markers)" - and re-shot only when the
surface was truly present. That is the fix working, not a
nuisance.

### (c) Pack-v2 audit: 23 mismatched frames, 11 families

Every surface-named family in `shots/repair19/pack-v2` was
sampled at the glass (PNGs opened and read) plus rig logs:

| Family | Frames | Actually shows |
| --- | --- | --- |
| flows-rest | 2 | Center opening |
| flows-dock | 2 | Dock crop only - no surface, no active slot |
| flow-rest | 2 | Center opening |
| flow-dissolve-1..3 | 3 | Center opening (dark) |
| home | 2 | Center error state |
| home-rest | 2 | Center opening |
| home-vs-center-home | 2 | Center opening (identical to its own center half - F-18 itself) |
| pad-rest-flows | 2 | Center opening |
| pad-dissolve-flows | 2 | Center opening (incl. the founder's frame, badge 22744b3) |
| pad-rest-plan-detail | 2 | Graphs list (plan click no-oped on an empty seat) |
| pad-dissolve-plan-detail | 2 | Graphs list |

Verified CORRECT at the glass: pad-*-chats, pad-*-graphs,
pad-rest/dissolve-thread, chats-list, graphs-list,
center-deck-rest, thread, graph-detail, plan-detail-limbo,
home-scrolled. The mismatched frames were NOT re-shot or
renamed in place - the audit is a finding, recorded here and
in the ledger (F-18 flipped to REOPENED with the founder's
evidence; rows R21-W8..W11 added).

## W-9 - The Flows rebuild (founder charter: override, don't patch)

### Disposal list (each path, what it did wrong, the proof of absence)

| Disposed | What it did wrong | Absence proof |
| --- | --- | --- |
| Capture rigs `cap-close-padA.mjs`, `cap-close-padB.mjs`, `cap-close-pad2.mjs`, `cap-flows-label.mjs` (as authorities for Flows frames) | Filed Center's opening under Flows names; bare-sleep navigation, no content assertion | Superseded by the signature gate (W-8b): their pattern can no longer produce a filed frame anywhere the lib is used; gate test + the live refusal in this run |
| `StoryRail` + `StoryCellFace` in `C2Home.tsx` (the face-circle rail, classes `c2s-rail` / `c2s-story-*`) | Instagram's composition, BANNED by the founder's identity addendum (2026-10-20 15:46) - a rail of face circles with names under them | Source scan: zero `StoryRail` / `c2s-story` / `c2s-rail` in `C2Home.tsx` or `c2shell.css`; jsdom pin asserts the rail testid AND the `c2s-story-avatar` class string are absent from the rendered surface |
| `loadPlans` in `shellData.ts` | A dead error-swallowing wrapper duplicating `loadPlansResult` - a shadow derivation of the plans read (the charter's wrong-read species) | Zero callers before removal (grep); removed outright; `loadPlansResult` is the single gate |
| The markup-only F-18 gate (`c2-home-lead-people` / `c2-home-lead-moments` labeled section headers + `.c2s-home-lead` CSS) | Declared divergence in labels while the compositions matched; section labels also violate the Discovery Doctrine (shape is the label) | Components and CSS removed; pins assert the testids are absent; divergence is now proven by composition (signature + frames), never by labels |
| The Center explainer doorway (component + `.c2s-center-doorway*` CSS) | A card explaining the product on the product's working surface (W-11) | Markup and CSS deleted; pin asserts `.c2s-center-doorway` does not exist in the stylesheet |

### The surface as rebuilt

Register: **PLAY** (Center = Opal working; Graphs = craft).

- **Moment Stones** replace the rail. Small opals (organic gem
  radius, never circles) carrying the moment itself - its own
  media through the authenticated image path, the person's
  photo, or their initials, with the initials ALWAYS rendered
  under any image so a stone is never blank mid-load. Borders
  are STATE FIRE: happening = cyan fire, loved = warm ring
  metal, new = the iridescent current, seen = quiet line.
  Order is the living graph's: happening (author hosts a live)
  > loved (spouse / partner / family / close friend on the
  viewer's own relationship rows) > new > seen - never raw
  recency. Every stone is anchored: the person's name under
  the stone is the anchor. First stone is the creation door
  ("Your moment", +) into the existing create sheet / own-story
  viewer, in the same grammar. The story viewer (playback) is
  kept - playback was never the banned composition.
  **Declared gap:** the "nearby" tier of the ordering does not
  exist - no author location is read anywhere in the feed
  path. It is recorded in the Algo Map as a wiring need, never
  faked.
- **The braided stream.** No grid, no uniform rows, no labeled
  sections. The feed runs as two staggered currents (moments
  at half berth with a gentle offset; wide stones at full
  berth): plan cards (a happening plan takes the wide berth
  with its cyan fire at full strength; forming plans sit as
  violet stones), Lives, occasion stones, the Trivia card,
  discovery. Cards enter with a downstream drift; a very
  subtle violet-cyan-gold sheen moves under the surface;
  scroll stays native. Reduced motion: drift and sheen rest,
  the braid still reads statically (stagger + gradient stay).
- **Occasions ahead of time.** From the viewer's own
  celebrations: next occurrence within 60 days, soonest first,
  cap 3, rendered as wide stones with person, kind, date, and
  "Start a plan for them" - a doorway into the real create
  flow, prefilled from the occasion's own words.
- **Moments carry the dopamine leg for real.** Feed memory
  cards show the like count from the HomeFeed record and a
  Love/Loved toggle that writes through the existing
  like/unlike endpoints and re-renders ONLY from the response.
- **Discovery (interest, not just friends).** People the
  viewer talks with who are in neither their circle nor their
  follows appear as stream rows with a Follow control wired
  to the real follows endpoints, re-rendering from the
  response. **Declared:** there is no discovery/suggested-
  people endpoint and no places/interests follow wiring
  anywhere in the product - places and interests follow is
  DECLARED, not painted. No dead follow buttons exist.
- **Settled recap / quick-align:** the feed's own plan cards
  carry settled plans in their resting state (past plans get
  no lit verdict), and quick-align doors are the occasion
  doorway plus the Trivia card's gentle exit. No separate
  furniture was invented.

### Defects found at the glass during this run (all fixed, all pinned or proven)

1. **Home could not scroll.** The capture rig measured
   `c2-home-scroll` at scrollHeight == clientHeight == 4527:
   C2Home's root was a plain div wrapping header + scroller,
   and a plain flex child sizes to content, so the scroller
   never constrained - everything below the fold was
   unreachable in a tall world. (Center's root IS its
   scroller; Home's was not.) Fixed with the route wrappers'
   own pattern (flex column, flex 1, minHeight 0); proven by
   read-back (clientHeight 784, scrollTop 1684 mid-stream).
2. **A sent Trivia guess vanished on reload.** The card
   re-offered the same question as if never sent (the loaded
   `mine` list was never rendered). Fixed: pending guesses
   render a quiet waiting line naming the subject, and a
   question with a guess out leaves the round pool until its
   subject answers. Pinned.
3. **Stones could render blank** while their image was in
   flight (caught in the first light frame). Fixed: initials
   always rendered under the image; a failed image removes
   itself. Proven in the re-shot light frames.
4. **A spent round showed a bare "Send my guesses"** with no
   questions left. Fixed: the round says quietly "All caught
   up here - new questions arrive as Opal learns your people,
   and answers land back on this card."
5. **First-pass stones read near-circular with truncated
   names** ("Your mo...", "Maya Tor..."). Stones grew to
   84x94 with a more asymmetric gem radius, cells widened,
   names set at caption size - anchor names fit whole.

### Know Me? Trivia - the spec as built (founder directives 2026-10-20 15:41-15:43)

- **The hook is mutual knowing:** "do I know my friend - do
  they know me?" The NAME carries the hook (Know Me? is the
  question); after the CF-2 cut the card adds no explanatory
  copy at all - the game itself is the pitch.
- **Round structure: never one question.** An opening set of a
  few (3), then a couple more (2) offered AS A MULTIPLIER -
  bonus questions at x2, opt-in, affecting SCORE only. In this
  seed world the pool honestly holds one question; the
  structure (opening set, bonus offer, multiplier on the
  record) is built and pinned at the contract level.
- **Both sides are players.** The validator's delight is the
  reveal: validation cards read "See what your friend said
  about you" with That is right / Not quite. On "right", the
  response's `capsule_written` drives the note the validator
  sees.
- **Scores are an INERT ledger.** Points = 10 x multiplier,
  summed server-side over validated guesses. No rewards, no
  discounts, no monetization wiring - this supersedes the
  reward-terms language in `polish-concepts.md`.
- **The flywheel, truth-in-model.** A validated answer
  enriches the SUBJECT's own wallet through machinery that
  exists today (the R20 capsule path, `CapsuleRead.remember`),
  provenance-tagged: source_kind `trivia_validation`, source
  label "Confirmed in Opal Trivia", relationship scope,
  counterpart = the guesser unless the guess was anonymous.
  Proven by backend test (validation writes the capsule).
- **AI proposes questions ONLY; verification is NEVER a
  model's.** Questions are templates over records the viewer
  legitimately holds: celebrations identity-resolved to a
  relationship contact by exact name, or the viewer's own
  wallet relationship capsules by counterpart id. An
  unresolved celebration proposes nothing - an unnamed subject
  cannot validate, so the question could never complete.
- **Gates (backend, tested):** the guesser must hold a
  relationship row naming the subject (403 `not_in_circle` -
  exercised live in this run); self-guesses refused; minor
  subjects are gated to family ties only; only the subject
  can validate their own guesses.
- **Completion by play; the exit is alignment.** When proven
  knowing exists (validatedCount > 0), the card offers one
  gentle door - "You know your people. Make something happen
  together." - into the shell's create flow. Quiet, no
  auto-created plans.
- **The collection truth, in the founder's substance:**
  this round structure is Opal's collection engine - verified
  mutual knowledge improving Opal itself and the user's
  experience - running entirely under the play. What the
  system yields (verified, provenance-tagged,
  consent-scoped capsules) is invisible mechanics; what the
  player experiences is closeness.
- **Declared:** validation asks carry no graceful-expiry
  wiring in this build (no limbo/etiquette hook was wired to
  guesses); per-person orbit doorways into the game are not
  built; the validator reveal side could not be framed with
  live seats in the synthetic world (seat B holds no circle -
  the circle gate refused B guessing about A with 403, which
  is the gate working). The reveal is proven at the contract
  and jsdom layers, not in a frame. Blockers named, nothing
  painted over them.

### Per-asset journey table (UI -> contract -> single gate -> projection -> render -> read-back)

| Asset | Journey | Status |
| --- | --- | --- |
| Moment Stones | story records -> home feed stories leg -> `homeFromSession` rail derivation (state + living-graph order in ONE place) -> `MomentStones` -> stone tap opens the same story viewer the rail used | LIVE, framed |
| Self stone / creation door | capabilities on the rail projection -> self stone -> existing create sheet / own-story viewer | LIVE |
| Feed moments + like | HomeFeed memory cards (like_count / viewer_liked on the record) -> feed projection -> `MemoryFeedCard` -> like/unlike endpoints -> re-render from response only | LIVE (seed world's feed held plans only; the like leg is pinned in jsdom and wired to the served endpoints) |
| Plan stones in the stream | plans -> `loadPlansResult` (the single gate) -> feed interleave -> `PlanCardC2` unmodified -> tap opens the graph | LIVE, framed |
| Lives | lives leg -> live hosts also drive the stones' happening tier -> live cards in the stream | LIVE (no live was running in the seed world at capture; the happening tier fired via the viewer's own live story) |
| Occasions | celebrations -> `occasionsFromCelebrations` (pure, pinned) -> occasion stones -> create flow prefilled via `occasionPlan` | LIVE, framed (a celebration was recorded for the seat through the real POST /celebrations - declared exercise, below) |
| Know Me? Trivia | celebrations + relationships + own wallet capsules -> `buildTriviaQuestions` (pure, scope-pinned) + GET /trivia/guesses -> `C2Trivia` -> POST /trivia/guesses (circle/minor gates) -> subject validates -> capsule write (R20 path) + inert score -> read-back renders from the reloaded projection (waiting line, score, gentle exit) | LIVE end to end; played in the browser during capture (guess recorded 23:23Z, status pending, read back in frames); validation leg proven at API/test layer (see Declared) |
| Discovery people | conversations + relationships + following -> peers in neither circle nor follows (cap 5) -> rows -> follow/unfollow endpoints -> re-render from response | LIVE, framed mid-stream (rows render after the plan stones) |
| About You (in the Trivia card) | viewer's own memory facts -> first fact on the card -> confirm/correct writes a capsule with trivia provenance via the existing capsule create | LIVE wiring; no fact existed for the capture seat, so the section honestly did not render |
| Settled recap | past plans in the same feed read (no lit verdict for past) | LIVE |
| Places / interests follow | - | DECLARED ABSENT: no endpoint or store exists; not painted |
| Nearby ranking tier | - | DECLARED ABSENT: no author location is read in the feed path |
| Travel intent | - | DECLARED as doctrine in the Algo Map; no extraction exists |

### The acceptance bar (founder, 2026-10-20 15:57 PDT) - VERBATIM

(1) IT MAKES SENSE - legible in seconds.
(2) SEXY + SLEEK - the standing brand bar.
(3) HOMEY - relatable, understandable, INTUITIVE above all: a non-technical family member gets it on first sight.
(4) SOCIAL SCIENCE, APPLIED AND CITED: the layout's decisions use the field's real evidence - variable discovery rewards, social proof/modeling, open loops that plans close, endowed progress, peak-end - and the rebuild report NAMES the principle behind each major layout choice. (So: every major composition decision in the rebuild carries a named principle in the report, not a vibe. Where a principle from his list does not honestly apply to a choice, do not force the citation - name the principle that actually governs it.)
(5) NOT STUPIDLY FANCY: the giants' billions in UI research are RESPECTED - proven patterns are the bones (familiar core), invention lives at the edges (functional novelty only - the standing law).

### The bar, walked against the frames

1. **MAKES SENSE.** The side-by-sides separate in one second:
   people and their moments vs the orb and your deck. On
   Flows, every element names itself by being what it is - a
   person's stone with their name, a birthday with its date
   and one button, a game that asks its question in plain
   words ("When is Maya's birthday?"). PASS.
2. **SEXY + SLEEK.** The dark frame holds the protected
   balance: near-black room, state fire as the only saturated
   color, opal stones with metal/fire borders, the sheen
   under the stream. Nothing chrome-heavy was added; the
   additions are shapes and light. PASS, with the note under
   (4) that the braid's full rhythm needs a moment-rich world
   to be seen at its best.
3. **HOMEY.** A family member reads the opening top to bottom
   without instruction: your moment, your people, a birthday
   coming up with "Start a plan for them", a game about
   knowing your people, then your plans with who is going.
   No internal vocabulary appears anywhere on the surface
   (no "projection", no state names - states are colors and
   plain words like Ready / Forming / Live). PASS.
4. **SOCIAL SCIENCE, APPLIED AND CITED** - principle per
   major composition decision:
   - Moment Stones ordered by the living graph (happening
     first): **social proof / modeling** - the people in
     motion lead because people copy people; live social
     evidence outranks static content.
   - Occasions AHEAD of time with the plan door inline:
     **open loops that plans close** - an approaching birthday
     is an open loop; the surface offers its closure (a plan)
     at the moment the loop opens, never after it lapses.
   - The Trivia round (opening set, then the multiplier
     offer): **endowed progress** - the player starts inside a
     set already partly theirs (questions about people they
     demonstrably know), and the opt-in bonus arrives only
     after the first send, when progress feels owned.
   - Interleaved kinds with no labeled sections, shapes
     varying down the stream: **variable discovery rewards** -
     the next card's kind is not predictable (moment, plan,
     game, person), which is the variable-ratio texture that
     keeps a stream feeling alive WITHOUT a dwell-time
     objective: here the variability serves the exit (a plan,
     a place), per the doctrine.
   - The validator's reveal as the reward: **peak-end** - a
     round's memorable peak is not the score but the reveal
     ("see what your friend said about you"); the ledger is
     deliberately quiet so the peak stays social.
   - The gentle plan exit after proven knowing: the
     **modeling effect** cashed in - demonstrated mutual
     knowledge is the warmest possible moment to propose
     doing something together.
   - The stones' state-fire borders: NOT a social-science
     claim - the governing principle is the house ambient law
     (state speaks in light, seen not heard); no citation
     forced.
5. **NOT STUPIDLY FANCY.** The bones are the proven patterns:
   a top people row, a vertically scrolling stream, cards with
   one action each, a five-slot pad. Invention lives exactly
   at the edges and is functional: the stones' shape and fire
   (identity + state at a glance), the braid's wide/narrow
   berths (importance by shape), the sheen (room light, no
   information). Nothing on the page requires learning a new
   gesture. PASS.

**The thirty-second demo read** (what an investor sees, in
order, from the frames): seconds 0-3, stones - "these are my
people, one is live right now" (cyan fire); 3-8, the birthday
stone - "it knows what is coming up and offers the plan";
8-18, the Trivia card - its name asks the hook question, the
score sits on it, a waiting line shows a round in flight, and
its light sets it apart from every other card on the page;
18-30, the stream - wide plan stones with who is going
and where, forming plans in violet, discovery below. The
difference demos itself: this is a social surface whose every
element points OUT THE DOOR. Where the read is weakest: the
seed world's feed is plan-heavy (nine plan stones, no moment
cards in this seat), so the braid's narrow current is proven
by structure and pins more than by this world's content - I
say so rather than stage a moment.

### Intended eye-path (W-9 eye-path law, against the first-paint frame)

- **First fixation:** top-left, where the trained eye lands -
  the self stone in cyan fire ("Your moment / Live"): the
  highest-value state (happening) sits at the entry fixation,
  and the creation door is inside the natural thumb arc's
  upper reach.
- **The drift line:** down the left-to-right stone row
  (people, in living-graph order - happening > loved > new),
  then the eye drops into the stream's river: occasion stone
  (an open loop with its closure), the Trivia card (play),
  then the wide plan stones.
- **Where each kind is met:** people first (stones), time
  second (occasions), play third (the game), plans as the
  stream's wide stones throughout the scroll, discovery last
  (new people are the reward at depth, not the headline).
- The braid varies ACROSS the current (half-berth moments
  offset against wide stones), never against the trained
  vertical direction; primary actions sit inside cards at
  thumb height as the stream scrolls. Nothing in the
  composition taxes the trained scan - judged on the frames
  before filing, including the mid-stream pair.

### The Flows algorithm doctrine + the Social Flow Algo Map

Doctrine, in the founder's substance: the flow spends
interest to GET PEOPLE OUT THE DOOR - surfacing place options
where they ARE (local) and where they are GOING (travel
intent from far plans) - optimizing for plans formed and
places visited, NEVER dwell time.

The full ranking model is a NAMED ARTIFACT: **the Social Flow
Algo Map**, appended to the WALLET_MAP addendum
(`shots/repair18/WALLET_MAP.md`, "ADDENDUM - Repair #21: the
SOCIAL FLOW ALGO MAP") and summarized here. It draws ranking
in the wallet's geometry: interests are NOUN capsules,
activities are VERB capsules, people hold SETS; discovery is
governed by the same Venn rules as shared memory, and the
Scoped Context Builder's {relevant} ∩ {allowed} is the
read-time form of the ranking picture. Weights as the model
defines them: rank 1 = the intersection (my interests ∩ my
people's lived experience); rank 2 = FoF intersections
(discovery gold - new, but socially warm); rank 3 = circle
activities (modeling); rank 4 = my interests alone; rank 5 =
extended activities; aversions filter throughout (likes and
dislikes both first-class, same scope discipline); group
commons feed quick-align. Scope gates are absolute and named
per signal: only shared/public signals are lawful inputs - a
friend's PRIVATE capsules never enter another's flow. The
map's truth column states signal by signal what exists today
(the circle feed and the happening/loved stone order are
REAL; declared interests, the overlap computation, FoF reads,
group commons, travel intent, and the aversion filter are
ROADMAP, drawn as roadmap).

## W-10 - Pad active state

The dock now says where you are, in glyph AND label: the
active slot takes accent ink, a scaled glyph, a full-weight
label, and a 6px marker; the center orb - which previously
carried NO active state at all - takes `data-active` +
`aria-current`, an accent ring on its disc, and its own
marker when Center is current. Proven three ways: the jsdom
pin walks all five surfaces asserting exactly one active
marker each; the capture log records the same from the live
DOM; the pad frames show it (in `flows-vs-center`, the Flows
slot burns violet on the left while the orb rings on the
right).

## W-11 - Center discovery pass (element by element)

| Element | Disposition | Reason |
| --- | --- | --- |
| Orb hero (the Soul & Memory doorway) | KEPT as control | It is a doorway, not an explanation; its label lives in aria, not on the glass |
| Greeting ("Good evening, Ethan.") | KEPT | Identity, not narration |
| Make something happen | KEPT as control | An action control, founder-explicit |
| Talk to Opal | KEPT as control | An action control, founder-explicit |
| "How Opal works for you" explainer card | REMOVED (markup + CSS disposed); its words FOLDED behind the existing (i) | Explanation on the surface, against "let the people figure it out themselves"; folding reuses the shell's ONE InfoBubble pattern (calm wave W-2) - the frame shows the small (i) under the actions, no second pattern invented |
| "Nothing needs you right now. It is all yours." | REMOVED outright | Status narration of the named class; when nothing needs you, no sections render and the opening is simply quiet - a state the user can see, not a sentence Opal says about itself |
| Needs-you deck, Next, Coming up, Taking shape sections | KEPT | Content, not commentary - the deck's own plan logic untouched |
| Reveal sections (P5/P6/P7) | KEPT | Content carried by real signals |
| "All quiet. / Nothing needs you right now." inside the Activity overlay | KEPT, noted | A different surface: an empty-state line inside a modal list, labeling an empty list - not narration over Center's opening. Named here so the call is visible, not silent |

## Integrator notes: C2Shell.tsx / c2shell.css hunks touched

The sibling Orbit v4 cluster edits the frost strip in
`c2shell.css` and OrbitScreen/composers; v4 merges first.
My changes are localized and additive:

- `C2Shell.tsx`: (1) HomeRoute gains `onOccasionPlan` /
  `onMakePlan` props wired to the shell's existing create
  state (prefill + `setCreateKind("plan")`), passed into
  `C2Home` events as `occasionPlan` / `triviaMakePlan`;
  (2) the center dock button gains `data-active` /
  `aria-current`; (3) DockSlot's label span gains the
  `c2s-dock-label` class. No frost, orbit, or composer code
  touched.
- `c2shell.css`: (1) the story-rail rule block REPLACED by
  the Moment Stones block (`c2s-stone*`) and the braided-
  stream block (`c2s-stream`, `c2s-discovery*`, trivia/like
  helpers) at the same location (feed section head);
  (2) the `.c2s-center-doorway*` rules DELETED (W-11);
  (3) the W-10 dock block added AFTER the base
  `.c2s-dock-center-disc` rule (glyph/label active states,
  center active ring) - one existing rule amended inside it:
  the active slot's `::after` marker grows 4px -> 6px;
  (4) `.c2s-stone[data-state="loved"]` ring-metal mix at 55%
  (inside the ambient envelope pin). No frost-strip lines
  touched.

## Tests

- Signature module: `node --test` 7/7 (cross-surface failures,
  empty DOM, unknown surface fails closed, frame-name claim
  mapping; flows signature extended to the rebuilt markers).
- Backend: `mix test test/opal_core/trivia_test.exs` 6/6
  (record + circle gate + minor gate + self-guess refusal +
  validation writes the subject's capsule with provenance +
  inert score math). `mix precommit` was run: its compile
  step fails on 69 PRE-EXISTING warnings-as-errors in files
  this cluster did not touch (zero warnings in the trivia
  files); my files are `mix format`-clean. Named, not
  absorbed: precommit is red at base for the same reason.
- Web: new `r21Openings.test.tsx` 10/10 (first-paint
  composition, honest absence, question scope x3, occasions
  builder + action label, waiting read-back, CF-2 copy cuts,
  T-2 score presence, Center narration absence, pad active
  state across all five surfaces). Updated pins: r20Connect
  (F-10/F-18/compass), smSoulMemory (doorway), dir4Reveal
  (calm line). Full suite: 24 failed / 17 files on my tree -
  and 24 failed / 17 files at base `22744b3c`, with the
  failing-test sets verified IDENTICAL (full-run diff plus
  two base-worktree spot-check rounds covering every failing
  file). The brief's "23 failed / 16 files" figure does not
  reproduce at this base; the reproduced baseline is 24/17
  and this tree matches it test for test, absorbing nothing.
  (The two regressions my CSS briefly introduced mid-run -
  r20Vault F-5, ambientRest ring-metal envelope - were caught
  by that comparison, fixed, and re-verified absent.)
- Typecheck: exactly the 9 pre-existing errors, none new.

## Capture campaign notes (honest record)

- The API rate limiter (1000/user/hour, DB-backed, by design)
  exhausted seat A's budget mid-campaign - the same condition
  the R20 campaign recorded. The signature gate refused the
  affected frame rather than filing an error state. The
  seat's bucket rows were cleared in the synthetic dev DB to
  finish the light pass; no product code or limit was changed.
- Declared exercise data (all through real product endpoints,
  in the synthetic world only): one celebration (Maya Torres,
  birthday Oct 23) recorded for seat A via POST /celebrations
  so occasions could render at all - the seed world gave the
  seat none; one Trivia guess played IN THE BROWSER through
  the real card (the record it created is the one the frames
  read back).

## Declared (with blockers)

1. Trivia validation expiry - no limbo/etiquette hook wired
   to guesses in this build.
2. Trivia reveal side not framed with live seats - the
   synthetic world's second seat holds no circle (gate proven
   by its 403); reveal proven at contract + jsdom layers.
3. Places / interests follow - no endpoint or store exists.
4. Nearby stone tier - no author location is read in the feed
   path. Travel intent - no extraction exists. Both drawn as
   roadmap in the Algo Map, never faked.
5. Wishes-as-messages for occasions (the concepts sketch's
   queued wishes) - occasions carry the would-love line when
   the celebrations record holds it; a wish composer was not
   built.
6. `mix precommit` red at base (69 pre-existing
   warnings-as-errors); this cluster adds none.

## Parent inspection charges (2026-10-20 16:46) + founder steer T-1..T-4 (16:52) - answers

RE-SHOT FRAMES (all under the signature assertion, on the
charges-round builds; listed first as charged):
`flows-opening-{dark,light}.png`, `flows-stream-mid-{dark,light}.png`,
`flows-trivia-dark.png`, `flows-vs-center-{dark,light}.png`
(rebuilt from the new openings), plus the pad/center frames
refreshed in the same passes (no content change there).

### CF-1 - the giant beige eggs: FIXED at the source, and it was the rig, not the design

The seed moments carried REAL imagery all along: story
records and plan records point into the local media store
(`/api/v1/product/social-moments/media/<id>` - real JPEGs,
57-83KB). My capture Phoenix ran from an app directory whose
`priv/local_media` was empty - the seed's files live with the
stack that seeded - so every image 404'd and the stones fell
back to monograms at 84x94, reading as eggs. Rig plumbing
fixed at scratch level (media store linked for the capture
Phoenix; on any single-stack run - the founder's - the files
and the server already live together). Stones also shrunk to
a rail-height presence (68x78, cells sized so anchor names
never clip). The re-shot openings show it: Ethan's stone
carries his coastal photo in cyan fire; Maya's carries her
flower-stall photo (her story's own caption: "Flower stall
haul at the market this morning").

### CF-2 - the Trivia card was a wall of text: CUT to the game

Every explanatory sentence is gone: the hook paragraph, both
section labels ("A round - how well do you know them?",
"About you", the reveal's header), the how-it-works line
under Send, the "All caught up here..." narration (renders
nothing now), and the exit's narration line (the door button
stands alone). What remains is the game and its state: the
title, the score (T-2), waiting lines, the reveal cards, the
who-picker, questions, entries, Send, the plan door. Pinned:
the test asserts the cut strings' absence and the game's
presence.

### CF-3 - the braid: photographic now; the narrow current is declared, not faked

Two of the three scaffold symptoms died with CF-1's fix: the
plan wells carry real photos (the market shot fills the
frame), and the Forming dashed border now reads as what it
is - the canon state pattern - against photographic content,
not as scaffolding. The stream also gained the bend: wide
stones sit a breath off the center line in alternating
margins. What remains true and is DECLARED, not padded: this
seat's world holds no feed moment cards (the home-feed read
returns zero objects for the seat), so the braid's narrow
current has nothing to braid with in the presented frames -
the two-current rhythm is structural and pinned, and it
blooms when a world carries moments. I did not stage a
moment to fill it.

### CF-4 - "Start a plan for them": fixed in the derivation

`occasionsFromCelebrations` now produces `actionLabel`
("Start a plan for Maya" - first name from the record); the
card renders the derivation's words and assembles nothing.
Pinned at the builder.

### T-1 - the spectacle: built, with its justification

The Trivia card is the page's one sanctioned show-off:
animated multicolor light moves around it and its shadow
plays (three keyframe spectra), and the light ANSWERS ITS
STATE - "validation" (a friend's answer waits on you) burns
warm and quicker; "waiting" (your guesses are out) breathes
cool cyan-violet - the state visible in both re-shot
openings; "round" runs the full slow spectrum. One-sentence
justification, per the ambient rule: play lives here, and
the light tells you the game's state. Reduced motion rests
the spectacle into a static, state-colored shadow - the
state still reads with no motion at all.

### T-2 - score on the card: done

Once the user has played (any guess out, any validation in,
any confirmed), the score sits in the card's byline: "0
points" in the frames (played, nothing confirmed yet), "N
points - M confirmed" after. Inert as ever: display only.

### T-3 - friend selection inline: it already was; kept and verified

The who-picker is the subject chips ON the card (Maya today,
one tap to anyone else with questions). No sheet or window
stands before the game anywhere in the flow - none existed
and none was added. Once a round starts, the card is the
game entire.

### T-4 - social substance: the meal is photographic now

With the media store serving, the stream's dominant content
is photographic social life: story photos in the stones,
place photos filling the plan stones, people anchored on
every card. No letter tile or monogram egg appears in any
presented frame (monograms survive only as tiny byline
avatars and as the never-blank fallback UNDER a loading
photo - neither is an image tile). Any content kind that
cannot carry a real photo presents in non-image form or not
at all - the plan path's existing doctrine (no qualifying
field -> no media well) already enforces this.

Round structure note, with the founder's rationale recorded:
the few -> multiplier -> score round stands because nobody
opens an app to answer ONE question - the series is the
smallest unit of play that feels like knowing someone.
