# REPORT A — SOCIAL FLOW 18 DEVICE CLOSURE

**Date:** 2026-08-03  
**Track:** A only  
**Repository:** Opal  
**Source commit (main base):** `32de3c4`  
**Work branch:** `ops/sf18-eas-and-knowledge-docs`  
**Hosted API:** https://api.opal.niovlabs.com  
**Hosted web:** https://opal.niovlabs.com  

## Status

**SOCIAL FLOW 18 PARTIALLY COMPLETE**

Physical iOS and Android permission, native dual-device realtime, background/foreground recovery, and assistive-tech matrices remain **open**.  
This report does **not** close Social Flow 18.

## What is accepted (not device substitutes)

- Real mobile product-session code path and secure-store persistence  
- No fixed Alex/Jordan product identity  
- Find People from empty Chats and from You  
- Selected-only contact submission contracts; unselected count = 0  
- Manual fallback; opaque share token; honest `sms_sent: false`  
- Authoritative invitation → acceptance → relationship → conversation → first social moment  
- Dynamic “Becoming a plan” / “Still open” signals; quiet-conversation path  
- User C isolation; Social Flow 17 realtime architecture on hosted web  
- PR #38 merged on main  
- EAS development profiles prepared (`apps/opal_mobile/eas.json`)  
- Permission strings and expo-contacts plugin configured  

## What remains unproven (required for closure)

| Gate | Evidence required | This session |
|------|-------------------|--------------|
| Physical iOS contact permissions | Real device grant/deny/limited | Blocked |
| Physical Android contact permissions | Real device READ_CONTACTS | Blocked (no adb) |
| Native dual-device realtime | Two physical apps | Blocked |
| BG/FG recovery | Device sleep/wake | Blocked |
| VoiceOver / TalkBack | Assistive tech pass | Blocked |
| Full device persona matrix | Founder walkthrough | Blocked |

## Environment honesty

| Tool | Status |
|------|--------|
| Xcode 15.2 | Present |
| Usable iOS Simulator runtime | Not available |
| Physical iPhone/iPad | Not attached |
| adb / Android device | Not present |
| EAS login / signed install | Not performed by agent |

## Explicit non-claims

- Jest did not close SF18  
- Browser automation did not close SF18  
- API requests alone did not close SF18  
- Simulated permission objects did not close SF18  
- Code review / docs did not close SF18  

## Track separation

Track B (foundation) and Track C (knowledge Phase 0) are **not** dependencies of Social Flow 18.  
SF18 closes only on real human journeys on actual devices.

## Next human steps (founder)

1. `cd apps/opal_mobile && npx eas-cli login`  
2. `npx eas build --profile development --platform ios` and install on a physical iPhone  
3. Same for Android APK; install on a physical Android device  
4. Run contact permission matrix (deny / grant / limited where applicable)  
5. Dual-device invite → accept → conversation → first moment  
6. BG/FG session recovery and VoiceOver/TalkBack smoke  
7. Attach screenshots/logs under `docs/evidence/social-flow-18/` and only then update closure language  

## Conclusion (Track A only)

**Ready for device install and human matrix.**  
**Not closed.**
