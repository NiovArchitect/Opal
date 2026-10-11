# Paste W9 Phase 2 — Push verification (APNs production / TestFlight path)

- **Tip:** `81276ef8`
- **Proved (UTC):** 2026-10-11T02:48:00Z
- **Rule:** Physical device screenshot required for PASS. Agent has 0 iPhones. Do not present lab/synthetic as device delivery.

## Verdict

| Gate | Status | Why |
|------|--------|-----|
| APNs / Expo production push arrives on physical device | **GATED** | Needs TestFlight (or production) install with push entitlement + registered Expo token. AdHoc #5 strips `aps-environment`. IPA for store build #5 is Finished (see `shots/appstore/W9_TESTFLIGHT.md`) but **not yet uploaded / installed**. |
| Quiet hours respected | **GATED** (code **PASS**) | `AttentionBudget.in_quiet_hours?/2` now reads `AssistancePreference` quiet window (W9 product fix). Full mix suite **2177 / 0 failures** includes AttentionBudget / reminder quiet-hours coverage. No device screenshot of a suppressed quiet-hours push. |
| Urgent breaks through quiet hours | **GATED** (code **PASS**) | Priority / urgency path exists in AttentionBudget + DeliverPushWorker. Not walked on a locked physical device. |

**Overall:** **GATED** — production push path is credential-ready (APNs key assigned to `local.opal.mobile` post-EAS) and code/tier rules are mix-green; physical receipt + tier screenshots are founder walks after TestFlight install.

## What is proven without a device

| Item | Evidence |
|------|----------|
| Expo adapter contract | Prior Phase 2C probe: invalid `ExponentPushToken[…]` → `DeviceNotRegistered` (ticket path live) |
| Device token API | `POST/DELETE /api/v1/product/devices/tokens` · platforms ios/android · Expo token discriminator |
| Native host bridge | `apps/opal_mobile` expo-notifications + `opal_push_token` inject → FE register |
| Production profile keeps push | `eas.json` production / `app.config.js` keeps `expo-notifications` + `remote-notification` for production profiles |
| Quiet-hours product fix | `apps/opal_core/lib/opal_core/intelligence/attention_budget.ex` reads AssistancePreference window |
| Mix green after fix | `shots/walk/W9_P0_BACKEND.json` · 2177 tests, 0 failures |

## Founder ungating path

1. Upload IPA `7213e09f…` → TestFlight (`docs/TESTFLIGHT_UPLOAD.md`).
2. Install on founder iPhone; allow Notifications; complete OTP against a healthy API.
3. Follow `shots/PUSH_VERIFY_CHECKLIST.md` (background app → message from second account → screenshot).
4. Optional: set quiet hours in Assist prefs; send routine vs urgent; screenshot suppression / breakthrough.

## Blockers right now

1. No physical device attached to this agent session.
2. TestFlight upload not executed (ASC / Transporter is founder procedure; no `EXPO_ASC_*` in agent env).
3. Production API `https://api.opal.niovlabs.com/health` returns **503 Service Suspended** (2026-10-11) — TestFlight smoke against prod will fail login until API is restored (LAN + tunnel is an alternate path for Dev Client only; push entitlement still needs store/TestFlight binary).
