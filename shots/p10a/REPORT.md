# Phase 10A REPORT — celebrations

## Vision

"Opal knows what they want in advance and queues it up" — birthday/anniversary storage + timed attention so the founder can plan in time.

## Backend

- Migration `20261007010000_celebrations` (up/down)
- `OpalCore.Celebrations` + `Celebration` schema
- `CelebrationController` product routes
- `CelebrationReminderWorker` Oban cron `0 9 * * *`
  - days-until next occurrence (year-boundary safe)
  - 14 → attention; 7/1 → urgent
  - idempotent via `reminders_sent` map `%{"2026" => [14, 7, 1]}`
  - past dates skip until next year's window

## Frontend

- `CelebrationsSection` on You hub below What Opal remembers
- List / empty / add form / delete ×
- Reuses You hub row + destructive styles; heart SVG for anniversary; cake glyph for birthday

## Proof

- BE 16/16 (CRUD, Feb 30, foreign 404, year-boundary, 14/7/1, idempotent)
- FE 4/4
- A8 13/13
- Browser 390: empty → form → list (Maya Jun 15) → delete
- Live worker: seeded 14-day celebration → AttentionCenter "Maya's birthday is in 2 weeks" (attention); re-run idempotent

## Out of scope

- Gift suggestions / curation (later, uses 5A taste)
- Auto-import from contacts
