# Repair #18 — Theme Unification Pack

Before/after rendered proof for the Theme Unification Wave: the ChatsHome
family (call log, chats list, chat thread) and Home's state treatments
brought into the orb theme, function frozen. Founder standard applied:
ambient borders that are functional and serve a purpose — a border
exists to carry meaning (state, entity, the one lit element); any
border serving no purpose was REMOVED, not recolored. Every ambient
element carries a declared reason in the report's ambient register
(`coordination/repair18/unify-report.md`).

## Served build identification

- BEFORE: the served harmony tree `1390bd6e` (= commit `b9757c09`),
  captured from the Mac preview stack 2026-10-18 ~13:55–14:05 PDT,
  before the first unify mirror. Manifest: `manifest-unify-before.json`,
  images in `before/`.
- AFTER: branch `muse/r18-unify`, tip `c07f132c`, tree
  `0a1be16c28885302620d24f0e505f732c7350721`, mirrored to the Mac
  preview worktree as commit `dcdea02f`. TREE-HASH GATE PASS: Mac
  mirror tree == branch tip tree (`0a1be16c…`); the Mac
  `vite.config.ts` patch is preserved as the only uncommitted change.
  Preview servers restarted ONLY (Phoenix :4100 pid 42659/beam 42661,
  Vite :5174 `VITE_OPAL_SHELL=c2` pid 42660, started 14:58 PDT,
  postdating the mirror). The opal-walk stack was verified alive and
  untouched throughout. Every AFTER image's in-app seed stamp reads
  `dcdea02f`. Manifest: `manifest-unify-after.json`, images in
  `after/`, side-by-sides in `pairs/`.
- Captures: 390×844, both modes, via
  `shots/regression/rendered/unify-capture.mjs` (synthetic sessions,
  founder seed) against the served preview through the real path.

## Per-surface reading

- **Home (C2)** — `home-{dark,light}`: BEFORE, forming plan cards wore
  a plain line border, no glow — the dryness the founder flagged.
  AFTER: forming reads as anticipation — dashed violet ambient border
  + soft glow + the fire line under the state pill, all derived from
  the canon forming token; cards carry the projection's real people
  language ("2 of 6 going", "4 of 4 going", "1 of 2 going"). No state
  was faked: the seed's Home plans truly are all forming.
- **Chats list (legacy shell)** — `chats-list-{dark,light}`: BEFORE,
  ear-gradient avatars, cyan "Direct connection" labels, saturated
  mode pills. AFTER: sampled-field ground, quiet surface steps,
  avatar = ambient violet tint + initial, connection label quiet ink,
  the active mode pill is the surface's one lit element.
- **Call log (legacy shell only — it exists nowhere else)** —
  `call-log-{dark,light}`: BEFORE, a different neon border color per
  person on every row. AFTER: rows borderless on quiet steps; the
  only colored marks are meaning — the PlanAwareness strip in canon
  action at ambient intensity, "Sat 7:30 · Ready" in canon ready
  gold, the missed row's action left edge, "Graph updated" in quiet
  ink.
- **Chat thread (legacy shell)** — `thread-{dark,light}`: BEFORE,
  violet/cyan 1px saturated bubble borders, spectral-gradient
  composer, cyan "You" label. AFTER: bubbles are borderless surface
  steps (own vs peer by step + alignment), composer is a quiet step
  with a plain hairline, sender names in quiet ink; the remaining
  cyan edges are the thread's own plan-fact indicators (state
  meaning, unchanged behavior).
- **Chats list / thread (C2 shell, C1 hosts)** —
  `chats-list-c2-*`, `thread-c2-*`: the C1 surfaces already sat in the
  C2 theme; per-state PlanAwareness borders there now match the same
  ambient register as everywhere else (see drift gate).
- **Dock close-ups** — `dock-c2-closeup-*`, `dock-legacy-closeup-*`:
  the halo gate (below).

## Dock halo gate — PASS, both shells, both modes

BEFORE: the C2 pad's top border (rgba(255,255,255,0.1)) ran straight
through the center disc zone (x 155–211); the legacy pad's neon ring
crossed the center character (zone x 142–228). AFTER (probed from
computed styles, and visible in the close-ups): each pad's own top
border is transparent and the top edge is drawn as two segments that
terminate at the disc edge — C2 segments end at 50%−36px around the
disc; legacy segments measure 121.4px each, ending before the
142–228 device zone. No line crosses the halo anywhere.

## Indicator drift gate — PASS

Rendered probe of every PlanAwareness variant (row / strip / call)
on every surface (legacy list, legacy call log, C2 list, C2 thread):
the same state renders the same canon token at the same ambient
intensity everywhere — e.g. action = canon (255,77,94) at 0.52 border
alpha with the pill at full canon, identically on all four surfaces.
Home's forming cards render the canon forming hue at 0.52, dashed.
Pinned in code by `src/theme/unifyDrift.test.ts` (13 checks: token
equality with PLAN_STATE_HEX, no raw canon hex in the unify sheet,
retired treatments stay retired, halo construction in both shells).

## Function-frozen proof

- DIR-1 web tests: 13/13 green (`dir1PlanAwareness.test.tsx`).
- DIR-1 API cases FR-18-DIR1-01/02: 2/2 PASS against a local stack
  serving this branch (log in the wave's scratch records; details in
  the report).
- Full web suite: exactly the 23-failed / 16-files pre-existing
  baseline (failed-file names verified identical to the baseline
  earlier in the wave; counts re-confirmed on the final tree);
  typecheck: exactly the 9 pre-existing errors. No regressions.
- The PlanAwareness mounts (rows, Next Together strip, call rows)
  render and behave identically — same components, same projection
  data; only their treatment layer changed.

## Honest notes

- `after/call-log-dark.png` comes from a same-build re-capture
  (stamp `dcdea02`, identical served build) in which the harness
  waited for network idle before the shot: in the main run's dark
  pass, avatar media and phone glyphs had not painted yet when the
  fixed wait expired (cold cache over the tunnel — the same run's
  light call log and chats list, and three earlier runs, render
  complete). No other image was substituted.
- Geometry probes flag clipped text on the legacy chats list and
  thread in BOTH before and after (design truncation, pre-existing —
  e.g. "Direct connection", timestamps). Not a regression; unchanged
  by this wave.
- The legacy shell renders its dark field in both modes by design, so
  the legacy-scope surfaces carry the sampled dark family in both
  modes; the light captures verify the treatments hold there.
- Home's seed composition is three forming cards and nothing else —
  the ready/happening/action/past registers are proven on the
  surfaces where those states truly occur (DIR-1 rows, thread strip,
  C1 cards). Recorded as a data-composition note in the report, not
  painted over.
