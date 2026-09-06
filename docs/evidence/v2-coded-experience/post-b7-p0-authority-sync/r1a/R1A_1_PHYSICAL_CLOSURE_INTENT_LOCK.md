# R1A.1 Physical SMS + Identity Closure — Intent Lock

**Date:** 2026-09-06  
**Starting HEAD:** `3687387`  
**Branch:** `build/v2-coded-experience-closure` · clean  
**Square:** R1A.1 ONLY · not a reimplementation of R1A · R1B HOLD

```
R1A_IDENTITY_IMPLEMENTATION = COMPLETE
POSTGRES_TLS_CONFIG = GREEN
REAL_SMS_RUNTIME_PROOF = BLOCKED_BY_FOUNDER_CREDENTIAL (at start)
R1A_COMPLETE = NO
PRODUCT_CODE_CHANGED = NO (unless physical proof finds objective defect)
```

## Purpose

Earn physical reality:

real phone → real SMS → real OTP entry → real user/session → revoke → old credential dead.  
No synthetic. No founder seed. No hardcoded OTP.

## Config gate (names only)

At session start on this host:

| Variable | Presence |
|----------|----------|
| `OPAL_PHONE_VERIFY_MODE` | **UNSET** (must be `production_sms`) |
| `OPAL_TWILIO_ACCOUNT_SID` | **UNSET** |
| `OPAL_TWILIO_AUTH_TOKEN` | **UNSET** |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | **UNSET** |
| `OPAL_PHONE_LOOKUP_PEPPER` | **UNSET** |

No `.env` lines present for these keys in repo workspace.

## Twilio mode (from code)

`TWILIO_MODE = VERIFY` (`TwilioVerifyAdapter` — provider owns OTP; Opal does not invent parallel authority).

## Privacy procedure

Never commit: secrets, OTP, full E.164, session tokens, DATABASE_URL.  
Evidence may use masked phone only after a successful physical run.

## Physical proof procedure (when credentials SET)

1. production_sms mode confirmed  
2. Normal first-run → phone → challenge → Twilio Verify  
3. Device receives SMS (`REAL_SMS_RECEIVED=YES`)  
4. Founder enters code in product UI only  
5. User + session · reload · logout · revoke · replay=0  
6. Cold-start DI regression if new user  

## STOP law

If credentials missing → **do not bypass** → STOP with missing names.  
If proof fails → R1A_COMPLETE=NO.  
If proof GREEN → R1A_COMPLETE=YES · still no auto R1B.
