# Opal Time Services

**Status:** R3-early (2026-09-07)  
**Law:** Silence by default. Realtime ≠ clock spam.

## Thesis

Opal time is **material moments**, not calendars pushed into the face.

> EVENT → VALIDATE → PERSIST → RECOMPUTE → SIGNAL **ONLY IF USER VALUE CHANGED**

100 internal recomputes may produce **0** UI changes. That is correct.

## Services (this stretch)

| Service | Module | What users feel |
|---------|--------|-----------------|
| **Leave-by materiality** | `LeaveByMateriality` | One calm “time to leave” — never a ticking countdown |
| **Material time gate** | `MaterialTime` | Unified silence rules for leave-by / overlap / shared-now / significant change |
| **Overlap compression** | Availability controller + channel `availability:overlap` | One shared-safe suggestion — not a schedule dump |
| **Shared-now** | `MaterialTime.evaluate_shared_now/2` | “We’re free then” without roster or private calendars |

## Delivery

- Reminder transport (`ReminderDelivery`) schedules leave-bys early, but **`notify: true` only inside the material window**.
- Phoenix: conversation overlap broadcast; user inbox for call + future `time:material`.
- Outbox: `action.leave_by_due` (IDs + copy; origin never exposed).

## Non-goals

- Clock widgets / minute tickers in product UI  
- Dumping peer calendars or coordinates  
- Engagement spam from ETA recomputes  
- Paid push cadence optimization (later)
