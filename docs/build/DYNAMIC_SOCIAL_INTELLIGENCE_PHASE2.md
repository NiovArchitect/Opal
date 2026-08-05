# Build slice: Dynamic Social and Experience Intelligence Phase 2

**Status:** Durable conversation context, private participation, correction memory, restraint, conversation-native API  
**Branch:** `build/dynamic-social-intelligence-phase2-persistence`  
**Does not close Social Flow 18.**  
**No live location, providers, payments, bookings, Kafka, or Foundation.**

## Objective

Prove durable intelligence behavior on the Phase 1 dinner scenario:

- context and opportunity persist
- private vs shared participation
- corrections suppress future surfaces
- restraint/cooldown persist
- expiry works
- duplicate evaluation is idempotent
- refresh restores one moment
- quiet conversations stay quiet

## Data model

| Table | Purpose |
|-------|---------|
| `dsi_social_contexts` | Forming context lifecycle |
| `dsi_experience_opportunities` | Surfaced moment + restraint fields |
| `dsi_experience_candidates` | Ranked fixture options |
| `dsi_participation_states` | Private per-user responses |
| `dsi_context_corrections` | Bounded correction memory |

## API

| Method | Path |
|--------|------|
| GET | `/api/v1/product/conversations/:id/opportunity` |
| POST | `.../opportunity/evaluate` |
| POST | `.../opportunity/participation` |
| POST | `.../opportunity/correction` |
| POST | `.../opportunity/dismiss` |

## Closure language (when gates green)

> OPAL DYNAMIC SOCIAL AND EXPERIENCE INTELLIGENCE PHASE 2 CLOSED FOR DURABLE CONVERSATION CONTEXT, PRIVATE PARTICIPATION, CORRECTION MEMORY, RESTRAINT, AND CONVERSATION-NATIVE EXPERIENCE MOMENTS
