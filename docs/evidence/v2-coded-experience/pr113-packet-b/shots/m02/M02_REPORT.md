# M-02 Attention event surfacing — REPORT

**SHA:** HEAD/BE `d2de143` · FE dirty with M-03 (Attention FE already wired; no FE wiring change required)  
**Root cause:** Pipeline + FE already connected (`ActivityDestination` → `GET /api/v1/product/attention`). Empty "You're all caught up" is correct at zero events. Surfacing works when producers ingest via existing `POST /api/v1/product/attention/ingest`.

## Docs event types → backend

| Docs type | Verdict |
|---|---|
| TIME_PROPOSAL_PENDING / proposal | BACKEND SUPPORTED (wired) |
| RESERVATION_AUTH / booking_authorization | BACKEND SUPPORTED (wired) |
| PROVIDER_FAILURE / booking_failed / execution | BACKEND SUPPORTED (wired) |
| COMMITMENT_DUE / commitment | BACKEND SUPPORTED (wired) |
| waiting_on / Waiting | BACKEND SUPPORTED (wired) |
| open_question / answer_required | BACKEND SUPPORTED (wired) |
| plan_update / Updated / confirmations | BACKEND SUPPORTED (wired) |
| RECOMMENDATION on Attention | BACKEND SUPPORTED as intentional silence |
| memory spam | BACKEND SUPPORTED as intentional silence |

**STOP not required** — backend list/create exist; FE already wired.

## Endpoints
- GET `/api/v1/product/attention` — list feed
- POST `/api/v1/product/attention/ingest` — create (dev/fixtures)
- POST `/api/v1/product/attention/resolve` · `/seen`

## Verify
- Seeded proposal via ingest → needs_you row "M-02 · Fort Oak time?" with Review cue (`M02_after_seed.png`, `M02_UI_AFTER.json`).
- After resolve-all → empty "You're all caught up." (`M02_empty_state.png`) — B-04 empty centering preserved (no layout change).

## Files changed
None (investigation + evidence only).
