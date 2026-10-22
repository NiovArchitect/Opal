# Repair #22 - WS-5 PLACE ENERGY: design record

Branch: muse/r22-places (base fd1d34d3, the Repair #21 tip).
Status: design + first slice. No merge, no production, muse/repair-17
untouched.

## 1. The founder direction

Founder, 2026-10-21: people are more curious about WHERE people are
and what they are doing there than about the people themselves. His
reference was Snapchat's heat map: you could see what was happening
at a location, what strangers were doing there - "I got to see that
Location - what was the vibe, the energy there?"

Opal's answer is not a map and not a heat clone. Opal's aim is
alignment: getting people out the door, together. Places are already
first-class anchors in the product (plans anchor to places, plan
cards carry the place, the bond stone carries shared places, Lives
anchor to venues). Place Energy makes the place itself a living
surface in Flows: a stone in the stream whose light is the place's
real activity, and one tap from the stone, the place itself - what
is happening there now, what is forming there, and what your people
have lived there.

The Snapchat reference is a concept only (a place can carry a felt
sense of activity). Its form is not copied: no map, no red heat
wash, no anonymous crowd dots, no stranger surveillance. Section 7
states the privacy bounds that make Opal's form different in kind,
not just in color.

## 2. NO FAKE HEAT - the honesty law for this surface

Every unit of energy on a place stone is computed from a real graph
record the viewer may lawfully see. There is no baseline glow, no
popularity prior, no per-place constant, no seeded "busy-ness". A
place with no qualifying records does not render a stone at all.
A place whose only records are old renders as memory (past family,
ember at most from memory alone - see the memory cap in section 4).
If a signal has no lawful read today, it is named in section 8 as
declared, and the surface does not approximate it.

## 3. What a place stone in Flows shows

A place stone is a WIDE stone in the braided stream (the stream's
shape law: wide stones are what the stream bends around - plans,
Lives, occasions; place stones join that family). One stone per
place, carrying:

- The place name, verbatim from the record that carries it (a plan's
  location string, a moment's place_ref display name, a live room's
  place label - never rewritten, never geocoded, never completed
  from a provider).
- Its energy as LIGHT in the state-color canon: the stone's fire
  color is the state family of its strongest current signal
  (section 4), and its glow strength is its energy level (ember,
  lit, radiant). The color always means what it means everywhere
  else in Opal: cyan happening, red action (spent rarely), gold
  ready, violet forming, quiet white past. Energy is a state
  reading, not a heat scale: there is no red-to-white temperature
  gradient anywhere on the stone.
- One finished energy line, in plain words, composed by the
  projection from the counts themselves (for example "Live now and
  a plan is happening here", "A plan is forming here", "Your people
  have been here"). The line is a sentence the counts can prove; it
  names no number the stone does not carry a record for.
- Up to three finished signal lines, strongest first: what is
  happening now, what is forming or coming, what rests in memory.
  Each line exists only when its signal exists.
- Who is here, as lights, only for a live room's host (the one
  presence fact a record states outright). Plan attendance renders
  as the plan's own going count in the place view, in the plan's
  words - it is never restated as physical presence (section 7).

Ordering: stones join the stream in energy order (strongest first),
stable within a level by the stream's existing record order. The
stream cap is unchanged; place stones are composed by the one Home
adapter alongside the existing kinds, never by the component.

## 4. What energy is computed FROM - the exact signals

The computation is ONE pure builder (placeStonesFromGraph in
apps/opal_web/src/c2/shell/shellData.ts), fed only by the three
reads homeFromSession already makes. The surface renders its
output verbatim and derives nothing.

Grouping: records group by normalized place name (trimmed, internal
whitespace collapsed, case-insensitive). The display name is the
first-seen record's own string. Two different places that share a
display string group together; that is the truth the records carry
today - no place record with a stable id reaches these reads, and
section 8 names the place-id join as full-build work.

Signals, each with its source:

- S1 LIVE AT THE PLACE. Source: GET /api/v1/product/lives/visible,
  the LiveRoom contract's place_label, else its venue's
  display_name, else its venue's name. Gate: the room's status is
  exactly "live" (the same gate liveFeedFromRooms applies). Weight
  3 per room. Carries the host's name and id for the who-is-here
  lights (host_account_id, host_display_name on the same record).
- S2 A PLAN HAPPENING AT THE PLACE. Source: the plans list contract
  (SharedPlan.to_contract via SocialFlow.plan_payload), field
  location. The plan's energy family mirrors the backend's ONE
  indicator derivation (OpalCore.SocialFlow.NextPlan
  .indicator_state) over the contract's own fields: the live-window
  leg (status in tentative / agreed / changed, start_at at or
  before now, and end_at at or after now - or, with no end_at,
  started within the last 180 minutes, NextPlan's
  @live_window_seconds) yields happening, weight 2.
- S3 A PLAN WAITING ON THE VIEWER AT THE PLACE. Same contract: the
  indicator derivation's viewer leg (viewer_state is canonically
  "pending", JourneyAuthority's attendance contract) yields action,
  weight 1. Red is spent here only, on a real unanswered invitation,
  exactly as everywhere else in Opal.
- S4 A READY PLAN AT THE PLACE. Same contract: status "agreed"
  outside its live window yields ready, weight 1.
- S5 A FORMING PLAN AT THE PLACE. Same contract: any other active
  status (tentative / changed) yields forming, weight 1.
- S6 A MOMENT POSTED FROM THE PLACE. Source: GET home feed
  (HomeFeed.to_feed_card), field place_label, which is the moment
  record's place_ref display_name exactly as publishing normalized
  it (social_moments.place_ref). Eligibility is the feed's own:
  SocialMomentVisibility through SocialMomentPublishing
  .list_for_viewer - a moment the viewer may not see contributes
  nothing. Weight 1, and the moment contributes its caption and
  author name to the place view's memory.
- S7 A SETTLED PLAN AT THE PLACE (memory). Same plans contract:
  familyOfStatus past leg (status completed / expired) yields past,
  weight 1. Cancelled plans never reach the list and contribute
  nothing.

Exclusions, applied before any counting (isolation and hygiene):

- Private plans (is_private on the viewer's own payload) never
  contribute - a vaulted plan's place is the viewer's private fact.
- Plans the viewer settled (viewer_state declined / withdrawn, or
  status expired for the list adapter's settled set) never
  contribute as live energy; an expired plan still carries its past
  leg only when it reaches the builder unsettled - the adapter's
  settled filter is applied first, so in practice settled records
  contribute nothing at all.
- Virtual plans (plan_type "virtual" or online) have no physical
  place and never contribute; their location string is not a place.
- A plan with no location string contributes nothing.

Score and level: energyScore is the sum of weights, with one
constitutional cap - MEMORY CANNOT IGNITE: the combined contribution
of S6 and S7 is capped at 3, so a place carried only by its past
can reach lit at most and can never out-glow a place where
something is happening now. Levels: score 1-2 ember, 3-5 lit,
6 and above radiant. Level 0 does not render.

Family: the family of the strongest current signal, in indicator
precedence - any S1 or S2: happening; else any S3: action; else
any S4: ready; else any S5: forming; else past. A place that is
only memory wears past, however warm its history.

Freshness: the builder receives now from its caller; all window
math is the indicator derivation's, read from the records' own
start_at / end_at. Nothing is extrapolated from a time_label
string.

## 5. The place view - one tap from the stone

Tapping a place stone opens the place view (a sheet at sheet band,
the BondStone pattern): the place itself, in felt objects first.

- Head: the place name, its energy fire and level, and the same
  finished energy line the stone carries (one truth, two surfaces).
- HAPPENING HERE: the live rooms at the place (host light and name,
  the room's own title) and the plans in their live window (title,
  when line), each plan a door to its graph detail.
- FORMING AND COMING: the place's action, ready and forming plans,
  strongest family first, each with its state label and when line,
  each a door to its graph detail. An action plan's red is the
  plan's own - the view never adds urgency of its own.
- MEMORY HERE: the settled plans (title, when line, door to their
  detail) and the moments posted from the place (caption, author),
  as quiet stones. Moments carry no door: no moment detail surface
  exists today, and the view does not fake one.
- THE DOOR OUT: "Start a plan here" - the place's energy exists to
  become alignment. The door composes through the existing seed
  machinery (flows2 seedCreateFor, branch my-people: the party is
  the user's to choose, the place rides as the create flow's
  location) and opens the real graph-create flow. It renders only
  when a lawful seed source exists at the place: one of its plans
  (the strongest) or one of its moments. A place whose only signal
  is a live room carries no start door in this slice - a live room
  is not a seed source in the flows2 law - and that absence is
  declared in section 8, not painted over.

The view holds nothing the stone did not already carry: it is the
same PlaceStoneProjection, finished by the one builder. No second
read, no re-derivation at open time.

## 6. How this serves the out-the-door doctrine

The out-the-door algorithm doctrine (the Reveal / NextPlan line)
ranks what moves a person from intention to presence: what is
happening now outranks what is ready, which outranks what is
forming. Place Energy is that doctrine read sideways, by place
instead of by plan:

- The energy weights ARE the doctrine's precedence (live and
  happening outweigh ready and forming; memory warms but cannot
  ignite), so a glance at the stream teaches the same ranking the
  rest of the product acts on.
- The stone is a conversion surface, not a consumption surface:
  its one door starts a plan AT the place, carrying the place into
  the create flow. Curiosity about a place becomes a plan at that
  place in one tap and one choice of people.
- Happening places lift: energy order puts the live window first,
  while it is still open - the doctrine's "the window is short"
  made visible as light rather than as a notification.

## 7. Privacy and consent bounds

- Viewer-scoped only: every input record is one the viewer already
  lawfully holds (their plans list, their visibility-gated feed,
  the visible-lives read). Place Energy assembles nothing across
  accounts; one account's private graph never warms another
  account's stone (the isolation law).
- No stranger layer in this slice: the seed world's places are the
  viewer's own graph places. A public / stranger energy layer
  (Snapchat's actual substance) would require a place-level
  visibility contract that does not exist yet; section 8 declares
  it. Nothing on the stone implies a crowd the records do not name.
- Presence honesty: "who is here" is stated only where a record
  states it (a live room's host). Plan going counts are attendance,
  rendered in the plan's own words inside the place view, never as
  "N people are here". There is no location-sharing input to this
  surface at all: no participant location, no distance, no check-in
  position is read (plan participants carry no location-sharing
  field today - the seed world record states this absence itself).
- Place check-ins in the value layer (the plan check-in circle on
  graph detail) are plan-scoped and per-plan private to its
  parties; they are not a place-energy input in this slice and are
  named as a future lawful input in section 8, behind the plan's
  own consent.
- A moment contributes only when the viewer may see the moment
  itself (the feed's visibility gate is the consent gate). A plan
  contributes only when it is on the viewer's own list and not
  vaulted private by them.

## 8. What the full build needs beyond this slice (declared)

- D-P1 PLACE IDENTITY: a stable place id join. Today the grouping
  key is the display string records carry. The full build joins on
  the place record (the venue / Places catalog id a chosen place
  candidate carries) so two venues sharing a name stay two places,
  and one place with variant strings is one place.
- D-P2 PUBLIC ENERGY LAYER: energy from people outside the viewer's
  graph (the stranger layer the founder's reference evokes) needs a
  place-level visibility and consent contract - what a place may
  show about people who never chose this viewer. Not approximated
  here; the stone shows the viewer's graph only and says so by its
  lines ("your people"), never "everyone".
- D-P3 CHECK-IN PRESENCE: who's-here from the plan check-in circle
  and from live venue presence machinery, behind each plan's and
  person's own sharing state. The records exist in pieces (plan
  completion check-in steps, Lives venue presence); no lawful
  place-level read exists today.
- D-P4 THE LIVE-ONLY START DOOR: a place whose only signal is a
  live room offers no "Start a plan here" in this slice, because a
  live room is not a flows2 seed source. The full build either
  admits the room's place as a create-flow location source in its
  own right or carries the place directly, as the place view's own
  prefill contract.
- D-P5 PLACE PAGE DEPTH: the full place view wants the place's own
  facts (hours, the place record's imagery through the product's
  own media path, its stones across time as a braid of its own),
  and energy history (how the place's light moves across a day).
  This slice renders only what the three existing reads carry; no
  place-record read is wired into Home yet.
- D-P6 FEED WINDOW: the moment signal reads the home feed's first
  page (limit 20, the adapter's existing read). A place whose
  moments sit beyond that page is under-read, honestly: the full
  build reads place-grouped moments from a place-scoped backend
  projection rather than widening the feed page silently.
- D-P7 BACKEND PROJECTION: this slice's builder is the one client
  derivation, over finished backend contracts (the Division A
  pattern shellData already owns for bonds, trivia and presence).
  The full build promotes the computation into a backend
  place-energy projection (one server output per surface, computed
  from the same tables at read time) so every client renders the
  same stone. The signal definitions in section 4 are written to
  survive that promotion unchanged.

## 9. The slice, stated plainly

Built in this wave: the design (this record), the placeStones
builder with the section 4 computation, place stones in the Flows
stream carrying real activity state at differing levels, and the
place view on tap with its doors (graph detail per plan, start a
plan here where a lawful seed source exists). Declared, by name:
D-P1 through D-P7 above. Nothing else is claimed.
