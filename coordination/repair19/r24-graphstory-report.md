# Repair #24 - Cluster B (WS-2): Graph-Story Posting, Real Server Path

Branch: muse/r24-graphstory (worktree wt-r24-graphstory), base c74adfe3
(muse/repair-23 tip). Commits:

- 2d95edfe failing-first pins (backend + composer suites)
- 427784b2 backend: real graph-story posting path
- fd75b863 web: graph anchor door in the C2 story composer
- 1bf2ab61 mix format pass on the touched Elixir files
- (this report)

## The declared gap (WS-3, repair22-handoff)

Graph-story POSTING had no server path: TemporaryStory had no graph
reference and its contract asserted "not_graph" => true for every
story (temporary_story.ex:66 at the R23 tip, verified). Graph
stories in the viewer already played under the same 24h law (pinned
by the web storytime suite); only posting was missing. That is now
built.

## Contract change

- Additive migration 20261030030500 (beyond the 20261030030400
  ceiling): temporary_stories.graph_plan_id references shared_plans
  (binary_id), indexed, on_delete nilify_all. If a plan row were
  ever hard-removed, the anchor nilifies and the story's stored
  "graph" visibility matches no person branch, so it falls back to
  author-only - it never widens. Plans are never hard-deleted in
  product paths today (cancel is a status), so this is a fail-closed
  backstop, not a live path.
- TemporaryStory schema: belongs_to :graph_plan (foreign_key
  :graph_plan_id), cast + foreign_key_constraint. "graph" added to
  the schema visibility vocabulary; it is writable only by
  TemporaryStoryPublishing's anchored branch, which sets it together
  with the anchor after the party check. The person-story create
  path still accepts only close_circle / friends.
- TemporaryStory.contract/2: the unconditional assertion is replaced
  by the real branch - "graph_plan_id" => the plan id or nil, and
  "not_graph" => is_nil(anchor). Person stories are byte-identical
  to before (nil anchor, not_graph true, every other key unchanged).
- Create API: POST /api/v1/product/stories accepts graph_plan_id
  (aliases plan_id, graph_id). Resolution happens BEFORE anything
  persists: a junk or unknown id returns {:error, :graph_not_found}
  and an author who is not a party returns
  {:error, :not_graph_party}; nothing is inserted in either case.
  The controller maps them to 404 and 403 respectively (matching
  delete_story's mapping in the same controller); all other story
  errors keep their existing 422 shape.
- Anchored stories store visibility "graph" whatever person
  visibility the client sent alongside the anchor, so the contract
  never claims a wider audience than the parties who can read it.
  The created event payload carries graph_plan_id when anchored.

## Visibility reasoning

- Precedent found: SharedPlan.plan_media_authorized?/2 (Repair #19
  BS-05) - content attached to a plan authorizes exactly its own
  people: the plan's creator plus its PlanParticipant rows. A story
  anchored to a graph is the same category of thing (graph-scoped
  content), so it follows the same party law. Response state does
  not narrow standing (a pending participant is a party), exactly
  as in the media precedent.
- TemporaryStoryPublishing.graph_party?/2 implements that law and
  is evaluated live on every call - no cache, no polling.
- eligible?/2: the anchor clause sits ahead of the person visibility
  branches, so the anchor overrides them even on a hypothetical row
  whose stored visibility says friends / close_circle. A graph story
  is visible to exactly the graph's parties: the author's close
  friends and plain friends who are not parties cannot read it
  (pinned against a close_friend of the author who is not a party -
  the discriminating case), and a party who is not the author's
  friend CAN read it.
- Because story_media_authorized?/3 routes through eligible?/2, the
  story's media bytes follow the same law with no second
  implementation (pinned: party reads bytes, close-friend non-party
  and outsider get :not_found from SocialMomentPublishing.read_media/2).
- Per-account isolation preserved: every check is keyed on the
  viewer's own id against the plan's own rows; the picker (below)
  only ever lists the viewer's own plans. Counts-free: no count
  fields added anywhere. Same TTL code path: the 24h law (and the
  1-72h ttl_hours validation) is literally the person-story path;
  pinned by an expiry window assertion (23h < expires_at - now
  <= 24h at default) and by an expired graph story leaving every
  list.
- Gyroscope: temporary_story_publishing.ex now reads the single
  plan store (Repo.get(SharedPlan) + PlanParticipant exists query),
  so it is registered in PlanProjection.read_files/0 with a
  graph_party?/2 read_functions entry, following the 81a6993c
  precedent. The module renders no plan state; a boolean is all
  that leaves it. PlanProjectionCoherenceTest passes.

## Client door

The story-create surface EXISTS in C2, so it is wired, not declared
absent: the Create sheet's Share composer (C2Home.tsx, Story
destination).

- Once media is picked and the destination is Story, a graph picker
  renders (data-testid c2-composer-graph-picker). Its options come
  from listOpalPlans - the server's plan list, already scoped to
  plans the viewer created or participates in - so only graphs the
  author belongs to are ever offered; the server re-checks party
  standing on create regardless, so a stale pick is rejected, never
  widened. Default is "Just my story" (no anchor; the create call
  is byte-identical to the pre-R24 person-story call). A picked
  graph sends graph_plan_id.
- The composer's header line no longer claims "Does not post a
  Memory or a Graph" once an anchor is picked; it says the story is
  shared with this graph's people only. Post destination never
  renders the picker. A viewer with no graphs gets an honest
  "No graphs yet - this story is just yours." line and no anchor
  options (no fake data anywhere in the door).
- API wrappers: productClient.createTemporaryStory accepts
  graph_plan_id; socialAuthority.authoritativeCreateStory accepts
  graphPlanId and carries it through both its media-upload leg and
  its legacy-ref leg; productionStoryToItem carries the contract's
  graph_plan_id onto the rail item (FounderStoryItem.graphPlanId,
  additive and optional). The legacy OpalApp StoryCreateFlow posts
  through authoritativeCreateStory, so it gains the capability via
  the wrapper; no graph picker was added to that legacy surface -
  the C2 composer is the wired door.
- Scope note: nothing here touches comments or engagement
  (Cluster A's ground). A story posted to a cancelled or expired
  plan is not specially gated - party standing is the only anchor
  law, matching the media precedent, which also ignores plan
  status; the story expires in 24h regardless.

## Test evidence (counts read from run output)

Backend (env per the task brief; DB opal_test_r24graphstory on
Postgres 16 at 127.0.0.1:5433; MIX_BUILD_PATH
r24int-scratch/build-graphstory):

- Failing-first at base code (commit 2d95edfe tests only):
  mix test test/opal_core/social_flow/graph_story_repair24_test.exs
  -> 9 tests, 9 failures (a non-party post succeeded as a person
  story with not_graph true - the gap, reproduced).
- mix ecto.migrate -> exit 0, including
  20261030030500 AddGraphPlanToTemporaryStories.
- New suite after the fix: 9 tests, 0 failures.
- Final combined run at the branch tip:
  mix test graph_story_repair24_test.exs story_post_repair15_test.exs
  story_media_repair16_test.exs social_moment_engagement_test.exs
  pre_live_zero_trust_test.exs plan_projection_coherence_test.exs
  repair18_apifix_test.exs human_seed_world_test.exs
  -> 86 tests, 0 failures.
- The old not_graph pin in social_moment_engagement_test.exs turns
  out to pin a PERSON story (no anchor), so it passes unamended -
  correctly, since the person branch keeps not_graph true. The
  real-behavior pins replacing the blanket assertion live in the
  new suite: graph story not_graph false + graph_plan_id carried;
  person story not_graph true + graph_plan_id nil.

Web (apps/opal_web; node_modules was absent in this worktree, so
npm install --no-audit --no-fund was run first - 150 packages):

- npx vitest run src/c2/shell/r24GraphStory.test.tsx -> 7 passed.
- Non-regression batches:
  r23Audience + r21Creation + adopt3 + socialAuthority.test +
  storyMediaRepair16.test + storyPostRepair15.test +
  storyViewerTemporality + storyPlayback -> 8 files, 79 passed.
  homeSocial + c1ShellWiring + ja11StoryRail + c2ShellSurfaces +
  r22StoryTime + f1StoryViewerLayout -> 6 files, 55 passed.
  Final tip re-run (r24GraphStory + r23Audience + r21Creation +
  socialAuthority.test) -> 4 files, 40 passed.
- npx tsc --noEmit -> exit 0, no errors.

Environment note: the shared MIX_DEPS_PATH credo copy
(~/workspace/.opal_deps_r19/credo, v1.7.19) was missing source
files (including .template.debug.html, cli/exit_status.ex, credo.ex
and others), which blocked any fresh build path from compiling.
The missing files were restored verbatim from the intact same
version copy at ~/workspace/opal-graph/fixwave-scratch/deps/credo
(copy-missing-only; the lib trees are now identical). No repo code
was involved; flagged here because other fresh-build clusters will
hit the same wall without the restore.

Format note: the touched Elixir files are mix-format clean. The
controller file is not formatter-clean at the base commit (verified
against c74adfe3), so it was deliberately left in its existing
style; the two WS-2 clauses follow the file's own conventions.

## Laws check

Additive-only migration (timestamp beyond the ceiling): yes.
Gyroscope registration for a new plan-table reader: yes.
No polling (picker loads once per composer open; server checks are
per-call): yes. Per-account isolation: yes. Counts-free: yes.
No fake data (picker is the viewer's real plan list; empty state
says so): yes. Plain hyphens in user-facing strings: yes.
No merge / deploy / Pass 2: none. wt-repair24 and other worktrees
untouched; no comment/engagement code touched.

DISPOSITION: FIXED + evidence - graph-story posting has a real
server path (anchor validated, party-gated, same 24h law), the
contract's not_graph is a real branch, visibility is exactly the
graph's parties, and the C2 story composer offers the anchor from
the viewer's own graphs; backend 86/86 and web suites green at the
branch tip as itemized above.
