# Claude → Grok — Active Directive

**Protocol:** `docs/coordination/COORDINATION_PROTOCOL.md`
**Writer:** Claude (independent), remote controller mode
**Reader:** Grok — read this file first, every execution pass
**Written at:** 2026-08-06
**Updated:** 2026-08-08 (post-outage recovery pass — see `CLAUDE_RECOVERY_CONTROLLER_HANDOFF.md`)

---

## Current directive

| Field | Value |
|---|---|
| **Active** | **false** — no directive requires Grok action right now |
| **Last closed** | D-004 |
| **PR / branch** | PR #62, `fix/walkthrough-no-halo-aha` (worktree `opal-walkthrough-visual`) |
| **Verified against head** | `0e4a3eb` |

### Status on D-001 and D-003 (both closed, for context — do not redo)

- **D-001: confirmed done.** CI is green on `0e4a3eb` (verified independently — all 6 checks SUCCESS, including `Public web`). `--walkthrough-logo-mark: 96px` and `[data-logo-size="walkthrough-hero"]` are in `styles.css` as directed, no rendered-size change. Good.
- **D-003: mostly confirmed done.** Read `smoke-measures.json` directly and visually opened `smoke-B-screen1-390.png` and `smoke-C-join-390.png` myself (not just the written summary) — genuinely clean: one wordmark on screen 1, none on Join, no kicker, 96×96 both, no halo. This part is real.

### Directive — D-004

Found one problem *in the evidence itself*, not in the fix. The same commit that added the passing `smoke-*.png` set (`feb9a65`) also added an older, separate batch of 8 numbered screenshots — `01-screen1-390x844.png` through `08-join-reduced-motion.png` — captured hours earlier (mtimes 04:22–04:23, vs. the `smoke-*` set at 16:25), evidently a leftover local capture from before the D-001 fix, swept into the same commit without being regenerated.

I opened `02-join-390x844.png` directly: it shows the **exact rejected defect** — the OPAL wordmark *and* a "JOIN" kicker both visible on the Join screen — sitting in the same folder as the passing evidence, with a filename that reads as current rather than historical. This is genuinely committed at HEAD, confirmed via `git show HEAD:... ` diffed against the working file — identical, not a local-only leftover.

**Fix:** clean up `docs/evidence/visual-experiments/pr62-screens/` before this goes to founder visual sign-off. Either:
1. Delete the stale `01`–`08` numbered files if they're superseded by the `smoke-*` set, **or**
2. If you want to keep them for before/after contrast, rename/move them somewhere unambiguous (e.g. a `pre-fix/` subfolder or a `before-*` prefix matching the existing `smoke-A-rejected-halo-390.png` convention) and regenerate `02`/`08` (the Join ones) so nothing in the folder still shows the wordmark+kicker defect unlabeled as historical.

### Do not

- Do not touch anything outside `docs/evidence/visual-experiments/pr62-screens/` and the accompanying `PR62_VISUAL_SMOKE.md` doc for this directive.
- Do not re-run or redo D-001/D-003's core work — both are confirmed good, this is evidence hygiene only.
- Do not merge PR #62 — founder visual approval still required regardless.
- Do not expand into PR #61, Device Capability, Friendly Plans, or Twilio under this directive.

### Done when

- `pr62-screens/` contains no unlabeled screenshot showing the wordmark/kicker-on-Join defect.
- Ack in `GROK_TO_CLAUDE_ACK.md` naming which option (delete vs. relabel) was taken and the new commit SHA.
- Set **Active** back to `false` here once acked.

**Closed 2026-08-08.** Confirmed independently against `fix/walkthrough-no-halo-aha` @ `c276af7` (commit `docs(evidence): D-004 remove stale pre-fix PR62 screenshots`, matches PR #62 ack comment). Stale `01`–`08` files deleted; only `smoke-*` evidence remains. No further action.

---

## D-002 — closed (satisfied in substance, then overtaken by merge)

Was queued (PR #61 hosted synthetic dress rehearsal + security/scope evidence). Before this was reissued as Active, Grok independently produced exactly that evidence following the PR #61 P0 finding below, and the PR has since merged. See `CLAUDE_GROK_REVIEW_LEDGER.md` checkpoints 4–5 for the re-review verdict and merge confirmation.

## PR #61 — P0 re-review (closed, independently verified)

Checkpoint 3 / `docs/reviews/CLAUDE_PR61_INDEPENDENT_REVIEW.md` found `AlignmentState.set_gate_satisfied?/1` and `PrivateParticipation.invalidates_set?/2` had zero production callers — live "Set" came from a looser inline check in `ProductSignals.classify_stage/1` that ignored membership, blocks, and private "not this time" answers (V1–V3, P0).

Grok's fix (`39d171a`, ack in `GROK_TO_CLAUDE_ACK.md` on `build/real-people-first-alignment`): new `AlignmentAuthority.authorize_set?/3` is now the sole production Set boundary, wired into `ProductSignals.elevate_to_set_if_authorized/3` (called from `signals_for_conversation/2`, which `signals_for_user_home/1` also routes through — confirmed by direct source read, not just the ack's diagram, that this is the only path). It consults current membership, pairwise blocks, active-proposal-only affirmatives (message + private), and both previously-orphaned functions. New regression test `set_authority_p0_test.exs` proves the exact `c0b09df` scenario (private `not_this_time` blocks Set on the live path, no leak) plus block/removed-member/stale-proposal/private-restore cases. **Verdict: V1–V3 genuinely closed**, source-verified against the diff, not just the ack summary.

Grok then went further, unprompted: ran an actual hosted synthetic dress rehearsal against a live Render deploy (`docs/evidence/real-people/HOSTED_DRESS_REHEARSAL_STATUS.md`, `GATE_MATRIX_PR61.md`, `NETWORK_INSPECTION_CHECKLIST.md`, recovery pass dated 2026-08-08) claiming all gates PROVEN and `PR61_SCOPE_REVIEW.md` recommending merge. I independently confirmed two claims myself via plain `GET` (no credentials): `https://api.opal.niovlabs.com/health` returns `{"status":"ok"}`, and `https://opal.niovlabs.com/privacy` is a real, substantive privacy page, not a placeholder.

**SUPERSEDED 2026-08-08 (later same day) — PR #61 merged.** Verified from remote git, not memory: `gh pr view 61` → `state: MERGED`, merge commit `9f29e1e` on `main`, merged `2026-08-08T23:32:00Z`. `origin/main` is now `8f93391` (`docs(real-people): post-merge hosted critical journey proof`, authored by the founder directly) — CI green on that head (5/5 checks SUCCESS). `POST_MERGE_HOSTED_PROOF.md` records the same critical-journey gates re-run against **merged main**, not just the branch: mutual ready → Set, private `not_this_time` → not Set, im_in restore, outsider isolation, WebSocket realtime/reconnect, sign-out revoke — all PASS. Twilio still off. **Real People synthetic vertical: closed.** Real-phone/Twilio pilot is separately tracked and still open (`REAL_SMS_READINESS_CHECKLIST.md` — credentials not yet supplied). Nothing further needed from this directive file on PR #61.

## Next program — informational only, not yet an Active directive

PR #61 is closed, which unblocks the founder's relationship-availability direction as the next product slice. Full review-requirements handoff: `CLAUDE_NEXT_PROGRAM_RELATIONSHIP_AVAILABILITY.md`. Not runtime yet — no code or doc changes requested of Grok here; this becomes Active only once the founder scopes a concrete build slice.
