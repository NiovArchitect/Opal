# THE AMBIENT RULEBOOK — Opal's Ambient Language as Rules

**Repair #19 · design-system artifact · companion to `ambient-truth-audit.md`**
**Premise (founder, 2026-10-19 14:03 PDT):** *"One solid color does nothing; the ambient
system needs a LARGE SET OF RULES."* This is that set: every ambient behavior shipped in
the build at tip `9a0a1be4`, catalogued as a named rule with its motion signature, its
color behavior against the state canon, its intensity/duration envelope, the MEANING it
carries, and the EMOTIONAL CUE it intends. Behaviors the doctrine calls for but the build
lacks are marked **FUTURE** — named gaps, not padding.

**Vocabulary honesty note:** the build's motion vocabulary is *thin*. What genuinely
exists: a **slow breath** (opacity/scale), a **gentle pulse** (opacity, dot only), a
**slow orbit** (points riding rings), a **one-shot settle** (travel that lands and
stops), **one-shot enters** (220–640ms), and **static treatments** (border, pattern,
glow). There is **no** warming spread, **no** traveling light along a border, **no**
settling shadow anywhere in the shipped build — those words appear below only as
FUTURE rules (AR-F1, AR-F2), because a completion the doctrine treats as an event
currently has no event signature at all (audit AT-04).

**State canon (all rules reference it):** action `#FF4D5E` · ready `#FFC86B` ·
forming `#8B5CF6` · happening `#00E5FF` · past white. Canonical tokens:
`--orb-indicator-*` / `--plan-state-*` (exact, mode-invariant, test-pinned).
The divergent `--state-*` family on C1/pill surfaces is audit finding **AT-02**;
rules below state which family each behavior actually consumes.

---

## AR-00 — Governing rules (the constitution every AR entry sits under)

- **AR-00.1 PERSISTENCE LAW.** A behavior's meaning never varies — not by surface, not
  by mode, not by context. A behavior found carrying two meanings is drift and is
  charged as an audit finding (see AR-06, charged as AT-08).
- **AR-00.2 QUIET BUDGETS.** At most **one lit (fire) element per surface**; at most
  **one animated element per surface** among state treatments (the forming breath and
  the live pulse never compete on one card); ambient intensities live at **6–20%
  fills, 42–55% border mixes, glows ≤ 18px at ≤ 55% strength**; loops are **≥ 2s**,
  opacity/scale only, never layout. Anything louder is not ambient — it is an alert,
  and alerts are not in this language.
- **AR-00.3 JUSTIFICATION.** Every ambient element states its reason in one sentence
  or is cut. (Home's shipped set does this in code: `HOME_AMBIENT_ELEMENTS`,
  `C2Home.tsx`.)
- **AR-00.4 NO SOUND DEPENDENCE.** No ambient cue's information is carried by sound.
  The channel is fully visual — verified by inventory (audit A6.1): the product's only
  audio is user-invoked content playback, which carries no ambient meaning.
- **AR-00.5 NO COLOR-ALONE.** Every meaning carried by hue is also carried by at
  least one of: **pattern** (dash, weight, rest), **glyph + label**, or **position**.
  An entry below that cannot name its second channel is incomplete and is flagged in
  the audit.
- **AR-00.6 REDUCED-MOTION PARITY.** A reduced-motion user loses movement, never
  information: every rule names its **static equivalent**, and the static form must
  render the same meaning. The shipped law, in the code's own words: *"Kill motion
  only — keep [the] resting glow (meaning must survive)"* (`styles.css`).
- **AR-00.7 THE ABSENT BELL (recorded design decision).** There is **no notification
  bell** in Opal, deliberately. The ambient identifiers — state borders, the lit fire
  frame, the activity count — *are* the notification language. Founder's reasoning:
  for deaf and hard-of-hearing users, visual identifiers carry what sound-based
  systems cannot; a bell would duplicate, in a lesser channel, what the ambient
  language already says accessibly by construction. Do not reintroduce a bell, a
  chime, or a sound-keyed cue without retiring this rule explicitly.
- **AR-00.8 INTENT-KEYED VARIANCE.** Variance is keyed to intent (state, priority,
  presence), never random. Ambient motion that varies without an intent key is drift
  (see §4).
- **AR-00.9 THE ETHICAL BOUND (founder's doctrine — guided, yet in control).**
  Science guides **HOW** a true state is expressed, never **WHAT** is expressed. A
  color may amplify a true state; it may never fabricate one to provoke behavior.
  No hue, pulse, or glow may be used to manufacture urgency, scarcity, readiness, or
  delight that the underlying record does not support. The aim is **influence, not
  manipulation**: the user is guided by a language that tells the truth more
  legibly — and the QUIET budgets (AR-00.2) stand regardless of what the research
  says a louder treatment could extract. Any future rule whose scientific basis is
  "this makes users act" without "and the state is true" is void on arrival.

## §1B — The state canon, scientifically (basis + intended response per color)

*Method note: bases below cite the peer-reviewed record as found, including where it
cuts against the canon. Confidence is stated per color and downgraded where the
literature is thin, contested, or folk/branding-level rather than experimental.*

- **ACTION `#FF4D5E` (red family).** BASIS: the most-studied hue in the field. Under
  color-in-context theory (Elliot & Maier, 2014), red in achievement/task contexts
  signals danger/caution and activates avoidance motivation and attention to mistakes
  (Elliot et al., 2007; Mehta & Zhu, 2009 — red improved detail/proofreading
  performance); ERP work shows red captures attention in emotional contexts. Long-
  wavelength hues are reliably the more physiologically arousing (Buechner & Maier,
  2016; Valdez & Mehrabian, 1994). HONEST CAVEAT: a meta-analysis of red's *cognitive
  performance* effects found the evidence limited and heterogeneous (Lehmann &
  Calin-Jageman, 2020) — the attention/danger association is the robust part; precise
  behavioral magnitudes are not settled. CONFIDENCE: moderate-high for attention,
  moderate for behavior. INTENDED RESPONSE: "Stop — this one needs you; handle it
  carefully, now." MISMATCH RISK → **AT-16**: avoidance motivation is double-edged —
  red can make a user *avoid the item itself*. Mitigation (binding): red stays scarce
  (it marks only genuine viewer-action), always beside a concrete, low-friction action
  label, and never decorative (see AT-09).
- **READY `#FFC86B` (amber/gold).** BASIS: two literatures, pulling opposite ways.
  (a) Yellow/amber hues are positive, *high-arousal* in the 132-study colour–emotion
  correspondence review (Jonauskaite & Mohr, 2025) and yellow was the *least pleasant*
  hue family in Valdez & Mehrabian (1994). (b) Gold's association with value,
  achievement, and reward is real but **cultural/historical, not experimental** —
  branding and consumer-association literature (Labrecque & Milne, 2011 and the
  luxury-association record), with no controlled study showing amber light produces
  "reward anticipation." "Amber = reward anticipation" as a *scientific* claim is
  **folk-level; downgraded.** CONFIDENCE: low-moderate. INTENDED RESPONSE: "Earned.
  Warm. Good to go." MISMATCH → **AT-17**: amber is also the near-universal *caution/
  transition* signal (the amber traffic phase: prepare to stop) — the opposite of
  "go." The canon keeps gold for its value/warmth association, but amber must never
  be the *sole* carrier of a go-decision; the ✓ glyph + "Ready" label (AR-03) is
  load-bearing here, and gold is not to expand into primary CTAs (fix-wave
  re-selection constraint, audit §7).
- **FORMING `#8B5CF6` (violet).** BASIS: purple/violet rated among the *most pleasant*
  hues and purple-blue among the *least arousing* (Valdez & Mehrabian, 1994);
  purple corresponds to *empowering* emotions in the correspondence review
  (Jonauskaite & Mohr, 2025) — a good fit for "potent but not yet settled." The
  popular "violet = creativity/premium" claim rests on branding-association surveys
  (Labrecque & Milne, 2011) and a historical accident (Tyrian purple's cost), **not**
  on experimental creativity effects — stated as association, not mechanism.
  CONFIDENCE: moderate for calm-pleasant anticipation; low for any creativity claim.
  INTENDED RESPONSE: "Something is taking shape — lean in, no pressure yet."
  MISMATCH: none material; violet's low arousal correctly *under*-sells urgency for
  a state that should not demand anything.
- **HAPPENING `#00E5FF` (cyan).** BASIS: blue/blue-green hues are the most preferred
  cross-culturally (ecological valence theory — clear sky/clean water associations;
  Palmer & Schloss, 2010, PNAS), correspond to **positive, low-arousal** emotions
  (Jonauskaite & Mohr, 2025), and prime approach motivation and openness (Mehta &
  Zhu, 2009). CONFIDENCE: moderate-high for calm/approach/trust. INTENDED RESPONSE
  (as designed): "Live now — the window is short." MISMATCH → **AT-18**: the hue's
  researched effect is *calm*, which fights the designed *urgency*. The build
  survives this because the urgency is actually carried by the pulse (AR-07) and the
  "live" words, not the hue — the honest reframe, recommended to the fix wave:
  happening's intended response is "**open, live, approachable — join**" (approach
  is what cyan genuinely supports), and any true time-pressure must be stated in
  words/time, never implied by the color.
- **PAST white.** BASIS: brightness–valence association — white/bright stimuli are
  categorized with positive valence faster, an effect that survived a large-scale
  replication (Meier, Robinson & Clore, 2004; Meier, Fetterman & Robinson, 2015);
  white/grey-blue hues sit in the positive, low-arousal cluster (Jonauskaite & Mohr,
  2025). For "past" the operative mechanism is not positivity but *absence of
  chromatic signal* — no hue is bidding for attention. CONFIDENCE: moderate-high.
  INTENDED RESPONSE: "Settled and complete; nothing is asked of you." MISMATCH:
  mild and recorded — white can also read as *blank/absent* rather than *complete*;
  the ◷ glyph + "Past" label + the opacity step (AR-10) carry the distinction.
  (The `--state-*` family's grey past, AT-02, accidentally lands in the review's
  "grey = negative, low-arousal" cluster — one more reason it must converge.)

## Master table

| Rule | Behavior | Status | Motion signature | Meaning in one line |
|---|---|---|---|---|
| AR-01 | C1 plan-card state border | SHIPPED | static; 220ms crossfade on change | This plan's state, at a glance (thread/C1 surfaces) |
| AR-02 | Home/Center plan-card state register | SHIPPED | forming breath (fire line, 5s) | The fullest state read in the app — hue + pattern + glow |
| AR-03 | State pill (glyph + label) | SHIPPED | none | The state's name, never color alone |
| AR-04 | StateStone | SHIPPED ⚠ AT-14 | none | A miniature orb wearing the state hue |
| AR-05 | FireFrame — the lit reveal | SHIPPED ⚠ AT-04 | **none (static)** | Opal is speaking proactively, right now — one per surface |
| AR-06 | FireLine on plan cards | SHIPPED ⚠ AT-08 | forming: breath | (disputed — see entry) |
| AR-07 | Live pulse + live card | SHIPPED | gentle pulse, 2.4s (dot) | Someone/something is live *now*; the window is short |
| AR-08 | Story ring | SHIPPED | none | New (iris) / happening (solid) / seen (quiet) |
| AR-09 | Chats-row state edge | SHIPPED | none | The plan inside this conversation, and its state |
| AR-10 | Past rest | SHIPPED | none — absence as signal | Settled. Nothing is being asked of you |
| AR-11 | Orb hero settle (Splash 1) | SHIPPED | slow orbit travel, 15s, settles | An opening, not a state — arrival and calm |
| AR-12 | Dock ambient orbit | SHIPPED ⚠ AT-06 | slow orbit, 96s/72s/160s, indefinite | Presence only — carries no state (exception on record) |
| AR-13 | Presence breath / sway (Opal mark) | SHIPPED | breath 5s (idle) / sway 3s (thinking) | Opal is here / Opal is working — always paired with words |
| AR-14 | Activity badge count | SHIPPED | none | Something changed since you last looked; absent when nothing is new |
| AR-15 | Entity tint | SHIPPED | none | *Who*, not *what state* — identity channel |
| AR-16 | Moment enter / refraction (legacy) | SHIPPED | one-shot enter 220–520ms | A new thing arriving on a legacy surface |
| AR-17 | Legacy field loops (shimmer/drift/hue) | SHIPPED ⚠ AT-11/12 | loops 8–11s | **Unruled** — no recorded meaning (see §4) |
| AR-F1 | Ignition (completion event) | FUTURE | traveling light + bloom/decay ~900ms | A plan just completed — the event signature the doctrine requires |
| AR-F2 | Warming spread (state crossing) | FUTURE | gradient sweep along the border, ~600ms | You can *watch* forming become ready |
| AR-F3 | Cross-surface echo | FUTURE | one-shot dock tint, decays on view | It happened while you were looking elsewhere |
| AR-F4 | Burst coalescence | FUTURE | strongest-wins, rest static | Many changes, one voice |
| AR-F5 | Happening pattern (double ring) | FUTURE | static pattern | Closes the ready-vs-happening pattern gap (AT-15) |
| AR-F6 | Action signature | FUTURE | none yet — reserved | Action-needed must not borrow the live pulse's family |

⚠ = carries an audit finding; the entry states it.

---

## Rule entries

### AR-01 — C1 plan-card state border · SHIPPED
- **Where:** thread plan cards, plan-awareness, Center C1 hosts (`c1.css`,
  `unifyChats.css:546-550`).
- **Motion signature:** none at rest; on a state change, a **220ms border-color
  crossfade** (`transition: border-color 220ms`) — the build's only crossing motion.
- **Color/gradient:** state hue at 52% mix over the quiet line — ⚠ consumed from the
  divergent `--state-*` family (AT-02), so the rendered gold/teal/grey depart from
  canon, most visibly in light mode.
- **Intensity + duration:** border only, no glow; 220ms on change, then static.
- **Meaning:** "This plan is in state X" — the perimeter read before any words.
- **Emotional cue:** steadiness — the room quietly re-labels itself; nothing flashes.
- **CHANNELS:** color (state hue, ⚠ non-canon family) / pattern: solid for all states
  on the border itself — the pattern channel lives in the pill (AR-03) / motion: the
  220ms crossfade is transitional only, carries nothing / **static (reduced-motion)
  equivalent: the identical border, applied instantly** (transitions are killed under
  `[data-design="r18"]` reduced-motion, `c2Tokens.css:338`) — parity holds.
- **SCIENTIFIC BASIS:** the state hues' bases are §1B per color. The crossfade itself
  rests on a null: a 220ms color transition is below the threshold at which onsets
  capture attention involuntarily (Jonides & Yantis, 1988) — deliberately.
- **INTENDED RESPONSE:** register the change peripherally, without being summoned.

### AR-02 — Home/Center plan-card state register · SHIPPED
- **Where:** `PlanCardC2` on Home and the Center deck, treatments in
  `theme/unifyChats.css` §6 (565-596).
- **Motion signature:** **slow breath on the fire line, forming only** —
  `unify-forming-breath`, 5s, opacity 0.62→1. All other states: no motion.
- **Color/gradient:** **canon** `--orb-indicator-*` at ambient mixes — border 42–52%,
  glow ≤ 18px at ≤ 55%, a 6–7% warm/violet gradient ground on ready/forming cards.
- **Intensity + duration:** one lit element per card (fire line + state stone); breath
  is indefinite *while forming*; everything else static.
- **Meaning:** the full state read — forming = dashed border + breath (still taking
  shape); action = weighted 3px left edge (it needs *you*); ready = warm gold ground
  (earned, settled, go); happening = cyan glow (now); past = rest (AR-10).
- **Emotional cue:** anticipation for forming, gentle urgency for action, warmth for
  ready, electricity for happening, peace for past.
- **CHANNELS:** color (canon) / **pattern: dashed (forming) · 3px left weight (action)
  · solid (ready/happening) · rest (past)** — ready vs happening share a pattern
  (⚠ AT-15, closed by AR-F5) / motion: forming breath only, redundant with the dashed
  pattern / **static equivalent: the identical register with the fire line at full
  opacity** (breath killed, `unifyChats.css:603-607`) — parity holds.
- **SCIENTIFIC BASIS:** hue bases per §1B. Saturation/brightness, more than hue,
  drive arousal (Valdez & Mehrabian, 1994: arousal ≈ .60·S − .31·B) — the 42–55%
  mixes and ≤55% glows are exactly the mechanism that keeps canon hues at ambient
  arousal. The forming breath's basis is AR-13's (peripheral slow oscillation can
  entrain calmer breathing — Ghandeharioun & Picard, 2017); honest note: at a 5s
  period it runs ~12 cycles/min, faster than paced-breathing targets, so its claim
  is *anticipation*, not entrainment.
- **INTENDED RESPONSE:** read the whole state off the card's perimeter before a
  single word — anticipation (forming), summons (action), warmth (ready), life
  (happening), peace (past).

### AR-03 — State pill (glyph + label) · SHIPPED
- **Where:** every plan surface (`PlanCardC2`, C1 cards, chats, graph detail).
- **Motion signature:** none.
- **Color/gradient:** state family at ~13–20% fill + 1px border + state ink
  (`opalComposerTokens.css`, `unifyChats.css`); canon family on chats/graph, ⚠
  `--state-*` family in C1/C2 pills (AT-02).
- **Intensity + duration:** pill scale only; permanent while the state lasts.
- **Meaning:** the state's *name* — "Forming / Action needed / Ready / Happening /
  Past" — always beside its glyph (○ ◆ ✓ ● ◷).
- **Emotional cue:** literacy — the label teaches the color until the color alone is
  enough; the label never leaves.
- **CHANNELS:** color / **pattern: dashed (forming), 3px left edge (action)** /
  **glyph + text label (always — `planProjection.ts`: "never color alone")** /
  motion: none / **static equivalent: itself** — parity trivially holds. This rule is
  the backbone of AR-00.5.
- **SCIENTIFIC BASIS:** redundant coding — dual-channel (symbolic + chromatic)
  presentation is the standard defense against both color-vision deficiency and
  hue-association variance across cultures (the correspondence literature is
  many-to-many: Jonauskaite & Mohr, 2025). The label does the semantic work; the
  hue does the speed work.
- **INTENDED RESPONSE:** instant recognition that improves with exposure — the
  definition of a learnable language.

### AR-04 — StateStone · SHIPPED ⚠ AT-14
- **Where:** plan pills (12px), media fallback (28px), card grammar (`FireLine.tsx`).
- **Motion signature:** none. **Color:** canon indicator ring + 8px state glow; past =
  pale ring, no glow, no fire.
- **Meaning:** the orb itself, miniaturized, wearing the state — "the stone says it."
- **Emotional cue:** continuity with the master mark; the app in miniature.
- **CHANNELS:** color + glow / pattern: **none** / glyph+label: **none of its own —
  contractually paired with a label by its caller** / motion: none / static
  equivalent: itself. ⚠ **Incomplete under AR-00.5** wherever it stands unpaired
  (28px media fallback) — charged as **AT-14**; fix: pair it or give the ring the
  dashed pattern for forming.
- **SCIENTIFIC BASIS:** none of its own — it inherits the hue bases of §1B and adds
  only miniaturization. No literature supports a bare colored dot as a state language.
- **INTENDED RESPONSE:** a felt continuity with the orb — recognition, not reading.

### AR-05 — FireFrame, the lit reveal · SHIPPED ⚠ AT-04
- **Where:** the one lit reveal per surface — thread YOUR MOVE card, Center deck,
  chats (list form never carries fire) (`RevealCard.tsx`, `orb.css:68-95`).
- **Motion signature:** **none.** The frame is pre-lit and static — there is no
  ignition, travel, bloom, or decay. This is the vocabulary's largest hole (AR-F1).
- **Color/gradient:** the iris fire gradient (violet→blue→cyan→magenta→gold) as a 1px
  border ring + a 16px glow tinted to the reveal category's state family
  (P1 action · P2 ready · P3 forming · P4 happening · P5 iris itself · P6 no fire ·
  P7 ready at its softest).
- **Intensity + duration:** one per surface, hard-capped by the backend derivation
  ("two fire-lit cards on one surface is a defect"); persists until answered or
  dismissed — no decay.
- **Meaning:** "Opal is speaking proactively, right now, about something real."
- **Emotional cue:** a lit doorway — warmth and importance without alarm.
- **CHANNELS:** color (gradient + state-tinted glow) / pattern: the gradient ring
  itself vs the plain hairline of unlit cards / glyph + kicker text on the card /
  motion: **none — and none needed for parity** / **static equivalent: itself.**
  Parity holds trivially; the finding (AT-04) is about the missing *event*, not
  accessibility.
- **SCIENTIFIC BASIS:** scarcity is the mechanism — a signal present on one item
  retains attentional value; the same signal everywhere habituates to zero (the
  onset-capture literature shows capture is contrast-driven: Jonides & Yantis,
  1988). The glow tint inherits §1B per category state.
- **INTENDED RESPONSE:** "This one. Opal has something real for me" — importance
  felt as warmth, not alarm (AR-00.9: the item must *be* the strongest true item).

### AR-06 — FireLine on plan cards · SHIPPED ⚠ AT-08 (meaning dispute)
- **Where:** every non-past `PlanCardC2` (`PlanCardC2.tsx:163-167`).
- **Motion signature:** static, except forming (AR-02's breath animates this line).
- **Color/gradient:** the full iris gradient, **untinted** — identical for forming,
  action, ready, and happening cards.
- **Meaning:** ⚠ **two meanings on record** — the fire language defines iris fire as
  AR-05's scarce proactive signal; the card grammar uses the same line as a constant
  "this card is alive" register. Under AR-00.1 that is drift, charged as **AT-08**.
- **Emotional cue:** intended — a thread of the orb's fire running through the plan;
  received — decoration, because it is everywhere.
- **CHANNELS:** color (gradient; carries no state) / pattern: none / motion: forming
  breath (shared with AR-02) / **static equivalent: the line itself.** Disposition:
  state-tint the card line and reserve iris for lit reveals (audit fix scope).
- **SCIENTIFIC BASIS:** none that survives AR-00.9 — a constant multi-hue line on
  every card is the habituation case above: whatever signal value iris fire has is
  spent by ubiquity. CONFIDENCE in its current form: the science argues *against* it.
- **INTENDED RESPONSE:** (as designed) aliveness; (as researched) background noise —
  the gap is the finding.

### AR-07 — Live pulse + live card · SHIPPED
- **Where:** Home live card (`c2shell.css:542-568`); C1 live dot (`c1.css:86-88`, 2s).
- **Motion signature:** **gentle pulse** — a 7–8px happening dot, opacity 0.55→1,
  2.4s ease-in-out, indefinite while live; the card itself is static (happening
  border at 50% + 16px glow at 55%).
- **Color/gradient:** canon happening cyan family.
- **Meaning:** "This is happening *now* and the window is short."
- **Emotional cue:** a heartbeat at the edge of attention — alive, not demanding.
- **CHANNELS:** color (happening) / pattern: the live pill's text + dot / **motion:
  the pulse — redundant, never sole** / **static equivalent: dot at full opacity +
  border + pill remain** (pulse is animation-killed under reduced motion; the state
  still reads) — parity holds.
- **SCIENTIFIC BASIS:** hue per §1B happening (calm/approach — see the AT-18
  reframe: the hue says *open*, the pulse says *now*). Periodic peripheral motion
  is attention-maintaining without the startle of an onset (contrast Jonides &
  Yantis, 1988); the 2.4s period and opacity-only range keep it under the QUIET cap.
- **INTENDED RESPONSE:** peripheral awareness of liveness — notice it when you
  glance, never be pulled by it.

### AR-08 — Story ring · SHIPPED
- **Where:** Home story rail (`c2shell.css:400-405`).
- **Motion signature:** none. **Color/gradient:** unseen = iris gradient ring
  (`--grad-current`); live story = solid happening; seen = the quiet line.
- **Meaning:** "New to you" / "happening now" / "already seen" — read before names.
- **Emotional cue:** people before chrome; a small invitation, not a badge of debt.
- **CHANNELS:** color / **pattern: gradient vs solid vs quiet line — a difference of
  kind, not only hue** / motion: none / **static equivalent: itself.**
- **SCIENTIFIC BASIS:** convention, honestly labeled — the unseen/seen ring is a
  learned platform grammar (stories), not a researched association; its happening
  variant inherits §1B cyan. Learned conventions are legitimate language *once
  taught consistently* (AR-00.1), but no emotion claim is made for the gradient.
- **INTENDED RESPONSE:** "someone has something new" — curiosity without debt.

### AR-09 — Chats-row state edge · SHIPPED
- **Where:** chats list rows + plan-awareness area (`unifyChats.css:207-210`,
  `styles.css:19141-19162`).
- **Motion signature:** none. **Color:** canon `--plan-state-color` — 13% row fill,
  48% border mix, **2px inset left edge** in the state hue.
- **Meaning:** "This conversation holds a plan, and this is its state" — without
  opening the thread.
- **Emotional cue:** peripheral awareness; the list itself is quietly thinking.
- **CHANNELS:** color (canon) / **pattern: the inset edge + row fill step** / the
  row's plan pill (AR-03) / motion: none / **static equivalent: itself.**
- **SCIENTIFIC BASIS:** §1B per state; the inset-edge placement exploits preattentive
  peripheral processing — an edge treatment is registered in a list scan before any
  row is read (the onset/singleton literature's general lesson: structural
  singletons are found first — Jonides & Yantis, 1988).
- **INTENDED RESPONSE:** triage a whole list at a glance; open only what needs you.

### AR-10 — Past rest · SHIPPED
- **Where:** every surface's past treatment (C1 card opacity 0.72; C2 card 0.78;
  StateStone no-glow; FireFrame `[data-orb-state="past"]` glow removed).
- **Motion signature:** none — **absence is the signature.** No glow, no fire line,
  no breath, no pulse.
- **Color:** canon white in the indicator family (⚠ grey in the `--state-*` family,
  AT-02 — the one place "rest" itself drifts).
- **Meaning:** "Settled. Nothing is being asked of you."
- **Emotional cue:** peace; a closed loop the eye can release.
- **CHANNELS:** color / **pattern: rest itself (the *removal* of every active
  treatment is the pattern)** / glyph ◷ + "Past" label / motion: none /
  **static equivalent: itself.**
- **SCIENTIFIC BASIS:** §1B past (brightness–valence, replicated: Meier et al.,
  2004/2015). The deeper basis is arousal subtraction: with saturation the strongest
  arousal driver (Valdez & Mehrabian, 1994), *removing* chromatic signal is the most
  reliable calm the system can produce.
- **INTENDED RESPONSE:** release — the eye, and the user, may let this one go.

### AR-11 — Orb hero settle (Splash 1) · SHIPPED
- **Where:** Splash 1 living rings (`OrbLivingRings.tsx`, `orb.css` rotors/riders).
- **Motion signature:** **slow orbit travel that settles** — circular rotor −60°→0°
  and ellipse riders exchanging ends over 15s with a 0.45s beat, points *riding* their
  rings by construction; the arc precesses +55°→0° and fades out; then the component
  renders the rest branch — the settled frame *is* the still master.
- **Color/gradient:** the master's own sampled fire; no state hues (this is brand, not
  state — the distinction is deliberate).
- **Intensity + duration:** 15.45s total, once; GPU transforms only; paused when the
  document is hidden.
- **Meaning:** no state meaning — an *opening*: arrival, coherence assembling itself.
- **Emotional cue:** a held breath released; "something is being prepared for you."
- **CHANNELS:** color: brand fire (not state) / pattern: the ring geometry / **motion:
  carries no information — its content is identical at rest** / **static (reduced-
  motion) equivalent: the rest composition, rendered immediately** — parity by
  construction, the model AR-00.6 entry.
- **SCIENTIFIC BASIS:** motion that *resolves to rest* avoids the repeated capture
  of indefinite onsets/loops (Jonides & Yantis, 1988); a slow ease to a known final
  state reads as settling, the visual analogue of the paced-breathing calm pathway
  (Ghandeharioun & Picard, 2017 — peripheral oscillation, placebo-controlled).
  Confidence: moderate; the claim is *calm arrival*, nothing stronger.
- **INTENDED RESPONSE:** anticipation resolving into trust — "it knows where it's
  going, and now it's here."

### AR-12 — Dock ambient orbit · SHIPPED ⚠ AT-06 (presence exception)
- **Where:** the dock's orb device, every surface.
- **Motion signature:** **slow orbit shimmer, indefinite** — circle 96s linear,
  ellipse 72s, arc 160s reverse; points ride their rings exactly as AR-11.
- **Meaning:** **none — presence only.** This is the rulebook's one recorded
  *atmosphere exception*: its reason ("the dock's job is presence") is on record in
  `OrbLivingRings.tsx`, and it is charged in the audit (**AT-06**) because the
  doctrine's default is that ambience answers to activity, and this never rests.
  Founder disposition required: keep as a named exception, or key its glow to the
  strongest live state (recommended — presence that also informs).
- **Emotional cue:** the app is awake; a hearth, not a signal.
- **CHANNELS:** color: brand fire / pattern: ring geometry / motion: the orbit
  itself / **static equivalent: NONE — under reduced motion the ambient layer renders
  nothing.** Acceptable *only* while it carries no information (AR-00.6 condition,
  audit A6.3); the moment it carries any, a static form is required.
- **SCIENTIFIC BASIS:** the weakest in the book, stated plainly: indefinite slow
  motion at 72–160s laps sits *below* attentional capture for most of its cycle,
  and no study supports "presence" as a user benefit — it is an aesthetic
  preference with a plausible calm-technology rationale (peripheral, non-demanding
  displays: the tradition behind BrightBeat, Ghandeharioun & Picard, 2017).
  CONFIDENCE: low. That is precisely why AT-06 asks for a founder disposition
  rather than letting it borrow the language's authority.
- **INTENDED RESPONSE:** felt aliveness of the product — nothing more is claimed.

### AR-13 — Presence breath / sway (Opal's mark, C1) · SHIPPED
- **Where:** Center/C1 presence mark (`c1.css:58-61`, `C1Surfaces.tsx`).
- **Motion signature:** **breath** — idle: scale 1→1.02, 5s; **sway** — thinking:
  rotate ±2°, 3s. (Two signatures, one family — see §4 for the pulse/breath naming
  discipline this creates.)
- **Color:** the iris gradient ring around a calm core.
- **Meaning:** "Opal is here" (idle) / "Opal is working on it" (thinking) —
  **always paired with `PRESENCE_COPY` words** beside the mark.
- **Emotional cue:** companionship; a mind at rest vs a mind at work.
- **CHANNELS:** color (iris) / pattern: none / **motion: breath vs sway — the one
  motion-differentiated pair in the build, made safe by the ever-present text** /
  **static equivalent: the mark at rest + the same words** — parity holds *because of
  the text channel*; remove the words and this entry fails AR-00.5/00.6.
- **SCIENTIFIC BASIS:** the breath half inherits the paced-oscillation evidence
  (Ghandeharioun & Picard, 2017, placebo-controlled RCT, N=32: peripheral rhythmic
  oscillation significantly slowed breathing and improved self-reported calm/focus).
  The sway = "thinking" mapping has **no literature** — it is an internal convention,
  carried by the paired words; labeled as such rather than dressed as science.
- **INTENDED RESPONSE:** companionship with a visible mind — rest when it rests,
  patience while it works.

### AR-14 — Activity badge count · SHIPPED
- **Where:** Home header (`C2Home.tsx`, `HOME_AMBIENT_ELEMENTS`).
- **Motion signature:** none. **Color:** quiet chrome; the *number* is the signal.
- **Meaning:** "Something changed since you last looked" — and by its **absence**,
  "nothing is new" (presence discipline: the badge does not render at zero).
- **Emotional cue:** a tap on the shoulder you can trust, because it is silent when
  there is nothing to say.
- **CHANNELS:** color: neutral / **pattern: presence vs absence** / **the count itself
  (numeric text)** / motion: none / **static equivalent: itself.**
- **SCIENTIFIC BASIS:** numerosity is preattentively processed and a *count* makes
  no emotional claim at all — the most honest signal in the system. Its discipline
  (absent at zero) follows the same scarcity logic as AR-05.
- **INTENDED RESPONSE:** a quiet, checkable fact — "three things changed" — that
  the user can verify, keeping them in control (AR-00.9).

### AR-15 — Entity tint · SHIPPED
- **Where:** faces, monograms, reveal entity dot, story faces (DIR-1
  `--person-tint-*`).
- **Motion signature:** none. **Color:** a per-person tint from a non-state palette.
- **Meaning:** **identity, not state** — "*who* this is," stable per person across
  surfaces. (Its discipline matters to this rulebook: entity tints must never borrow
  a state hue at state intensity, or *who* starts reading as *what state* — the
  decorative canon-hue uses charged in AT-09 are exactly that failure at the palette
  level.)
- **Emotional cue:** recognition — a face's color the way you know a voice.
- **SCIENTIFIC BASIS:** ecological valence in reverse — a tint bound to a *person*
  accumulates that person's valence for the user (Palmer & Schloss, 2010's
  mechanism, applied socially). The association is earned per-person, not assigned
  by hue psychology; no hue claim is made.
- **INTENDED RESPONSE:** instant "who" recognition across every surface.
- **CHANNELS:** color (identity) / pattern: the monogram initial / motion: none /
  **static equivalent: itself.**

### AR-16 — Moment enter / refraction (legacy shell) · SHIPPED
- **Where:** legacy `styles.css` surfaces (`.opal-moment`, possibility/resolution
  fields).
- **Motion signature:** **one-shot enters** — 220ms enter + 480–640ms refraction/
  converge shimmers on arrival and resolution.
- **Meaning:** "a new thing has arrived / resolved here," on the legacy face only.
- **Emotional cue:** light catching glass — brief, then calm.
- **CHANNELS:** color: spectral family / pattern: contour/edge treatments /
  motion: one-shot, redundant with the card's arrival itself / **static equivalent:
  the reduced-motion block keeps the resting glow and kills the travel — the code's
  own parity law (AR-00.6)** — parity holds on legacy surfaces.
- **SCIENTIFIC BASIS:** one-shot onsets are the one motion form with robust
  attentional evidence (Jonides & Yantis, 1988) — appropriate for a genuine arrival,
  and exactly why AR-00.2 forbids spending them on non-arrivals.
- **INTENDED RESPONSE:** a brief "something just landed here," then calm.

### AR-17 — Legacy field loops · SHIPPED ⚠ AT-11 / AT-12 — UNRULED
- **Where:** legacy `styles.css` — `opal-field-shimmer` 11s infinite,
  `opal-orbit-drift`, `opal-particle-drift` 10s infinite, `hs-meet-hue` 8s
  hue-cycle, splash character breathe 3.6s, living-character breathe/notice/wave
  ticks.
- **Status under this rulebook:** **incomplete entries.** No recorded reason, no
  intent key, and the hue-cycle *changes color without a state change* — variance
  without intent (AR-00.8). They cannot name a meaning, a pattern channel, or (for
  the hue cycle) a static equivalent with the same meaning, because they carry none.
- **Disposition (scoped in the audit, not implemented here):** each loop gets a
  recorded reason + intent key and joins this rulebook properly, or it is cut in the
  legacy-surface wave. Until then they are atmosphere the doctrine does not permit
  anyone to claim as language.
- **SCIENTIFIC BASIS:** none recorded, and one element is affirmatively against
  the evidence: an 8s **hue cycle** changes color with no state change — under
  color-in-context (Elliot & Maier, 2014) hue *is* meaning, so cycling hue cycles
  meaning, which AR-00.1 forbids. CONFIDENCE: the science supports cutting it.
- **INTENDED RESPONSE:** none statable — that is the finding.

---

## §4 — Persistence & variance findings (the join, both directions)

**Unruled shipped behavior** (shipped, no rule until this document): AR-17's legacy
loops — charged as **AT-11**. **Meaning-shift** (one behavior, two meanings): the iris
fire line, AR-05 vs AR-06 — charged as **AT-08**. **Signature collision:** *pulse*
names the live dot (2–2.4s, AR-07), a legacy action pulse (1.2s), mic pulses (~1s),
and read-aloud pulsing — one signature family carrying live / action / speaking with
no intent key on record; *breath* names the forming line (AR-02), the presence mark
(AR-13), the C2 hero loop, and the legacy splash character (3.6s) — charged as
**AT-12**. Rule going forward: a signature's period and element are part of its
identity; reusing a signature for a new meaning requires a new rule entry first.
**Join the other direction:** every rule above marked SHIPPED cites its code/capture
evidence in its entry; every FUTURE rule below names the doctrine gap it closes and
the audit finding that charges it. No shipped ambient behavior found in the audit
inventory is absent from this rulebook.

## §5 — FUTURE rules (named gaps the doctrine genuinely calls for)

### AR-F1 — Ignition (the completion event) · FUTURE — closes AT-04
A **traveling light along the fire frame's border** (one circuit, ~600ms) with a
**settling shadow**: glow blooms 16px→24px and decays back over ~900ms, once, when a
reveal becomes lit / a plan completes. Meaning: "*it just happened.*" Emotional cue:
a struck match settling into a steady flame. Channels: motion (event) + the static
frame (AR-05) which remains as the static equivalent — parity by design.
SCIENTIFIC BASIS: abrupt onsets uniquely capture attention where hue/luminance
singletons do not (Jonides & Yantis, 1988) — an *event* deserves the one signature
the attentional system is built to notice, spent once (AR-F4 governs repeats).
INTENDED RESPONSE: notice the completion the moment it lands, then be released.

### AR-F2 — Warming spread (the state crossing) · FUTURE — extends AR-01/02
On a crossing, the new state hue **spreads** along the card border from the state
pill outward (~600ms gradient sweep) instead of a flat crossfade, so a user can
*watch* forming become ready. Static equivalent: the end-state border (today's
behavior) — parity holds.
SCIENTIFIC BASIS: a directed sweep converts a state *swap* into a perceived
*transition with a direction* — motion along a path is parsed as caused change, not
replacement (the onset/object-updating literature, Yantis & Jonides, 1996).
INTENDED RESPONSE: "I saw it become ready" — change felt as a story, not a jump.

### AR-F3 — Cross-surface echo · FUTURE — closes AT-05
When a completion fires while the user is on another surface, the dock orb takes a
**one-shot tint in the event's state family** that decays on first view of the
reveal. This is AR-12's state-keying, event form. Static equivalent: the Home
activity count (AR-14) already persists the fact.
SCIENTIFIC BASIS: §1B per event state; the echo inherits the hue's basis and adds
only persistence. Bound by AR-00.9: the echo may fire only for a *real* completion.
INTENDED RESPONSE: "something finished while I was elsewhere — I'll look when I
choose." Guidance without summons.

### AR-F4 — Burst coalescence · FUTURE — closes AT-10
When several ambient-worthy events land in one window: only the strongest (reveal
priority P1 > P4 > P2 > P3) may *animate*; the rest render as static treatments, and
only one ignition (AR-F1) may fire per surface per window. The quiet budget
(AR-00.2) becomes a system property, not a per-component hope.
SCIENTIFIC BASIS: attentional capture is contrast-relative — simultaneous onsets
compete and habituate (Jonides & Yantis, 1988; the priority-tag work shows ~4
onsets prioritized, then decay). One voice is not politeness; it is how the signal
survives. INTENDED RESPONSE: a burst feels like *one* moment of importance, sized
to the strongest thing in it.

### AR-F5 — Happening pattern (double ring) · FUTURE — closes AT-15
Happening card borders gain the **double-ring pattern** (the `.c2-happening-ring`
halo, as a border treatment), so ready (solid single) vs happening (solid double)
differ by pattern alone, completing the pattern channel for the canon.
SCIENTIFIC BASIS: redundant coding (AR-03's basis) — pattern is the channel that
survives both color-vision deficiency and hue-association variance.
INTENDED RESPONSE: ready vs happening readable in silhouette, in peripheral
vision, in greyscale — the language at its most robust.

### AR-F6 — Action signature (reserved) · FUTURE
Action-needed currently has weight (3px edge) but no event signature, and must not
borrow the live pulse (AR-07) or the breath (AR-02/13). Reserved: a **single slow
weight swell** (edge 3px→5px→3px, once on arrival only). Named now so no other
behavior takes the space.
SCIENTIFIC BASIS: red (§1B action) is arousing and attention-capturing — a *single*
swell spends that arousal once, on arrival, rather than taxing it continuously the
way a loop would; restraint is what keeps red's alarm value from habituating.
INTENDED RESPONSE: one felt "this needs you" at the moment it becomes true — then
the static weight (AR-02) carries it, silently.

---

## §6 — Sources (verified against the literature, 2026-10-19)

- Elliot, A. J., Maier, M. A., Moller, A. C., Friedman, R., & Meinhardt, J. (2007).
  Color and psychological functioning: The effect of red on performance attainment.
  *Journal of Experimental Psychology: General, 136*(1), 154–168.
- Elliot, A. J., & Maier, M. A. (2014). Color psychology: Effects of perceiving color
  on psychological functioning in humans. *Annual Review of Psychology, 65* —
  the color-in-context theory statement.
- Mehta, R., & Zhu, R. (2009). Blue or red? Exploring the effect of color on
  cognitive task performances. *Science, 323*, 1226–1229.
- Lehmann, G. K., & Calin-Jageman, R. J. (2020). Limited evidence for the effect of
  red color on cognitive performance: A meta-analysis. *PMC7704521* — the honesty
  check on the red literature.
- Buechner, V. L., & Maier, M. A. (2016). Not always a matter of context: Direct
  effects of red on arousal but context-dependent moderations on valence. *PeerJ, 4*,
  e2515.
- Valdez, P., & Mehrabian, A. (1994). Effects of color on emotions. *Journal of
  Experimental Psychology: General, 123*(4), 394–409. (Saturation/brightness drive
  emotion more strongly than hue; purple among the most pleasant, yellow the least.)
- Palmer, S. E., & Schloss, K. B. (2010). An ecological valence theory of human
  color preference. *PNAS, 107*(19), 8877–8882.
- Jonauskaite, D., & Mohr, C. (2025). Polarities influence implicit associations
  between colour and emotion — systematic synthesis of 132 studies, 42,266
  participants: yellow/orange positive high-arousal; blue/green/white positive
  low-arousal; purple empowering; grey negative low-arousal.
- Meier, B. P., Robinson, M. D., & Clore, G. L. (2004); replication: Meier, B. P.,
  Fetterman, A. K., & Robinson, M. D. (2015). Black and white as valence cues.
  *Social Psychology, 46*(3), 174–178.
- Jonides, J., & Yantis, S. (1988). Uniqueness of abrupt visual onset in capturing
  attention. *Perception & Psychophysics, 43*(4), 346–354; Yantis, S., & Jonides, J.
  (1996), *JEP:HPP, 22*(6) — onset capture and object updating.
- Ghandeharioun, A., & Picard, R. (2017). BrightBeat: Effortlessly influencing
  breathing for cultivating calmness and focus. *Proc. CHI 2017 Extended Abstracts*
  — randomized placebo-controlled trial (N=32): peripheral rhythmic oscillation
  slowed breathing, improved self-reported calm and focus.
- Labrecque, L. I., & Milne, G. R. (2011). Exciting red and competent blue: The
  importance of color in marketing. *Journal of the Academy of Marketing Science* —
  association-level (branding) evidence for gold/purple prestige claims; cited as
  association, never as mechanism.

---

### AR-F7 - Orbit Trace (sustained live state) - SHIPPED (Polish wave, Cluster F, connected call surface)

- **Where:** the connected call surface (its border). Reusable treatment (opalUi/orbitTrace.tsx); any future surface adopting it takes this rule with it.
- **Motion signature:** a light segment travels the surface's border continuously - one circuit in 12s (live presence) or 9s (graphing) - for exactly as long as the state is true, and exits the moment it ends. One orbiting surface per view; one trace per surface.
- **Color/gradient:** by live state - happening cyan (canon --orb-indicator-happening, 55% mix) for live presence; the opal fire gradient for graphing active. Graphing takes the trace over live presence when both are true (one trace, one meaning at a time).
- **Intensity + duration:** 2px ring, ambient strength, glow <=6px at <=35%; indefinite WHILE the state lasts, absent otherwise.
- **Meaning:** "This surface is live right now" (cyan) / "This call is being graphed into your shared graph right now" (fire). The trace is the peripheral form of truths the surface also states in words (call status; the graphing light + capture-truth line).
- **Emotional cue:** a quiet orbit of attention around the conversation - presence felt at the edge of vision, never a demand at its center.
- **CHANNELS:** color (canon happening / brand fire) / pattern: the traveling segment itself vs the steady reduced-motion rule / words: the graphing light's label and the call status always accompany it, so color is never the only channel / motion: the travel - redundant, never sole.
- **Static (reduced-motion) equivalent:** the travel stops and a steady 2px ruled border in the same state color remains (solid canon-cyan rule for live; fire-gradient rule for graphing) - the same meaning carried statically. Parity holds by construction.
- **SCIENTIFIC BASIS:** sustained peripheral motion at multi-second periods maintains awareness of a continuing state without the attentional capture of an onset (contrast Jonides & Yantis, 1988 - onsets are spent on events, AR-F1; a sustained state must not keep re-summoning). Cyan's basis is section 1B happening (calm, approach, low arousal). The fire gradient is the brand iris, carrying "Opal is acting" as on lit reveals (AR-05), here sustained rather than scarce - recorded as a deliberate extension: on this one surface, fire means Opal's graphing is actively working, and the graphing light's words beside it carry the precise meaning. CONFIDENCE: moderate for the peripheral-awareness mechanism; the fire extension is a stated product convention, not a researched association.
- **INTENDED RESPONSE:** peripheral, continuing awareness - "we are live" / "graphing is on" - without looking away from the person; when the state ends, the border rests, and the rest itself says it ended.
- **ACCESSIBILITY STATEMENT:** no sound dependence (AR-00.4); no color-alone meaning (AR-00.5 - the state is named in words on the same surface, and live vs graphing also differ in pattern under reduced motion: solid rule vs gradient rule); reduced-motion parity per AR-00.6 (steady ruled border, above); the travel pauses while the document is hidden; the trace is aria-hidden decoration over truths that are all available as text.

---

### AR-18 - Control answer ("a control answers in light") - SHIPPED (Polish wave N5)

- **Where:** every behavior-changing toggle on a shared component - `.you-settings-toggle` (all Settings rooms, incl. Opal Assist on calls) and `.c2s-toggle` (C2 You/shell). Bespoke switches are named in polish-ambient-report.md and join only by adopting a shared class.
- **Behavior:** ON lights the track in the controlled behavior's canon state color (`--control-on`, token layer c2Tokens.css; default **happening** - a switched-on behavior is live now) plus a glow of `0 0 12px` at 55% of the behavior's glow token (and, on the settings switch, its settled 3px ring at 22%). OFF is **settled**: neutral track, no glow, no ring. A control whose behavior carries a different true state re-keys both tokens via `data-control-state`.
- **Envelope:** AR-00.2 QUIET - glow <= 18px at <= 55% (shipped 12px/55%); flip transition 160ms one-shot, no loops, no layout motion.
- **Meaning:** "This behavior is on and working" / "this behavior is off" - the flip *answers*: the user sees the state they just caused, in the ambient language, at the point of action.
- **Channels (AR-00.5):** color + glow / **knob position** (the pattern channel - the answer reads in greyscale) / `aria-checked` state / motion: the 160ms transition is transitional only, carries nothing.
- **Static (reduced-motion) equivalent:** the identical colors applied instantly (transitions killed in both sheets) - AR-00.6 parity.
- **Ethical bound (AR-00.9):** the light reports the control's true projected state only - the C2 toggle renders the projected value and never flips locally, so the light can never claim a state the record doesn't hold. Plan-state hues reach a control only through the `--control-on` canon alias or an explicit `data-control-state` re-key - never as raw decoration (the retired brand-violet ON was exactly that drift).
- **Open question (founder):** the default's happening identity - a switched-on behavior reads "live now" in the happening hue, which gives that hex a second reading; a one-token change if a non-state control identity is preferred.

---

### AR-19 - Leave-now escalation - SHIPPED (Polish wave, Cluster G, P10c)

- **Where:** any surface whose projection carries `leave_by` (plan detail "When to leave" section; the thread plan strip variant).
- **Behavior:** when the projection's `leave_by.urgency` reads "leave_now", the surface's plan treatment escalates to the action family (canon action color + the solid-bold pattern channel) AND the spoken line flips to its leave-now wording ("Leave now to arrive on time - ..."). Below the threshold the treatment is the ready register and the line reads "Leave by {time} to arrive calm - ...".
- **Meaning:** "The moment to leave has arrived" - a discrete state truth the backend derives (leave-by = start - (traffic-aware duration + stated buffer)), rendered when read; the surface never pre-escalates, animates toward the threshold, or reproduces the state from a local clock.
- **Channels:** color (action family) + pattern (solid-bold) + words (the flipped sentence) - no channel carries the meaning alone (AR-00.5); static under reduced motion by construction (AR-00.6).
- **Honesty bound:** the escalation asserts only the estimate class the projection carries ("Estimate - typical traffic, not live" rides beside it); a surface with no projection shows nothing.

*End of rulebook. Verdicts, evidence, and fix scopes: `ambient-truth-audit.md`
(AT-01…AT-18; AT-01 and AT-07 withdrawn on auditor correction, recorded in place).*
