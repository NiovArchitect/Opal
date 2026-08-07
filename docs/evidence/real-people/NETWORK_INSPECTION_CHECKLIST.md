# Network inspection checklist — Real People hosted

**When:** during dress rehearsal only.  
**Tools:** Brave DevTools (Network, Application, Console) + authorized server logs.

## Surfaces

| Surface | Check |
|---------|--------|
| URL bar | No phone, OTP, raw invite token after strip |
| sessionStorage | `opal_invite_continuation` only when expected; cleared on terminal error / sign-out |
| localStorage | No bearer dump; no OTP; no private response |
| Cookies | Session cookie flags (Secure, HttpOnly, SameSite) per SF16 decision; no unexpected auth cookies |
| HTTP request | No raw token in query after open; consent fields present on challenge |
| HTTP response | Signals allowlist; no `response_key` / private reason |
| WebSocket | `message:new` ok; `alignment:participation` shared-safe only |
| Console | No stack traces with phone/OTP; no leaked tokens |
| Server logs | Digests only; never OTP code or full invite secret |

## Forbidden data (must not appear)

- [ ] Raw invite token after strip
- [ ] Phone in URL
- [ ] OTP in client logs or network bodies after submit (except intentional synthetic debug flag off in hosted)
- [ ] Private response in peer payload
- [ ] Private reason
- [ ] Stale continuation after terminal failure
- [ ] Unexpected bearer persistence in localStorage
- [ ] Duplicate Set events / double system moments for one transition

## Pass criteria

All forbidden boxes empty; positive journey still shows Set only when authority allows.
