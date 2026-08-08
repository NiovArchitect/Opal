# PR #61 scope review

**Author:** Grok (lead)  
**Head:** `c53571d`  
**Date:** 2026-08-08  
**Decision:** Keep unified — coherent Real People vertical. **Merge-ready** after hosted recovery proof.

## Classification

| Area | Packages | Files (representative) |
|------|----------|------------------------|
| Provider boundary | A | `phone_verification/*`, runtime mode, provider tests |
| OTP consent + activation | B | onboarding consent, ActivationController, ActivationFlow, productClient |
| Invitation + continuation | C | InvitationContinuation, onboarding resume, InvitationController, OpalApp deep-link |
| Alignment | D | AlignmentAuthority, ProductSignals Set, PrivateParticipation |
| Evidence | A–D | `docs/evidence/real-people/*`, threat model, compliance |
| Tests | A–D | otp_consent, twilio mock, continuation, alignment, product_signals, set_authority_p0 |
| Unrelated | — | **Empty** |

## Review safety

Single vertical: phone control → invitation → resume → relationship → realtime → Set.

## Merge gates (recovery)

| Gate | Status |
|------|--------|
| Continuation / private non-leak | **PASS** |
| CI exact head | **PASS** (all green) |
| Hosted synthetic image | **PASS** `rp61-synthetic-61100ca` |
| Set authority P0 live | **PASS** |
| WebSocket + reconnect | **PASS** |
| Network/storage inspection | **PASS** |
| Sign-out / revoke | **PASS** |
| Outsider isolation | **PASS** |
| Twilio off | **PASS** |
| Rollback | Image pin + prior digests on Render |

## Residual non-blockers

- Observability **PARTIAL** (honest; not merge-blocking).  
- Rate-limit IP ceilings still soft.  
- Fixture A↔B residual safety block from earlier N6 (use A↔C or unblock ops).  

## Decision

**MERGE** PR #61 when founder/automation executes merge on this head after recording merge commit + post-merge proof.
