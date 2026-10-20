# Repair #19 — W21-PACKFIX report

**Scope:** fix the pack's own rendered findings F1–F4, F6, F7 +
ABS-1 from `final-battery-report.md`, re-capture the affected pack
frames, re-push. F5 (in-call frames, environment gap) out of
scope. Gates held: FOUNDER_ACCEPTED = NO; no protected merges; no
walk link.

**Branch:** `muse/r19-packfix` (off `muse/repair-19` @ `3e230af0`),
one commit per item. **Merged** into `muse/repair-19` in
`wt-repair18` (`git merge --no-ff` per fix wave). **Final tip:**
`9a0a1be4ca892cb66957cab94156d154994e8a39`, tree
`832a3604e10fd0803f5b30750a56d1c983869e15`. **Pushed** via
`mirror_push2.py` (API method) as
`e1154696a583c46f84bc48b48a96984af598ce50`; the script asserted the
remote tree equals the local tip tree — **7,014 entries, verified**.

## Per-item fixes

### F1 — authenticated record imagery (commit `d08b2f05` + follow-throughs)
New `apps/opal_web/src/media/AuthedImage.tsx`: loads the record URL
with the session bearer (`loadBrowserAccessToken()`) ONLY for
API/same-origin URLs (cross-origin fetched anonymously), renders a
blob object URL, revokes on unmount/replace, passes `data:`/`blob:`
through, and reports any failure via `onError` so surfaces render
JA-12's designed fallback. No token in URLs; endpoint stays
bearer-gated. Wired into `PlanCardC2.tsx` (media well +
`PlanPersonFace`) and `C2Home.tsx` (MemoryFeedCard, `StoryCellFace`,
story viewer image branch) — the full sweep of record-media `<img>`
sites.
Follow-throughs, each found only at the rendered layer:
1. **Blob retype** — the media endpoint serves JPEG as
   `application/octet-stream` (verified magic bytes `ff d8 ff e0`
   JFIF on the live stack); octet-stream blobs don't decode as
   images, so `AuthedImage` sniffs the real type (response image/*
   else magic bytes) before constructing the Blob.
2. **CSP** — the served `img-src 'self' data:` blocked `blob:` URLs
   (index.html meta + `public/_headers`); `blob:` added, pinned by
   `cspBlobPin.test.ts`.
3. **Story viewer layout** — with a real photo loading, the
   viewer's flex-row well overflowed (img width:100% + caption as a
   row sibling); media now fills the well absolutely
   (`object-fit: cover`, well clips) and the caption overlays with
   token-compliant styling (A1 audit: no raw hex, no literal
   z-index — `--accent-1-ink` / `--layer-raised`).
**Proof (rendered):** capture probes on the served build — Home:
`images 10 / imagesLoaded 10` in BOTH modes (baseline pack: 0/10);
plan wells `data-media-state="photo"`, img `blob:` src,
`complete=true, naturalWidth=640`; story viewer IMG rect ==
well rect (12,81)–(378,832). Unit: `authedImage.test.tsx` (renders
on 200 blob, fallback on 401/error, revokes object URLs, sniffs
octet-stream JPEG).

### F2 — dark-mode primary buttons (`d6cbdaa7`, `a5d3a119`)
Root cause: cascade, not tokens. `styles.css`'s unlayered
`button { font: inherit; color: inherit }` reset outranks every
`@layer c2` rule regardless of specificity, so in dark mode the
shared primary classes (`.c2s-btn-primary`, `.c2-btn-primary`)
kept their light `--primary-fill` background while the label
inherited near-white. Fix: unlayered pairing rules setting
`background: var(--primary-fill); color: var(--primary-ink);
font: var(--type-callout)` for both shared classes, in
`c2shell.css` / `c2.css` respectively. Standing guard:
`src/theme/primaryButtonLegibility.test.ts` (7 tests) — the hazard
reset is on record, the dark pairing computes ≥ 4.5:1 in both
modes, and both shared classes carry the unlayered pairing.
Recaptured person-profile (Message) and share-card (Copy details)
frames show dark, legible labels on the light slab in dark mode.

### F3 — calls-log clipping at 390px (`f0851776`)
`PlanAwareness variant="call"` moved out of the flex-starved name
column to a full-width second line of `.c1-call-main`
(C1Surfaces.tsx); CallLog/PlanAwareness CSS enforces min-width: 0
and in-pill ellipsis so truncation happens only inside the pill,
with ellipsis. Pin: `f3CallLogBreadth.test.tsx` — real Chromium at
390×844 with a long name + Happening pill asserts the pill sits
inside the card and its text clips only within the pill's box.
Recaptured calls-log frames confirm.

### F4 — Center queue titles (`46337d4c`)
`.reveal-title` in RevealCard.css: single-line, nowrap, hidden
overflow, ellipsis. The battery's open empirical question is
resolved by the capture probe: DOM title text is the FULL
"Saturday morning at Oceanside Farmers Market" (clientWidth 342 <
scrollWidth 361, clipped with ellipsis) — stored strings are NOT
truncated; it was a pure CSS clip. Guard: `f4RevealTitle.test.ts`.

### F6 — orbits (`5ff7af7c`)
(a) `OrbitGroup.privateKnown` tri-state in `opalChatScope.ts`:
"Private" + locked renders ONLY when an explicit privacy boolean
exists on a contract anchor; scope-synthesized anchors (the rail's
first-settle state) are `unknown` and render the ordinary subtitle.
`CenterSessionList` exposes `data-private-known`. (b) The orbit
sheet discarded the privacy toggle's read-back and re-opened with
the stale caller anchor: `C1ShellHosts` now merges the sessions
read-back into the sheet anchor (`anchorWithOrbitReadBack`) and
updates the sheet optimistically on toggle success. Tests:
`f6OrbitPrivacy.test.tsx` (5). Recapture proves both: at first
settle the rail shows JE "Private" alongside truthful previews,
and the sheet pair shows "Make this orbit private" → "Make this
orbit not private" sticking after the click.

### F7 — flagless served build (`8b6ebd80`)
`main.tsx`: shell/mode setup (data-shell, data-mode stamping from
stored/system preference, preference listener) now runs
unconditionally; `public/c2-boot.js` rewritten unconditional.
`VITE_OPAL_SHELL` disposition: `isC2ShellEnabled()` still gates
legacy OpalApp splash branches (~OpalApp.tsx 7833–7920), but
OpalApp is unmounted on the served path — **the flag is dead as a
shell/mode gate**; nothing else was removed. Pin:
`f7ServedModePin.test.ts` (4) — boot evaluates flagless in jsdom
stamping the preference-correct mode in dark and light, and no
shell gate remains in the boot/main sources. Capture verified
the plain entry path (no query params): pre-paint stamps
dark `rgb(13, 11, 18)` / light `rgb(255, 254, 251)`, splash
settles to first-run normally.

### ABS-1 — proposal chip seeded (`f99d2f70` + contacts leg)
The seed world gains one Opal conversation, "A birthday gift for
Maya" (birth `:new`, unanchored), whose Opal reply is a REAL
stored OpalMessage carrying `metadata.context_snapshot.who =
"Maya Torres"` — the exact shape the production extraction
pipeline stamps before the proposal read derives a pending
anchor. The rendered leg needed one more honest seed fact: the
chip resolves the snapshot name against relationship contacts,
and the seed world had none (establishments otherwise come only
from the full invitation lifecycle — too invasive for a seed);
the seed now records Maya's explicit relationship type through
`Relationships.set_type/3`, the product's own upsert, which the
contacts union includes. Seed tests assert 7 conversations, 3
unanchored, the stored proposal shape, and the Maya contact.
Pack gains `orbit-proposal-chip-dark/light.png`: the seeded
conversation open, chip reading "About Maya Torres? Yes /
Choose different". Nothing is painted — the chip is the product's
own derivation over stored state.

## Floors (final tip `9a0a1be4`)

- Web suite: **23 failed / 16 files — exactly the baseline failing
  set** (activation, availability, c2ShellSurfaces initially
  tripped by the viewer caption's raw hex/literal z-index and
  fixed to tokens; final run clean against baseline), **1,713
  passed** (baseline 1,683 + 30 new W21 tests).
- Typecheck: **exactly 9** (unchanged pre-existing set).
- `npm run build`: green.
- Backend full suite: **3,220 tests, 0 failures** — run twice on
  the final code (one transient single-failure run in between
  passed on rerun and did not recur; seed changes made the full
  run mandatory). `mix format` clean on touched files. The app's
  `mix precommit` compile leg still fails on pre-existing warnings
  in files W21 did not touch (noted, not introduced).

## Recapture

Same W11 recipes/accounts shape, fresh review account, run tag
"with everyone after the market", served from the new tip.
**48 frames replaced** in `shots/repair19/pack-v2/` (full list in
`manifest.json` → `w21_recapture.replaced_files`), including NEW
`story-viewer-{dark,light}.png` and
`orbit-proposal-chip-{dark,light}.png`. Frames were captured
across the follow-through builds (79000ac / 584ad7e / d5e1d59);
the web diff from those to the final tip is confined to the story
viewer, and both story-viewer frames were re-shot on the final
build `9a0a1be4`. Settings, splash, in-call and dock frames were
not recaptured (untouched); splash settle + mode stamping were
re-verified by probe instead. Persisting gap, unchanged from
W11: `orbit-private-gate` frames could not be captured (the W11
capture path fails identically on the pre-W21 build — declared in
the W11 manifest; not an F6 regression).

## Docs updated

- `final-battery-report.md` — W21 addendum appended.
- `shots/repair19/WALK_ACCEPTANCE.md` — W21 header block; W5-02
  GREEN; W5-03 F3 resolved; W5-23 ABS-1 + F6 notes; BS-05 rendered
  leg fixed; JA-12 note resolved; §4 F-rows dispositioned; §5
  scorecard W21 row.
- `shots/repair19/pack-v2/manifest.json` — tip/pushed/tree/run
  tag updated; `w21_recapture` block; replaced-frame records
  swapped for the recapture records.
- `coordination/repair19/repair19-status.md` — created (heartbeat).

## FUNCTIONAL CHAIN — end-to-end accountability (founder directive 2026-10-19)

Per touched journey: UI action → API/contract → state transition
through the single gate → projection → rendered result → read-back
identical on every surface showing the object. All evidence is
from the SERVED build (the recapture stack, final tip `9a0a1be4`
unless a frame's own stamp says otherwise). The follow-up probe
artifacts live in `~/workspace/opal-graph/packfix-scratch/`
(`chain-probe.json`, `chain-probe2.mjs`,
`chain-rail-current-dark.png`).

### F1 — imagery (seed record → contract → authed fetch → pixels)

1. **Seed record:** real photos uploaded through the product media
   owner in the seed world (BS-05 legs) → media records addressed
   as `/api/v1/product/social-moments/media/<id>`.
2. **Contract:** `GET /opal/plans` → 200, carrying those media URLs
   for the plan cards (probe sample of 5 in `chain-probe.json`);
   `GET /stories` → 200, carrying `media_ref`
   `/api/v1/product/social-moments/media/b4a95cd0-73ff-4aa8-a094-bb6cf3961ebe`
   for Maya's story.
3. **The gate:** plain (unauthenticated) fetch of a plan media URL
   → **401**; the same URL with the session bearer → **200**,
   83,457 bytes, magic `ffd8ffe0` (JPEG), content-type
   `application/octet-stream; charset=utf-8` — the octet-stream
   typing is exactly why the blob-retype leg exists. Story ref:
   identical shape (401 → 200, 57,215 bytes, `ffd8ffe0`).
4. **Authed fetch in the UI:** `AuthedImage` sends the bearer only
   to API/same-origin URLs, renders a blob object URL, revokes on
   unmount/replace (`authedImage.test.tsx`: 200-blob render,
   401/error fallback, revocation, octet-stream sniffing).
5. **Rendered pixels, every wired well:** Home probe (pack
   manifest, both modes): **images 10 / imagesLoaded 10** (was
   0/10); plan wells `data-media-state="photo"` with `blob:` img,
   `complete=true, naturalWidth=640` (frames
   `home-{dark,light}.png`, `home-scrolled-{dark,light}.png`);
   story cells carry the same photos in the same frames
   (storyCells = 2); story viewer probe: IMG `blob:`, complete,
   nw 640, caption "Flower stall haul at the market this morning"
   — the same caption the `/stories` contract returns for that
   media record — and img rect == well rect (12,81)–(378,832)
   (frames `story-viewer-{dark,light}.png`, re-shot on the final
   build). Person faces are wired through the same component
   (`PlanPersonFace`); in this seed world participant records
   carry no face media, so monograms there are the honest render
   (photo path is unit-covered).
6. **Verdict:** chain intact end-to-end; no surface shows a
   divergent state for the same media record.

### F6 — make-private (sheet click → write → read-back everywhere)

1. **UI action:** orbit sheet toggle clicked during recapture —
   `orbit-sheet-{dark,light}.png` shows the brunch sheet with
   "Make this orbit private".
2. **Write through the gate:** the toggle calls W14's
   `POST /opal/conversations/orbit-private`; the F6b fix merges
   the sessions read-back into the sheet anchor and updates the
   sheet state on success.
3. **Read-back in the sheet (same session):**
   `orbit-sheet-private-{dark,light}.png` — the toggle now reads
   "Make this orbit not private". The state change is visible
   where the user made it.
4. **Persisted state (server read-back):** follow-up probe on the
   same served stack (`chain-probe.json`):
   `GET /opal/conversations?limit=50` → 200, "Brunch headcount"
   carries `anchor_private: true` — the write persisted through
   the backend gate, not merely in UI state.
5. **Read-back on every other surface:** rail / Center log on the
   final build (follow-up probe frame
   `packfix-scratch/chain-rail-current-dark.png`, stamp
   `seed - 9a0a1be`): group headers at first settle read
   "JE Jordan Ellis Private", "SB Sunday brunch at Herb & Wood
   Private", "MT Maya Torres Private" — the brunch group agrees
   with the API (link 4) and the sheet (link 3). Consistency
   side-effect, also verified: the now-locked brunch group no
   longer expands on header click (unlock-gate behavior), which
   is why the follow-up probe could not re-open its sheet —
   itself the locked state acting correctly.
6. **Evidence gap found and closed (not a product break):** the
   W11 recapture recipe never photographed the rail AFTER the
   toggle (its "log-after" frames come from a separate run), so
   during recapture the rail-agreement link rested on the unit
   tests (`f6OrbitPrivacy.test.tsx`) + the sheet pair. The
   follow-up probe in links 4–5 closes that link on the served
   build with named artifacts. The chain itself holds.

### F6 — rail subtitles (privacy fact → projection → label)

1. **Fact:** anchor contracts carry the privacy boolean — API
   read-back (`chain-probe.json`): JE anchor private (seed),
   Maya scoped anchor private (seed), brunch anchor private
   (post-toggle, above).
2. **Projection:** `OrbitGroup.privateKnown` tri-state — an
   explicit contract boolean yields known/locked; a
   scope-synthesized anchor yields unknown and can never assert
   "Private" (`f6OrbitPrivacy.test.tsx`).
3. **First frame:** recapture first-settle frames
   `center-orbits-log-{dark,light}.png` — JE "Private" (fact
   present in the first payload), brunch + Maya ordinary preview
   subtitles (their facts not yet on the synthesized anchors).
   No frame asserts a privacy state the contract does not carry.
4. **Settled frame:** `chain-rail-current-dark.png` — with the
   facts on the contracts, all three labels read "Private",
   matching the API read-back exactly.
5. **Verdict:** labels truthful at first frame and settled frame;
   the pre-W21 all-"Private" first frame cannot recur.

### F2 / F3 / F4 — rendered-layer chains (measured proofs stand)

- **F2:** token pairing at the shared classes → computed
  label/fill contrast ≥ 4.5:1 in BOTH modes for BOTH classes
  (`primaryButtonLegibility.test.ts`, hazard reset on record) →
  rendered: `person-profile-dark.png` ("Message") and
  `share-card-dark.png` ("Copy details") show dark, legible
  labels on the light slab.
- **F3:** row-layout change → real-Chromium 390×844 measurement
  (`f3CallLogBreadth.test.tsx`: pill inside the card, text clips
  only inside the pill) → rendered: `calls-log-{dark,light}.png`
  and the `calls-log-after-callback-{dark,light}.png` pair.
- **F4:** CSS ellipsis → served-build DOM probe (full stored
  title "Saturday morning at Oceanside Farmers Market",
  clientWidth 342 < scrollWidth 361, computed
  nowrap/hidden/ellipsis) → rendered `center-deck-{dark,light}.png`
  + `center-deck-lit-reveal-{dark,light}.png`; guard
  `f4RevealTitle.test.ts`.

### F7 — mode stamping (preference → boot → first paint)

Stored/system preference → unconditional boot stamp → served
probe on the plain entry path (no params, no flag): pre-paint
`data-mode` dark with ground `rgb(13, 11, 18)` / light with
`rgb(255, 254, 251)`, `data-shell=c2`, splash settles to
first-run. Pin: `f7ServedModePin.test.ts`.

### ABS-1 — proposal chip (stored state → derivation → render)

Seed stores a real OpalMessage whose `context_snapshot.who`
names Maya Torres + Maya's explicit relationship type via
`Relationships.set_type` → the product's own proposal derivation
resolves the name against contacts → rendered chip probe (pack
manifest, both modes): "About Maya Torres?YesChoose different" →
frames `orbit-proposal-chip-{dark,light}.png`. Remove the stored
reply and the chip honestly disappears; nothing is painted.

**Chain rulings:** no breaks found in any touched journey. One
evidence gap (post-toggle rail frame absent from the recapture
recipe) was found during this assembly and closed with the
follow-up probe named above; it is an evidence note, not a
product finding.

## CORRECTION — backend suite record (post-handoff verification)

A late process delivery for the mid-wave full run
(`packfix-scratch/logs/backend-full3.log`) showed **3,220 tests,
48 failures**, contradicting the "0 failures" noted for it during
the session. Verified against the on-disk logs and corrected
here so the record W22 assembles from is exact:

- `backend-full-final.log` — **3,220/0** on the final backend code.
- `backend-full-confirm.log` — **3,220/0**, a confirming full run
  executed after this correction began, uncontended, on the same
  final backend tree (wt-r19-packfix tip; last backend commit =
  the format reflow). The floor stands on these two runs.
- `backend-full3.log` — 3,220/48, **root-caused as an environment
  artifact of this wave's own making, not a code failure:** all 48
  failures are `UndefinedFunctionError … module … is not
  available`. That run shared `MIX_BUILD_PATH=/tmp/opal_build_packfix`
  with the dev server being restarted/recompiled from the other
  worktree in the same minutes; the two compiles raced on one
  build directory and the test VM loaded a partially-written
  beam set. Identical backend code passes cleanly before and
  after (above). Excluded from the floor evidence with cause.
- One earlier 3,220/1 run (single unidentified failure) passed on
  rerun and did not recur in any subsequent run.

No other statement in this report is affected: the shipped tip,
push verification, web/typecheck/build floors, and all rendered
evidence were verified independently of that run.

## CORRECTION — pushed-commit record (post-handoff verification)

The pushed mirror commit and entry count recorded at handoff
(`540a3a1d…`, 7,012) were mis-transcribed from an earlier wave
push's delivery. Verified directly against the GitHub API after
the fact: remote ref `muse/repair-19` →
**`e1154696a583c46f84bc48b48a96984af598ce50`**, whose tree is
**`832a3604e10fd0803f5b30750a56d1c983869e15`** — byte-identical
to the local tip `9a0a1be4`'s tree (tree-SHA equality; blob count
7,014 on both sides via `git ls-tree -r` and the recursive tree
API). The shipped content was always exactly the local tip; only
the recorded mirror SHA/count were wrong. All documents carrying
the wrong values (this report, the battery addendum,
WALK_ACCEPTANCE, repair19-status, pack manifest) have been
corrected to `e1154696…` / 7,014.
