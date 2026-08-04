# iOS build path for physical SF18 validation

## Package versions (main)

| Component | Version |
|-----------|---------|
| Expo SDK | ~53.0.0 |
| React Native | 0.79.2 |
| expo-contacts | ~14.2.0 |
| expo-secure-store | ~14.2.0 |
| phoenix | ^1.7.21 |
| Bundle id | `local.opal.mobile` |
| NSContactsUsageDescription | present |

## Recommended path

**EAS / Expo development build** (required for full `expo-contacts` + SecureStore behavior; do not assume Expo Go covers every native path).

```bash
cd apps/opal_mobile
npx expo install expo-dev-client
# founder-operated:
# npx eas-cli login
# npx eas build --profile development --platform ios
```

## This operator environment

| Check | Result |
|-------|--------|
| Xcode | 15.2 |
| iOS Simulator disk images | **0 installed** |
| Physical iPhone | **not attached** |
| eas CLI | not installed globally |
| adb | not available |

Physical matrix remains founder-device or requires installing an iOS simulator runtime + development client.

## Expo Go caveat

`expo-contacts` limited-access and Contact Access Button behavior may require a **development build**, not Expo Go alone. Document the installation method used in device evidence.
