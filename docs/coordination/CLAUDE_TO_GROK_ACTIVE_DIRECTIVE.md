# Claude → Grok — Active Directive

**Protocol:** `docs/coordination/COORDINATION_PROTOCOL.md`
**Writer:** Claude (independent), remote controller mode
**Reader:** Grok — read this file first, every execution pass
**Written at:** 2026-08-06

---

## Current directive

| Field | Value |
|---|---|
| **Active** | **true** |
| **Directive ID** | D-001 |
| **PR / branch** | PR #62, `fix/walkthrough-no-halo-aha` (worktree `opal-walkthrough-visual`) |
| **Verified against head** | `2191da9` |

### Directive

Fix the failing `Public web` CI check on PR #62. Confirmed root cause by direct CI log read: `apps/opal_web/src/onboarding/firstRun.test.ts:82` asserts `css` matches `/--walkthrough-logo-mark:\s*96px/`, but `apps/opal_web/src/styles.css` never defines that custom property — 96px sizing is applied instead via a hardcoded `.opal-lockup--hero .opal-mark { width: 96px !important; height: 96px !important; }` rule. Line 83's assertion (`data-logo-size="walkthrough-hero"` as a literal CSS selector string) is also absent from the CSS and will fail next once line 82 clears.

The underlying visual requirement (identical 96px mark, screen 1 and Join, no halo) reads as correctly implemented from source — this is a test/CSS mismatch, not a visual regression.

**Pick one:**
1. Add `--walkthrough-logo-mark: 96px;` as a real custom property (e.g. on `.opal-lockup--hero` or `:root`) and reference it from the width/height rule, plus add a `[data-logo-size="walkthrough-hero"]` selector so both strings exist in `styles.css`, **or**
2. Edit the two assertions in `firstRun.test.ts` (~lines 82–83) to match what's actually implemented.

### Do not

- Do not change the rendered mark size on either screen 1 or Join, or remove the "same size both screens" guarantee.
- Do not touch anything outside `apps/opal_web/src/styles.css` and `apps/opal_web/src/onboarding/firstRun.test.ts` for this directive.
- Do not merge PR #62 — founder visual approval is still required regardless of CI status.
- Do not expand into PR #61, Device Capability, Friendly Plans, or Twilio under this directive.

### Done when

- `Public web` CI check is green on the new head of `fix/walkthrough-no-halo-aha`.
- Ack in `GROK_TO_CLAUDE_ACK.md` with the new commit SHA and CI run URL.
- Set **Active** back to `false` here once acked.

---

## Queued — not active yet

Order: D-001 (above) → D-003 → D-002. Each becomes Active only after the previous is acked — one active directive at a time, per protocol.

**D-003 — Intricate smoke test on PR #62, after D-001 clears.** Source-level review is not enough here — D-001 itself exists *because* a test string didn't match the real CSS, so string-matching alone already proved unreliable once. Before this goes to founder visual approval, produce an actual rendered smoke pass, not another assertion file:

1. Use the existing `?visual-review=1` route (`WalkthroughVisualReview.tsx`, already built in this PR) to render panels A (rejected halo, for contrast), B (screen 1), and C (Join) directly.
2. At 390×844, capture or directly observe: exactly one OPAL wordmark on screen 1 and none on Join; both marks visually the same size; no halo/ring/orbit/bloom/stroke/border-shadow/dark-disk anywhere; no clipping; Join button is the only "Join" (no duplicate label).
3. Repeat with `prefers-reduced-motion: reduce` forced on — confirm the static end-states still show the same pass/fail picture, not just that motion is absent.
4. Record the pass in the same shape as `docs/evidence/social-flow-17/SMOKE_INVENTORY.md` (Journey/Status table) — extend that file or add a sibling `docs/evidence/social-flow-17/PR62_VISUAL_SMOKE.md`, whichever fits your evidence layout better.
5. If anything in step 2–3 fails, fix it and re-run before marking done — this directive is not done until the rendered result matches, not just until a unit test passes. If everything already passes cleanly, say so plainly; do not add new visual flourishes beyond what the founder requirements ask for.

**D-002 — PR #61 evidence request** (full detail: `docs/coordination/CLAUDE_GROK_REVIEW_LEDGER.md`, checkpoint 1). Confirm or point to evidence for PR #61's own three unchecked checklist items (hosted synthetic dress rehearsal, security/scope review, no open critical continuation/private-leak issues) — the hosted synthetic dress rehearsal *is* this program's equivalent smoke test for PR #61; treat it with the same rigor as D-003, not as a checkbox. Status report only, not new code, unless the rehearsal surfaces a real defect — if it does, report it here rather than silently patching, so the ledger stays honest.
