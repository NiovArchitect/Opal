# Founder validation — intelligence surfaces (Paste F Phase 6 amended)

**Mocks are retained until you mark each surface good.** Do not delete mock fixtures or `MOCK_*` constants before founder sign-off.

## How to flip data source

| Method | Example |
|--------|---------|
| Query (all surfaces → real) | `?opal_intel_real=1` |
| Query (one surface) | `?opal_intel_real=person_memory` |
| Query (several) | `?opal_intel_real=person_memory,mediation` |
| localStorage JSON | key `opal.intelligence.data_source.v1` |

localStorage shapes:

```json
"real"
```

```json
{ "default": "auto", "person_memory": "real", "mediation": "mock" }
```

Modes:

- **mock** (default) — current typed-mock behavior; API miss remocks
- **auto** — try real HTTP; remock only on failure
- **real** — call product HTTP; on failure show honest empty/error (**never** silent remock)

Module: `apps/opal_web/src/opalUi/intelligence/intelligenceDataSource.ts`

## Surfaces — awaiting founder good before mock removal

| Surface | Flag key | Where you see it | Flip | Status |
|---------|----------|------------------|------|--------|
| Person memory | `person_memory` | You hub People → What Opal remembers; GroupInfo member | `?opal_intel_real=person_memory` | **awaiting founder good before mock removal** |
| Mediation | `mediation` | Attention → For you (blocked / consensus cards) | `?opal_intel_real=mediation` | **awaiting founder good before mock removal** |
| Weekly briefing | `weekly_briefing` | Attention → For you | `?opal_intel_real=weekly_briefing` | **awaiting founder good before mock removal** |
| Reminder / attention | `reminder_attention` | Attention → For you ReminderCard lifecycles | `?opal_intel_real=reminder_attention` | **awaiting founder good before mock removal** |
| Choreography events | `choreography_events` | Channel first-class events (see below) | `?opal_intel_real=choreography_events` | **awaiting founder good before mock removal** |

## Choreography (one-release fallback)

First-class events (preferred when BE emits them):

- `intelligence:group_blocked`
- `intelligence:group_consensus`
- `intelligence:weekly_briefing`
- `intelligence:temporal_anchor`

**Keep for one release:** interim `intelligence:nudge` reason mapping + `inbox:attention` invalidation. Do not remove until real choreography is founder-validated.

## Backend paths (unchanged — BE agent fills)

- `GET /api/v1/product/intelligence/people/:id/memory`
- `GET /api/v1/product/intelligence/mediation`
- `GET /api/v1/product/intelligence/briefings?current=1`
- Attention enrichment fields on existing `GET /api/v1/product/attention`

See `shots/frontend/BLOCKED.md`.

## Screenshots this paste

- Mock-default (endpoints not ready): `shots/frontend_tranche/real_flag_awaiting_be/`
- Prior fixture set unchanged: `shots/frontend_tranche/*-390x844.png`

When BE routes land: flip one surface with `?opal_intel_real=<surface>`, capture under `shots/frontend_tranche/real_flag_<surface>/`.

## Sign-off checklist (founder)

For each surface: open on device → flip to real → confirm live or honest empty → reply **good** → then Grok may remove that surface’s mock path only.
