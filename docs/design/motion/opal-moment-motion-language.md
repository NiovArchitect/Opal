# Opal-Moment Motion Language

**Author:** Claude (independent) via agent opal-motion-director
**Lane:** research / design — not production deploy

**Grounded in:** `docs/design/motion/2026-08-05-walkthrough-choreography.md` (sibling spec — reused verbatim: easing `[0.16,1,0.3,1]`, 450ms scene-transition token, its §5 reject list, its documented beat-frequency lesson), `docs/evidence/visual-experiments/PRODUCTION_TECHNICOLOR_SYSTEM.md`, `docs/coordination/FOUNDER_NUANCE_PACK.md`, `apps/opal_web/src/OpalApp.tsx`, `apps/opal_web/src/styles.css` (`.opal-moment` family, `.signal-chip`, ~lines 433–544), `apps/opal_web/src/data.ts` (`SignalKind`, `THREADS`, `CHATS`), `apps/opal_web/src/theme/technicolorProduction.ts` (`SemanticState`, `semanticStateForSignal`), `apps/opal_web/src/theme/technicolorProduction.css` (Controlled `.opal-moment` block, lines ~254–395).

**Written for:** the "Relationship Availability Alignment" capability (private availability windows → selective share → overlap → conversation moment → **Set**), but scoped and named as the **general, reusable Opal-moment motion language** — every future Opal moment (not just this capability) should be built from this vocabulary, not a new one.

**Scope boundary vs. the sibling spec:** the walkthrough spec choreographs `FirstRunExperience.tsx` — pre-membership, Full Technicolor, a screen the user visits once and leaves. This spec choreographs Opal moments **embedded inside live conversation** in `OpalApp.tsx` — post-membership, Controlled Technicolor ("Luminous/semantic" tier per the founder nuance table), a surface the user sits inside for the length of a relationship. That difference matters for every decision below: conversation-tier motion must be **quieter and more repeatable** than walkthrough-tier motion, because it recurs dozens of times a day rather than once.

---

## 0. The founder's framing, and how this spec treats it

> "The environment acknowledges Opal" — not another chat bubble, not a mascot.

Every treatment below stays attached to the `.opal-moment` chip itself (border, glow, label, and the space immediately around it). Nothing in this spec introduces a character, avatar, or floating presence. Opal never gets its own "turn" the way a human does — it gets a **different visual register for the same turn**, which is the existing product decision (`.opal-moment` is not `.bubble.in`/`.bubble.out`) that this spec choreographs, not changes.

---

## 1. Existing vocabulary this spec extends (read before implementing)

Do not invent a parallel system. These hooks already exist and this spec plugs into them:

| Hook | Where | Current values |
|---|---|---|
| `SignalKind` (type) | `apps/opal_web/src/data.ts:3-8` | `open_loop`, `plan_forming`, `ready`, `follow_through`, `moment` |
| `semanticStateForSignal(kind)` | `apps/opal_web/src/theme/technicolorProduction.ts:68-92` | maps kind → `SemanticState` |
| `SemanticState` (type) | `technicolorProduction.ts:59-65` | `recognition`, `participation`, `private`, `execution`, `completion`, `urgency` |
| `.opal-moment` + variants | `apps/opal_web/src/styles.css:453-544` | base chip; `.journey` (thread header bar), `.inline` (per-message), `.row` (list preview), `.static` (plan card) |
| `className="opal-moment {variant} signal-${kind}"`, `data-state={semanticStateForSignal(kind)}` | `OpalApp.tsx:518-548, 897-901, 975-982, 1022-1032` | render pattern |
| `--moment-a` / `--moment-b` custom properties | `technicolorProduction.css:265-278, 292-368` | drive the masked-border gradient (`::before`, 1.5px stroke) per semantic state |
| Locked labels already shipping | `data.ts:64,73,82,92,101,120,128,143` | "Still open", "Becoming a plan", "Ready", "Follow-through", "Shared moment" |

The four target states for this pass use two labels that already exist verbatim (**Becoming a plan**, **Still open**) and two that do not yet exist in the codebase (**a couple times could work** / **This one fits**, **Set**). §2 proposes the minimal vocabulary extension needed to carry them without inventing a second system.

---

## 2. Proposed vocabulary extension (design proposal — not implemented by this document)

Add two `SignalKind` values and two `semanticStateForSignal` branches:

```
SignalKind += "option_surfaced" | "set"

option_surfaced → "recognition"   // reuses the existing cyan/violet tier
set             → "completion"    // reuses the existing emerald tier
```

**Why not a new `SemanticState`:** the six existing states already cover the meaning. "A couple times could work" / "This one fits" is Opal *recognizing and surfacing* something — same semantic register as "Becoming a plan," just a second, quieter recognition beat later in the same thread. **Set** is genuinely *done* — same register as `ready`/`follow_through` (completion, emerald). Giving it its own kind (rather than reusing `ready`) keeps the *label* correct and locked while reusing the *color truth* that already exists.

**Truthfulness constraint this enforces:** emerald (`--tc-emerald`, completion) must render **only** at Set. If "a couple times could work" / "This one fits" were ever mapped to `completion` instead of `recognition`, the color would say "done" while nothing is actually set yet — that is the checkmark-pop violation, expressed in color rather than an icon. This spec fixes that mapping now, before any implementation exists, rather than after.

CSS selector extension needed (additive only, does not touch existing rules):

```
technicolorProduction.css:292-303  → add .opal-moment.signal-option_surfaced alongside .signal-plan_forming
technicolorProduction.css:317-329  → add .opal-moment.signal-set alongside .signal-ready / .signal-follow_through
```

One new custom property: `--moment-border-width` (default `1.5px`, see §4.4 — used only by Set's border-finish beat).

---

## 3. Founder-idea audit

The brief describes five treatments for how a message with an Opal moment arrives: soft ambient edge illumination, a restrained Technicolor sweep across the conversation border, a slight depth lift, light refraction inside the moment, and tiny motion of neighboring UI as though the interface made room. Each is evaluated against the reject list (this document's and the walkthrough spec's §5) below. **Nothing is silently dropped — every softening is stated explicitly.**

| Founder idea | Verdict | Reasoning |
|---|---|---|
| Soft ambient edge illumination | **Kept as-is** | Already implemented as the `--moment-a`/`--moment-b` masked-border glow + `box-shadow`. This spec adds a one-shot entrance animation on top of it (§4), doesn't replace it. |
| Technicolor sweep across the **conversation border** | **Softened and re-scoped** | Rejected literally. A sweep across the *conversation/thread frame* would recur every time any moment appears inside an active chat — in a busy thread that's several times a minute, which turns a "restrained" accent into a **recurring decorative frame effect**, functionally adjacent to the giant-halo/orb anti-pattern at larger scale (a glowing ring around the *container* rather than the *mark*, but the same "environment wearing a costume" problem). **What ships instead:** the sweep is confined to the moment chip's own existing 1.5px masked border (`::before`), animated once on entrance only (§4.1). It is a chip-scale micro-detail tied to one message, not an environmental frame effect. |
| Slight depth lift | **Kept, corrected** | Spec as `translateY(-1px)` only. Scale (e.g. `scale(1.01)`) is rejected — it blurs the chip's text at sub-pixel render and visibly distorts the existing 1.5px masked border, which is not designed to be scaled. Lift is transient: every state animates `-1px → 0` on entrance and rests at `0`; nothing stays permanently "lifted." |
| Light refraction inside the moment | **Kept, restricted** | One single diagonal light pass (§8, "refraction pass"), one-shot, low opacity (≤0.15), on entrance only. **Explicitly excluded from Still Open** — a moving light on a state that is, by definition, waiting on another person would read as active progress happening, which is the same falsehood as a checkmark-pop on an unresolved state, just rendered as light instead of an icon. |
| Neighboring UI makes room | **Kept, narrowly scoped** | Only the *newly inserted* moment's own wrapper animates (height/opacity reveal, §6). No `layout` prop on the message list or on sibling bubbles — that would fight scroll anchoring and risks becoming a springy list reflow, which is on the reject list regardless of intent. What the user perceives ("the interface made room") is a side effect of the wrapper's own smooth reveal, not a choreographed push on other elements. |

---

## 4. The four states

All four share a base entrance (unless noted): `opacity 0→1`, `translateY(-1px)→0`, ease `[0.16,1,0.3,1]` (the walkthrough spec's established curve — reused, not reinvented). Duration varies by state weight, below. **No spring, no overshoot, anywhere in this document.**

### 4.1 Becoming a plan — recognition (cyan/violet), motif: **Spectral edge resolve**

The first Opal moment in a thread. This is the only state that gets the border-angle sweep — reserved for the *first* recognition so it reads as a specific, noticed event rather than a decoration every chip repeats.

| Offset | Event | Duration |
|---|---|---|
| 0ms | Base entrance begins (opacity, translateY) | 220ms |
| +80ms | Refraction pass: single diagonal highlight (`linear-gradient(100deg, transparent 40%, rgba(255,255,255,.14) 50%, transparent 60%)`) sweeps across the chip once | 500ms, `animation-iteration-count: 1` |
| 0–260ms | Masked border (`::before`) gradient angle animates `90deg → 135deg`, one-shot — the border "finding" its resolved angle | 260ms, same ease |
| 0–320ms | Wrapper reveal (§6): `height: 0 → auto`, `opacity: 0 → 1` — this is what makes "the interface make room" | 320ms |

Total settle: ~320ms. Neighbor messages below shift down smoothly as the wrapper reveals; nothing else moves.

### 4.2 Option surfaced — "a couple times could work" / "This one fits" — recognition (cyan), quieter sibling of 4.1

Same semantic state as Becoming a plan (recognition, cyan — **never emerald**, see §2). Deliberately quieter: this is Opal's *second* recognition beat in a thread, not the first spark, so it should not repeat the border-angle sweep or it starts to feel like decoration rather than event.

| Offset | Event | Duration |
|---|---|---|
| 0ms | Base entrance (opacity, translateY(-1px)→0) | 200ms |
| +60ms | Refraction pass, reduced opacity (~0.10 vs. 4.1's 0.14) | 500ms, one-shot |
| — | No border-angle sweep. No box-shadow escalation beyond the existing static glow. | — |

Both label variants ("a couple times could work" for multiple weaker candidates, "This one fits" for one strong candidate) use identical timing — the distinction is copy, not motion. Do not build a stronger/weaker motion tier for these two strings; that would start reading as a confidence meter, which is more than the copy claims.

### 4.3 Still open — participation (amber), motif: **Slow amber breath**

Waiting on a **person**, not on Opal. This reuses the walkthrough spec's amber-breath *motif* for visual family consistency, but the subject is different, and that difference must stay legible:

- Walkthrough Stage 4 amber breath = "Opal is still checking" (Opal's own unfinished labor).
- This state's amber breath = "a person hasn't answered yet" (waiting on a human decision).
- These two never co-render (different screens — walkthrough is pre-membership, this is in-thread product). If a future kind ever needs "Opal is still working" *inside* a conversation, it must not silently reuse this same breathing amber treatment without a label/icon distinguishing "waiting on a person" from "Opal is working" — the visual motif is shared, the truth behind it must never be assumed identical.

**Entrance:** base entrance only (200ms) — no refraction pass (§3), no border sweep.

**Loop — restricted to a single instance per thread, see §7:**

```
box-shadow / glow-layer opacity: 0.12 → 0.22 → 0.12
period: 6000ms, ease-in-out, infinite
```

6s period chosen to match the walkthrough spec's own revised recommendation (its §4 flagged 3.2s as too fast and too close to the `float` loop's 4.5s period, and recommended ~5.5–6s). Reusing that number here isn't required by shared-screen beat risk (these screens never co-render) — it's reused because it's already the calibrated "alive but not urgent" period for this exact visual motif, and reusing it avoids re-deriving the same number twice.

### 4.4 Set — completion (emerald), motif: **Directional settle**, plus a new **width convergence** beat

This is the resolution: alignment occurred. Total choreography from the moment the kind flips to `set`: **~450ms**, matching the existing 450ms scene-transition token from the walkthrough spec — reused deliberately so the two specs' "something just finished" durations feel like the same product.

| Offset | Event | Duration | Notes |
|---|---|---|---|
| 0ms | Old label (`opacity 1→0`, no movement) | 120ms | crossfade out, not a hard cut |
| 80ms | New "Set" label (`opacity 0→1`) | 150ms | overlaps the outgoing label by 40ms so there is never a blank gap |
| 0–150ms | `::before` gradient crossfades from the outgoing state's `--moment-a`/`--moment-b` (amber or cyan pairing) to emerald/ivory (`--tc-emerald`, `rgba(242,237,230,0.4)` — already the existing `completion` pairing at `technicolorProduction.css:320-321`) | 150ms | reuse existing tokens, no new colors |
| 230–380ms | Border **finishes**: `--moment-border-width` animates `1.5px → 2px`, one-shot, ease `[0.16,1,0.3,1]` — the "border finishes into a crisp edge" the brief asked for | 150ms | a thickening/solidifying, not a glow escalation — reads as "permanent," distinct from the soft breathing edges of 4.1–4.3 |
| 230–430ms | One-shot box-shadow intensification, reusing the walkthrough spec's **Directional settle** values verbatim: `0.14 → 0.22` opacity, one-shot, no loop | 200ms | same motif, same numbers as the walkthrough "ready" chip — Set and the walkthrough's execution-complete chip must always share this exact treatment; a loop here would mean "still working," which is the opposite of Set |
| 0–320ms | **Width convergence**: the chip's own wrapper animates `width` via `motion` layout scoped to *only this element* (not siblings/list), tween (not spring), `[0.16,1,0.3,1]`, 320ms | 320ms | "Set" (3 letters) is dramatically narrower than "a couple times could work"/"This one fits" — letting the pill visibly narrow as it resolves is a literal rendering of "the spectrum converges rather than explodes." This is new; nothing in the sibling spec has a chip that changes text length on resolution. |
| 230–430ms | Refraction pass, same technique as 4.1, distinct meaning: here it means "this caught the light because it's finished," not "something is forming" | 200ms | one-shot only, coincides with the border-finish beat so it doesn't read as a fourth separate effect |

**No loop, ever, once Set.** It is finished; nothing about it should look like it is still doing anything.

**Future note — not specified here, do not implement:** a single soft haptic tick (not a buzz/vibration pattern) coinciding with the border-finish moment (~t+230–380ms) is a plausible future mobile enhancement. This document does not specify a haptic API, timing curve, or platform call — it is a placeholder for a later, separate spec.

---

## 5. Cross-state transition rule

When a chip's `signal.kind` changes in place (e.g. `option_surfaced → set`), wrap the label (and, for Set, the `::before` gradient) in `AnimatePresence` keyed by `signal.kind`. **Do not use `mode="wait"`** — it removes the outgoing element before mounting the incoming one, which opens a visible blank gap mid-thread for the ~80–120ms swap window. Use the default overlapping mode so outgoing/incoming crossfade against each other per the offsets in §4.4.

```
<AnimatePresence>
  <motion.span key={signal.kind} ...>
    {signal.label}
  </motion.span>
</AnimatePresence>
```

`AnimatePresence`'s default `initial={true}` behavior is correct here — the *first* mount of a moment should play its state's own entrance animation (§4.1–4.4), not be suppressed.

---

## 6. "Interface makes room" — implementation

Scope the reveal to the **inserted moment's own wrapper only**:

```
<motion.div
  initial={reduce ? false : { height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
>
  {/* .opal-moment chip */}
</motion.div>
```

`motion/react` measures `height: "auto"` targets natively — no manual height calculation needed. Do **not** add a `layout` prop to the message list container or to `.bubble.in`/`.bubble.out` — that would let Framer Motion's FLIP diffing reposition every sibling whenever the list re-renders, which both fights native scroll-anchoring behavior and risks a springy multi-element reflow (reject-listed). The user's perception of "the interface made room" comes for free from normal document flow once the wrapper reveals smoothly; nothing else needs to move on purpose.

---

## 7. One-breathing-element rule (perf + fatigue, not just reduced-motion)

`data.ts` already has "Still open" instances in four places (`CHATS` rows, `THREADS` message signals), and `OpalApp.tsx` can render `.opal-moment.journey` (thread header) and `.opal-moment.inline` (per-message) for the *same* thread simultaneously. If every instance breathed independently at the same 6s period but different mount times, the phases would drift and produce a visible, distracting beat pattern on a single screen — the same class of problem the walkthrough spec flagged between its own `float` and amber-breath loops, just within this surface instead of across two.

**Rule:** only `.opal-moment.journey` (the thread header bar — the canonical "current state of this thread" indicator, always visible while a thread is open) may loop-breathe. `.opal-moment.inline` (per-message, historical log), `.opal-moment.row` (list preview), and `.opal-moment.static` (plan card) always render their glow at a **fixed midpoint opacity (0.17)**, never animating, regardless of `prefers-reduced-motion`. This isn't an accessibility fallback — it's a product logic decision: message-embedded and list-row chips are a historical record of what a moment said at that point in time, not a live status; only the journey bar is live. Enforce this in the component with an explicit boolean the app controls (e.g. a `live` prop → `data-breathing="true"` only on the journey-bar render), not a positional CSS selector like `:last-of-type`, which would silently break if message ordering or list virtualization changes.

---

## 8. Implementation notes

- **Stack delta to flag for Grok:** `OpalApp.tsx` currently renders `.opal-moment` with pure CSS, no `motion/react` usage at all. This spec is the first proposal to add `motion/react` there. Gate every new motion exactly like `FirstRunExperience.tsx` already does: `const reduce = useReducedMotion();` then `transition = reduce ? { duration: 0 } : { ... }` — do not invent a second reduced-motion pattern.
- Refraction pass: implement as a `::after` pseudo-element, `background: linear-gradient(100deg, transparent 40%, rgba(255,255,255,.14) 50%, transparent 60%)`, animated via a CSS `@keyframes` with `animation-iteration-count: 1; animation-fill-mode: forwards;` — pure CSS, no JS needed, matches the existing `tc-full-mesh` keyframe pattern in `technicolorProduction.css:154-161`.
- Border-angle sweep (4.1) and border-width finish (4.4): both animate existing/proposed custom properties (`--moment-a`/`--moment-b` angle, new `--moment-border-width`) — no new masking technique, reuse the existing `::before` mask-composite approach at `technicolorProduction.css:265-278`.
- Amber-breath loop (4.3): pure CSS `@keyframes`, same technique as `tc-full-mesh` — animate a dedicated glow layer's `opacity`, not the `box-shadow` shorthand directly (recalculating blur/spread on every frame is more expensive than compositing an opacity change on a layer that already exists).
- Width convergence (4.4): `motion.span layout="size"` (not full `layout`, which would also track position) scoped to the chip element only, `transition={{ type: "tween", duration: 0.32, ease: [0.16, 1, 0.3, 1] }}` — explicitly override Framer's default spring transition for `layout`, since its default is a spring and this document bans spring/overshoot everywhere.
- All new CSS selectors are additive (`.signal-option_surfaced`, `.signal-set`, `--moment-border-width`) — no existing rule is modified by this proposal.

---

## 9. Reduced-motion static equivalents

Per `useReducedMotion()`, matching the existing walkthrough-spec pattern (`transition = reduce ? {duration:0} : {...}`):

| State | Reduced-motion end-state |
|---|---|
| 4.1 Becoming a plan | Chip renders at final opacity/position immediately. No border-angle sweep, no refraction pass, no wrapper height reveal (wrapper is simply present at full height). |
| 4.2 Option surfaced | Same — instant final state, no refraction. |
| 4.3 Still open | Glow renders at the loop's **midpoint** intensity (0.17), static — this is already the permanent rule for non-journey instances (§7); reduced motion just extends it to the journey-bar instance too. |
| 4.4 Set | Final label, final emerald/ivory border, final `2px` border width, final chip width all render immediately in one frame. No crossfade, no width tween, no refraction, no gap. |

Meaning is preserved in every case: the *state* is always legible from color, label text, and (for Set) the finished border width — none of that depends on motion having played.

---

## 10. Fatigue / distraction risks

- **Set's three simultaneous beats** (width convergence, border finish, refraction) risk feeling like three separate effects rather than one resolve if they don't stay tightly synced. Mitigation: single shared easing curve, total window capped at 450ms, refraction and border-finish share the same start offset. This is a hypothesis, like the walkthrough spec's own timing targets — **verify against a rendered build**, not just this document, and trim further if it reads as busy.
- **Refraction overuse:** capped by design to one-shot, entrance-only, ≤0.15 opacity, and explicitly excluded from Still Open (§3). If a future state adds refraction, it must justify why that state is a "something resolved" beat, not a "still pending" one.
- **Perf at scale:** a thread list showing many `.opal-moment.row`/`.static` chips (list of chats, each with a signal) must never animate more than the single permitted `.journey` breathing instance (§7) — this is as much a performance guard (avoid dozens of concurrent CSS animations in a scrolling list) as a calm-UI guard.
- **Repetition fatigue:** the border-angle sweep is reserved for the *first* recognition per thread (4.1 only, not 4.2) specifically so a long conversation with many option-surfaced moments doesn't turn a "noticed" event into wallpaper.

---

## 11. Explicit reject list for this slice

- No giant halo/ring/orbit around the Opal mark, and no frame-wide "sweep" around the whole conversation border — softened to a chip-scoped border animation only (§3).
- No confetti, particle effects, or shimmer that loops continuously.
- No continuous/looping glow anywhere except the single permitted journey-bar Still Open breath (§7) — and that is explicitly a "waiting on a person" indicator, never a call-to-action.
- No checkmark-pop or premature "done" color (emerald reserved for Set only, §2).
- No refraction/light movement on Still Open — that would imply progress that isn't happening.
- No spring or overshoot easing anywhere in this document — `layout` transitions are explicitly overridden to `type: "tween"`.
- No new animation library or dependency — everything specified is `motion/react` (already in the stack) plus CSS keyframes matching existing patterns.
- No `layout` prop on the message list or sibling bubbles — only the newly-inserted moment's own wrapper animates.
- No mascot/character treatment — every moment stays an inline chip attached to its message or thread header, never a floating presence.
- No motion that blocks or delays reading/replying to the underlying conversation.

---

## 12. Age-12 check

Can a 12-year-old explain what moved and why?

- 4.1: "the little tag popped in and its edge glowed for a second because Opal just noticed you're planning something."
- 4.2: "a smaller glow — Opal found something that might work, but quieter than the first time."
- 4.3: "that amber tag breathes slow because you're still waiting for someone to answer, not because anything's wrong."
- 4.4: "the tag shrank down to just 'Set' and turned green-gold because it's actually locked in now — that's why the edge got sharper."

Each answer names a real, current state, not decoration for its own sake — that is the bar this document is written to, matching the sibling spec's own standard.

---

## 13. Delta (2026-08-08) — Opal Edge, Private Guidance, Action-in-progress

Added for `docs/design/ui-ux/opal-ui-grammar.md`, which specifies three presentation primitives this document didn't yet cover. Same file, same vocabulary, same reject list (§11) — nothing below is a second motion system.

### 13.1 Opal Edge — motif: **Standing resolve, no repeat**

Renders on `.opal-moment.journey` (the thread header bar) only — never a frame-wide sweep around the conversation viewport; that was already rejected in §3 above for a different trigger profile (per-arrival) than the Edge has (per-actionable-state, at most one active per conversation, not one per message — see `opal-ui-grammar.md` §3.1 for why the earlier rejection doesn't apply here).

| Offset | Event | Duration |
|---|---|---|
| 0ms | Border-angle sweep, identical technique to 4.1 (`--moment-a`/`--moment-b` gradient angle `90deg → 135deg`) — plays **once**, on first appearance only | 260ms |
| 0–320ms | Glow intensifies from the journey bar's existing static resting opacity to a brighter static resting state (not a loop): `box-shadow` opacity `0.17 → 0.24`, one-shot | 320ms |

**After the one-shot entrance, the Edge is a static brighter state — it does not breathe, pulse, or loop.** This is deliberate: §7 of the one-breathing-element rule already restricts looping to the Still-Open journey-bar case specifically, and an Edge that also looped would create two simultaneously-plausible "why is this glowing" reads on the same element. If a conversation is both Still Open (waiting on a person) and has an Edge (something new to look at), the Edge's static-brighter state layers on top of the Still-Open breath without adding a second animation — same loop, slightly brighter baseline.

Tap: Edge's glow settles to the underlying state's normal resting treatment (no separate "closing" animation) as whatever it revealed (chip, sheet, detail) takes over.

Reduced motion: no border-angle sweep; renders at final brighter-static state immediately.

### 13.2 Private Opal Guidance — motif: **Quiet arrival, no publicity**

Deliberately the least performed entrance in this document — private guidance existing for one person only means it shouldn't compete for attention the way a shared moment can.

| Offset | Event | Duration |
|---|---|---|
| 0ms | Base entrance only: `opacity 0→1`, `translateY(-1px)→0`, ease `[0.16,1,0.3,1]` | 200ms |
| — | No refraction pass, no border-angle sweep, no box-shadow escalation | — |

Color: `deepViolet` (#8B5CF6) exclusively — per `opal-ui-grammar.md` §3.4, this is the one color family reserved so it never appears on a shared moment; no other treatment in this document may reuse it. Static glow at rest, matching the non-journey fixed-midpoint-opacity rule in §7 (0.17) — private guidance is not a "live" indicator the way the journey bar is, it's a standing private note.

Dismiss: `opacity 1→0`, 150ms, no exit choreography beyond a plain fade — dismissal is unconditional and low-ceremony by design (`opal-ui-grammar.md` §3.4's "unconditional and local" rule); it should not feel like closing something significant, because for the person dismissing it, it usually isn't.

### 13.3 Action-in-progress ("what Opal is doing") — motif: **Traveling light**, placeholder only

No current capability produces state 4 (`OPAL_HUMAN_AND_AI_STATE_MATRIX.md`) — nothing today has Opal doing something a person approved and waiting on an external result. Per `opal-ui-grammar.md` §10, this is intentionally not fully designed against a hypothetical. One constraint worth locking now so it isn't improvised later: whatever "in progress" treatment eventually ships must be visually distinct from the Still-Open amber breath (§4.3) — Still Open is *waiting on a person*, Action-in-progress is *Opal actively doing something on a person's behalf* — these are different truths and must not share the same breathing-amber motif (§4.3 already states this same rule for a hypothetical future in-conversation "Opal is working" state; this is that state, now named). A directional/traveling light (motion along one axis, not a pulsing glow) is the right family to differentiate it when someone designs it against a real capability — not specified further here.
