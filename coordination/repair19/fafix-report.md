# Repair #19 — W25-FAFIX: the two CHARGED functional findings, fixed

**Directive:** W22's functional accountability statement charged two
do-not-ship findings — FA-01 (J4: the served Chats search is a dead
control) and FA-02 (J7: the orbit unlock prompt renders broken /
untappable). Both are fixed here, each with the widening W22 named.
**Worktree:** `wt-r19-fafix`, branch `muse/r19-fafix` off merged tip
`1094aa74`. **Commits (per item, not pushed):**

- `7254caab` — R19 W25 FA-01: wire the served Chats search
- `66c84ed4` — R19 W25 FA-02: the orbit unlock prompt carries its own positioning

**Stack for the served evidence:** this worktree's tip built and
served locally — Phoenix on :4000 from `wt-r19-fafix/apps/opal_core`,
`vite build` + `vite preview` on :5173, fresh Postgres 16 DB
`opal_dev_r19w25` on :5433 (**113 migration files = 113
`schema_migrations` rows, max `20261030010002`** — the W22 stack
fingerprint), app clock pinned `OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`,
synthetic-provisioned fresh review account in the human seed world
(machine-speak gate clean, enforced by `provisionRenderedSessions`),
headless Chromium at 390×844 in both modes. Build stamp read from the
served pages: `66c84ed41693150eaa6453b3f2027452fef949cb` (this tip).

---

## FA-01 — the Chats search was a dead control → WIRED

**Root cause (W22 J4, confirmed in source):**
`PeopleChatsList` (`apps/opal_web/src/opalUi/c1/C1Surfaces.tsx`)
rendered `<input className="c1-search" placeholder="Search people or
conversations" />` with **no `value`, no `onChange`, and no filter
anywhere in the component**.

**Fix (`7254caab`):** the field is wired with the exact pattern the
same file's Calls log and the Center log already prove — query state
in the component (`useState`), rows derived from it:

- Typing filters the rows **in place**. The needle matches only the
  row's own finished text: person name, preview, tie cue (W24), and
  the plan text the row itself carries — the DIR-4 reveal
  title/substance, the DIR-1 next-plan title/when/where, or the plan
  projection title. Never a fact the row does not show.
- No match → a quiet honest empty line, `data-testid="chats-search-empty"`:
  **"No chat matches that search."** — zero rows, never a fake result.
- Clearing restores the full list; the filter composes with the
  existing row grammar (two-line composition, plan-awareness cards,
  reveal lines, ambient state borders all render from the same row
  objects — W5's row layout and W20/JA-03's measurements untouched;
  `ja03ChatsRowBreadth.test.tsx` stays green).

**Served-breadth input-exercise pin (the recurrence guard):**
`apps/opal_web/src/opalUi/c1/fa01ChatsSearchExercise.test.tsx` —
renders the REAL served `PeopleChatsList` and **types into the
field** (the exercise W10/W20 never ran), asserting:

1. type "Jordan" → rows = exactly ["Jordan Ellis"], no empty state;
2. type "Juniper" (plan text) → rows = exactly ["Maya Torres"], her
   plan-awareness card still present;
3. type "cabin" (preview text) → rows = exactly ["Weekend Crew"];
4. type "zzzz-no-such-person" → **0 rows** + the honest empty line;
5. clear → all 3 rows back in order, card intact;
6. the input is controlled (its `value` follows state).

Result: **2/2 green**, alongside `ja03ChatsRowBreadth`, `c1.test`,
`r19ChatsThread` (W5/W20/W24 chats surfaces unregressed).

### Sibling dead-input sweep (the widening)

Method, three layers: **(1)** a static wiring audit of **every**
`<input>`/`<textarea>` in the served C1/C2 trees (`opalUi/**`,
`c2/**`, tests excluded) — 87 elements; **(2)** downstream-consumption
verification for every search/filter field (the query state must
actually filter a rendered list, not just exist); **(3)** live
exercise where this wave or W22 provides it. **Result: exactly ONE
unwired input existed in the entire served tree — the FA-01 field
itself.** Every sibling below is wired and its state is consumed.

Search / filter fields (the FA-01 class), each exercised:

| Input | Where | Result |
|---|---|---|
| "Search people or conversations" (Chats list) | C1Surfaces `PeopleChatsList` | **WAS DEAD — fixed here**; pin above types + filters + no-match + clear-restores |
| "Search your chats" (Center log) | C1Surfaces `CenterSessionList` | Wired; filters via `buildOrbitLog(sessions, query)`; W22 J7 exercised it live (rename → search "Saturday dinner" → exactly that row) |
| "Search calls" | C1Surfaces `PeopleCallsList` | Wired (`value`/`onChange`, name+metadata filter, honest no-match line "No call matches that search."); W22 J6 rendered-proven |
| "Search people or conversations" (legacy ChatsHome) | `opalUi/ChatsHome.tsx` | Wired; `filteredChats` filters name + parties + title |
| "Search plans, chats, people, and intentions" | `C2Shell` search overlay | Wired; plans/chats/people/intentions all filtered on the query |
| "Search settings" | `C2You` | Wired; filters the settings index from `query` |
| "Search people" (new-chat picker) | `NewChatPicker` | Wired; candidates filter on name/handle |
| "Search people and groups" (new-call) | `NewCallDestination` | Wired; people + groups filtered |
| "Search Opal Graph" | `SearchDestination` | Wired; people/places/experiences filtered |
| Orbit unlock code | `OrbitUnlockPrompt` | Wired; exercised live this wave (see FA-02 pin + the pack capture) |
| Graphs Private code | `C2Graphs` `c2-private-code` | Wired; W22 J3 rendered-proven (wrong code → error line; right code → unlocks) |

All remaining inputs (77) — composers (Center/people thread/Opal
query), create & edit forms (plan composer/edit, graph create,
intention/goal titles, journey manage, trips dates), onboarding
(phone/code/name/handle), You/Settings forms (profile, quiet-hours
start/end, timezone, max-per-day, support body, saved-login,
redeem code), story/memory/check-in/food/live panels, file inputs —
**each carries `value` + `onChange` in its tag** (audit output: 86 of
87 WIRED pre-fix, the sole exception being FA-01). The form class's
downstream truth is independently proven where it matters: W22 J8
rendered-proved the Settings writes end to end (Soul quiet-hours
PATCH → read-back → behavior), and this wave's full-suite run kept
every one of those surfaces' suites at their baseline state (below).

---

## FA-02 — the orbit unlock prompt rendered broken → FIXED

**Root cause (W22 J7, exact):** `TopLayer` portals the prompt
(`.c1-rail-scrim`, `data-testid="orbit-unlock-prompt"`) to body
level, outside both `[data-design="r18"]` host wrappers, so its only
CSS rule — `c1.css:342`, scoped `[data-design="r18"] .c1-rail-scrim`
— never matched: computed `position: static`, rect y=681 h=163,
painted under the rail, `elementFromPoint` at input/submit centers
missed both, tap timed out on actionability in two W22 runs.

**Fix (`66c84ed4`), per W22's named scope:** the prompt no longer
depends on the host wrapper. It carries its own classes
(`c1-orbit-unlock-scrim` / `c1-orbit-unlock-panel`) and its own
**unscoped** sheet, `apps/opal_web/src/opalUi/c1/OrbitUnlockPrompt.css`
(the OrbitSheet component-sheet precedent): a layer-token fixed
overlay — `position: fixed; inset: 0; z-index: var(--layer-modal);
background: var(--scrim)` — with a centered panel
(`width: min(340px, 92vw)`, surface/ink/line tokens, card radius),
and its inner elements (title, sublabel, code input, primary submit,
quiet cancel) styled under the panel selector. All values are
`:root` tokens, which resolve identically at body level in both
modes. The in-place rail keeps the scoped `c1-rail-*` rules,
untouched.

**Served evidence — geometry / hit-tests (identical both modes):**

| Check | W22 (broken) | W25 harness pin | W25 served stack (pack capture) |
|---|---|---|---|
| computed position | `static` | `fixed` | `fixed` |
| scrim rect @390×844 | y=681, h=163 | [0, 0, 390, 844] | [0, 0, 390, 844] |
| panel rect | in-flow under rail | [25, 289, 340, 267] centered | prompt open over the dimmed log (frames below) |
| input rect | — | [46, 389, 298, 48] | [46, 406, 298, 48] |
| submit rect | — | [46, 447, 298, 48] | [46, 464, 298, 48] |
| `elementFromPoint` at input center | NOT the input | **the input** | **the input** |
| `elementFromPoint` at submit center | NOT the submit | **the submit** | **the submit** |
| panel background | — | dark `rgb(32, 26, 39)` / light `rgb(250, 247, 242)` (= `--surface-1` per mode) | frames below |

**Served-breadth rendered pin:**
`apps/opal_web/src/opalUi/c1/fa02OrbitUnlockBreadth.test.tsx` — the
real `CenterSessionList` inside a `[data-design="r18"]` host wrapper
(as `C1ShellHosts` mounts it), the real `OrbitUnlockPrompt` portaled
out by the real `TopLayer`, production sheets in served order,
esbuild-bundled and driven in Chromium at 390×844, **dark and
light**: header tap → prompt visible + the geometry table above →
type wrong code, **tap** submit → error line "That code did not open
it.", prompt stays, orbit stays locked → type right code, tap submit
→ prompt closes, header loses "Private", header tap **expands** the
group and the orbit's rows appear. **Green in both modes.** The
pre-existing gate suites stay green: `r19FixB.test.tsx` (BS-02:
locked reveals nothing, wrong/right code, set-one path),
`f6OrbitPrivacy.test.tsx`, `repair18Layering.test.tsx`.

### Pack frames — the owed `orbit-private-gate` pair, captured

FA-02 was also why W11's `orbit-private-gate` capture failed; the
frames are now captured on the pack stack (fresh review account,
human seed world, run tag "with everyone after the market"), with
the world set through the real API, W22 J7's chain: `POST
/opal/graph-lock {code}` → 200 `passcode_set: true`; `POST
/opal/conversations/orbit-private {anchor_type: "person",
anchor_id: <Jordan Ellis>, private: true}` → 200 `{ok: true,
updated: 1}`. Rendered path: Center → session list → tap the locked
"Jordan Ellis · Private" header → prompt open; the capture script
(`fafix-scratch/gate-capture.mjs`) asserted `position: fixed` +
input/submit `elementFromPoint` hits **before** each screenshot
counted. Build stamp in both frames: `seed - 66c84ed`.

- **`orbit-private-gate-dark.png`** — `~/workspace/opal-graph/shots/repair19/pack-v2/orbit-private-gate-dark.png`
- **`orbit-private-gate-light.png`** — `~/workspace/opal-graph/shots/repair19/pack-v2/orbit-private-gate-light.png`

Both at 390×844: the centered modal ("Jordan Ellis is private" /
passcode field / "Open this orbit" / "Not now") over the
scrim-dimmed Center log, correct per-mode surface. The closing wave
registers them in the pack manifest (the two manifest entries
currently read `failures: ["private header click produced no
visible gate"]`).

---

## Floors (verbatim)

Baseline on `1094aa74` (measured this wave, before edits):

```
Test Files  16 failed | 207 passed (223)
     Tests  23 failed | 1726 passed (1749)
```

After both fixes (full suite, this tip):

```
Test Files  16 failed | 209 passed (225)
     Tests  23 failed | 1729 passed (1752)
```

- **Web failing set EXACTLY baseline: 23 failed tests / 16 failed
  files.** Passed rose by exactly the 3 new pin tests (FA-01 ×2,
  FA-02 ×1); the 23 failures are the same legacy authority/token
  set (activation, designTokens, availability, firstRun,
  authorityRejectedStates, grammar, graphCalendaring ×2, graphDetail,
  graphScroll ×2, graphSpine, liveJourneyProof, pasteW4 ×2,
  waveBChats ×3, waveBGraphs, waveBHome, technicolorProduction) —
  none in the touched surfaces.
- **Typecheck: exactly 9 errors**, before and after (3× OpalApp
  `SetStateAction<Tab>`, 5× productClient duplicate identifiers,
  1× YouSettingsDestination `handle`) — none introduced.
- **Build: green** — `vite build` ✓ (`✓ built in 7.56s`), and the
  built bundle carries `c1-orbit-unlock-scrim` (dist CSS+JS).
- **Backend: untouched** — both commits touch only
  `apps/opal_web/**`; no backend suite was required or run. (The
  capture stack ran this worktree's backend unmodified: 113
  migrations clean on a fresh DB.)
- **W14/W24 orbit + chats tests stay green** — `r19FixB` (BS-02
  gate), `f6OrbitPrivacy`, `ja03ChatsRowBreadth`, `c1.test`,
  `r19ChatsThread` all pass; the W24 tie cue is one of the FA-01
  filter's matched fields and renders unchanged in filtered and
  unfiltered lists; the new-chat picker is untouched.

**Not pushed.** Branch `muse/r19-fafix` at `66c84ed4`, two commits,
working tree clean.

**FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO — unchanged.**
