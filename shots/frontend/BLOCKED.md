# Frontend Tranche — BLOCKED (missing backend product APIs)

Frontend builds typed mocks for these. **Do not invent backend behavior in the FE.**  
**Paste F backend (2026-10-08):** product HTTP + channels are LIVE under `/api/v1/product/intelligence/…`.  
**FE mocks retained** pending founder Phase 6 validation (parent owns flag wiring). Strike-through = BE shipped.

~~## 1. Person memory transparency (Phase 2)~~ ✅ BE F1

~~### GET `/api/v1/product/intelligence/people/:person_id/memory`~~

Auth: product bearer, owner-scoped (`account_id` = current user). Foreign → **404**.

Response shape (live):

```json
{
  "person_id": "<uuid>",
  "display_name": "Maya",
  "relationship_type": "close_friend",
  "vibe_summary": "Close friend · warm and direct",
  "known_facts": [
    {
      "key": "birthday",
      "value": "June 14",
      "source_note": "you mentioned this in March",
      "provenance": "stated",
      "confidence": 0.9,
      "needs_revalidation": false
    }
  ],
  "rhythms": [
    { "label": "Coffee every Tuesday", "streak_weeks": 8, "provenance": "observed", "evidence_count": 8 }
  ],
  "important_dates": [
    { "anchor_id": "<uuid>", "anchor_type": "birthday", "date": "2026-06-14", "lifecycle": "upcoming" }
  ],
  "open_loops": [
    { "id": "<uuid>", "summary": "Saturday dinner unconfirmed", "conversation_id": "<uuid>" }
  ],
  "learned_preferences": [
    {
      "summary": "Maya didn't love the rooftop — avoiding similar",
      "evidence_count": 2,
      "provenance": "observed"
    }
  ]
}
```

~~### PATCH `/api/v1/product/intelligence/people/:person_id/facts/:key`~~ ✅  
Body: `{ "value": "June 15", "source_note": "corrected by owner" }` → provenance `stated`.

~~### DELETE `/api/v1/product/intelligence/people/:person_id/facts/:key`~~ ✅  
Requires `confirm=true` (query/body). Archives fact (`archived_at`); not hard delete.

~~### POST `/api/v1/product/intelligence/people/:person_id/facts/:key/confirm`~~ ✅  
Body: `{ "action": "confirm" | "wrong" }`.

---

~~## 2. Reminder / temporal card enrichment (Phase 1)~~ ✅ BE F4

Attention feed (`GET /api/v1/product/attention`) now includes enrichment fields when
`source_type` is temporal/celebration/reminder:

```json
{
  "source_type": "temporal_anchor|celebration|reminder",
  "lifecycle": "upcoming|day_of|passed_unplanned|planned",
  "person_id": "<uuid>",
  "person_name": "Maya",
  "anchor_type": "birthday|anniversary|deadline|recurring",
  "anchor_date": "2026-06-14",
  "days_until": 3,
  "plan_status": "none|planned",
  "plan_id": "<uuid|null>",
  "plan_summary": "Dinner at Juniper · Sat 7:30"
}
```

FE may still keep lifecycle projection helpers until founder Phase 6 flips off mocks.

---

~~## 3. Mediation / consensus (Phase 3)~~ ✅ BE F2

~~### GET `/api/v1/product/intelligence/mediation`~~  
Also: `GET …/mediation/:id`, `GET …/groups/:conversation_id/mediation`.

~~### POST `/api/v1/product/intelligence/mediation/:id/send`~~  
`delivered_via: owner_draft` + outbox. **Backend never auto-posts as Opal into the group.**

~~### POST `/api/v1/product/intelligence/mediation/:id/dismiss`~~  
→ 7-day suppression (`GroupDecision.dismiss_mediation/2`).

~~### POST `/api/v1/product/intelligence/mediation/:id/create_plan`~~  
Consensus lock-in → SharedPlan create / prefill.

---

~~## 4. Weekly briefing (Phase 4)~~ ✅ BE F3

~~### GET `/api/v1/product/intelligence/briefings?current=1`~~  
404 + `next_briefing_at` when none / dismissed.

~~### GET `/api/v1/product/intelligence/briefings`~~ (past)  
~~### GET `/api/v1/product/intelligence/briefings/:id`~~  
~~### POST `/api/v1/product/intelligence/briefings/:id/dismiss`~~

Includes `question.link` in structured payload.

---

~~## 5. Channel contract gaps (choreography sequences)~~ ✅ BE F5

| Event | Topic | Notes |
|---|---|---|
| `intelligence:group_blocked` | `user:<account_id>` | **Owner only** (Paste C mediation privacy — not group fanout) |
| `intelligence:group_consensus` | `user:<account_id>` | Owner lock-in |
| `intelligence:weekly_briefing` | `user:<account_id>` | Briefing card |
| `intelligence:temporal_anchor` | `user:<account_id>` | Temporal reminder |

See `shots/intelligence/CHANNEL_CONTRACT.md`.  
**FE interim handlers** may remain until founder validates `choreography_events` real path (Phase 6).

---

## 6. Not blocked (real paths)

- `GET/POST /api/v1/product/attention*` — Attention Center (+ F4 enrichment)
- `resolveAttentionItem` — dismiss/suppress
- `postOpalMessage` — Plan something / draft handoff
- `inbox:message` / `applyInboxMessage` — proactive thread list insert
- `listMemoryFacts` / `forgetMemoryFact` — You hub DurablePreferenceMemory (Phase 7A) — distinct from per-person social memory view
- Celebrations CRUD — parallel birthday store; reminder cards prefer temporal/attention projection

## Phase 6 note (parent)

FE typed mocks in `intelligenceClient.ts` **retained** pending founder validation. Parent owns flag wiring to prefer live HTTP when ready.
