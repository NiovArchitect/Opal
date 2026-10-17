# SOCIAL_DIRECTION - Repair #15 (Worker DF, Track F)

**Branch:** `muse/repair-15-df` - **Base:** Repair #14 tip `025a0289`
**Date:** 2026-10-16
**Status:** founder direction, endorsed in conversation before this pass.
This document encodes it; it does not relitigate it. It is a design law
document plus a grounded audit of the existing social surfaces - not a
rebuild plan, and no rebuild was done.

---

## 1. What Opal social is

**Opal social is Moments anchored to real plans, real people, and real
places - the residue of real coordination.**

A Moment exists because something real happened or is about to happen
between specific people: a conversation became a plan, a plan happened at
a place, a person is live at a venue right now. The social surface is
where that residue becomes visible to the people it belongs to, and
where seeing it can turn into doing it - with your people, at that
place.

The live law, in the founder's formulation:

> **People bring the energy. Places bring the gravity.**

People supply the desire, the attention, the wish to be there. Places
supply the anchor that makes the energy land somewhere real: a venue, a
neighborhood, a table. A surface that honors both never floats content
free of who and where.

Three anchors, at least one required - and the strongest Moments carry
all three:

- **Plan anchor:** the Moment is attached to a forming, set, or completed
  plan (a Graph), or it can become one in one tap.
- **People anchor:** the Moment belongs to named people in a real
  relationship to the viewer - a conversation partner, a Graph member, a
  person they follow as a *Follow* (never confused with a connection).
- **Place anchor:** the Moment names a real place, ideally a provider
  place id, not a vibe.

## 2. What Opal social is not

- **Not an open attention feed.** No infinite stream of strangers'
  content competing for dwell time. Nothing on an Opal social surface
  earns its place by holding attention.
- **Not an Instagram copy.** No follower counts as identity, no public
  scoreboards, no explore grid of disconnected media, no growth loops
  that reward broadcasting to people you do not know.
- **Not an editorial or curated feed.** Opal does not publish *at* the
  user. There is no house voice, no staff picks, no trending shelf. (How
  this differs from curation Opal *does* do is section 4.)
- **Not a stage for fabricated social proof.** Invented counts, seeded
  "people are here" numbers presented as live truth, demo content
  wearing the clothes of real activity - all forbidden. Production
  surfaces show real backend numbers or none.
- **Not noisy.** Social must never become a second inbox of obligations.
  The quiet law applies: nothing on a social surface may demand, nag, or
  manufacture urgency. Even the settings inventory for a future social
  push category carries the instruction "quieter by default".

## 3. How it differs from Instagram

| Dimension | Instagram pattern | Opal law |
|---|---|---|
| Unit | The post: content made to be seen | The Moment: residue of coordination, made because something real happened |
| Why you see it | Predicted engagement | It is anchored to your plans, your people, or your places |
| Ordering | Engagement-optimized ranking | Relationship, recency, kind, and place relevance. **Engagement counts hold no ranking power** (enforced in code, section 6) |
| Counts | Public scoreboard; identity and worth | Private or contextual. Counts render only when the backend reports them truthfully; creator impact is private by design (`PrivateCreatorImpact`: "No public Inspired N. No analytics/leaderboard") |
| Growth mechanic | Broadcast wider, follow strangers | Do the thing with your people; the Moment invites participation ("Do this with your people", "I want to do this", "I'm in") instead of applause |
| Following | Audience accumulation | Follow is a light signal - explicitly *not* a connection, not a relationship (`relationship_graph.ex` describes the graph itself as mutual and relationship-based, not Instagram followers) |
| Live | Watch a broadcast | Be somewhere: Lives are placed-only - a confirmed real venue is required before going live (`Lives.go_live` refuses without a validated place), so a Live is an invitation to a place, not a stream to an audience |
| Success | Time on surface, reach | A plan formed, a plan kept, people actually together |

## 4. How it differs from an editorial / curated feed

An editorial feed fails Opal differently than Instagram does: instead of
attention, it substitutes taste - someone (or some model acting as
someone) deciding what the user should find interesting, published on a
schedule, consumed by browsing.

Opal's distinctions:

- **Authorship:** every item on an Opal social surface is authored by
  the user's own world - their people, their plans, their places - or it
  is not there. There is no Opal-authored stream.
- **Curation is a service, not a publication.** Opal *does* curate - but
  inside a person's own coordination problem, at their request or inside
  their plan: ranking places for *this* group on *this* night
  (`curateRecommendations`), suggesting who a celebration gift fits,
  preparing an opportunity inside a conversation. That curation is
  private, per-plan, and ends in an action. It never becomes a public
  feed of "what Opal thinks is good".
- **No browsing obligation.** An editorial feed is empty calories until
  browsed. Opal's surfaces are built to be *brought to* the user
  (section 5) and to be finished: a card resolves into a plan, a reply,
  a join - or it quiets down.
- **The demo-residue rule already encodes this:** auto-bootstrapped demo
  captions and lab/soak residue are filtered out of Home
  (`socialAuthority.ts`: demo bootstrap captions and `HOME_RESIDUE_CAPTION`
  are excluded from the production feed) precisely because content nobody
  in the user's world authored must not pose as their social life.

## 5. Traction without noise

Opal still wants the energy - the founder's direction is explicit that
people chasing attention, likes, and views is *fuel, not a flaw*. The
direction does not suppress that energy; it anchors and redirects it:

1. **Desire converts to plans, not to applause.** The Moment card's
   primary actions are participatory: "Do this with your people",
   "I want to do this" (which seeds a real forming plan with the place
   already grounded - `liveSocialMomentLoop` keeps the exact place so
   the plan's next gap is *when*, not a re-asked *where*), and "I'm in"
   for open events. Energy lands in coordination.
2. **Places give the energy gravity.** Discovery exists, but it is
   place- and relevance-anchored ("near you", a named venue, a provider
   place id), and Lives cannot exist without a confirmed venue. Being
   seen *somewhere real* is the reward the surface offers.
3. **Impact is felt privately, not scored publicly.** A creator learns
   that people used what they shared through private impact
   (`PrivateCreatorImpact`, empty until a real impact API exists -
   never fabricated), not through a public counter that turns friends
   into an audience.
4. **Consequence is the headline act.** The Home card grammar leads with
   conversation-becomes-Graph cards: real turns, the alignment steps
   (time, place, travel), shared history. Proof that coordination
   happened is more magnetic than content *about* coordination.
5. **Quiet defaults everywhere attention could leak.** No engagement
   term in ranking; social push (when it ever ships) defaults off and
   quiet; Following is visually quiet by default (`SocialMomentCard`
   `followingVisual = "quiet"`); read receipts and message notices are
   the user's own settings choices.

## 6. Structural proactivity - bringing coordination to the user

Per the tab-architecture reference (see SETTINGS_MAP.md section 5):
proactivity should be *structural* - prepared, waiting, and surfaced -
not dependent on the user remembering to browse. Opal's social surfaces
should follow the same rule:

- **Prepared:** the system does the forming work before the user
  arrives. Conversation opportunities are evaluated inside threads;
  celebration curation pre-computes "what would they love"; a Moment's
  "I want to do this" pre-seeds the plan with people and place already
  attached, leaving only the genuinely open gap.
- **Waiting:** prepared things sit in plain sight with a plain-language
  next action, not behind a feed the user must scroll. The Attention
  Center's "Needs You" projection (`AttentionAuthority`) is the working
  model: actionable items only, a count that means "these need you",
  and deep links to the exact canonical action.
- **Surfaced:** Home's stream is a *consequence stream*, ordered so the
  things closest to the user's real life surface first - Live now, then
  conversation consequences, then Graphs, then Memories - ranked by
  relationship strength before anything else. Surfacing is a ranking
  duty, not an engagement duty.
- **Finished, not endless:** every surfaced item carries its resolution
  (join, plan it, open the Graph, reply). A surface the user can
  *complete* respects the quiet law; a surface designed to be
  un-completable is an attention feed wearing Opal's clothes.

## 7. Surface audit against this direction

Audited: `GraphSocialHome.tsx`, `StoryViewer.tsx`, `StoryCreateFlow.tsx`,
`SocialMomentCard.tsx`, `PrivateCreatorImpact.tsx`, `homeHydration.ts`,
`homeFeedRanking.ts`, `socialAuthority.ts`, `founderGraphSeed.ts`,
`livesFeedCards.ts`, and `apps/opal_core/lib/opal_core/lives.ex`.
**One flat contradiction found and fixed (7.1). Everything else is an
alignment note (7.2) - documented, not rebuilt, per the track's scope.**

### 7.1 Contradiction fixed

**Home ranking rewarded engagement.** `homeFeedRanking.ts` `scoreCard`
added up to +12 for `likeCount` and up to +8 for `commentCount`:
a card's position on Home could be bought with attention, the defining
mechanic of the attention feed this direction forbids - and it applied
to production cards, not just fixtures.

Fix (this pass): the engagement term is removed. Ranking signals are
now only relationship (+28) / follow (+14), recency, kind salience
(Live +30, consequence +24, Graph +12, Memory +10, discovery +6),
local place relevance (+5), minus repetition-suppression penalties.
Counts still *render* truthfully on cards when the backend reports
them (`productionObjectToCard` maps the real `engagement_summary`);
they hold no ranking power.

Guard: `homeFeedRanking.socialDirection.test.ts` (3 tests, green) -
source carries no engagement-count term; a loud card scores identically
to the identical quiet card; a relationship card outranks a stranger
card with 99,999 likes.

### 7.2 Alignment notes (no code change; evidence recorded)

- **Founder seed carries fabricated engagement counts - gated, not
  consumer-facing.** `FOUNDER_HOME_FEED` cards carry invented numbers
  (`likeCount: 1200` and similar, `goingCount`, "N are here" on the
  seed Live card). This *would* flatly contradict section 2 - except the
  seed is unreachable by production accounts: `homeHydration.ts`
  enforces "production accounts never receive founder fixture cards"
  (PRODUCTION_HYDRATION excludes the seed whenever real production
  owners exist and seed opt-in is off), the seed requires explicit
  opt-in (`VITE_OPAL_FOUNDER_SEED=true` or `?opal_founder_seed=1`), and
  the surface self-labels (`data-founder-seed`). Verdict: a QA fixture
  honestly labeled, not fabricated engagement presented to users. Left
  untouched - deleting walk fixtures is a founder call, and any future
  change that weakens the production/seed boundary turns this note into
  a P0 contradiction.
- **Like / comment / repost / forward / save row on Memory and Live
  cards** (`SocialActionRow` in `GraphSocialHome.tsx`). The mechanics
  are Instagram-shaped. In production they are wired to real backend
  behavior (`socialAuthority.ts`: durable ids go to the BEAM
  like/comment/repost/save APIs; the returned `viewer_liked` is the
  truth), counts shown are the backend's real `engagement_summary`,
  and - after 7.1 - they buy no position. They read as *responses to a
  person you know about a thing that happened*, which the direction
  permits; the participatory CTAs remain the primary act on every card
  grammar. Note, not a fix: if a future pass adds any *public*
  leaderboard, "top Moments" shelf, or count-based surfacing, that
  crosses the line this note is watching.
- **Discovery / near cards with a Follow button.** Stranger-shaped at
  first glance, but the card grammar is place-anchored (badge
  DISCOVERY, place line, "unusually relevant near you"), Follow is
  explicitly *not* a connection (`data-follow-not-connection="true"`),
  and eligibility gating keeps private cards unreachable by follow
  alone (`isCardEligible`: private requires a relationship, never a
  follow). Aligned with "places bring the gravity"; the follow is the
  lightest possible people-signal. Note only.
- **Stories rail and viewer.** The grammar (ephemeral, auto-advancing,
  tap-through) is borrowed from attention apps, but the substance is
  anchored: production stories come only from the viewer's real feed
  (`resolveHomeStories`: production stories win; founder stories only
  under explicit seed; production-empty rail is empty, never silently
  backfilled), audiences are `friends` / `close_circle` only
  (`temporary_story.ex`: `@visibilities ~w(close_circle friends)`,
  default `close_circle`),
  and create is honest ("Temporary. Does not publish a Memory or
  Graph." - a Story never auto-promotes). The viewer's reply/share are
  honestly gated with plain reasons, not fake buttons. Note: the 24h
  ephemeral grammar is the one place Opal deliberately rents an
  attention-app habit; it stays lawful only while the rail remains
  people-anchored and seed-free in production, which the code above
  enforces today.
- **Lives.** The strongest place-anchor in the product: `Lives.go_live`
  *requires* a Places-validated venue (free-text and residential venues
  are rejected; no unplaced path exists), audiences are friends /
  close circle, and the go-live copy states the consequence plainly
  ("Anyone can see you're at [venue]"). A Live is an act of being
  somewhere, discoverable by your people - the direction's thesis
  implemented in a backend gate. No notes beyond: viewer counts and
  heat-map language in the go-live trade copy ("that's how your people
  (and new fans) find you") should stay truthful as the audience model
  firms up - "fans" is the one word in the social codebase that leans
  broadcast-ward. Copy note only; not changed, because the sentence is
  honest about discoverability *today* via the heat map and changing
  product voice is a founder call.
- **SocialMomentCard "Inspired N experiences".** The one public-count
  mechanic in the Moment grammar - but it is off by default
  (`inspiredCount = null`, "Prefer creator-private impact over public
  scoreboard (founder gate)") and counts *experiences inspired* (plans
  that happened), not likes. It points the right way: the scoreboard,
  if any, counts coordination outcomes. Left as a founder-gated option;
  if it is ever defaulted on, it needs a fresh direction check.
- **Feed filters.** None - deliberately. `GraphSocialHome` hardcodes
  `filter: "all"` with the comment "Figma 287:6 has no filter chips -
  continuous stream only." A single stream ordered by the section-6
  rules is the direction; adding engagement-shaped tabs (Top, Trending)
  would contradict it. The `Filter` type's unused `live` / `memory`
  variants are harmless residue. Note only.

## 8. Guardrails for future social work

1. No ranking signal may be an engagement count, a dwell measure, or a
   follower count. The guard test in 7.1 is the tripwire; extend it
   rather than routing around it.
2. No production surface may render a number the backend did not report
   for that object. Fixtures stay behind the seed gate, labeled.
3. Every new social card grammar must name its plan, people, or place
   anchor in its primary action. If the primary action is applause, the
   grammar does not ship.
4. Creator feedback is private-first. Public counts of *outcomes*
   (experiences inspired, plans kept) are the only scoreboard-shaped
   numbers that may ever be proposed, and they need founder sign-off.
5. Social notifications default quiet. Any new social push category
   ships default-off (see SETTINGS_MAP.md, Proposal P-6).
6. Prepared beats browsed: new social value should arrive as a prepared,
   waiting, surfaced item in the user's existing surfaces (Center,
   Attention, Home consequence stream) before anyone proposes a new
   browsable feed.

## 9. Verification (this track)

- Contradiction fix proven by `homeFeedRanking.socialDirection.test.ts`
  (3 tests, green) and the pre-existing `homeHydration.test.ts` ranking
  suite (still green - eligibility-before-ranking and proof rows
  unaffected by removing the engagement term).
- No other social code changed. No feed rebuild. Backend untouched
  (2,655 / 0 baseline stands).
- Full web suite after changes: 1,119 tests, 25 failures - name-identical
  to the pre-existing baseline recorded in SETTINGS_MAP.md. Zero new
  failures. TypeScript: 8 errors before and after, identical set.
