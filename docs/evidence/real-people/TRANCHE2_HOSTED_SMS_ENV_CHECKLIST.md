# Tranche #2 — Hosted API real SMS env checklist

**Do not paste secret values into git or chat.**

Founder configures these on the **hosted product API** (`api.opal.niovlabs.com` / Render service) only.

## Required

| Name | Value |
|------|--------|
| `OPAL_PHONE_VERIFY_MODE` | `production_sms` |
| `OPAL_TWILIO_ACCOUNT_SID` | (Twilio Account SID) |
| `OPAL_TWILIO_AUTH_TOKEN` | (Twilio Auth Token — adapter reads this name) |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | (Verify Service SID) |
| `OPAL_PHONE_LOOKUP_PEPPER` | long random secret (prod boot-required under production_sms) |

## Must stay OFF / unset on RC host

| Name | Required state |
|------|----------------|
| `OPAL_SYNTHETIC_EXPOSE_CODE` | unset / false |
| `OPAL_SYNTHETIC_FIXTURE_ONLY` | unset / false |
| `OPAL_DEV_AUTH` | unset / false |

## Law

- Missing Twilio config → honest `provider_not_configured` (503) — **never** synthetic OTP.
- Unset mode on prod → `disabled` — **never** silent synthetic.
- `production_sms` never falls back to SyntheticAdapter.

## Probe (after deploy)

```bash
curl -sS -X POST https://api.opal.niovlabs.com/api/v1/product/activation/challenges \
  -H 'content-type: application/json' \
  -d '{"phone":"+1YOURREALNUMBER","otp_consent_accepted":true,"idempotency_key":"t2-probe-1"}'
```

Expect JSON with `"provider":"twilio_verify"` or `"not_production_sms":false` and **no** `development_code`.
EOF