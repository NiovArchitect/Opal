# Phase 1E — onboarding act-on-behalf opt-in

## Design
- New first-run step `fr10` after `fr09`, before app
- Toggles: Place calls / Make reservations (default OFF)
- Continue grants selected (1yr expires_at); Skip grants none
- `messaging_business` not offered

## Evidence
- `fe_test.log` — ActOnBehalf + s1Adversarial + figmaAlignment
- `a8_surface_regression.log` — surface_projection 13/13
- Screenshots `fr10_*` / `after_*` @ 390
- `VERIFY.json`

HEAD: fe40f08
GREEN: true
