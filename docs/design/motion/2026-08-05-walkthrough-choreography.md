# Walkthrough Choreography — Motion Spec

**Author:** Claude (independent) via agent opal-motion-director
**Lane:** research / design — not production deploy
**Note on method:** `subagent_type: opal-motion-director` is not registered in this harness instance (confirmed by direct call). I performed this pass directly as Claude, following the `opal-motion-director` persona and vocabulary in `.claude/agents/opal-motion-director.md`, grounded firsthand in the files below.
**Grounded in:** `FOUNDER_NUANCE_PACK.md`, `FirstRunExperience.tsx`, `technicolorProduction.css`/`.ts`, `docs/product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md`, `docs/design/ui-ux/2026-08-05-walkthrough-peak-hierarchy.md` (Pass A — this spec choreographs that pass's proposed wordmark and CTA changes; it does not re-propose them)
**Last updated:** 2026-08-05

---

## 1. Motion storyboard

Existing infrastructure this builds on, not replaces: `motion/react` (`AnimatePresence`, `motion`, `useReducedMotion`), the existing panel transition (`opacity`/`y`/`blur`, 450ms, ease `[0.16, 1, 0.3, 1]` — already matches the target range and is not changed here), and the existing `float` prop (4.5s y-bob loop on scene content).

### Stage 1 — Brand arrival (welcome scene, screen 1 only)

Depends on Pass A's `OpalMark` → `OpalLockup` swap. Motif: **Fragment converge** (brand arrival, per persona vocabulary).

| ms | Event | What the user understands |
|---|---|---|
| 0 | Panel mounts (existing enter transition begins: opacity 0→1, y 18→0, blur 6px→0) | Something is arriving |
| 0–250 | Mark's existing bloom filter and radial gradient render at full opacity immediately — no new fade-in on the mark itself, only the panel-level entrance | First meaningful motion inside the 250ms target |
| 250–650 | `.scene-orbit` ring scales from 0.85→1 with opacity 0→1 (new: small scale transform on existing ring element, ease `[0.16,1,0.3,1]`, ~400ms) | The mark is settling into place, not just appearing |
| 650–1300 | Wordmark text (new, from `OpalLockup`'s `.opal-wordmark` span) fades and tracks in: opacity 0→1, `letter-spacing` 0.08em→normal, ~500ms, starting after the ring settles | "OPAL" becomes legible — target: legible by 1.3s, inside the 1–1.5s range |
| 1300–1800 | Existing kicker/title/body text (already part of the panel-level transition) — no change needed, already timed to feel like the next beat | Core promise ("Life starts in conversation.") felt by ~2s |
| Whole stage | `float` continues throughout at existing 4.5s loop, unchanged | Ambient life, not a loading state |

**User control is never gated on this sequence finishing.** Skip and Continue are interactive from `t=0` — this is a visual sequence layered on top of an already-interactive screen, not a blocking intro.

### Stage 2 — Scene transitions (screens 2–5)

No change from the existing 450ms cross-fade/blur/y transition — it already sits inside the target 400–500ms range with the target easing curve. This spec explicitly validates it rather than replacing it.

### Stage 3 — Spectral chip entrance (spark, plan scenes)

Motif: **Spectral edge resolve** (recognition/understanding — matches a true proposal appearing).

| ms (relative to panel settle) | Event |
|---|---|
| 0 | Bubbles render with the panel (no separate stagger — they're human speech, calm) |
| +150 | Chip begins entrance: opacity 0→1, scale 0.94→1, ~250ms |
| +400 | Chip fully settled |

This is a **new** small stagger (chip appears slightly after the bubbles it responds to), implemented as a `motion.div` wrapper on `.scene-chip` with `initial`/`animate` props, using the existing `transition` constant already computed in the component (`reduce ? {duration:0} : {duration:0.45,...}` — reuse a shorter derived duration, e.g. 0.25s, for this specific element rather than a new easing system).

### Stage 4 — "Still checking" breathing (plan scene chip, post-copy-fix)

Motif: **Slow amber breath** (unresolved/still working — never a green check).

Once the plan-scene chip reads "Opal is checking Harbor Table for Thursday 7:00." (per `BOOKING_STATE_COPY_PATCH_PROPOSAL.md`), its `box-shadow` opacity should breathe slowly: 0.18 → 0.32 → 0.18 opacity on the existing gold glow, **3.2s period**, `ease: "easeInOut"`, infinite — slow enough to read as "alive/working," not urgent or broken. This is the honest motion equivalent of the honest copy: a viewer should feel "still in progress" without needing to read the word "checking."

### Stage 5 — Directional settle (follow scene chip)

Motif: **Directional settle** (execution complete — only when product truth says handled).

The `ready` chip's entrance: opacity 0→1 **and** a single one-way box-shadow intensification (0.14→0.22, one-shot, ~350ms, no loop). This is the visual opposite of Stage 4's breathing — a loop means "still working," a single settle means "done." The two motifs must never be swapped between these two chip states.

### Stage 6 — Join bloom (screen 5 CTA only)

Motif: **Join bloom**, restrained. Pairs with Pass A's `data-final="true"` CSS escalation.

| ms (relative to screen 5 mount) | Event |
|---|---|
| 0–350 | Box-shadow scales from the Stage-2-standard glow to the escalated `data-final` glow (already-defined CSS values in Pass A), one-shot, `ease: [0.16,1,0.3,1]` |
| 350+ | Static — **no continuous pulse.** The bloom is an arrival, not an invitation loop |

Explicitly not a breathing/pulsing CTA — that would read as urgency/pressure, which conflicts with this work's standing instruction not to optimize for rushed decisions.

## 2. Implementation notes

- All new entrances use `motion.div` with `initial`/`animate` (no new dependency — `motion/react` already in the stack).
- Stage 4's breathing glow is pure CSS (`@keyframes`, already the pattern used for `tc-full-mesh` in `technicolorProduction.css:154-161`) — no JS animation needed, keeps it cheap.
- Stage 1's ring scale and Stage 3's chip stagger are the only genuinely new `motion/react` props; everything else reuses existing transition constants or existing CSS keyframe patterns.
- Gate every new motion behind the existing `reduce` boolean (`useReducedMotion()`, already destructured in `FirstRunExperience.tsx:60`) exactly as the current code does for the panel transition and `float`.

## 3. Reduced-motion static equivalents

| Stage | Reduced-motion end-state |
|---|---|
| 1 — Brand arrival | Mark, ring, and wordmark all render at final opacity/position immediately, no scale/fade sequence. Meaning preserved: wordmark is simply present from frame one. |
| 3 — Spectral chip | Chip renders at full opacity immediately, no stagger. |
| 4 — Amber breath | Glow renders at its **midpoint** intensity, static, no animation — still reads as "warmer than idle," just not moving. |
| 5 — Directional settle | Chip renders at final settled intensity immediately. |
| 6 — Join bloom | CTA renders at final escalated glow immediately, no scale-in. |

This is a direct extension of the existing pattern (`transition = reduce ? {duration:0} : {...}` in `FirstRunExperience.tsx:75-77`) — every new stage follows the same rule already established in the component.

## 4. Fatigue / distraction risks

- Stage 4's infinite breathing loop is the only continuous animation this spec adds beyond the existing `float` and mesh hue-rotate. Two infinite loops running simultaneously (float + breath) on the same scene risks feeling busy — recommend the breathing glow use a **longer period than `float`'s 4.5s** (proposed 3.2s is currently *shorter* — revise to ~5.5–6s so the two loops don't visually compete or phase-lock into a distracting beat pattern).
- Stage 1's sequence must not become a skippable-in-theory-but-annoying-in-practice intro on repeat views — since `index` resets to 0 only when `open` becomes false (`FirstRunExperience.tsx:66-71`), a user re-opening the walkthrough sees Stage 1 again each time. Acceptable for a first-run experience; would need a "seen before, shorten" rule if this walkthrough ever becomes re-enterable from settings.

## 5. Explicit reject list for this slice

- No confetti, streak fireworks, or particle soup at any stage.
- No checkmark pop on the `plan` scene chip — it is not done, and must never animate as if it is (this is the motion-level enforcement of the copy fix in `BOOKING_STATE_COPY_PATCH_PROPOSAL.md`).
- No continuous pulse/breathing on the Join CTA — one arrival bloom, then static.
- No new animation library or dependency — everything above is `motion/react` + CSS keyframes, matching the existing stack.
- No motion that delays or blocks Skip/Continue interactivity.

## 6. Age-12 check

Can a 12-year-old explain what moved and why? Stage 1: "the logo came together and then it said OPAL." Stage 4: "that chip is glowing slow because Opal's still trying to book it." Stage 5: "that one lit up once because it's actually done now." Stage 6: "the join button glowed once when the screen showed up." Each answer names a real state change, not decoration for its own sake — that's the bar this spec is written to.
