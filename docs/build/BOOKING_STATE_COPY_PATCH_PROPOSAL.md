# Booking-State Copy — Patch Proposal (not applied)

**Author:** Claude (independent)
**Status:** Proposal only. `apps/opal_web/src/onboarding/FirstRunExperience.tsx` is untouched by this branch. For Grok to implement as a production PR after founder acknowledgment, per `docs/coordination/GROK_TO_CLAUDE_ALIGNMENT_RESPONSE.md` sequencing (priority 1).
**Last updated:** 2026-08-06

---

## 1. The defect

Live today at `apps/opal_web/src/onboarding/FirstRunExperience.tsx:198-206`, the walkthrough's "plan" scene:

```tsx
if (scene === "plan") {
  return (
    <motion.div className="scene scene-chat" {...float}>
      <div className="scene-bubble in">After 6:30 works for me.</div>
      <div className="scene-bubble out">I&apos;ll book Harbor Table.</div>
      <div className="scene-chip gold">Thursday · 7:00 PM</div>
    </motion.div>
  );
}
```

Two human bubbles are genuinely human speech (states 1). The chip that follows has no attribution and no state — it reads as a confirmed reservation (state 5/6 in `docs/product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md`) when nothing has been proposed, approved, or executed. This is the defect both the Peak Brand audit (`LIVE_BRAND_DEFECT_AUDIT.md`, D7) and my independent review flagged.

## 2. The fix

One line. No new component, no new state, no backend dependency. The existing `gold` chip color already maps to the "hold/pending" semantic in `technicolorProduction.css` — so the color is already correct for an in-progress state; only the **text** needs attribution:

```diff
       <div className="scene-bubble in">After 6:30 works for me.</div>
       <div className="scene-bubble out">I&apos;ll book Harbor Table.</div>
-      <div className="scene-chip gold">Thursday · 7:00 PM</div>
+      <div className="scene-chip gold">Opal is checking Harbor Table for Thursday 7:00.</div>
```

This moves the chip cleanly into state 4 ("what Opal is doing") per the matrix — a person declared intent, Opal is shown carrying it out, nothing claims to be confirmed. It also now correctly sets up the very next scene ("follow": *"Everything for tonight is handled"*), which previously jumped straight from an unattributed "confirmed-looking" chip to a resolution — now it reads as pending → resolved, which is the actually true shape of the flow.

## 3. Read-back test (per `docs/product/OPAL_AGE_12_COPY_SYSTEM.md` §2)

Ask a reader after the scene plays: *who said what, and is dinner booked yet?* Before the fix, a reader plausibly answers "yes, it's booked." After the fix, a reader should answer "no — Opal's trying to book it, we don't know yet" — which is the honest state of a walkthrough demo scene, and the honest state any real instance of this UI would be in before a provider responds.

## 4. Scope check

- Does not touch consent, backend, or any new capability — copy and attribution only.
- Does not require a new component or CSS class — reuses the existing `gold`/hold semantic correctly.
- Does not conflict with `docs/coordination/DUAL_AI_FILE_OWNERSHIP.md` — this document lives in my worktree/branch; the actual component edit and its production PR remain Grok's lane.
- Satisfies the "adult-only, no new provider, no Kafka/Foundation" constraints already established as this handoff's recommended first slice.

## 5. Not covered by this proposal

The other Peak Brand defects (D1–D6, D8–D9 — wordmark hierarchy, orb sizing, redundant logo placement, Join CTA weight) are real but separate, lower-stakes, and out of scope here — see `docs/coordination/CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md` §2 for sequencing rationale.
