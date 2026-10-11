# Paste W9 Phase 5 — TestFlight production EAS

Checked: **2026-10-10 / 2026-10-11**  
Worktree tip: `81276ef8`  
Expo project: `@sadeil/opal-mobile` (`de17c8b3-074e-4656-980d-e16fc10bbda4`)  
Account: `sadeil@niovlabs.com` (logged in; `eas whoami` → `sadeil`)

## 5a — Config audit

| Check | Result | Evidence |
|-------|--------|----------|
| Founder icon `apps/opal_mobile/assets/icon.png` | **PASS** | 1024×1024 PNG, RGB, `hasAlpha: no`. Wired as `expo.icon`, `ios.icon`, splash image, Android adaptive foreground. |
| Version / build sane | **PASS** | `app.json` + `profiles.ts`: **0.13.0** / build **5**. |
| Production profile URLs (no LAN/dev) | **PASS** | `eas.json` `production.env`: `https://api.opal.niovlabs.com`, `wss://api.opal.niovlabs.com/socket`, `https://app.opal.niovlabs.com`. Profile id `production_placeholder`. |
| Debug / DevAuth off in production | **PASS** | `profiles.ts` `production_placeholder`: `debugMenu: false`, `devAuthEnabled: false`, `allowsLocalhost: false`, `loggingLevel: "error"`. `assertProfileSafe` → `[]`. |
| Store distribution + push | **PASS** | `eas.json` `distribution: store`. `app.config.js` keeps `expo-notifications` + `remote-notification` when profile is `production` / `production_placeholder`. |
| `.easignore` present | **PASS** | Root + `apps/opal_mobile/.easignore` exclude `node_modules`, `_build`, `deps`, `shots/`, etc. |

**Config audit: PASS**

## 5b — EAS production build

| Field | Value |
|-------|--------|
| Command | `npx eas-cli build --profile production --platform ios --non-interactive --no-wait` (cwd `apps/opal_mobile`) |
| Build status | **FINISHED** |
| Build ID | `7213e09f-5b2d-4129-a99a-72e3cdd48b1d` |
| Logs | https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/7213e09f-5b2d-4129-a99a-72e3cdd48b1d |
| Profile / distribution | `production` / `store` |
| Version / build number | `0.13.0` / `5` |
| Commit | `81276ef8b472cdb12b9aa09d9a060885e9c2a4e4` |
| Artifact IPA | https://expo.dev/artifacts/eas/DFWIEOL2oxIABL-so6mft7NhqzfSKrMpZUPokQGxpYY.ipa |
| Finished at (UTC) | 2026-10-11T02:45:19.644Z |
| Credentials | Dist cert serial `15C2F411…` expires **2027-09-08**; provisioning `XTUZUQF95B` active. |

### Download

```bash
cd apps/opal_mobile
npx eas-cli build:download --id 7213e09f-5b2d-4129-a99a-72e3cdd48b1d --platform ios
```

## 5c — TestFlight upload + install smoke

| Step | Status | Notes |
|------|--------|-------|
| Upload IPA to App Store Connect | **GATED** | Founder procedure (`docs/TESTFLIGHT_UPLOAD.md`). Agent has no `EXPO_ASC_*` / ASC API key. Transporter or `eas submit` needs Apple interactive / ASC key. |
| Install from TestFlight on founder device | **GATED** | Depends on upload + processing. |
| Smoke: cold launch | **GATED** | Needs install. |
| Smoke: splash choice | **GATED** | Needs install. |
| Smoke: OTP | **GATED** | Needs install. Also: production API currently **503 Service Suspended** (`curl https://api.opal.niovlabs.com/health`). |
| Smoke: onboarding order | **GATED** | Needs install. |
| Smoke: Opal Center | **GATED** | Needs install. |
| Smoke: one call | **GATED** | Needs install + second device for truthful call (see W9 P1). |
| Smoke: one push | **GATED** | Needs install + notifications (see W9 P2). |

## Production API note

Observed **2026-10-11**: `https://api.opal.niovlabs.com/health` → HTTP **503** body "This service has been suspended." Local Phoenix on tip `81276ef8` is healthy (`production_sms`). TestFlight binary will talk to the suspended host until production is restored.

## Summary

| Item | Status |
|------|--------|
| Config audit | **PASS** |
| EAS production build | **PASS** — Finished; IPA URL recorded |
| TestFlight upload | **GATED** (founder ASC / Transporter) |
| Device smoke | **GATED** (no install; prod API 503) |
| Secrets | None printed |
