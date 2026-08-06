# Claude → Grok — Active Directives

**Author:** Claude (independent), remote controller mode
**Last updated:** 2026-08-06

---

## D-001 — Fix PR #62 CI failure (test/implementation mismatch)

**Objective:** Make `Public web` CI pass on `fix/walkthrough-no-halo-aha` without changing the visual result already implemented.

**Current verified state:** `src/onboarding/firstRun.test.ts:82` asserts `css` matches `--walkthrough-logo-mark:\s*96px`; `apps/opal_web/src/styles.css` has no such custom property — 96px is applied via `.opal-lockup--hero .opal-mark { width: 96px !important; height: 96px !important; }` instead. The next assertion (`data-logo-size="walkthrough-hero"` as a CSS selector string) is also not present in the diff and will likely fail once the first assertion is fixed.

**Files Grok owns (fix here):** `apps/opal_web/src/styles.css`, `apps/opal_web/src/onboarding/firstRun.test.ts`
**Files Claude must not edit:** same — production web source, Grok's lane.

**Two acceptable fixes, either is fine — pick whichever is less disruptive to the existing rule:**
1. Add `--walkthrough-logo-mark: 96px;` as a real custom property (e.g. on `.opal-lockup--hero` or `:root`) and reference it from the existing `width/height` declaration instead of the raw `96px` literal, and add a `[data-logo-size="walkthrough-hero"]` selector (even a no-op/comment-anchored one) so the string exists in the CSS file, **or**
2. Edit the two test assertions at `firstRun.test.ts` lines ~82–83 to match what was actually implemented (the `!important` width/height rule), if the token/selector approach isn't wanted.

Do not pick a third option that changes the rendered mark size or removes the "same size both screens" guarantee.

**Required tests:** `Public web` CI job green on the exact new head (vitest — this file is part of that suite).
**Required evidence:** CI run URL for the new head, green.
**Stop condition:** none expected — this is a same-file test/CSS reconciliation, no schema, consent, or production-environment surface touched.
**Founder decision required:** none.

---

## D-002 — PR #61: evidence request for three unproven gates (not a defect report)

**Objective:** Close the evidence gap on PR #61's own stated remaining checklist items before this moves toward mergeable, per program hold.

**Current verified state:** CI is fully green on `623cadb` (all 6 checks SUCCESS) — the "Full monorepo CI green" item in the PR's own checklist is satisfied. Three items remain unchecked in the PR body with no evidence located at this repo/PR state: `Hosted synthetic dress rehearsal`, `Security/scope review adjudicated`, `No open critical continuation/private-leak issues`.

**Files Grok owns:** all of `build/real-people-first-alignment` — no file-level ask here, this is an evidence request, not a code change.
**Files Claude must not edit:** all files in that branch/worktree.

**Ask:** for each of the three unchecked items, either (a) point to the evidence doc/PR comment/test run that already covers it, if one exists and I haven't located it, or (b) confirm it's still outstanding so the ledger reflects that honestly rather than silently. Specifically for the required review themes from the controller brief: two-user message-to-Set journey, negative authority matrix, rate-limit matrix, continuation cleanup, migration safety, private Phoenix non-leak, hosted synthetic rehearsal, network/browser-storage inspection — flag which of these already have evidence and which don't yet.

**Required tests:** none new requested — this is a status check, not a request for new work.
**Required evidence:** pointer to existing evidence, or explicit "not yet done" per item.
**Stop condition:** if closing any of these requires enabling `production_sms`, real Twilio credentials, or any paid/production surface — stop and flag to founder. Twilio stays disabled regardless of gate status.
**Founder decision required:** not yet — only if the security/scope review surfaces something that needs a product-authority call.
