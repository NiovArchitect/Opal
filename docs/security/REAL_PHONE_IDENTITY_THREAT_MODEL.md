# Real phone identity — threat model

**Author:** Grok (lead)  
**Program:** Real People and First Alignment  
**Public truth:** Phone verification confirms **control of the number at that time**. It does **not** prove legal identity.

---

## Assets

| Asset | Sensitivity |
|-------|-------------|
| E.164 phone (raw) | High — minimize storage/exposure |
| Phone digest / HMAC | Medium — server-side lookup key |
| OTP / challenge code | Critical — never log or store plaintext in production |
| Challenge ID + provider reference | Medium |
| Product session / device session | Critical |
| Invitation share token | Critical |
| Relationship + messages | High / content-critical |
| Private participation reasons | Critical — never leak |

---

## Threats and controls

| Threat | Risk | Controls |
|--------|------|----------|
| OTP interception (SIM / SMS) | High | Short TTL, attempt caps; do not treat as legal ID; optional step-up later |
| SIM swap / number reassignment | High | Existing quarantine / reassignment review paths; re-verify on risk signals |
| Recycled numbers | High | Ownership review; reassignment signals; do not auto-transfer history |
| Brute-force codes | High | max_attempts, lock status, rate limits per digest/IP/device |
| SMS pumping fraud | High | Per-phone/IP/device ceilings, cooldowns, provider fraud tools, generic errors |
| Enumeration (is this number on Opal?) | High | Identical public errors; invite states without membership oracle |
| Invite spam | Medium | Per-sender limits, revoke, block override |
| Account takeover | High | Device-bound sessions, revoke on sign-out, socket ticket TTL |
| Lost / stolen device | High | Sign-out, remote revoke, short tickets |
| Deep-link / token theft | High | Opaque random tokens, digest at rest, expiry, single-use/bounded reuse |
| Replay | Medium | Consumed challenges; used invitations |
| Phishing | Medium | Brand copy; no codes in URLs; HTTPS only |
| Blocked relationship bypass | High | TrustSafety authority; channel membership checks |
| Youth safety | High | Existing minor/family rules; no discovery of strangers via phone oracle |
| Abusive contact discovery | High | Selected-only contacts; no full book upload |
| Provider outage / SMS delay | Medium | Honest UI errors; resend cooldown; no fake “delivered” |
| Log leakage | Critical | Never log phone, OTP, tokens, secrets |

---

## Public error language (age-12)

Use generic lines only:

- We couldn’t send a code right now. Try again in a little while.  
- That code didn’t work. Try again.  
- That code expired. Send a new one.  
- Too many tries. Wait a little and try again.

Never:

- This number is not registered.  
- This number already belongs to another user. *(as a discovery oracle)*  
- Provider / Twilio error codes to end users.

---

## Residual risks (accepted for pilot)

1. SMS is interceptable — pilot uses controlled phones and mutual trust.  
2. Legal identity is not established — product copy must never say “identity verified.”  
3. International delivery and 10DLC setup incomplete until founder registration.  
4. Physical-device contact permission matrix still SF18-open.
