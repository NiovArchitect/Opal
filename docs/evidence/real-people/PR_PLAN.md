# PR plan — Real People vertical

**Author:** Grok (lead)

| PR | Scope | Independence |
|----|--------|--------------|
| **A** (this branch first push) | Program docs, threat model, provider review, provider boundary + Twilio adapter skeleton, Onboarding mode wiring, unit tests | Safe: default remains synthetic; production fails closed without secrets |
| **B** | Rate-limit/fraud polish, activation copy age-12, web ActivationFlow re-submit phone on verify, mode badges honesty | Safe on synthetic hosts |
| **C** | Invitation delivery states, share/deep-link resume, no membership oracle | Independent |
| **D** | First alignment experience packaging (Becoming a plan → Set) + two-user realtime pilot script | Independent of SMS once synthetic OK |
| **E** | Hosted production_sms enablement + pilot evidence after founder Twilio/10DLC | Requires founder secrets |

Each PR must be green alone. No half-integrated dead code on main without feature flags.
