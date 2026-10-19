# STEP 0 + HARMONY-0 - VISIBLE DESIGN INTEGRATION (Repair #18 close-out) - v2

Founder re-steer 2026-10-18 11:30 PDT (step 0) put the orb system and
DIR-1 plan-awareness ON THE GLASS. Founder sharpening 2026-10-18
12:52-12:54 PDT (harmony-0): the face around the mark was still the
shell's pre-anchor design language - this pack is the harmony pass:
the shell's grounds, accents, and chrome re-derived from the sampled
orb tokens, the interim mark retired, and the lockup law enforced.
Acceptance test, in the founder's terms: if the captures read as "the
old design with a new logo pasted in," the slice FAILS. Machine-proven,
pending the founder. FOUNDER_ACCEPTED = NO.

## Served build identification

- Branch: `muse/r18-harmony0` (off `4c28c519`, step-0 tip). Code tip
  served: `b9757c09`. Branch tip at delivery: `005d3cfc` - it differs
  from the served tree ONLY by `shots/regression/rendered/harmony-you.mjs`
  (capture harness, no app code).
- Preview worktree (Mac): `~/Developer/NIOVI-Architect/worktrees/opal-r18-preview`
  (branch `r18-preview-local`). The founder's `opal-walk` stack
  (:4000/:5173, BEAM pid 15915 + Vite pid 16004, started Oct 17 22:29)
  was verified alive and untouched before and after every step.
- Mirror: rsync of the `b9757c09` tree (excludes: .git, node_modules,
  _build, deps), mirror commit `1390bd6e00f27d396f95bde4c91e5a333012fbbb`
  (2026-10-18 13:18:05 PDT). TREE-HASH GATE: Mac `HEAD^{tree}` =
  `c7c26ba59250c4f0459d90167696c0c524506444` - byte-identical to the
  `b9757c09` tree. A full `git ls-tree -r` diff proved the ONLY
  differing path before the amend was `apps/opal_web/vite.config.ts`
  (the preserved Mac patch: dev proxy targets 4100 instead of 4000);
  after the amend it is the worktree's only uncommitted change, its
  effect intact, not part of the mirror tree.
- Servers (preview only, restarted): Phoenix BEAM pid 37239 started
  Sun Oct 18 13:21:05 PDT 2026 - POSTDATES the mirror commit; Vite pid
  37120 started 13:19:31 PDT - POSTDATES the mirror commit. Same recipe
  as step 0: env from `~/.opal/r1a1.env`, MIX_ENV=dev, PORT=4100, plus
  the step-0 override `OPAL_PHONE_VERIFY_MODE=synthetic_development`
  (health reads `phone_verify_mode: synthetic_development`, as in
  step 0); Vite `VITE_OPAL_SHELL=c2` on :5174. `GET :4100/health` = ok;
  web on :5174 = 200. (One relaunch note: the first Phoenix start
  inherited `production_sms` from the env file and was restarted with
  the override before any capture; no capture was taken against it.)
- Every capture's DOM carries
  `data-git-head-full=1390bd6e00f27d396f95bde4c91e5a333012fbbb` and the
  badge chip reads `seed - 1390bd6` (visible in the shots).

## How the captures were made

Real served app in Chromium at phone viewport 390x844 (DSF 2), dark
and light, driven from the VM over SSH tunnels (14100->4100,
15174->5174) with `shots/regression/rendered/harmony-capture.mjs`
(step-0 harness + harmony probes: lockup-law geometry, computed
sampled tokens, chats preview audit, scrolled Center card, You /
Settings attempt), `harmony-you.mjs` (You + Settings, fresh session),
and `step0-calllog.mjs` (unchanged). Real session data only: synthetic
sessions + founder seed through the real APIs - no fixture painting,
no painted plans, NO new setup records created in this slice: the
preview DB already held the step-0 seed + the step-0 placed call
(`POST /calls`, id `07391047-6835-432f-9ab7-2feb9de5ec69`), and the
harmony requirement set was already satisfiable from that real data
(see "Fire line" and "State spectrum" below).

## What changed on the glass, per surface (harmony-0)

Token/chrome application only - no layouts, no component structure:

- GROUNDS (dark): `--canvas` #121017 -> #18141c (the sampled field,
  = --orb-field); `--canvas-stage` stays #0d0b12 (already the sampled
  stage); surfaces #1c1922/#262230 -> #201a27/#2a2333, quiet steps of
  that field; night primitives and the C1 dark wash follow. Computed
  on the glass (manifest `harmony-tokens`): canvas #18141c, stage
  #0d0b12, surface-1 #201a27, root background rgb(24,20,28). LIGHT:
  grounds unchanged (#fffefb / #f5f0e8 / #faf7f2) - the calm soft
  field; no dark chrome borrowed, verified in the same probe.
- ACCENTS = THE SAMPLED FIRE: `--accent-1` #8b7fff/#6d5df0 (foreign
  periwinkle) -> sampled fire violet #7d4dce (dark, the peak) /
  #5d398a (light, the median); press = core/shade; quiet = the same
  hues at 16%/10%. `--grad-current` (the old Current Lines palette:
  teal/indigo/purple/pink/amber) -> the sampled fire itself: dark =
  the sector peaks (identical stops to --orb-fire-gradient), light =
  sampled medians/shades. Visible effects: the story "+" badge, the
  dock active dot, the "+ New" outline, unread dots, selection and
  toggle states all read in the orb's own violet now; splash-2's
  gradient headline burns in the master's order (violet, blue, cyan,
  magenta, gold). INDICATOR DISCIPLINE: no canonical state hex
  (#8B5CF6/#00E5FF/#FFC86B/#FF4D5E) appears in any decorative token -
  pinned by a c2Tokens test; sampled hues are used only in navigation/
  brand-accent positions, never where a plan state is read (state
  still renders ONLY through the indicator language).
- DOCK CENTER DISC: border is now the sampled ring metal
  (--orb-ring-metal #dbae8e at 45%) - computed on the glass as
  srgb(0.859, 0.682, 0.557)/0.45. The disc reads as the orb's
  gyroscope ring, not a lavender button.
- CENTER PRESENCE SURROUNDINGS: the Center rest field carries a
  quiet ring-metal halo (7%) radiating over the stage behind the orb
  - field, not a second lit element (the orb remains the one lit
  thing). Deliberately subtle; see the report's honest note.
- LOCKUP LAW (founder 2026-10-18 12:54 PDT): the only combined
  composition is STACKED (orb above wordmark). `OrbLockup` "full" no
  longer exists as a horizontal variant - its combined form is the
  stacked composition. Headers carry ONE element:
  - Home header: the DRAWN WORDMARK ALONE (pick: the wordmark, where
    the brand name appears). Before: orb + OPAL side-by-side.
  - Onboarding header: the DRAWN WORDMARK ALONE (same pick).
  - Splash-1: STACKED (hero above wordmark) - probe: stacked=true,
    centerDeltaX=0, sideBySide=false, both modes.
  - Splash-2: SINGLE ELEMENT - the orb mark alone in the convergence
    ring; no wordmark on the surface.
  - Center rest: SINGLE ELEMENT - the orb hero alone.
  - Settings section header: SINGLE ELEMENT - the orb mono mark
    alone (`settings-*.png`, mark-mono, lockups=[] probed).
  - Home probe: lockups on surface = 1, form "wordmark",
    anyFullHorizontal=false, both modes. GATE: no capture in this
    pack shows a side-by-side lockup.
- INTERIM MARK RETIRED (founder 2026-10-18 12:53 PDT): the orb is
  the logo, permanently. `OrbMarkAlternate` export removed; the
  foundation gallery's interim identity plate removed (the gallery
  keeps the orb plate only, its lockup now the stacked composition);
  `c2Identity.ts` carries retirement naming, not "alternate"; the C2
  icon slots in `main.tsx` resolve to the orb master
  (ORB_ASSETS.hero512), not the interim app icon. Grep proof in
  harmony0-report.md: no rendered surface references the interim
  components or /brand/c2/ assets (the R17 fallback keeps its own old
  identity, untouched, as the separate revert spot).
- FINDING (ii) FIXED: the C2 ChatsHost preview of the Maya
  conversation read raw `call:07391047-...`. It now derives from the
  conversation record: **"Call with Maya"** - visible in
  `chats-list-*.png`; probe: previews audited on the glass,
  rawCallPreviews=0, both modes. Unit-pinned
  (conversationPreviewLabel).
- FINDING (i) DIAGNOSED, NOT A CARD CLIP: the "Plan with User A"
  geometry flag on center-rest is the title straddling the fold
  behind the floating dock at the capture scroll position, not an
  in-card ellipsis. Proof in this pack: `center-scrolled-*.png` +
  probe - scrolled fully into view, the title measures
  scrollWidth == clientWidth (316) and scrollHeight == clientHeight
  (22), white-space normal, no truncation, both modes; the same title
  renders complete on home. No card change was made; the flag's
  mechanism is named in harmony0-report.md.

## Fire line + state spectrum (requirements 3 + 4)

- FIRE LINE VISIBLE: the plan-card FireLine (landed in the orb system
  for every non-past state) is plainly visible in `center-rest-*.png`
  and `home-*.png` - the iridescent gradient rule under each plan
  card's state pill (probe: 3 `.orb-fire-line` elements in the Center
  route, both modes, under real seed plan cards). No fake nudge was
  painted and no nudge record was fabricated: the Center nudge
  FireFrame path requires a real nudgeLine, and the web adapter's
  projection carries none in this seed (openingFromPlans sets it from
  no source) - declared, carried forward below.
- STATE SPECTRUM (real seed plans, named as in step 0): the captured
  set renders FOUR distinct states in the indicator language
  (StateStone + glyph + finished label + fire line):
  - FORMING (violet): "Saturday opens like this" (plan 5861cb2c) and
    "Meetup" (a7369517) and "Plan with User A" (fcd2e939) as Center /
    Home plan cards - `center-rest-*.png`, `home-*.png`.
  - ACTION (red): DIR-1 rows for fcd2e939 + 5861cb2c -
    `chats-list-*.png`; the call-log row for 5861cb2c -
    `call-log-*.png`.
  - READY (gold): "Meetup" (a7369517) DIR-1 row + the thread's Next
    Together strip - `chats-list-*.png`, `thread-*.png`.
  - HAPPENING (cyan): splash-2's declared illustration card
    (fixture by design law, not seed data) - `splash-2-*.png`.
  No plan was created for the camera; the seed already carried the
  spectrum.

## Geometry results

Rendered probes ran on every surface in both modes; full numbers in
`manifest.json`, `manifest-calllog.json`, `manifest-you.json`.
Splash-1, splash-2, home, chats-list, thread, call-log, you,
settings: PASS - docOverflow 0, no escapees, no clipped text, no
trapped dock controls. Center-rest: the single known flag above
("Plan with User A", fold occlusion - diagnosed, with scrolled
proof in-pack). Call-log geometry: clean both modes (DIR-1 call
variant present: 7 real rows, Maya row carries plan 5861cb2c,
state action).

## What each capture proves

- `splash-1-*.png` - orb hero on the sampled field: dark = the master
  keyed (248px), light = the medallion; STACKED lockup with the drawn
  wordmark; gem pattern perceptible at token opacity (dark 0.055 /
  light 0.04) - verified visible at capture scale in both modes, no
  opacity change made (restraint held).
  `sidebyside-master-vs-splash1-*.png` regenerated for v2.
- `splash-2-*.png` - single-element orb convergence; happening card
  + fire line; gradient headline in the sampled fire order.
- `home-*.png` - header = drawn wordmark alone; sampled accents;
  forming cards with fire lines.
- `center-rest-*.png` - orb presence on the stage field + halo;
  forming cards + fire lines; dock disc in ring metal.
- `center-scrolled-*.png` - the fold-crossing Center card scrolled
  fully into view: title complete (finding i proof).
- `chats-list-*.png` - DIR-1 rows (action + ready) and the fixed
  "Call with Maya" preview.
- `thread-*.png` - Next Together strip, ready, full text.
- `call-log-*.png` - DIR-1 call variant (R17 shell path, as step 0).
- `you-*.png` / `settings-*.png` - NEW in v2: the You hub and the
  Appearance settings section; the settings header carries the orb
  mono mark alone (single element, no lockup pairing).

## Founder-approved elements still NOT visible on the glass

Carried forward honestly (step-0 list, updated):

1. **A real Center nudge in a FireFrame.** The treatment is landed
   and renders when a nudgeLine exists; the web projection has no
   real nudge source in the seed, and none was fabricated. The
   fire-line requirement is instead proven on real plan cards.
2. **The call log inside the C2 shell proper.** Unchanged from
   step 0: the C2 shell has no call-log surface; the DIR-1 `call`
   variant is visible only in the R17 shell via `?shell=r17`.
3. **Full plan text on chats rows.** Row-variant plan-awareness text
   truncates with an ellipsis at row width (designed row width; the
   full text renders in the thread's Next Together strip).
4. **The Center deck-to-list edge.** The straight horizontal boundary
   where the Center stage meets the plan list is a layout property,
   outside this slice's token/chrome scope - named, not smoothed.
5. **The ring-metal halo's subtlety.** At 7% the Center halo is a
   warmth, not a visible ring; raising it would compete with the orb
   (one-lit-thing law), so restraint won. Named so it is not read as
   a missing treatment.
6. **The dev badge chip overlays content** (mandated build
   instrument, `seed - 1390bd6`, not product UI) - unchanged.
7. **Splash-2 carries no orb hero** - by design (illustration/plan
   surface); its brand element is the single orb mark in the ring.
8. **The standalone horizontal lockup SVG file**
   (`public/brand/orb/opal-orb-lockup.svg`) still exists in the repo
   as an unreferenced asset (no surface or component renders it -
   grep-proven in the report). The component composition is stacked;
   regenerating that file belongs to the icon/asset pass, declared
   here so it is not mistaken for a rendered pairing.
9. **Everything else in Repair #18 with no glass** - unchanged from
   step 0: this pack proves the orb/harmony layer + DIR-1 only.
