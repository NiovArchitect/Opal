# R0 Founder Actions Required

R0 does **not** perform these. They gate later phases.

## Money / accounts

| Action | Gates | Notes |
|--------|-------|-------|
| Twilio account + Verify Service + billing/trial | R1A / B02 | Adapter already built |
| Apple Developer Program | R1B–R7 / push / store | Bundle today `local.opal.mobile` |
| Google Play Console + FCM | R1B–R7 / push / store | |
| TURN / SFU vendor selection + payment | R3 / B04 | EXTERNAL_PROVIDER — founder approval |
| Expo EAS build minutes | R1B+ | Project already exists (`sadeil`) |
| Optional Sentry | R5 / B08 | |
| Optional managed Kafka | R5 / B06 | Not on first-call path |
| Google Places / Ticketmaster keys | R6 | Optional for RC spine |

## Physical

| Action | Gates |
|--------|-------|
| ≥2 real phones (iOS and/or Android) | R1B proof onward |
| 2 real SIMs for OTP | R1A |
| Quiet network for WebRTC A/B test | R3 |

## Legal / scope decisions

| Decision | Effect |
|----------|--------|
| Enable `production_sms` on public host | R1A |
| Claim Calls audio (and video?) in Store listing | Elevates R3/R4 to hard P0 for submission |
| Launch without Calls (Grok must not invent) | FOUNDER_SCOPE_DECISION only |
| Privacy Policy / Terms URLs final | R7 |
| ATT / tracking posture | R7 |

## Explicit GO tokens required

`GO R1A` · `GO R1B` · `GO R2` · `GO R3` · `GO R4` · `GO R5` · `GO R6` · `GO R7` · `GO STORE_SUBMISSION`

One approval ≠ blank check.
