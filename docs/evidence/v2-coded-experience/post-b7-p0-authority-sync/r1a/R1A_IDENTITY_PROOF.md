# R1A Identity Proof

## Implementation (code)

| Capability | Status |
|------------|--------|
| Twilio adapter fail-closed | REAL (pre-existing) |
| Onboarding OTP digest / replay / rate limit / revoke | REAL (pre-existing + tests) |
| Unknown phone mode → disabled | REPAIRED |
| Production SMS requires `OPAL_PHONE_LOOKUP_PEPPER` | ADDED |
| Synthetic not used for R1A closure | HELD |

## Physical SMS runtime

| Env | Status |
|-----|--------|
| `OPAL_TWILIO_ACCOUNT_SID` | **unset** |
| `OPAL_TWILIO_AUTH_TOKEN` | **unset** |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | **unset** |
| `OPAL_PHONE_VERIFY_MODE` | **unset** |

```
R1A_IDENTITY_IMPLEMENTATION = COMPLETE
REAL_SMS_RUNTIME_PROOF = BLOCKED_BY_FOUNDER_CREDENTIAL
```

**Founder action required (from R0_FOUNDER_ACTIONS):** Twilio Verify account + secrets in host vault only + two real phones → set `OPAL_PHONE_VERIFY_MODE=production_sms` + pepper → physical OTP proof in a follow-on square or R1A.x.

Do **not** treat synthetic OTP as R1A closure.
