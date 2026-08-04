# Hosted and device parity ledger

| Field | Value |
|-------|--------|
| main commit | `52cbc3c` (+ Track A session commit when merged) |
| API host | `https://api.opal.niovlabs.com` |
| API image | `ghcr.io/niovarchitect/opal-api-runtime:sf18-outbox-52cbc3c` |
| API digest | `sha256:e7709e5d428ca8efbc7c03a18c4c27ac1c5ff5947e47dae6ce5f5006723f8834` |
| Web | `https://opal.niovlabs.com` |
| Web asset | `assets/index-BpudI8sy.js` |
| Fixture-only | true |
| DevAuth | false |
| Kafka operational | false |
| Outbox | local adapter (bridge only; not foundation) |
| iOS device | none attached |
| Android device | none attached |

## Hosted dual-participant proof (web browsers)

Executed against live API without printing secrets:

- User A activation: pass
- User B activation: pass
- Invitation create: `waiting_for_them`, `sms_sent=false`, share token present
- People summary: no follower counts
- Cookies: Secure + HttpOnly + SameSite=Lax on api.opal

Full dual-browser realtime A↔B was proven in SF17 and remains architecturally live; re-run on devices still required for SF18 mobile closure.
