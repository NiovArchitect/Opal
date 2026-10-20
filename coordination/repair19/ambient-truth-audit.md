# Repair #19 — Wave W26-AMBIENT — Ambient Truth Audit

**Commission:** founder, 2026-10-19 14:01 PDT — *"I hope this is true in Opal. If not, ensure it is."*
**Doctrine under test:** ambience is BEHAVIOR — Opal's proactivity made visible. Ambient
light/color/pattern/motion INFORM the user; the language is persistent so reading it becomes
instant; NOT JUST COOL — INFORMATIVE; every element answers *"what does this tell the user?"*
**Auditor posture:** report only. No application code and no ledger were edited by this wave.
**Code under audit:** worktree `wt-r19-ambient`, branch `muse/r19-ambient`, code tip `9a0a1be4`
(plus the two docs-only record commits `17df3be5`, `63a4106b`).
**State canon (the founder's reference):** action `#FF4D5E` · ready `#FFC86B` · forming
`#8B5CF6` · happening `#00E5FF` · past white.

## Method — and an honest limitation

The commissioned method was a live drive on the served build (fresh accounts + human seed
world, headless Chromium 390×844, pixel measurement). At audit time **no stack was running
for this worktree** (ports 4000/5173 closed) and a sibling wave's database
(`opal_dev_r19diffix`, Postgres :5434) was mid-migration on the shared VM, so a competing
stack-up was not attempted. The verdicts below therefore rest on:

1. **Source-at-tip proof** — the shipped CSS/TSX at `9a0a1be4`, read in full for every
   ambient-bearing file (token sheets, `c1.css`, `c2.css`, `c2shell.css`, `orb.css`,
   `RevealCard.*`, `FireLine.tsx`, `PlanCardC2.tsx`, `planProjection.ts`, `C2Shell.tsx`).
   For *absence* claims (no animation exists; no realtime channel reaches a surface) a
   complete source sweep is stronger evidence than a single live drive: there is no code
   path that could produce the behavior.
2. **Shipped test pins** — e.g. `orbTokens.test.tsx` pins the canon indicator hexes and
   their mode-invariance; `deckfix.test.tsx` pins the Center cap.
3. **Prior rendered reports** in this folder (`splash-report.md`, `packfix-report.md`,
   `home-report.md`) for what was previously proven at the rendered layer.

Every verdict that needs a live pixel measurement to be *fully* closed is marked
**UNVERIFIED-LIVE** with the exact drive that closes it. Nothing below is dressed up as a
live measurement that did not happen.

**Pack-v2 frames:** located at `~/workspace/opal-graph/shots/repair19/pack-v2/` (repo-root
`shots/`, outside the worktrees — an early `find` across worktrees missed them and a
draft of this section said so; corrected). The pack manifest's tip is this audit's tip
(`9a0a1be4`, tree `832a3604…`), viewport 390×844, seed gate clean. §6 re-proves what
stills and frame-pairs can prove, with pixel measurements where a pair exists.

---

## Verdict summary

| Claim | Verdict |
|---|---|
| A1 State-crossing visibility | **NOT TRUE as stated — but closer than the rest** — Home's card genuinely crosses (canon hue + pattern: dashed violet → solid gold, `unifyChats.css` §6), and every surface carries a state treatment; what fails is hue persistence on the C1/pill surfaces (a second, divergent palette) and live repaint on a remote crossing. AT-02, AT-03, AT-13 (AT-01 corrected/withdrawn, see §A1) |
| A2 Completion event | **NOT TRUE** — the lit reveal is a static frame. No ignition, no travel, no decay, no duration exists in code; a user on another surface gets no ambient signal. AT-04, AT-05 |
| A3 Home answers to activity | **NOT TRUE in part** — Home's *content* treatments are genuinely state-keyed (including the forming fire-line breath, which does exist — `unifyChats.css:570-576`); the dock orb loops identically forever. AT-06 (AT-07 withdrawn, see §A3) |
| A6 Accessibility of the ambient language | **LITERALLY TRUE in the large** — sound independence verified by construction; the state canon always carries glyph + label (never color alone at the pill level); reduced-motion parity is engineered and in one place stated as law ("kill motion only — keep the resting glow"). Two low findings: the StateStone is color-alone wherever it stands unpaired, and the card-border *pattern* channel does not distinguish ready from happening. AT-14, AT-15 |
| A4 Token invariance | **NOT TRUE** — a second, divergent hue family carries state on the main card surfaces; canon hues are also spent decoratively in named places. AT-02, AT-08, AT-09 |
| A5 Quiet bounds | **NOT TRUE in part** — reveal lit-marking is genuinely capped (one lit per surface, thread shows one, deck cap 3), but there is no ambient-wide cap or coalescence, and Home is multi-lit in steady state. AT-08, AT-10 |

**What IS literally true (credit where due):** a real, persistent state language exists —
state pill + glyph + label + pattern (dashed = forming, 3px edge = action) on every plan
surface, driven by ONE projection (`planProjection.ts`, surfaces never re-derive state);
the `--orb-indicator-*` / `--plan-state-*` family carries the exact canon hexes,
mode-invariant, pinned by test; past genuinely rests (no glow, no fire) in the fire
language; the reveal system genuinely caps fire to one lit item per surface; reduced-motion
and hidden-document pause laws are real and consistent. The doctrine is *half-built*:
the static language is real, the *behavioral* language (events, crossings, bursts) mostly
is not.

---

## A1 — State-crossing visibility (forming → ready)

**Verdict: NOT TRUE as stated.**

What the code does on a crossing, surface by surface (all surfaces consume the one
projection, so the *data* crossing is real everywhere the projection is re-fetched):

| Surface | Treatment on crossing | Evidence |
|---|---|---|
| C1 plan card (thread / plan-awareness / Center host) | Border color swaps forming→ready; `transition: border-color 220ms` makes it a 220ms crossfade — the build's only crossing *motion* | `c1.css:392-396` (`[data-plan-state]` border rules), `c1.css` `.c1-plan-card { transition: border-color 220ms … }` |
| C1/C2 state pill | Fill/border/ink swap via `[data-plan-state]` blocks | `c1.css:368-382`, `c2.css:388-412` |
| **C2 plan card (Home, Center deck)** | **Full state register, canon hues.** The treatment lives in `theme/unifyChats.css` §6 (not `c2.css`): forming = dashed border in canon violet at 52% + 18px glow + the fire line breathing (5s); action = solid red border + **3px left edge**; ready = solid gold border at 50% + gold glow + warm gradient ground; happening = cyan border + glow; past = quiet line, no glow, opacity 0.78. A forming→ready crossing changes hue, pattern (dashed→solid), and motion (breath stops) together | `unifyChats.css:565-596` — the strongest surface in the audit |
| Chats row + plan-awareness | Row carries `--plan-state-color` (canon family) at 13% fill / 48% border mix + 2px inset state edge; pill canon | `unifyChats.css:207-210`, `styles.css:19141-19162`, `opalComposerTokens.css:134-152` |
| Thread (YOUR MOVE / reveal) | Reveal state edge + FireFrame glow tint from `--reveal-state` = `PLAN_STATE_HEX[family]` (canon) | `RevealCard.tsx`, `RevealCard.css` `.reveal-list-line` |
| Graph card + detail | Detail pill carries `data-plan-state` with canon-backed `graphs-status-*` classes; the graph *card* surface has no state border treatment found (state lives in the pill/line only) | `GraphDetailSheet.tsx:329,363-367`; no `[data-plan-state]` border rule for graph cards — **AT-13** |
| Center / deck | Deck slots render the same C2 card / C1 hosts — inherits AT-01 (card) and the C1 behavior (host) respectively | `C2CenterOpening.tsx`, `C1ShellHosts.tsx` |

**The hue problem (also A4) — scoped precisely:** the surfaces split into two camps.
The C2 card register (above) and the chats/graph pill families render through the
**canon** tokens (`--orb-indicator-*`, `--plan-state-*` in
`opalComposerTokens.css:36-40`, pinned exact + mode-invariant by `orbTokens.test.tsx`).
But the **C1 surfaces and the C1/C2 pills** render through the `--state-*` tokens, which
are **not the canon**: `theme/c2Tokens.css:168-183` (light) / `221-236` (dark) define
forming `#6d5df0`/`#9d94ff`, action `#e8323f`/`#ff7a85`, ready `#b77900`/`#f5b93f`,
happening `#0a7c6e`/`#4adecb`, past `#78716c`/`#a8a29e` — and `unifyChats.css:546-550`
paints the C1 card border at a 52% mix of those same derivatives. In dark mode they are
near-canon tints; in light mode happening is a deep teal and past is grey — **past is
not white in either mode** under this family. The same plan therefore shows two
different "ready" golds depending on whether you meet it on Home (canon `#FFC86B` family)
or in a thread/C1 surface (`#b77900`/`#f5b93f` family). Two hue families carrying one
meaning is exactly the drift the persistence law forbids — **AT-02**.

**Auditor correction (AT-01 withdrawn):** an earlier draft of this audit charged that
the C2 card border never takes state. That was wrong — the treatment lives in
`theme/unifyChats.css` §6, outside the files first swept. The charge is withdrawn, the
Home surface is credited above, and the surviving hue finding is AT-02 as scoped here.

**The liveness problem:** the C2 shell re-fetches projections on stage/bearer/`homeNonce`
change and after the viewer's own actions (`C2Shell.tsx:160-238`); the realtime socket
(`productRealtime`) is wired in the legacy `OpalApp` tree, not into the C2 shell's plan
projections. A crossing caused by *another person* accepting while the viewer sits on
Home does not repaint until the viewer navigates or acts (C1 hosts additionally refresh
on `visibilitychange`). Where the product promises liveness, this lags a reload behind —
**AT-03**. UNVERIFIED-LIVE: the two-account accept drive that times the repaint.

**Fix scopes (dispatch-ready):**
- AT-02: converge the families — `--state-*` becomes an alias of the canon
  `--plan-state-*`/`--orb-indicator-*` values in dark, with light-mode *ink* derivatives
  kept only for text (rename to `*-ink` so no border/fill can consume them). Sweep
  `c1.css`, `c2.css`, `c2shell.css` consumers; extend `orbTokens.test.tsx` pinning to
  `--state-*`.
- AT-03: subscribe the C2 shell's plan/home projections to the existing realtime socket's
  plan events (or a visibility + 30s poll floor) and re-render on remote crossing; pin
  with a two-client proof in the regression harness.
- AT-13: give the graph card the same state edge treatment as the chats row (inset 2px
  state edge from the canon token); the detail pill already complies.

## A2 — Completion event

**Verdict: NOT TRUE.**

The commissioned observation: a real completion (final acceptance / Opal preparing the
YOUR MOVE reveal) should *fire* as an ambient event — perceptible change over time.

What actually exists: `RevealCard` renders the lit item inside `FireFrame`
(`RevealCard.tsx:155-156`), and `FireFrame`/`orb.css:68-95` is **entirely static** — a
1px iridescent gradient border ring (`::before` mask) plus a state-tinted
`box-shadow: 0 0 16px`. A full sweep of `RevealCard.css`, `orb.css`, and `c1.css` finds
**no `animation` and no `transition` on the fire frame or the reveal card**: no ignition,
no traveling light, no shadow bloom, no decay. Duration/decay: **none — the frame is
pre-lit from the first painted frame and stays lit until dismissed.** A still capture
and a capture 5 seconds later are pixel-identical (modulo unrelated loops). The founder's
protected standard — the thread's YOUR MOVE card — is a *static* lit frame, however good
it looks. **AT-04.**

Cross-surface signal at the moment of completion: **none.** No code ties a completion /
reveal-lit event to the dock orb, to another surface's badge, or to any transient light.
The Home activity badge counts *changes since last look* (a persistent count, rendered
when Home next loads — `C2Home.tsx` `HOME_AMBIENT_ELEMENTS`), which is a state, not an
event, and it does not fire at the completion moment for a user sitting in a thread or
on Graphs. **AT-05.**

**Fix scopes:**
- AT-04: one ignition animation on `.orb-fire-frame` mount — e.g. a light travel along
  the gradient border (mask-position / conic sweep) + glow bloom 16px→24px→16px over
  ~900ms, once, `both`, killed under reduced motion. Add to the rulebook as AR-F1 and
  pin with a two-frame capture diff in the pack recipe.
- AT-05: on reveal-lit, set a one-shot dock-orb state tint (the reveal's state family)
  that decays on first view of the reveal; backend already marks `lit` in the one
  derivation — the shell needs the event, not new data.

## A3 — Home answers to activity

**Verdict: NOT TRUE in part — Home's content is honest; its loops are not all honest.**

True parts: Home's plan cards, live card, story rings, and activity badge are all
*state-keyed*: the live card (`.c2s-live-card`, happening border + glow + the 2.4s
`.c2s-live-dot` pulse, `c2shell.css:542-568`) renders only when a live item exists; the
activity badge is *absent* when nothing is new (presence discipline, recorded in
`HOME_AMBIENT_ELEMENTS`); quiet Home carries no live pulse. Each shipped Home ambient
element carries a recorded one-sentence reason in `C2Home.tsx:37-80` — the justification
rule is genuinely implemented there.

The one false part:
**The dock orb never rests.** `OrbLivingRings` ambient mode rotates indefinitely —
circle rotor 96s, ellipse rider 72s, arc 160s reverse (`orb.css:193,224,283`) —
identically whether everything is quiet or a plan is happening. Its recorded reason
is *presence* ("the dock's job is presence, so it does not settle",
`OrbLivingRings.tsx`), which makes it atmosphere by design; under the founder's A3
test ("rest quiet when nothing is live") it fails — it is the one always-moving
element on every surface, including Home. Disposition per the justification rule:
either key its rate/glow to the strongest live state, or carry an explicit
founder-approved *presence exception* in the rulebook (AR-12) so the claim stops
implying it answers to activity. **AT-06.**

**Auditor correction (AT-07 withdrawn):** an earlier draft charged that the forming
fire-line breath claimed in `HOME_AMBIENT_ELEMENTS` does not exist. It does:
`unifyChats.css:570-576` — `unify-forming-breath`, 5s, opacity 0.62→1, on the forming
card's fire line, killed under reduced motion (`unifyChats.css:603-607`). The claim in
the code comment is accurate; the charge is withdrawn.

**Fix scope:** AT-06 — rulebook exception or state-keying (founder's call; scope both,
recommend the exception + a glow tint keyed to the strongest state so presence also
informs).

## A4 — Token invariance

**Verdict: NOT TRUE.** Findings, each with its site:

- **AT-02 (the big one):** the `--state-*` family diverges from canon on the main card
  surfaces — values in §A1. Same state, two hues, varying by mode, while the canon
  family is mode-invariant. Persistence law broken at the token layer.
- **AT-08 (fire meaning shift — narrowed):** `PlanCardC2.tsx:163-167` renders a
  `<FireLine />` on **every non-past plan card**, and `unifyChats.css` §6 frames it as
  the card's "one lit element." But fire's declared meaning in the fire language
  (`FireLine.tsx:5-9`, `RevealCard.tsx` header) is *"one lit thing per surface — Opal is
  speaking proactively, right now."* The same iridescent line therefore carries two
  meanings: on a reveal it is scarce proactive speech; on a plan card it is a constant
  (identical, untinted, for forming/action/ready/happening alike — only the forming
  card's line moves). Meaning shifting by surface is the persistence-law violation the
  extension charged us to flag, even when both uses are individually designed. Fix
  scope: differentiate the forms — the card line becomes a *state-tinted* rule (its
  card's indicator hue at ambient strength) and the full iridescent gradient is
  reserved for lit reveals, so "iris fire" always means Opal speaking.
- **AT-09 (canon hues spent decoratively):**
  - `GraphSocialHome.tsx:888` — avatar tones cycle `["#00E5FF", "#5FAECF", "#8B5CF6",
    "#FFC86B"][i % 4]` by index: happening-cyan, forming-violet, and ready-gold as a
    decorative palette where no such states exist.
  - Legacy `styles.css` — `--accent: #00e5ff` (line 21) drives generic links/buttons/
    dock-active across the legacy shell; `.gprof-action-plan .gprof-action-label`
    gold (8280), `.gprof-section-graph` title violet (8292), `.gprof-when` violet (8315):
    canon hues as section decoration on the graph profile.
  - `OpalLivingCharacter.tsx:62-79` — the character's strokes/fills are `#00E5FF`,
    `#8B5CF6`, `#FFC86B` decoratively.
  Borderline-but-defensible (recorded, not charged): the story ring's unseen gradient
  (`--grad-current`, `c2shell.css:400-402`) and the FireLine gradient itself are the
  *brand iris* — a multi-hue gradient reads as "opal," not as any single state; the
  charge in AT-08 is about placement/scarcity, not the gradient's existence.
- Past-state check: in the canon family past is white with transparent glow
  (`orbTokens.test.tsx` pins `--orb-indicator-past-glow: transparent` ×2) — TRUE there;
  in the `--state-*` family past is grey in both modes — folded into AT-02.

## A5 — Quiet bounds (burst test)

**Verdict: NOT TRUE in part — the reveal system has real caps; the ambient system as a
whole has none.**

What genuinely caps (code-proven): the backend derivation marks **one** `lit` item —
*"Two fire-lit cards on one surface at once is a defect"* (`RevealCard.tsx` header);
unlit items render without fire. The thread renders `reveals[0]` only — *"one unanswered
reveal per thread"* (`C1Surfaces.tsx:1585-1588,1736-1739`). The chats-list form *never*
carries fire (`RevealListLine` header). The Center deck caps sections at
`DECK_SECTION_CAP = 3` and reveals displace cards rather than stacking on top
(`C2CenterOpening.tsx:85-102`, pinned by `deckfix.test.tsx`).

What does not cap: there is **no ambient-wide ceiling or coalescence anywhere** — no
queue, no delay, no brightest-wins rule for simultaneous *plan-state* signals. In a
burst (several plans crossing + several reveals in one window) every surface simply
renders everything it has: N state borders, N pills, and — because of AT-08 — N
iridescent fire lines on Home/Center, plus the live pulse if anything is live. The
steady state already violates the one-lit ceiling via PlanCardC2, so the burst has
nothing to coalesce *into*. **AT-10.** (The live drive for the burst was not executed —
see Method — but the absence of any capping code path is source-proven; the rendered
consequence follows deterministically from AT-08 + the card CSS.)

**Fix scope:** after AT-08 lands (fire reserved for lit items), add the coalescence
rule to the shell: at most one *animated* ambient element per surface (the lit item);
simultaneous crossings render as static state treatments, and only the strongest
(P1 > P4 > P2 > P3 priority already implied by the reveal categories) may carry the
AT-04 ignition. Pin with a burst fixture in the regression harness.

---

## A6 — Accessibility of the ambient language

**Verdict: LITERALLY TRUE in the large** (source-proven; the reduced-motion emulation
drive on the served build was not executed — see Method — but every behavior's
reduced-motion path is explicit in CSS/component code, cited per item).

**(1) Sound independence — TRUE, verified by construction.** A full inventory sweep of
`apps/opal_web/src` finds **no audio in any ambient path**: no `Audio`, `AudioContext`,
or playback call is tied to a state, a reveal, a completion, or a notification. The only
audio in the product is user-invoked content playback — read-aloud (`ReadAloudButton.tsx`,
`meetOpeningVoice.ts`) and story media (`StoryViewer.tsx`) — none of which carries
ambient information. The ambient channel is fully visual; a deaf or hard-of-hearing user
loses *nothing* the system says ambiently. This is the construction the founder's
no-bell decision (rulebook AR-00) rests on, and it holds.

**(2) No color-alone cues — TRUE at the state-canon level, two low findings.**
The state language never travels by hue alone where it matters:
- **Glyph + label, always:** `planProjection.ts` — *"Pill label + glyph per state. Label
  is ALWAYS shown (never color alone)"*; every state has a distinct glyph
  (○ forming, ◆ action, ✓ ready, ● happening, ◷ past) beside its plain-language label.
- **Pattern:** forming is **dashed** (pill and C2 card border), action carries a
  **3px weighted left edge** (pill and card), past is **rest** (no glow, no fire,
  opacity step) — so forming vs ready is distinguishable by pattern alone
  (dashed vs solid), and action by weight alone.
- **AT-15 (Low):** the *card border pattern* channel does not distinguish **ready from
  happening** (both solid 1px; they differ in hue + glow + the pill's glyph/label).
  The cue as shipped is not color-alone — the glyph+label channel carries it — but the
  pattern channel the doctrine wants is incomplete. Fix scope (rulebook AR-F5): give
  happening a pattern of its own (e.g. the double-ring / outer halo already used by
  `.c2-happening-ring`) on card borders.
- **AT-14 (Low):** the **StateStone** (`FireLine.tsx`) is color + glow only — no
  pattern, no glyph. Its own contract says "always paired with a label by the caller,"
  and on plan cards it sits inside the labeled pill; but it also renders at 28px in the
  PlanCardC2 media fallback beside only an initial letter. Fix scope: pair the fallback
  stone with the state label text, or give the stone a pattern channel (dashed ring =
  forming already exists in its grammar elsewhere).
- Live pulse: the pulsing dot is backed by the live pill's text and the happening
  border — motion is never the only channel. Story rings: unseen (gradient) vs
  happening (solid) vs seen (quiet line) differ in *kind*, not only hue.

**(3) Reduced-motion equivalence — TRUE, and in one place stated as law.**
- The legacy sheet says it outright (`styles.css`, reduced-motion block): *"Kill motion
  only — keep Edge resting glow (meaning must survive)."*
- `c2Tokens.css:338` — under reduced motion, **all** animations and transitions inside
  `[data-design="r18"]` are killed; the static treatments (borders, patterns, glows,
  labels) are untouched, so A1's crossing reads identically, minus the 220ms crossfade.
- The forming breath stops (`unifyChats.css:603-607`) and the fire line remains present
  statically; forming still reads by its dashed border + violet + stone + label.
- The splash living rings render the **rest branch** — the identical settled composition
  (`OrbLivingRings.tsx`); A2's reveal has no motion to lose (AT-04), so parity there is
  trivially satisfied. **Rendered proof exists in the pack:** the reduced-motion splash
  frame is pixel-identical to the settled frame (0.0% differ, max Δ0 — §6).
- Presence (idle breath vs thinking sway, `c1.css:58-59`) is the one motion-*differentiated*
  pair — and it is safe: `PRESENCE_COPY` text ("Working on it.", etc.) always renders
  beside the mark (`C1Surfaces.tsx:184-187,802-816`), so the distinction survives
  statically in words.
- One honest tension, recorded not charged: under reduced motion the dock's ambient orb
  renders **nothing** (`OrbLivingRings.tsx` — "ambient renders nothing"). Parity holds
  only because the dock rings carry no information (AT-06); the day they carry any, the
  parity law requires a static form (rulebook AR-12 condition).

---

## AT findings register

| ID | Claim | Finding | Severity |
|---|---|---|---|
| AT-01 | A1 | ~~C2 plan card border never takes state~~ — **WITHDRAWN on auditor correction**: the register lives in `unifyChats.css` §6 and is canon (see §A1) | — |
| AT-02 | A1/A4 | `--state-*` hue family diverges from canon on C1/pill surfaces (light happening = deep teal, past = grey, both modes); two families, one meaning | High |
| AT-03 | A1 | No live repaint of C2 plan/Home projections on a remote state crossing; refresh is navigation/action/visibility-driven | Medium |
| AT-04 | A2 | Completion/reveal "event" is a static pre-lit FireFrame — no animation, duration, or decay exists | High |
| AT-05 | A2 | No cross-surface ambient signal at the completion moment | Medium |
| AT-06 | A3 | Dock orb ambient rings loop identically regardless of state; never rest | Medium |
| AT-07 | A3 | ~~Claimed forming breath does not exist~~ — **WITHDRAWN on auditor correction**: `unify-forming-breath` ships in `unifyChats.css:570-576` (see §A3) | — |
| AT-08 | A4/A5 | FireLine's meaning shifts by surface (scarce proactive fire on reveals vs constant untinted line on every non-past plan card); one-lit ceiling does not govern the card surface | Medium |
| AT-09 | A4 | Canon hues used decoratively: graph avatar tone cycle, legacy `--accent` cyan, gprof gold/violet labels, living character | Medium |
| AT-10 | A5 | No ambient-wide burst cap/coalescence beyond reveal lit-marking | Medium |
| AT-11 | Rulebook | Legacy-shell ambient loops ship unruled (field shimmer, orbit/particle drift, hue cycle, character breathe) — see rulebook §4 | Medium |
| AT-12 | Rulebook | "Pulse" and "breath" signatures carry different meanings on different surfaces with no intent key — see rulebook §4 | Medium |
| AT-13 | A1 | Graph card surface has no state border treatment; state lives only in the detail pill/line | Low |
| AT-14 | A6 | StateStone is color-alone (hue + glow, no pattern/glyph) wherever it stands without an adjacent label — e.g. the 28px media-fallback stone | Low |
| AT-15 | A6 | Card-border pattern channel does not distinguish ready from happening (both solid 1px); distinction rides on hue + pill glyph/label | Low |
| AT-16 | Sci | Red's avoidance motivation can make users avoid the action item itself; red must stay scarce + paired with a concrete low-friction action (see §7) | Medium |
| AT-17 | Sci | Ready amber/gold carries a caution/transition association (and yellow was the least-pleasant hue family in Valdez & Mehrabian 1994); its "reward" basis is cultural, not experimental — confidence downgraded in the rulebook | Medium |
| AT-18 | Sci | Happening cyan's researched effect is calm/approach (low arousal), which fights the designed "window is short" urgency; urgency must be carried by pulse + words, hue reframed to *open/live/approachable* | Medium |

---

## DRAFT AMBIENT TRUTH STATEMENT (exact text for the delivery)

> **Ambient truth — what is literally true in this build.**
> Opal has a real state language, and it is persistent: every plan, on every main
> surface, carries its state as a colored treatment plus a glyph and a plain-language
> label — violet forming (dashed), red action needed (weighted edge), gold ready,
> cyan happening, quiet past — all rendered from one shared plan projection, so no
> surface invents its own version of a plan's state. Past plans genuinely rest: no
> glow, no fire. When Opal speaks proactively, exactly one item per surface carries
> the iridescent fire frame — never two — and in a chat thread you are shown one
> unanswered reveal at a time. Every ambient element on Home carries a recorded
> one-sentence reason, and all ambient motion stops under reduced-motion and when
> the app is hidden.
>
> **Accessible by construction.** No ambient cue in Opal depends on sound — the
> language is fully visual, which is why there is deliberately no notification
> bell: the ambient identifiers *are* the notification language. No state is ever
> carried by color alone: every state also has a glyph and a plain-language label,
> forming is dashed, action carries a weighted edge, and past rests. Under
> reduced-motion every meaning survives statically — movement is lost, information
> is not.
>
> **What is not yet true, stated plainly.** (1) The colors are not yet one language
> everywhere: Home and the chats/graph pills use the canonical hues exactly, but the
> thread/C1 surfaces render state through a second, mode-adapted palette that
> departs from canon — most visibly in light mode, where "happening" renders deep
> teal and "past" renders grey instead of white. (2) A plan becoming ready does not
> yet *arrive* as an event: the lit YOUR MOVE frame is present from the moment it
> renders — it does not ignite, travel, or settle — and if you are looking at a
> different surface when a plan completes, no ambient signal reaches you there.
> (3) The iridescent fire line means "Opal is speaking" on a reveal but also appears,
> untinted, on ordinary plan cards — one form, two meanings. (4) If several plans
> change state at once, there is no coalescing — everything renders at once; the
> caps that exist cover reveals (one lit, one per thread, three per Center section),
> not the ambient system as a whole.
>
> **What will be fixed, and where.** Item (1) is token convergence (AT-02); item (3)
> is the fire-form split (AT-08); item (2) is the ignition + cross-surface echo work
> (AT-04, AT-05, rulebook AR-F1/AR-F3); item (4) is the burst-coalescence rule
> (AT-10, AR-F4). Until those land and are re-proven at the rendered layer, the
> delivery does not claim them.

---

## §6 — Pack-v2 frames claiming motion/change, and re-proof status

Frames at `~/workspace/opal-graph/shots/repair19/pack-v2/` (manifest tip == audit tip
`9a0a1be4`). Pixel measurements by this auditor (PIL difference, threshold >12):

| Pack claim (frame) | Claims motion/change? | Re-proven? |
|---|---|---|
| Splash living-rings set: `splash/splash-1-dark.png` (settled) vs `-dark-living.png` vs `-dark-t2.png`, plus `splash-1-motion-*.webm` | Yes — 15s settle, points riding rings | **RE-PROVEN at the rendered layer.** living vs settled: 1.0% of pixels differ, max Δ216 (the ring/points region — the rest of the composition is identical); t2 vs living: again 1.0% differ, max Δ216 — the travelers *progress between captures*, i.e. the motion is temporal, not a second static variant. Manifest pins rotor −60°→0°, 15000ms, 1 iteration |
| Splash reduced-motion: `splash/splash-1-dark-reduced-motion.png` | Claims parity (AR-00.6) | **RE-PROVEN, exactly.** reduced vs settled base: **0.0% of pixels differ, max Δ0** — the reduced-motion render is pixel-identical to the rest composition. A6.3's strongest single piece of evidence |
| Home pair `home-dark/light.png` (+ scrolled) | No motion claim — state treatments | **Consistent.** Saturated-pixel sampling finds the forming violet family dominant on Home in both modes (e.g. (128,79,212)-family in dark); the register itself is source-proven (`unifyChats.css` §6). The forming *breath* is a motion claim no still can prove — proven by CSS (`unify-forming-breath`), not by the pack |
| Thread pair `thread-dark/light.png` + Center lit pair `center-deck-lit-reveal-dark/light.png` | Implied event ("confirmed/dismissed inside an ambient border") | **Stills accurate; event refuted.** The lit FireFrame renders exactly as the stills show (deep-red action-family pixels sampled on both frames); that it never *ignites* is source-proven (AT-04 — no animation exists to capture). A still pack cannot show this either way, which is itself the A2 problem: the pack's most important ambient claim is unprovable from its own frames |
| Center/deck pair `center-deck-dark/light.png` | No explicit motion claim | Deck cap re-proven by code + `deckfix.test.tsx`; frames consistent |
| Story-viewer pair, orbit-proposal-chip pair (W21 new) | No ambient motion claim | Not applicable to A1–A3 |
| Dock closeups `dock-closeup-*`, `splash/center-dock-*`, probes `dock-c2-closeup-*` | Ambient orbit (AR-12) | Stills show the device at rest composition; the indefinite orbit is source-proven (`orb.css` laps) and, being state-independent, is AT-06 regardless of what any frame shows |
| In-call frames (F5) | — | `incall-ringing-outgoing-dark.png` exists in the pack; the full in-call set remains the W21 environment gap; out of scope for A1–A3 |

---

## §7 — Scientific-grounding mismatches (from the rulebook extension, 2026-10-19 14:11 PDT)

The rulebook (`ambient-rulebook.md` §1B + per-entry SCIENTIFIC BASIS lines) verifies
every shipped selection against the color–emotion/behavior literature. Three shipped
selections are mismatched to their intended meaning/response. These are AT-class
findings; the canon itself is **not** re-litigated — each carries a re-selection
*constraint or reframe* for the fix wave, with its citation.

- **AT-16 — Action red vs avoidance (constraint, keep the hue).** Red in task contexts
  signals danger/caution and activates *avoidance* motivation (Elliot et al., 2007;
  Elliot & Maier, 2014; Mehta & Zhu, 2009). For "action needed" that is the right
  attention signal with a real side-effect: avoidance can attach to the item itself.
  Re-selection recommendation: **keep `#FF4D5E`, bind its use** — red only where the
  viewer genuinely must act, always beside the concrete action verb (the pill already
  does this), never decorative (AT-09's red-adjacent uses compound the risk), and
  never as a loop/pulse (alarm habituation). Honesty note: a meta-analysis finds
  red's *performance* effects limited/heterogeneous (Lehmann & Calin-Jageman, 2020);
  the rulebook's confidence for red is moderate-high on attention, moderate on
  behavior — the rulebook says so rather than overselling.
- **AT-17 — Ready amber vs caution (constraint + downgraded claim, keep the hue).**
  Amber is the near-universal caution/transition signal ("prepare to stop"), and
  yellow hues were the *least pleasant* family in Valdez & Mehrabian (1994), while
  sitting in the positive *high-arousal* cluster in the 132-study correspondence
  review (Jonauskaite & Mohr, 2025). Gold's value/achievement association is genuine
  but cultural/historical (branding-association literature; Labrecque & Milne,
  2011) — **no experimental basis exists for "amber produces reward anticipation,"
  and the rulebook now labels that claim folk-level.** Re-selection recommendation:
  keep `#FFC86B` for ready (warmth + value is the honest mechanism), but the ✓ glyph
  and "Ready" label are load-bearing and must never be removed, gold must not expand
  into primary go-CTAs, and any future "reward" copy claim is struck unless a record
  supports it (ethical bound, rulebook AR-00.9).
- **AT-18 — Happening cyan vs urgency (reframe the intent, keep the hue).** Cyan/blue
  hues research as calm, trusted, approach-oriented, **low-arousal** (Palmer &
  Schloss, 2010; Mehta & Zhu, 2009; Jonauskaite & Mohr, 2025). The designed intent
  "live now — the window is short" asks the hue to say urgency it does not say.
  Re-selection recommendation: **reframe happening's intended response to "open,
  live, approachable — join"** (which cyan genuinely supports); real time-pressure
  is stated in words and times (the live card already shows them) and, if an urgency
  event signature is ever needed, it comes from motion (AR-F1), never from
  re-hueing happening toward an arousal color. (The divergent light-mode teal of
  AT-02 sits even deeper in the calm cluster — convergence to canon cyan is also
  the scientific fix.)

**What the literature supports without qualification** (recorded so the fix wave
doesn't break them): the ambient *intensity* system (saturation drives arousal more
than hue — Valdez & Mehrabian, 1994 — so 42–55% mixes are the right mechanism);
past-as-rest (brightness–valence, replicated — Meier et al., 2004/2015 — plus
arousal subtraction); the forming breath's family (peripheral slow oscillation
calmed breathing and improved focus in a placebo-controlled trial — Ghandeharioun
& Picard, 2017 — with the rulebook's honest note that a 5s period claims
anticipation, not entrainment); one-shot onsets as the event signature (Jonides &
Yantis, 1988 — the basis of AR-F1); and violet-for-forming (among the most pleasant,
least arousing hues — Valdez & Mehrabian, 1994; "empowering" — Jonauskaite & Mohr,
2025), with its "creativity/premium" gloss downgraded to branding association.

*End of audit. Companion deliverable: `ambient-rulebook.md` (AR-00 constitution incl.
AR-00.9 the ethical bound, §1B canon science, AR-01…AR-17 + AR-F1…AR-F6, §6 sources).*
