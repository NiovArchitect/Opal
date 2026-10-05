# Phase 10A — celebrations (birthday / anniversary)

Backend storage + daily reminder worker + You hub UI.

## What shipped

- `celebrations` table (owner, person_name, kind, month/day, optional year/notes)
- API: `GET/POST /api/v1/product/celebrations`, `DELETE /:id` (owner-only)
- `CelebrationReminderWorker` daily 09:00 UTC — milestones 14 (attention) / 7 / 1 (urgent)
- You hub **Celebrations** section below "What Opal remembers"

## Evidence

| File | What |
|------|------|
| `mix_test.log` | celebrations + API + worker — 16/16 |
| `fe_test.log` | CelebrationsSection — 4/4 |
| `a8_surface_regression.log` | SurfaceProjection — 13/13 |
| `no_score.txt` | `no_score_ok` |
| `empty_390.png` / `form_390.png` / `list_390.png` | You hub @ 390 |
| `worker_items.json` | AttentionCenter item after seed+worker |
| `VERIFY.json` | SHA parity + checks |

## Laws

- Owner-only (foreign → 404)
- Never invent year; month/day required; Feb 30 → 422
- One reminder per milestone per occurrence year
- No people-scoring / `*_score`
