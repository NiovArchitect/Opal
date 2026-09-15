# STOP — NATIVE OPAL APP IS NOT LOADING THE SAME WEB TARGET AS SAFARI

**Date:** 2026-09-14  
**WEB_UI_AUTHORITY:** `012cc73`  
**REPO_HEAD:** `c0c89c8` (+ diagnostic native inject below)  
**No product UI redesign.**

## Founder physical facts (accepted)

| Gate | Result |
|------|--------|
| LAN_CONNECTIVITY | GREEN |
| VITE_012cc73 | GREEN (`gsh-chrome-plane` served from this worktree on `:5173`) |
| FOUNDER_DEVICE_CAN_REACH_LAN_WEB | YES (Safari → `http://192.168.86.156:5173`) |
| Native app shows same UI as Safari | **NO** |

Therefore the failure is **native WebView target / bake**, not LAN and not missing git push.

## How the URL is resolved (code truth)

```text
PRODUCT_WEB_URL =
  process.env.EXPO_PUBLIC_OPAL_WEB_URL
  ?? profile.productWebUrl
```

Used by:

- `ProductWebSurface` → `${PRODUCT_WEB_URL}/?opal_native_host=1`
- `NativeFirstRunSurface` → `${PRODUCT_WEB_URL}/?opal_native_host=1&opal_reset_first_run=1`

There is **no runtime settings screen**, **no OTA (`expo-updates`)**, and **no post-install override**.  
`EXPO_PUBLIC_*` is **bake-time** (EAS embed or Metro inline). **Force-quit cannot change it.**

### Profile candidates (config only — not proof of installed binary)

| If installed profile were… | RESOLVED_WEBVIEW_URL would be… |
|----------------------------|--------------------------------|
| `development` EAS env (`eas.json`) | `http://192.168.86.156:5173/?opal_native_host=1` |
| `development` without `EXPO_PUBLIC_OPAL_WEB_URL` | `http://127.0.0.1:5173/...` (**broken on device**) |
| `internal_rc` | `https://app.opal.niovlabs.com/?opal_native_host=1` |

`.env.local` on this machine matches LAN development URLs — relevant only if Metro serves a fresh JS bundle.

## Runtime / Metro evidence

| Check | Result |
|-------|--------|
| Expo Metro on `:8081` | Running |
| Metro can produce iOS AppEntry bundle | **FAIL** — `expo-asset` ENOENT TransformError |
| Implication | Development client likely **cannot** load live Metro JS; uses **embedded EAS JS** with whatever URL was baked at build time |

Agent **cannot** read the founder phone’s embedded env.  
`INSTALLED_BUILD_PROFILE` and on-device `RESOLVED_WEBVIEW_URL` remain **not proven from the device itself**.

## Required STOP fields

```text
INSTALLED_BUILD_PROFILE = UNKNOWN (not readable without device / EAS build record for this install)
RESOLVED_WEBVIEW_URL = UNKNOWN_ON_DEVICE
  candidates:
    development+eas.env → http://192.168.86.156:5173/?opal_native_host=1
    development+fallback → http://127.0.0.1:5173/?opal_native_host=1
    internal_rc → https://app.opal.niovlabs.com/?opal_native_host=1
EXPECTED_WEBVIEW_URL = http://192.168.86.156:5173/?opal_native_host=1
  (same target Safari already proves for 012cc73)
URL_MATCH = NO (founder physical: Safari ≠ installed app UI)
LAN_REACHABLE_FROM_IPHONE = YES
NATIVE_APP_RENDERING_012cc73 = NO
NEW_EAS_BUILD_REQUIRED = YES
REASON =
  WebView URL is bake-time EXPO_PUBLIC_OPAL_WEB_URL.
  Safari proves LAN 012cc73; installed app does not render it.
  Metro JS reload path is currently broken (expo-asset ENOENT),
  so the installed binary cannot be assumed to pick up .env.local live.
  A new development EAS build with
    EXPO_PUBLIC_OPAL_WEB_URL=http://192.168.86.156:5173
  is required so the native shell binds to the same target Safari uses.
  If the install is actually internal_rc, do NOT point it at LAN —
  deploy 012cc73 to https://app.opal.niovlabs.com instead.
```

## Operator path (development — match Safari)

```bash
cd apps/opal_mobile
# eas.json development already has EXPO_PUBLIC_OPAL_WEB_URL=http://192.168.86.156:5173
npx eas-cli login
npx eas-cli build --profile development --platform ios
# Install from EAS page on founder iPhone
# Keep Vite: apps/opal_web on 012cc73 at 0.0.0.0:5173
# Force-quit → relaunch → confirm Home persistent chrome plane
```

### After install — prove URL without product UI

Diagnostic (non-UI) now in shell inject:

- `window.__OPAL_HOST_WEB_URL__`
- `document.documentElement.getAttribute('data-opal-host-web-url')`
- `sessionStorage.opal_host_web_url`

Founder/Safari Web Inspector on the **app WebView** (not Safari tab) should read:

`http://192.168.86.156:5173`

## Flags

```text
STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = GET NATIVE OPAL APP RENDERING THE SAME 012cc73 WEB BUNDLE THE IPHONE ALREADY PROVES IN SAFARI
```

**STOP.**
