# P0 Fix 1 — Voice

## Code fixes
- Removed false "Mic blocked" from iOS Permissions API / getUserMedia preflight.
- Native host uses expo-speech-recognition + expo-speech (lazy-required).
- Pre-rebuild hosts: honest unavailable copy; Safari Web Speech path works without rebuild.

## Verify
- vitest 26/26 (chat + voice)
- mediaBridge jest includes speech plugins

## Founder device
1. **Same day (no rebuild):** open `http://<LAN>:5173/?opal_native_host=1` in **Safari** → Talk to Opal → mic → speak → toggle speaker ON.
2. **Native Expo app:** requires rebuild (buildNumber 3) with expo-speech-recognition linked — then mic uses Speech framework.
