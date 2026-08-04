# Android build path for physical SF18 validation

## Package / config

| Item | Value |
|------|--------|
| package | `local.opal.mobile` |
| READ_CONTACTS | declared in app.json |
| expo-contacts | ~14.2.0 |

## Recommended path

```bash
cd apps/opal_mobile
npx eas build --profile development --platform android
# or local:
# npx expo run:android
```

## This operator environment

| Check | Result |
|-------|--------|
| adb | not found |
| Physical Android | none listed |

Android physical matrix remains founder-device until a device is attached.
