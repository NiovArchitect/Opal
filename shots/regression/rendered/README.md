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

## Design-system law additions (founder, 2026-10-18 03:45 PDT)

The Layout Contract gained L8 (presence discipline), L9 (color
continuity), and L10 (motion has meaning) — see
`apps/opal_web/src/theme/layoutContract.css`. This stage is their
rendered enforcement. Three evidence requirements are added to every
full run, in BOTH modes:

1. **Dynamic-asset enter/exit evidence.** For every asset in the L8
   registry (Next Together strip, Check-availability pill, proposal
   cards, check-in ask cards, care-missed surface, proactive
   suggestion cards, Center presence states, completion step panels,
   story rings / live badges), the run captures the surface in the
   trigger-true state AND in the trigger-false state. The asset must be
   present in the first and ABSENT — not dimmed, not collapsed, not
   half-hidden behind another element — in the second. A capture
   showing a dynamic asset with no live reason is a FAIL of the whole
   pack ("no debris" rule).
2. **Entity color-continuity evidence.** For at least one plan and one
   person, the run captures the entity's state color / accent on at
   least TWO surfaces (e.g. chats list + thread, graphs list + graph
   detail) and asserts the computed color values match exactly across
   surfaces and across modes (luminance may differ per mode tokens;
   the semantic token must be the same). A plan whose color identity
   changes between screens fails.
3. **Motion-meaning spot check.** Presence/color transitions observed
   during the run must each correspond to a real state change in the
   run's API record (a plan stage transition, a proposal decision, an
   ask answered). Decorative motion with no state change behind it is
   recorded as a note for the founder's judgment; a looping attention
   animation on a rest surface is a FAIL under the QUIET law.

These additions run against the integrated shell first on the Mac
preview stack; until that run exists they are PENDING-RUN in
`shots/repair18/COMPLAINT_LEDGER.md` (sweep (a) extension), never
pre-claimed.

## Journey completeness gate (founder, 2026-10-18 03:46 PDT)

Layout Contract L11: every asset declares its journey (entry, action,
goal, landing). This stage enforces it on the real path:

4. **Per-page journey audit.** For every page/surface in the run, each
   visible tappable asset is exercised and its flow traced to its
   declared landing (per the L11 registry in `layoutContract.css`).
   The audit records, per asset: entry surface, taps taken, terminal
   state reached, and the read-back (the effect visible on the landing
   surface or in the API record). An asset whose flow dead-ends, loops
   without reaching its goal, hands off to nothing, or lands somewhere
   other than declared is classified **FALSE** under the
   full-true-functionality law and fails the pack. Ambient assets are
   audited for the one tap they declare (e.g. the Next Together strip
   lands on the plan it names) and must take no others.

Status: PENDING-RUN with the rest of the integrated-shell rendered
evidence (see `shots/repair18/COMPLAINT_LEDGER.md`, sweeps (a)/(b)
extension), never pre-claimed.

## Communication-model gate (founder UX bar, 2026-10-18 03:48 PDT)

Layout Contract L12 + `coordination/repair18/communication-model.md`:

5. **Copy/voice sweep.** Every capture is read, not just measured. A
   surface FAILS if any user-visible text is an internal state, an enum
   value, machine jargon, or raw error text; if a status is shown that
   the user cannot act on; or if a long-running operation is represented
   by a bare spinner / unchanging "loading" with no checkpoint words.
   For every long-running in-app operation exercised in the run (plan
   execution, search, sweep send), the run must capture at least one
   mid-operation CHECKPOINT state (what is done / happening / remains,
   in human words), not only the terminal state.

Status: PENDING-RUN with the integrated-shell rendered evidence,
never pre-claimed.
