# STOP — EXPO DEV CLIENT IS WAITING FOR METRO (NOT VITE)

**Date:** 2026-09-14  
**No product UI changes.**

## Architecture (corrected)

```text
iPhone Expo Development Build
  → Metro :8081  (React Native JS)
    → Opal native shell
      → WebView
        → PRODUCT_WEB_URL
          → http://192.168.86.156:5173/?opal_native_host=1  (Vite / 012cc73)
```

**Do not** type `http://192.168.86.156:5173` into Expo’s “Enter URL manually.”  
That field is for **Metro**, not Vite. “Failed to open app” is expected when 5173 is entered there.

## Repair performed

| Issue | Fix |
|-------|-----|
| Metro `expo-asset` ENOENT under `expo/node_modules/expo-asset` | Symlink `node_modules/expo/node_modules/expo-asset` → `../../expo-asset` |
| Persist repair | `scripts/ensure-expo-asset-link.sh` + `package.json` `postinstall` / `start:dev-client` |
| Metro restarted | `npx expo start --dev-client --lan --port 8081 --clear` with `.env.local` loaded |

## Proofs this agent can give

| Gate | Result |
|------|--------|
| METRO_EXPO_ASSET_ENOENT | **FIXED** (symlink + clean start) |
| METRO_HEALTHY | **GREEN** — `packager-status:running`; iOS AppEntry bundled (~4.8MB, 700 modules) |
| EXPO_PUBLIC_OPAL_WEB_URL in Metro bundle | **`http://192.168.86.156:5173`** (inlined) |
| EXPO_PUBLIC_OPAL_PROFILE in Metro bundle | **`development`** |
| EXPECTED_WEBVIEW_URL | `http://192.168.86.156:5173/?opal_native_host=1` |
| VITE_012cc73 | **GREEN** (unchanged; Safari already proved) |
| EXPO_DEV_CLIENT_DISCOVERS_METRO | **PENDING FOUNDER** (must pick `:8081`, not `:5173`) |
| EXPO_DEV_CLIENT_TO_METRO | **PENDING FOUNDER** |
| OPAL_NATIVE_SHELL_LOADED | **PENDING FOUNDER** |
| RESOLVED_WEBVIEW_URL | **PENDING FOUNDER** (after shell load: `window.__OPAL_HOST_WEB_URL__`) |
| URL_MATCH | **PENDING FOUNDER** |
| NATIVE_APP_RENDERING_012cc73 | **PENDING FOUNDER** |
| NEW_EAS_BUILD_REQUIRED | **NO** (withdrawn for this path; existing Dev Client + healthy Metro) |

## Founder steps (now)

1. Keep Vite: `http://192.168.86.156:5173`  
2. Metro is running: **`http://192.168.86.156:8081`**  
3. On iPhone Expo Development Build launcher:  
   - Use **Fetch development servers**, or  
   - Enter URL manually: **`http://192.168.86.156:8081`** (NOT 5173)  
4. Opal native shell should launch.  
5. WebView should load Vite automatically.  
6. Proof: Home deep-scroll → profile + search + notifications + Stories stay as one plane.  
7. Optional: Web Inspector → `window.__OPAL_HOST_WEB_URL__` === `http://192.168.86.156:5173`

## Flags

```text
STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = GET EXISTING EXPO DEVELOPMENT CLIENT THROUGH HEALTHY METRO INTO OPAL SHELL, THEN PROVE WEBVIEW → 5173
```

**STOP.**
