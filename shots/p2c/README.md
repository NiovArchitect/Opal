# Phase 2C — Expo push tokens (working notifications, zero credentials)

## What shipped
- Mobile: `expo-notifications` ~0.31 (Expo SDK 53; paste said ~16.0 — wrong major for this SDK)
- Host → FE: `opal_push_token` inject after auth (permission denied → silent)
- FE: listen + POST `/api/v1/product/devices/tokens` once (localStorage dedupe)
- BE: `OpalCore.Push.Adapters.Expo` + Sender routes `ExponentPushToken[` → Expo

## Live Expo probe (autonomous)
Bad token → Expo ticket error (contract proof, no crash):

```
DeviceNotRegistered — "ExponentPushToken[p2c-probe-not-a-real-device]" is not a valid Expo push token
```

See `expo_probe.json` + `expo_live_adapter.log`.

## Founder walk (1 check)
On Expo Dev Client (rebuild required for native module):
1. Sign in → grant notification permission
2. Confirm token POSTs (API stores ios + ExponentPushToken[…])
3. Trigger urgent attention → report ticket id or verbatim error

## Tests
- BE push suite 20/20; A8 surface 13/13
- Mobile pushTokenBridge 9/9; FE nativeHostPushToken 5/5

HEAD: e6ba29e
GREEN: true
