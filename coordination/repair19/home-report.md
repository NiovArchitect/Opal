# Repair #19 - Wave W9 - SOCIAL THAT FEELS SOCIAL (HOME) + AMBIENT SYSTEM SWEEP

- **Branch / worktree:** `muse/r19-home` at `~/workspace/opal-graph/wt-r19-home`, base `f2981dbf` (muse/repair-19). **Not pushed.** Backend untouched.
- **Commits (5, small and clear):**
  - `9792bb9d` record imagery contract (client types + card slots + projection truth fields)
  - `a5decf5a` Home adapter (image resolution, live mapper, composition)
  - `fd8d46ea` Home social composition + ambient styles
  - `94bc62f5` review harness fixtures
  - `64bad85c` tests (19 tests, new file `homeSocial.test.tsx`)
- **FOUNDER_ACCEPTED stays NO** - acceptance is the founder's phone walk. This report claims machine proof only.

## 1. The founder's defect, and what it was in code

The "text block where an image should be" was real and located: the Home
memory card rendered `<span>{item.contextLine}</span>` INSIDE
`.c2s-media-well` whenever the moment had no photo - the caption text
sitting in an image-shaped hole, then repeated again as the card title
below it. Plan cards on Home rendered no imagery at all, and the Live
feed kind existed in the projection type and in the review fixture but
was NEVER produced by the real adapter - Live on member Home was
honestly absent while the review pack showed a fixture live card.

## 2. Imagery data path (record field -> render, provenance)

### Moments (posts/stories in the feed)
- Backend truth: `HomeFeed.to_feed_card` builds `media_ref` from the
  moment's own `media_urls` (first), else `/api/v1/product/social-moments/media/<id>`.
- Adapter (`shellData.homeFromSession`): `photoUrl = media_ref` when
  URL-shaped (`/`, `data:`, `http` - the same renderability rule the
  story rail already used), stamped `photoProvenance: "moment.media_ref"`.
- Render (`C2Home` memory card): byline (author avatar + name from the
  record's `actor`), then the media well with the photo, then the
  caption ONCE as the title. Provenance is on the well as
  `data-media-provenance` (build vocabulary, never screen copy).
- No photo -> the designed no-image treatment (section 4), never text
  in the well.

### Plans
- Backend truth in THIS base: `SharedPlan.to_contract`'s place
  projection carries kind/label/meeting fields and NO photo field;
  the plan contract carries `media_id` (opaque id) and `caption` in
  alignment. The W1 seed sibling had not landed venue imagery in this
  base (its worktree is still at base), so the fields were added
  ADDITIVELY at the projection layer, exactly as commissioned:
  - Client contract (`OpalPlanContract`): optional `image_url`,
    `place_image_url`, `media_url`, and `place.photo_url` /
    `place.image_url` - all optional, absent on every record today.
  - Resolver (`shellData.planImageFromRecord`, exported + tested),
    precedence: `plan.image_url` -> `plan.place.photo_url` ->
    `plan.place_image_url` -> `plan.place.image_url` ->
    `plan.media_url`. URL-shaped values only. The return carries the
    provenance string naming the exact field (e.g.
    `"plan.place.photo_url"`), rendered as `data-media-provenance`.
  - `media_id` is DELIBERATELY never promoted: it is an opaque id and
    this client has no resolver from a plan's media_id to a URL, so
    using it would paint a guessed/broken image (FALSE). Test-pinned.
  - When W1 lands venue imagery on records under any of those field
    names, Home renders it with zero further code changes. When no
    field qualifies, the plan card renders NO media well at all (its
    state treatment, title, people carry the card) - no placeholder,
    no stock photo keyed by title, no text in a hole.
- Render: `PlanCardC2` gained optional `media` / `people` /
  `peopleLine` slots on the ONE card grammar. Only the Home adapter
  (`homeCardFromPlan`) sets them, so Graphs/Center cards are unchanged.
- People on plans: the list contract carries `organizer_name` and a
  finished `who_label`, NOT a participant roster (rosters live on the
  plan-history projection the detail reads). The faces row therefore
  carries exactly the person the record names (the organizer, initials
  in their entity tint) with `who_label` verbatim beside it. No face is
  invented to fill the row. NAMED GAP: full roster faces on list cards
  need the list contract to carry participants - a backend additive
  field for a future wave, not painted here.

### Stories
Unchanged path, already truthful: rail media from the story record's
`media_ref`; a story with no renderable media never opens the viewer
(hunt-fix B-10). The review fixture now gives one story real media so
the pack can prove the viewer path.

## 3. Live surfacing truth

- Source: `getLivesVisible` (GET `/api/v1/product/lives/visible`) -
  the real Paste K / W4-05 Go-live machinery; the same read the legacy
  Home hydrates from. Server returns only rooms with status "live",
  visible to the viewer (own + friends/close-circle), each with
  `place_label` honouring the host's location precision and the venue
  contract.
- Adapter: new leg in `homeFromSession` + pure mapper
  `liveFeedFromRooms` (exported + tested). Gating is strict:
  a card exists ONLY for a record with an id AND `status === "live"`
  (re-checked client-side; ended/flagged/status-less rooms never
  render). A failed lives read yields NO live cards and does not fail
  the feed (honestly absent, presence discipline L8).
- Card: happening-state ambient border + "Live now" pill (canon
  `--state-happening` tokens), host avatar + name from
  `host_display_name`/`host_handle`, place line from the room's own
  `place_label` / venue `display_name` / `name`. When the record
  carries no place, NO place line renders - the legacy mapper's
  "Somewhere nearby" filler was deliberately NOT carried into C2
  (an invented place is a FALSE). "Your live" marks `mine` rooms.
- Position: live cards lead the feed (max 3) - true only inside
  their window.
- NAMED GAP (not painted): the Watch action routes through the
  existing `feedAction(id, "watch:<roomId>")` event, and the C2
  shell's HomeRoute currently no-ops `feedAction` for ALL feed kinds
  (pre-existing). There is no live-room viewer surface in the C2
  shell yet; building one is a separate wave. The card, its truth,
  and its action seam are real; the tap outcome is the shell's
  existing seam, stated plainly rather than dressed up.

## 4. Ambient social system - elements WITH recorded reasons

Also exported in code as `C2Home.HOME_AMBIENT_ELEMENTS` (test-pinned:
every entry carries a reason). All treatments use ONLY canon
indicator tokens (`--orb-indicator-*` / `--state-*` / `--person-tint-*`)
at ambient intensity - the same tokens and meanings as plan cards,
chats, thread, calls, graphs (indicator persistence law, checked
against unifyChats.css section 6, which already carried the plan-card
treatments this wave extends to Home's own cards):

| Element | Reason (one sentence) |
|---|---|
| Plan card state border + fire line (per family) | Tells you the plan's state at a glance, in the same color and pattern as everywhere else in Opal, so alignment reads before words do. |
| Forming fire-line breath (5s, opacity only, pre-existing canon) | A forming plan is still taking shape; the slow breath marks anticipation - alive and waiting on one thing, not settled. |
| Live card happening border + soft dot pulse (2.4s, opacity only) | Someone is live at a place right now and the window is short; the pulse says the moment is happening, not scheduled. |
| Story ring (iridescent unseen; happening ring) | Shows whose story is new or happening before you read a name, so people come before chrome. |
| Memory no-image monogram (author initial in their entity tint over a CSS map motif: contour rings + pin dot) | When a post has no photo, the author's own tint and initial keep it recognisably theirs - a designed place treatment, never a caption in an image hole. |
| Activity badge count | Something changed since you last looked; the count is the signal, and it is absent when nothing is new (presence discipline). |

QUIET: the only motion loops on Home are the forming breath and the
live pulse - both slow, opacity-only, both off under
`prefers-reduced-motion` (the live pulse was added to the existing
reduced-motion block in c2shell.css). No other ambient motion added.

One-tap flows: tap a plan card -> its graph (`openGraph`, pre-existing
and unchanged); tap a story with media -> its viewer; live Watch ->
`feedAction` seam (gap named above). No flow was given a fake outcome.

## 5. State variety (composition fix)

`homeFromSession` previously composed `[...moments, ...plans].slice(0, 14)`:
a moment-heavy feed sliced plans off entirely, filtering Home into one
bucket. Now: lives (<=3) -> plans ordered by state rank
(happening, action, ready, forming, past; stable within family; cap
10) -> moments fill the rest (cap 14 total). Ordering only - a plan's
state family/label is never changed (test-pinned: families come back
exactly as the single derivation produced them). With the humanized
seed's varied states, Home now shows the variety: happening alive
(happening treatment + live cards), ready glowing (ready treatment),
forming as anticipation (violet dashed border + breath, pre-existing
canon in unifyChats.css section 6).

## 5b. Governing design standard - "Apple Design Brain" (founder, 2026-10-18 23:31 PDT)

How this surface's decisions answer to the standard - Opal's
identity, Apple's discipline, in the shipped code (no mockup-only
claims; every item below names the code that carries it):

- **Journey-first structure.** Home's journey is: arrive -> see your
  people (stories) -> see what is live and happening now -> see what
  needs you and what is ready -> catch up on moments -> one tap into
  the plan's graph. The W9 composition order (live, then plans by
  state rank, then moments) IS that journey order; the old
  moments-first slice broke it by letting the catch-up layer bury
  the alignment layer. (`shellData.homeFromSession`.)
- **Restraint.** Nothing was added that does not carry information:
  no new chrome, no new headings, no new badges, no new colors. The
  live card exists only while a life is true; the plan media well
  exists only when the record carries an image; the people row
  exists only when the record names a person. Absence is the
  default state of every new element (presence discipline is
  restraint enforced by data).
- **Hierarchy.** One order per card, person before content before
  action: byline (avatar + name) -> image -> caption as the single
  headline -> one action. On the live card the state (Live now
  pill) precedes the title, because the state is the reason the
  card leads the feed. The feed itself has one lead element at a
  time - the live card when live exists, otherwise the
  highest-ranked plan.
- **Typography as voice.** No new type sizes, weights, or faces were
  introduced. Every string renders in the existing C2 type tokens
  (`--type-headline` for the caption/title, `--type-callout` for
  lines, `--type-pill` for the live pill) - the same voice as the
  thread's YOUR MOVE card the founder held up as the quality
  standard in the 2026-10-19 pack review.
- **Nothing decorative without a job.** This is the ambient law the
  wave already enforced, restated in the standard's words: each
  ambient element in section 4 carries its one-sentence job, and
  the one purely textural element - the map motif inside the
  no-image monogram - has the narrowest job on the surface: it
  keeps a photo-less post recognisably a *placed, personal* post
  (author tint + initial + place motif) instead of an empty box,
  at 12-16% tint intensity. If the founder judges that texture
  decorative, it is one CSS block (`.c2s-media-monogram`
  background) and cuts without touching structure.
- **Every transition earned.** No new transitions were added. The
  only motion on the surface is state signalling that predates or
  answers this standard: the forming breath (a plan is still
  taking shape) and the live pulse (a window is open now) - both
  slow, opacity-only, QUIET-capped, and off under reduced motion.
  A transition that does not report a state does not ship.
- **End to end.** The journey terminates in real outcomes that
  exist today: plan card -> graph detail, story -> viewer, post ->
  read-back in the same feed it was published to (hunt-fix B-11).
  The one seam that does not yet terminate - Live Watch, whose
  viewer surface does not exist in the C2 shell - is named as a
  gap in section 3 rather than finished with a fake destination:
  a journey that pretends to complete is worse than one that
  honestly shows its last missing step.

## 6. Files changed

- `apps/opal_web/src/api/productClient.ts` - additive optional image
  fields on `OpalPlanContract` (+21).
- `apps/opal_web/src/c2/PlanCardC2.tsx` - `PlanCardMediaC2` /
  `PlanCardPersonC2` types; optional media + people rendering.
- `apps/opal_web/src/c2/c2.css` - plan media well + people row styles
  (tokens only).
- `apps/opal_web/src/c2/shell/projections.ts` - memory author avatar +
  provenance; live host/place/mine truth fields.
- `apps/opal_web/src/c2/shell/shellData.ts` - `planImageFromRecord`,
  `homeCardFromPlan`, `liveFeedFromRooms`, `HOME_FAMILY_RANK`
  composition, lives leg, moment provenance/avatar.
- `apps/opal_web/src/c2/shell/C2Home.tsx` - `HOME_AMBIENT_ELEMENTS`;
  memory card redesign; live card.
- `apps/opal_web/src/c2/shell/c2shell.css` - byline, monogram/map
  motif, live ambient + pulse, reduced-motion.
- `apps/opal_web/src/c2/shell/C2ShellReview.tsx` - review fixtures:
  record imagery, live truth fields, a no-photo memory (monogram
  proof), forming variety.
- `apps/opal_web/src/c2/shell/homeSocial.test.tsx` - NEW, 19 tests.

Backend: untouched.

## 7. Results (verbatim)

Targeted suites (homeSocial + huntFixShellData + c2ShellSurfaces + deckfix):

```
 Test Files  4 passed (4)
      Tests  49 passed (49)
```

Typecheck (`npm run typecheck`): exactly 9 errors, all pre-existing
(the OpalApp Tab errors x3, the base type's own duplicate
plan_type/online declarations x5, YouSettingsDestination handle x1) -
zero introduced by this wave.

Full web suite: PENDING-RERUN (filled in below on completion; target:
failing set exactly the baseline 23 failed / 16 files, passed count
1497 + 19 new = 1516).

## 8. Pack capture list (for the coordinator's served-build capture)

Review harness: `?review=c2shell&surface=home&mode=<dark|light>` -
the review home now carries, in one scroll:
1. **Live ON** - live card first: happening border, Live now pill,
   host avatar, "At Zilker Park Rooftop" (dark + light).
2. **Live OFF** - member path with an empty visible-lives read: no
   live card, no placeholder (projection-level proof in tests; capture
   from the served member build with no live rooms).
3. **State variety** - happening plan (with record image + people),
   ready plan, forming plan (violet anticipation treatment) in one
   feed (dark + light).
4. **Story row** - self cell + unseen (iridescent) + happening ring +
   seen cells; Maya's story carries real media (viewer proof).
5. **Imagery pair** - memory WITH photo (media_ref image in the well,
   caption once below) beside memory WITHOUT photo (monogram in the
   author's tint over the map motif; caption only as the title - the
   "Race night dinner" regression shot).

No screenshots are claimed by this wave: the subagent has no live
browser, so captures must be taken from the served build by the
coordinator per the rendered-proof skill. Nothing above is a
rendered-proof claim - it is the capture list the task required.
