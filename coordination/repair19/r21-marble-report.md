# Repair #21 - Cluster W-19 Report: Brand Material - The Marble

Branch `muse/r21-marble`, base `4dd0e940` (r21-openings tip),
tip `e11bcef5` (frames + badge; this report rides one commit above).
No merge, no deploy, `muse/repair-17` untouched. Plain hyphens in
all user-facing copy (this cluster adds none).

## Frames first (the proof set)

All frames: served web build of this branch's tip tree (vite dev
server from this worktree; the DOM badge `data-git-head-full` was
read back and asserted equal to the tip SHA before every frame was
filed, and the in-frame seed chip reads `seed - e11bcef`), local
dev backend for sessions/seed (synthetic fixtures only), 390x844.
Pad frames passed the W-8 content-signature assertion
(`assertSurfaceSignature(page, "center", ...)`) immediately before
the shutter; splash frames passed the same discipline inline (the
signature registry carries no splash entry: `c2-splash1` root +
`img[data-marble="master"]` present, zero member-surface roots).
Directory: `shots/repair19/r21-marble/` (+ `capture-log.json`).

1. `marble-pad-dark.png`, `marble-pad-light.png` - Center opening
   (a primary surface) with the pad at the bottom: the pad's center
   orb now carries the marble grain in both modes.
2. `marble-pad-dark-zoom.png`, `marble-pad-light-zoom.png` - the
   dock disc element alone (56px at 2x): violet-cyan-gold swirl
   inside the rings, stone-true in light, luminous on the dark
   disc in dark.
3. `marble-splash-dark.png`, `marble-splash-light.png` - Splash 1
   after the settle (the rig waited for the hero living rings to
   reach `data-motion="settled"`): the settled still over the same
   master. Light is intentionally identical - Splash 1 carries its
   own night field in both modes (standing splash law, unchanged).

## Part 1 - The honest inventory

### The plain answer to the founder's question

Almost nowhere else - and the button he loves is not quite what it
looks like. The thread's orbit doorway button carries NO stone
texture at all: it is a flat five-stop linear gradient
(`--opal-iris-gradient` = `--grad-current`, the orb's sampled fire
peaks in dark, quieter medians in light) on a 26px disc, and the
marbling he sees is the blend those five hues make at that size.
The TRUE photographic marble grain - the swirled opal stone of the
master - lived in exactly one product place before this cluster:
the master raster itself, on Splash 1 and the Center opening hero
(and its app-icon derivation). Everywhere else the app carries the
gradient (a flat reduction of the same fire) or a soft blurred-blob
vector approximation (OrbMark's FireBlobs). The grain family is one
family - all of it sampled from the same master - but the stone
itself was nearly absent. Part 2 fixes that at the two identity
seats in scope.

### Every sighting on the base (4dd0e940)

Carrier A - TRUE GRAIN (the master raster, photographic marble):

| Surface | Component / asset | How carried |
| --- | --- | --- |
| Splash 1 (full-bleed composition) | `C2Splash1` img, `ORB_ASSETS.masterFull` = `/brand/orb/opal-orb-master-full.webp` | Image asset (resize-only master derivation) + `OrbLivingRings` hero overlay |
| Center opening hero (168px, the orb doorway to Soul/Memory settings) | `OrbHero` in `C2CenterOpening` | Image asset: keyed master (dark) / medallion variant (light) |
| App icon + favicons | `ORB_ASSETS.icon1024` derivations | Image asset (downscale of the master on its own night field) |
| Foundation gallery (review only, not a product surface) | `OrbHero` in `C2FoundationGallery` | Image asset, evidence harness |

Carrier B - THE FLAT FIRE GRADIENT (`--grad-current` /
`--opal-iris-gradient` / `--orb-fire-gradient`; sampled peaks,
NO grain - the doorway's actual technique):

| Surface | Selector / component | How carried |
| --- | --- | --- |
| Chat thread header - THE ORBIT DOORWAY BUTTON (protected) | `.c1-thread-opal-orb` (26px) in `ThreadShell`, also reused on Calls rows (`.c1-call-orbit`) | CSS gradient |
| Thread - Opal message dot (8px) | `.c1-opal-dot` | CSS gradient |
| Thread - read-aloud presence orb (14px) | `.c1-read-aloud-orb` | CSS gradient |
| C1 chrome - presence ring, mark, send, primary buttons | `.c1-presence`, `.c1-mark`, `.c1-send`, `.c1-primary-btn` | CSS gradient |
| Orbit (Opal chat) - empty-state send; private-graph unlock primary | `.orbit-empty-send`, `OrbitUnlockPrompt .c1-primary-btn` | CSS gradient |
| Fire line / fire frame (lit plan cards incl. the protected YOUR MOVE family) | `FireLine` / `FireFrame`, `.orb-fire-line`, `.orb-fire-frame::before` | CSS gradient (1px ring/line, not a fill) |
| State stones (plan-state markers) | `StateStone` circle fill at 0.85 over the field | SVG fill of the same gradient |
| Memory vault section border (You) | `.c2s-vault` border-box gradient | CSS gradient (1px border) |
| Moment Stone "new" ring (Flows) | `.c2s-stone[data-state="new"]` border-box gradient | CSS gradient - SEE sightings-in-progress |
| Story viewer progress (seen segments) | `.c2s-viewer-seg[data-done="1"]` | CSS gradient |
| Center asset pressed treatment | `c2shell.css` gradient border pair | CSS gradient |
| Splash headline (legacy C2 splash variant) | `.c2-splash-gradient-headline` text clip | CSS gradient clipped to type |

Carrier C - THE VECTOR REDUCTION (OrbMark: fire gradient sphere +
four blurred sampled blobs + gold core; a soft swirl, no grain):

| Surface | Component |
| --- | --- |
| PAD CENTER ORB (the dock device, 40px) - Part 2 seat (a) | `OrbMark` + ambient `OrbLivingRings` in `C2Shell` |
| Wide-layout sidebar Center slot (22px, small reduction) | `OrbMark` in `C2Shell` |
| Center chat / Opal presence marks | `OrbMark` (CallSurfaces, ConversationShareSheet, EventShareCard, Splash 2 at 28px, You hub at 28px, Graphs empty state mono) |
| Sub-24px seats | `OrbMarkSmall` (bits.tsx plan rows) - rings + stone only |

NOT marble in any carrier: the wordmark (sampled gradient type +
faceted gem O - flat facets, not grain), the gem pattern field
(facet line geometry at 4-5.5% opacity, Center hero backdrop), the
character art (`opal-character.png` - a different brand asset), and
the entire mobile app (`apps/opal_mobile` renders no orb, gradient,
or grain anywhere - an honest absence).

### Sightings-in-progress (sibling cluster's slice - not carried here)

- The light-heart glyph and the story-ring special states: the
  Moment Stones ring treatments in Flows (`.c2s-stone` states incl.
  the gradient "new" ring above) and the heart/state glyph work are
  a sibling R21 cluster's assignment. Recorded here as sightings of
  the gradient family; this cluster neither changed nor pins them.

## Part 2 - The carry

New shared asset: `/brand/orb/opal-marble-sphere.webp` (256px,
39KB) - the master's OWN sphere interior, cropped at the measured
master geometry (orbGeometry: center (810,800), r410 at 1600px)
from the keyed hero by `scripts/orb/build_marble_sphere.py`
(deterministic, re-runnable; RGB untouched, circle-masked). One
asset, every seat - the stone without rings or field, so each
surface seats the same grain under its own ring device.

(a) THE PAD'S CENTER ORB - `OrbMark` gains a `marble` seat
(`data-marble="sphere"`): the grain image clipped to the measured
sphere, rings and points riding above it exactly as the master's
layering; `C2Shell`'s dock renders `<OrbMark size={40} marble />`.
Justification (one sentence): the pad's orb is the stone you carry
everywhere - its grain tells the user this is Opal itself, seated
in the pad, and home is one tap away.
Fix found at the glass: the first capture read PALE - the vector
reduction's gold core glow + glass highlight, harmless over flat
fire, bleach photographic grain to a peach wash (probe: image-only
isolation rich, as-is washed). The marble seat therefore renders
NEITHER overlay (the master carries its own core light); the plain
mark keeps both. Pinned by test.
Mode parity: the same stone-true raster in both modes - dark reads
luminous against the dark disc fill, light stays stone-true on the
pale disc; no tint was needed and none was invented.
Divergence: NONE - this is the doorway's own grain family taken
from the same master the doorway gradient was sampled from; the
doorway keeps its flat reduction (protected, untouched - pinned).

(b) THE SPLASH / SETTLE ORB - already the master; this cluster
makes the sighting DELIBERATE and pinned rather than incidental:
the splash img now declares `data-marble="master"`, `OrbHero`
declares `data-marble="master" | "master-medallion"`, and tests
pin both. The settle still is the same img under the settled rings
(the rings settle; the stone never changes) - splash and settle
are one sighting, proven by the settled frames.
Justification (one sentence): the first thing a new user meets is
the stone itself at full size - the material says you are looking
at Opal before a single word does.
Divergence: NONE (it is the master).

QUIET, honored: the grain never animates - no keyframes, no
sparkle, no drift; orb.css states the law at the seat
(`[data-marble="sphere"] image { animation: none; }`) and a test
pins that no animation targets it. The existing settle and ambient
ring motions are untouched, above the stone.

## Named non-sightings (8) - where the marble deliberately does NOT go

1. Send / primary action buttons (thread send, C1 primary, orbit
   send, unlock primary) - they signify an ACTION, not the brand's
   presence; marble there would spend the material on chrome and
   blur the line between "Opal is here" and "press to commit".
2. Avatar and presence rings (`.c1-presence`, `.c1-mark`, chat-row
   marks) - they carry a PERSON'S identity; seating the brand stone
   on a person misattributes whose mark it is.
3. Plan cards, state stones, the fire frame - they carry plan
   STATE in the canon hues + pattern channel; a grain fill would
   flood the state language with brand color and the state would
   stop reading.
4. Moment Stone faces (Flows) - the face is the person's moment
   (photo/content); a stone face would replace content with brand.
   (Their ring STATES are the sibling slice, above.)
5. Content containers (vault/memory sections, sheets, settings
   rows, Connectors rows) - marble as a fill or backdrop inside
   utility content is decoration exactly; the material test fails
   because the grain would tell the user nothing there.
6. Sub-24px marks (sidebar 22px, plan-row small reductions, call
   marks at 20px) - grain cannot physically read at that size; a
   mush of color would be a false claim of material. The reduction
   stays, by the orb system's own asset-per-job law.
7. Splash 2 / onboarding step marks (OrbMark 28px) - a step marker
   inside a flow is wayfinding, not the home stone; the material
   belongs to arrival (Splash 1) and residence (the pad), not to
   mid-flow chrome.
8. The wordmark and gem O - type and faceted mark; grain inside
   letterforms is a texture effect, not a material seat, and would
   break the sampled wordmark's legibility.

## Tests

- New: `src/brand/orb/r21Marble.test.tsx` - 11 tests (asset is a
  real WebP with substance + derivation provenance; marble seat
  markup: image href/clip/geometry, no core-glow bleach, plain
  mark unchanged; no marble below 24px; dock + splash source pins;
  QUIET pin; doorway-protection pin). All pass.
- Orb suites (`orbTokens`, `orbLivingRings`): pass. Doorway/orbit
  suites (`opalChatDoorway`, `r20Orbit`), shell surfaces, brand,
  foundation, splash suites: pass.
- Typecheck: exactly 9 errors - identical to the base's 9
  (pre-existing: OpalApp Tab x3, productClient duplicate
  identifiers x5, YouSettingsDestination handle x1).
- Scoped fail-set identical to base: `src/c2 + src/theme +
  src/brand` on base and on tip both fail exactly
  `technicolorProduction.test.ts` (1) and `r20CardMenu.test.tsx`
  (1) - both verified pre-existing by stash-runs on the base tree;
  `firstRun.test.ts`'s em-dash failure is likewise in a file this
  cluster never touched (an em dash in FirstRunExperience.tsx at
  base). No new failures anywhere run.

## Files

- `apps/opal_web/public/brand/orb/opal-marble-sphere.webp` (new)
- `apps/opal_web/scripts/orb/build_marble_sphere.py` (new)
- `apps/opal_web/src/brand/orb/orbTokens.ts` (ORB_ASSETS.marbleSphere)
- `apps/opal_web/src/brand/orb/OrbMark.tsx` (marble seat; OrbHero pin)
- `apps/opal_web/src/brand/orb/orb.css` (QUIET law at the seat)
- `apps/opal_web/src/brand/orb/r21Marble.test.tsx` (new)
- `apps/opal_web/src/c2/shell/C2Shell.tsx` (dock marble seat)
- `apps/opal_web/src/onboarding/C2Splash1.tsx` (declared sighting)
- Frames + `capture-log.json`: `shots/repair19/r21-marble/`
