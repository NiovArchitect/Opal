# R1B.1 Blocker — Apple Developer Membership Expired

**Date:** 2026-09-08  
**HEAD:** `c0a82de` (evidence follow-up)  
**Path:** EAS iOS development build  
**Expo account:** sadeil (authenticated)

## What succeeded

```text
APPLE_LOGIN = GREEN
APPLE_2FA = GREEN
APPLE_TEAM_SELECTED = YES (Sadeil Lewis)
```

Password/2FA were entered only in the local Terminal / Apple flow — **not** stored in git evidence.

## What failed

```text
failure_class = APPLE_DEVELOPER_MEMBERSHIP_EXPIRED
EAS_IOS_DEVELOPMENT_BUILD = BLOCKED
BUNDLE_IDENTIFIER_LINK = FAILED (local.opal.mobile)
```

App Store Connect message (paraphrased):

> Developer Program Membership Expired — apps removed from the App Store until a user with the Account Holder role renews membership on the Apple Developer website.

Secondary ASC notes (not the primary R1B blocker, but present):

- EU Digital Services Act trader status reminder  
- Agreement updates pending in App Store Connect  

## Classification

This is **not**:

- an Opal code defect  
- an Expo SDK 53 conflict requiring upgrade  
- an Expo Go issue (already closed)  
- a reason to purchase TURN / start R3  

This **is**:

```text
FOUNDER_ACTION_REQUIRED = APPLE_DEVELOPER_MEMBERSHIP_RENEWAL
```

Account Holder renews at: https://developer.apple.com/account  
Renewal docs: https://developer.apple.com/support/renewal/

**Do not auto-purchase.** Agent must not buy membership.

## After renewal

Reply: **`apple membership renewed`**

Agent will:

1. Re-run EAS device registration if needed  
2. Re-run `eas build --platform ios --profile development`  
3. Continue R1B.1 physical install + identity proofs  

## Held

No Expo Go · no SDK upgrade · no TestFlight · no App Store submit · no R3/TURN/push · no merge/live  
