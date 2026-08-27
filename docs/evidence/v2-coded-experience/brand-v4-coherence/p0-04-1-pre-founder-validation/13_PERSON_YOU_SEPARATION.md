# 13 — Person Profile vs You separation + nested settings

**Date:** 2026-08-26  
**HOLD. DO NOT MERGE.**  
**permissionToStartLive = NO**

## Separation (preserved)

| Surface | Figma | Role |
|---|---|---|
| Person Profile | `618:1257` | Other people — Message / Call / Video / Plan |
| You hub | `618:1344` (legacy `254:340`) | Own identity / privacy / settings |

- Header own-profile → **You tab** (`tab=you`), not person overlay.
- YouPane stamped `data-person-profile-actions="false"` — no Message/Call/Video/Plan rails.
- Nested settings open **inside** You pane; dock stays owned by `OpalApp`.

## Nested destinations (navigable — not static dead rows)

All hub rows and Edit profile / QR open a real destination via `youSetting` state → `YouSettingsDestination`.

| Hub control | Setting key | Figma |
|---|---|---|
| Edit profile | `edit-profile` | `618:2123` |
| Privacy | `privacy` | `618:1524` |
| Feed & discovery | `feed-discovery` | `618:1801` |
| Location & travel | `location-travel` | `618:1591` |
| Engagement | `engagement` | `618:1868` |
| Calls & Opal Assist | `calls-assist` | `618:1733` |
| Notifications | `notifications` | `618:1935` |
| Linked devices | `linked-devices` | `618:2003` |
| Safety | `safety` | `618:2060` |
| QR (top-right) | → `linked-devices` | `618:2003` |

Optional Settings Hub frame `618:1430` recorded in brand authority map; runtime uses You hub `618:1344` as entry.

## Account utilities (below hub)

Find people · Sign out · local Reset first run remain under Account / “More settings below”.

## Consent language

Location and Calls & Opal Assist copy is restrained: timing/ETA vs live share; Assist is consent-gated — **no hidden recording claims**.
