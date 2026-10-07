# TestFlight upload — production IPA (founder procedure)

Branch: `muse/packet-b-batch-2`  
Written: **2026-10-07**  
Audience: founder (Apple Developer + App Store Connect access)  
Agent role: procedure only — do **not** run upload from this worktree.

## What you already have

| Fact | Value |
|------|--------|
| Bundle ID | `local.opal.mobile` |
| App display name (Expo) | Opal Graph |
| Expo project | `de17c8b3-074e-4656-980d-e16fc10bbda4` |
| Expo account used for build | `sadeil@niovlabs.com` |
| EAS profile | `production` (`distribution: store`) |
| Production API baked in | `https://api.opal.niovlabs.com` |
| Production WS baked in | `wss://api.opal.niovlabs.com/socket` |
| Production web baked in | `https://app.opal.niovlabs.com` |
| Distribution certificate | Reused; valid until **Sep 2027** |
| Provisioning profile | Freshly created; active |
| APNs key | Generated and assigned to `local.opal.mobile` during EAS build |
| IPA artifact | https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa |

Confirm the production API host answers before expecting the TestFlight app to log in:

```bash
curl -fsS https://api.opal.niovlabs.com/health
```

## Prerequisites on your Mac

1. Apple Developer Program membership active for the team that owns `local.opal.mobile`.
2. An **App Store Connect** app record for bundle ID `local.opal.mobile` (create one if missing: Apps → + → iOS → bundle ID → name it for store listing).
3. **Transporter** from the Mac App Store **or** Xcode command-line tools with `xcrun altool` / `xcrun notarytool` available (Transporter is the simpler path).
4. Apple ID with App Manager / Admin / Account Holder role on that ASC team.
5. Browser session logged into [App Store Connect](https://appstoreconnect.apple.com).

## Step A — Download the IPA

1. Open the artifact URL in a browser while logged into the Expo account that built it:
   ```
   https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa
   ```
2. Save the file somewhere durable, e.g. `~/Downloads/OpalGraph-production.ipa`.
3. Optional integrity check: open the Expo build page for the same artifact and confirm status **Finished** / iOS / profile **production**.

Alternate download from CLI (if `eas-cli` is logged in as `sadeil@niovlabs.com`):

```bash
cd apps/opal_mobile
npx eas-cli build:list --platform ios --limit 5
# note the build ID, then:
npx eas-cli build:download --id <BUILD_ID> --platform ios
```

## Step B — Upload to App Store Connect

### Option 1 — Transporter (recommended)

1. Install **Transporter** from the Mac App Store if needed.
2. Open Transporter → sign in with the Apple ID for the App Store Connect team.
3. Drag `OpalGraph-production.ipa` into Transporter (or **Deliver** → choose file).
4. Click **Deliver**. Wait until status is **Delivered** with no errors.
5. If Transporter reports “No suitable application records were found”, create the ASC app for `local.opal.mobile` first (see Prerequisites), then retry.

### Option 2 — `xcrun altool`

```bash
xcrun altool --upload-app \
  --type ios \
  --file ~/Downloads/OpalGraph-production.ipa \
  --apiKey <ASC_API_KEY_ID> \
  --apiIssuer <ASC_ISSUER_ID>
```

Or with Apple ID (will prompt for app-specific password from https://appleid.apple.com):

```bash
xcrun altool --upload-app \
  --type ios \
  --file ~/Downloads/OpalGraph-production.ipa \
  --username <APPLE_ID_EMAIL> \
  --password "@keychain:AC_PASSWORD"
```

### Option 3 — EAS Submit (optional)

If you prefer Expo to push the same build:

```bash
cd apps/opal_mobile
npx eas-cli submit -p ios --latest --profile production
```

Follow prompts for ASC API key or Apple ID. This still ends in the same App Store Connect processing queue.

## Step C — Wait for processing

1. App Store Connect → **Apps** → your Opal app → **TestFlight**.
2. Under iOS builds, wait until the new build leaves **Processing** (often 5–30 minutes; email when ready).
3. If Apple asks for **Export Compliance**: answer using `ITSAppUsesNonExemptEncryption: false` already set in `apps/opal_mobile/app.json` (standard encryption only / exempt). Complete any missing compliance questions so the build becomes selectable.

## Step D — Enable internal testing

1. Still on **TestFlight** → **Internal Testing**.
2. Create a group if none exists (e.g. “Founder internal”) or open the default **App Store Connect Users** group.
3. Click the build → **Enable** / add the build to the internal group.
4. Internal testers must already be **Users and Access** members of this App Store Connect team (Admin, App Manager, Developer, or Marketing with appropriate app access).

## Step E — Add the founder as an internal tester

1. App Store Connect → **Users and Access** → confirm your Apple ID is on the team.
2. TestFlight → Internal Testing → group → **Testers** → ensure your user is checked.
3. On the iPhone signed into the **same Apple ID**:
   - Install **TestFlight** from the App Store if missing.
   - Open the invite email/notification, or open TestFlight and accept **Opal Graph** / your ASC app name.
   - Install the build.
4. First launch: allow notifications when prompted (required for push verify). Complete phone OTP against production (`https://api.opal.niovlabs.com`).

## Step F — Sanity before calling it done

- [ ] Build appears under TestFlight with a version / build number matching the EAS production IPA.
- [ ] Founder can install from TestFlight without a USB cable or Expo Dev Client.
- [ ] App reaches the production API (login / health-dependent screens load; no LAN host in network failures).
- [ ] Notification permission granted on the device.

Next human procedures after install:

- Push delivery: `shots/PUSH_VERIFY_CHECKLIST.md`
- Tip walk on this build (not Vite/dev client)
- Two-device call matrix (second device)

## Common failures

| Symptom | Likely fix |
|---------|------------|
| Transporter: no application record | Create ASC iOS app with bundle `local.opal.mobile` |
| Build stuck in Processing | Wait; check email for missing compliance / invalid binary |
| TestFlight install fails | Same Apple ID as ASC internal tester; iOS version meets build minimum |
| Login fails after install | Production API down or DNS; `curl https://api.opal.niovlabs.com/health` |
| No push prompts / silent | Reinstall, grant Notifications; then run push checklist |

## Out of scope for this doc

- Merging `muse/packet-b-batch-2` (founder decision)
- Public App Store review submission
- External TestFlight groups / beta review
- Deepgram / Places / Sentry keys
