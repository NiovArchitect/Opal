# Pass 1C — Settings live-wire audit

**Date:** 2026-10-13  
**Authority:** REALITY SOURCE PRIORITY · STATE OWNERSHIP · settings three-state law  
**Source:** `YouSettingsDestination.tsx` · `settingsWireClass.ts`

## Law

```text
Visible setting → UI state → API → DB → realtime → future behavior
```

Classify every item:

| Class | Meaning |
|-------|---------|
| **GREEN** | Fully functional (or honest local-only projection) |
| **HONEST GATE** | Visible; requires infrastructure; never fake connected |
| **HIDDEN** | Not ready and no user value — do not show |

## Classified rows (priority live set)

Machine: `apps/opal_web/src/opalUi/settingsWireClass.ts`  
Regression: `settingsWireClass.test.ts`

| Id | Class | Wire |
|----|-------|------|
| `save` | GREEN | `updateProfile` |
| `save-home-timezone` | GREEN | `updateHomeTimezone` |
| `travel-mode` | GREEN | read projection of home timezone travel active |
| `assist` | GREEN | `get/updateAssistPreference` |
| `messages-calls` | GREEN | `updateMessagingPreferences` |
| `read-receipts` | GREEN | `updateMessagingPreferences` |
| `this-phone` | GREEN | local session Active |
| `linked-from-account` | GREEN | opens linked-devices |
| `delete-account` | GREEN | opens nested delete screen |
| `keep-account` | GREEN | local dismiss |
| `nearby-range` | **HONEST GATE** | was static "25 mi" — now blockedReason (discovery-distance API) |

## Remaining honest gates

~42 rows already carry `blockedReason` (privacy, push categories, safety lists, calendar-class prefs, etc.). Leave gated until a real consumer + API exist. Do not convert to silent no-ops.

## Compound fix this pass

- `nearby-range`: static "25 mi" → honest gate (authority leakage: pretend preference).

## Next (still Pass 1)

- Optional browser proof: Assist / read receipts / save profile round-trip with minted session.
- Do not unlock relationship intelligence.
