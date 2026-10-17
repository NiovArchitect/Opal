# Repair #17 — Track W7: Splash canon + TestFlight preparation

Branch: `muse/repair-17-w7` at R16 tip `2c1bdcd2`. PREP ONLY — no EAS
build was run, no Apple/EAS/Expo account action was attempted, no logins.
Committed to the branch, not pushed.

---

## Part A — Splash 1 wordmark vs brand canon

### Canon (committed at `shots/brand/`)

| Asset | Meaning | Size |
|---|---|---|
| `opal-logo.png` | character + bubble-letter "Opal" lockup — THE logo | 1125×750 RGBA |
| `opal-wordmark.png` | bubble-letter wordmark only | 1125×375 RGBA |
| `opal-character.png` | character only (a character-sheet crop) | 512×512 RGB |
| `opal-center-mark.png` | O-swirl + crystal ears, Center tab | 1125×1125 RGBA |
| `opal-app-icon.png` | app icon | 1024×1024 RGB |

Runtime copies in `apps/opal_web/public/brand/` are byte-identical to
canon for wordmark / character / center-mark / app-icon (md5-verified).
`public/brand/opal-logo.png` differs in file bytes only: pixel diff vs
canon is 2.85% of pixels, confined to the big-O ring counter, which the
runtime copy has punched to transparent alpha (Repair #11 commits
880780a2 / 974beda2 "punch alpha into lockup big-O ring counter") where
canon carries an opaque white counter. Same artwork, same letterforms;
no asset swap was made or needed.

### Audit — every first surface, before

1. **Native OS splash** (`apps/opal_mobile/app.json` splash +
   `app.config.js` lines 71-76): image `./assets/icon.png`, `contain`,
   on `#050816`. `assets/icon.png` is md5-identical to canon
   `shots/brand/opal-app-icon.png` (`5aa26865370876710e45c8c30aed3850`).
   No text, correct canon icon. **No change.**
2. **Web Splash 1, production path** (`apps/opal_web/src/OpalApp.tsx`
   ~L8160 mounts `FirstRunSplashPage`;
   `src/onboarding/FirstRunSplashPage.tsx`): painted ONLY
   `BRAND_ASSETS.opalCharacter` (210×210, `data-brand-source=
   "opal-character"`). That asset is a character-sheet crop — it carries
   stray partial text fragments from the sheet at its edges (partial
   "…al" top-left, "ove." / "ether." at the sides) and **no canon logo
   text at all**. This is the splash-1 logo-text defect the founder
   reported: the only "logo text" on the first screen was crop debris,
   not the canon bubble-letter "Opal".
3. **Web Splash 1, nested fr00 path**
   (`src/onboarding/FirstRunExperience.tsx` fr00 block): identical
   character-only identity. Same defect.
4. **Web Splash 2 / Promise** (`src/onboarding/FirstRunPromisePage.tsx`):
   baked canonical PNG `opal-promise-exact-941x1672.png` (SHA-256
   `20c5210f…a2ddcf10`, verified on disk), its baked CTA strip
   cropped/masked (`first-run-promise-clip` + `opal-promise-cta-mask`),
   exactly one live "Enter Opal" + one live "I already have an
   account" below the art. **Boundary law held before and after; no
   change to this surface.**

### Change — Splash 1 aligned to canon

Both Splash 1 render paths now paint the single canon logo lockup:

- `FirstRunSplashPage.tsx`: `SPLASH_IDENTITY_SRC` =
  `` `${BRAND_ASSETS.opalLogo}?v=repair17-canon-lockup` ``; img
  300×200 (the lockup's native 3:2), `data-brand-role="logo-lockup"`,
  `data-brand-source="opal-logo"`, `data-splash-identity=
  "opal-logo-lockup"`, wrapper class `fr-splash-mark-logo`, img class
  `fr-splash-logo-lockup` (CSS rule already existed at
  `src/styles.css` ~L6823; no CSS change needed).
- `FirstRunExperience.tsx` fr00: same asset, same data attributes.

This is ONE canon asset — not a composed character+wordmark collage
(the composition law stands: `data-splash-logo-count="1"`,
`data-double-composition="0"` unchanged), not a font/rendered-text
substitute, and the separate wordmark is NOT paired with it (brand.ts
asset law). Auth chrome (`BrandChrome`) and the OTP header keep the
character identity — untouched, they are not Splash 1.

Old law superseded: "character-only splash identity" (Founder Reality
Repair #2) is amended by the founder's Repair #17 statement that the
splash-1 logo text was wrong. `founderSplashVisibility.test.ts` was
updated to pin the new law (same file, same assertions, identity
swapped); all other assertions in it are unchanged.

### New/extended pinning tests

`src/onboarding/splashCanonLockup.test.ts` (new, 6 tests, all pass):

- `BRAND_ASSETS.opalLogo` = `/brand/opal-logo.png`; runtime + canon
  files exist and are non-trivial.
- Splash 1 top-level: exactly one `<img`, the lockup; no
  `opalCharacter`, no `OpalWordmark`, no `fr-splash-wordmark`.
- Nested fr00: same lockup, no character, no wordmark.
- Splash 1 (both paths): zero occurrences of "Enter Opal".
- Promise: exactly one live `opal-promise-enter` and one live
  `opal-promise-already` testid; each label renders exactly once.
- Promise baked-CTA mask + clip present; canonical PNG + SHA pinned.

### Side effect (lawful, verified)

`s1Adversarial.test.ts > "no old opposing-arcs mark in first-run
source"` was one of the 25 pre-existing web failures: it requires
`FirstRunExperience.tsx` to reference `opalLogo|opalGraphEmblem|160`,
and the character-only fr00 contained none (grep count 0 at base). The
canon alignment supplies the `opalLogo` reference, so this test now
passes. Web failing set is therefore baseline-minus-one, never worse.

---

## Part B — TestFlight preparation

Founder-facing step sheet: `shots/repair17/TESTFLIGHT_STEPS.md`.

### 1. EAS / app config audit (`apps/opal_mobile`)

Verified ready:

- `app.json`: name "Opal Graph", slug `opal-mobile`, version `0.13.0`,
  iOS `buildNumber` "5", bundleIdentifier `local.opal.mobile` (=
  Android package), owner `sadeil`, `extra.eas.projectId`
  `de17c8b3-074e-4656-980d-e16fc10bbda4`, `ITSAppUsesNonExemptEncryption:
  false`, all usage-description strings present.
- Icon + native splash → `./assets/icon.png` = canon app icon
  (md5-verified above).
- `eas.json`: CLI ≥12, `appVersionSource: local`; profiles development
  (LAN), development_simulator, internal_rc, production (store).
- **FIXED — expo-notifications plugin wiring** (the known pre-existing
  mobile failure): the plugin was declared only dynamically in
  `app.config.js` (production only), so `app.json` — and the test that
  reads it — showed none. The plugin entry (same options app.config.js
  used: icon `./assets/icon.png`, color `#A78BFA`, mode production) is
  now declared statically in `app.json`. `app.config.js` still strips
  it + `remote-notification` for non-production profiles (AdHoc signing
  workaround intact). Proof of zero effective-config change, by
  evaluating `app.config.js` before/after semantics per profile:
  unset/development → plugin absent, background modes
  `audio,voip,fetch`; production → plugin present exactly once,
  background modes `audio,voip,fetch,remote-notification`. Identical
  in both states.
- **ADDED — `testflight` EAS profile** (`extends: production`, store
  distribution, device build) so the founder's build command is a
  profile choice: `eas build --platform ios --profile testflight`.

Flags for the founder (not repo-fixable): bundle id `local.opal.mobile`
must be registered to his Apple account or changed before building;
build number must be bumped per upload (local version source — EAS
won't); EAS/Apple logins are his.

### 2. API base-URL strategy — how it works today, honestly

Mechanism (no code change needed to switch): `src/config.ts` reads
`EXPO_PUBLIC_OPAL_HTTP_URL` / `EXPO_PUBLIC_OPAL_WS_URL` /
`EXPO_PUBLIC_OPAL_WEB_URL` / `EXPO_PUBLIC_OPAL_PROFILE` (baked at build
time from the EAS profile's `env`), falling back to
`src/release/profiles.ts` defaults per profile.

| Build | HTTP | WS | Web (first-run surface) | Reachable from TestFlight? |
|---|---|---|---|---|
| `development` | `http://192.168.86.156:4000` | `ws://192.168.86.156:4000/socket` | `http://192.168.86.156:5173` | **No** — Mac LAN only; dead off his Wi-Fi, and push entitlement is stripped in this profile |
| `production` / `testflight` (extends production) | `https://api.opal.niovlabs.com` | `wss://api.opal.niovlabs.com/socket` | `https://app.opal.niovlabs.com` | URLs are public, **but the API host is SUSPENDED (503)** — installs fine, login fails until the founder restores the host; the web host must also serve, since the native shell's whole first-run is a WebView of the web URL |
| `internal_rc` | prod URLs (profile defaults) | prod | prod | Same 503 blocker |

There is no third option in the repo: no staging/public tunnel host is
configured. Precisely what the founder must restore/decide (in order):
(1) unsuspend/restore `api.opal.niovlabs.com` and confirm
`app.opal.niovlabs.com` serves; (2) settle the bundle id; (3) bump the
build number per upload. Full ordered steps are in
`TESTFLIGHT_STEPS.md`.

### 3. Test results

- **Mobile** (`jest`, 22 suites): baseline 105 tests, **1 failure**
  (`pushTokenBridge > app.json declares expo-notifications plugin`) —
  reproduced exactly before the fix. After: **105/105 pass, 22/22
  suites.** The pre-existing failure is resolved lawfully (see §B.1),
  not by editing the test — the test file is untouched.
- **Web** (vitest): baseline **25 failed / 1138 passed / 1163 total,
  153 files** (reproduced before any web edit; splash-adjacent failures
  were exactly `firstRun.test.ts` em-dash copy + the `s1Adversarial`
  opposing-arcs test). After: **24 failed / 1145 passed / 1169 total,
  154 files** (the +6 are the new `splashCanonLockup` tests, all
  passing). The only delta vs baseline is the opposing-arcs failure
  resolved in §A; every remaining failure is in a file this track did
  not touch (`activation`, `availability`, `designTokens`,
  `firstRun` em-dash, `opalUi/*`, `theme/*`), and every splash-adjacent
  suite (`founderSplashVisibility`, `splashCanonLockup`,
  `promisePresentation710`, `splashAuthPreservation`, `figmaAlignment`,
  `brand/*`, `s1Adversarial`) passes.

### Environment notes

- `node_modules` were absent in this worktree; test runs used a symlink
  to the repair-16 worktree's installed modules (same lockfiles at the
  R16 tip). Symlinks are untracked/gitignored and not part of the
  commit.
- One mobile run failed a suite with ENOSPC: `/tmp` is a 512M tmpfs
  that was 100% full (466M held by `/tmp/r17-baseline`, another
  track's artifact — left untouched). Re-runs with
  `TMPDIR=/home/hatch/r17w7-tmp` are fully green; the ENOSPC was
  environmental, not a test result.

## Files changed

- `apps/opal_web/src/onboarding/FirstRunSplashPage.tsx` — canon lockup
- `apps/opal_web/src/onboarding/FirstRunExperience.tsx` — fr00 lockup
- `apps/opal_web/src/onboarding/founderSplashVisibility.test.ts` — law updated
- `apps/opal_web/src/onboarding/splashCanonLockup.test.ts` — NEW pinning tests
- `apps/opal_mobile/app.json` — expo-notifications declared statically
- `apps/opal_mobile/eas.json` — `testflight` profile added
- `shots/repair17/TESTFLIGHT_STEPS.md` — NEW founder step sheet
- `shots/repair17/TRACK_W7_SPLASH_TESTFLIGHT.md` — this report
