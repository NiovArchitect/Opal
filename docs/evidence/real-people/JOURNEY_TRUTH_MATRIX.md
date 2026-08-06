# Journey truth matrix — Real People vertical

**Author:** Grok (lead)  
**Date:** 2026-08-06  
**Base code:** main `c6d972c` + SF10–18 domain

| Step | Required behavior | Current truth | Gap |
|------|-------------------|---------------|-----|
| Walkthrough Full TC | Skip 1–4, Join 5 | **Live** on opal.niovlabs.com | None for this vertical |
| Join ≠ member shell | Activation only after Join | **Works** | None |
| Accept real E.164 | Normalize + region | **Works** (+1) | Broader intl later |
| Request challenge | Rate-limited, hashed | **Synthetic only** | Production provider |
| Deliver SMS code | Carrier SMS | **Not production** (B001) | Adapter + account + secrets |
| Verify code | Session + device | **Works synthetic** | Same path for production codes |
| First member empty | No seeded social graph | Hosted synthetic OK; seed data still in web fallback | Ensure API-live path has no fake plans |
| Find People | Select-only / manual | **Works** | Physical contact matrix SF18 open |
| Create invite | Opaque token, purpose | **Works** | SMS invite delivery not real |
| Delivery honesty | sms_sent only if true | Controller forces `sms_sent: false` | Wire real delivery status |
| Share / deep link | Token open / resume | Web share path + mobile deep link parse | Universal links / resume after verify polish |
| Recipient verify | Real phone | Synthetic fixtures only on hosted | Production SMS |
| Accept → relationship + convo | Authoritative | **Works** | Residual phone-invite match hardening |
| Realtime chat | No refresh | **Works** product session + channel | Pilot with two real devices |
| Becoming a plan | Signal from evidence | ProductSignals + walkthrough honesty | First-alignment UX packaging |
| Set state | Lightweight actions | Partial opportunity / DSI | End-to-end pilot script |
| No booking language | Product copy | Walkthrough fixed | Guard member alignment copy |
| Sign-out / block / revoke | TrustSafety | **Works domain** | Pilot proof |
| No secrets in logs | Pepper / digests | Strong synthetic design | Audit production adapter |

## Modes (must be explicit)

| Mode | Meaning |
|------|---------|
| `synthetic_development` | Fixture / local codes; may expose code only when flag on |
| `production_sms` | Real provider; never return codes; never fall back to synthetic |
| `disabled` | Challenges rejected |

## Closure phrase (only when all gates pass)

> OPAL REAL PEOPLE AND FIRST ALIGNMENT VERTICAL CLOSED FOR PRODUCTION PHONE VERIFICATION, SECURE INVITATION, AUTHORITATIVE RELATIONSHIP CREATION, REALTIME COMMUNICATION, PRIVATE PARTICIPATION, AND FIRST AUTHENTIC ALIGNMENT
