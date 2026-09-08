# R1B.1 Device Runtime Path

**Date:** 2026-09-08  
**Foundation HEAD:** `03f8fd0`  
**LAN host (dev only):** private `192.168.86.0/24` (exact IP not committed)

## Dependency facts

| Module | In app | Expo Go |
|--------|--------|---------|
| `expo-secure-store` | YES | YES (bundled) |
| `react-native-webview` | YES | YES (supported in Expo Go for SDK 53) |
| `expo-contacts` | declared | YES; **not exercised** in R1B.1 product surface |
| `expo-sqlite` | declared | YES; not required for host WebView path |
| `expo-dev-client` | dependency | not imported by App entry |
| `./plugins/withReadOnlyContacts.js` | YES | **ignored by Expo Go** (config plugin; OK for this proof) |

## Classification

```text
EXPO_GO_COMPATIBLE = YES
  (for R1B.1 host proof: Activation + SecureStore + WebView product)
  Notes: custom Android WRITE_CONTACTS block plugin will not apply in Expo Go —
  acceptable because R1B.1 does not open contacts.

DEVELOPMENT_BUILD_REQUIRED = NO for first physical host proof
EAS_BUILD_REQUIRED = NO for first physical host proof

EAS_CLI_AVAILABLE = via npx (not global)
EAS_REQUIRED_FOR_THIS_PROOF = NO
```

## Chosen path

**A. Expo Go + LAN-reachable Vite/Phoenix**

Cheapest legitimate physical path. Escalate to development build only if Expo Go rejects WebView/SecureStore at runtime.

## Endpoint variable names (no values committed)

Mobile (Expo):

- `EXPO_PUBLIC_OPAL_WEB_URL`
- `EXPO_PUBLIC_OPAL_HTTP_URL`
- `EXPO_PUBLIC_OPAL_WS_URL`
- `EXPO_PUBLIC_OPAL_PROFILE`

Web (Vite):

- `VITE_OPAL_API_URL`
- `VITE_OPAL_SOCKET_URL` (optional; defaults to API)

Stored only in gitignored `.env.local` / process env for device bring-up.
