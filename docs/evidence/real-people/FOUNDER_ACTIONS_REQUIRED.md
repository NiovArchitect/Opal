# Founder actions required — production SMS pilot

**Author:** Grok (lead)  
**Updated:** 2026-08-06  
**Status:** Packages B–D proceed without credentials. Live OTP proof needs account setup only.

## Corrected assumption

**US 10DLC is not an automatic prerequisite for Twilio Verify-managed OTP.**  
See `VERIFY_VS_MESSAGING_COMPLIANCE.md`. 10DLC / sender registration belongs to **general SMS invitations later**, or BYO-sender Verify configurations.

## For initial Twilio Verify pilot (OTP only)

1. Approve **Twilio Verify** as provider.  
2. Create or confirm a Twilio account.  
3. Create a **Verify Service**.  
4. Enable billing **or** remain within **trial-recipient restrictions** (trial can only message numbers verified in the Twilio console).  
5. Prepare **two consenting adult pilot phones**.  
6. Supply server-side credentials only via secure host env (prefer scoped API key + secret when ready):

```text
OPAL_PHONE_VERIFY_MODE=production_sms
OPAL_TWILIO_ACCOUNT_SID=...
# Prefer API key:
# OPAL_TWILIO_API_KEY_SID=...
# OPAL_TWILIO_API_KEY_SECRET=...
# Or short-term Auth Token:
OPAL_TWILIO_AUTH_TOKEN=...
OPAL_TWILIO_VERIFY_SERVICE_SID=...
```

7. Confirm production has **unset**: `OPAL_SYNTHETIC_EXPOSE_CODE`, `OPAL_DEV_AUTH`. Never put credentials in git, Vite, mobile, logs, screenshots, or evidence.

## Later — general SMS invitations (does not block share links)

Separate checklist: approved sender, applicable registration (may include 10DLC for A2P messaging), STOP/HELP, opt-in records, delivery reporting.

## Grok will not

- Purchase plans without approval  
- Block Packages B–D on credentials  
- Claim real SMS proof until a code is received on a controlled phone  
- Claim arbitrary-number readiness from trial-only delivery  

## After secrets land

Grok runs real OTP proof and records pilot evidence **without** logging numbers, codes, or tokens.
