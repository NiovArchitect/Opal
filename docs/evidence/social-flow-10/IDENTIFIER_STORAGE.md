# SF10 Identifier Storage and Lookup

## Normalization
Client may format; Elixir authoritatively normalizes to E.164 (`+1…` for US fixture range).

## Lookup digest
`HMAC-SHA256(server_pepper, e164)` hex — used for match keys. Pepper is development-only.

## Secure ref
Base64 sealed synthetic reference for provider-adjacent use — **not** placed in audit/logs.

## Storage
- `communication_identifiers.lookup_digest` unique  
- `secure_ref` for sealed recovery of synthetic fixture only  
- No raw E.164 in audit payloads, PubSub topics, or ordinary events  

## Deletion / reassignment
Status lifecycle: unverified → active → reassignment_suspected / quarantined / detached / replaced.  
Ownership reviews required; no automatic history grant.

## Key rotation
Documented residual: production requires rotatable pepper + re-digest migration plan.

## Residual risk
Compromise of pepper + digests enables offline match against known number lists. Mitigate with HSM, rate limits, and non-user privacy policy in production.
