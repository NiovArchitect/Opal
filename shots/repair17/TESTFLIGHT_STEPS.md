# TestFlight — founder-only steps (Repair #17, Worker 7)

PREP ONLY was done from the repo. No EAS build was run, no Apple / EAS / Expo
account was touched, no login was attempted. Everything below the
"Already prepared" line is yours alone to do, in order.

## The one hard truth first

A TestFlight build **cannot log in today**, no matter how it is built:

- The `production` / `testflight` EAS profiles point the app at
  `https://api.opal.niovlabs.com` (HTTP), `wss://api.opal.niovlabs.com/socket`
  (realtime) and `https://app.opal.niovlabs.com` (the WebView first-run
  surface). The prod API host is **SUSPENDED (503 "Service Suspended")** —
  login against it fails until the host is restored.
- Your working surface (Mac LAN, `192.168.86.156`) is only reachable from
  devices on your own Wi-Fi. A TestFlight build installed on any device
  outside that network cannot reach it, and Apple's reviewers / external
  testers are never on your LAN. The `development` EAS profile's LAN URLs
  are therefore **not** a TestFlight option.
- So the order of operations is not optional: **restore the prod host
  first**, then build, then upload. A build uploaded before the host is
  restored will install fine and then fail at login.

## Already prepared (repo-side, verified in Repair #17 W7)

- [x] `apps/opal_mobile/app.json` — name "Opal Graph", slug `opal-mobile`,
      version `0.13.0`, iOS buildNumber `5`, bundle id `local.opal.mobile`
      (same value as the Android package), owner `sadeil`,
      EAS projectId `de17c8b3-074e-4656-980d-e16fc10bbda4` present in
      `extra.eas`.
- [x] Icon + native splash wired to `./assets/icon.png`, which is
      byte-identical (md5 `5aa26865370876710e45c8c30aed3850`) to canon
      `shots/brand/opal-app-icon.png`.
- [x] `expo-notifications` plugin now declared statically in `app.json`
      (this was the 1 pre-existing mobile test failure). `app.config.js`
      still strips it — plus the `remote-notification` background mode —
      for non-production profiles (the AdHoc signing workaround), and a
      production-profile evaluation adds it exactly once. Effective config
      is unchanged in both branches; proof in `TRACK_W7_SPLASH_TESTFLIGHT.md`.
- [x] New EAS profile `testflight` in `apps/opal_mobile/eas.json`
      (`extends: production`, store distribution, device build). The API
      base-URL choice is an EAS-profile env choice
      (`EXPO_PUBLIC_OPAL_HTTP_URL` / `EXPO_PUBLIC_OPAL_WS_URL` /
      `EXPO_PUBLIC_OPAL_WEB_URL` / `EXPO_PUBLIC_OPAL_PROFILE`), read by
      `apps/opal_mobile/src/config.ts` over the defaults in
      `src/release/profiles.ts`. Switching targets is a config change,
      never a code change.
- [x] Mobile test suite: 105/105 pass after the plugin fix (baseline was
      104/105 with exactly that one failure).
- [x] Splash 1 aligned to the canon logo lockup (see track report).

## Blocks, in the order they must clear

1. **Prod host restore (yours — hosting account).** `api.opal.niovlabs.com`
   returns 503 "Service Suspended". Restore / unsuspend the host and confirm
   `https://api.opal.niovlabs.com` answers, and that
   `https://app.opal.niovlabs.com` serves the web build (the native shell
   loads its entire first-run surface from the web URL — if the web host
   is down, the TestFlight app opens to a dead WebView even with the API
   up). Nothing below this line works until this clears.
2. **Bundle id decision (yours — Apple Developer account).** The repo
   bundle id is `local.opal.mobile`. If that exact id is not registered
   to your Apple Developer account / App Store Connect app, either
   register it or change `ios.bundleIdentifier` (and `android.package`)
   in `app.json` to the registered id **before** building — changing it
   after a first upload creates a second, wrong app record.
3. **Build number bump (yours, each upload).** App Store Connect rejects a
   re-upload of the same build number. Current: version `0.13.0`, build
   `5` (`app.json` `ios.buildNumber` + `extra.buildNumber`, mirrored in
   `src/release/profiles.ts` — keep all three in sync; `eas.json` uses
   `appVersionSource: local`, so EAS will not bump it for you).
4. **EAS / Apple credentials (yours).** EAS login, Apple ID sign-in during
   build/submit, and any App Store Connect API key are account actions no
   one else can do for you.

## Founder-only steps, in order

Run these on your Mac, from the repo root of your working checkout, after
Block 1 (host restored) and Block 2 (bundle id settled) above:

```bash
# 0. Get this branch's state (after this repair merges to your build branch)
#    - app.json plugin fix, eas.json "testflight" profile, splash-1 canon fix.

# 1. Install / update EAS CLI and log in (your Expo account: owner "sadeil")
npm install -g eas-cli
eas login
eas whoami

# 2. (Only if you changed the bundle id in Block 2) let EAS register it
#    with your Apple account when prompted during the build below.

# 3. Build the TestFlight binary (production endpoints, push entitlement on)
cd apps/opal_mobile
eas build --platform ios --profile testflight

# 4. When the build finishes, submit it to App Store Connect / TestFlight
eas submit --platform ios --profile production --latest

# 5. Apple-side taps (App Store Connect, your account):
#    - Open the app record -> TestFlight tab -> wait for the build to
#      finish "Processing" (Apple-side, usually minutes to ~an hour).
#    - Answer the export-compliance prompt (the app already declares
#      ITSAppUsesNonExemptEncryption=false in app.json, so "No" /
#      no exempt encryption documentation should be required).
#    - Add yourself (and any internal testers) to Internal Testing and
#      confirm the build is assigned to that group.
#    - Install via the TestFlight app on your iPhone and open it.

# 6. Acceptance check on the phone:
#    - Native splash -> Splash 1 shows the canon Opal logo lockup.
#    - Continue -> Splash 2 (Promise): exactly ONE live "Enter Opal"
#      button below the baked art (the baked one is cropped/masked out).
#    - "Enter Opal" -> phone auth -> OTP -> Home. If login fails here,
#      the prod host (Block 1) is not actually restored - check the host
#      before suspecting the build.
```

## What NOT to do

- Do not build with `--profile development` for TestFlight: it bakes in
  your Mac's LAN IP (`192.168.86.156`), which no device off your Wi-Fi
  can reach, and it strips the push entitlement.
- Do not paste real API keys anywhere for this: the build needs none —
  endpoints are public URLs baked via the EAS profile env above.
- Do not merge or push anything as part of these steps; merging stays
  your separate decision, as always.
