# Tranche #1 REOPENED — ExpoDocumentPicker missing at runtime

**Authority:** Founder physical screenshots supersede prior PHYSICAL_GREEN.

## Observed
- `Cannot find native module 'ExpoDocumentPicker'`
- Downstream: `App entry not found` / main not registered

## Correction
- `TRANCHE_1_COMPLETE = REOPENED / RED`
- `IOS_DOCUMENT_PICKER_PHYSICAL = RED`
- `NATIVE_LAUNCH_REGRESSION = 1`
- `TRANCHE_2_STARTED = NO` (paused)

## Remediation
1. Lazy-require image/document pickers so missing native modules cannot crash app registration.
2. Set `ios.buildNumber` / distinguish binary as **2** (not reuse EAS build number 1).
3. Clean EAS `development` rebuild with `--clear-cache`.
4. Founder: uninstall old Dev Client → install build 2 → Metro :8081 → retest Camera/Library/Document.

## Replacement build (in progress / queued)

| Field | Value |
|---|---|
| NEW_BUILD_SHA | `272b81f` |
| NEW_EAS_BUILD_ID | `58954d64-b757-4126-ae22-d2a673a38e36` |
| NEW_BUILD_NUMBER | `2` (`ios.buildNumber`) |
| Clear cache | YES (`eas build --clear-cache`) |
| Lazy import hardening | YES (`OPTIONAL_NATIVE_MODULE_STARTUP_CRASH` target = 0) |
| Build page | https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/58954d64-b757-4126-ae22-d2a673a38e36 |

### Founder install steps
1. Delete previous Opal Graph Development Build from iPhone.
2. Install **build 2** from the Expo build page above.
3. Confirm Settings → General → About / app shows build **2** (not 1).
4. Connect Expo launcher to Metro `http://192.168.86.156:8081` (not Vite :5173).
5. Confirm boot without ExpoDocumentPicker red screen.
6. Retest Story Camera / Library / Center Document.
