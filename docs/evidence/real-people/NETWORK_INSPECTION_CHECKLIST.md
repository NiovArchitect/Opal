# Network inspection checklist — Real People hosted

**When:** during dress rehearsal only.  
**Tools:** Brave DevTools (Network, Application, Console) + authorized server logs.  
**Recovery pass:** 2026-08-08 (head `c53571d` / image `rp61-synthetic-61100ca` / web `d5e509a`)

## Surfaces

| Surface | Check | Result |
|---------|--------|--------|
| URL bar | No phone, OTP, raw invite token after strip | **PASS** — `?invite=` stripped to `/` after preview |
| sessionStorage | `opal_invite_continuation` only when expected; cleared on terminal error / sign-out | **PASS** on open; sign-out clear covered by client tests + HTTP revoke |
| localStorage | No bearer dump; no OTP; no private response | **PASS** empty on invite open |
| Cookies | Session cookie flags (Secure, HttpOnly, SameSite) per SF16 decision; no unexpected auth cookies | **PASS** `opal_session` Secure+HttpOnly+Lax; `opal_csrf` Secure+Lax |
| HTTP request | No raw token in query after open; consent fields present on challenge | **PASS** |
| HTTP response | Signals allowlist; no `response_key` / private reason | **PASS** peer hist clean; shared_safe only |
| WebSocket | `message:new` ok; `alignment:participation` shared-safe only | **PASS** message:new A↔peer; outsider join denied |
| Console | No stack traces with phone/OTP; no leaked tokens | **PASS** (CSP meta noise only) |
| Server logs | Digests only; never OTP code or full invite secret | **PARTIAL** — not re-tailed this pass; challenge `no_plaintext_code` |

## Forbidden data (must not appear)

- [x] Raw invite token after strip — **absent from URL** (one-time share preview path only)
- [x] Phone in URL
- [x] OTP in client logs or network bodies after submit (except intentional synthetic debug flag off in hosted)
- [x] Private response in peer payload
- [x] Private reason (flag `private_reason_hidden` allowed)
- [x] Stale continuation after terminal failure — covered by API/used-accept paths
- [x] Unexpected bearer persistence in localStorage
- [x] Duplicate Set events / double system moments for one transition — single Set label set observed
- [x] Twilio secrets

## Pass criteria

All forbidden boxes empty; positive journey still shows Set only when authority allows.

**Status:** **PASS** for recovery hosted pass (API + Brave headless + Phoenix WS clients).
