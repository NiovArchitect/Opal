# Internal Release Candidate Runbook (SF12)

## Profiles
- `development` — localhost, DevAuth on  
- `test` — CI  
- `internal_rc` — staging hosts, DevAuth **off**, no debug menu  
- `production_placeholder` — config only  

## Pre-flight
1. `assertProfileSafe(internal_rc)` empty  
2. mix test product_readiness  
3. jest releaseReadiness  
4. Secret scan CI job green  
5. No localhost in RC endpoints  

## Deploy (synthetic staging)
1. Build mobile with `EXPO_PUBLIC_OPAL_PROFILE=internal_rc`  
2. Deploy Elixir with synthetic providers  
3. Smoke: sign-in fixture → Home → Chat → Plan → You  
4. Verify block composer + offline banner  

## Rollback
1. Redeploy previous main artifact SHA  
2. Do not run forward-only destructive migrations without backup  
3. Confirm clients still negotiate schema_version  

## Limitations
Not App Store submission. Not production telecom. Physical device farm incomplete.
