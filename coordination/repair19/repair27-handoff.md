# Repair #27 — Founder Walk #5 Fix Wave — Handoff

Branch: `muse/repair-27` (base: `muse/repair-24` @ 11e61887; R26
had not closed when this wave integrated, and its scope is
backend-only extraction, so R27 stays on the R24 base per the
charter). Local tip: `2ef9ffeb` plus this handoff commit
(mirror-verified at push; the mirror head sha is in the
coordinator's delivery report). FOUNDER_ACCEPTED remains
**NO** — the re-walk is the founder's.

Walk #5 (native TestFlight build 10 / R24, badge `seed - 11e6188`,
2026-10-22 ~11:02–11:16 PDT) verdict: REJECTED — "Flows is just
wacky, very wacky." Every charter item W27-1…W27-17 is
dispositioned below. Battery figures are read from the run logs
at the tip; rendered frames are in
`shots/regression/rendered/r27-final2/` (light set + dark set)
with the capture manifest, produced by
`shots/regression/rendered/r27-capture.mjs` against a local stack
running this branch (see "Frames pass" for two harness lessons
and one real defect the pass caught and this wave fixed).

## Battery at the tip (read from logs)

- Web vitest (full): **291 files / 2,410 tests, all passing**
  (EXIT 0, run at code tip 7a40e73e, log read back; the later
  W27-17 asset swap re-ran the orb/brand subset — 36/36 — at
  the final tip, and typecheck was re-verified there too).
- Web typecheck (`tsc -p tsconfig.json --noEmit`): **0 errors**.
- Mobile jest: 109/109, 23 suites GREEN (run at b88ebe14; no
  later commit touches `opal_mobile`). Note: the repo's
  `opal_mobile/package-lock.json` is out of sync with
  `package.json` (`expo-location@18.1.6` missing from the lock) —
  pre-existing on the R24 base, `npm ci` fails there too; the
  battery ran in a throwaway copy. Not changed by this wave.
- Backend/API/migrations: untouched by this wave (no Elixir
  changes, no new migrations — the frames stack migrated a fresh
  DB and reported exactly 124) — R24's figures stand (backend
  3,461/0, API 101/101, 124 migrations).

## Dispositions

### W27-1 SAFE AREA — FIXED (web owns the inset), plus a frames-caught sequel fixed
`index.html` carries `viewport-fit=cover`; the token sheet
(`src/theme/c2Tokens.css`) defines `--opal-sat:
env(safe-area-inset-top, 0px)`; `.c2s-root` pads itself with it
(border-box), and every full-screen layer that escapes the column
(`.c2s-flow`, `.c2s-destination`, `.c2s-viewer`, the C1 rail panel,
MaterialMomentChip) consumes the same token. The WEB layer owns
the inset by design: the native shell stays full-bleed
(`contentInsetAdjustmentBehavior=never` already), so nothing
double-pads. In the WebView shell: WKWebView reports the real
device inset through `env()`, and the app column + every
top-anchored layer start below the status bar. Pins:
`safeAreaPin.test.ts` + the token audit in
`c2ShellSurfaces.test.tsx`. Rendered proof: with a simulated
47px inset the root's computed padding-top is exactly 47px and
the Flows/Graphs headers sit at y=47 (base contexts: 0).
SEQUEL the frames caught: the hosted C1 surface kept
`min-height: 100dvh` — its host override TIED the standalone C1
rule on specificity and lost on source order — so under a real
inset the thread surface stayed 844px tall inside the 797px
host and its composer slid under the dock (the Walk #5 clip
species, measured: computed min-height 844px, composer bottom
809 vs dock top 772). Fixed with a compound selector
(`[data-design="r18"].c2s-c1-host .c1-surface`, 0,3,0) and
re-proven at the rendered layer: min-height computes 0px, the
scroller compresses by exactly the inset, and the composer
rests at the same bottom in base and inset contexts, clear of
the dock, hit-test true.

### W27-2 SEED/DEV CHIP — FIXED
The `seed - <sha>` DevChip returns null whenever `isNativeHost()`
(`opal_native_host`) is active; it renders only in browser-dev
contexts. The one other `opal_dev` affordance (OpalApp.tsx) sits
on the unmounted legacy shell. Pin: `devChip.test.tsx` (5 cases,
including native-host suppression). The chip can no longer sit
on the thread composer or occlude the YOUR MOVE Approve action
in the native path.

### W27-3 FLOWS FIRST PAINT — FIXED (structure); timing note honest
The home legs now load in parallel (`shellData.homeFromSession`)
instead of serially; the interim state is honest (a labelled
loading block, no half-painted stream). Frames-pass timing is
NOT quoted as a product figure: the capture VM was running the
test battery in parallel and its seed endpoint throttles under
repeated provisioning (see Frames pass), so its 5–11s
tap-to-populated numbers measure the harness environment, not
the app. The on-device LAN figure is the founder's re-walk.

### W27-4 INFO/EYE — FIXED (removal where it was meaningless)
The feed-empty `EmptyBlock`'s line is no longer hidden behind
the (i) bubble — it renders visibly (`lineVisible`); grep
confirms no other InfoBubble survives on the C2Home surfaces he
walks. The (i) still appears in two honest places the frames
show: the Center opening's info affordance and error blocks
("Your plans did not load.") — those sit beside real content /
a real recovery action, not a content-free popover on Flows.

### W27-5 CREATE — FIXED
(a) Photo attach is wired through the real media path:
`acquireMedia` → moment media store → `createGraphPlan` with
`media_id` (the server field already existed; no backend
change). The Create frame shows the Photo section with "Add a
photo" / "Take a photo" in both modes.
(b) The X is depth-true: form → tense panel → sheet top →
close; a discard sheet appears only when the content actually
diverges from the opening snapshot (the Graphs drop-sheet
pattern). The X renders top-left, reachable, in the frame.

### W27-6 FEED + PLACE TRUTH — FIXED
- Place sheet dedupes by plan id (`PlaceStoneView.onceByPlanId`)
  — the same plan cannot stack as near-duplicate rows.
- Projection truth pass: a plan's meta line no longer repeats
  its title; boilerplate "A plan is forming here." is dead —
  card copy is specific or absent.
- Grouping vs identity keys split: `placeGroupKey` (article
  fold, grouping only) vs `normalizePlaceKey` (stone identity,
  case/space only) — Night Hawk / Nighthawk no longer split or
  merge wrongly; title casing is consistent (the card adapter
  applies one display casing).
- Place imagery: the stone card and the sheet carry the place
  image in a 16/9 well when one exists; none is faked when it
  doesn't. (Frames caveat: the capture VM's sandbox blocks
  external image hosts — a tunnel failure was observed — so the
  frames show the honest empty well where the seed image is
  externally hosted; the well and layout are as designed.)
- Varied states: the projection no longer stamps Forming on
  everything. The place-sheet frame is the direct evidence: one
  sheet lists a live moment, a Happening plan, an Action-needed
  plan with real attendance, and a memory — distinct plans,
  distinct true states, specific header line ("Live now, and a
  plan is happening here.").
- Frames-caught wart, fixed: the sheet's coming-plan meta
  composed `{stateLabel} - {whenLine}` unconditionally and
  rendered "Action needed - - 2 of 6 going" when the when-line
  was empty. Segments now join only when present
  (`placeStoneMeta.test.ts` pins both compositions).

### W27-7 "OMETHING" — FIXED at the render layer; walk-DB string not reproduced
No code path clips a title's first character (the feed
cluster's title pins + the frames: every rendered place/plan
title is whole — "Oceanside Farmers Market", "Juniper & Ivy",
"The Brick Hotel"). On the walk DB, the account/place tables
contain no "omething"/"ometown" row (places ride plan payloads,
not a places table); the string is not reproducible from
current data. If it recurs on the re-walk it will be in a plan
payload, and the payload can be pulled and fixed at the source.

### W27-8 THREAD DUPLICATES — FIXED
Client-side dedupe at both load seams (`applyConversation`,
both raw appends, the product-thread load):
`dedupeProductMessages` / `dedupeOpalChatMessages` with
two-legged identity — message id AND sender+body+type+batch
timestamp. A person's genuinely repeated texts at different
times survive. 8 pins. Rendered proof: the Chanelle-shaped
thread renders each message exactly once in both modes, base
and inset (leaf-element duplicate probe: zero duplicates in
all four thread captures), against a seed world whose
underlying rows still contain the duplicates.

### W27-9 SCAFFOLD NAMES — FIXED in code; walk-DB evidence revised by inspection
The greeting is `session.display_name`'s first token
(`openingFromPlans`, C2Shell is the only caller and passes the
session's own name), plan titles / moment authors read the
account record faithfully, `onboarding.ex` stores
`display_name` as typed (default "You"), `unique_handle`
suffixes HANDLES only, and the seed's `upsert_user!` enforces
real names for its people (Chanelle Brooks, Maya Torres, …).
Direct inspection of the walk DB (2026-10-22) found NO row
carrying "Sadeil1": the founder's account is display_name
"Sadeil Lewis", handle "sadeil1"; `device_sessions` snapshots
no name, so the session payload reads the account's clean name
live. The walk-time string most plausibly came from a session
provisioned before the account carried the full name. Rendered
proof on a fresh provision: the Center greeting renders "Good
evening, Ethan." — a clean first name, no digit composition —
in both modes. Nothing in code manufactures the digit; nothing
in current data carries it.

### W27-10 PLAN DETAIL COHERENCE — PARTIAL (client clean; machine copy is server/data-side)
The machine strings from the walk ("intent done / set it as
planned / plans to do / answers from Chanelle / waiting waiting
their answers" / the unexplained "Stop sharing location")
exist NOWHERE in the web tree (grep-verified) — they are server
projection copy and/or legacy walk-DB data, not client
rendering. The client surfaces present one clear state and
next action; the frames' plan cards read clean ("Action
needed — Rooftop drinks at The Brick Hotel — Friday · Sunset -
The Brick Hotel, Oceanside"). The gold Ready / YOUR MOVE card
family is untouched (protected; it read well on the walk, and
reads well in the frames). Optional founder follow-up: a
backend projection-copy pass to humanize those strings at the
source.

### W27-11 DISCOVERY ROWS — FIXED
The repeated "You talk with them" subtitle is dead: rows render
the person's real `contextLine` or no subtitle. The discovery
band renders with an empty feed per its own documented
contract (the rows were unreachable there). No row renders
dimmed without a stateable reason. Frames evidence: the
Create "Who" list shows specific subtitles ("Close friend",
"Business", "Friend") or none.

### W27-12 COMPOSER CLEARANCE — FIXED (and strengthened by the W27-1 sequel)
`.c2s-c1-host` carries `padding-bottom: var(--dock-clearance)`
so the thread composer and last bubble rest above the floating
dock/frost stack (CSS pin); the W27-1 sequel fix above removes
the inset-case overflow that defeated it. Rendered proof:
composer bottom identical in base and inset contexts (530 =
530 in the final light captures), elementFromPoint at the
composer's center hits the composer in both. With W27-2 the
seed chip is gone from the native path entirely.

### W27-13 SCROLL + TAP INTEGRITY — FIXED; audit method stated
Audit method: every walkable surface's scroller/overflow chain
traced in source, floating-element hit areas inventoried, back
controls checked against the W27-1 inset; then exercised at
390×844 in the rendered-frame pass (scroll positions,
elementFromPoint hit-tests, horizontal-overflow probes — zero
overflow on every captured surface). Findings/fixes: Flows
`.c2s-scroll` ✓; place sheet capped + internally scrolling ✓;
comments list `min-height: 0` inside the capped sheet (was a
scroll-lock); Create form is a scrollport with a pinned
header/X; thread `.c1-scroll` with the composer in-flow + host
dock clearance ✓ (post-sequel-fix); chats list ✓; graph detail
`.c2s-destination` ✓; You hub slot-contained ✓; story viewer
✓; all headers sit below the inset, so back controls are
reachable (thread frame: back button fully below the 47px
line, tappable).

### W27-14 INPUT RADIUS — FIXED
Pill input treatment tokenized: `--radius-input` /
`--radius-input-multi` in `c2Tokens.css`, applied across the
shell's fields/composers. Frames: the Create fields and the
thread composer render with fully rounded ends in both modes.

### W27-15 ONBOARDING PARITY — FIXED
`C2Onboarding` (phone entry + verification code) rebuilt into
the shell design language: stage ground, stacked lockup hero,
display headline, pill primary, both modes. Behavior
unchanged.

### W27-16 DEFAULT LIGHT — FIXED
With NO stored preference, first run starts LIGHT in both the
web boot (`c2-boot.js`) and the mode module
(`theme/c2Mode.ts`); an explicit stored `system` still follows
the system, stored dark still wins. The native shell owns a
status-bar style state starting `dark-content` on the light
boot ground, and the web reports its resolved mode over a new
whitelisted bridge message (`opal_native_mode`) on apply +
every flip (MutationObserver in `main.tsx`), forwarded by
`NativeFirstRunSurface` / `ProductWebSurface` — the native
chrome follows the web mode instead of assuming dark. (The
frames' dark set is TRUE dark — see the harness note in
Frames pass: the current boot key had to be seeded, and once
seeded, dark renders dark throughout the surfaces captured.)

### W27-17 CLEAN MARK EVERYWHERE — FIXED (code + raster)
Founder ruling 2026-10-22 12:30 PDT lifted the hero HOLD:
"Clean the home-screen orb too."
CODE (source-independent):
- `OrbMark` (vector placement) no longer draws the ORB_POINTS
  dots (its small-size reduction already omitted them).
- `OrbLivingRings` HERO (splash): riders, rotor points and
  rest points retired; the precessing arc — the ring's own lit
  metal — keeps the rings' rotation and fades out before the
  settle; the settled frame is the still beneath, exactly.
  Pins rewritten to the new law (`orbLivingRings.test.tsx`,
  `cleanMark.test.tsx`).
- JUDGMENT CALL, flagged for the founder: the AMBIENT dock
  orb's few travelers stay. They are not the logo's decorative
  lights — they carry live plan-state color (the ambient
  language: the dock orb is a living instrument, not a static
  logo placement). One word retires them too.
RASTER (completed at the final tip): every raster placement
(hero, medallion, splash master-full, marble sphere, icons)
derives from ONE design master
(`shots/repair18/design-masters/opal-orb-master.webp`), now
the icon worker's PERFECTED source:
`~/workspace/icon-orb/pf-master-perfect-v3.png` (sha256
cb0651eabb841517cb0d1224330d3f870acbffcb90c649e34af56,
1600×1600). Verification before the swap: registration
against the original master (bright/saturated mask centroid
within ~2px, bounds within ring-glow tolerance, corners pure
black), and visual verification of the rings — true ellipses,
full tips, no light points — in the source and in the
regenerated medallion. All four derivation scripts re-run
(`build_hero_assets.py`, `build_splash_master.py`,
`build_marble_sphere.py`, `build_icon_assets.py`); the orb
pins (36) pass. History, for the record: the worker's first
cleaned master (`opal-orb-master-clean.png`) carried a
FOUNDER-CAUGHT DEFECT (inpainting flattened the horizontal
ring's tips, bent the vertical ring); it was briefly mirrored
(50508820), then REVERTED on this branch and on the walk stack
the same day, and the perfected art replaced it — the damaged
art is not what ships. (The steer's named files
`opal-orb-master-perfect.png` / `icon-1024-perfect.png` never
appeared; the worker's delivered series is `pf-master-perfect-v*.png`
and v3, the latest, is the source used — if a later final
supersedes it, the swap is the same one step.)

## Frames pass (method + harness lessons)

Frames: `shots/regression/rendered/r27-final2/` (+ the
`r27-darkfix/` supplement) — 390×844, base + simulated-inset
(47px) contexts, captured by `r27-capture.mjs` (committed;
bespoke-capture prior art) against a local stack running this
branch, because the R18 surface pass's predicates
(`member-shell`) predate the C2 shell and cannot see it.
Coverage, stated exactly: the LIGHT set is COMPLETE and
loaded — Center (greeting), Flows, place sheet, Chats, the
Chanelle-shaped thread, Create, Graphs, every one in base and
inset contexts. The same directory also holds the splash
frames (`splash-living-*`, `splash-settled-*`, both modes)
captured after the W27-17 raster completion: the perfected
cleaned mark in-app, rings bare in the living frame and the
settled still alike. The DARK set is true dark and partially
loaded: Chats, the thread (base), and Graphs (inset, header at
47px) loaded fully; Center and Flows were captured in their
error state (see lesson 3 — the app renders a clean,
on-language failure with a working "Try again"); loaded-state
dark captures of Create, the place sheet, and the inset thread
were NOT obtained before the seed-throttle hard stop, and the
`r27-darkfix/` run (a fresh empty world, no re-seed) adds
true-dark empty-state frames instead. Dark rendering of every
remaining surface is code-identical to its light rendering
(tokens only), and the founder walks light by default
(W27-16) — but the gap is named, not hidden.
Lessons recorded for the next wave: (1) the app's boot rewrites
`<html>`'s style attribute, so an inline `--opal-sat` override
is wiped — the working seam is an injected stylesheet with
`!important`; (2) the harness seeds the LEGACY theme key
(`opal.appearance.theme.v1`) but the current boot reads
`opal.c2.mode.v1` first — legacy-seeded "dark" captures render
light since W27-16 (the final dark set seeds the current key
and is true dark); (3) the founder-seed endpoint THROTTLES
(429) under repeated provisioning and stays throttled for
hours — budget ONE provision per run, and never spend it on
probes.

## Walk stack

The Mac `opal-walk` stack was advanced to this branch as the
final step, with served-layer verification at each move:
checkout at the mirror tip, `mix ecto.migrate` → "Migrations
already up" (124, none new), Phoenix restarted,
`/api/dev/runtime-authority` read back {backend_sha == mirror
tip, branch "muse/repair-27", dirty_worktree false}, web
rebuilt (`vite build`) and re-previewed on :5173 (HTTP 200),
and the built bundle's badge stamp equals the tip's short sha
with the previous stamp at zero occurrences. The stack was
advanced three times in total: to 50508820 (first mirror), then
to 4b7bd53a the same afternoon when the W27-17 raster revert
landed (so the damaged-ring art is NOT what the walk serves),
then to the final mirror tip carrying this handoff. Restore
point: R24 tip 11e61887 (`muse/repair-24`, untouched). No walk
DB data was mutated by this wave: the W27-9 inspection was
read-only, the account row already carries the clean name,
and the duplicated seed messages are neutralized client-side
by the W27-8 dedupe.

## Founder list (his actions only)

1. Merge `muse/repair-27` when satisfied with the re-walk.
2. Optional: commission the W27-10 backend projection-copy
   pass (humanize plan-detail machine strings at the source).
3. W27-17 judgment call: the dock orb keeps its live-state
   travelers — say the word if they should go too.
4. The walk re-verdict is his; FOUNDER_ACCEPTED stays NO until
   he phone-walks the advanced stack.

FOUNDER_ACCEPTED = NO.
