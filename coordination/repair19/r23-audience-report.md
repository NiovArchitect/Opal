# REPAIR #23 - WS-23-2 AUDIENCE MADE REAL - WORKER REPORT

Branch: muse/r23-audience (from muse/repair-23 at 5eda86fe, the
verified R22 tip). Gates held: no merge, no production,
muse/repair-17 untouched. Closes audit R-2 per
repair23-wiring-plans.md Section 2, with the Section 2 risk
fallback taken (see vocabulary below).

## The server's true visibility vocabulary for moments

PROVEN at execution, not assumed:

- SocialMomentVisibility.supported_visibilities/0
  (apps/opal_core/lib/opal_core/social_flow/social_moment_visibility.ex)
  returns ~w(private specific_people group friends), and
  SocialMomentRecord @visibilities
  (apps/opal_core/lib/opal_core/social_flow/social_moment_record.ex:8)
  is the same set, enforced by changeset inclusion.
- SocialMomentPublishing.publish/2 rejects any visibility
  outside that set with :invalid_visibility.
- "close_circle" is NOT a moment value. It is a story value
  (TemporaryStoryPublishing accepts only close_circle |
  friends) and a live value (GoLiveFlow's segment). Naming
  followed the server's truth, per the workstream instruction:
  the composer segment ships Friends / Specific people /
  Only me - values friends | specific_people | private.
  "private" is included because the Your Moments archive edit
  row already speaks it and parity (plan item 4) requires the
  two surfaces to speak the same control values; it is a
  server truth (preview answers "Only me" for it).
- "group" is a server truth but not a composer choice: it is
  set by publishing into a group conversation
  (group_conversation_id), which the composer does not carry.

## What shipped

1. Both static "Audience: Friends" texts in ShareComposer are
   dead. Grep of apps/opal_web/src/c2/shell/C2Home.tsx for
   "Audience: Friends" after the change: zero hits (also
   pinned by the new web suite reading the source file).
2. The composer (post destination, both the text-first and
   media-first branches) carries a real audience segment in
   the GoLiveFlow pattern (c2s-seg, aria-pressed, the label
   rendered is the state value's label). Segment values come
   from ONE shared source, MOMENT_AUDIENCE_OPTIONS in
   c2/shell/adopt3.tsx, whose labels come from the existing
   MOMENT_AUDIENCE_LABELS map.
3. Publish sends the state: publishSocialMoment now receives
   visibility always, plus audience_user_ids for the
   specific-people choice (picked ids only). Stories are
   untouched: the segment is post-only and the story path
   still sends visibility "friends" as before (story audience
   vocabulary is a different server truth - see DECLARATIONS).
4. Preview: new client wrapper previewSocialMomentAudience
   beside publishSocialMoment in api/productClient.ts (POST
   /social-moments/audience-preview, the endpoint whose own
   question is "Who can see this?"). The composer calls it on
   every audience state change (segment, picks) and renders
   the endpoint's own answer in the sheet:
   "{question} {who_can_see}", data-testid
   c2-composer-audience-preview. Nothing about the audience
   is computed locally. On preview failure the line is simply
   absent - no fabricated answer.
5. Specific-people picker: people source is
   listPeopleProjection - the one people projection the shell
   already uses (GroupMembership's add-people sheet). Only
   account_backed people are offered, because
   audience_user_ids are user ids and a contact with no
   account cannot be named in an audience. No new people
   endpoint was invented. Share is disabled for the
   specific-people choice until at least one person is
   picked, so a "Specific people" post can never silently
   mean "only me".
6. Edit parity: the Your Moments archive edit row in
   adopt3.tsx now draws its options from
   MOMENT_AUDIENCE_EDIT_OPTIONS - the same shared
   MOMENT_AUDIENCE_OPTIONS minus specific_people. The minus
   is deliberate and documented in code: the archive contract
   (public_contract) does not carry a record's stored
   audience_user_ids, so the archive row cannot honestly set
   a specific audience; it offers the self-contained values
   (friends, private) with the same values and labels the
   composer sends. A specific_people post in the archive
   still reads "That audience was set when you shared it."

## Files changed

- apps/opal_web/src/api/productClient.ts - new
  previewSocialMomentAudience wrapper + SocialMomentAudiencePreview
  type, beside publishSocialMoment.
- apps/opal_web/src/c2/shell/C2Home.tsx - ShareComposer:
  audience state, segment, picker, preview effect and render,
  publish sends visibility + audience_user_ids; both static
  texts removed.
- apps/opal_web/src/c2/shell/adopt3.tsx - MOMENT_AUDIENCE_OPTIONS
  / MOMENT_AUDIENCE_EDIT_OPTIONS shared control values;
  archive edit row consumes them.
- apps/opal_web/src/c2/shell/r23Audience.test.tsx - NEW web
  suite (6 tests).
- apps/opal_web/src/c2/shell/r21Creation.test.tsx - one
  expectation updated: the text-post publish call now also
  carries visibility "friends" (the old pin asserted the
  visibility-less call, which was the defect).
- apps/opal_core/test/opal_core_web/r23_audience_invisibility_test.exs
  - NEW ExUnit proof (3 tests). No backend code changed.

## Test evidence (exact commands + counts)

API leg, standalone (the mandatory proof), run in
apps/opal_core with MIX_ENV=test,
MIX_BUILD_PATH=~/workspace/opal-graph/r23aud-scratch/build-test,
DATABASE_URL pointing at a dedicated opal_test_r23aud
database on the local 5433 stack:

  mix test test/opal_core_web/r23_audience_invisibility_test.exs
  -> 3 tests, 0 failures

What it proves, with three real authenticated accounts
(A author, B excluded friend, C included friend; B and C made
A's friends via dyad conversations, the RelationshipGraph
rule): A publishes visibility "specific_people" with
audience [C]. B's GET /social-moments contains neither the
post id nor its caption; B's GET /social-moments/:id is 404
not_found; B's GET /home/feed (the Flows read path) contains
no trace. A and C see it on list and show; C's show returns
visibility "specific_people". NEGATIVE CONTROL in the same
file: A's Friends post IS visible to B on list, show and
home feed. A third test pins the preview endpoint answering
"Who can see this?" with who_can_see naming the included
friend for the restricted choice.

Neighboring backend suites in the same run shape
(r23_audience_invisibility + social_moment_engagement_api +
adopt3_api + follow_api): 12 tests, 0 failures.

Web, run from apps/opal_web via ./node_modules/.bin/vitest:

  vitest run src/c2/shell/r23Audience.test.tsx
             src/c2/shell/r21Creation.test.tsx
             src/c2/shell/adopt3.test.tsx
  -> 3 files, 36 tests, 0 failures (r23Audience 6/6,
     r21Creation 15/15, adopt3 15/15)

  vitest run src/c2/shell/   (the whole c2 shell folder set)
  -> 50 files: 49 passed, 1 failed; 475 tests: 474 passed,
     1 failed. The one failure is r20Connect.test.tsx's
     happening-ring glow pin - the named IF-1 exception
     (Section 11 row 5: WS-4's 8px token vs the R20 F-10
     14px pin, founder decision pending, R23 changes neither
     side). Verified pre-existing: the same file run in the
     pristine muse/repair-23 worktree (wt-repair23) fails
     identically, 1 failed / 13 passed. No new failures vs
     the R22 tip.

  tsc --noEmit -> 9 errors, exactly the R22-tip baseline
  count, none in any file this workstream touched.

## Read-path enforcement hole: NONE FOUND

Evidence, traced and then proven by the test above:
SocialMomentVisibility.can_view?/3 has an explicit
"specific_people" branch requiring the viewer to be in
audience_user_ids (and not blocked). Every product read path
routes through it: GET /social-moments via
SocialMomentPublishing.list_for_viewer (Enum.filter on
can_view?), GET /social-moments/:id via get_for_viewer
(can_view? or 404), and GET /home/feed via HomeFeed.compose,
which builds from the same list_for_viewer. The API leg's
invisibility assertions pass against all three paths, so
invisibility is server-true, not a render filter. No backend
fix was needed and none was made.

## CAPTURE SPEC for the integrator's glass leg

Two-account seed session (A = author, B = excluded friend,
C = included friend), at the R23 badge, LIGHT first:

1. As A: Create -> Text -> type a caption -> the audience
   segment reads Friends pressed; the preview line under it
   reads "Who can see this? Friends - N people" (the
   endpoint's own count for A's friend set). Frame: composer
   with segment + preview.
2. As A: switch to Specific people -> picker lists A's
   account-backed people -> pick C only -> preview line
   re-renders naming C -> Share. Frame: composer, specific
   people picked, preview naming C.
3. As A: publish a second post with Friends. Frame: A's
   Flows / Your Moments showing both posts.
4. As B: Flows - the specific-people post is ABSENT and the
   Friends post is PRESENT, in the same frame if the stream
   allows, otherwise two frames from one scroll pass.
   THE PAIR: B-absent frame + B-present frame.
5. As C: Flows - the specific-people post is PRESENT.
6. Archive parity frame (A): Your Moments -> open the
   specific-people post -> "Who can see it: Specific
   people." line; open the Friends post -> the edit row's
   audience segmented control offers Friends / Only you in
   the same labels the composer speaks.

## DECLARATIONS (not closed, named)

- Story audience: the segment is post-only. Stories keep
  their existing client behavior (visibility "friends" sent
  explicitly) because the story server vocabulary is
  friends | close_circle - a different truth owned by the
  story surface; giving stories a specific-people choice has
  no server path and was not faked.
- Group visibility: a server truth for moments, not offered
  in the composer (the composer carries no group
  conversation context). Publishing to a group audience
  remains available wherever group_conversation_id is set.
- Archive specific-people editing: the archive edit row
  cannot change a post's specific audience (the archive
  contract does not carry audience_user_ids); it names the
  audience truthfully and offers the self-contained values.
  Extending the archive contract is a backend change
  outside this workstream's pure-wiring scope.
- Preview/picker degradation: if the preview call fails, no
  preview line renders (never a locally invented answer);
  if the people projection fails, the picker shows its
  honest empty state and Share stays blocked for that
  choice. Both are absence, not falsehood.
- IF-1 (r20Connect glow pin) remains exactly as Section 11
  left it: untouched by this workstream, founder-gated.
