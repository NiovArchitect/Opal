# Claude → Grok Review Ledger

**Author:** Claude (independent), remote controller mode
**Purpose:** Checkpoint log — what was verified, when, against which head
**Last updated:** 2026-08-08

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

---

## Checkpoint 2 — 2026-08-06

**No change on either PR since checkpoint 1.** PR #62 head still `2191da9`, `Public web` still failing on the identical assertion. PR #61 head still `623cadb`, still CI-green. `GROK_TO_CLAUDE_ACK.md` still shows the scaffold-only ack (no directive acted on yet). Coordination protocol adopted (`COORDINATION_PROTOCOL.md`, `GROK_TO_CLAUDE_ACK.md`, new `CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md` format); D-001 re-issued as the single Active directive under that schema (commit `511491a`).

**Gap identified and directed:** neither PR has a rendered/browser-level verification on file — PR #62's own checklist items (halo, wordmark count, sizing, clipping, reduced-motion) were only checked at the source-diff level here, and D-001 itself exists precisely because a source-level string assertion didn't match reality. Added **D-003** (queued, after D-001): an actual rendered smoke pass using the PR's own `?visual-review=1` comparison route at 390×844, with and without reduced-motion, recorded in the existing `docs/evidence/social-flow-17/SMOKE_INVENTORY.md`-style format — not another unit-test assertion. Tightened D-002's framing so PR #61's "hosted synthetic dress rehearsal" is explicitly treated as that program's equivalent smoke-test gate, not a checkbox.

**Ordering:** D-001 → D-003 → D-002, one Active at a time, per protocol.

---

## Checkpoint 3 — 2026-08-06

**D-001: verified done, independently.** PR #62 head advanced `2191da9` → `9ee6129` (D-001 fix) → `0e4a3eb` (CI re-trigger). Current CI: **all 6 checks SUCCESS**, including `Public web`. Re-read the actual CSS/test diff on the branch — Grok added `--walkthrough-logo-mark: 96px` and a `[data-logo-size="walkthrough-hero"]` selector as directed, matching the test assertions, no rendered-size change. D-001 confirmed complete.

**D-003: mostly verified, one real defect found in the evidence itself.** Grok's ack points to `docs/evidence/visual-experiments/PR62_VISUAL_SMOKE.md`, `smoke-measures.json`, and 5 `smoke-*.png` captures (panels A/B/C, 390×844, with reduced-motion variants). Read the measures JSON directly (not just the summary table) and visually opened two of the screenshots myself (`smoke-B-screen1-390.png`, `smoke-C-join-390.png`) — both genuinely show a clean orb, single "OPAL" wordmark on screen 1, **no** wordmark and **no** kicker on Join, same 96×96 mark both screens. This part of D-003 is real and independently confirmed, not just trusted from the written PASS table.

**But:** the same evidence commit (`feb9a65`, "PR62 rendered visual smoke (D-003) + Grok ack for D-001") also added an *older* batch of 8 numbered screenshots (`01-screen1-390x844.png` … `08-join-reduced-motion.png`) captured hours earlier (file mtimes 04:22–04:23 vs the `smoke-*` set at 16:25) — evidently a leftover local capture from before the D-001 fix, bundled into the same commit without being regenerated. Opened `02-join-390x844.png` directly: it shows the **exact rejected defect** — the OPAL wordmark *and* a "JOIN" kicker both visible on the Join screen, contradicting the founder requirement and contradicting the PASS claim sitting right next to it in the same folder. This file is genuinely committed at current HEAD (`0e4a3eb`), not a local-only artifact — confirmed via `git show HEAD:...` diffed against the working copy, identical.

**Why this matters:** it's not that the fix is broken — the fix is real and the current smoke-* evidence proves it. The problem is an evidence-hygiene defect: a stale, defect-showing screenshot sits undifferentiated in the same folder the founder will open for visual sign-off, with a filename (`02-join-390x844.png`) that reads as current, not historical. This is exactly the kind of gap independent verification exists to catch — the written ack and summary table were accurate about the *new* evidence and silent about the *old* evidence still sitting alongside it.

**Action:** does not reopen D-001 or D-003's core claim (both hold). Opened **D-004** (Active) — bounded cleanup: remove or clearly relabel the stale `01`–`08` numbered screenshots so nothing in `pr62-screens/` contradicts the current PASS state before founder review. Not advancing to D-002 until D-004 is acked, to keep one directive active at a time per protocol.

### Founder decisions required
None yet.

### Risks requiring stop
None. Evidence-hygiene finding only, no destructive/production/credential surface touched.

---

## Checkpoint 4 — 2026-08-08 (post-outage recovery)

**Context:** founder's machine was offline ~1-2 days. Recovery pass per `docs/coordination/CLAUDE_RECOVERY_CONTROLLER_HANDOFF.md`. Prior session state (this worktree only, uncommitted) was verified, not assumed: the local D-004-closed edit to `CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md`/`GROK_TO_CLAUDE_ACK.md` matched the actual committed state on `fix/walkthrough-no-halo-aha` @ `c276af7` — accurate, just never committed before the outage. Committed now.

**D-004: confirmed closed**, per above.

**PR #61 P0 (checkpoint 3 finding): confirmed closed.** Independently re-read the actual diff for `39d171a` (`build/real-people-first-alignment`) in Grok's worktree, not just the ack. Traced `signals_for_user_home/1` → `signals_for_conversation/2` → `elevate_to_set_if_authorized/3` → `AlignmentAuthority.authorize_set?/3`, confirming both `AlignmentState.set_gate_satisfied?/1` and `PrivateParticipation.invalidates_set?/2` now have real callers on the live path. Given that the original defect was precisely "the visible label came from a path we didn't check," did not stop at that one call chain: grepped `"Set"` / `:set` / `classify_stage` / `authorize_set` across all of `apps/opal_core/lib` (core + web + channel layers) and the web/mobile frontend source. Only three `.ex` files reference Set-authority logic at all (`alignment_state.ex`, `product_signals.ex`, `alignment_authority.ex`); `stage_to_signals/2` in `product_signals.ex` is the sole emitter of the `"Set"` string, and `build_signals/2` its sole caller; the controller and channel only call the two `ProductSignals.signals_for_*` functions, never compute a stage independently; no frontend file hardcodes or independently derives the label. No second emitter exists. New test file `set_authority_p0_test.exs` proves the exact regression scenario (private `not_this_time` blocks Set, no leak of `response_key`/reason text) plus block, removed-member, and stale-proposal cases.

**Heads reviewed:** code head `c53571d` — CI green, all 6 checks, confirmed via `gh pr view`. Branch tip is `4608779` ("recovery hosted gates + network inspection pass") — confirmed pushed (`origin/build/real-people-first-alignment` matches exactly) and docs-only per `git show --stat` (four evidence `.md` files, no code), so the code verdict above still covers the actual tip.

**Hosted synthetic dress rehearsal: Grok executed one, unprompted**, after the P0 fix — `docs/evidence/real-people/HOSTED_DRESS_REHEARSAL_STATUS.md` + `GATE_MATRIX_PR61.md` + `NETWORK_INSPECTION_CHECKLIST.md` (recovery pass 2026-08-08, image `rp61-synthetic-61100ca` on Render, web `d5e509a` on gh-pages), **reporting** every gate PROVEN including the Set-authority P0 scenario against the live hosted API. I independently confirmed, credential-free: `GET https://api.opal.niovlabs.com/health` → `{"status":"ok"}`, and `https://opal.niovlabs.com/privacy` renders a real, substantive policy page. **I did not re-execute the hosted Set-authority journey myself** — no synthetic fixture session, out of scope for a read-only check — so that specific claim is source-verified (the code path is right) but not independently re-run live by me; the rest of the hosted gate matrix is Grok's report, unverified by me beyond those two endpoints. `PR61_SCOPE_REVIEW.md` now recommends merge; that decision belongs to the founder, not to this ledger.

**New founder direction (relationship-availability/scheduling vertical):** assessed against the repo per founder request. Not a gap needing a new doc — Opal's existing Social Flow domain (`OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `LOCATION_COLLECTIVE_FIT.md`, `OPAL_RELATIONSHIP_CONTEXTS.md`, `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`, and the implemented `availability_grant.ex`) already covers nearly all of it, including the anti-surveillance, anti-relationship-scoring, and restraint-engine guardrails the founder asked me to check for. Two real tensions for whoever writes the eventual canonical spec, not blockers to PR #61: `MVP_BOUNDARY.md`'s explicit "calendar product... commitment-only" deferral, and SF17's explicit "not location intelligence" non-goal versus the founder's new ask for private habitual-location signal. Full detail: `CLAUDE_RECOVERY_CONTROLLER_HANDOFF.md`.

### Founder decisions required
1. Merge PR #61 — code-level P0 gate is closed and independently verified; Grok reports the full hosted gate matrix PROVEN, of which I independently re-verified two endpoints (not the hosted Set-authority journey itself). The merge decision itself is the founder's, not mine or Grok's.
2. Whether the new availability/scheduling direction expands `MVP_BOUNDARY.md`'s calendar deferral now, or stays documentation-only for later.
3. Whether private habitual-location intelligence is now in scope, given SF17's prior explicit non-goal.

### Risks requiring stop
None found. No destructive action, credential use, or production enablement performed by me this session; Twilio remains off per every doc checked.
