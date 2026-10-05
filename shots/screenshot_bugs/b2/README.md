# Screenshot bug 2 — Voice red banner root cause

## Root cause (founder phone)
`?opal_native_host=1` made `isSttAvailable()` true even without RN WebView /
Web Speech. Tap → `startNativeSpeechRecognition` hard-failed → red
"Voice input isn't available here — type instead."

## Fix
- `isSttAvailable` only true when Web Speech ctor OR native media bridge exists
- Native unavailable falls through to Web Speech when present
- Bare native-host query never calls the bridge (avoids false red banner)
- Mic disabled pre-tap with honest `VOICE_UNAVAILABLE_COPY` when no path exists

## Verify
- vitest opalCenterVoice + OpalCenterChat (see vitest.log)
