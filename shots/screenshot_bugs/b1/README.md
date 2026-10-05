# Screenshot bug 1 — Zero Coming soon on Feed & discovery + Privacy & audience

## Proof
- `01_privacy_audience.png` / `02_feed_discovery.png` — live nested settings
- `VERIFY.json` — `coming_soon: 0` on both screens
- `youSettingsComingSoon.guard.test.ts` + `youSettingsRender.proof.test.tsx` — 5/5

## Notes
Fix 4 already replaced Coming soon with blockedReason on these screens.
This commit locks the regression (guard + render proof + browser shots) and
cleans the last comment that still named the banned label.
