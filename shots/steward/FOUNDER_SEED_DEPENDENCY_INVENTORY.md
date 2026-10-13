# Founder-seed dependency inventory (steward, read-only)

**Date:** 2026-10-12  
**Tip:** `e6455aa1`  
**Authority:** `docs/authority/MASTER_PRODUCTION_CONTINUITY_HANDOFF.md`  
**Purpose:** Map where founder seed still feeds social/graph surfaces so real-account paths can compound without deleting intelligence or pretending seed is a friend's reality.

**Law:** Seed remains a lab/review tool. Production friends must see real conversation → decisions → plans → graph objects → timeline.

## Scan summary

| Metric | Value |
|--------|-------|
| Files with seed markers (`apps/opal_web/src`) | **39** |
| Total marker hits | **255** |
| Primary module | `opalUi/founderGraphSeed.ts` (43 hits) |
| Shell concentration | `OpalApp.tsx` (102 hits) |

Machine dump: `shots/steward/FOUNDER_SEED_DEPENDENCY_INVENTORY.json`

## Surface map (product-facing)

| Surface / concern | Files (representative) | Risk if seed left on for real accounts |
|-------------------|------------------------|----------------------------------------|
| Member shell / URL / persist | `OpalApp.tsx`, `main.tsx`, `founderRuntimeCheckpoint.ts` | Seed sticky on LAN/native-host can look like real life |
| Home social feed hydration | `homeHydration.ts`, `GraphSocialHome.tsx`, `homeFeedRanking.ts` | Fake posts/activity |
| Graphs / journeys / memories | `GraphsHome.tsx`, `GraphDetailSheet.tsx`, `MemoryDetailSheet.tsx`, `alexTripMemories.ts`, `JourneyAddPeople.tsx` | Fake graph objects |
| Chats / calls / pills | `founderChatsPlanPills.ts`, `realChatPath.ts`, `NewCallDestination.tsx` | Seed threads presented as people |
| Center | `OpalCenterChat.tsx` | Seed context in private mind |
| Stories / discovery / search | `StoryViewer.tsx`, `DiscoveryDetailSheet.tsx`, `SearchDestination.tsx` | Demo people in discovery |
| First-run / Holy Shit | `FirstRunExperience.tsx`, `holyShitGate.ts` | Seed OTP / review shortcuts |
| Product client | `api/productClient.ts` | Seed-aware API branching |
| Social authority | `socialAuthority.ts` | Seed overrides visibility rules |

## Transition contract (do not execute deletion in this pass)

1. **Keep** `founderGraphSeed` and tests — lab/review still need them.
2. **Gate** seed behind explicit opt-in (`opal_founder_seed=1` / persist) — already mostly true; audit any auto-enable on private LAN for **production/TestFlight** profiles.
3. **Prefer real** when a live product session exists: real chats, real plans, real graph rows win over seed rows.
4. **Never** present seed markers (Chanelle universe, Fort Oak demo, etc.) as another account's private mind.
5. **Prove** with an isolation-style matrix: account A real data visible; seed-only objects invisible when seed off.

Spelling lock from handoff: relationship examples use **Chanelle**.

## Next compound steps (ordered)

1. Classify each of the 39 files: `lab-only` / `dual-path` / `must-prefer-real`.
2. ~~Add a regression test: seed off → Home empty-or-real, never seed rows.~~ **Done:** `homeHydration.test.ts` — `seed off + no production owners is EMPTY with zero seed cards` (12/12 PASS).
3. ~~Extend EMPTY/prefer-real proofs to Graphs / Chats list composition.~~ **Done:** `graphsHydration.ts` / `chatsHydration.ts` + tests (9/0). GraphsHome gates seed authority cards; seed-off EMPTY when no live.
4. Production/TestFlight profile: assert seed cannot auto-enable from LAN heuristics.
5. After Render payment restore + TestFlight install: founder smoke with seed **off**.

## Non-goals this pass

- No deletion of seed modules
- No redesign of Home/Graphs
- No merge
- No claiming seed removal is done
