# Deprecated / rejected authority grep results (P0-05)

## Forbidden Figma nodes `539:* / 540:* / 541:8 / 554:5`

| Location | Classification |
|---|---|
| `apps/opal_web/src/brand/brand.ts` supersededSpectralScreens | CURRENT_VALID (registry of forbidden) |
| `apps/opal_web/src/main.tsx` INVALID comment | CURRENT_VALID (doc) |
| `apps/opal_web/src/brand/brandMark.test.ts` | TEST_ONLY |
| `apps/opal_web/src/theme/spectralTokens.css` `.fr-splash[data-figma-sfr="540:2"]` | DEAD / inert CSS safety |
| `apps/opal_web/index.html` comment mentioning 554:5 | HISTORICAL_DOC_ONLY |

**FORBIDDEN_PRODUCTION as current authority:** none found.

## Needs you / Enter Journey / Flip / Messages·Calls

| Pattern | Production status |
|---|---|
| Needs you | Comments + tests asserting absence; ActivityDestination title is Activity |
| Enter Journey | Comment in OpalApp that 618:758 has no CTA; no executable JSX |
| Flip | Absent from CallSurfaces.tsx |
| Messages/Calls tabs | ChatsHome documents rejection; chatsHome.test covers |

## Founder seed

| Location | Classification |
|---|---|
| `founderGraphSeed.ts` `isFounderSeedEnabled` | CURRENT_VALID gate |
| `homeHydration.ts` | CURRENT_VALID production vs fixture firewall |
| `OpalApp.tsx` / `GraphSocialHome.tsx` | CURRENT_VALID opt-in usage |
| Gate scripts with `?opal_founder_seed=1` | TEST_ONLY / evidence tooling |

## Legacy assets

| Pattern | Classification |
|---|---|
| `symbol-160-2-transparent` | LEGACY_PATH in brand.ts + tests; not Center Opal |
| `emblem-dock-rest` | Forbidden in First Run (adversarial test) |

## `.app > *`

| Location | Classification |
|---|---|
| `styles.css:139` chained `:not(...)` excluding call-surface, tabbar, dated-conv, etc. | SCOPED / REQUIRED protection |
