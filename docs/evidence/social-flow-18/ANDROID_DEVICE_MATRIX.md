# Android device matrix — SF18

## Environment at evidence time

| Field | Value |
|-------|--------|
| adb devices | empty / adb not listing devices |
| Physical Android attached | **None** |
| Source commit (mobile) | See HOSTED_AND_DEVICE_PARITY.md |
| Test date | 2026-08-04 |

## Matrix status

| State | Result |
|-------|--------|
| not requested | **BLOCKED** — no device |
| granted | **BLOCKED** — no device |
| denied | **Proven by code contract** (denied UI + product usable) |
| revoked | **BLOCKED** — no device |
| multi-number contact | **Unit/UI path present** |
| no number | filtered out by `contactsWithPhones` |
| manual fallback | **Implemented** |

## Required founder pass

Attach a real Android device with Expo Go or a development client and complete A1.
