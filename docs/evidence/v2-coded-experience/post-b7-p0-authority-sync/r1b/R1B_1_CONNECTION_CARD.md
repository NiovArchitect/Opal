# R1B.1 Connection Card — Development Build (not Expo Go)

**Do not use Expo Go** for physical SDK 53 iPhone proof.

## Audit result

```text
XCODE_AVAILABLE = YES (15.2)
PHYSICAL_IPHONE_VISIBLE = NO
EXPO_DEV_CLIENT_PRESENT = YES
LOCAL_IOS_DEV_BUILD_POSSIBLE = NO  (0 code-signing identities)
APPLE_SIGNING_STATE = MISSING_LOCAL_IDENTITIES
EAS_REQUIRED = YES
SELECTED_R1B_PHYSICAL_IOS_PATH = EAS_DEVELOPMENT_BUILD
EXPO_GO_PHYSICAL_IOS_SDK53 = NO
```

Expo account already authenticated as **sadeil**.

EAS non-interactive build failed:

> no credentials suitable for internal distribution — run interactively

## Founder action required (one of these)

### Option A — Preferred if you can plug the iPhone into this Mac

1. Unlock iPhone → Trust This Computer.
2. Open **Xcode → Settings → Accounts** → add Apple ID → download certificates (Personal Team OK for development).
3. Reply: **`phone connected signing ready`**

Agent will retry local `npx expo run:ios --device`.

### Option B — EAS cloud development build (no USB required)

In Terminal on this Mac (interactive once):

```bash
cd apps/opal_mobile
npx eas-cli build --platform ios --profile development
```

Complete Apple credential / distribution prompts when asked.  
When EAS prints an install link/QR, open it **on the iPhone** (Safari) to install **Opal Graph** (dev client).

Reply: **`dev build installed`**

Then continue R1B.1 proofs (SMS/OTP → SecureStore → kill/relaunch → Phoenix → revoke).

## Not allowed

Expo Go · TestFlight · App Store · production bundle IDs · SDK upgrade for Expo Go.
