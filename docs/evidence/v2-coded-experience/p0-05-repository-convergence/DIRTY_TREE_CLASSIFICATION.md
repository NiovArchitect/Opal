# P0-05 Dirty-tree classification

**Precheck HEAD:** `cb1bd4382d73fb7a83b29658ec3a48942801219e`  
**Branch:** `build/v2-coded-experience-closure`  
**UNKNOWN = 0** (after classifying `apps/opal_web/scripts/` as P0_RUNTIME_INFRA)

## Bucket summary (porcelain entries)

| Bucket | Count (approx) | Notes |
|---|---:|---|
| P0_EVIDENCE | majority of untracked | `docs/evidence/**` including brand-v4-coherence p0-* |
| P0_BRAND_ASSET | ~70+ | public brand / figma-v2 / favicons (excl. quarantine via gitignore) |
| P0_RUNTIME_INFRA | ~50 | OpalApp, styles, core, scripts, main, theme |
| P0_TEST | ~13 | *.test.ts / exs |
| P0_GRAPHS | ~9 | Graph* / Journey* / homeHydration |
| P0_COMMUNICATION | ~6 | CallSurfaces, DatedConversation, Chats, Stories |
| P0_FIRST_RUN | ~4 | FirstRun / Promise / onboarding |
| P0_HOME | ~4 | GraphSocialHome, Activity, Search |
| P0_YOU_SETTINGS | ~2 | YouSettingsDestination |
| P0_SHARED_DOCK | folded into RUNTIME_INFRA / CSS | Option B dock lives in styles.css |
| UNKNOWN | **0** | |

## Explicit non-commit / ignore

| Path | Class |
|---|---|
| `public/**/_quarantine/` | HISTORICAL_DOC_ONLY / not product |
| `public/**/_lowres*` | HISTORICAL / not product |
| `apps/opal_core/priv/local_media/` | local runtime only |

## Checkpoint intent

Commit durable product + authority + tests + gate scripts + material p0 evidence so HEAD moves off `cb1bd43` while HOLD/NO MERGE remains.
