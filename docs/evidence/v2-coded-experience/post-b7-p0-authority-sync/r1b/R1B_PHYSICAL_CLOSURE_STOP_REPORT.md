# R1B Physical Closure — STOP REPORT

**Date:** 2026-09-09  
**Branch:** `build/v2-coded-experience-closure`  
**Scope:** Native shell foundation on physical iPhone (Expo secure host + current web product WebView)

## Authority

```text
R1B_AUTHORIZED = YES
R1B_COMPLETE = YES  (native_shell_foundation_physical_ios_proof ONLY)
STORE_READY = NO
R3_FORMALLY_AUTHORIZED = NO
```

## Proof matrix

| Gate | Result | Evidence |
|------|--------|----------|
| EAS iOS development build install | GREEN | build `48f3a513-9056-469a-8e9a-4e60bdd3835b` |
| ExpoAsset runtime boot | GREEN | corrected native deps; redbox cleared |
| Activation SMS/OTP (Twilio) | GREEN | challenge `c298b7e6-…` → session `48e95cf0-…` |
| SecureStore kill/relaunch | GREEN | founder + GET `/session` 200 |
| Native Phoenix `socket_ticket` | GREEN | CONNECTED `client_version=opal-mobile-r1b-0.1.0` |
| Sign-out / server revoke | GREEN | DELETE → `status=revoked` |
| Revoked socket denied | GREEN | REFUSED CONNECTION UserSocket |
| Cold-start after revoke → activation | GREEN | founder `revoke green` |
| Product surface = current Opal WebView | GREEN | not stale AppShell |

## Defects closed this path

1. Expo Go physical iOS SDK 53 impossible → EAS development build  
2. Apple membership / ASC Agree  
3. Missing `ExpoAsset` native module → direct deps + rebuild  
4. Phone-pad covering CTA → KeyboardAvoidingView / Done accessory  
5. Verify omitted `phone` → false `invalid_code` → resubmit phone  
6. Native host did not call Phoenix → wired `connectSocketWithSession` in `App.tsx`

## Explicitly NOT claimed

- Production App Store / TestFlight  
- Production bundle IDs (remain `local.opal.mobile`)  
- R2 / R3 / TURN / push / merge / live  
- Action Plane implementation  
- Broad connectors  
- Fixture people as real social graph  

## Next controlled square

Per Muse-response compression: Solo Opal value + one Action Plane vertical **after** this R1B foundation — not a breadth race. No automatic R2/R3.

## STOP

Physical native shell proven for R1B scope. Commit. Push. Stop.
