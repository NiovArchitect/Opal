# Claude → Grok Review Ledger

**Author:** Claude (independent), remote controller mode
**Purpose:** Checkpoint log — what was verified, when, against which head
**Last updated:** 2026-08-06

---

## Checkpoint 1 — 2026-08-06

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-claude-alignment`
**Branch:** `architecture/speed-to-alignment-and-complete-journey` @ `a4a7af0`
**Active worktrees observed:** Grok main (`Opal` @ `bb8dae3`), gh-pages deploy (`/private/tmp/opal-gh-pages-deploy` @ `59d4b34`), Grok real-people (`opal-grok-real-people` @ `623cadb`), Grok walkthrough-visual (`opal-walkthrough-visual` @ `2191da9`)

### PR #61 — `build/real-people-first-alignment` (do not merge yet)

- HEAD: `623cadb` (per worktree) — CI: **all 6 checks SUCCESS** (Contracts+Python, Elixir core, Docker build, Mobile shell, Public web, x2 each — full monorepo green)
- PR's own gate checklist (from PR body): `Full monorepo CI green` — **now satisfied**, confirmed by this checkpoint. Remaining unchecked in PR body: `Hosted synthetic dress rehearsal`, `Security/scope review adjudicated`, `No open critical continuation/private-leak issues` — **no evidence located yet for these three**; not claiming pass or fail, just unproven.
- Local test counts claimed in PR body (Elixir 42/42, Web 60/60) — consistent with CI green, not independently re-run here (token discipline — CI result already covers this).
- **Verdict: HOLD, unchanged.** No merge-blocking defect found; three gates remain unproven, not failed.

### PR #62 — `fix/walkthrough-no-halo-aha`

- HEAD: `2191da9` — CI: **Public web check FAILING**, all others SUCCESS.
- Root cause confirmed by direct log read (`gh run view --log-failed`): `src/onboarding/firstRun.test.ts:82` — `expect(css).toMatch(/--walkthrough-logo-mark:\s*96px/)` fails. The PR's own diff adds this assertion but the corresponding CSS change (`apps/opal_web/src/styles.css`) implements 96px sizing via `.opal-lockup--hero .opal-mark { width: 96px !important; height: 96px !important; }` — a hardcoded override, not the `--walkthrough-logo-mark` custom property the test checks for. A second assertion two lines later (`data-logo-size="walkthrough-hero"` as a literal CSS selector) is also not present in the diff and likely fails next once the first is fixed, since vitest halts a test body at the first failing `expect`.
- **The underlying visual requirement (same 96px mark, screen 1 = Join) does appear correctly implemented** — both `WalkthroughBrandLockup` (screen 1) and the Join scene apply the same `.opal-lockup--hero .opal-mark` rule. This is a test/implementation mismatch, not a confirmed visual defect.
- Screen 1: kicker set to `""`, one `WalkthroughBrandLockup` renders one wordmark — matches "exactly one OPAL wordmark" requirement, per source read.
- Join: kicker `""`, `first-run-join-brand` block renders `OpalMark` only, no `first-run-wordmark-join` element — matches "no wordmark on Join" requirement, per source read.
- Halo removal: `OpalMark` defaults `glow=false, ring=false`; `.scene-orbit` gated to `display:none` except an explicit `--rejected-demo` comparison variant; `scene-calm-ring` removed. No independent visual/screenshot proof was available to inspect (none attached to the PR at this checkpoint) — source-level check only.
- **Verdict: DO NOT MERGE. Blocked on CI. See directive D-001.**

### Founder decisions required at this checkpoint
None yet — both open items are engineering-verifiable, not product-authority questions.

### Risks requiring stop
None. No destructive action, credential, paid service, or production enablement implicated by either PR at this checkpoint.
