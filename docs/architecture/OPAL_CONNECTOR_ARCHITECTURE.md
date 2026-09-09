# Opal Connector Architecture

**Status:** ARCHITECTURE CURRENT · `BROAD_CONNECTOR_IMPLEMENTATION = HOLD`  
**Critical law:** **Connectors are capabilities, not destinations.**

## Product law

User speaks naturally to Opal. Opal selects capabilities internally.

Wrong:

> I need to open my OpenTable connector.

Right:

> I want somewhere romantic Saturday night, not too expensive.  
> → **Juniper & Ivy · Saturday 7:30 PM** · **Reserve it**

The connector disappears into the intelligence. Settings may expose management; the core experience must not be a tool cabinet.

## Registry fields

```text
connector_id
provider
capabilities
auth_type
scopes
read/write classes
health
last_sync
permission_policy
credential_handle
revoked_at
provider metadata
```

## Launch priority (alignment value only)

**Tier 1:** Calendar · Location/maps/world truth · Dining/reservations · Events · Contacts/invitation pathway when network authority permits · Messaging consequence pathway  

**Tier 2:** Travel · shared payments/costs · additional calendars · mobility  

**Hold:** Peloton · smart-home · Docs/Sheets breadth · generic do-everything agents · anything without proven alignment value  

`MUSE_RESPONSE_BREADTH_RACE = REJECTED`

## Execution mechanisms

| Class | When |
|-------|------|
| First-party / partner API connector | Preferred where available |
| Constrained browser executor | User-authorized web actions when API unavailable |
| Deep-link / human handoff | When automation cannot be done safely/reliably |

Record **exact execution class**. Do not fake execution. Do not claim reservation if only a link opened.

## Messaging channels

Ingress/egress surfaces (app, SMS, WhatsApp, …). Core intelligence is channel-independent.  
WhatsApp is **not** a release blocker. No Meta API assumptions without provider authority.
