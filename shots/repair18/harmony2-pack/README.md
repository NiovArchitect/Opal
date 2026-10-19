# Repair #18 — HARMONY2 PACK (brand harmony remainder + HA-A/HA-B + icon pass + two completions)

Branch `muse/r18-harmony2` off `44fe7e4b`; tip `3021e663`
(test-only head — MP-11 allowlist retirement; last app-code
commit `bfb15230`). Full web suite on the final tree: 23 failed
/ 16 files, exactly the baseline (see the report's correction
log). **Not merged,
not pushed. FOUNDER_ACCEPTED: NO.**

## Served builds

- BEFORE: the live Mac preview stack as found — mirror commit
  `dcdea02f` (the unify-era tree), Phoenix :4100 / Vite :5174,
  stamp `dcdea02f46fd…` in every BEFORE capture.
- AFTER: this branch mirrored to the same preview worktree
  (rsync, Mac `vite.config.ts` proxy patch saved + restored),
  mirror commits `164491d2` (main wave), `d8147c01`
  (focus-outline fix), `66ab81c5` (test-only; app code identical
  to `d8147c01`, captures unaffected). **Tree-hash gate: the final mirror tree
  differs from the branch tip tree in exactly one blob —
  `apps/opal_web/vite.config.ts` (the preserved proxy patch).**
  Phoenix restarted once (migrations ran, incl. SM
  `20261029050001`); Vite restarted for each mirror. BEAM
  postdated the mirror both times. **opal-walk (BEAM 15915, Vite
  16004, :5173) verified alive and untouched at every checkpoint.**
  The splash side stack (:4101/:5175) was not touched.
- Note on the BEFORE delta: the BEFORE stack was two merges behind
  the branch base (no adopt2/adopt3/SM), so some AFTER differences
  (Soul form present, goals section present) are the base merges
  arriving, not this wave's edits. This wave's own deltas are the
  ones itemized in the report.

## Contents

- `before/` — 19 files (manifest.json + 18 captures, 390x844, both
  modes; wide pair included — sidebar absent, as expected).
- `after/` — 27 files (manifest.json + interact.json + 21 captures
  + 4 interaction captures).
- `pairs/` — 18 side-by-side pairs (BEFORE left, AFTER right).

## Headline probe results (manifests)

| Probe | BEFORE | AFTER |
|---|---|---|
| Search raw `call:<id>` previews | **1** | **0** (both modes) |
| Served favicon-32 md5 | ff251e51f6eb (interim) | 20e58e401ccf (= the orb derivation file) |
| Served opal-app-icon-512 md5 | 05539fed8531 | 71efa608fdfd (= derivation) |
| `/brand/orb/opal-orb-icon-1024.png` | 200 but **not PNG** (SPA fallback) | PNG, md5 628e3d3664d2 (= derivation) |
| Wide sidebar (1280px) | absent; dock flex | **flex, 232px; dock none** (both modes) |
| Wide Settings nav rows | 0 | **22** (both modes) |
| Soul + Memory form | absent (gated) | **present** |
| Graphs goals section | absent on that stack | present |
| Center deck fold (scrolled to bottom) | card bottom 412 / dock top 772 | card bottom 742 / dock top 772 — last card rests above the dock with the new clearance |
| Geometry | docOverflow 0 / clipped 0 everywhere | docOverflow 0 / clipped 0 everywhere |

## Interaction proof (after/interact.json, stamp 164491d2)

- **Goal picker (6a):** created "Harmony proof goal" through the
  real UI → picker present → 3 Link buttons (the seed's real plans)
  → tapped Link → the goal's status text **changed on read-back**
  → an Unlink button appeared. Shots:
  `after/interact-goal-picker-dark.png`,
  `after/interact-goal-linked-dark.png`.
- **Holding chips (6b):** asked Center chat "What are you holding
  for me?" → 4 chips rendered with the true figures ("3 plans in
  motion", "2 waiting on your answer", "0 memories held",
  "0 sources connected") → tapped the memories chip → landed on
  **You > What Opal remembers**, whose empty state ("Opal is not
  keeping any facts yet") agrees with the chip's 0. Shots:
  `after/interact-holding-chips-dark.png`,
  `after/interact-holding-tap-dark.png`.

## Focus-outline probe (composer, served, dark)

- BEFORE the fix: focused Center chat input outline
  `2px solid rgb(0, 240, 209)` (legacy teal — visible in
  `after/interact-holding-chips-dark.png`, captured pre-fix).
- AFTER the fix (mirror d8147c01): outline
  `2px solid rgb(125, 77, 206)` = sampled violet #7d4dce; the
  composer wrap's focus border is the same violet. The interact
  chips shot predates this one fix; every other AFTER shot is from
  mirror 164491d2, whose app code differs from the final tip only
  by this outline color.

## Honest notes

- The legacy (R17) Center composer probe in both manifests reads
  `composer: null` — the harness did not drive the legacy dock to
  the Center tab, so the spectral retirement there is proven by the
  in-layer CSS + test pins, not by a rendered computed-style read.
  Named in the report.
- No capture setup was fabricated: all data is the founder seed on
  synthetic sessions, plus the one goal the interaction run created
  through the real UI (it remains in the preview DB, named
  "Harmony proof goal").
