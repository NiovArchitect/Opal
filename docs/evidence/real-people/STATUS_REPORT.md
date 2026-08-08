# Real People vertical — status report (partial)

**Author:** Grok (lead)  
**Date:** 2026-08-06  
**Branch:** `build/real-people-first-alignment`

## 1. Executive decision

Open **OPAL REAL PEOPLE AND FIRST ALIGNMENT VERTICAL**.  
Grok executes continuously. Claude does not block.  
Reuse SF10–18 domain; add production SMS behind explicit mode.  
**Recommended provider: Twilio Verify.** Production mode **not enabled** until founder secrets + 10DLC.

## 2. Repository state

| Item | Value |
|------|--------|
| Base main | `c6d972c` (PR #60 walkthrough peak brand live) |
| Worktree | `worktrees/opal-grok-real-people` |
| Public web | Branding + booking honesty deployed; SMS still synthetic/not-production |

## 3. Program scope

Real phone → invite → accept → realtime → first Set alignment.  
Not SF19, not SF17 reopen, not Kafka, not booking providers.

## 4–6. Provider / cost / threat

See:

- `PRODUCTION_SMS_PROVIDER_REVIEW.md`  
- `docs/security/REAL_PHONE_IDENTITY_THREAT_MODEL.md`  

Rough Twilio US all-in ~$0.06 / successful verification.

## 7–8. Provider abstraction + adapter

Implemented:

```text
PhoneVerification.Provider
  SyntheticAdapter
  DisabledAdapter
  TwilioVerifyAdapter (fail-closed without secrets)
```

Onboarding `start_verification` / `complete_verification` call the boundary.  
Production verify requires phone re-submit (no digest reversal).

## 9–10. Rate limits / activation UI

Existing SF10 rate limits retained.  
Activation controller: age-12 generic errors for provider failures; provider label honest.

## 11–18. Session / invite / realtime / alignment

**Already in domain (synthetic-proven):** ProductSession, DeviceSession, invitations, accept→relationship+convo, Messages+Channel, ProductSignals.  
**Still open for this vertical:** production SMS, invite SMS delivery, pilot two-real-phone proof, first-alignment UX packaging polish.

## 19–40. Remaining sections

Incomplete until PR B–E and founder pilot. Workers continue.

## 41. Residual risks

- B001 still open until production mode + pilot  
- SF18 physical matrix incomplete  
- 10DLC lead time  
- SMS interceptability accepted for controlled pilot  

## 42. Worker closure

**Not zero.** Vertical **open**. First PR-A package: docs + provider boundary + tests.

### Tests this package

`phone_verification_provider_test.exs` — 4 tests, 0 failures.
