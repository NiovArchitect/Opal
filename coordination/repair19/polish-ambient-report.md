# Repair #19 — Founder Polish Wave — Cluster E Finisher: Ambient at Rest (P7)

**Branch:** `muse/r19-polish-ambient` (base `95319bd7` = Repair #19 final tip).
**Worktree:** `wt-polish-ambient`. **Not merged, not pushed.** FOUNDER_ACCEPTED = NO.
**Founder ask (2026-10-19 16:27 PDT):** in stills, ambience reads mainly behind the
Your-move card; raise AT-REST ambient legibility on Home/social and the Center deck —
state glows readable at rest, social room light present in a still — strictly within
the Ambient Rulebook's rest-intensity envelopes.

## State of the branch on audit arrival

A prior worker on this task was killed by a runtime restart after committing
`815835f8` ("R19 polish P7: at-rest ambient legibility to the Rulebook envelope top")
and before writing any report. Worktree was clean. This report is the audit of that
commit plus the fix-up work below.

- `815835f8` — the at-rest raise (audited, verdict: **SOUND in production code —
  ship**, with one stale test pin and two guard gaps found and repaired; see below).
- `33e575af` — audit follow-up (this worker): guard-test strengthening only, no
  production CSS/TSX changed.
- `cbed1134` — audit follow-up (this worker): repair of the stale `--pa-state`
  pin in `r19CallLog.test.tsx` that the full suite caught (Tests section).
- `f79ba300` + `fe890716` — sibling commits landed on this branch during the
  verification window (N5 toggle ambience + an unrelated E2 fix); `f79ba300`
  is audited in the Appendix. Branch tip at report time: `fe890716`.

## Audit verdict on 815835f8 — per-rule authorization table

Envelope law is **AR-00.2 (QUIET budgets)**: fills 6–20%, border mixes 42–55%,
glows ≤ 18px at ≤ 55% strength, at most one lit (fire) element per surface.
Every added value in the commit was extracted mechanically from the diff and
checked against the envelope; **no added value exceeds it, no added line contains
a fire/iris/gradient token, a raw hex, or any animation** (verified by grep over
the commit's added lines).

| # | Change (file) | Before → After | Authorizing rule | Information the light carries |
|---|---|---|---|---|
| 1 | Chats rows, legacy shell §2 + C1 rows §5 (`theme/unifyChats.css`): state glow for action/ready/forming/happening | `0 0 12px @ 40%` → `0 0 16px @ 55%` of `var(--orb-indicator-<state>-glow)` | AR-00.2 (glow ceiling 18px/55%); AR-09 chats-row state edge | "This conversation holds a plan in state X" — the row's plan state, readable in a still list scan |
| 2 | C2 plan-card register §6 (`unifyChats.css`): action border | 42% → 52% of `--orb-indicator-action` | AR-00.2 (border mixes 42–55%); AR-02 | Action-needed's perimeter read joins the other states' 52% register — one consistent border strength per surface |
| 3 | C2 plan-card register §6: action glow | `14px @ 45%` → `18px @ 55%` | AR-00.2 ceiling, exact; AR-02 | "This one needs you" — the card's action state at rest |
| 4 | C2 plan-card register §6: ready glow | `14px @ 50%` → `18px @ 55%` | AR-00.2 ceiling, exact; AR-02 | "Earned, warm, good to go" — the card's ready state at rest |
| 5 | C2 plan-card register §6: forming tinted ground | 7% → 12% over `--surface-1` | AR-00.2 (fills 6–20%); AR-02 | Forming's violet ground step — still taking shape (pattern channel: dashed border, unchanged) |
| 6 | C2 plan-card register §6: ready tinted ground | 6% → 12% over `--surface-1` | AR-00.2 (fills 6–20%); AR-02 | Ready's warm ground step at rest |
| 7 | PlanAwareness §1 (`unifyChats.css`): fill | 9% → 14% of `var(--pa-state)` | AR-00.2 (fills 6–20%); AR-01 | The thread/awareness element's plan state — fill channel |
| 8 | PlanAwareness §1: glow | `0 0 10px @ 12%` → `0 0 16px @ 25%` of `--pa-state` | AR-00.2 (≤18px, ≤55%); AR-01 | Same state, glow channel — deliberately kept mid-envelope because the element already carries border (52%) + fill + pill |
| 9 | PlanAwareness strip variant §1: glow | `0 1px 12px @ 14%` → `0 1px 16px @ 28%` of `--pa-state` | AR-00.2 (≤18px blur, ≤55%); AR-01 | The thread strip's one plan element — its state, under the strip |
| 10 | Center presence halo (`.c2s-center-rest`, `c2/shell/c2shell.css`) | ring-metal radial 7% → 14% | AR-00.2 (fills 6–20%); AR-12/AR-13 presence | **Presence only, no state:** "the room is lit because Opal is here" on the Center deck, in a still. Token is `--orb-ring-metal` (mode-invariant, `theme/orbTokens.css`), never a state hue |
| 11 | Home room light (NEW, `.c2s-scroll[data-testid="c2-home-scroll"]`, `c2shell.css`; registered in `HOME_AMBIENT_ELEMENTS`, `C2Home.tsx`) | none → static ring-metal radial, 10% at the head of Home's scroll, over `--canvas` | AR-00.2 (fills 6–20%); AR-00.3 justification (reason recorded in code, tested by `homeSocial.test.tsx`); AR-12/AR-13 presence | **Presence only, no state:** "the social room is lit because Opal is present in it" — the founder's 'social room light present in a still', answered with the orb's own ring metal so it cannot be misread as any plan's state (indicator law) |
| 12 | C1 happening halo ring (`opalUi/c1/c1.css`) | `0 0 0 3px` ring @ 30% → 45% of `var(--state-happening)` (post-AT-02, an alias of canon cyan) | AR-00.2 (ring treated under the border-mix band 42–55%); AR-F5/AT-15 pattern channel | Happening's **pattern** (double ring vs ready's solid single) readable in a still/greyscale on C1 cards, where the halo is the card's only outer treatment — see Asymmetry note |

**Untouched, verified by diff:** FireFrame / ignition (`brand/orb/orb.css`, AT-04/AR-F1)
— zero diff; the lit reveal remains the only flame (AT-08). AT-10 coalescence:
the capped card (`[data-lit="capped"]`) still sheds glow/ground — pinned by the new
guard. Past (AR-10): no past block in any touched sheet gained a glow. No new hue
anywhere: every raised value derives from the canon `--orb-indicator-*`,
`--pa-state` (= `PLAN_STATE_HEX` via the component), `--state-*` (canon alias
post-AT-02), or `--orb-ring-metal` tokens.

**Reduced-motion + light-mode parity (AR-00.6):** all twelve changes are static
`background`/`box-shadow`/`border` treatments — no animation was added, so there
is nothing for reduced motion to kill and no meaning rides on motion. The presence
tokens (`--orb-ring-metal`) are mode-invariant; the state tokens are the canon
family, mode-invariant by the AT-02 convergence. Meaning survives statically in
both modes by construction.

**Asymmetry note (audited, kept):** the C2 happening halo (in `unifyChats.css` §6)
stays at 30% while the C1 halo rose to 45%. This is per-surface compensation, not
drift: the C2 card pairs its 30% halo with a 16px @ 55% happening glow, so the
pattern already reads; the C1 card's halo is its *only* outer treatment (no
companion glow exists in `c1.css`), so the pattern channel needed the strength.
Both values are inside the envelope; the pattern (double ring) and its token are
identical. Recorded here so a future reader does not "fix" it blind.

## What this audit completed / fixed

1. **The missing report** (this file) — the prior worker died before writing it.
2. **Guard gaps in `theme/ambientRest.test.ts`** (commit `33e575af`, tests only):
   the original guard scanned only `--orb-indicator-*-glow` mixes in
   `unifyChats.css`. Added 4 tests (8 → 12):
   - `--pa-state` family: the raised plan-awareness glows pinned exact
     (16px @ 25%; strip 16px @ 28%) and the whole family capped at 55% mix /
     18px blur.
   - Every `--orb-ring-metal` mix in `c2shell.css` capped at 55%.
   - No state `box-shadow` mix in `c1.css` above 55%.
   - AT-08 purity for **both** presence fields (Home room light + Center halo):
     ring-metal only — no indicator, fire, gradient, entity-tint, or any state
     token, and no `animation` (static-parity pin).
3. **One stale test pin repaired** (commit `cbed1134`): `815835f8` raised the
   PlanAwareness fill 9% → 14% and updated the twin pin in
   `unifyDrift.test.ts`, but missed the identical pin in
   `src/opalUi/c1/r19CallLog.test.tsx`. The full web suite caught it (it was the
   one failure above the floor — see Tests). Pin updated to 14%; the file is
   green standalone (12/12), and a sweep of every test file for all other
   pre-P7 values found no further stale pins.
4. **Nothing in `815835f8`'s production code needed fixing.** No out-of-bounds
   value, no fire spend, no drift was found; no CSS/TSX was changed by this audit.

## Alternatives considered (novelty note)

- **Raise the C2 happening halo 30% → 45% to match C1** — *rejected.* The C2 card
  already stacks halo + 16px/55% glow; raising both channels spends loudness the
  QUIET budget doesn't need spent, and the asymmetry is compensation (see note
  above), not inconsistency.
- **Extend the ring-metal room light to the Chats scroll head** — *rejected.* The
  legacy chats shell carries a recorded founder audit decision (2026-10-18, in
  `unifyChats.css` §2's own comment): an ambient wash there "answered to no live
  condition and told the user nothing" and was removed. Chats presence is already
  carried by the raised per-row state glows themselves. Re-adding a wash would
  contradict a standing founder ruling, not extend the language.
- **Key the Home room-light intensity to the strongest live state** — *rejected.*
  That would make room light carry state — indicator drift of exactly the kind
  AT-08/AT-09 charge, and the dock orb already carries state-keying (AT-06 fix).
  Presence-only is the design point of both presence fields.
- **Pick:** the committed set (state light raised on the state-bearing elements;
  presence light, in ring metal only, on Home + Center) + the strengthened
  guards. No novel treatment beyond the envelope was needed to answer the ask;
  the Home room light *is* the wave's novel Opal-native treatment, and it is
  presence keyed to the orb's own material rather than to any borrowed hue.

## Rulebook questions (NOT shipped — founder's call)

1. **Live-card register:** the Home live card (AR-07) already sits at the envelope
   top (16px @ 55% happening glow, `c2shell.css`). No headroom question — noted
   only to record it was checked and deliberately left.
2. **C1 plan cards carry no glow at all** (border-only, 52%, in `unifyChats.css`
   §5/`c1.css`). Bringing C1 cards to the C2 register (adding an 18px @ 55% glow)
   is *inside* the envelope, but it changes the C1 surface's established
   border-only grammar (AR-01's recorded intensity is "border only, no glow") —
   that is a Rulebook amendment (AR-01 entry), not a token raise, so it was not
   shipped under this brief.
3. No other beyond-envelope desire was encountered during the audit.

## Tests + exact results

Environment: `apps/opal_web`, `node_modules` present (no `npm ci` needed).

- Ambient lineage (this worker, at `33e575af` content for ambientRest; other files
  at `815835f8`):
  `npx vitest run src/theme/ambientRest.test.ts src/theme/unifyDrift.test.ts src/c2/planCardAtfix.test.tsx src/c2/shell/harmony2.test.tsx src/brand/orb/orbTokens.test.tsx src/brand/orb/orbLivingRings.test.tsx src/c2/shell/deckfix.test.tsx src/c2/shell/homeSocial.test.tsx src/theme/planStateColors.test.ts src/theme/signatureKeys.test.ts src/opalUi/c1/dir1PlanAwareness.test.tsx`
  → **11 files passed, 141 tests passed, 0 failed.**
- Guard follow-up standalone: `npx vitest run src/theme/ambientRest.test.ts`
  → **1 file passed, 12 tests passed** (was 8 before `33e575af`).
- Typecheck: `npm run typecheck` → **exactly 9 errors**, all pre-existing and
  untouched by this branch: `src/OpalApp.tsx` ×3 (TS2345 `"opal"` vs `Tab`),
  `src/api/productClient.ts` ×5 (duplicate `plan_type`/`online`),
  `src/opalUi/YouSettingsDestination.tsx` ×1 (TS2339 `handle`). Matches the floor.
- Full web suite, run 1 (at `815835f8`+guard edits): `npm test` →
  **24 failed / 17 files** — one above the 23/16 floor; the tail failure was
  identified as the stale `r19CallLog` pin (item 3 above), not a production
  regression.
- Full web suite, run 2 (after `cbed1134`): `npm test` →
  **23 failed / 16 files (1762 passed / 1785)** — **exactly the floor; the
  failing set did not grow.** Failing files (all pre-existing, none
  ambient/settings): activation, designTokens, availability, firstRun,
  authorityRejectedStates, grammar, graphCalendaring, graphDetail, graphScroll,
  graphSpine, liveJourneyProof, technicolorProduction, waveBChatsExact,
  waveBGraphsExact, waveBHomeExact, pasteW4DeviceFixes. Honest caveat: run 2
  overlapped two sibling commits landing on this branch mid-run (`f79ba300`
  N5, `fe890716` E2 — see Appendix); the ambient/settings suites were
  therefore re-verified clean at the final tip in the Appendix run below.
- Typecheck re-run at final tip `fe890716`: **exactly 9 errors** (unchanged).

## Declared not-done

- **No pack captures** (per brief) — frame list below is for the integrator.
- **No rendered-layer proof of the raised values.** All verification here is
  source + test-pin level; the integrator's frames are the rendered proof.
- No merge, no push, no ledger edits. `muse/repair-17` untouched.
- C1-card glow question (Rulebook question 2 above) not implemented.

## FRAME LIST for the integrator

Recipe for all frames: served app from branch tip `fe890716` (web `:5173`, API
`:4000`), human seed world (build stamp must read the polish tip), fresh seeded
account, viewport **390×844**, capture at rest (no interaction for ≥1s before the
shot, animations settled). Mode toggle via Settings → Appearance.

1. **Home at rest — dark** (`home-rest-dark.png`): sign in → dock **Home**
   (`c2-dock-home`). Frame must show: the ring-metal room-light wash at the head
   of the scroll (`c2-home-scroll`), the story rail, and at least one plan card
   per state present in the seed (forming dashed violet / action red weighted
   edge / ready gold ground) with glows readable at rest. Do not scroll.
2. **Home at rest — light** (`home-rest-light.png`): same account, same scroll
   position, Appearance → Light. Same reads must survive: wash present (ring
   metal is mode-invariant), state glows at the same strengths.
3. **Center deck at rest — dark** (`center-deck-rest-dark.png`): dock **Opal**
   (`c2-dock-center`) → the Center landing/deck. Frame must show the presence
   halo field around the Opal mark (`c2s-center-rest`, now 14%) and the deck's
   plan cards in the raised C2 register.
4. **Center deck at rest — light** (`center-deck-rest-light.png`): same surface,
   Appearance → Light. Halo and card register unchanged in strength.
5. **AT-04 ignition pair** (same lit reveal, two moments): open the seeded
   thread carrying the unanswered YOUR MOVE reveal (or the Center deck lit
   reveal, as in pack-v2 `center-deck-lit-reveal-*`). Capture (a) **ignition**:
   within the first ~150ms of the reveal mounting (glow bloomed toward 24px,
   travel segment on the ring); capture (b) **settled**: same frame ≥1.2s later
   (resting 16px glow). Purpose: prove P7 did not touch ignition — (b) must
   match the pre-P7 resting composition pixel-for-pixel in the frame's border
   ring, and (a) must still ignite exactly once.
6. **Ambient state-transition pair** (forming → ready): two seeded accounts.
   Viewer (account A) sits on **Home** with the seeded forming plan card visible;
   capture **before**. Partner (account B) completes the acceptance that crosses
   that plan to ready (the AT-03 realtime path). Capture **after** on A without
   A interacting: dashed violet + 12% violet ground + breath → solid gold +
   12% gold ground + 18px @ 55% glow, repainted live. Purpose: the raised rest
   register reading *as a crossing*, in a still pair.
7. **N5 toggle answer pair** (Appendix): Settings → **Calls & Opal Assist** →
   the **Opal Assist on calls** switch (`you-setting-row-assist`). Capture
   **off** (settled grey track, no glow), flip it, capture **on** in the same
   session (cyan track lit + 12px glow + 3px ring). Flip back and capture
   **off** again — the settled state must be identical to the first frame.

---

## Appendix — Founder Screen Note N5: Toggle Ambience (audit of `f79ba300`)

**Provenance, stated plainly:** while this audit's full-suite verification was
running, the N5 implementation was committed onto this branch by a sibling
worker as `f79ba300` ("R19 polish N5: toggles answer in light — shared control
ambience"), followed by an unrelated cluster commit `fe890716` (E2). This
appendix is my independent audit of `f79ba300` against the N5 scope, its
verification at the branch tip, the remaining application points the scope
asks to have named, and the Rulebook micro-entry draft (scope item 3 — no
micro-entry accompanied the commit, so it is supplied here).

### Audit verdict on `f79ba300`: SOUND — within envelope, no fixes needed

| Scope item | What shipped | Verdict |
|---|---|---|
| (1) Shared token layer | `theme/c2Tokens.css` base `:root`: `--control-on: var(--orb-indicator-happening)` + `--control-on-glow: var(--orb-indicator-happening-glow)` — defined exactly once each, mode-free (canon hues are mode-invariant; the glow token resolves per-mode in `orbTokens.css`) | ✓ Canon aliases only; no decorative hue introduced |
| (2a) C2 shared toggle | `.c2s-toggle` (`c2shell.css`): ON = `var(--control-on)` track/border + `0 0 12px` glow @ 55% of the glow token; OFF = neutral track, `box-shadow: none` (settled); the pre-N5 `--accent-1` sampled brand-violet ON is retired as indicator drift | ✓ Inside AR-00.2 (12px ≤ 18px, 55% = ceiling) |
| (2b) Settings shared toggle | `.you-settings-toggle` (`styles.css`): ON = same token treatment (canon hex only as `var()` fallback) + the pre-existing 3px ring re-expressed at 22% of the token; the later `[aria-checked="true"]` twin rule — which wins the cascade for switch-role toggles — brought into exact agreement, its flip transition cut 280ms → 160ms; `.you-hub-consent` variant agrees | ✓ This is the switch under **every** Settings room, including the founder's example: the Opal Assist switch (`YouSettingsDestination` row id `"assist"`, Calls & Opal Assist) |
| Re-key hook | `data-control-state="<state>"` rules in both sheets re-key both tokens to any canon state's pair (action/ready/forming/happening/past) | ✓ Mechanism shipped; **no component sets it yet** (honest note — defaults govern everywhere today) |
| Motion | Flip at 160ms (`--motion-tab` in C2; 160ms in the settings sheet) — the QUIET register AR-01's 220ms crossing sits in; no loops, no layout | ✓ |
| Reduced motion (AR-00.6) | Both sheets: toggle (+ knob / ::after) `transition: none` under `prefers-reduced-motion` — instant swap, **same colors** | ✓ Pinned by guard |
| Guard | `theme/controlAmbience.test.ts` (11 tests): token uniqueness/mode-freedom, both components, envelope ceiling scan across both sheets, reduced-motion regexes, Assist-on-shared-component pin | ✓ Well-formed |

**Design question the commit decided, recorded for the founder:** the default
control color is the **happening** canon pair, on the stated reasoning "a
switched-on behavior is live now." Under AR-00.9 that claim is true of the
control itself (the behavior really is on), and the founder's N5 text asks for
"the state color of the controlled behavior" — but it does mean the happening
hex now also reads as "a behavior is enabled" on settings surfaces. If the
founder would rather control-ON have its own non-state identity (e.g. the
orb's ring metal / fire violet the C2 toggle used before, under a
`--control-on` token that is *not* a canon alias), that is a one-token change
in `c2Tokens.css` plus guard updates — a Rulebook question, not shipped here
either way.

**N8 protection respected:** no Settings room markup or room CSS was touched —
Appearance, Location & Travel, and Privacy receive the treatment only because
their toggles are `.you-settings-toggle` instances; the one visible change in
the C2 shell is the `.c2s-toggle` ON hue (brand violet → canon cyan), which is
the drift retirement the commit names.

**Sliders:** no `input[type="range"]` or shared slider component exists in the
product — toggles are the only shared control family; nothing to apply.

### Remaining application points (for the integrator's record — NOT treated)

Complete switch inventory (`role="switch"` + checkbox toggles) at tip:

| Point | Form | Status |
|---|---|---|
| `YouSettingsDestination.tsx` ×5 rows (incl. Opal Assist, messages-calls, read-receipts, consent, fit-share) | `.you-settings-toggle` | **Treated** (shared) |
| `C2You.tsx` ×3 (quiet hours + settings rows) | `.c2s-toggle` | **Treated** (shared) |
| `RelationshipPicker.tsx:232` — Close-circle switch | bespoke full-row button (`.c2s-sheet-row`, `r19-close-circle-toggle`) | Not treated — row-as-switch; applying the treatment means giving the row a lit state, a design decision for its owner |
| `onboarding/FirstRunExperience.tsx:1274` | native checkbox in first-run flow | Not treated — onboarding's own grammar; first-run surfaces were out of N5's settings scope |
| `opalUi/GraphConvoyPanel.tsx:214` | native checkbox | Not treated — bespoke panel control, no shared class |

### Verification at final tip `fe890716`

`npx vitest run src/theme/controlAmbience.test.ts src/theme/ambientRest.test.ts src/theme/unifyDrift.test.ts src/c2/planCardAtfix.test.tsx src/c2/shell/harmony2.test.tsx src/c2/shell/deckfix.test.tsx src/c2/shell/homeSocial.test.tsx src/c2/shell/settingsArchitecture.test.tsx src/theme/c2Tokens.test.ts src/opalUi/c1/r19CallLog.test.tsx src/brand/orb/orbTokens.test.tsx`
→ **11 files passed, 160 tests passed, 0 failed** (controlAmbience 11/11
included). Typecheck at tip: exactly 9 pre-existing errors (unchanged).

### Draft Rulebook micro-entry (for `ambient-rulebook.md`, founder's naming)

> **AR-18 — Control answer ("a control answers in light") · SHIPPED (N5)**
> - **Where:** every behavior-changing toggle on a shared component —
>   `.you-settings-toggle` (all Settings rooms, incl. Opal Assist on calls)
>   and `.c2s-toggle` (C2 You/shell). Bespoke switches are named in
>   `polish-ambient-report.md` and join only by adopting a shared class.
> - **Behavior:** ON lights the track in the controlled behavior's canon
>   state color (`--control-on`, token layer `c2Tokens.css`; default
>   **happening** — a switched-on behavior is live now) plus a glow of
>   `0 0 12px` at 55% of the behavior's glow token (and, on the settings
>   switch, its settled 3px ring at 22%). OFF is **settled**: neutral
>   track, no glow, no ring. A control whose behavior carries a different
>   true state re-keys both tokens via `data-control-state`.
> - **Envelope:** AR-00.2 QUIET — glow ≤ 18px at ≤ 55% (shipped 12px/55%);
>   flip transition 160ms one-shot, no loops, no layout motion.
> - **Meaning:** "This behavior is on and working" / "this behavior is
>   off" — the flip *answers*: the user sees the state they just caused,
>   in the ambient language, at the point of action.
> - **Channels (AR-00.5):** color + glow / **knob position** (the pattern
>   channel — the answer reads in greyscale) / `aria-checked` state /
>   motion: the 160ms transition is transitional only, carries nothing.
> - **Static (reduced-motion) equivalent:** the identical colors applied
>   instantly (transitions killed in both sheets) — AR-00.6 parity.
> - **Ethical bound (AR-00.9):** the light reports the control's true
>   projected state only — the C2 toggle renders the projected value and
>   never flips locally, so the light can never claim a state the record
>   doesn't hold. Plan-state hues reach a control only through the
>   `--control-on` canon alias or an explicit `data-control-state`
>   re-key — never as raw decoration (the retired brand-violet ON was
>   exactly that drift).
> - **Open question (founder):** the default's happening identity — see
>   the audit note above.

---

## INTEGRITY ADDENDUM — Cluster E2 follow-up (authored by the E2 worker)

**Why this addendum exists.** A prior finisher's chat-level summary claimed
work that was never in this repository: an N5 toggle implementation commit
`a964f2e4`, a "fix wave" `59e58716` / `5a9446fc`, a claimed scratch artifact,
and a suite verdict "FULL_WEB_SUITE_OK at 1,783 passed". The integrator
charged those claims on the record. This worker re-verified independently at
the source on arrival:

- `git cat-file -t a964f2e4`, `git cat-file -t 59e58716`,
  `git cat-file -t 5a9446fc` → all three: **"fatal: Not a valid object name"**.
- `git log --oneline 95319bd7..HEAD` on arrival showed exactly the three real
  commits (`815835f8`, `33e575af`, `cbed1134`); the reflog showed no others.
- The report on disk at arrival was the earlier honest version, still ending
  in `FULL_SUITE_RESULT_PENDING`. The claimed scratch artifact was absent.

**Those post-`cbed1134` claims are retracted in full.** Everything below was
produced and read by this worker in this session; every SHA was verified via
`git log` / `git cat-file` on this branch, and every test figure is quoted
from a run this worker executed.

### What this follow-up actually built (real commits on `muse/r19-polish-ambient`)

- **`f79ba300`** — N5 toggle ambience (the implementation the Appendix above
  audits as SOUND; authored by this worker). Token pair + both shared toggle
  components + `theme/controlAmbience.test.ts` (11 tests). No TSX changed;
  no Settings room design touched.
- **`fe890716`** — the E2 shadow-composition fix (verdict (c) below) +
  `theme/shadowCardComposition.test.ts` (4 tests).
- Final branch tip: **`fe890716`** (frame-list tip reference above already
  updated to it). Not merged, not pushed; `muse/repair-17` untouched; no
  other worktree or branch touched.

Micro-entry: the AR-18 draft in the Appendix above ("a control answers in
light") is adopted as this wave's Rulebook micro-entry — this worker's draft
converged on the same text (meaning sentence: "This behavior is on, and this
is its light"). Supplementary application points beyond the Appendix's
`role="switch"`/checkbox inventory (neither is a switch, both are named so
they are not silently skipped): the **in-call** Assist control
(`opalUi/callAssist.tsx`, `call-assist-toggle`) is a labeled action button —
its state light already lives in `GraphingLight` beside it; and the
OrbitSheet private control (`opalUi/c1/OrbitSheet.tsx`,
`orbit-sheet-private-toggle`) is an `aria-pressed` text button with no
track. Sliders: zero `type="range"` / `role="slider"` in `src` — none exist
to treat; the `--control-on` pair is their assignment point when one ships.

### Latent-defect verdicts (each verified at the source by this worker)

**(a) "A ds-\* legibility guard errored ENOENT on a scratch path" —
UNFOUNDED.** No file, class, or test named `ds-*` exists in
`apps/opal_web/src` (find/grep: zero hits). The only legibility guard in the
tree, `src/theme/primaryButtonLegibility.test.ts`, reads exactly three
in-repo files via `resolve(WEB_ROOT, …)` (`src/theme/c2Tokens.css`,
`src/theme/orbTokens.css`, `src/styles.css`) — no scratch, coordination, or
/tmp path anywhere in its reads (grep for `scratch|coordination|/tmp` across
all test files returned no such read target). Run by this worker at this
branch: **7 passed (7)**. No ENOENT, nothing to fix.

**(b) "A dock bottom-clearance value (`--pad-bottom-clearance`, allegedly
14px) violates its own contract" — UNFOUNDED as stated; the real governor
measured compliant, no fix made.** `grep -rn -- "--pad-bottom-clearance"
apps/` → **zero hits**; the token does not exist. The 14px values near the
dock are TOP paddings (e.g. `styles.css`: `padding: 14px 16px
var(--dock-clearance)`), never a bottom clearance. Dock bottom clearance is
actually governed by **`--dock-clearance`**: C2 `theme/c2Tokens.css:65` =
`calc(var(--dock-h) + 16px + env(safe-area-inset-bottom))` (64 + 16 = 80px +
safe area); legacy `:root` `styles.css:52` = 86 + 18 + 48 = 152px + safe
area; native-host scope `styles.css` ≈17032 =
`var(--opal-primary-viewport-inset)` (base 74 + lift 0 + safe + gap).
Measured against its guards by this worker: `deckfix.test.tsx` (11) +
`unifyDrift.test.ts` (27) + `iphoneLayoutSystem.test.ts` (20) = **58
passed**, including the dock-halo-gap pin and the no-double-count rules. No
violation exists.

**(c) Dark-mode `--shadow-card` poisoning (A2's Chromium observation) —
REAL, FIXED in `fe890716`.** Source: `theme/c2Tokens.css` dark block set
`--shadow-card: none`, while `opalUi/c1/CallLog.css:48-50` composes it into
a shadow LIST — `box-shadow: 0 0 10px color-mix(in srgb, var(--call-state)
12%, transparent), var(--shadow-card);`. `none` is a valid box-shadow only
as the sole value; inside a list it invalidates the entire declaration at
computed-value time, so in dark mode the call row's whole box-shadow
computed to NONE and its state glow layer never painted (A2 measured this
in real Chromium at 390px; the in-row pill carried the state there). Light
mode was unaffected. Scope: grep over all `src` CSS shows CallLog.css is
the ONLY list consumer of `--shadow-card`; every other consumer (c2.css,
c2shell.css, c1.css, OrbitUnlockPrompt.css) uses it as the sole value,
where `none` was valid. **Fix (token composition, `theme/c2Tokens.css`):**
dark `--shadow-card` is now `0 0 0 0 rgba(0, 0, 0, 0)` — a fully transparent
zero shadow that paints exactly nothing (the shadowless dark register /
night budget is unchanged) and composes safely as a list layer; the light
value is byte-identical. Guard: `theme/shadowCardComposition.test.ts`
(4 tests: neither mode may be `none`; both mode values pinned exact; the
CallLog composition pinned present; every list composition in `src`
rechecked against the token law). Frame-list addition for the integrator —
**frame 8: call-log dark glow (defect-(c) proof)**: Calls log, DARK mode,
390×844: a state-carrying call row must show its box-shadow glow layer
(pre-fix it computed to none); light mode unchanged.

### Verification at final tip `fe890716` (this worker's own runs)

- **New guards standalone:** `controlAmbience.test.ts` **11/11** +
  `shadowCardComposition.test.ts` **4/4** passed.
- **Ambient lineage battery** (20 files: both new guards, ambientRest,
  unifyDrift, primaryButtonLegibility, iphoneLayoutSystem, c2Tokens,
  planStateColors, signatureKeys, orbTokens, orbLivingRings, planCardAtfix,
  deckfix, homeSocial, harmony2, settingsArchitecture, smSoulMemory,
  WhatOpalCanDoSection, dir1PlanAwareness, r19CallLog): **20 files passed,
  245 tests passed, 0 failed.**
- **Typecheck** (`npm run typecheck`): **exactly 9 errors**, the
  pre-existing floor set — `OpalApp.tsx` ×3 TS2345 `"opal"` vs `Tab`;
  `productClient.ts` ×5 (duplicate `plan_type`/`online`);
  `YouSettingsDestination.tsx` ×1 TS2339 `handle`. No new errors.
- **Full web suite:** two single-invocation `npm test` attempts were killed
  by runtime restarts (first: SIGTERM/exit 143 at ~81 files logged; second,
  detached: reached 152/230 files before a restart) — stated plainly rather
  than papered over. The completed measurement is the sum of two disjoint
  `vitest run` invocations at the same final tip covering **all 230 test
  files**, quoted exactly:
  - Half A (non-`opalUi` dirs + root files, 91 files): `Test Files  5 failed
    | 86 passed (91)` / `Tests  7 failed | 724 passed (731)`. Failing files:
    activation, designTokens, availability, onboarding/firstRun,
    theme/technicolorProduction.
  - Half B (`opalUi` + experience/media/people/time, 139 files):
    `Test Files  11 failed | 128 passed (139)` / `Tests  16 failed | 1053
    passed (1069)`. Failing files: authorityRejectedStates, grammar,
    graphCalendaring, graphDetail, graphScroll, graphSpine,
    liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact,
    waveBHomeExact.
  - **Combined: 23 failed / 16 files, 1,777 passed (1,800)** — exactly the
    base floor (23 failed / 16 files, 1,750+ passed); **the failing set did
    not grow**, and its 16 files are name-for-name the same set the report
    owner's run 2 lists in the Tests section above (independent
    cross-check). Every failure inspected is a pre-existing authority/data
    pin in files this branch's diff (3 CSS sheets + 2 new test files) cannot
    reach — e.g. designTokens' Figma node id `327:5` vs pinned `217:2`,
    technicolorProduction's signal→state map, waveBChatsExact's TSX routing
    pins; none reads a toggle or shadow rule.
