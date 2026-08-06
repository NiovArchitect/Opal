# Founder actions required — production SMS pilot

**Author:** Grok (lead)  
**Status:** Code can ship in `synthetic_development`; live real-SMS pilot blocked on account setup.

## Required before `OPAL_PHONE_VERIFY_MODE=production_sms`

1. Approve **Twilio Verify** as primary (or override to Telnyx in writing).  
2. Create Twilio account under NIOV/Opal entity.  
3. Complete **US A2P 10DLC** (or approved toll-free) registration.  
4. Create Verify Service “Opal”.  
5. Set **server-only** secrets on API host (Render):

```text
OPAL_PHONE_VERIFY_MODE=production_sms
OPAL_TWILIO_ACCOUNT_SID=...
OPAL_TWILIO_AUTH_TOKEN=...
OPAL_TWILIO_VERIFY_SERVICE_SID=...
```

6. Confirm these are **unset** in production:  
   `OPAL_SYNTHETIC_EXPOSE_CODE`, `OPAL_DEV_AUTH`, client-side provider secrets.  
7. Nominate **two pilot phones** (real people) and abuse contact.  
8. Approve budget (pilot cost is cents–dollars; registration is the fixed cost).

## Grok will not

- Purchase plans without approval  
- Put secrets in git or Vite  
- Enable production mode on public API without steps above  
- Claim mass-consumer SMS readiness after pilot  

## After secrets land

Grok runs the completion gates in `PROGRAM_CHARTER.md` and records pilot evidence under `docs/evidence/real-people/` **without** logging numbers, codes, or tokens.
