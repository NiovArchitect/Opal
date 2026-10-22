# REPAIR #24 - CLUSTER E / WS-9: SEED-WORLD STAGEABILITY

Branch: muse/r24-seedworld, base c74adfe3 (muse/repair-23 tip).
Worktree: ~/workspace/opal-graph/wt-r24-seedworld.
Scope: enrich the founder-seed world so the Flows Voice + Live
glass journeys can be staged - account A's home feed must compose
moment cards (a comments door to tap) and at least one live card
(a Live journey to tap). No merge, no deploy, no Pass 2, no
migrations added (count from empty stays 120).

## 1) DIAGNOSIS - per missing card type

Both absences were proven two ways: by source read at the R23 tip,
and red-first by the new stageability suite (section 3), which
failed 4/4 at base before any seed change.

### Moment cards - ABSENT ENTIRELY (not timing, not visibility)

- HomeFeed.compose/1 builds moment cards only from
  SocialMomentRecord rows, via SocialMomentPublishing.list_for_viewer
  (eligibility via SocialMomentVisibility, ranking after).
- No seed path created a single SocialMoment record: grep of
  founder_communication_seed.ex, founder_graph_commitment_seed.ex
  and human_seed_world.ex at base finds zero publishes and zero
  SocialMomentRecord writes. HumanSeedWorld seeded plans, calls,
  stories, chats and relationship types - never moments.
- The world's stories do NOT substitute: they are TemporaryStory
  rows (TemporaryStoryPublishing), which feed the story rail and
  HomeFeed's separate "stories" payload key - never the stream's
  moment cards. A world can have live stories and still compose
  zero moment cards; that is exactly the R23 world.
- Red evidence at base: the seed payload carries no "moments" key
  at all (world["moments"] == nil), and the SocialMomentRecord
  count after a full seed is 0.

### Live cards - ABSENT ENTIRELY (not ended, not hidden)

- The client's live cards come only from Lives.list_visible_lives/1
  (GET /api/v1/product/lives/visible -> shellData.liveFeedFromRooms),
  which returns LiveRoom rows with status "live" that pass
  visible_to_viewer?/2 for the viewer.
- No seed path created a LiveRoom or a lives Venue: zero go_live /
  LiveRoom writes in any seed file at base. There was nothing to be
  "all ended" and nothing for the visibility predicate to hide -
  the room set was empty. (A's live STORY, which the R23 handoff
  notes on the self stone, is again a TemporaryStory, not a room.)
- Red evidence at base: Lives.list_visible_lives(viewer) == [].

### Session B note

Unchanged and out of scope: B (Maya Torres) is a cast member of
A's world, not a re-seeded viewer (the R19 report names the
pre-existing peer-viewer re-seed limitation). This wave makes B a
real inhabitant of A's feed - author of a moment and host of the
live room - which is what the A-side glass legs need.

## 2) WHAT WAS ADDED (all inside HumanSeedWorld, the registered seed module)

One file changed: apps/opal_core/lib/opal_core/social_flow/
human_seed_world.ex. The seed payload gains "moments" (5 entries)
and "live" (1 entry). Everything is created through the real
owners, with the existing cast, at the existing places, on the
existing seed photos (priv/seed_assets, uploaded through
SocialMomentPublishing.upload_media - the same media owner the
stories and plans already use).

### Five moments (visibility "friends", real photo each)

Authors were chosen from the cast who hold a direct (dyad)
conversation with the viewer - that dyad is exactly the authority
RelationshipGraph.friend_visibility_authorized?/2 checks for
"friends" moments, so A lawfully sees them and a stranger does
not (pinned by the suite's stranger test).

| Author | Caption | Place on the record | Engagement state (via SocialMomentEngagement) |
|---|---|---|---|
| Maya Torres | Dahlias were worth the early start - the flower stall did not disappoint | Oceanside Farmers Market | Thread: viewer light + 2 comments (viewer asks, Maya replies) - the comments-door card |
| Chanelle Brooks | Booked the corner table for Saturday - Juniper & Ivy at golden hour | Juniper & Ivy | 1 comment (viewer) |
| Priya Shah | Sunday coast path scouting - coffee first, then the walk down to Moonlight | Moonlight Beach, Encinitas | Reposted by the viewer |
| Alex Rivera | Tamarack at golden hour, from the picnic blanket | Tamarack Beach, Carlsbad | Saved by the viewer |
| Sabrina Nguyen | The little bakery on my block finally opened - cardamom bun first, obviously | (none - the record carries no place, none invented) | Quiet - no engagement yet |

Varied states, varied authors, no viewer-authored posts filling
the feed, no counts rendered anywhere (the payload's
engagement_summary is the feed's own contract, as before).

### One live room (through Lives.go_live, the real owner)

- Host: Maya Torres - the market run's lead; her seeded words
  already put her there ("I'm by the flower stall").
- Place: Oceanside Farmers Market - a venue record carrying the
  seed place's real name and an Oceanside address, created through
  go_live's fixture resolution (place_id
  "fixture_oceanside_farmers_market" is the internal binding key,
  never rendered). The venue is graduated out of quarantine the
  same way the Lives suite's own helper graduates the venues it
  stands up, so the card's place_label reads "Oceanside Farmers
  Market" plainly - no test-venue badge reaches the label (the
  suite pins place_label == "Oceanside Farmers Market" exactly).
- Title: "Morning at the flower stall". Audience "friends",
  location precision "venue", status "live", started at the seed
  clock (LiveRoom has no expiry - live is a status, ended only by
  the host; "live at the seed clock" is the record's truth).
- Visibility: Maya is A's dyad peer, so the room passes
  visible_to_viewer? for A (mine == false) and is invisible to a
  stranger (pinned).

### FLAG for cluster C (place atlas, parallel)

No Catalog place was added, removed, or renamed, and no plan's
place changed - the worlds' place list is untouched. The one
touch-point to flag: the live room's Venue is a Lives-subsystem
venue record (venues table, place_id above) named after the
existing seed place "Oceanside Farmers Market"; it is not a
Catalog/atlas place. If cluster C's atlas work needs the lives
venue reconciled with the atlas entry for the market, the binding
key is the place_id string above. HumanSeedWorld is the only
shared seed file edited, and the edit is additive (new private
functions + two payload keys + aliases).

### Idempotency (re-seed safe)

Moments are found by (author, caption) before publishing; likes /
reposts / saves are the engagement owner's own idempotent writes;
comments are insert-missing-only by (moment, author, body) -
add_comment itself is not idempotent, so the seed guards it the
same way it guards participant rows. The live room reuses Maya's
active room (the owner allows a host one active room and ends
priors on a new go-live), so re-seeds never stack rooms and never
burn the owner's per-venue-per-day rate limit. Suite-pinned:
three seeds leave the moment count and the live room count (1)
unchanged, no seeded (moment, author, body) comment triple is
ever duplicated, and the viewer's own seeded comment set stays
intact. Refinement recorded honestly: the pin's first draft
bounded the GLOBAL comment total, and combined runs showed a
neighbouring seeded viewer's own two comments on the same
world-shared moments (distinct author ids in the failure output -
that viewer's lawful engagement, not duplication; in this repo's
shared-sandbox sync runs a neighbouring suite's world can be
visible in the same transaction). The pin now asserts the true
seed invariant - per-triple uniqueness - and the combined suite
passes repeatedly on it (section 4).

### The world's other truths hold

Place stones still lead and discovery still composes: those legs
read plans and the plans list, which this wave does not touch
(the suite asserts the viewer's plan count is still >= 8, and the
counts run below shows the feed payload's stories still at 2).
Calibrated presence: 5 moment cards against 8+ plans and 91+
place stones in the R23 DOM inventories - a minority presence in
the braid (client cap is 14 feed items), not a demo reel.

## 3) STAGEABILITY PROOF (runnable artifact)

Artifact: apps/opal_core/test/opal_core/social_flow/
r24_seedworld_stageability_test.exs (committed first, red at base).

It seeds the world through FounderGraphCommitmentSeed.ensure!/2
(the same entry the founder-seed endpoint serves) and composes
through the REAL feed paths. Precision note, as charged: the
final braiding (lives + moments + plan stones interleaved, cap
14) happens client-side in shellData, so this proof sits at the
API/feed-payload layer - HomeFeed.compose/1 (behind
GET /api/v1/product/home/feed) for moment cards and
Lives.list_visible_lives/1 (behind GET /api/v1/product/lives/
visible) for live cards. If these payloads carry the cards, the
glass can stage them; at base they carried none.

Exact command (env per the cluster brief: MIX_ENV=test,
MIX_BUILD_PATH=~/workspace/opal-graph/r24int-scratch/build-seedworld,
DATABASE_URL=.../opal_test_r24seed, Postgres 16 at 127.0.0.1:5433;
runner saved at ~/workspace/opal-graph/r24int-scratch/run-seedworld.sh):

    mix test test/opal_core/social_flow/r24_seedworld_stageability_test.exs

- At base c74adfe3: 4 tests, 4 failures. Failure facts read from
  the run: world["moments"] is nil; SocialMomentRecord count == 0;
  visible lives == [].
- After the seed change: 4 tests, 0 failures.

Exact counts, read from a counts run (mix run of the same seed +
compose calls against the same test DB, output saved at
~/workspace/opal-graph/r24int-scratch/seedworld-logs/counts-output.txt):

    seed payload moments: 5
    seed payload live: host Maya Torres, title "Morning at the
      flower stall", place "Oceanside Farmers Market", status live
    HOME FEED moment cards: 5
      Maya Torres     likes=1 comments=2 viewer_liked=true
      Chanelle Brooks likes=0 comments=1
      Priya Shah      reposts=1 viewer_reposted=true
      Alex Rivera     viewer_saved=true
      Sabrina Nguyen  all zero (quiet)
      (every card: media present, place as in the table above)
    HOME FEED stories in payload: 2 (rail unchanged)
    VISIBLE LIVES: 1 (Maya Torres, mine=false, status live)

## 4) SUITES RUN (all read from their run logs)

- r24_seedworld_stageability_test.exs: 4/0 standalone (twice),
  and 14/14 combined with human_seed_world_test.exs in two
  consecutive final runs (logs final-run-5/6/7 in
  ~/workspace/opal-graph/r24int-scratch/seedworld-logs/).
- human_seed_world + founder_communication_seed +
  founder_graph_commitment_seed: 17/17.
- lives family (paste_k_lives + r23_lives_show): 23/23.
- plan_projection_coherence + repair18_pattern_enforcement +
  social_moment_engagement + social_moment_publishing +
  home_projection: 51/51.
- mix format applied to both touched files (format-only commit).

Environment note (not product): the shared deps copy
(~/workspace/.opal_deps_r19) was missing credo package files at
this cluster's first compile - one dotfile was restored from the
identical credo 1.7.19 copy in a sibling scratch deps tree and
the remainder of the tree reappeared complete during the window;
credo then compiled and all runs above are from this cluster's
own build path and database. Migrations: none added; the
database was created fresh and migrated to 120, the R23 count.

## DISPOSITION

DISPOSITION: FIXED + evidence - the founder-seed world now stages
both journeys: A's home feed payload composes 5 moment cards from
5 of A's people (one carrying a 2-comment thread the comments
door opens, states varied across lit / commented / reposted /
saved / quiet) and A's visible-lives payload carries 1 live room
(Maya Torres at Oceanside Farmers Market, live at the seed
clock), proven by r24_seedworld_stageability_test.exs (red 4/4
at base, green 4/4 after) with all adjacent seed, lives, moment,
coherence and enforcement suites green.
