# Walkthrough Peak Hierarchy — UI/UX Critique

**Author:** Claude (independent) via agent opal-ui-ux-pro-max
**Lane:** research / design — not production deploy
**Note on method:** `subagent_type: opal-ui-ux-pro-max` is not registered in this harness instance (confirmed by a direct call that errored with the list of available built-in types). I performed this pass directly as Claude, following the `opal-ui-ux-pro-max` persona and checklist in `.claude/agents/opal-ui-ux-pro-max.md` exactly, grounded firsthand in the files below rather than delegating to an unavailable subagent.
**Grounded in:** `FOUNDER_NUANCE_PACK.md`, `FirstRunExperience.tsx`, `technicolorProduction.css`/`.ts`, `apps/opal_web/src/brand/OpalLogo.tsx`, `apps/opal_web/src/styles.css` (lines 865–1085), `OPAL_HUMAN_AND_AI_STATE_MATRIX.md`, `BOOKING_STATE_COPY_PATCH_PROPOSAL.md`
**Last updated:** 2026-08-05

---

## 1. What is wrong / weak

### 1a. The wordmark never actually appears — this is worse than "meek caption"
`OpalLogo.tsx` exports two components: `OpalMark` (the orb SVG alone) and `OpalLockup` (mark + literal `<span className="opal-wordmark">Opal</span>` text). `FirstRunExperience.tsx` imports and uses **only `OpalMark`**, never `OpalLockup`, anywhere in the walkthrough. Screen 1 (`FirstRunExperience.tsx:180-186`) renders `<OpalMark size="hero" />` (88px) inside a 120px glowing ring (`.scene-orbit`, `styles.css:1016-1023`) — full "giant centered orb" anti-pattern — with `title=""`, which sets `aria-hidden="true"` on the SVG (`OpalLogo.tsx:34-35`). The only text naming the brand is the kicker: `"Opal"` at `0.72rem`, uppercase, letter-spaced (`styles.css:921-928`). **There is no wordmark on screen 1 at all** — not weak, absent. This is a more severe instance of the exact anti-pattern the founder flagged.

### 1b. The top-left mark repeats without earning its place
`FirstRunExperience.tsx:103`: `<OpalMark size="sm" title="" />` renders on every one of screens 1–4 in `.first-run-top`, also `aria-hidden`. It contributes zero wordmark authority (it's the same orb, just smaller, also unlabeled) and visually competes with whatever the hero scene is doing each screen — exactly the redundant-logo pattern flagged in `FOUNDER_NUANCE_PACK.md`.

### 1c. Join and Continue are visually identical
Both use `className="btn primary first-run-cta"` (`FirstRunExperience.tsx:152-160`); only the label text and `aria-label` differ between `isLast` and not. `.btn` sets `min-height: 44px` (touch target — this part is already correct, good). But nothing in size, weight, or motion marks screen 5's Join as a different kind of moment than "next slide." Per `FOUNDER_NUANCE_PACK.md`: "Join must be powerful" — right now it's the same tap as every other screen.

### 1d. State-honesty attribution is inconsistent across scenes, not just the one already fixed
The `plan` scene's booking-state defect is already covered by `docs/build/BOOKING_STATE_COPY_PATCH_PROPOSAL.md` — not re-litigated here. But the pattern is broader: the `spark` scene's chip (`"Becoming a plan"`, `FirstRunExperience.tsx:193`) and the `follow` scene's chip (`"Everything for tonight is handled"`, line 211) are both unattributed pills with no DOM/ARIA signal that this is Opal speaking, not a system fact or a person. `spark`'s chip is lower-risk (it reads as a category label, matches the founder's "Becoming a plan = category demo" allowance) but `follow`'s chip is a status claim with no attribution at all — same shape of gap as the one already fixed, just less severe because it doesn't fabricate a specific unconfirmed value.

## 2. What peak looks like (principles)

1. **The wordmark earns its place once, then gets out of the way.** One real brand-arrival moment (mark + actual "OPAL" text, not a caption-sized kicker) beats a repeated decorative orb with no text anywhere in the flow.
2. **Escalation is visible, not just semantic.** The screen that asks for commitment (Join) should look different from the screens that just advance a slide, not merely say something different.
3. **Attribution is a system, not a patch.** Every Opal-sourced chip across every scene should carry the same lightweight "this is Opal" signal — visually restrained, but consistently present, so fixing one scene doesn't leave the others exposed to the same failure mode.

## 3. Token / layout deltas

```css
/* Escalate Join without new colors — reuse existing spectrum tokens */
.first-run-cta[data-final="true"] {
  min-height: 52px;
  max-width: 100%;
  font-size: 1rem;
  letter-spacing: 0.01em;
}
[data-technicolor="full"] .first-run-cta[data-final="true"].btn.primary {
  box-shadow:
    0 0 34px rgba(62, 224, 240, 0.55),
    0 0 64px rgba(139, 92, 246, 0.28);
}

/* Consistent Opal-attribution affordance for scene chips (visual: minimal; a11y: real) */
.scene-chip[data-source="opal"]::before {
  content: "";
  /* small glyph or 4px dot in --accent, not text — keep visual noise near zero */
}
```

`.first-run-cta` currently caps at `max-width: 320px` (`styles.css:996-999`) identically for every screen — the delta above only changes behavior on the final screen via a new `data-final` attribute, leaving screens 1–4 untouched.

## 4. Component-level changes

- **`FirstRunExperience.tsx`, welcome scene (`Scene`, `scene === "welcome"`):** replace bare `<OpalMark size="hero" />` with `<OpalLockup size="hero" showWord />` (component already exists, already exported, currently unused) — this alone fixes 1a without inventing anything new.
- **`FirstRunExperience.tsx:103` (`.first-run-top`):** drop `OpalMark` after screen 1, or shrink to a non-orb wordmark-only mark on screens 2–4. Simplest safe change: render the top-left mark only when `index === 0` is false is backwards — actually render it only on `index > 0` at reduced opacity, or remove it entirely and rely on the dot progress indicator for orientation.
- **`FirstRunExperience.tsx:152-160`:** add `data-final={isLast}` to the CTA button so the CSS delta above can target it without a new component.
- **`Scene` chips (`spark`, `follow`):** add `data-source="opal"` to `.scene-chip` and `.scene-chip.ready` (the `plan` scene's chip already gets attribution via the copy patch, not a new attribute) plus a visually-hidden `<span className="sr-only">Opal: </span>` inside each, so assistive tech gets explicit attribution without adding visible text weight.

## 5. Copy (age-12 check)

No visible copy changes proposed here beyond the `sr-only` attribution prefixes above (screen-reader only — doesn't change what a sighted reader sees). Read-back test: *"Who said the thing in the chip?"* — before this change, a screen-reader user has no answer for `spark`/`follow`; after, the answer is "Opal," consistently, everywhere it applies.

## 6. What not to do

- Do not add a second, separate wordmark treatment — reuse `OpalLockup`, don't build a new component for this.
- Do not escalate Join with a new color — the existing cyan/violet gradient already reads as premium; escalate size/glow intensity only, to avoid a mismatched "different brand" moment on the last screen.
- Do not add attribution as visible text to `spark`/`follow` chips — that would add copy noise the founder's "no configuration homework" doctrine already rejects. Keep it `sr-only` plus a minimal visual marker only.
- Do not touch the `plan` scene copy here — that's `docs/build/BOOKING_STATE_COPY_PATCH_PROPOSAL.md`'s job, already handed to Grok.

## 7. Grok implementation order (smallest, highest-impact first)

1. `sr-only` Opal-attribution prefix on `spark`/`follow` chips — zero visual risk, closes an a11y gap immediately.
2. `data-final` CTA escalation (CSS + one prop) — small, isolated, no layout risk.
3. Remove/reduce redundant top-left mark on screens 2–4 — small removal, verify dot-progress still reads as orientation without it.
4. Swap `OpalMark` → `OpalLockup` on the welcome scene — slightly larger visual change; sequence after `opal-motion-director`'s brand-arrival timing spec (`docs/design/motion/2026-08-05-walkthrough-choreography.md`) so the wordmark reveal is choreographed, not just dropped in statically.
