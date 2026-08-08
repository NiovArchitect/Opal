# Privacy-safe metrics — Real People vertical

**Author:** Grok (lead)

Counters (no PII):

- otp_consent_recorded  
- challenge_requested / challenge_failed  
- verification_succeeded / verification_failed  
- invite_ready / invite_opened / invite_accepted  
- relationship_created  
- first_message_sent  
- plan_recognized  
- alignment_still_open / alignment_set  
- time_to_set (synthetic instrumentation only)

**Never attach:** raw phone, OTP, raw invitation token, message body, private response, precise location.

Implementation may log structured event types via existing audit/outbox with digests only.  
