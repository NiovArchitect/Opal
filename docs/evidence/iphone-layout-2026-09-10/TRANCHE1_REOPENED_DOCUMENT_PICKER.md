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
