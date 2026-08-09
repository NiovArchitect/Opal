# Real Connectors Campaign

Branch: `build/real-connectors`  
Base: main after PR #66 merge  

## Doctrine

> Providers establish facts. Opal establishes relevance. Humans establish social authority.

`calendar_free` ≠ `willing` ≠ `share` ≠ `Set` ≠ `booked`

## Connectors

| # | Connector | Implementation | Live credential? |
|---|-----------|----------------|------------------|
| 1 | Calendar free/busy | GoogleAdapter + Composite + FreeBusyStore | OAuth env vars |
| 2 | Location/travel | ApproximateStore + TravelProvider (haversine) | Optional maps key |
| 3 | Device execution | Executor (calendar event, reminder, nav) | Platform later |
| 4 | Places | Catalog + DecisionCompression | Fixture catalog |
| 5 | Booking | Booking.Executor + ProviderBoundary | Provider stub |

## Credentials required for production Google calendar

```
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
OPAL_PROVIDER_TOKEN_SECRET
```

Scope: `https://www.googleapis.com/auth/calendar.freebusy` only.

## Step audit (effort reduction)

See `StepAudit.connector_audits/0` — all connectors reduce effort vs manual baselines.

## Visual freeze

No CSS / Primary UX / navigation changes. Connector HTTP is status/OAuth only.
