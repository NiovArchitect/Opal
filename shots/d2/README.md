# Phase D-2 — Celebration curation

Opal suggests what someone would love for their birthday/anniversary.

## Files

| File | Purpose |
|------|---------|
| `mix_test.log` | CelebrationCurationTest + API + worker (24/24) |
| `vitest.log` | CelebrationsSection (5/5) |
| `sample_curation.json` | Manual rich curation + reminder copy |
| `REPORT.md` / `VERIFY.json` | Summary + GREEN gate |

## Scope

- Module `OpalCore.CelebrationCuration` (no new schema)
- Worker reminder includes top plan idea
- OC-2/OC-4 upcoming celebrations carry `top_idea`
- API `GET /celebrations/:id/curate` (known+, owner-only)
- You hub card: "would love" + detail + Plan this → Center
