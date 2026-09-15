# STOP — INSTALLED OPAL APP DOES NOT SHOW 012cc73 (NOT PROVEN)

**Date:** 2026-09-14  
**Branch:** `build/v2-coded-experience-closure`  
**CODE_HEAD:** `012cc73a311840634aae015b86b05d1a99fe0603`  
**FOUNDER_DEVICE_ON_012cc73:** **UNKNOWN / NOT PROVEN**

## Verdict

A GitHub push of `012cc73` is **not** physical-device proof.

This agent cannot assert the founder iPhone is running `012cc73`.

No UI work should continue until founder is physically on that bundle.

## Delivery architecture (why push ≠ device)

Opal mobile is an **Expo native shell + WebView** to `opal_web`.

| Layer | Source of pixels founder sees for chrome closeout |
|-------|-----------------------------------------------------|
| Native shell | EAS-installed app (`local.opal.mobile`) |
| Product UI (Home/Search/Stories/Center chrome) | **WebView → `EXPO_PUBLIC_OPAL_WEB_URL`** |

`012cc73` changes are **web-only** (`apps/opal_web/*` + docs). They do **not** ship via native binary alone.

### Profiles (`apps/opal_mobile`)

| Profile | `productWebUrl` / env | How 012cc73 reaches device |
|---------|----------------------|----------------------------|
| `development` (eas.json) | `http://192.168.86.156:5173` (baked at build) | LAN Vite must serve **this worktree at HEAD 012cc73**; kill/relaunch WebView/app |
| `internal_rc` | `https://app.opal.niovlabs.com` | **Redeploy** hosted web to that origin with SHA 012cc73 |
| OTA / `expo-updates` | **Not configured** | No Updates channel; `eas update` is not a valid path today |

## Evidence collected this stop

| Check | Result |
|-------|--------|
| Local git HEAD | `012cc73` on `build/v2-coded-experience-closure` |
| `012cc73` contents | Web chrome only (no `apps/opal_mobile` code in that commit) |
| `expo-updates` / runtimeVersion / channel | **Absent** from `app.json` / `package.json` / `eas.json` |
| EAS CLI on agent | **Not available** (`eas` missing; cannot list builds or prove install SHA) |
| Last documented EAS iOS build (R1B evidence) | `48f3a513-9056-469a-8e9a-4e60bdd3835b` — **pre-dates** 012cc73 closeout |
| Hosted `app.opal.niovlabs.com` SHA | **Not proven** (no reliable SHA header from agent probe) |
| LAN Vite on `192.168.86.156:5173` | **Process is running from this worktree** (`…/opal-grok-real-people/apps/opal_web`); source serves `gsh-chrome-plane` (012cc73 marker) |
| Founder WebView loading that LAN URL | **NOT PROVEN** — native shell may be baked to another URL / offline LAN / cached document |

## What must happen next (operator)

### Path A — Development client (LAN WebView) — most likely for chrome iteration

1. On the Mac that owns `192.168.86.156` (or update env to current LAN IP):
   ```bash
   cd apps/opal_web
   git checkout build/v2-coded-experience-closure
   git rev-parse HEAD   # must print 012cc73…
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
2. Confirm phone and Mac share LAN; open `http://<lan-ip>:5173` in phone Safari once.
3. Force-quit Opal Graph on iPhone → relaunch (WebView reload).
4. Founder proof gate: Home deep-scroll shows **persistent** profile+search+notifications+Stories together (012cc73 hierarchy). If Stories alone sticky / top chrome still scrolls away → **not** on 012cc73.

### Path B — Internal RC pointing at hosted web

1. Deploy `opal_web` @ `012cc73` to `https://app.opal.niovlabs.com`.
2. Record deploy SHA in release notes.
3. Force-quit / relaunch app (or clear WebView cache if sticky).
4. Same physical gate as Path A.

### Path C — Native-only changes (AppIcon from `d8f6fd9`)

App icon requires **EAS rebuild + reinstall** (not WebView). Chrome hierarchy at `012cc73` does not.

```bash
cd apps/opal_mobile
npx eas-cli login
npx eas-cli build --profile development --platform ios
# install from EAS page on founder device
```

Bake the correct `EXPO_PUBLIC_OPAL_WEB_URL` for the intended Path A or B.

## Required founder-device proof checklist

Before any further UI tranche:

- [ ] Installed app name / version / build number noted  
- [ ] Profile known: development vs internal_rc  
- [ ] Web URL the WebView loads noted  
- [ ] That URL’s bundle SHA = `012cc73` (deploy or Vite HEAD)  
- [ ] Physical gate: Home chrome plane persists as one unit  

Until then:

```text
CODE_HEAD = 012cc73
FOUNDER_DEVICE_ON_012cc73 = UNKNOWN / NOT PROVEN
STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = GET 012cc73 ON FOUNDER DEVICE, THEN HOLD FOR PHYSICAL RETEST
```

**No UI modifications in this stop.**

**STOP.**
