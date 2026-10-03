# Fort Oak canonical truth snapshot

**Queried:** 2026-10-03T03:49:17Z (server)  
**Source:** `shared_plans` + `alignment` JSON via Repo  
**Kind:** CHECKPOINT evidence (not founder-green)

## IDs

| Field | Value |
|-------|-------|
| PLAN_ID | `70804c05-779f-4991-ab9c-c75c319ebf2f` |
| CONVERSATION_ID | `ace99adc-db67-4258-9d95-f612246c6c84` |
| PLAN_VERSION | `27` |
| TITLE (row) | Meetup |
| STATUS (row) | agreed |

## Time / place (alignment — UI truth)

| Field | Value |
|-------|-------|
| DATE | Tuesday · Sep 29 (`resolved_on`: `2026-09-29`) |
| START / exact_time | `8:00 PM` (locked) |
| TIMEZONE | `America/Los_Angeles` |
| PLACE | Fort Oak (locked) |
| plan_lines | `["Tuesday · sep 29", "8:00 PM", "Fort Oak"]` |
| completion | `Tuesday · sep 29 at 8:00 PM · Fort Oak is set ✓` |

## Plan / execution layers

| Field | Value |
|-------|-------|
| PLAN_ALIGNMENT_STATE | `commitment: aligned`, `change_quiet: true` |
| date.state / truth | `candidate` / `proposed` (layer inconsistency vs locked time/place — note) |
| EXECUTION_STATE | `unknown`, `executed: false` |
| EXECUTION_AUTHORIZATION | `authorized_by: []` |
| RESERVATION | activity `execution_type: reservation` |

## Column drift

| Field | Value | Note |
|-------|-------|------|
| shared_plans.start_at | `2026-08-20 16:06:33Z` | **STALE** vs alignment Sep 29 — projections must prefer alignment canonical time |

## Temporal evaluation at query time

| Field | Value |
|-------|-------|
| SERVER_NOW_UTC | `2026-10-03T03:49:17Z` ≈ Fri Oct 2 evening PT |
| PLAN_TEMPORAL_STATE | **past** (Sep 29 20:00 America/Los_Angeles < now) |
| NEXT_TOGETHER_ELIGIBLE | **must be 0** under Next Together law |
| GRAPH_PHASE upcoming Ready | **must be 0** |
| FUTURE_EXECUTION_CTA | **must be 0** |

## Founder screenshot contradiction (why this is P0)

Product showed Fort Oak as Next Together + Ready + execution approval on Oct 2.  
Server alignment date is Sep 29. Temporal truth was not governing projections end-to-end.
