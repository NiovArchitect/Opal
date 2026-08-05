# WRITE_CONTACTS review (SF18)

## Finding

`expo-contacts` config plugin hardcodes:

- `android.permission.READ_CONTACTS`
- `android.permission.WRITE_CONTACTS`

Opal Social Flow 18 product path only **reads** local contacts for user selection and submits **selected identifiers** only. Writing to the address book is **not** a SF18 requirement.

## Fix (source)

Added `apps/opal_mobile/plugins/withReadOnlyContacts.js` using Expo `withBlockedPermissions` to block `WRITE_CONTACTS`, applied after `expo-contacts` in `app.json`.

Also removed explicit WRITE entries from `android.permissions`.

## Status

| Check | Result |
|-------|--------|
| Plugin added | PASS (source) |
| Unit tests | PASS |
| Rebuilt APK with fix | **NOT RUN** (next `internal_rc` rebuild after merge) |
| Current standalone APK still may declare WRITE | true until rebuild |

## Classification

Privacy minimization defect in plugin defaults — **bounded fix applied in source**; rebuild required for runtime confirmation.
