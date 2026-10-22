# REPAIR #24 - WS-1: THE STORY-ENGAGEMENT RECORD (D-M), STORY
# COMMENTS, AND THE MENTION/RESPONSE ATTENTION GLOW

Branch: muse/r24-stories, base c74adfe3 (muse/repair-23 tip).
Commits: 6336dc56 (backend), 786b0245 (web), a007c412 (web test
fix), plus this report's commit. FOUNDER_ACCEPTED untouched.
No merge, no deploy, no Pass 2. Additive-only: ONE migration.

## 1) INVESTIGATION - what the product actually does today

- TemporaryStory (temporary_stories): media_ref, caption,
  visibility (close_circle | friends), expires_at, author.
  NO engagement of any kind - no comment, like, reply, mention
  or view record referenced a story anywhere (audit D-M,
  confirmed by grep over lib/ at base).
- The story viewer's Reply door (StoryViewerC2 onReply ->
  C2Shell replyToPerson): resolves or creates the pair's DIRECT
  CONVERSATION via ensureDirectConversation and lands in the
  thread. It carries no story id and sends no message - a story
  reply therefore leaves NO story-scoped truth anywhere. There
  was nothing existing to "record instead": the DM door is a
  conversation door, not a reply record. The new record below
  is the first story-scoped response truth; the DM door is
  unchanged and keeps its own meaning.
- Mention: no mention field, parsing, or record existed for
  stories (mentions in the codebase are plan-conversation
  catalog matching, unrelated).
- Moment comments (the pattern mirrored): SocialMomentComment
  table + SocialMomentEngagement.list_comments/add_comment,
  gated by SocialMomentPublishing.get_for_viewer (only viewers
  who can see the moment), session user is always the author,
  counts projected into the payload and never rendered
  (C2CommentsSheet, WS-23-1).
- Rail (R23 RAIL ITEM 1): wired triggers were LIVE (stoneState
  happening) and CLOSE PEOPLE (loved). Declared unwired:
  mention/response (no flag on the story record) and
  demonstrated interest (no interest field in the rail path).

## 2) DESIGN - the record

ONE new table, temporary_story_engagements
(migration 20261030030500, additive; migration count 120 -> 121):
id, story_id (FK temporary_stories, delete_all), actor_user_id
(FK users, restrict), target_user_id (FK users, nullable),
kind, body (text, nullable), deleted_at, timestamps.

Three kinds, one record - the minimal shape that captures
all three commissioned facts without a parallel truth:

- comment: actor = commenter (session user, never client
  supplied); body required (1-2000); target null. Visible to
  every eligible viewer of the story.
- reply: actor = responder; body required; target STAMPED
  server-side as the story's author (never client supplied).
  A response TO the author: never appears in the comments
  list; readable in full only by the author, a responder
  re-reads only their own rows, any other eligible viewer
  reads an empty list. The author cannot reply to their own
  story (:own_story).
- mention: actor = the story author, ONLY the author; target
  = the mentioned viewer, who must be eligible for the story
  (mentioning someone into a story they cannot see is refused
  :target_not_eligible); body optional; idempotent per
  (story, target). Authors may also name mentioned_user_ids
  at story create - explicit user ids, validated pre-insert
  against the story's own visibility law (any ineligible or
  unknown id rejects the whole create with :invalid_mention
  and nothing persists). Mentions are NEVER parsed out of
  caption text: a display name is not an identity.

Provenance: every row is written only through
TemporaryStoryEngagement (add_comment / add_reply /
add_mention) or through story create's validated mention leg,
each gated BEFORE the write by the new
TemporaryStoryPublishing.get_for_viewer/2 - the story must
exist, be undeleted and unexpired, and the actor must be
eligible under the story's own visibility law (friends via
RelationshipGraph, close_circle via the Lives law). An
ineligible or expired story reads :not_found on every
engagement path, exactly as an invisible moment reads
:not_found in the moment pattern. Per-account isolation
holds by that gate: an account with no eligibility learns
nothing and writes nothing.

Visibility summary: comments = the story's audience; replies
= author + the responder, per row; mentions = the fact of
the row is visible only as the target's own attention flag
(no surface lists who else was mentioned).

Gyroscope law: the new modules read ONLY the story and
engagement tables - no plan tables - so no PlanProjection
.read_files registration applies (the precedent registers
plan-table readers; PlaceSignal needed it, this does not).
The coherence suite was run to prove the point (below).

## 3) WHAT WAS WIRED

Backend (apps/opal_core):
- TemporaryStoryEngagementRecord (schema + contract) and
  TemporaryStoryEngagement (comments / replies / mentions /
  attention_flags), mirroring SocialMomentEngagement's law,
  including domain-event emission per write.
- TemporaryStoryPublishing.get_for_viewer/2 (the engagement
  gate); create accepts mentioned_user_ids; list_for_viewer
  now merges the per-viewer attention flags into each story
  contract. TemporaryStory.contract carries the resting
  defaults (viewer_mentioned false, viewer_has_response
  false) so every payload shape is stable.
- Endpoints (SocialMomentController + router):
  GET + POST /api/v1/product/stories/:id/comments
  GET + POST /api/v1/product/stories/:id/replies
  POST /api/v1/product/stories/:id/mentions
- attention_flags(story_id, viewer): viewer_mentioned = a
  live mention row targets the viewer; viewer_has_response =
  a live reply row on the story involves the viewer (as
  responder or as the author responded to). A plain comment
  earns NEITHER flag (pinned in tests).

Web (apps/opal_web):
- productClient: listStoryComments, addStoryComment,
  addStoryReply, addStoryMention; createTemporaryStory gains
  mentioned_user_ids.
- shellData: the rail adapter carries the record's flags
  verbatim onto the person's cell (OR across that person's
  stories - flags are per record, the cell is per person).
  projections.ts documents the two new fields.
- C2Home stoneGlowTier now takes the story: ATTENTION when
  state is happening or loved (R23 triggers), OR when
  viewerMentioned or viewerHasResponse is set on the record.
  The R23 block comment and the stoneGlowTier comment record
  the amendment and its provenance.
- Story comments at the glass: StoryViewerC2 gains a
  comments door (speech-bubble glyph, its honest meaning per
  the WS-23-1 reglyph law; the Reply door becomes a plainly
  labeled text button so the two doors no longer share one
  glyph) -> C2Home events.openStoryComments -> C2Shell mounts
  the new C2StoryCommentsSheet, a mirror of C2CommentsSheet
  on the story endpoints with the same truth law (list and
  posts render ONLY from server responses; counts projected,
  never rendered). Absent wiring = no door (no dead control).

## 4) INTEREST TRIGGER - NOT WIRED, exact reason

No interest field exists anywhere it would have to live:
TemporaryStory has no interest field, the story contract
carries none, HomeFeed's stories leg adds none, and the rail
adapter reads none (its only interest-adjacent inputs are
the relationship rows and the lives leg, already spoken for
by the loved and happening triggers). There is no
demonstrated-interest signal to compute the flag FROM, so
wiring it would require fabricating a field. It stays
declared unwired, in code comments (C2Home, projections.ts)
and here. Everything the law needs to wire it later is one
server-computed boolean on the story contract, same shape
as viewer_mentioned.

## 5) TESTS - exact commands and counts READ from output

Backend (env: source w28-scratch/env.sh; MIX_ENV=test;
MIX_BUILD_PATH=~/workspace/opal-graph/r24int-scratch/build-stories;
DATABASE_URL=ecto://postgres:$PW@127.0.0.1:5433/opal_test_r24stories;
DB created + `mix ecto.migrate` run by this cluster - 121
migrations, the new table verified by psql):

- mix test test/opal_core/social_flow/temporary_story_engagement_test.exs
  -> 7 tests, 0 failures (the new suite: comments visibility
  incl. close-circle, outsider denial, reply privacy and
  non-comment separation, mention author-only + eligibility +
  idempotence, attention flags from the record only incl.
  the plain-comment negative, create-time mentions +
  ineligible-target rejection, expired-story denial).
- Same command plus social_moment_engagement_test.exs,
  story_post_repair15_test.exs, story_media_repair16_test.exs
  -> 44 tests, 0 failures (adjacent set).
- mix test test/opal_core/plan_projection_coherence_test.exs
  test/opal_core/social_flow/human_seed_world_test.exs
  test/opal_core/social_flow/pre_live_zero_trust_test.exs
  -> 22 tests, 0 failures (gyroscope coherence included).

Web (node_modules was absent in this worktree; ran
npm install --no-audit --no-fund, noted as commissioned):

- npx vitest run src/c2/shell/r24Stories.test.tsx
  src/c2/shell/r22Stories.test.tsx src/c2/shell/r22StoryTime.test.tsx
  src/c2/shell/r21Flows2.test.tsx src/c2/shell/r23FlowsVoice.test.tsx
  -> 5 files, 53 tests passed, 0 failed. r24Stories (6 tests)
  pins the mention trigger and the response trigger at
  data-glow, the viewer's comments door, the no-door honest
  absence, and the sheet's server-only round-trip;
  r22Stories gained the R24 pin inside the R23 glow describe
  (a plain new story flagged viewerMentioned renders
  attention) - its other pins are unamended and green.
- npx vitest run src/c2/shell/r20Connect.test.tsx
  src/c2/shell/ja11StoryRail.test.ts src/c2/shell/homeSocial.test.tsx
  src/c2/shell/r23PlaceSignal.test.tsx
  -> 4 files, 43 tests passed, 0 failed (adjacent set).
- npx tsc -p tsconfig.json --noEmit -> exit 0, no errors.

Failing-first evidence: the web pins were run BEFORE the
portal-query fix and failed on the new surfaces (3 of 6
r24Stories tests red: comments door and sheet not found via
the container query - the surfaces render through TopLayer's
document portal); after querying the portal root they pass.
The backend suite was written against the new modules only
(they did not exist at base, so the suite cannot pass at
base).

## 6) DECLARED / NOT DONE

- No glass capture leg was staged in this cluster (contract
  and component pins are the evidence, as in several R23
  clusters); the served-build walk remains the founder's.
- The story viewer's Reply door still opens the DM thread
  (its standing meaning). A reply written in that thread is
  a conversation message, not a story reply - the
  story-engagement reply record is written through
  POST /stories/:id/replies (client wrapper addStoryReply
  shipped); a composer inside the viewer for it is a founder
  surface decision, not wired here.
- Mention authoring at create rides the API
  (mentioned_user_ids) and the mentions endpoint; no picker
  UI was added to the C2 composer (no people-picker for
  stories exists in the shell today).

DISPOSITION: FIXED + evidence above - the story-engagement
record (D-M) is designed and built, story comments are wired
end to end on the moment-comments pattern and law, and the
mention/response ATTENTION glow trigger fires from the real
record through server-computed flags. The interest trigger
is honestly DECLARED unwired, with the exact missing signal
named in section 4.
