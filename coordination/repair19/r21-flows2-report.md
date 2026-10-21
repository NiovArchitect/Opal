# Repair #21 - Cluster Flows Wave 2 (W-12..W-15 + I-1..I-3 + T-WORD)

Branch: `muse/r21-flows2` (base `4dd0e940`, the r21-openings tip).
No merge, no deploy, `muse/repair-17` untouched. All frames
390x844, both modes, `opal_dev=1` badge, every frame asserted
against its surface's W-8 content signature before the file was
written (a rejected frame does not ship).

## Frames (all in `shots/repair19/r21-flows2/`)

| Frame | Proves |
|---|---|
| `flows-first-dark.png` / `flows-first-light.png` | Round 3 state of first paint: ROUND stones with thin orbit rings (F-A; the live ring marbled, W-19), NO presence strip (F-B), the happening strip (Maya's Live at Oceanside Pier) with breathing room under it (F-C), the trivia POSTER resting below (pair + tease + Play door) |
| `flows-live-copresence-dark.png` / `-light.png` | I-3 + CF2-3 + V-c + F-C: the Live card at the stream's full berth (media well in the host's tint), the place stated once, co-presence as a light orb (no letter tile), real downstream spacing before the next section |
| `flows-trivia-poster-dark.png` / `-light.png` | T-5: the game POSTER with the round OPEN (Play tapped) - a person owns it ("Know Me? - Maya"), the pair line ("You & Maya - 10 points - 1 confirmed"), the face-down tease above the round, the game's own actions only (CF2-1 stands), V-d rest light in the still |
| `flows-trivia-poster-pending-dark.png` / `-light.png` | T-5 second state: a REAL pending validation (Maya answered about Ethan, staged through the endpoint) - the tease is the lure ("Maya answered one about you - see if Maya knows you."), the spectacle deepened to its validation burn |
| `flows-moment-unlit-dark.png` / `-light.png` | F-D/F-F resting card, glyphs only: the light HEART at a glisten (marble body, orbit ring), the reply glyph, the graph-in glyph - no words, no numeral, no button farm |
| `flows-moment-lit-dark.png` / `-light.png` | F-D after one touch: the heart LIT (marble fully up, gold tier glow), counts-free; the card rests quiet again (panel closed) |
| `flows-moment-doors-dark.png` / `-light.png` | F-F: the OPENED take-panel (graph-in press) - the four branches as drawn party compositions with captions of at most two words (Join / Solo / My people; Again lives on plans) |
| `story-viewer-dark.png` / `-light.png` | W-17 extended: story consumption - Maya's round stone tapped, her moment full-screen (real media, progress, caption), the Reply glyph live at the foot; no heart/take glyphs (declared, D-15) |
| `story-viewer-exit-dark.png` / `-light.png` | W-17 extended: the exit return - the same stream, position preserved (Home never unmounted under the viewer) |
| `bond-rich-dark.png` / `-light.png` | W-12 rich pair (Ethan + Maya Torres): next together (Saturday market, Ready), one chapter stone (Saturday ride), four shared-place stones, Start a plan + Orbit doors |
| `bond-sparse-dark.png` / `-light.png` | W-12 sparse pair (seat B + Ethan): person, tie, Start a plan + Orbit - nothing invented (`data-sparse=1` at capture) |
| `bond-pair-score-dark.png` / `-light.png` | W-12 pair score at the served layer: "Know Me? 10 - 1 confirmed" as a glowing felt chip (real guess by Ethan, validated by Maya in her browser, then read back on Ethan's stone) |
| `creation-sheet-dark.png` / `-light.png` | W-17: the add sheet - three tense stones (Now / Ahead / Settled, told by state fire) + Photo or video / Text / Go live doors, no explanatory copy |
| `creation-future-dark.png` / `-light.png` | W-17 HEADLINE: the future stone's next step - the graph-create flow anchored by the forming stone, named by the typed What; What / When / Where / Who, Create |
| `creation-photo-dark.png` / `-light.png` | W-17: the photo door's next step - the media composer with the Story \| Post destination switch, a real photo in the well, caption, Share post |
| `creation-text-dark.png` / `-light.png` | W-17: the text door's next step - the text composer, words typed, Share post armed (caption-only is lawful) |
| `creation-live-dark.png` / `-light.png` | W-17: the go-live door's next step - the venue step in the server's own words ("Where are you?"), Places honestly unavailable in this stack, the server's manual entry carrying name + city, the consequence line, Go live armed |

Capture world: a fresh dev DB (`opal_dev_r21f2`) seeded by the
founder seed through the real endpoints, then staged only through
real API paths (A-B conversation, two published moments with real
seed-asset photos and places, a clean-venue go-live via the dev
fixture place path, a set-type write, a trivia guess + in-browser
validation). Scripts: `flows2-scratch/` (`probe-flows2.mjs`,
`stage-flows2.mjs`, `cap-flows2.mjs`, `cap-sparse-score.mjs`).

## Per-item dispositions

### W-12 - The bond surface (the shared stone) - LIVE
Tapping a person lands on the pair's stone: stone anchor name on
Flows, and "Our stone" on the person profile sheet. Contents are
FELT objects only: next-together stone, chapter stones
(done-and-loved), shared-place stones, the Know Me? pair-score
chip, and the doors out (Orbit / the shared plan in Graphs /
Start a plan). A pair with almost nothing gets the sparse stone:
the person, the tie, and the door to begin.

Mutuality is structural, not promised: `bondFromPair` (pure
builder) takes shared plans, their rosters, and the pair's trivia
guesses - there is NO capsule parameter in its signature, so a
private capsule cannot feed the stone; viewer-private plans are
excluded before the roster check. Pinned in tests.

Journey row (bond): tap -> `loadBond` (relationships identity
gate -> plans + per-plan `getPlanHistory` roster intersection,
capped at 24, viewer-private excluded -> pair trivia guesses
both directions) -> `bondFromPair` (shared truth only) ->
`BondStone` render -> doors: Orbit = the pair's scoped Opal
conversation; chapter/next stones -> `openGraph(planId)`;
Start a plan -> CreateFlow prefilled with the pair.

Declared under W-12 (see Declarations): D-5 shared interests,
D-6 the relationship-contact requirement, D-10 seed-person score.

### W-13 - The feedback loop, Opal-style - LIVE
Founder-docs intent, found and restored: the founder's
social-flow-calendar material (`founder-docs/social-flow-calendar.txt`)
asks for a feed that "feels more like a social feed... See what's
trending, join in on the fun with a single tap" and for users to
"interact with events directly from the feed by RSVPing, liking,
or commenting". Restored in Opal's own language, not as a clone:
the like is LIGHT (one tap, glow tiers, counts-free - I-2), the
comment's heir is the REPLY DOOR (opens the author's direct
conversation - a door, never a comment-thread swamp), and the
RSVP's heir is I WANT IN (I-1 join, which forms a graph). The
settled-plan "Do that again" is the existing R20 F-15 pattern
(RepeatPlanFlow via `source_plan_id`), wired into the same door
family (I-1).

Backend: `SocialMomentEngagement.light_roster/2` - the author
alone receives the who-lit names; everyone else receives warmth
only. Route `GET /social-moments/:id/light`.

Journey rows:
- Light: card control -> PUT/DELETE `/social-moments/:id/like`
  (visibility gate) -> engagement summary projection
  (`viewer_liked`, warmth) -> glow-tier render, no numeral ->
  feed read-back shows the lit state + tier.
- Who-lit: own card -> GET `/social-moments/:id/light` ->
  author-only gate -> names projection -> names rendered beside
  the light on the author's card only -> read-back in frames
  (Ethan's own card shows "Maya Torres" after she lights it).
- Reply: Reply button -> `ensureDirectConversation(author)` ->
  thread route -> the conversation is the reply's home.

Also fixed, found on the way: the feed adapter read flat
`like_count`/`viewer_liked` fields the feed card never emits, so
served moments always rendered 0/unlit; it now reads
`engagement_summary`, the contract the backend actually sends.
And `HomeFeed.to_feed_card` now carries `place_label` from the
moment's normalized `place_ref`, so cards show "At <place>".

### W-14 - Presence as one felt thing - LIVE (depth declared)
One presence strip under the stones, in the lights language:
each present person is a light with their name (frame:
flows-first). Built only on real machinery: the Lives leg
(`GET /lives/visible` -> rooms -> host lights). What "free"
derives from today: being live. A general "who's free" state is
D-2 - availability reads are conversation-scoped today, so no
Flows-level free/busy claim is painted.

### W-15 - Lives + happening first - LIVE
The happening strip (Lives + plans in the happening state,
`happeningFirst` ordering) sits directly under the stones on
first paint, inside the braid and the eye-path law; the braid
below keeps moments, occasions, and trivia. Extension-of-circle
(strangers/influencers as interest nodes) is D-8: no lawful
candidate source exists in today's machinery, so first paint
carries circle content only - designed + declared, never faked
with planted strangers.

### I-1 (refined) - Content becomes plans: the four doors - LIVE
Parent addition under the founder's delegation of 2026-10-20
17:55, refined 2026-10-20 17:57 into the four-branch family.
One quiet "Make it yours" toggle per card opens the door row -
no window maze. Every branch lands in the real graph-create
path (`POST /opal/plans/graph-create`) with the seed's
place/activity prefilled and its party set per branch. The seed
carries provenance: graph-create accepts `inspired_by_moment_id`,
validates the moment is visible to the creator (an invisible or
junk id is refused with `:inspired_source_not_visible` and zero
rows written), stamps the lineage into the plan's alignment, and
exposes it on the plan contract; inspired creates opt out of the
identical-intent dedupe, like repeats do.

Journey rows, one per branch:
- JOIN (friend's moment): doors compose [author] as the party ->
  CreateFlow opens with the party locked as a fact line, the
  place prefilled -> graph-create with `inspired_by_moment_id` ->
  lineage stamped + returned on the contract -> read-back.
- JOIN (plan): the party is read at door time from the plan's
  history roster (`getPlanHistory().who`) - never carried on the
  card -> same create path, `source_plan_id` rides too. A viewer
  already in the plan is not offered Join.
- TAKE IT SOLO: party = [] and audience = private, locked ->
  CreateFlow renders "Just you - private." and submits NO
  participant ids -> provenance = the moment lineage only; the
  original party's data never enters the branch.
- TAKE IT WITH MY PEOPLE: party starts empty in the normal
  picker (the original party is NOT seeded) -> same provenance
  law as solo.
- DO THAT AGAIN (plans only): `source_plan_id` rides the
  existing repeat lineage (R20 F-15), party = the original
  roster read at door time. Moments carry no roster, so Again
  is not offered on moments (D-4).

### I-2 - Light as a gesture - LIVE (depth declared)
One touch lights; long-press deepens the FELT glow while held
(350ms held state) and commits the same single light. Rendering
is counts-free everywhere: glow tiers (cold / warm / warmer /
glow) computed from warmth, numerals never rendered; the poster
sees WHO (names), never a scoreboard. The persisted store has
no depth field, so held depth is not stored (D-3).

### I-3 - Co-presence on Live - LIVE (roster declared)
A Live card carries its co-presence lights: the host, and you.
Joining a Live has no viewer surface today (the standing JA-06
exception), so no Watch/Join door is painted (D-7). The watcher
roster a fuller co-presence needs is D-1.

### T-WORD - "rituals" retired, "rhythms" stands
In-scope sweep (this branch's code + the coordination records
this wave touches): ZERO true occurrences of "ritual(s)" - so
zero replacements were needed and zero remain. The only matches
anywhere in the tree are substrings inside "spiritual"
(onboarding `OpalWorking.tsx`, `holyShitCopy.ts`,
`message_controller.ex`) - not the retired word, untouched.
Out-of-scope sightings: none in the founder docs either. New
copy in this wave uses "rhythms" where the concept appears.

## Ambient reasons (W-9 record)
- Moment glow tier: the warmth of the people who lit it.
- Presence light (strip): that person is live right now.
- Happening strip border (cyan fire): this is happening now.
- Live card co-presence light: this person is present here.
- Bond score chip glow: validated knowing between this pair.

## Declarations (designed + declared, never faked)
- D-1 Live watcher roster: live rooms carry no watcher list.
  Co-presence names the host and the viewer only; a roster fed
  by `report-presence` is the designed next step. Blocker: no
  roster on the room contract.
- D-2 "Who's free": no lawful Flows-level availability read
  exists (availability is conversation-scoped). Presence =
  the Lives leg only. Blocker: no availability projection.
- D-3 Light depth: the like store has no depth field. Held
  depth is felt while held; exactly one light per person
  persists. Blocker: engagement schema carries no depth.
- D-4 Again on moments: moments carry no party roster, so
  Do That Again lives on plans (detail + plan-card seeds).
  Blocker: no moment roster exists to repeat.
- D-5 Bond shared interests: no shared-interest store exists
  and shared capsules are not in code. The stone's overlap =
  shared plans, shared places, pair trivia score. Private
  capsules never feed it - enforced by the builder's signature.
- D-6 Bond needs a contact: the stone loads through the
  viewer's relationships; a person known only through content
  (no relationship row) does not open a stone - their doors
  are Reply and the seed family. Designed behavior.
- D-7 Joining a Live: no viewer/watch surface exists (JA-06
  exception stands), so no join door is painted on live cards.
- D-8 Extension-of-circle: no interest graph or public-moment
  source exists to draw strangers/influencers lawfully.
  First paint is circle-only.
- D-9 Far-future/travel intent seeds: create prefill carries
  place/activity/party/provenance only; itinerary-shaping
  seeds are out of this wave's scope.
- D-10 Pair score for seed persons: seed people hold no
  sessions, so guesses about them can never be validated;
  the score is proven at the served layer with the two
  synthetic seats (real guess -> in-browser validation ->
  stone read-back, frames `bond-pair-score-*`).

## Tests and baseline discipline
- Backend: `social_moment_engagement_test.exs` +
  `graph_create_repair16_test.exs` - 30/30 pass (light roster
  author gate, inspired-by validation + lineage + dedupe
  opt-out, the four-door create compositions).
- Web: `r21Flows2.test.tsx` 14/14 (four doors' party/provenance
  law per branch; bond builder mutuality + sparse honesty;
  counts-free light rendering through the real endpoint; the
  solo seeded create opening locked + private and submitting
  its provenance), `r21Openings.test.tsx` 10/10 still green.
- Signature gate: `surfaceSignature.test.mjs` 8/8, extended
  with the bond surface. One gate ruling changed with reason:
  the bond is a sheet over Flows AND over a thread (profile
  path), so the surface beneath is expected; the stone root is
  the discriminator and a bare thread still cannot file as bond.
- Full web suite: base re-derived in this worktree at
  `4dd0e940` = 30 failed tests / 24 files (741 passed). Final
  tree = 30 failed / 24 files (771 passed; the +30 are this
  wave's new tests). Per-file fail counts identical; nothing
  absorbed, nothing fixed sideways. NOTE: the openings report
  claimed 24 failed / 17 files at the `22744b3c` lineage - the
  difference (+6 tests / +7 files) is pre-existing at this
  wave's base and is named here rather than inherited silently.
- Typecheck: exactly the 9 pre-existing errors (OpalApp.tsx x3,
  productClient.ts plan_type/online duplicates,
  YouSettingsDestination.tsx); none in wave files.
- The wave battery is NOT run here; close-out runs it on the
  integrated tree, per the brief.

## Inspection charges (parent read at the glass, 2026-10-20 19:33 PDT) + founder verdicts (19:45 PDT)

### CF2-1 - Trivia card carried a foreign control - DISPOSED
The leak path, named end to end: `C2Shell`'s route render
passed `onMakePlan={() => setCreateKind("plan")}` into
`HomeRoute` -> the `triviaMakePlan` home event -> `C2Home` ->
`TriviaCard`'s `onMakePlan` prop -> an exit block under the
game rendering Center's "Make something happen" create CTA
whenever `provenKnowing`. Removed at every link (this is the
disposal record): the TriviaCard prop + exit block, the
C2Home event field + pass-through, the C2Shell HomeRoute
prop + event wiring + call site, and the mock field in
`r21Openings.test.tsx`. Zero references remain (grep-verified
across src + shots). The card's actions are now only the
game's - the round and the pending validation. Proof:
`flows-trivia-{dark,light}`.

### CF2-2 - Door farm - FIXED (quiet rest; family behind the designed surface)
- "Make it yours" DISPOSED as a door: it duplicated the
  take-family. Per I-1 refined the family is exactly Join /
  Take it solo / Take it with my people / Do that again; no
  fifth door exists in copy or code.
- The resting moment card now shows the Light control +
  who-lit names (on the author's own card) + ONE unlabeled
  doorway glyph (`c2-feed-doors`, aria-label only, no text).
  The door surface (`c2-door-surface`) opens from the glyph
  or a 500ms long-press on the card (a press starting on an
  interactive element is ignored): Reply (where the
  conversation door is lawful) + the seed doors. Plan cards
  carry the same glyph + surface - Again lives there (D-4).
- Proof: `flows-moment-unlit-*` (resting quiet),
  `flows-moment-doors-*` (the opened surface - Reply / I
  want in / Take it solo / Take it with my people),
  `flows-moment-lit-*` (lit by one touch, quiet again).

### CF2-3 - Live card copy + co-presence marker - FIXED in the derivation
- Dedupe lives in `shellData.liveFeedFromRooms`, not the
  render: when the title already carries the place (the
  default "Live at X", or a custom title containing it),
  `placeLabel` is null and the card makes ONE place
  statement, in the title - the stronger position; the
  context line is "<host> is live" with no place tail. A
  custom title without the place keeps the single
  "At <place>" line. A placeless live keeps the pinned W9
  line "<host> is live now" (an existing suite pins it;
  the derivation honors it rather than absorbing it).
- The co-presence marker is a LIGHT: `.c2s-live-light`, a
  radiant orb whose core is the person's own tint, ringed
  and haloed in the happening cyan - no letters, no tile.
  `role="img"`, named "<host> is here". The shell static
  audit bans raw hex in shell CSS, so the orb is built from
  canon tokens only.
- Proof: `flows-first-*`, `flows-live-copresence-*`.

### CF2-4 - Bond ellipse + form decision - ANSWERED BY FOUNDER VERDICT (V-a); interim rebuild reverted
I initially rebuilt the Bond as a full place and redrew the
chapter motif. The founder's verdict (V-a below) praises the
sheet AS IT STANDS and protects its composition, so that
rebuild was reverted in full: `BondStone.tsx`, the bond CSS
block, and the bond content signature are byte-identical to
the committed wave state, and capture again closes the
sheet through its own close control. On the ellipse half:
the chapter outline in the frames is a CLOSED ring (a
complete outline, unbroken at render) - not an
unclosed/glitching artifact - so under the verdict's own
test no rendering fix was made; the motif stands untouched.

### Founder verdicts (2026-10-20 19:45 PDT)
- **V-a - Bond sheet = PRAISED, PROTECTED.** His words:
  "that whole thing is beautiful. I love it... this is
  fantastic" (the Maya sheet: close friend, the Ready
  stone, overlap places, Start a plan + Orbit). The SHEET
  FORM IS THE DECIDED FORM - decided by founder, argued no
  longer - and its composition joins the protected set.
  CF2-4 is answered by this verdict.
- **V-b - Moment Stones shape = FOUNDER-ACCEPTED INTERIM.**
  "Doesn't necessarily take it away from the Instagram
  storyline, but we can roll with it." The IG-escape is a
  NAMED DESIGN DEBT, not a blocker. No shape work this
  round.
- **V-c - Live card proportion - FIXED.** The Live card
  takes the stream's berth: the happening strip uses the
  stream's gutter exactly, and the card carries the
  standard media well, filled with the designed place
  treatment (the host's monogram in their tint over the
  map motif) washed in happening light - the room record
  carries no stream still, and no stream image is ever
  fabricated (D-7 family). Proof: `flows-first-*`,
  `flows-live-copresence-*`.
- **V-d - Trivia card must read lit in stills - FIXED.**
  The spectacle no longer lives only in motion: the rest
  state carries a lit border (forming violet), three
  corner washes (ready gold / happening cyan / forming
  violet), and a frozen mid-gesture multicolor shadow
  stack; keyframe floors were raised to match, and
  reduced-motion keeps the same stacks, state-dominant
  (round / waiting / validation). Proof: `flows-trivia-*`
  and the card's strip in `flows-first-*`.

### Charges-round verification
- Targeted suites: `r21Flows2` 14/14, `r21Openings` 10/10,
  `homeSocial` 19/19, `c2ShellSurfaces`, `ja06FeedAction`,
  `r20Connect` - 69/69 pass. Signature node tests 8/8 (bond
  signature restored to the wave's sheet ruling). Typecheck
  exactly the 9 pre-existing errors.
- Full web suite on the charges tree: 24 failed / 2076
  passed (2100), 17 failed files - and the failed-test
  NAMES, extracted identically from both runs' logs, are
  exactly the committed wave tree's set (zero new, zero
  absorbed). Both runs' printed summaries agree. (The wave
  section's 30/24 figure came from a different counting
  pass in the earlier session; the name-level comparison
  is the controlling one and it is exact. An in-flight
  reading mid-charges briefly showed two extra failures -
  `c2ShellSurfaces` (raw hex in the new orb CSS) and
  `homeSocial` (the placeless context line) - both fixed
  at the root above, both green in the final run.)
- Capture choreography fix, recorded for close-out: the
  light reset is per-mode now (a like committed in the dark
  pass persists into the light pass; a once-only reset
  inverted the light pair), and the lit frame waits for the
  card's own "Lit" label instead of a fixed sleep (the
  sleep raced the feed refetch and shot the pre-commit
  render). The like machinery itself was never broken -
  state carry-over between passes proved it.
- Frames re-shot this round (both modes each):
  `flows-first-*`, `flows-live-copresence-*`,
  `flows-trivia-*` (new), `flows-moment-unlit-*`,
  `flows-moment-doors-*`, `flows-moment-lit-*`,
  `bond-rich-*` (sheet restored). `bond-sparse-*` and
  `bond-pair-score-*` stand as delivered - BondStone and
  its styles are byte-identical to the state that produced
  them, and re-staging that world would pollute the sparse
  pair (the validated guess already exists in the DB).

## W-17 - The creation walkthrough set (founder request, 2026-10-20 21:20 PDT)

The add sheet, redesigned in the current brand. Before this
round the sheet offered two rows (Story / Post) with
explanatory small print, and no frames of the flow existed.
The sheet now leads with YOUR GRAPHS IN THREE TENSES as
stones in the rail's own geometry - Now (happening fire),
Ahead (forming fire), Settled (the past tone) - one word
under each, then Photo or video, Text, Go live. It explains
nothing. Every door is one move deep. The old rows'
explanatory smalls ("Temporary. Gone in a day." / "Stays on
your Graph.") are removed; the Story destination did not
die - it moved INSIDE the media composer as a Story | Post
switch (the set's own name: Add to story / Add post), both
endpoints real and unchanged.

### Option inventory - wiring truth per option

| Option | Next step | Truth |
|---|---|---|
| Photo or video | Media composer (camera / library are real file inputs) with the Story \| Post switch | REAL for photo (upload -> publish / story endpoints). Video DECLARED: the media path is image-typed end to end (inputs accept image/*, the upload is image media) - the door's video half awaits a video media path |
| Future stone (Ahead) - THE HEADLINE | The graph-create flow, anchored by the forming stone | REAL end to end (journey below) |
| Present stone (Now) | The same create flow, When carried in as "Now", the anchor burning happening | REAL at the form/save level; the happening BIRTH is DECLARED (below) |
| Past stone (Settled) | The same create flow, the anchor in the past tone, When bare for the user to name | REAL at the form/save level; the settled BIRTH is DECLARED (below) |
| Text | Text composer (words first, no media gate) | REAL end to end: the publish rule rejects only an EMPTY post, so a caption-only post is lawful |
| Go live | The venue step (new surface, `GoLiveFlow`) | REAL end to end over the lives endpoints; venue SEARCH declared-limited (below) |

### Journey rows (real options)

- **Future stone**: sheet stone (`c2-create-tense-future`)
  -> `events.creationPlan("future")` -> shell opens
  CreateFlow with prefill {tense: "future", entry:
  "c2-create-future"} -> the form renders the STONE ANCHOR
  (`c2-create-anchor`, forming fire) named by the What as
  typed -> Create submits the real graph-create
  (`createGraphPlan`, time_label + the Who picker's
  participant ids) -> the shell re-reads plans -> the plan
  stands in Graphs/Flows as a forming stone. Read-back
  proven in capture: June's "Saturday market run" submitted
  in-browser and found in her Graphs.
- **Photo**: sheet door -> composer (media step) -> file
  picked through the real input -> `uploadSocialMomentMedia`
  -> Share: `publishSocialMoment` (Post) or
  `createTemporaryStory` (Story) by the destination switch
  -> `onShared` re-read -> the moment stands in the feed.
  Read-back proven: June's photo post found in her home
  feed after the in-browser share.
- **Text**: sheet door -> text composer -> Share post
  enabled by words alone -> `publishSocialMoment`
  {caption, media_ids: []} -> feed re-read. Read-back
  proven the same way. (Stories stay media-only - the
  story endpoint requires media by the server's rule, so
  the text composer offers Post only.)
- **Go live**: sheet door -> `GoLiveFlow` -> the surface's
  words are the server's own (`GET /lives/go-live-copy`:
  its prompt "Where are you?", its consequence template,
  its audiences) -> venue search (`GET /lives/venue-search`)
  -> pick -> consequence line -> `POST /lives/go-live` ->
  the room exists; Flows reads it back through the visible
  / mine lives reads (the happening strip's "Your live"
  card + presence). Read-back proven: after the in-browser
  Go live, `lives/mine` reported June active (her live was
  ended afterward to leave the shared world clean).

### Designed + declared (W-17)

- **D-11 Present birth.** The present stone promises a
  graph happening NOW. Graph-create carries time as a
  label (`time_label`) and accepts no structured start;
  plan state is derived downstream by the scheduling
  machinery, not by the create contract - so a plan born
  from this flow is born forming whatever its label says.
  Missing build: a start-now birth in graph-create (a
  structured start the state derivation honors). Until
  then the door carries its honest words ("Now") into the
  real form and no frame claims a happening birth - hence
  no `creation-present` frame.
- **D-12 Past birth.** Symmetrically, there is no
  past-birth in graph-create and no share-a-settled-graph
  act: settled stones reach the feed by living, not by
  posting. The designed next step when built: pick one of
  your settled graphs (or name a new one with its past
  time) and post it as a settled stone. Missing build:
  settled-birth in graph-create + a settled-graph picker
  read. No `creation-past` frame, for the same reason.
- **D-13 Venue search is Places-backed.** In this stack
  the server answers `places_unavailable` ("GOOGLE_PLACES_
  API_KEY missing" - the founder-side Places enablement
  already on record) and the surface shows the server's
  own message rather than inventing results. The manual
  entry exists ONLY where the server offers it
  (`manual_testing_available`, under its testing flag) and
  its lives are provisional - the server badges the venue
  TEST VENUE in its own consequence line; the frame's
  pre-live consequence uses the copy endpoint's template.
  Found and fixed while building: the manual rule is name
  AND city (`name_and_city_required`, 422) - the surface
  now asks both and arms the pick only when both are
  written (pinned in tests).
- **D-14 Video.** See the inventory: image-typed media
  path; a video media path (accept, upload, render) is
  the missing build.
- **Observation (entry).** The sheet's entry is unchanged:
  the self stone in its no-story state. With a live story
  the stone opens the viewer (the B-10/JA-11 law), so
  adding while a story is live has no door today - named
  here for the founder's call, not silently widened.

Capture world for the creation frames: a FRESH fixture
seat (June Park) - she has no live story, so her stone
opens the sheet by the product's own rule; a direct
conversation with Maya was staged through the real API so
her Who picker carries a real person. The dark pass shoots
frames only; the light pass completes each act after its
frame and verifies the read-back (all four verified true;
log in flows2-scratch/cap-creation2.log). In light mode
the Settled stone rests pale - the canon past tone at low
light; recorded as observed for the founder's eye.

W-17 verification: `r21Creation.test.tsx` 9/9 (sheet
inventory + Discovery, tense wiring, the anchor + When
words, the destination switch, caption-only sharing with
no upload call, go-live end-to-end + the unavailable/
manual path incl. the name+city arm). Signature gate
extended with the `creation` surface (node tests 9/9).
Typecheck exactly the 9 pre-existing. Full web suite on
the W-17 tree: 24 failed / 2085 passed (2109; the +9 are
the creation tests) - failed-test names identical to the
wave tree's set, extracted the same way.

## Round 3 - founder charges F-A..F-F + T-5 + W-17 extended + W-19 slice (2026-10-20 21:34-21:51 PDT)

Supersessions recorded plainly: F-A retires the V-b interim
acceptance of the oval stone (the IG-escape debt was called
in and is paid); F-D/F-F supersede CF2-2's resting affordance
(the Light word-button and the labeled door surface); F-B
retires the W-14 presence strip's RENDER (the derivation and
its record stand); T-5 supersedes the V-d-era trivia bar
(V-d's rest-state light lands inside the poster). CF2-1,
CF2-3, CF2-4/V-a, V-c stand as answered; nothing protected
moved - the bond sheet is untouched and its frames stand.

### F-A - stories go round: FIXED

The oval/opal stone is gone. A story stone is a ROUND stone
(74px circle) carried by a THIN ORBIT RING - a separate ring
element with a real gap between ring and face - and state
rides the RING: happening wears the marbled fire ring (see
W-19), loved the warm ring metal, new the iridescent
current, seen a quiet line. The self stone wears the same
form. Proof: `flows-first-*` (Ethan's own stone and Maya's,
both live, both marble-ringed).

### F-B - the presence row dies: FIXED

The W-14 strip (`c2-presence`: monogram + first name +
"Live" repeated under the stones) is removed - render and
CSS both. Live presence is now carried ONLY by (i) the ring
state on the person's stone and (ii) the Live stone in the
stream. First-paint audit for the same species: the strip
was the only instance. Near-misses checked and NOT the
species: the self stone's "Live" sub-label (the viewer's
OWN state, part of the creation stone's grammar); the
co-presence orb (it sits ON the sanctioned Live stone, it
is that stone's content); the bond sheet (not first paint,
and founder-protected). The absence is test-pinned
(`c2-presence` must not render).

### F-C - Live proportion + breathing: FIXED

The spacing law is now section rhythm: the happening strip
takes `space-5` of downstream room after its full berth, and
the trivia poster holds its own berth with margin - loud
cards (a Live, the Trivia spectacle) never sit adjacent
without the stream's breathing room between them. In the
braid itself the law cannot be violated: Live and Trivia
are sections, not braid items, so no two loud cards can
ever stack inside the stream. Proof: `flows-first-*`,
`flows-live-copresence-*` (the Live card, then air, then
the poster).

### F-D - light is a glyph: FIXED

The "Light"/"Lit" word-button is dead. The control is the
HEART (`HeartGlyph` in bits.tsx): a heart whose body is the
brand's marbled fire (a radial marble of the orb palette -
point light, gold, magenta, violet, cyan), ringed by one
fine orbit ring with a single point of light riding it -
the founder's "a well lit heart with orbit." Presentation:
at rest the marble glistens at low opacity under an ink
outline; a press gives light through the same real endpoint
(the I-2 journey is unchanged); a long-press deepens - the
heart scales and its glow gathers while held, committing
the same single light on release; lit, the marble is fully
up, the outline retires, and the warmth tier raises the
gold glow. Who-lit names still render on the author's side;
no numeral exists anywhere in the row (test-pinned: the
control's text content is empty; state rides `data-lit`).
Proof: `flows-moment-unlit-*` (resting glisten),
`flows-moment-lit-*` (lit marble).

### F-E - the glyph audit

THE UNIDENTIFIED GLYPH, IDENTIFIED (parent-confirmed by
zoomed crop): it was the CF2-2 door glyph, `IconDoorway` -
an arch on a baseline with a doorknob dot, the doors-panel
opener on the moment and plan cards. Intended function:
open the card's door family. Why it failed: at its rendered
size (a 20px glyph inside a 36px circle) the arch reads as
a bell, a dome, an igloo - anything but a door; an arch is
a learned architectural drawing, not an affordance, and
nothing else in the product teaches it. Disposition under
F-F: it DIED with the button farm. It renders NOWHERE in
the app (the export remains in bits.tsx only so no import
can break; nothing imports it). THE LEGIBILITY RULE, as
charged: any doorway glyph surviving anywhere in scope must
pass a one-second legibility test at its real rendered
size, reported with the frames. Survivors in scope: NONE -
the test therefore has no passing instance to report; the
one doorway that existed was removed rather than shipped
illegible on a documentation argument.

Per-glyph verdicts on the social cards:

| Glyph | What it is | Verdict |
|---|---|---|
| Doorway (IconDoorway) | was: door-family opener | DIED (above) |
| Heart (HeartGlyph) | give light / lit state | KEEP - universal referent; state by marble + glow, never words |
| Reply (IconChats) | reply to the author | KEEP - the product's own chat mark, identical to the dock's Chats glyph; its meaning is taught by the dock |
| Graph-in (IconGraphIn) | open the take-panel | KEEP - drawn as THE GRAPH ITSELF (an anchor stone with its nodes on lines) in the forming state color; the thing it opens is visible in its own panel |
| Branch glyphs (panel) | Join / Solo / My people / Again | KEEP - party compositions drawn, captions at most two words |
| Co-presence orb | "your person is in this Live" | KEEP (CF2-3) - a light, no letters; position on the Live stone + the card's words carry it |
| Self-stone "+" | add yours | KEEP - universal |
| Live pill (dot + "Live now") | live state | KEEP - words carry the dot |
| Plan state pills (mark + word) | plan state | KEEP - word and mark paired |
| Monogram avatars | the person | KEEP - the standard person mark everywhere in the product |

### F-F - doors become glyphs ("graph in"): FIXED

The card's resting furniture is glyphs only: heart (F-D),
reply glyph, graph-in glyph. Tapping graph-in opens the
TAKE-PANEL: the I-1 family's four branches as glyph tiles -
the party composition DRAWN in each tile (two people and a
plus for Join; one person in a ring for Solo; three people
for My people; the turning arrow for Again) - with captions
of at most two words: Join / Solo / My people / Again (full
phrases survive only as aria-labels). Plan cards carry the
same graph-in glyph and the same panel. The four branches'
graph-create journeys are UNCHANGED (doorsForSource /
seedCreateFor; the flows tests re-pin them, captions' word
counts included). The card's long-press still opens the
panel. Proof: `flows-moment-unlit-*` (glyphs only),
`flows-moment-doors-*` (the open panel).

### T-5 - trivia rebuilt as a game poster: FIXED

The header-only bar is gone; the card is a POSTER
(`c2s-trivia-poster`, stone-class berth: full padding, real
height, the V-d spectacle as its light):

1. FULL CITIZEN SIZE - a card in the braid's rhythm, never
   a strip (the old bar was the header-only render of a
   pair with history but no open sections).
2. A PERSON OWNS IT - the buddy's face (44px), light, and
   name head the card: "Know Me? - Maya". The score is
   ATTACHED TO THE PAIR on the pair line: "You & Maya - 10
   points - 1 confirmed". GYROSCOPE: that number comes from
   `pairScoreFromRecords` - the ONE derivation
   (validated pair guesses, either direction, 10 x
   multiplier) - and `bondFromPair` now calls the same
   function, so the poster and the bond stone can never
   disagree. Buddies are everyone the viewer holds a trivia
   truth with (question subjects, guess partners both
   ways), so the poster stands even with no round open.
3. THE TEASE - the open loop (the Zeigarnik pull: an
   unfinished thing holds attention; a described game does
   not). Truth binds it: with a REAL pending validation
   from the buddy, the lure is "Maya answered one about
   you - see if Maya knows you."; with a REAL unplayed
   question in the pair's pool, the question renders
   face-down (opening words shown, the rest under a blur -
   at least the last two words always withheld, so even a
   short question keeps its secret); with neither, the
   card rests on the pair + the play door. Nothing staged,
   nothing described.
4. THE SPECTACLE CONCENTRATES HERE - V-d's rest-state
   light (lit border, corner washes, frozen shadow stack)
   is the poster's skin; `data-light="validation"` deepens
   it to the warm burn when a validation waits (proven in
   the pending frame's still).
5. PRESERVED - inline friend switching on the card (the
   buddy chips in the poster head: switching re-owns face,
   pair line, score and tease together, and re-closes the
   round); rounds few -> multiplier -> score and the
   validation etiquette are the same machinery inside;
   CF2-1's disposal stands (the game's actions only). The
   round opens from the PLAY DOOR (a triangle and one
   word) - the game's entry; the resting poster never
   spills the round's text under its own tease. One honest
   gap against the standing spec's words: "the game takes
   over full-screen on entry" was never built in any round
   - entry expands the round inside the poster today
   (declared, D-16).

Frames: `flows-trivia-poster-*` (mid-round: a real
counterpart-capsule question unplayed, the round open),
`flows-trivia-poster-pending-*` (a real pending guess from
Maya through the endpoint; the pair line unchanged at
10 / 1 - a pending guess is not a score).

### W-17 extended - story consumption: BUILT (one door declared)

Journey row (viewer): tap a round stone (rail record:
temporary story, author id threaded) -> the viewer opens
over the still-mounted Home (media full-screen through the
authenticated image path, progress segments from the
story's count, the caption) -> interactions live in the
viewer: REPLY (the chat-mark glyph at the foot) -> the
author's real thread opens (the viewer closes first) ->
exit (close) returns to the stream with position preserved
BY CONSTRUCTION (Home never unmounted; the exit frames
prove the same stream underneath).

Wiring truth per element: media / progress / caption -
real, from the temporary-story record. Reply - real (the
reply machinery takes the author id; the rail record
carries it). The light heart and the take doors in the
viewer - DESIGNED (the same glyphs docked at the viewer's
foot beside Reply) and DECLARED (D-15): stories carry no
engagement record (like is moment-scoped in
SocialMomentEngagement) and are not seedable records
(inspired-by validates against social moments), so nothing
in the viewer pretends to light or graph a story. Tests
pin the absence so a fake cannot sneak in later.

### W-19 slice - marbling as signature material

Two sightings in this worker's scope, each with its
one-sentence justification:

(a) THE LIGHT HEART'S BODY - the marble IS the heart: a
person giving light gives the brand's own material, so the
signature marble lives in the giving. Frames:
`flows-moment-unlit-*` (marble at a glisten),
`flows-moment-lit-*` (marble fully lit).

(b) THE LIVE STORY RING - a marbled conic sweep of the orb
palette with one point of light riding the ring: marble
marks a person LIVE right now, and the ring is presence's
seat. Frozen, never animated, at story scale (quiet
binds). Frame: `flows-first-*`.

Mode parity: both sightings render in both modes from the
same orb-palette tokens.

NON-SIGHTINGS (places in scope where marble would merely
decorate, named per the charge): the bond sheet (a
protected composition - adding material would move what
the founder praised); the trivia spectacle (its language
is fire and shadow play - marble would double the loud);
the feed media wells (photography carries them); the
creation sheet's tense stones (state fire must read pure -
marble would blur the tense); the take-panel tiles (glyphs
stay ink + state color for legibility).

### Declarations added this round

- D-15 - STORY ENGAGEMENT + LINEAGE: the story viewer's
  heart and take doors are designed, not wired - temporary
  stories have no engagement record and cannot seed a
  graph (inspired-by validates against social moments
  only). The missing build: a story-scoped engagement
  record + story lineage in the seed provenance.
- D-16 - TRIVIA FULL-SCREEN STAGE: the standing spec's
  "the game takes over full-screen on entry" has never
  been built; entry expands the round inside the poster.
  The missing build: a full-screen game stage surface for
  the round (the poster's Play door is its entry either
  way).

### Round-3 verification

Targeted suites green before the full run: r21Flows2 17/17
(incl. the new poster / viewer / round-stone pins),
r21Openings, r21Creation, homeSocial, c2ShellSurfaces,
ja06FeedAction. Signature node tests 10/10 (the
`story-viewer` surface is new). Typecheck exactly the 9
pre-existing.

ONE baseline interaction, named rather than absorbed: the
first full run on this tree failed 25 (baseline 24) - the
extra failure was r20Connect's F-10 "design compass" PIN,
a source-text assertion that the happening stone's CSS
rule carries `border-color: var(--orb-indicator-
happening)`. F-A lawfully moved the stone's state onto the
orbit-ring element (the founder's own redesign of the very
element the pin guards), so the pin was RE-POINTED - as it
had already been re-pointed once before by R21 - to the
ring's happening treatment (`box-shadow … var(--orb-
indicator-happening-glow)` on `.c2s-stone[data-state=
"happening"] .c2s-stone-ring`). The pin's intent is
unchanged (a happening stone on Home's lead burns in
happening light); r20Connect is green again (14/14). The
full suite's final count on this tree: 24 failed / 2088
passed (2112; 17 files) - the failed-test names are
IDENTICAL to the wave tree's baseline set, extracted the
same way (the +3 passes over the W-17 tree are the round-3
tests).
