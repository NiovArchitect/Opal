# Repair #19 — W29-ORBITSHOT report (2026-10-19/20)

Capture-retry wave, no application code changes. Worktree
`wt-r19-orbitshot` (branch `muse/r19-orbitshot`, tip `95319bd7` =
the final pushed build). Both W28-CLOSE frame gaps are **resolved**.

## Verdict per frame

| Frame | Result |
|---|---|
| `orbit-sheet-dark.png` | **CAPTURED WITH PROOF** — replaced (was the W11 capture) |
| `orbit-sheet-light.png` | **CAPTURED WITH PROOF** — replaced (was the W11 capture) |
| `person-profile-family-light.png` | **CAPTURED WITH PROOF** — added (W28 did not ship it) |

## Stack (the W28 pack recipe, quiet stack)

Phoenix from `wt-r19-orbitshot` (tip `95319bd7`) on :4000; fresh DB
`opal_dev_r19w29` — **113 migrations, max `20261030010002`**; human
seed world, seed gate clean (comm=200, graph=200 on every
provisioning); `VITE_OPAL_SHELL=c2` build served on :5173; headless
Chromium 390×844 (deviceScaleFactor 2 → 780×1688 PNGs); fresh
synthetic review account **+12025550101**; run tag
*"with everyone after the market"*; governed clock pinned
`OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`. Served-build stamp read
from the pages and visible in-frame (`seed - 95319bd`):
`95319bd734e8e487dd450650c66d7378b9dbf921` on all three frames.

## 1. Orbit sheets — captured

Path (identical in both modes): Center → `c2-opening-talk` →
**`center-chat-navigator` appeared after ~2s of polling** (the W28
blocker — six attempts on the contended stack — did not recur) →
Jordan Ellis orbit group (header "JE Jordan Ellis Private") →
`orbit-unlock-prompt` passcode flow, code `2468` (set-and-open on
the fresh account; probe: prompt seen, gone after submit, no error)
→ **header re-tap expands the group** (`data-expanded=true`, 1
session row, 1 `orbit-open-sheet` button) → "Open this person's
orbit".

Probe-verified before shooting, both modes:
`[data-testid="orbit-sheet"]` mounted + visible, rect 390×844 at
(0,0); `[data-testid="orbit-sheet-tie"]` = **"· Family - Sibling"**;
`docOverflow 0`, `clippedCount 0`.

What the frames show (visually verified): the sheet in the
foreground headed **"Jordan Ellis · Family - Sibling"**, the line
"Plans and Opal conversations about this person. Opal chats live
here, never in your chat thread with them.", the OPAL CONVERSATIONS
section with "Just between us — Jordan / Keep this one between us:
a surprise for Jordan." (Archive / Remove), "Start a new Opal chat
about Jordan Ellis", **"Make this orbit not private"** (the unlocked
state), and Close; the dimmed Opal conversation behind it — the
sheet, not the log. File sizes: **112,108 B (dark) / 111,443 B
(light)**. Pixel spot check (PIL): mean RGB dark (27.0, 23.2, 31.3)
/ light (188.5, 186.5, 183.1); ~530 sampled unique colors each —
rich frames, not blanks.

Two honesty notes:

- **The header tie is "Family - Sibling"** because this same
  capture account had set Jordan's tie live earlier in the wave
  (frame 2 below, PUT-verified). It is the account's true tie state
  and exactly the W24 `orbit-sheet-tie` element rendering it.
- **Person-anchored sheets render no separate PLANS list in this
  build.** Verified on Jordan's sheet and by probe on Maya
  Torres's public person sheet (tie "· Close friend", two Opal
  conversations, likewise no PLANS section). The PLANS section
  appears on plan-anchored sheets — the outgoing W11 frame was one
  (Sunday brunch). The person sheet's own scope line ("Plans and
  Opal conversations about this person") is what the frame shows.

Intra-wave attempt record: orbit attempt 1 (both modes) reached the
unlocked, expanded log but did not mount the sheet — it clicked a
session row instead of re-tapping the group header; the open-sheet
button renders only inside the expanded group (and the FA-02 pin
states the unlock → re-tap → expand sequence). Attempt 2 added the
re-tap and succeeded in both modes. Records:
`w29-scratch/results.json` (attempt 1), `results-orbit2.json`.

## 2. person-profile-family-light — captured, PUT-verified

Live path on the capture account: Jordan Ellis thread → profile →
identification picker → Family → Sibling → Save. Proof collected
**before** the shot:

- Network log after Save: **PUT
  `/api/v1/product/relationships/a2222222-2222-4222-8222-222222222222`
  → 200** (Jordan Ellis's user id; observed via the :5173 proxy
  origin). W28's failure mode — Save produced no PUT — did not
  recur on the quiet stack.
- In-run read-back polled until the profile showed the tie; full
  text: `JEJordan Ellis@user-jordanFamily - SiblingIn your close
  circleWho they are to youFamily - SiblingTap to changeMessageWhat
  Opal remembersDone`.

Frame (visually verified): light profile sheet — "Family - Sibling"
under Jordan Ellis's name, "In your close circle", "WHO THEY ARE TO
YOU / Family - Sibling / Tap to change", Message, "What Opal
remembers", Done. **85,934 B**; PIL mean RGB (197.2, 193.1, 193.8),
508 sampled unique colors; `docOverflow 0`, `clippedCount 0`.

## Manifest changes (`shots/repair19/pack-v2/manifest.json`)

- The `orbit-sheet` surface records carrying the two files are
  **re-stamped to `95319bd7…`** (full SHA), `failures` cleared, and
  annotated with the W29 via/probe/tie evidence; new W29 surface
  records for all three frames are appended (orbit probe + unlock
  record; family PUT + read-back record).
- The stale unverified `person-profile-family-light` record from
  W28's attempt 1 is marked `w29_superseded` rather than rewritten.
- `w28_recapture` gains a `w29_resolution` pointer; a top-level
  **`w29_recapture`** block carries the full resolution notes,
  attempt records, and environment incidents. The other W28
  declarations (live-crossing motion, chats-row family cue) are
  untouched — not W29 scope.
- Inventory block left exactly as W28 left it (it already
  undercounts disk: 125 root PNGs on disk vs its 107); the only
  disk delta from W29 is +1 file (the restored family-light frame)
  and the two in-place orbit replacements.

## Environment incidents (recovered; no shipped frame affected)

The :5433 Postgres this wave briefly shared was stopped by a
sibling wave, and /tmp (tmpfs, 512 MB) filled and panicked that
Postgres on a WAL write mid-seed. The wave moved to its **own**
Postgres 16 cluster on :5433 (data `/tmp/w29pgdata`), re-created
`opal_dev_r19w29`, re-ran all 113 migrations, restarted Phoenix,
and re-provisioned cleanly (seed 200/200) before any shipped frame
was taken. Contrary to the brief, sibling suites *were* running at
wave start (a vitest run and a backend `mix test`); they did not
touch :4000/:5173, and the capture polling was generous regardless.

## Artifacts

- Frames: `shots/repair19/pack-v2/orbit-sheet-dark.png`,
  `orbit-sheet-light.png`, `person-profile-family-light.png`
- Scripts, results, logs: `~/workspace/opal-graph/w29-scratch/`
  (`w29-capture.mjs`, `w29-orbit-retry.mjs`, `w29-maya-probe.mjs`,
  `results.json`, `results-orbit2.json`, `logs/`)
- No application code changed; nothing pushed. The capture stack
  (Phoenix, vite preview, wave Postgres) was stopped after the
  manifest update.

**Gates unchanged: FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO.**
