# Repair #19 — Wave W27-ATFIX — Ambient Truth Audit fix wave

**Worktree:** `wt-r19-atfix`, branch `muse/r19-atfix` (off merged tip `1094aa74`). **Not pushed.**
**Scope:** the code-fixable AT findings from `ambient-truth-audit.md`, fixed against
`ambient-rulebook.md` (AR rules, QUIET budgets, persistence, reduced-motion parity, AR-00.9).
All motion is one-shot or state-keyed; every animation keeps its reduced-motion static
equivalent (motion killed, resting state kept).

## Commits (one per item)

| Commit | Item |
|---|---|
| `f9740cfb` | AT-02 token convergence |
| `cf302240` | AT-04 ignition (AR-F1) |
| `a625c4f5` | AT-06 dock orb state-keying |
| `f6b33f97` | AT-08 fire reserved for lit items |
| `d1e053b6` | AT-09 canon hues out of decoration |
| `791013cd` | AT-10 Home lit coalescence (AR-F4) |
| `8ce50fae` | AT-13 graph card state edge |
| `0f34bf64` | AT-14 StateStone pattern channel |
| `f1b9b483` | AT-15 + AT-18 pulse leg (AR-F5) |
| `1095f93e` | AT-03 + AT-05 (web) |
| `4361d3ae` | AT-03 (backend wire) |
| `b2e03947` | AT-12 signature intent keys |
| `fdab3504` | AT-02 follow-up: F2 legibility guard resolver follows the alias into the orb canon (see Floors correction note) |

## Per-item fix + proof

### AT-02 (High) — one hue family for one meaning
`--state-*` in `theme/c2Tokens.css` are now **aliases of the canon** in BOTH mode blocks:
`--state-forming: var(--orb-indicator-forming)` etc. Tints are the canon hue at the previous
alphas; mode adaptation survives only in the `*-ink` text derivatives (the two teal inks were
re-derived from canon cyan). The divergent family is dead — light happening deep-teal
(`#0a7c6e`) and grey past (`#78716c`/`#a8a29e` as state values) no longer exist.

Resolved `--state-*` values, **identical in light and dark** (via `--orb-indicator-*` =
`PLAN_STATE_HEX`):

| token | light | dark |
|---|---|---|
| `--state-forming` | #8B5CF6 | #8B5CF6 |
| `--state-action` | #FF4D5E | #FF4D5E |
| `--state-ready` | #FFC86B | #FFC86B |
| `--state-happening` | #00E5FF | #00E5FF |
| `--state-past` | #FFFFFF | #FFFFFF |

Inks (text-only, per mode): light `#5546d8 / #c81e2b / #8a5e00 / #07758c / #57534e`;
dark `#c4beff / #ffb0b7 / #ffd88a / #8be9f7 / #d6d0c8`.
**Pin:** `orbTokens.test.tsx` asserts every `--state-*` appears as a canon alias exactly
twice (light + dark) and none of the eight dead derivative hexes remains in `c2Tokens.css`;
`c2Tokens.test.ts`'s per-mode table pin was updated to the alias truth (the one baseline
assertion this wave changed — it pinned the divergent values AT-02 charges).

### AT-04 (High) — the completion/reveal is an EVENT (AR-F1)
`.orb-fire-frame` (orb.css) gains a one-shot ignition **on mount**: a bright segment travels
the fire ring once (**600ms**, background-position inside the same 1px ring mask) while the
glow blooms 24px → resting over **900ms** total (state frames bloom in their state family
via `--orb-ignite-color`). The 100% keyframe *is* the resting shadow, so the protected
YOUR MOVE card's resting composition is unchanged — only its arrival gains the event.
Once per mount, never loops; **past never ignites**; reduced motion kills travel + bloom
and keeps the resting lit frame (AR-00.6). Pinned in `orbTokens.test.tsx` (durations,
one-shot, resting-keyframe identity, reduced-motion block, past exclusion).

### AT-05 (Medium) — cross-surface echo (AR-F3)
On a realtime `inbox:plan_state` crossing with a real state family arriving **while the user
is off Center**, `C2Shell` sets the dock echo: the dock disc takes a **one-shot 900ms bloom
into a resting tint in the event's canon family** (`data-dock-echo` + per-family token
bindings in `c2shell.css`; resting defaults `--dock-echo: transparent` in `c2Tokens.css`).
The tint **decays on first view of Center** (cleared on route change). Past never echoes.
Reduced motion keeps the tint, kills the bloom. It fires only for real socket-carried
crossings — no fabricated events (AR-00.9).

### AT-06 (Medium) — dock orb stops looping state-blind (AR-12)
`OrbLivingRings` ambient mode takes `liveState`. Nothing live → `data-ambient-state="rest"`:
every lap slows 4× (circle 96s→**384s**, ellipse 72s→**288s**, arc 160s→**640s**) and points
dim to 0.45. A live family → normal laps with the arc + halo tinted to that canon family
(the lap *rate* is the second, non-color channel). `orbAmbientStateFromFamilies` picks the
strongest by reveal priority (action > happening > ready > forming; past never keys);
`C2Shell` wires the dock orb to the shell's own plan projection via `familyOfStatus`.
State-keyed, not deleted — the orb stays alive, it stops pretending. Pinned in
`orbLivingRings.test.tsx`.

### AT-08 (Medium) — fire reserved for lit items
`PlanCardC2` no longer renders the iris `FireLine` on every non-past card. It renders the new
**`StateRule`** (FireLine.tsx): the card's own canon state hue at 55% ambient strength, same
grammar slot. Iris fire remains only on lit/event forms: the lit `FireFrame`,
Center's celebrate-once line, the share-card edge. The one-lit ceiling now governs the
card surface too (with AT-10). Forming's breath animates the state rule; `unifyChats.css` §6
and `HOME_AMBIENT_ELEMENTS` name the rule honestly. Past still rests (no rule, no fire).
Pinned in `planCardAtfix.test.tsx`.

### AT-09 (Medium) — canon hues stop being spent decoratively
Each site — what it became, and why it no longer reads as a state:

- **Graph timeline/avatar tone cycle** (`GraphSocialHome.tsx` fallback +
  `founderGraphSeed.ts HOME_GRAPH_TIMELINE_COLORS`): was `#00E5FF / #5FAECF / #8B5CF6 /
  #FFC86B` (happening/forming/ready as decoration). Now cycles the **non-canon entity
  palette** (DIR-1 person-tint family `#2DD4BF / #818CF8 / #C084FC / #F0ABFC`) — identity
  colors for an identity channel (AR-15); no state read is possible.
- **Legacy `--accent`** (`styles.css`): was canon `#00e5ff`, so every generic link/button/
  dock-active read as "happening". Now the **legacy brand violet family**
  (`#8b7cff / #5a48d7 / #bdb2ff`) — chrome, not state.
- **gprof labels** (they are labels, not states): plan action label ready-gold → **pearl
  `#e8d6c4`**; message action label cyan → **brand violet**; graph section title + when line
  forming violet `#8b5cf6` → **brand violet `#8b7cff`**.
- **Living character** (`OpalLivingCharacter.tsx`): headphones/ear pads/lightbulb wore canon
  cyan/violet/gold. Now the orb's **sampled fire paints** (`#60B9D8`, `#7D4DCE`, `#F1AA62`)
  — brand fire, the harmony-0 distinction (sampled ≠ canon).

**MP-11 gate consequence:** `GraphSocialHome.tsx`, `OpalLivingCharacter.tsx`, and
`founderGraphSeed.ts` retired off the canon-hex allowlist in
`mistakePatternEnforcement.test.ts` — exactly the improvement that gate exists to lock.
Not charged by AT-09 and untouched (recorded): per-person seed `avatarTone` fields
(AR-15 identity data) and `BRAND.palette` (legacy brand record consumed by artifact cards).

### AT-10 (Medium) — Home lit coalescence (AR-F4)
Home computes **one lit winner per render** (`litWinnerId` in `PlanCardC2.tsx`: reveal
priority action > happening > ready > forming; earliest feed position wins ties; past never
a candidate) and passes the verdict as an explicit `lit` input. Capped cards rest at
**border-only** (`unifyChats.css` §6: glow, tinted ground, and the forming breath off;
border, pattern, state rule, and pill untouched — the state still reads in full). Recorded
in `HOME_AMBIENT_ELEMENTS` with its one-sentence reason (AR-00.3).
**Burst fixture result** (`planCardAtfix.test.tsx`): a Home feed with 4 lit candidates
(forming, ready, happening, action) + 1 past renders **exactly 1 `data-lit="lit"`** (the
action card), **3 `data-lit="capped"`**, and the past card carries no lit verdict.

### AT-13 (Low) — graph cards gain the state edge
The legacy graph card button already carried `data-plan-state` but no treatment; it now
wears the **chats row's 2px inset state edge** via `--plan-state-color` (canon family),
`styles.css`. The C2 graphs cards already exceed this — they render `PlanCardC2` with the
full §6 register.

### AT-14 (Low) — StateStone's non-color channel
The stone's ring now carries a **pattern/weight keyed to family**, rendered as
`data-stone-pattern` and pinned per family: forming **dashed** (`stroke-dasharray 7 6`),
action **weight** (stroke 17 vs 10), ready **solid**, happening **double** (second ring
r=86), past **rest** (plain pale ring — absence as pattern). The stone never stands as
color-alone again, including the 28px media fallback.

### AT-15 (Low) + AT-18 pulse leg — ready vs happening by pattern; urgency by pulse
Happening cards gain the **double-ring pattern** (outer halo ring, the `.c2-happening-ring`
treatment as a border pattern) on both the C2 register and the C1 card; ready stays solid
single — the pattern channel now distinguishes them alone. Per AT-18's reframe the hue
stays calm cyan (open/live/approachable); urgency is carried by **pulse + words**: the
happening card's state rule pulses at the **LIVE key (2.4s, opacity .55→1 — AR-07's exact
signature)**. Reduced motion kills the pulse and keeps the double ring (static equivalent).

### AT-03 (Medium) — live repaint on remote crossing
The socket *did* carry a suitable event for conversation plans (`inbox:plan`, already
normalized client-side), but two legs were missing; both are now wired end to end, no polling:

- **Backend (minimal emit):** `SocialFlow.broadcast_plan/4` publishes conversation-less plan
  mutations to PubSub topic `social_flow:user:<id>`, which **no channel subscribed to** —
  the events reached only test processes. `UserChannel` now subscribes on join (self-only,
  as before) and forwards each `{:social_flow_event, event, envelope}` as an
  **`inbox:plan_state`** push carrying the envelope's own contract payload.
  Proven by `user_channel_plan_state_test.exs` (3/3): owner receives the event with its plan
  contract; another user's event does not leak; foreign join stays forbidden.
- **Web:** `RealtimeClient` gains `onPlanState` + `normalizePlanState` (family derived once
  through `planStateFamily`, which now also mirrors the governed SharedPlan statuses —
  agreed→ready, completed/expired/cancelled→past — so a raw contract status can never fall
  through to forming, the W18 defect class). `C2Shell` — which never started the socket at
  all (only the legacy tree did) — now starts `productRealtime` for the member stage and
  re-reads its canonical plan/Home projections on `inbox:plan`, `inbox:attention`, and
  `inbox:plan_state`.

**Live-repaint drive result** (real server from this worktree on :4119, dev DB
`opal_dev_r19atfix`, synthetic accounts; script `/tmp/at03-drive.mjs`): a Phoenix client
joined `user:<A>`, then sat **idle — no action, no polling**. Two remote HTTP mutations
(create, then cancel, of a conversation-less graph plan) each arrived at the idle socket
as `inbox:plan_state` within the drive window: `social_flow:plan` with
`payload.plan.status "tentative"` (→forming) on create and `"cancelled"` (→past) on cancel:
**PASS**. The actor in this drive is the creator's second HTTP session (a second account
cannot cancel another's plan); the two-account accept leg rides the pre-existing
`inbox:plan` fanout, which the shell now also consumes.

### AT-12 (code alignment leg) — signature → intent-key map
Shipped pulse/breath signatures, after alignment (pinned in `theme/signatureKeys.test.ts`):

| Key | Signature(s) | Period / form | Change |
|---|---|---|---|
| LIVE | `c2s-live-pulse` (shell live dot) | 2.4s, opacity .55→1 | reference, unchanged |
| LIVE | `c1-live-pulse` (C1 live dot) | 2.4s, opacity .55→1 | **renamed from `c1-pulse`, aligned 2s→2.4s** |
| LIVE | `unify-happening-pulse` (AT-15 card rule) | 2.4s, opacity .55→1 | new, keyed to LIVE |
| SPEAKING | `c1-speaking-pulse` (read-aloud orb) | 1.2s, opacity+scale | **split from `c1-pulse`** (was borrowing LIVE's name at a second period) |
| PRESENCE | `c1-presence-breath` / `c1-presence-sway` | 5s breath / 3s sway | **renamed from `c1-breath`/`c1-sway`** (AR-13 pair; words always beside) |
| FORMING | `unify-forming-breath` (card state rule) | 5s, opacity .62→1 | already keyed; kept |
| HERO | `c2-hero-breath` (C2 hero presence loop) | `--motion-breath` (4s) | **renamed from `c2-breath`** |
| WORKING | `opal-working-pulse` (legacy center working dot) | 1.2s | **renamed from `opal-action-pulse`** — it marked *working* under the ACTION state's name |
| TYPING | `opal-center-chat-typing-pulse` | 1.1s, staggered | **renamed from `opal-center-chat-pulse`** |
| MIC | `opal-center-chat-mic-pulse`, `opal-living-mic-pulse` | **1s both** | living mic **aligned 0.9s→1s** to the key |
| SIGNAL (one-shot) | `opal-signal-breath`, `calls-signal-reveal`, `opal-orb-resonance` | one-shot, both/fill | already intent-named one-shots; unchanged |
| CHARACTER (legacy) | `opal-living-breathe` (period keyed by state class: idle 5s / thinking 2.6s), `opal-living-wave-ticks`, `opal-living-think-sway`, `fr-splash-character-breathe` 3.6s, `hs-orb-breathe` 2.4s | state-class-keyed | already intent/state-named; unchanged (legacy erasure pass owns deeper cleanup — AT-11, not this wave) |
| ORBIT (AT-06) | dock ambient rotors | rest 384/288/640s · live 96/72/160s | state-keyed this wave |

### AT-16 compliance note
Red stays **scarce, verb-paired, never looped** — verified against this wave's changes:
AT-04's ignition and AT-05's echo are **one-shot onsets, not loops/pulses**; the echo is a
resting *tint* that happens to use the event's family (if the family is action, the tint is
red — beside the dock's own navigation target, decaying on first view, never animated in a
loop). AT-09 *removed* decorative red-adjacent canon uses. No new red surface, no red
animation, no red without its action verb (the pill/action rows are untouched).

### Not this wave (per dispatch)
AT-11 (legacy unmounted loops — erasure-pass scope), AT-16/AT-17 (rulebook dispositions
already executed; AT-16 verified above), AT-18's hue reframe is documented in AT-15 — the
hue itself is unchanged by design.

## Floors (verbatim)

- **Web suite (CORRECTED — full-collection solo confirmation, post-fix):**
  `Test Files 16 failed | 209 passed (225)` / `Tests 23 failed | 1747 passed (1770)` —
  the failing set is **exactly the baseline 23/16**, name-for-name: activation,
  availability, designTokens, onboarding/firstRun, technicolorProduction,
  authorityRejectedStates, grammar, graphCalendaring, graphDetail, graphScroll,
  graphSpine, liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact,
  waveBHomeExact — none in any file this wave touched. New pins this wave: +21 tests /
  +2 files over the baseline collection (223 files / 1749 tests), across orbTokens,
  orbLivingRings, planCardAtfix, signatureKeys, realtime, planStateColors.
  *Correction note:* the figure in the first delivery of this report (112 files / 892
  tests) came from a run under parallel backend load that collected only half the
  suite. The first full-collection solo run showed 27 failed / 17 files: the +4/+1
  delta was entirely `primaryButtonLegibility` — the F2 guard's resolver read only
  c2Tokens.css, so AT-02's audit-mandated cross-file aliases (`--state-*` →
  `var(--orb-indicator-*)`, homed in orbTokens.css) resolved as undefined. Fixed in
  `fdab3504` (resolver follows the alias into the orb canon block; a token still
  counts as defined only when it resolves to a concrete value, and the ≥4.5 contrast
  assertions are unchanged — the primary pairings never chained through `--state-*`).
  The post-fix full-collection run above confirms exactly 23/16.
- **Typecheck:** `tsc --noEmit` → **9 errors** (exactly baseline).
- **Build:** `vite build` green.
- **Backend full suite:** `3224 tests, 0 failures` (final clean run; earlier runs under
  web-suite contention showed 5 failures + 83 invalid, and a later contended rerun 2
  failures — all gone on clean solo runs at the same 3224 count).
- **API battery:** `summary: 101/101 PASS` — server from this worktree on :4119, fresh-migrated
  dev DB `opal_dev_r19atfix` on Postgres :5433, `OPAL_PHONE_VERIFY_MODE=synthetic_development
  OPAL_SYNTHETIC_EXPOSE_CODE=1 OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`; suite run with
  `OPAL_SESSION_PROVISION=synthetic OPAL_SEED_MODE=1`; seed world machine-speak gate clean
  (0 hits); founder seed communication + graph status 200. (Port 4119 because :4000 is held
  by another wave's stack.)
- **Pattern/token gates:** `orbTokens`, `c2Tokens`, `planStateColors`, `signalGrammar`,
  `familyOfStatus`, `unifyDrift`, MP-11 (mistakePatternEnforcement) — all green;
  `familyOfStatus`-style live derivations untouched and passing.

## RECAPTURE LIST — frames whose ambient claims change

1. **home** (dark + light, incl. burst/multi-plan state) — state-rule instead of fire line
   on plan cards; one lit card cap; happening double-ring + pulse; dock orb rest/live.
2. **thread YOUR MOVE** (dark + light) — the lit reveal's **ignition** (needs a two-frame
   or motion capture: frame at mount vs settled — a still pair cannot show it; capture
   ~0ms/~450ms/~950ms or a short webm, plus the reduced-motion still).
3. **graphs** (dark + light) — graph card state edge (legacy surface); C2 thread cards'
   state rule.
4. **deck** (Center, dark + light) — plan cards' state rule + lit register on the deck's
   PlanCardC2 surfaces.
5. Also worth one frame each: **dock closeup** in rest vs live state (AT-06) and the
   **dock echo** tint after a remote completion (AT-05), and a **reduced-motion** set for
   the ignition/happening pulse parity claims.
