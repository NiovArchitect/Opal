# Social Flow 18 Closure Status

## Decision (2026-08-05)

**SOCIAL FLOW 18 PARTIALLY COMPLETE**  
**CLEAN STANDALONE ANDROID APK BUILT WITH READ-ONLY CONTACT PERMISSIONS**  
**PHYSICAL AND IOS GATES REMAIN OPEN**

### Green (not device substitutes)

- Hosted product foundation (sessions, invite, accept, realtime architecture, etc.)
- EAS project + `internal_rc` standalone profile on main
- PR #43 merged: `withReadOnlyContacts` blocks WRITE_CONTACTS; config assertions
- Clean standalone APK from main `4dadd94`: build `91cc279f-…`
- Packaged manifest: **READ_CONTACTS present, WRITE_CONTACTS absent** (`aapt dump permissions`)
- Emulator stopped; Intel software-only boot failure documented (environment, not APK)
- Apple/iOS credential work not started (paused by founder)

### Still open for closure

- Install clean APK on a **physical Android** phone
- Full Android permission / session / invite / realtime / TalkBack / persona matrix
- Optional residual minimization: SYSTEM_ALERT_WINDOW, legacy external storage
- All iOS physical gates (after “Apple credentials ready”)

