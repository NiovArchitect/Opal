# Repair #18 - rendered stage (the standing-gate stage)

Standing gate (founder, 2026-10-17, after Walk #4 was rejected):
**NO WALK WITHOUT RENDERED PROOF** - before any founder handover,
screenshots of the ACTUAL SERVED APP at phone viewport, every
primary surface, BOTH dark and light modes. Three founder walks
died on the rendered layer while API/jsdom proof said green. This
stage is the permanent institutional fix: it drives the real served
web app in a real Chromium, against the real backend, through the
same entry and session provisioning the founder walk uses.

It complements the API stage (`../run.mjs`); it does not replace it,
and it never touches its semantics. API green + rendered red =
NOT handable-over. That is the law this stage encodes.

## Layout

- `run-rendered.mjs` - the stage runner (surface pass + rendered
  cases; exit 0/1/2 with the same meaning as `../run.mjs`).
- `surfaces-run.mjs` - the per-surface screenshot pass.
- `lib/browser.mjs` - stack config, session provisioning (imports
  `../lib/harness.mjs` - sessions and founder seed are never
  reimplemented), authenticated/anonymous contexts, theme setup.
- `lib/surfaces.mjs` - the primary-surface map: navigation recipes
  (dock taps and in-app controls only) + ready selectors.
- `lib/geometry.mjs` - in-page probes: bounding-box overlap,
  horizontal overflow / viewport escapees, text clipped by
  ancestors, per-card clipping and background bleed, and
  elementFromPoint hit-tests (nothing traps a tap target).
- `cases/` - rendered cases (`*.case.mjs`), discovered like the API
  stage's cases. W4-02 and W4-03 live here.
- `<build-tag>/` - one output folder per run: `manifest.json`
  (surface x mode pass/fail + build ref), `results.json` (rendered
  cases), `<surface>-<mode>.png` screenshots, `cases/<id>/*.png`.

## Surfaces x modes

Anonymous (fresh context, founder checkpoint entry
`?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1&opal_dev=1`):
splash-1, splash-2 (Promise / onboarding entry).

Authenticated (member shell, entry
`?opal_founder_seed=1&opal_native_host=1&opal_dev=1`):
home-social, center-rest, center-chat, chats-list, thread,
plan-detail (thread Next Together strip -> detail), graphs-list,
graph-detail (Graphs card -> detail), you-hub.

11 surfaces x 2 modes = 22 screenshots per run. A surface that
fails to load is a FAIL in the manifest, never a skip.

## Auth honesty

Sessions come from `../lib/harness.mjs loadSessions()` - the minted
walk-session file on staging, or synthetic activation-API
provisioning on local/dev stacks - and the founder seed is run
through the same backend seed endpoints as the API stage. The
browser receives the real backend-issued token through the app's
OWN persistence keys (the keys `productClient.ts` writes after a
real OTP verify: localStorage profile + sessionStorage bearer +
first-run-done flag). No DOM state is fabricated and no surface
paints anything the live API did not return. The OTP typing itself
is not re-performed here; it is covered by the first-run/phone
checklist cases. Theme is set through the app's own appearance
storage key plus Playwright's colorScheme emulation, and the
resolved `data-theme` is asserted to equal the mode under test.

## Running

One-time setup (suite-local):

```sh
cd shots/regression && npm install   # playwright-core; Chromium
                                      # build is the cached one under
                                      # ~/.cache/ms-playwright
```

Against a local stack (backend :4300, Vite :5373 in the recorded
first run; any ports work):

```sh
export OPAL_API_BASE=http://127.0.0.1:4300
export OPAL_WEB_BASE=http://127.0.0.1:5373
export OPAL_SEED_MODE=1
export OPAL_SESSION_PROVISION=synthetic
export OPAL_PHONE_A=+12025550101 OPAL_PHONE_B=+12025550102
export OPAL_BUILD_TAG=6d081ce0-base   # names rendered/<tag>/
node shots/regression/rendered/run-rendered.mjs
node shots/regression/rendered/run-rendered.mjs --surfaces-only
node shots/regression/rendered/run-rendered.mjs --cases-only --case W4-02
```

Against the Mac staging stack: same variables, with
`OPAL_WEB_BASE` / `OPAL_API_BASE` pointed at the staging stack and
`OPAL_MINTED_SESSIONS_JSON` set instead of synthetic provisioning -
the same configuration mechanism as the API cases.

## Local-environment notes (learned on this VM, 2026-10-18)

- Vite's dev proxy hardcodes `/socket` (and initially `/api`) to
  `http://127.0.0.1:4000`. The stage rewrites browser-side API calls
  to `OPAL_API_BASE` when the backend is NOT on :4000, but it cannot
  rewrite the WebSocket. If :4000 is dead or held by an unrelated
  process, the app's boot/list/thread paints stall behind the
  socket and the client shows its own "Opal took too long to
  respond" state. On a correctly proxied stack (staging) none of
  this arises. On this shared VM, thread surfaces are the first
  casualty - see the phase-2 report for the run-by-run record.
- The chats list's error state is worked through the app's own
  "Try again" button (`waitRowsWithRetry`), the same recovery a
  user has; the error state itself counts as a FAILED load.
- List rows are walked like a user taps them: graph rows open the
  graph conversation, human rows open `member-conversation`; the
  opener tries rows in order until a human thread is open.
- Inactive panes keep duplicate `data-testid`s mounted; every
  locator in this stage targets the `:visible` copy.

## The Walk #4 rendered cases

- `W4-02` thread composition - Next Together strip vs message
  bubbles (bbox intersection), Check-availability pill vs bubbles,
  header/banner layout occupation (no banner intersecting the
  header, first bubble below the header), horizontal escapees,
  hit-tests on strip / composer send / back.
- `W4-03` card integrity - per-card full-text visibility (vertical +
  horizontal clip, ancestor clip; ellipsis truncation is a note for
  the screenshot judgment, hard clips fail), card height fits
  content, no background bleed outside a card, no card outside its
  list container; repeated on graph detail.

Both are expected to FAIL on the pre-fix build - that failing-first
evidence is the deliverable of their first run (see
`6d081ce0-base/`). The same cases must pass, unweakened, once the
sibling layering/card fixes integrate.

## Design-escalation note (2026-10-17 23:27)

No surface is protected in this stage: praise is a floor, not a
freeze. The probes (overlap, clipping, hit-test) run identically on
Center, chats and the call thread as on every other surface, and a
redesign that changes every hue still has to pass the same geometry
law - strict containment, one stacking order, tapped surfaces
surface, nothing trapped.
