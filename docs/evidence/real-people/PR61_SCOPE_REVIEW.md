# PR #61 scope review

**Author:** Grok (lead)  
**Head:** report exact at push time  
**Decision:** Keep unified — coherent vertical; split only if review safety fails.

## Classification

| Area | Packages | Files (representative) |
|------|----------|------------------------|
| Provider boundary | A | `phone_verification/*`, runtime mode, provider tests |
| OTP consent + activation | B | onboarding consent, ActivationController, ActivationFlow, productClient |
| Invitation + continuation | C | InvitationContinuation, onboarding resume, InvitationController, OpalApp deep-link |
| Alignment | D | ProductSignals Set, AlignmentState, AlignmentParticipation, PrivateParticipation |
| Evidence | A–D | `docs/evidence/real-people/*`, threat model, compliance |
| Tests | A–D | otp_consent, twilio mock, continuation, alignment, product_signals |
| Unrelated | — | **Empty** |

## Review safety

Single vertical: phone control → invitation → resume → relationship → realtime → Set.  
Do **not** merge until: continuation tests green, private non-leak proof, full suite/CI, synthetic dress rehearsal staged.

## Residual before merge

- Full monorepo CI matrix  
- Hosted synthetic deploy smoke  
- Claude/Agency nonblocking review artifacts  
