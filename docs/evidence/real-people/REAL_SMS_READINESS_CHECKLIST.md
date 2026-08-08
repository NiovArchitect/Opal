# Real SMS readiness checklist

**Author:** Grok (lead)  
**Do not paste secrets into chat or git.**

## Before requesting founder credentials

- [ ] PR #61 review + merge decision  
- [ ] Hosted synthetic dress rehearsal pass  
- [ ] Terms URL reachable  
- [ ] Privacy URL reachable  
- [ ] OTP consent evidence working  
- [ ] Rate limits proven  
- [ ] Twilio adapter failure tests (mocked) pass  
- [ ] Rollback documented  

## Founder supplies (secure host env only)

| Name | Purpose |
|------|---------|
| `OPAL_PHONE_VERIFY_MODE=production_sms` | Enable real OTP |
| `OPAL_TWILIO_ACCOUNT_SID` | Account |
| `OPAL_TWILIO_API_KEY_SID` + `OPAL_TWILIO_API_KEY_SECRET` (preferred) or `OPAL_TWILIO_AUTH_TOKEN` | Auth |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | Verify Service |

## Twilio setup steps

1. Create/confirm Twilio account  
2. Create Verify Service “Opal”  
3. Prefer API Key over primary Auth Token when possible  
4. Trial: verify pilot numbers in console **or** enable billing  
5. Two consenting adult pilot phones only  

## Not required for Verify OTP

- Opal 10DLC campaign (unless account-specific Twilio guidance or BYO sender)

## After enable

1. Founder-only real OTP receive/verify  
2. Founder + one trusted adult invite loop  
3. Set alignment + private answer non-leak  
4. Sign-out / revoke  

## Expected pilot cost

On the order of **cents to a few dollars** for dual-phone Verify OTP; registration/billing setup is separate.
