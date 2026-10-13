# Pass 1D — Production seed audit

**Date:** 2026-10-13  
**Authority:** `REALITY_SOURCE_PRIORITY_LAW.md` · prefer-real composers  
**Question:** When a normal user downloads Opal, what exists before they create anything?

## Expected (App Store / TestFlight production build)

```text
New user
 ↓
Welcome / first-run
 ↓
Create identity
 ↓
Invite / connect people
 ↓
Build reality
```

**Not:**

```text
New user
 ↓
Founder universe appears
```

## Gate resolution (shipped)

Pure resolver: `resolveFounderSeedGate` in `founderGraphSeed.ts`  
Regression: `founderSeedGate.test.ts`

| Context | Seed enabled? | Reason |
|---------|---------------|--------|
| `productionBuild: true` default | **No** | `production_default` |
| Production + stale localStorage / LAN native host / env | **No** | ignored under production |
| Production + `?opal_founder_seed=1` | Yes (lab only) | explicit URL |
| Dev + `native_host` + private LAN | Yes | founder phone walks |
| Any + `?opal_founder_seed=0` | No | explicit off clears persist |

## Reality source priority on member surfaces

| Surface | Seed off / production | Composer |
|---------|----------------------|----------|
| Home | EMPTY or production owners | `composeHomeFeed` |
| Graphs | EMPTY or live/created | `composeGraphsList` |
| Chats | EMPTY or live rows | `composeChatsList` |

## Answer

Before a normal production user creates anything, Opal shows **empty / welcome reality** — not Chanelle, Fort Oak demo chrome, or founder feed cards.

Lab fixtures remain available only via explicit opt-in on **non-production** builds (URL, persist, or native_host+LAN).

## Required zeros

- `PRODUCTION_AUTO_ENABLES_FOUNDER_SEED = 0`
- `PRODUCTION_NATIVE_HOST_LAN_SEED = 0`
- `PRODUCTION_STALE_LOCALSTORAGE_SEED = 0`
- `NEW_USER_SEES_FOUNDER_UNIVERSE = 0`
