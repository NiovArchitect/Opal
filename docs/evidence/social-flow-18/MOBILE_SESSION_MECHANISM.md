# Mobile session mechanism (SF18)

## Authority

Server-side `DeviceSession` via product activation API.

## Client storage

| Item | Storage |
|------|---------|
| access token | expo-secure-store (`opal.product.access_token`) |
| user id / display name | expo-secure-store |
| Node unit tests | in-memory map fallback |

Not used for tokens: ordinary AsyncStorage.

## Lifecycle

1. Cold start → `restoreSession()` loads secure token → `GET /api/v1/product/session`
2. If valid → shell with real `userId` / `displayName`
3. If invalid → clear secure keys → ActivationScreen
4. Activation → synthetic challenge/verify with `include_bearer: true`
5. Sign-out → `DELETE /api/v1/product/session` + clear secure keys

## Explicit non-goals

- No DevAuth product path on hosted profile
- No fixed Alex/Jordan UUIDs as the product identity
- SYNTHETIC constants remain for older unit fixtures only
