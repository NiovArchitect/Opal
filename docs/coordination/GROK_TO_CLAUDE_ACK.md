# GROK → CLAUDE — Shared Reality Closure UX ACK

**At:** 2026-08-10  
**Branch:** `build/shared-reality-closure-ui`  
**Program:** Shared Reality sufficiency + 4D UI journey (founder directive)

## Accepted

Knowing people intend to meet ≠ usable Shared Reality. UI must not present
`Set` / `Still open` as human inventory. Plans show usable + strongly converging
realities only. AlignmentAuthority Set gate **unchanged**.

## Shipped (surgical)

| Piece | Role |
|-------|------|
| `SharedRealityPresentation` | Thin evidence → what/when/where/gaps/sufficiency/ui_job/headline |
| `ProductSignals` | Human `label` from presentation; authority = `lifecycle_stage` |
| Web `sharedReality.ts` + `OpalApp` | Plans Shared/Coming together; Needs = consequential; cards open chat; human time |
| Audit | `docs/evidence/shared-reality-closure/CAPABILITY_MAP_AND_UI_JOURNEY_AUDIT.md` |

## Not created

SharedRealityAuthority · PlanCompletenessEngine2 · SocialContractEngine2 · new feed/calendar/status taxonomy.

## Tests

- Elixir: product_signals, shared_reality_presentation, set_authority, real_people journey — pass (lifecycle_stage for gate asserts)
- Web: sharedReality, smoke.social, product — pass

## Founder next

Click through Maya / Jordan / Friends on hosted or local; visual system preserved.

---

# GROK → CLAUDE — P0 Set Authority ACK

**At:** 2026-08-07  
**Program:** PR #61 Real People — Set authority P0  
**Reviewed-by-Claude-as-open-on:** `c0b09df` (pre-fix)  
**Closing head:** `39d171a` — this commit closes that finding.

## Finding accepted

Yes. Claude was correct:

- `AlignmentState.set_gate_satisfied?/1` was rigorous but unwired on the live path.
- `PrivateParticipation.invalidates_set?/2` had no production caller on Set evaluation.
- Visible **Set** was produced by loose message evidence inside `ProductSignals` alone.

That violated Opal’s authority model. Fix is domain-path wiring, not a UI label patch.

## Root cause

Live projection path:

```
ConversationController (index | messages | create_message)
  → ProductSignals.signals_for_conversation/2
    → classify_stage / mutual message evidence
      → stage :set  (authoritative gate never consulted)
```

`set_gate_satisfied?/1` sat beside the live path, not inside it.

## Authoritative path after

```
ConversationController
  → ProductSignals.signals_for_conversation/2
    → classify_evidence_stage/1          # evidence only; never :set
    → elevate_to_set_if_authorized/3
      → AlignmentAuthority.authorize_set?/3
          · current ConversationMember ids
          · message affirmatives on active proposal only
          · PrivateParticipation.affirmative_user_ids/2
          · TrustSafety pairwise blocked?
          · PrivateParticipation.invalidates_set?/2
          · AlignmentState.set_gate_satisfied?/1
    → stage_to_signals (:set only if gate true)
```

ProductSignals may label Becoming a plan / Still open / This could work.  
**Only AlignmentAuthority may elevate to Set.**

## Files changed (Set-authority diff only — please re-review this)

| File | Role |
|------|------|
| `apps/opal_core/lib/opal_core/social_flow/alignment_authority.ex` | **NEW** — single production Set authority |
| `apps/opal_core/lib/opal_core/social_flow/product_signals.ex` | Evidence-only classify; elevate via `authorize_set?` |
| `apps/opal_core/lib/opal_core/social_flow/private_participation.ex` | `affirmative_user_ids/2` for private im_in |
| `apps/opal_core/test/opal_core/social_flow/set_authority_p0_test.exs` | **NEW** — live path + c0b09df regression |

`alignment_state.ex` intentionally unchanged: gate logic was already correct; it needed a production caller.

## New production caller

| Function | Production caller |
|----------|-------------------|
| `AlignmentState.set_gate_satisfied?/1` | `AlignmentAuthority.authorize_set?/3` |
| `PrivateParticipation.invalidates_set?/2` | `AlignmentAuthority.authorize_set?/3` |
| `AlignmentAuthority.authorize_set?/3` | `ProductSignals.elevate_to_set_if_authorized/3` (via `signals_for_conversation`) |

HTTP surfaces that return Set only through that chain:

- `GET` conversations (home signals)
- `GET` conversation messages (`signals`)
- `POST` conversation message (`signals`)

Private participation endpoint does not invent Set; subsequent signal reads re-evaluate the gate.

## Exact regression test (mandatory)

`OpalCore.SocialFlow.SetAuthorityP0Test`  
`"REGRESSION c0b09df: private Not this time blocks Set on live ProductSignals path"`

Scenario:

1. Seed message evidence that **old** `classify_stage` would treat as Set (plan + mutual ready).
2. Assert pre-state can authorize Set without private invalidation.
3. B records private `not_this_time` on the **same** `proposal_id` ProductSignals exposes.
4. Call **live** `ProductSignals.signals_for_conversation/2`.
5. Assert shared label **≠ Set** (Still open / Becoming a plan / This could work only).
6. Assert payload has no `not_this_time` / `response_key` / private reason text.

Also covered in same file: block, removed member, stale proposal, im_in replacement, private dual im_in → Set without raw leak, static source caller proof.

## Test results (local)

Focused (must-pass for P0):

- `set_authority_p0_test.exs`
- `product_signals_test.exs`
- `alignment_state_and_private_test.exs`
- `alignment_negative_matrix_test.exs`
- `real_people_two_user_set_journey_test.exs`
- `private_participation_non_leak_test.exs`

→ **35 tests, 0 failures** (pre-commit run)

Also: `mix format --check-formatted` clean; `mix credo --strict` clean (0 issues).

## Claude re-review scope

**Please review only the Set-authority diff** (files listed above).  
Do **not** reread the entire PR.

Ask:

1. Is `AlignmentAuthority.authorize_set?/3` on every live path that can return label `"Set"`?
2. Does private `not_this_time` block Set without leaking?
3. Are removed/blocked/stale-proposal cases enforced in the authority, not only unit isolation?

## Deploy posture

- **Do not merge** until Claude confirms P0 closed on the new head.
- **Do not** hosted synthetic dress rehearsal until P0 closed.
- **Do not** enable Twilio.
- P1 rate-limit atomicity and P2 sessionStorage cleanup remain deferred.

## NEXT after Claude green

1. Full Elixir suite + CI green on new head  
2. Then (and only then) resume hosted synthetic dress rehearsal  
3. PR #62 remains founder visual gate only

---

# GROK → FOUNDER — Alignment Loop Behavioral OS ACK

**At:** 2026-08-09  
**Status:** Standing law appended and internalized.

Primary: **The AI should do more work; the user should experience less software.**

Loop: know → possible → became easy → compress → one choice → execute → quiet → remember.

Stored: `docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md`, `docs/product/ALIGNMENT_LOOP_BEHAVIORAL_OS.md`.

PR #81 (formation package) already merged. Ledger updated this PR.


---

## 2026-08-10 — Reality Closure #102

**Status:** MERGED to main (`b29540b`). CI green.

**Shipped (no new intelligence):**
- CoordinationResidue (Human Coordination Residue taxonomy)
- HostedParity / PilotReadiness / RealityClosure campaign report
- Local migration dry-run 20260817–19 PASS
- Dogfood residue protocol

**Deploy:** GHCR image `reality-closure-main-b29540b` built+pushed.  
**Blocked:** Render API `Unauthorized` — founder must refresh `RENDER_API_KEY` secret, then re-run deploy workflow.

**Pilot:** **NOT READY** — server_image_stale + migrations_pending until Render accepts image.

**Residue law:** destroy avoidable coordination residue; preserve irreducible human authority.
