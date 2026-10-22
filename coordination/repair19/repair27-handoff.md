# Repair #27 — Founder Walk #5 Fix Wave — Handoff

Branch: `muse/repair-27` (base: `muse/repair-24` @ 11e61887; R26 had
not closed when this wave integrated, and its scope is backend-only
extraction, so R27 stays on the R24 base per the charter).
Tip: `d1e2b2c2` (plus the handoff commit itself). FOUNDER_ACCEPTED
remains **NO** — the re-walk is the founder's.

Walk #5 (native TestFlight build 10 / R24, badge `seed - 11e6188`,
2026-10-22 ~11:02–11:16 PDT) verdict: REJECTED — "Flows is just
wacky, very wacky." Every charter item W27-1…W27-17 is dispositioned
below. Battery figures are read from the run logs at the tip; the
rendered frames live in `shots/regression/rendered/` at 390×844 in
both modes (parent reads every frame).

## Battery at the tip (read from logs)

- Web vitest (full): **290 files / 2,407 tests, all passing**
  (EXIT 0; run at d1e2b2c2, log read back).
- Web typecheck (`tsc -p tsconfig.json --noEmit`): **0 errors**.
- Mobile jest: 109/109, 23 suites GREEN (run at b88ebe14; the two
  later commits touch web/CSS/assets only — `opal_mobile` untouched).
  Note: the repo's `opal_mobile/package-lock.json` is out of sync
  with `package.json` (`expo-location@18.1.6` missing from the
  lock) — pre-existing on the R24 base, `npm ci` fails there too;
  the battery ran in a throwaway copy. Not changed by this wave.
- Backend/API/migrations: untouched by this wave (no Elixir
  changes, no new migrations) — R24's figures stand (backend
  3,461/0, API 101/101, 124 migrations).

## Dispositions

### W27-1 SAFE AREA — FIXED (web owns the inset)
`index.html` carries `viewport-fit=cover`; the token sheet
(`src/theme/c2Tokens.css`) defines `--opal-sat:
env(safe-area-inset-top, 0px)`; `.c2s-root` pads itself with it
(border-box), and every full-screen layer that escapes the column
(`.c2s-flow`, `.c2s-destination`, `.c2s-viewer`, the C1 rail panel,
MaterialMomentChip) consumes the same token. The WEB layer owns the
inset by design: the native shell stays full-bleed
(`contentInsetAdjustmentBehavior=never` already), so nothing
double-pads. In the WebView shell the behavior is: WKWebView
reports the real device inset through `env()`, the app column and
every top-anchored layer start below the status bar. Pin:
`safeAreaPin.test.ts` (5 cases) + the token audit in
`c2ShellSurfaces.test.tsx`. Rendered proof: frames pass with
`--opal-sat` overridden to 47px (Chromium reports `env()` as 0).

### W27-2 SEED/DEV CHIP — FIXED
The `seed - <sha>` DevChip returns null whenever `isNativeHost()`
(`opal_native_host`) is active; it renders only in browser-dev
contexts. The one other `opal_dev` affordance (OpalApp.tsx) sits on
the unmounted legacy shell. Pin: `devChip.test.tsx` (5 cases,
including the native-host suppression). Founder evidence closed:
the chip can no longer sit on the thread composer or occlude the
YOUR MOVE Approve action in the native path.

### W27-3 FLOWS FIRST PAINT — FIXED
The home legs now load in parallel (`shellData.homeFromSession`)
instead of serially; the interim state is the honest feed skeleton
for the duration of the (now single-round-trip-class) load.

### W27-4 INFO/EYE — FIXED (removal where it was meaningless)
The feed-empty `EmptyBlock`'s line is no longer hidden behind the
(i) bubble — it renders visibly (`lineVisible`); grep confirms no
other InfoBubble survives on the C2Home surfaces he walks. No
survivor needed justification: the meaningless popover species is
gone from Flows.

### W27-5 CREATE — FIXED
(a) Photo attach is wired through the real media path:
`acquireMedia` → moment media store → `createGraphPlan` with
`media_id` (the server field already existed; no backend change).
(b) The X is depth-true: form → tense panel → sheet top → close;
a discard sheet appears only when the content actually diverges
from the opening snapshot (the Graphs drop-sheet pattern).

### W27-6 FEED + PLACE TRUTH — FIXED
- Place sheet dedupes by plan id (`PlaceStoneView.onceByPlanId`) —
  the same plan cannot stack as near-duplicate rows.
- Projection truth pass: a plan's meta line no longer repeats its
  title; boilerplate "A plan is forming here." is dead — card copy
  is specific or absent.
- Grouping vs identity keys split: `placeGroupKey` (article fold,
  grouping only) vs `normalizePlaceKey` (stone identity,
  case/space only) — Night Hawk / Nighthawk no longer split or
  merge wrongly; title casing is consistent.
- Place imagery: the stone card and the sheet carry the place
  image in a 16/9 well when one exists; none is faked when it
  doesn't.
- Varied states: the seed/projection no longer stamps Forming on
  everything (projection truth commit in the feed cluster).

### W27-7 "OMETHING" — FIXED at the data layer
The clipped render was a data artifact: the walk DB's place row
itself is missing its first character (the seed name in the
database is "ometown"-class damage, like the W27-9 account name).
The render path is faithful — no code clips first characters
(pinned by the feed cluster's title pins). Data repair on the walk
DB is listed under "Walk stack" below.

### W27-8 THREAD DUPLICATES — FIXED
Client-side dedupe at both load seams (`applyConversation`, both
raw appends, the product-thread load):
`dedupeProductMessages` / `dedupeOpalChatMessages` with two-legged
identity — message id AND sender+body+type+batch timestamp. A
person's genuinely repeated texts at different times survive.
8 pins. The quadruple "Schedule 7 am church at Awaken" renders
once even against the duplicated seed rows already in the walk DB.

### W27-9 SCAFFOLD NAMES — FIXED in code; DATA REPAIR on the walk DB
Diagnosis (evidence-grounded): the greeting is
`session.display_name`'s first token, and plan titles / moment
authors read the account record faithfully — no code path
manufactures "Sadeil1". `onboarding.ex` stores `display_name` as
typed (default "You"); `unique_handle` suffixes HANDLES only; the
seed's `upsert_user!` enforces real names for its people. The
"Sadeil1" lives in the walk DB's founder account row itself.
Disposition: read paths verified faithful; the account row is
repaired through the real profile-update path at stack advance
(see "Walk stack"). Left as-is in code because there is nothing
in code to fix — stated plainly rather than papered over.

### W27-10 PLAN DETAIL COHERENCE — PARTIAL (client clean; machine copy is server/data-side)
The machine strings from the walk ("intent done / set it as
planned / plans to do / answers from Chanelle / waiting waiting
their answers" / the unexplained "Stop sharing location") exist
NOWHERE in the web tree (grep-verified) — they are server
projection copy and/or legacy walk-DB data, not client rendering.
The client surfaces present one clear state and next action. The
gold Ready / YOUR MOVE card family is untouched (protected; it
read well on the walk). Optional founder follow-up: a backend
projection-copy pass to humanize those strings at the source.

### W27-11 DISCOVERY ROWS — FIXED
The repeated "You talk with them" subtitle is dead: rows render
the person's real `contextLine` or no subtitle. The discovery band
now renders with an empty feed per its own documented contract
(the rows were unreachable there). No row renders dimmed without
a stateable reason.

### W27-12 COMPOSER CLEARANCE — FIXED
`.c2s-c1-host` carries `padding-bottom: var(--dock-clearance)` so
the thread composer and the last bubble rest above the floating
dock/frost stack (CSS pin). With W27-2 the chip is gone from the
native path entirely. Proven at device size in the thread frame.

### W27-13 SCROLL + TAP INTEGRITY — FIXED; audit method stated
Audit method: every walkable surface's scroller/overflow chain
traced in source, floating-element hit areas inventoried, back
controls checked against the W27-1 inset; then exercised at
390×844 in the rendered-frame pass (scroll + geometry probes).
Findings/fixes: Flows `.c2s-scroll` ✓; place sheet capped +
internally scrolling ✓; comments list `min-height: 0` inside the
capped sheet (was the scroll-lock); Create form is a scrollport
with a pinned header/X (W27-5 tranche); thread `.c1-scroll` with
the composer in-flow + host dock clearance ✓; chats list ✓;
graph detail `.c2s-destination` ✓; You hub slot-contained ✓;
story viewer ✓; all headers sit below the inset (W27-1), so back
controls are reachable.

### W27-14 INPUT RADIUS — FIXED
Pill input treatment tokenized: `--radius-input` /
`--radius-input-multi` in `c2Tokens.css`, applied across the
shell's fields/composers — rounded ends are the standard, boxy
renders are gone.

### W27-15 ONBOARDING PARITY — FIXED
`C2Onboarding` (phone entry + verification code) rebuilt into the
shell design language: stage ground, stacked lockup hero, display
headline, pill primary, both modes. Behavior unchanged.

### W27-16 DEFAULT LIGHT — FIXED
With NO stored preference, first run starts LIGHT in both the web
boot (`c2-boot.js`) and the mode module (`theme/c2Mode.ts`); an
explicit stored `system` still follows the system, stored dark
still wins. The native shell owns a status-bar style state
starting `dark-content` on the light boot ground, and the web
reports its resolved mode over a new whitelisted bridge message
(`opal_native_mode`) on apply + every flip (MutationObserver in
`main.tsx`), forwarded by `NativeFirstRunSurface` /
`ProductWebSurface` — the native chrome follows the web mode
instead of assuming dark.

### W27-17 CLEAN MARK EVERYWHERE — FIXED (one judgment call flagged)
Founder ruling 2026-10-22 12:30 PDT lifted the hero HOLD: "Clean
the home-screen orb too."
- Source: the icon worker's cleaned master
  (`~/workspace/icon-orb/opal-orb-master-clean.png`, 1600×1600)
  replaced the design master at
  `shots/repair18/design-masters/opal-orb-master.webp`.
  Composition verified identical before the swap (mean abs diff
  3.14/255; only ~3% of pixels differ materially — the retired
  dot sites).
- All derivations re-run from it: hero, hero-512, medallion,
  splash master-full, marble sphere, orb icon + app
  icons/favicons (`build_hero_assets.py`, `build_splash_master.py`,
  `build_marble_sphere.py`, `build_icon_assets.py`).
- `OrbMark` (vector placement) no longer draws the ORB_POINTS
  dots (its small-size reduction already omitted them).
- `OrbLivingRings` HERO (splash): riders, rotor points and rest
  points retired; the precessing arc — the ring's own lit metal —
  keeps the rings' rotation and fades out before the settle; the
  settled frame is the cleaned still exactly. Pins rewritten to
  the new law (`orbLivingRings.test.tsx`, `cleanMark.test.tsx`).
- JUDGMENT CALL, flagged for the founder: the AMBIENT dock orb's
  few travelers stay. They are not the logo's decorative lights —
  they carry live plan-state color (the ambient language: the
  dock orb is a living instrument, not a static logo placement).
  One word from the founder retires them too.

## Walk stack

__STACK__

## Founder list (his actions only)

1. Merge `muse/repair-27` when satisfied with the re-walk.
2. Optional: commission the W27-10 backend projection-copy pass
   (humanize plan-detail machine strings at the source).
3. W27-17 judgment call: the dock orb keeps its live-state
   travelers — say the word if they should go too.
4. The walk re-verdict is his; FOUNDER_ACCEPTED stays NO until he
   phone-walks the advanced stack.

FOUNDER_ACCEPTED = NO.
