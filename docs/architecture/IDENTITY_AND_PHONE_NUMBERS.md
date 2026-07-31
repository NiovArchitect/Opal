# Identity and Phone Numbers

**Status:** Phase 0  
**MVP:** domain model + synthetic verify; real SMS after founder approval

---

## Identity model

```text
User
  id
  primary_phone_e164
  phone_verified_at
  display_name
  preferred_languages[]
  created_at
  status  # active | suspended | deleted

DeviceSession
  id
  user_id
  device_fingerprint
  push_token?
  created_at
  last_seen_at
  revoked_at?

PhoneVerificationChallenge
  phone_e164
  code_hash
  expires_at
  attempts
```

---

## Principles

1. **Phone number is the primary identifier** for social discovery (WhatsApp-like).  
2. Store **E.164** only; normalize on input.  
3. Never log raw OTP codes.  
4. Rate-limit verification aggressively.  
5. Support number change as a governed flow (POST-MVP).  

---

## Verification flow (target)

```text
Client → request_code(phone)
Core → rate limit → provider SMS (or dev stub)
Client → submit_code
Core → verify → create/login user → issue session tokens
```

### Dev/synthetic mode

- Fixed test numbers map to known codes.  
- No external SMS.  
- Clearly impossible to enable in production builds.

---

## Contact discovery (open design)

**Problem:** naive upload of address books leaks social graphs.

**Candidates:**

1. Hashed phone discovery with rate limits and k-anonymity techniques.  
2. Explicit invite links / QR without full book upload.  
3. Mutual discovery only.

**MVP recommendation:** invite link + optional single-number search with strict rate limits; full book sync only after privacy review (G011).

---

## Non-users

- Invitation link always.  
- SMS invite: FOUNDER_DECISION (G012) + provider.  
- Do not message non-users with AI content.

---

## Security

- Session tokens rotatable; device revoke.  
- SIM-swap / account takeover mitigations: re-verify sensitive actions (later).  
- Block lists enforced at messaging and discovery layers.
