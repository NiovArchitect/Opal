# Native Opal Calendar Campaign

Branch: `build/opal-native-calendar`  
Base: main after PR #69  

## Product law

**Opal Calendar = canonical schedule created inside Opal.**  
External calendars = optional free/busy sources + optional sync sinks.

## Google core dependency

| Concern | Status |
|---------|--------|
| Set / plan agreement | Native SharedPlan + OpalCalendar projection |
| Conflict detection | Native busy blocks |
| Reminders intent | OpalCalendar.Reminders (no Google) |
| Sufficiency | Opal first; Google only if `external_calendar_enabled` and connected |
| Google OAuth | Optional preserved code; not required |

## Modules

- `OpalCalendar` / `OpalCalendar.Commitment`
- `ScheduleKnowledge` (source priority)
- `Reminders` (intent only)
- `CalendarSufficiency` rewritten for native-first fusion

## UX freeze

No visual redesign. Calendar is invisible infrastructure.
