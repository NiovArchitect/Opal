# R1A Security + Production Identity Intent Lock

**Starting HEAD:** `fc905bb`  
**Branch:** `build/v2-coded-experience-closure`  
**R0:** COMPLETE (`fc905bb`)  
**Square:** R1A ONLY · **R1B HOLD**

```
R1A_AUTHORIZED = YES
R1A_COMPLETE = undecided (physical SMS required for full YES)
PRODUCT: TLS REPAIR + identity harden
NO native · NO WebRTC · NO Kafka prod · NO merge/live
```

## Defects

1. **TLS:** managed Postgres `verify: :verify_none` — encrypt without authenticating server.  
2. **Identity:** Twilio adapter REAL but credentials **unset** in this environment → physical SMS proof blocked.  
3. **Provider.mode:** unknown Application mode falls through to synthetic — harden fail-closed.  
4. **Pepper:** hardcoded SF10 pepper — allow env override for production.

## TLS design

- LOCAL/TEST: may omit SSL or use explicit non-TLS.  
- STAGING/PRODUCTION when `DATABASE_SSL` truthy: `verify: :verify_peer`, CAStore CA file, hostname check via OTP customize_hostname_check.  
- Missing trust material in prod → fail closed (raise safe message, no password).  
- No plaintext / verify_none fallback in prod.  
- Extract `OpalCore.Repo.SslConfig` for unit proof.

## Identity design

- REUSE Onboarding + Twilio adapter + session revoke.  
- `production_sms` only when mode set AND Twilio configured.  
- Physical proof: real phone OTP — **if no founder secrets: REAL_SMS_RUNTIME_PROOF=BLOCKED_BY_FOUNDER_CREDENTIAL, R1A_COMPLETE=NO**.  
- Do not close R1A on synthetic OTP.  
- Replay / rate limit / revoke already present — prove with tests.

## Non-goals

R1B · WebRTC · push · Kafka prod · Places · store · founder seed redesign · public deploy.

## STOP

Implement → prove TLS → prove identity code path → report SMS blocked honestly → commit → push → **STOP**.
