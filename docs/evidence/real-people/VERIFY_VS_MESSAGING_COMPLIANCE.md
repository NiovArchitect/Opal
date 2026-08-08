# Verify OTP vs general SMS — compliance separation

**Author:** Grok (lead)  
**Updated:** 2026-08-06  
**Correction:** US 10DLC is **not** an automatic prerequisite for Twilio Verify-managed OTP.

Sources (official Twilio docs):

- [Verify SMS overview](https://www.twilio.com/docs/verify/sms) — use Verify Service to send OTP; obtain consent first  
- [Consent and Opt-in Policy](https://www.twilio.com/docs/verify/consent-opt-in) — required disclosures for US/Canada OTP UI  

---

## A. Twilio Verify OTP (prove control of a number)

| Item | Required for first pilot? |
|------|---------------------------|
| Twilio account | Yes |
| Verify Service | Yes |
| Server credentials (API key preferred; Auth Token acceptable short-term) | Yes |
| Billing enabled **or** trial verified recipients only | Yes — trial can only text numbers verified in Twilio console |
| Recipient consent + evidence | Yes |
| UI: “message and data rates may apply” | Yes (US/Canada) |
| Terms + Privacy links | Yes |
| Fraud controls / rate limits | Yes (Opal + provider) |
| **Opal 10DLC campaign** | **No — not automatic for Verify-managed OTP** |
| Bring-your-own sender registration | Only if Opal configures custom sender on Verify |

### Trial constraint (important)

Twilio **trial** accounts may only send verification messages to recipient numbers that were first verified in the Twilio account. Enough for a two-phone controlled pilot. **Not** arbitrary-number readiness.

---

## B. General SMS invitations (later)

Separate program — **must not block** secure share-link invitations.

| Item | Notes |
|------|--------|
| Approved sender | Long code / toll-free / short code |
| Applicable registration (e.g. 10DLC for US A2P app messaging) | When using programmable messaging senders |
| Opt-in / opt-out records | Separate from OTP consent |
| STOP / HELP | Carrier expectations for messaging programs |
| Templates + delivery reporting | Invitation-specific |

Document exact registration only after invitation SMS adapter design is chosen.

---

## Founder actions (revised)

### For initial Twilio Verify pilot

1. Approve Twilio Verify as OTP provider  
2. Create or confirm Twilio account  
3. Create a Verify Service  
4. Enable billing **or** stay within trial-recipient restrictions for controlled proof  
5. Prepare two consenting adult pilot phone numbers  
6. Supply server-side credentials only via secure host env (prefer scoped API key + secret)

### Not listed as automatic OTP blockers

- Opal 10DLC brand/campaign registration for Verify-managed OTP  

### Later (general SMS invites)

- Separate sender + compliance checklist — does not block share-link Package C  
