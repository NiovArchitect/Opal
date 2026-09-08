# R1B Secure Storage Architecture

**Framework:** Expo → `expo-secure-store`  
**iOS:** Keychain  
**Android:** Keystore-backed encrypted shared preferences (Expo SecureStore)

## What is stored

| Key | Content |
|-----|---------|
| `opal.product.access_token` | Bearer session token |
| `opal.product.user_id` | User id |
| `opal.product.display_name` | Display name |
| `opal.product.handle` | Optional handle |
| `opal.product.session_id` | Optional session id |

## What must never be stored on device

- Twilio Auth Token  
- Verify Service secrets  
- Phone lookup pepper  
- DATABASE_URL  
- OTP codes  
- Founder fixtures as identity

## Authority model

```text
SecureStore = cache
Server DeviceSession = truth
```

On launch: read token → `GET /api/v1/product/session` → keep or clear.  
On logout/revoke: `DELETE /session` + SecureStore clear.  
Revoked server session cannot be resurrected by local cache.

## Proof obligations

- write / read after process restart  
- clear on logout  
- clear/ignore after server revoke  
- never log credential values  
