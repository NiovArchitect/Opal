# Repair #15 — Track E: ADD STORY / ADD POST — Full Repair Report

Branch: `muse/repair-15-e` (from Repair #14 tip `025a0289`)
Scope: web app + web-in-mobile-shell (the native app hosts the web surface via
`apps/opal_mobile/src/shell/ProductWebSurface.tsx`; there are NO native
story/post create screens in `apps/opal_mobile` — verified by search).
No merge, no production, no Pass 2, no user-data deletion. Additive + corrective only.

## How the flows actually work (traced end to end)

- STORY: Home stories rail "Your story / Add" → chooser → `StoryCreateFlow.tsx`
  → `OpalApp.onShared` → `authoritativeCreateStory` → `POST /api/v1/product/stories`
  → `TemporaryStoryPublishing.create` → `temporary_stories` row (24h expiry) →
  read back via `HomeFeed.compose` / `GET /stories` → `productionStoryToItem`
  → rail → `StoryViewer.tsx`.
- POST: Home chooser "Post" → `GraphCreateFlow.tsx` ("Add to your graph") →
  `OpalApp.onCreated` → **(before this repair) a write-only React state** →
  backend path that existed but had NO web caller: `POST
  /api/v1/product/social-moments/media` (upload) + `POST
  /api/v1/product/social-moments` (`SocialMomentPublishing.publish`) →
  `social_moments` row → `HomeFeed.compose` → feed cards.

## Enumeration — everything that was actually wrong, per link in the chain

### STORY

- **E1 (backend, audience — CRITICAL). Close-circle stories reached NOBODY.**
  `TemporaryStoryPublishing.eligible?/2` for `visibility == "close_circle"`
  was literally `author == viewer`. `close_circle` is the DEFAULT audience in
  the create UI, so the default story was author-only while the UI promised a
  "Close circle" audience. There was no close-circle authority wired in at all.
  FIXED: eligibility now follows the house Lives law
  (`apps/opal_core/lib/opal_core/lives.ex`): `RelationshipGraph.
  friend_visibility_authorized?/2` (mutual establishment or dyad peer; blocks
  override) AND an explicit user-set relationship type of
  spouse/partner/family/close_friend in either direction
  (`OpalCore.Relationships.get_type/2`). New public
  `TemporaryStoryPublishing.close_circle_member?/2`.

- **E2 (backend, lifecycle validation). `ttl_hours` crashed or lied.**
  A JSON string ttl (`"24"`) raised `ArithmeticError` in create (500). A
  non-positive ttl produced a story that was born expired yet returned as a
  successful create. Unknown visibility strings fell through to a raw
  changeset error. FIXED: ttl is parsed (integer / float / numeric string),
  must be 1..72 hours, else `{:error, :invalid_ttl}` and nothing persists;
  unknown visibility returns `{:error, :invalid_visibility}`.

- **E3 (web, viewer render — CRITICAL). Real story media was silently dropped.**
  `productionStoryToItem` kept `media_ref` only when it started with `/`.
  Every real capture — browser file input AND the native Expo bridge
  (`nativeMediaAcquisition.ts`) — produces a `data:` URL, so a freshly created
  story rendered in the rail and in `StoryViewer` with NO media (avatar
  fallback). Gyroscope break: the row existed, the surface showed nothing.
  FIXED: `renderableMediaRef/1` accepts `/`, `data:`, and `https://` refs and
  rejects junk schemes (`javascript:`, `blob:`, empty).

- **E4 (web, fake success — the cardinal sin). Share claimed success before
  the backend answered.** `StoryCreateFlow` called `onShared` synchronously,
  immediately set the note "Story shared temporarily…" and CLOSED. If the
  create then failed (signed out, server error), the user had already been
  told it shared. FIXED: `onShared` is async; the flow stays open with a
  "Sharing..." state, closes only after the promise resolves, and on
  rejection keeps the draft on screen with `Couldn't share your story: …`.
  `OpalApp` now awaits `authoritativeCreateStory` and propagates the throw
  (previously a swallowed `.catch` that only set a transient note).

- **E5 (web, missing link). No caption in the story flow.**
  Backend schema, contract, and `StoryViewer` all support/render a caption,
  but `StoryCreateFlow` had no caption input and `OpalApp` never passed one,
  so every story caption was `""`. FIXED: caption textarea
  (`data-testid="story-create-caption"`) → draft → `authoritativeCreateStory`.

- **E6 (web, gyroscope). A created story did not appear until re-login.**
  Home hydration (`loadProductionHomeOwners`) ran only on auth/token change;
  after a successful story create nothing refreshed the rail. FIXED:
  `refreshProductionHomeOwners()` in `OpalApp`, called after story AND post
  creates — the rail/feed re-read the same backend state every other surface
  reads; no optimistic local copy is injected.

- Story links verified HEALTHY (no change): media acquisition (native bridge
  with browser fallback, cancel/error states honest); create persists a real
  DB row with 24h `expires_at`; expired and soft-deleted stories leave every
  viewer's list (query filter + regression tests); `friends` eligibility uses
  `RelationshipGraph` (never default-true, block overrides — pre-existing
  zero-trust tests); viewer playback (7s image timer, video ended-advance,
  tap/hold nav) is real.

### POST

- **E7 (web, THE post bug — CRITICAL). "Post" never persisted at all.**
  Home → Post opened `GraphCreateFlow`; its `onCreated` in `OpalApp` did only
  `setCreatedGraphs((prev) => [draft, ...prev])`. `createdGraphs` is
  WRITE-ONLY state — grep proves it is never read, passed, or rendered
  anywhere in the app. The post vanished on refresh, was invisible to every
  other account, and the flow closed as if it had posted. The durable backend
  (`publishSocialMoment`, media upload endpoint) existed with zero web
  callers. FIXED end to end:
  - `productClient.uploadSocialMomentMedia` (new client for the existing
    `POST /social-moments/media` endpoint).
  - `socialAuthority.authoritativeCreatePost`: signed-out → throw; image
    `data:` media → upload → publish with returned media id; caption-only
    posts publish directly; failures propagate.
  - `GraphCreateFlow` gains `mode="post"` (used ONLY by the Home Post entry,
    via `graphCreateContext.intent === "post"`): blank caption (see E9),
    real audience selector (Friends / Only me — the visibilities
    `SocialMomentVisibility` actually enforces; the old UI's static
    "Close circle" chip + join-request toggles were plan semantics that a post
    silently ignored, with the draft audience hard-coded `close_circle`),
    submit label "Post", and an async submit that stays open with
    `Couldn't post: …` on failure instead of closing.
  - `OpalApp.handleGraphCreated` routes post drafts to
    `authoritativeCreatePost`, then refreshes production Home owners and
    lands on Home with the post read back from the backend.

- **E8 (backend, media integrity / privacy). Publish accepted ANY media_ids.**
  Nonexistent ids persisted (Home card pointing at a media 404). Worse, ids
  owned by ANOTHER user persisted too — and `read_media/2` serves bytes to
  anyone who can view the referencing moment, so attaching someone else's
  media id to your friends post would serve THEIR bytes to YOUR audience.
  FIXED: `SocialMomentPublishing.publish` validates every media id exists,
  is owned by the author, and is not deleted, else `{:error, :invalid_media}`
  (non-UUID ids included). Existing publishing tests use properly owned
  uploads and still pass.

- **E9 (backend + web, empty/fake content). Empty posts persisted; the post
  form was prefilled with fiction.** `publish` accepted blank caption + no
  media, rendering a blank "Memory" card in Home. And `GraphCreateFlow`
  prefilled title "Beach at sunset" / caption "Golden hour at Moonlight.
  Needed this." — one tap could post words the user never wrote. FIXED:
  backend rejects `{:error, :empty_post}`; post mode starts with empty
  title/caption.

- Post links verified HEALTHY (no change): visibility enforcement
  (`SocialMomentVisibility.can_view?` — private / specific_people / group /
  friends all server-enforced, friends never default-true, block overrides);
  Home feed composition is eligibility-first with no fixture injection;
  engagement (like/comment/repost/save) already routes through BEAM for
  durable ids; author delete/edit/hide/report all exist and are
  author-authorized.

## What remains BLOCKED (stated precisely — not faked)

- **Video posts.** The backend media store is image-only
  (`MediaLocalStore` allowed mimes are images; `media_status` honestly
  reports `"video" => "PARTIAL_FUTURE"`, `production_cdn: false`,
  LOCAL_DEV storage). `authoritativeCreatePost` therefore refuses video with
  "Video posts aren't supported yet - choose a photo for this post." rather
  than pretending. Unblocking needs a real video media service/CDN decision —
  founder/infra scope, not something to simulate client-side.
- **Story media storage is inline.** Stories keep the capture's `data:` URL
  as `media_ref` in the DB row (the media-bytes endpoint can only serve bytes
  to the owner or to viewers of a referencing SocialMoment — a story is
  neither, so uploading story media there would break audience viewing).
  This works and renders for the full audience, but it is LOCAL_DEV-grade
  storage (large rows, no CDN, no moderation pipeline). A story-media
  delivery path with story-scoped authorization is the real fix and belongs
  with the media-service decision above.
- **Video STORIES** have the same storage caveat: a video `data:` URL is
  stored and `StoryViewer` will attempt playback, but there is no transcoding
  or streaming; large videos will be impractical until the media service
  exists.
- **Adjacent, out of Track E scope (flagged, not repaired):** the non-post
  `GraphCreateFlow` completions (Graphs "Add to graph", Repeat, plan-from-
  chat) still land in the same write-only `createdGraphs` state — i.e.
  "Add to graph" drafts are not durable either. That is the graph/plan
  creation track's object, not a SocialMoment post; wiring it to
  `publishSocialMoment` would be wrong. It needs its own durable graph-create
  endpoint decision.
- Founder phone walk: NOT CLAIMED (machine-proven only, per standing law).

## Tests & evidence

Backend (Elixir, `MIX_DEPS_PATH=/tmp/opal_deps MIX_ENV=test`):
- Baseline for the directly-affected files: 15 tests, 0 failures.
- NEW `test/opal_core/social_flow/story_post_repair15_test.exs` — 11 tests,
  fresh randomized accounts (unique handles per run), asserting REAL effects:
  DB rows present/absent, per-account story list eligibility
  (author/close/friend/outsider), expiry removal, ttl/visibility rejection
  with zero rows persisted, post publish → DB row → HomeFeed presence for
  author+friend and absence for outsider, media byte access for authorized
  viewer and denial for outsider, stolen/ghost/junk media rejected, empty
  post rejected.
- Affected-file run after fixes (story_post_repair15 + social_moment_
  publishing + social_moment_engagement + pre_live_zero_trust +
  social_moment_engagement_api): all pass. NOTE: running
  `relationship_audience_trust_test.exs` in the same invocation as
  async:false modules produced 4 failures at its line 170 (group visibility);
  run alone it passes 18/18, and it does not touch any code changed here —
  shared-sandbox fixture interference in that ad-hoc invocation, confirmed
  by the isolated rerun. Full-suite result below is the authoritative check.
- FULL SUITE after fixes: **2,666 tests, 0 failures** (`mix test --seed 0`) —
  exactly baseline 2,655 + the 11 new Repair #15 tests. Zero regressions.

Web (Vitest):
- Baseline for affected files: 59/59 pass; `graphDetail.test.ts` has ONE
  pre-existing failure at baseline (verified by stash: fails identically on
  the clean tree — the Repair #14 "web failures at baseline").
- NEW `src/opalUi/storyPostRepair15.test.ts` — 10 tests: data:-media mapping,
  scheme rejection, `parseDataUrl`, `authoritativeCreatePost` upload→publish
  chain with mocked client (media id + visibility asserted), caption-only
  path, signed-out/empty/video/non-uploadable refusals with publish never
  called, publish-failure propagation, plus wiring contracts for
  StoryCreateFlow / GraphCreateFlow / OpalApp / productClient.
- Affected web files after fixes: all pass except the known pre-existing
  `graphDetail.test.ts` failure (unchanged).
- FULL WEB SUITE: baseline (stash) 1,081 tests / 25 failed; after fixes
  1,092 tests / 25 failed, and the sorted failure lists are BYTE-IDENTICAL
  (`diff` clean) — all 25 are pre-existing baseline failures in untouched
  areas (activation, waveB exact-authority, graphScroll, technicolor, …);
  the +11 delta is my 10 new tests plus one dynamic-count variance. Zero new
  web failures.
- `tsc --noEmit`: 7 errors before, 7 after — identical pre-existing set,
  none in touched files.

## Files changed

Backend:
- `apps/opal_core/lib/opal_core/social_flow/temporary_story_publishing.ex` (E1, E2)
- `apps/opal_core/lib/opal_core/social_flow/social_moment_publishing.ex` (E8, E9)
- `apps/opal_core/test/opal_core/social_flow/story_post_repair15_test.exs` (new)

Web:
- `apps/opal_web/src/opalUi/StoryCreateFlow.tsx` (E4, E5)
- `apps/opal_web/src/opalUi/socialAuthority.ts` (E3, E7)
- `apps/opal_web/src/opalUi/GraphCreateFlow.tsx` (E7, E9)
- `apps/opal_web/src/api/productClient.ts` (E7 — upload client)
- `apps/opal_web/src/OpalApp.tsx` (E4, E6, E7 — async story handler, refresh, post routing)
- `apps/opal_web/src/opalUi/storyPostRepair15.test.ts` (new)
