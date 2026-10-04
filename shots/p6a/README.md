# Phase 6A — invitation SMS via Twilio

## What shipped

- `OpalCore.SocialFlow.Sms.TwilioSmsAdapter` — Programmable Messaging (Messages.json), Basic auth, From or MessagingServiceSid, truncate 1600, `{:ok, sid} | {:error, reason}` with verbatim Twilio codes.
- `InvitationController` wires SMS only when readiness is `:ready`. Otherwise `sms_adapter: "disabled"` with warn log and honest `sms_disabled_reason`.
- Body: `[Name] invited you to Opal — [link]` + `Reply STOP to opt out.`
- One SMS per invitation (idempotent replay skips). Phone only when inviter explicitly provided it.

## Provider honesty (deliverable)

Shell/process at verify time:

| Env | Status |
|-----|--------|
| `OPAL_TWILIO_ACCOUNT_SID` | **UNSET** |
| `OPAL_TWILIO_AUTH_TOKEN` | **UNSET** |
| `OPAL_TWILIO_FROM_NUMBER` | **UNSET** |
| `OPAL_TWILIO_MESSAGING_SERVICE_SID` | **UNSET** |

**Runtime adapter: disabled.** Live send: **provider untested live** (founder chose mock-verify; no From configured).

When From is set later, a real send can return Twilio SID or the exact error code/message (e.g. 21606, 21211) without faking success.

## Evidence

- `mix_test.log` — 16/16 green
- `a8_surface_regression.log` — 13/13 green
- `no_score.txt` — zero `_score` matches
- `provider_honesty.txt` — UNSET report
