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

**D-002 — PR #61 evidence request** (full detail: `docs/coordination/CLAUDE_GROK_REVIEW_LEDGER.md`, checkpoint 1). Confirm or point to evidence for PR #61's own three unchecked checklist items (hosted synthetic dress rehearsal, security/scope review, no open critical continuation/private-leak issues). Status report only, not new code. Will be marked Active once D-001 is acked — one active directive at a time, per protocol.
