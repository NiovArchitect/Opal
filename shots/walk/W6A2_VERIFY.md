# W6 Amendment 2 — Canonical logo + app icon

**Branch:** `muse/packet-b-batch-2`

## Tasks

| Item | Result |
|------|--------|
| `shots/brand/opal-logo.png` → `/brand/opal-logo.png` as THE logo | PASS — `BRAND_ASSETS.opalLogo` + aliases remounted |
| OTP / first-run header uses real logo lockup | PASS — `CharacterLockup` → `opal-logo.png`; `w6a2_otp_logo_dark.png` |
| Web brand PNGs regenerated from opaque icon | PASS — 180 / 512 / 1024 + favicon-32 / favicon-48 / apple-touch |
| iOS icon opaque (no alpha) | PASS — `sips hasAlpha: no`; PNG color type RGB |
| Logo composites on dark with no halo | PASS — true RGBA alpha; OTP dark plate |
| Icon legible at 60px | PASS — `w6a2_icon_60.png` |

## Notes

- Mobile `apps/opal_mobile/assets/icon.png` already replaced by Thaddeus (opaque 1024).
- Favicons in `index.html` point at `/favicon-32.png` and `/brand/favicon-48.png`.
- Manifest icons remounted to new brand paths.
