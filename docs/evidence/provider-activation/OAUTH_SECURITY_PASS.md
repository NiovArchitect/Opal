# OAuth Security Pass — Pre-Credential Gate

Branch: `build/provider-activation`  
Date: 2026-08-09

## Findings addressed

| Requirement | Implementation |
|-------------|----------------|
| Signed unforgeable state | `OAuthState` via `Phoenix.Token` |
| Short-lived | max_age 600s |
| Single-use | `OAuthNonceStore` jti consume |
| Bound to user | payload `uid` match on verify |
| Optional session bind | `sid` mismatch → reject |
| PKCE S256 | challenge on authorize URL; verifier on exchange |
| Token vault AES-GCM | unique 12B nonce + tag |
| Fail closed prod secret | runtime raise if OAuth configured without vault secret |
| Weak secret rejected | `validate_secret/1` |
| No tokens in JSON | public_status always nil |
| Revocation clears ciphertext | `ProviderConnections.revoke/2` |
| Manual fallback intact | oauth errors return `manual_availability_works: true` |

## Not yet live

Real Google OAuth against production accounts — **blocked only on founder credentials** after this pass.

## Tests

`oauth_security_test.exs` covers forge/replay/user mismatch/expiry/session/PKCE/vault/revoke/aggregation/trace.
