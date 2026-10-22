# REPAIR #23 - WS-23-1 FLOWS VOICE - cluster report

Worker: R23 cluster worker, WS-23-1 (Flows Voice).
Branch: muse/r23-voice, worktree wt-r23-voice, base muse/repair-23
at 5eda86fe (the verified R22 tip). Gates held: no merge, no
production, muse/repair-17 untouched, FOUNDER_ACCEPTED stays NO.
Plain hyphens only in all code, comments, and this record.

Closes (wiring-plans Section 1): audit R-1 (comments), R-3
(repost and save), F-3 (speech-bubble mis-signal), part of R-12
(moments had no share-out control).

## Files changed

- apps/opal_web/src/c2/shell/C2Home.tsx
  - C2HomeEvents gains openComments(momentId) beside
    replyToPerson.
  - MemoryFeedCard action row re-glyphed (see Glyph decision).
  - Repost and save state and toggles on the card, following
    the light pattern exactly: resting state from the record,
    writes through repostSocialMoment / unrepostSocialMoment /
    saveSocialMoment / unsaveSocialMoment, re-render only from
    the action response, a failed write changes nothing.
- apps/opal_web/src/c2/shell/C2CommentsSheet.tsx (NEW)
  - The C2 comments sheet in the shell's own material:
    TopLayer sheet band, c2s-scrim, c2s-sheet, explicit close
    (data-testid c2-comments-close), the BondStone sheet
    pattern. Driven by listSocialMomentComments on open and
    addSocialMomentComment on post. A posted comment renders
    only from the post response's server-stamped comment
    record (commentFromContract normalizes the contract);
    if a response carried no renderable record the sheet
    re-reads the list instead of painting locally. No
    optimistic paint anywhere: a failed post keeps the draft
    and shows one error line; a failed load shows its own
    error line with a retry. Rows render author name, body,
    and the time from the record's own created_at stamp (the
    legacy MemoryCommentsSheet contract: list, post,
    author/timestamp render - its markup was NOT ported).
- apps/opal_web/src/c2/shell/C2Shell.tsx
  - commentsMomentId state in the shell; the sheet mounts in
    the shell's sheet stack beside Bond / PlaceStone, with
    the bearer through the existing events plumbing
    (HomeRoute onOpenComments -> C2Home events.openComments).
- apps/opal_web/src/c2/shell/bits.tsx
  - IconRepost (two opposing arrows: share onward) and
    IconSave (bookmark ribbon; the button's data-active state
    fills it through CSS) in the shell's stroke glyph language.
- apps/opal_web/src/c2/shell/projections.ts
  - The memory feed record gains viewerReposted, repostCount,
    viewerSaved, commentCount (all optional, finished by the
    one adapter).
- apps/opal_web/src/c2/shell/shellData.ts
  - The Home adapter now maps those four fields from the feed
    payload's engagement_summary, with the flat fields as the
    fallback for older payloads - the same treatment light
    already had.
- apps/opal_web/src/c2/shell/adopt3.tsx
  - MomentsArchive (the You surface's moments archive) gains
    a Saved section fed by listSaved as its own read leg (see
    Saved read-back below), plus the exported savedItemsFrom
    mapper.
- apps/opal_web/src/c2/shell/c2shell.css
  - Repost / save active states (fill and ink, tokens only,
    no numerals) and the comments sheet layout (bounded list,
    composer row, comment rows).
- apps/opal_web/src/c2/shell/r23FlowsVoice.test.tsx (NEW)
  - 14 pins, listed under Tests.

## Glyph decision

- Speech bubble (IconChats) -> COMMENTS. It fires
  events.openComments(item.id) (data-testid c2-feed-comments,
  aria-label "Comments on this moment"). This is F-3's fix:
  the glyph now means what every social reader already reads
  it to mean.
- The author-thread jump keeps its own door, re-glyphed as
  the PERSON (IconPerson, head and shoulders), keeping its
  data-testid c2-feed-reply and its destination
  (events.replyToPerson(authorUserId)), with aria-label
  "Message <author>". Why this form wins the one-second test
  at phone size: the two doors are about different objects -
  the bubble is about the POST (talk under it), the person
  is about the PERSON (talk to them) - and their silhouettes
  (a rectangle with a tail vs a head over shoulders) cannot
  be confused at 21px. The existing r21Flows2 suite, which
  pins the reply door by testid, passes unchanged, and the
  new suite pins that the two buttons carry different drawn
  glyphs and opposite destinations.
- Light (heart) and graph-in stay exactly as they were.

## Repost / save placement decision

IN the card action row (data-testid c2-feed-repost,
c2-feed-save), not in the card context menu. Decided on the
rendered result, two reasons:

1. The row does not crowd. At phone width the card's inner
   row holds the heart plus five 40px glyph doors (comments,
   person, repost, save, graph-in) with the spacer intact;
   each silhouette is distinct and each carries an
   aria-label. The new suite pins the full row and asserts
   the counts-free law over it (no numeral anywhere in the
   row, even after a repost response carrying repost_count).
2. Repost and save are STATEFUL. Their state must be visible
   at rest (presence at rest, readable in one second - the
   calibrated noise law). A state behind a long-press menu
   is invisible at rest. The card's long-press is also
   already owned by the take-panel, so a CardContextMenu on
   this card would have fought that gesture.

State source (verified, not assumed): the feed payload DOES
carry repost/save state. The backend HomeFeed card
(apps/opal_core/lib/opal_core/social_flow/home_feed.ex)
serializes engagement_summary with viewer_reposted,
repost_count, and viewer_saved on every moment; before this
cluster the web adapter read only the like fields out of
that object and dropped the rest. After a tap, state
re-renders from the action response (the repost endpoints
return the full engagement summary server-side; the client
wrappers surface viewer_reposted / repost_count and
viewer_saved). No local-only state a re-read would
contradict: a Home re-read rebuilds the card from the same
payload fields.

## Saved read-back (verified)

The wiring plan assumed saved moments read back in the You
surface's moments archive. Verification at the R22 tip: that
was NOT true. MomentsArchive read only GET
/social-moments/mine (the viewer's OWN posts and stories)
and no C2 surface read GET /saved (listSaved) at all - a
save landed nowhere visible. This cluster closes that leg:
MomentsArchive now loads listSaved as a separate leg (a
failed saved read leaves the section absent and never fails
the archive) and renders a Saved section in the list view:
each saved moment's caption from its own record, a "Saved
post" line with its date, and the privacy note (a save is
private; only the saver sees the list). The enriched saved
contract carries no author display name (author id only),
so no author line is painted. Pinned in the new suite:
saving-side state aside, the archive renders the saved
record from the listSaved response, and renders no section
when the read is empty.

## Tests

New suite: apps/opal_web/src/c2/shell/r23FlowsVoice.test.tsx
(14 tests, all passing):
- bubble opens comments with the moment id and NOT the DM;
- the person door opens the thread and carries a different
  glyph from the bubble;
- no comments door renders when openComments is unwired;
- the sheet lists from listSocialMomentComments (author,
  body, time from the records) and closes explicitly;
- the honest empty state;
- a post round-trips through addSocialMomentComment and
  renders from the RESPONSE record (list not re-read);
- a failed post paints nothing and keeps the draft;
- repost fires repostSocialMoment and re-renders from the
  response, second tap fires unrepostSocialMoment, the row
  stays numeral-free;
- at-rest reposted / saved state renders from the record's
  own fields with no client call;
- save / unsave round-trip from responses;
- a failed repost changes nothing;
- the adapter maps engagement_summary repost / save /
  comment truth onto the card record (homeFromSession);
- a saved moment reads back in the archive's Saved section
  from listSaved; no records, no section.

Commands and counts (from apps/opal_web,
./node_modules/.bin/vitest run <files>):
- r23FlowsVoice.test.tsx: 14 passed / 14.
- Adjacent set (r21Flows2, homeSocial, adopt3,
  c2ShellSurfaces, ja06FeedAction, r22Places, r22Stories,
  r21Creation, ja12MediaWell): 99 passed / 99, 9 files.
- Full c2 shell folder plus src/c2/r20CardMenu.test.tsx and
  src/c2/planCardAtfix.test.tsx: 493 passed, 2 failed, 52
  files. Both failures are pre-existing at the base tip and
  neither is in this cluster's path:
  - src/c2/shell/r20Connect.test.tsx (the state-accent
    canon-token test, line 509) - it failed identically in
    this worker's pre-edit baseline run of the shell folder
    at the R22 tip (469 tests, that 1 failure).
  - src/c2/r20CardMenu.test.tsx (the state-accent
    canon-token test, line 174) - proven pre-existing by
    running both files on muse/repair-23 in the existing
    wt-repair23 worktree: 2 failed / 18 passed there, the
    same two tests.
- Typecheck (tsc -p tsconfig.json --noEmit): exactly 9
  errors, the pre-existing baseline count, none in any file
  this cluster touched.

## CAPTURE SPEC (frames the integrator must take)

Badge: the R23 integrated badge once this branch merges into
muse/repair-23. LIGHT first, then dark, phone size, on the
signature-gated capture rig. Moment of record: Maya's moment
(the market / golden-hour moment the R21/R22 sets use).

1. Card row at rest - LIGHT: Flows, Maya's moment card,
   resting row showing heart, comments bubble, person door,
   repost, save, graph-in; nothing lit, reposted, or saved.
2. Card row at rest - DARK: the same frame in dark mode.
3. Comments sheet open with existing comments - LIGHT: tap
   the bubble on Maya's moment; the sheet shows the existing
   comments with author names and times, composer at the
   sheet's foot, explicit close visible.
4. Comments sheet after posting - LIGHT: post a comment in
   the same session; the new comment is in the list, stamped
   from the server, draft cleared.
5. Saved state on card - LIGHT: tap save on a moment; the
   bookmark reads filled / active on the resting card.
6. Saved read-back surface - LIGHT: You -> Your moments; the
   Saved section lists the moment saved in frame 5.
7. Reposted state - LIGHT: tap repost on a moment; the
   repost door reads active on the resting card; no numeral
   anywhere in the row.
8. Thread door - LIGHT (one frame): tap the person door on
   Maya's moment; the direct conversation with Maya opens
   (proves the door's destination is the thread, not
   comments).

## DECLARATIONS

- Comment count on the card: the payload carries
  comment_count and the adapter now projects it
  (commentCount), but no count renders on the card - the
  counts-free law that governs light governs this row, and
  the founder has never lifted it for comments. Declared,
  not painted.
- Repost of a private or specific-people moment: the server
  refuses it (repost_not_allowed). The card keeps the
  server's last truth on failure - there is no inline error
  line on the card for this, matching the light failure
  treatment. The refusal is therefore silent at the glass;
  declared here rather than absorbed.
- The comments sheet shows comments for one moment at a
  time, opened from Flows. Story comments do not exist
  (story engagement is declared-absent upstream, audit D-M)
  and are not wired here.
- Live cards carry no comments / repost / save doors in
  this cluster: the wiring plan scopes WS-23-1 to moment
  cards, and the Live destination is WS-23-3's surface.
- No backend, no productClient signature, and no
  ShareComposer text was changed (the composer is another
  cluster's surface). The saved section's addition to
  MomentsArchive is the one surface beyond the plan's letter
  this cluster added, and it was required by the plan's own
  saved read-back verification, which failed at the base
  (see Saved read-back above).
