# Android physical install handoff (SF18)

**Status:** SOCIAL FLOW 18 PARTIALLY COMPLETE  
**Apple/iOS:** paused  
**Superseded build:** `0736b4fc-…` (pre–WRITE_CONTACTS fix) — do not use for final permission validation  
**Clean build:** `91cc279f-733c-48a0-a789-204351fe7e0c` (from main after PR #43)  
**Local APK:** `/tmp/opal-android/opal-internal-rc-4dadd94.apk`  
**SHA-256:** `5905cd56765f83f16eccc0915592b24c6b789de927141e2db299f11c974482e0`  
**EAS page:** https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/91cc279f-733c-48a0-a789-204351fe7e0c

## Expected product targets

| Item | Value |
|------|--------|
| Package | `local.opal.mobile` |
| Profile | `internal_rc` (standalone APK, no development client) |
| API | `https://api.opal.niovlabs.com` |
| Socket | `wss://api.opal.niovlabs.com/socket` |
| DevAuth | off |

## Install via EAS page

1. Open the clean build page (see `ANDROID_FINAL_APK_PERMISSION_AUDIT.md` once filled).  
2. Download the APK on the phone, or scan the EAS install QR if shown.  
3. Allow install from the browser / file source when Android prompts.  
4. Open **Opal** — it must open the product directly (no Metro / “Select a development server”).

## Install via adb (USB)

```bash
# On Mac (serial not logged in public evidence)
adb devices -l
adb install -r /tmp/opal-android/opal-internal-rc-<short-commit>.apk
adb shell pm path local.opal.mobile
```

If signature conflict against an older Opal test install:

```bash
adb uninstall local.opal.mobile
adb install -r /tmp/opal-android/opal-internal-rc-<short-commit>.apk
```

Do not uninstall unrelated packages.

## Controlled contacts only

Create temporary contacts such as:

- Opal Test One (one number)  
- Opal Test Multiple (two labeled numbers)  
- Opal Test No Phone  
- Opal Test Duplicate  
- Opal Test International  

Do not put ordinary private contacts into evidence.

## After testing

- Uninstall `local.opal.mobile`  
- Remove controlled contacts  
- Do not harvest device data into the repo  

## TalkBack

Settings → Accessibility → TalkBack → On.  
Run the operator matrix in `ANDROID_PHYSICAL_DEVICE_OPERATOR_PACKAGE.md`.

## Emulator note

Intel software-only emulator on this host is **blocked** (did not reach package manager). Prefer a physical Android phone.
