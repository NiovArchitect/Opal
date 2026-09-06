# P4.6 Release Blocker Map

**HEAD base:** `939b8ea` · **STORE_READY = NO** (expected)

| Category | Class | Blocker? |
|----------|-------|----------|
| Web SPA product | PARTIAL (deployable web) | Web ≠ App Store |
| Expo native `local.opal.mobile` | PARTIAL internal RC only | **YES** for store binary |
| Production EAS / store assets | NOT_BUILT | **YES** |
| Production SMS (Twilio) | DEPENDENCY; synthetic default | **YES** for phone auth ship |
| Apple / Google Sign-In | NOT_BUILT | Maybe if 3P login claimed |
| APNs / FCM push | NOT_BUILT | **YES** if push/calls claimed |
| WebRTC / TURN / CallKit | NOT_BUILT | **YES** if Calls AV claimed |
| Production Kafka | NOT_DEPLOYED | **YES** if multi-service fanout claimed |
| Local Redpanda | LOCAL_REAL GREEN | Not a store yes |
| OSM Overpass | REAL_EXTERNAL when connected | Discovery only — not booking |
| Google Places / Ticketmaster | DEPENDENCY | Coverage gap |
| Live reservation inventory | NOT_BUILT | If “book” claimed |
| Store privacy nutrition / ATT | NOT_BUILT | **YES** native |
| Sentry / prod observability | NOT_BUILT | **YES** |
| Deep links / universal links | PARTIAL helpers only | **YES** native |
| Background location | NOT_BUILT (intentional) | OK if not claimed |
| IAP / payments | NOT_BUILT | OK if unpaid MVP |
| Postgres TLS verify_none in prod runtime | PARTIAL risk | Security review flag |
| Global Opal → DI product path | DEFECT at start of P4.6 | P4 coherence (surgical) |

## Law

`P4_COMPLETE` may be YES while this map remains NO for Store. Do not blur.
