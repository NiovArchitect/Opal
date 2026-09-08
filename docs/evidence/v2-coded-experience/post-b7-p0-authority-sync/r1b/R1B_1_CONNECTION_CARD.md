# R1B.1 — Device registered; build still blocked by ASC

## Good news
Your **iPhone is registered** with Apple team Sadeil Lewis (EAS `device:list` shows Class=iPhone).

## Still blocked
EAS cannot create/link bundle id `local.opal.mobile` because App Store Connect still returns:

**Developer Program Membership Expired**

(plus “agreement updates that must be resolved”)

So we do **not** yet have an Opal Graph `.ipa` to install — unless you installed something else.

## Please confirm both

1. https://developer.apple.com/account → Membership = **Active** (screenshot for yourself; don’t send secrets)  
2. https://appstoreconnect.apple.com/agreements → accept **all pending** agreements  

Then reply exactly one of:

- **`asc active`** — membership Active + agreements clear → agent retries EAS build  
- **`dev build installed`** — if Opal Graph (dev client) is already on the home screen (not Expo Go, not only the registration profile)

## Optional clarity
If “on iphone” meant only the **device registration / development profile** page completed — that is expected and good. The **Opal Graph app build** still needs ASC Active.
