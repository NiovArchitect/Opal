# Threat Model (Preliminary)

**Status:** Phase 0 — living document  
**Method:** informal STRIDE-oriented pass for intimate messaging + AI

---

## Assets

1. Message and media content  
2. Auth sessions / phone identity  
3. Private AI reflections  
4. Shared relationship memory  
5. Contact graph  
6. Voice biometric / models  
7. Presence / location-ish signals  
8. Infrastructure credentials  

---

## Adversaries

| Adversary | Interest |
|-----------|----------|
| External attacker | Account takeover, data theft |
| Malicious insider | Abuse of admin access |
| Abusive partner / peer | Coercive control, stalking, surveillance via app features |
| Curious provider employee | Subprocessor risk |
| Compromised device | Local DB and tokens |
| Prompt/model abuse | Jailbreak drafting/safety |

---

## STRIDE snapshot

| Threat | Examples | Mitigations (design) |
|--------|----------|----------------------|
| Spoofing | Fake SMS, session theft | OTP rate limits; secure tokens; device revoke |
| Tampering | Message alteration | Server authority; later E2EE integrity |
| Repudiation | Deny send | Server logs; client_msg_id (careful legal framing) |
| Info disclosure | Graph leak, AI side channel | Discovery privacy; consent; log hygiene; isolation tests |
| DoS | Reconnect storms, AI cost bombs | Rate limits, backpressure, queues |
| Elevation | Read others’ chats | Authz on every path; automated isolation tests |

---

## High-risk product threats

1. **AI as surveillance** — always-on analysis without consent.  
2. **AI as weapon** — certainty claims, “proof packs,” monitoring.  
3. **Impersonation** — voice clone / call-as-user abuse.  
4. **Context bleed** — romantic memory in family circle.  
5. **Graph leakage** — contact upload.  
6. **Provider retention** — intimate data in third-party training sets.

---

## Required test themes

- Cross-user isolation  
- Cross-conversation isolation  
- Shared vs private memory  
- Block enforcement  
- Consent revocation  
- Safety refusals  
- Coercive-control synthetic scenarios  

---

## Out of scope for this draft

- Full formal pen-test  
- Legal opinion  
- Country-by-country compliance matrix  

These are LEGAL / EXTERNAL before public launch.
