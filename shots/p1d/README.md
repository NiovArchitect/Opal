# Phase 1D — consent API + "What Opal can do for you"

## Backend
- `GET/POST /api/v1/product/consents`, `DELETE /api/v1/product/consents/:id`
- Product capabilities only: `calls_outbound`, `bookings_reserve`, `messaging_business`
- `expires_at` required on grant; foreign revoke → 404

## FE
- You hub section below Account (component in `YouSettingsDestination.tsx`)
- Rows reuse `you-settings-row` / `you-settings-toggle`
- `messaging_business`: Coming soon + disabled toggle (execution ABSENT)

## Evidence
- `mix_test.log` — consent API 4/4
- `fe_test.log` — 6/6
- `a8_surface_regression.log` — 13/13
- `before_*/after_grant_*/after_revoke_*` @ 390/430
- curl samples: `p1d_*.json`
