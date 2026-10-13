# Pass 1H — Prefer-real remediation

**Date:** 2026-10-13  
**Status:** SHIPPED (hold-period coherence)  
**Prerequisite:** `SURFACE_FRAGMENTATION_REAUDIT.md`  
**Pass 2:** still LOCKED

## Law

```text
Production empty ≠ founder universe
```

Seed/lab systems remain for founder/demo/testing. They must not silently substitute when seed is off.

## RED fixes

| RED | Change | Required zero |
|-----|--------|---------------|
| **1 Home Stories** | `resolveHomeStories` returns `[]` when seed off + no production stories; `FOUNDER_STORIES` only when seed on | `HOME_STORIES_SEED_WHEN_SEED_OFF = 0` |
| **2 Person temporal** | `personNodeTemporal` / `personTemporalContext` gated on founder seed | `PERSON_TEMPORAL_SEED_ON_PRODUCTION_CARD = 0` |
| **3 Full Live** | `onOpenLive` gates seed-off; portal shows honest empty; no `seed-live-sabrina` default when seed off | `FULL_LIVE_SEED_DEFAULT_WHEN_SEED_OFF = 0` |

## Files

- `apps/opal_web/src/opalUi/socialAuthority.ts`
- `apps/opal_web/src/opalUi/graphCalendaring.ts`
- `apps/opal_web/src/opalUi/GraphSocialHome.tsx`
- `apps/opal_web/src/OpalApp.tsx`
- `apps/opal_web/src/opalUi/pass1hPreferReal.test.ts`
- Updated: `socialAuthority.test.ts`, `graphCalendaring.test.ts` (seed on/off cases)

## Proof

```text
vitest pass1hPreferReal + socialAuthority + chats/graphs hydration + founderSeedGate
→ Pass 1H cases GREEN
```

Seed ON still receives FOUNDER_STORIES / person temporal / Full Live fixture.  
Seed OFF receives honest empty.

## Not done here

- Pass 1I Attention copy — separate shot  
- Person Graph / Pass 2 — LOCKED  
- Render / TestFlight — founder-gated  
