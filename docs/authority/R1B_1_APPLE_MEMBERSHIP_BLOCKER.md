# R1B.1 Blocker — Apple Developer Membership (ASC still expired)

**Date:** 2026-09-08  
**HEAD:** `07ca8ea`+  
**Retry after founder payment:** YES — still blocked by App Store Connect API

## What succeeded on retry

```text
APPLE_LOGIN = GREEN (restored local session)
APPLE_TEAM = Sadeil Lewis (59PGUJR963)
DEVICE_REGISTRATION_URL_ISSUED = YES
  https://expo.dev/register-device/7eb88434-80bb-44cd-9f84-c4c75483b2ec
```

## What still fails

```text
failure_class = APPLE_DEVELOPER_MEMBERSHIP_EXPIRED
  (App Store Connect API message unchanged after founder payment)

BUNDLE_IDENTIFIER_LINK (local.opal.mobile) = FAILED
EAS_IOS_DEVELOPMENT_BUILD = BLOCKED
```

ASC also reports:

- Agreement updates that must be resolved  
- EU DSA trader status reminder (secondary)

## Likely causes (not Opal code)

1. Renewal payment not yet fully activated in App Store Connect  
2. Account Holder has not accepted the **new Paid Applications / Developer agreements** after renewal  
3. Propagation delay (can take minutes to hours)  
4. Renewal applied to a different Apple ID than the one EAS uses (`lewissadeil@gmail.com` team)

## Exact founder checks

1. https://developer.apple.com/account → **Membership** shows **Active** with a future expiration date  
2. https://appstoreconnect.apple.com → **Agreements, Tax, and Banking** → accept all pending agreements  
3. Confirm the Account Holder Apple ID matches the team used in EAS (Sadeil Lewis)  
4. Optional now: open device registration on the iPhone  
   `https://expo.dev/register-device/7eb88434-80bb-44cd-9f84-c4c75483b2ec`  
5. Reply: **`asc active`** when Membership is Active **and** agreements are clear  

Agent will immediately re-run EAS development build (no Expo Go, no SDK upgrade).

## Held

No auto-purchase · no Expo Go · no TestFlight · no R3/TURN/push · no merge/live  
