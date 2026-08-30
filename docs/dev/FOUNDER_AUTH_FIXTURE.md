# Founder auth fixture (local / review only)

**Not production. Not a secret. Deterministic local/test data.**

Authority: `apps/opal_web/src/api/productClient.ts` → `FOUNDER_AUTH_FIXTURE`
+ `APPROVED_PREVIEW_FIXTURES[0]`.

## Identity

| Field | Value |
|-------|--------|
| E.164 | `+12025550101` |
| Dial | `+1` |
| National | `2025550101` |
| OTP | `111111` |
| Source | `APPROVED_PREVIEW_FIXTURES[0]` / historical mobile ActivationScreen |
| Normalization | `normalizePhoneInput(national, dial)` → same production E.164 path |

## Behavior when `?opal_founder_seed=1`

1. Phone screen preloads national number + dial + consent checked.
2. Continue uses production E.164 path → `startChallenge` → Verify.
3. OTP is autofilled into the code field (no "Preview code" product chrome).
4. OTP is also logged as `[OPAL_DEV_OTP]` in the browser console / harness only.
5. Verify uses real `verifyChallenge` → legitimate preview session → Profile (fr08).
6. Skip for now runs fixture rotation (`+12025550101` / `0102` / `0103`) through
   the same startChallenge + verifyChallenge path, then Profile — no Splash dead-end.

## Where OTP is surfaced

| Surface | Allowed |
|---------|---------|
| Product UI ("Preview code") | **NO** |
| Verify input autofill (founder seed only) | YES |
| `console.info("[OPAL_DEV_OTP]", …)` | YES |
| Tests / evidence JSON | YES |

## Founder skip semantics

| Mode | Skip for now |
|------|----------------|
| `opal_founder_seed=1` | Continues walk via real OTP fixture path → Profile |
| Production / no founder seed | Does **not** create guest auth; shows "Phone verification is required to continue." |

No guest-account product domain in this pass.

## Production firewall

| Leak | Policy | Required |
|------|--------|----------|
| Preloaded number | founder seed only | `FOUNDER_PRELOADED_NUMBER_PRODUCTION_LEAK = 0` |
| Deterministic OTP autofill | founder seed only | `FOUNDER_DETERMINISTIC_OTP_PRODUCTION_LEAK = 0` |
| Skip auth bypass | founder seed only | `FOUNDER_SKIP_AUTH_BYPASS_PRODUCTION_LEAK = 0` |
| Fixture identity | local/test only | `FOUNDER_AUTH_FIXTURE_PRODUCTION_LEAK = 0` |
| Preview code label | never in product UI | always |

## International support

Founder fixture does **not** force a US-only product path. Country selector and E.164
normalization remain for `+52`, `+44`, `+63`, etc. The founder number is one valid
E.164 identity under those same rules.

## Regression tests

`apps/opal_web/src/onboarding/founderAuthRestore.test.ts`

- FOUNDER_PHONE_FIXTURE_NORMALIZES_E164
- FOUNDER_PHONE_CONTINUE_SUCCEEDS
- FOUNDER_OTP_VERIFY_SUCCEEDS
- FOUNDER_PHONE_TO_PROFILE_FLOW_SUCCEEDS
- FOUNDER_SKIP_FOR_NOW_NOT_DEAD
- FOUNDER_SKIP_DOES_NOT_CREATE_PRODUCTION_AUTH
- INTERNATIONAL_PHONE_STILL_SUPPORTED
- PREVIEW_OTP_NOT_RENDERED_IN_PRODUCT_UI
