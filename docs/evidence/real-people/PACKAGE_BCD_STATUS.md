# Packages B–D status

**Author:** Grok (lead)  
**Date:** 2026-08-06  
**Branch:** `build/real-people-first-alignment`

## Package A

PR #61 foundation accepted. 10DLC assumption corrected in:

- `VERIFY_VS_MESSAGING_COMPLIANCE.md`
- `FOUNDER_ACTIONS_REQUIRED.md`
- `PRODUCTION_SMS_PROVIDER_REVIEW.md`

## Package B (activation + consent)

| Item | Status |
|------|--------|
| OTP consent required before challenge | Done (server + UI) |
| Consent evidence audit event | Done (`onboarding.otp_consent.recorded`) |
| Age-12 copy (Text me a code, rates, Privacy/Terms) | Done |
| Phone re-submit on verify | Done (client + server bind to digest) |
| No development code in production mode | Done |
| Generic error language | Done |
| Resend cooldown UI | Done |
| Change number | Done |

## Package C (invitation honesty)

| Item | Status |
|------|--------|
| delivery.share_link_ready vs sms_sent | Done |
| product_delivery_label `invite_ready` | Done |
| Purpose copy “invited you into a plan” | Done |
| SMS adapter remains disabled | Done |
| Deep-link resume polish | Partial (existing share token + mobile deep link; further resume hardening next) |

## Package D (first alignment)

| Item | Status |
|------|--------|
| Study/Wednesday patterns | Done |
| Public label **Set** (not Booked) | Done |
| Still open / Becoming a plan / Not happening | Done |
| Private participation projection helper | Done (`AlignmentParticipation`) |
| Realtime two-user scripted proof | Existing domain; pilot script next |

## Tests run this package

- Provider unit tests (prior)
- Onboarding + activation HTTP after consent injection (run in CI)

## Founder still required for real SMS only

Twilio account + Verify Service + credentials + pilot phones.  
Not 10DLC for Verify OTP. Not required for B–D completion under synthetic mode.
