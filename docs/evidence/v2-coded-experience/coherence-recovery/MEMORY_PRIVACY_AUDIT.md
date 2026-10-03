# MEMORY PRIVACY AUDIT — Home “Published Memory from Opal Graph”

**Date:** 2026-10-02  
**Slice:** Steps 7–9 coherence recovery  
**Status:** CHECKPOINT (not green) — code + fixture cleanup applied; founder visual not re-walked

## Audit fields

| Field | Value |
|-------|--------|
| **HOME_MEMORY_CARD_OWNER** | `GraphSocialHome` Memory card chrome; composed via `composeHomeFeed` / `homeHydration`; hydrated from `OpalApp` → `loadProductionHomeOwners` / (legacy) `bootstrapDurableMemories` |
| **SOURCE_MODEL** | `SocialMomentRecord` / `SocialMomentPublishing` → `HomeFeed.compose` → `/api/v1/product/home/feed` → `productionObjectToCard` |
| **IS_PRIVATE_MEMORY** | **0** — not `MemoryCandidate` / private intelligence; rows were durable `social_moments` |
| **IS_MEMORY_CANDIDATE** | **0** — `personal_memory_candidates` never enter HomeFeed |
| **IS_EXPLICIT_PUBLISHED_MEMORY** | **Partial / false for intent** — created via `publishSocialMoment` API, but **without** user-authorized publish action (auto-bootstrap) |
| **IS_DEMO_FIXTURE** | **1** — captions from `bootstrapDurableMemories` / `ensureDemoSocialMoment` (`Published Memory from Opal Graph`, Golden hour…, Sunset walk…) |
| **WHO_CAN_VIEW** | Author + friends (`visibility: "friends"`) while undeleted; after soft-delete, removed from `list_for_viewer` |

## Violation classification

Not private-memory-as-social-post (those tables were never projected).  
Violation path:

- `INFERRED_MEMORY_AUTO_PUBLISHED` / demo auto-publish → friends-visible Home Memory cards  
- Caption literally “Published Memory from Opal Graph” while provenance was fixture bootstrap, not human publish  
- Target: **`PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST = 0`** (and auto-publish = 0) by stopping this path

## Code owners (absolute)

- `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/GraphSocialHome.tsx` — renders MEMORY cards  
- `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/socialAuthority.ts` — bootstrap / production mapping  
- `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/OpalApp.tsx` — calls bootstrap when founder seed on (**skipped this slice**: dirty with temporal work)  
- `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/social_flow/home_feed.ex` — production feed authority  

## Fixes applied (this slice)

1. **`bootstrapDurableMemories` → returns `[]`** and clears session cache; no BEAM publish.  
2. **`ensureDemoSocialMoment` → refused** (`DEMO_AUTO_PUBLISH_DISABLED`).  
3. **`loadProductionHomeOwners` filters** `DEMO_BOOTSTRAP_MEMORY_CAPTIONS` so residual demo captions never render as Home Memory.  
4. **Fixture reset** soft-deleted Walk A/B-authored demo moments (`FOUNDER_FIXTURE_RESET.json`).  

## Remaining

- OpalApp still *calls* `bootstrapDurableMemories(...)` when `?opal_founder_seed=1` — now a no-op; remove call when temporal agent releases the file.  
- Related fixture user `+12025550103` (`f69f941c-…`) still has demo captions visible via friends feed API; client filter hides them on Home. Out of Walk A/B allow-list for DB delete.  
- Founder visual confirmation of Home Memory stream still required for green.

## Checkpoint law

`PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST → 0` (for this demo path)  
`INFERRED_MEMORY_AUTO_PUBLISH → 0`  
`COMMIT = NO` (coherence recovery checkpoint only)
