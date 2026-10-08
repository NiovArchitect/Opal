# Frontend Tranche — BLOCKED (missing backend product APIs)

Frontend builds typed mocks for these. **Do not invent backend behavior in the FE.** Next backend paste fills them. Paste E may add related fields (provenance, maturity) but does not replace these product HTTP surfaces unless explicitly added there.

## 1. Person memory transparency (Phase 2)

### GET `/api/v1/product/intelligence/people/:person_id/memory`

Auth: product bearer, owner-scoped (`account_id` = current user).

Response shape:

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

### PATCH `/api/v1/product/intelligence/people/:person_id/facts/:key`

Body: `{ "value": "June 15", "source_note": "corrected by owner" }`  
→ updates known_facts; provenance becomes `stated`.

### DELETE `/api/v1/product/intelligence/people/:person_id/facts/:key`

→ archives/removes fact (per-fact only; no bulk). Confirmation is UI-only.

### POST `/api/v1/product/intelligence/people/:person_id/facts/:key/confirm` (inferred → stated)

Body: `{ "action": "confirm" | "wrong" }` — Paste E provenance UI.

---

## 2. Reminder / temporal card enrichment (Phase 1)

Attention feed exists (`GET /api/v1/product/attention`) but items lack stable lifecycle + plan-status fields for reminder cards.

### Desired enrichment on AttentionCenterItem (or sibling GET)

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

Until present: FE projects from `title`/`detail`/`source_type` + mock seed for lifecycle screenshots.

---

## 3. Mediation / consensus (Phase 3)

Backend delivers mediation via `GroupCoordinator.maybe_mediate_to_owner` → Opal Center message (`delivery: :owner_center`). Missing product HTTP for Center cards:

### GET `/api/v1/product/intelligence/mediation`

```json
{
  "items": [
    {
      "id": "<group_decision_state_id>",
      "status": "blocked|reached",
      "topic": "Saturday dinner",
      "conversation_id": "<uuid>",
      "positions": [
        { "proposal": "Rooftop 8pm", "supporters": ["Maya", "Sam"] },
        { "proposal": "Juniper 7:30", "supporters": ["Alex"] }
      ],
      "silent_participants": ["Jordan"],
      "mediation_draft": "…verbatim backend draft…",
      "card_state": "pending|sent|dismissed"
    }
  ]
}
```

### POST `/api/v1/product/intelligence/mediation/:id/send`

Body: `{ "draft": "…optional edited…" }`  
→ confirms owner send path (opens group compose or records send). **Backend must never auto-post as Opal into the group.**

### POST `/api/v1/product/intelligence/mediation/:id/dismiss`

→ 7-day suppression (`GroupDecision.dismiss_mediation/2`).

### POST `/api/v1/product/intelligence/mediation/:id/create_plan` (consensus lock-in)

Body: plan prefill fields → existing SharedPlan create path.

---

## 4. Weekly briefing (Phase 4)

Table `weekly_briefings` exists; no product API.

### GET `/api/v1/product/intelligence/briefings?current=1`

```json
{
  "briefing": {
    "id": "<uuid>",
    "week_start": "2026-10-05",
    "week_end": "2026-10-11",
    "header": "Your week ahead",
    "confirmed": [{ "label": "Maya coffee", "day": "Tue" }],
    "still_open": [{ "label": "Saturday dinner", "link": { "kind": "conversation", "id": "…" } }],
    "tight_spots": [],
    "suggestion": { "label": "…" },
    "question": { "label": "…", "link": { "kind": "plan_create|conversation", "id": "…", "prefill": "…" } }
  }
}
```

### GET `/api/v1/product/intelligence/briefings` (past weeks, read-only)

### POST `/api/v1/product/intelligence/briefings/:id/dismiss` (dismiss for week; remains in past)

---

## 5. Channel contract gaps (choreography sequences)

CHANNEL_CONTRACT.md lists only the five Paste B events. Sequences 4–5 also need:

| Desired event | Topic | Notes |
|---|---|---|
| `intelligence:group_blocked` | `user:<account_id>` | Mediation card appear |
| `intelligence:group_consensus` | `user:<account_id>` | Lock-in card replace |
| `intelligence:weekly_briefing` | `user:<account_id>` | Briefing card |
| `intelligence:temporal_anchor` | `user:<account_id>` | Or reuse `intelligence:nudge` with reason |

**FE interim:** map mediation/briefing/temporal onto `intelligence:nudge` + `inbox:attention` + attention refresh until contract is extended.

---

## 6. Not blocked (real paths)

- `GET/POST /api/v1/product/attention*` — Attention Center
- `resolveAttentionItem` — dismiss/suppress
- `postOpalMessage` — Plan something / draft handoff
- `inbox:message` / `applyInboxMessage` — proactive thread list insert
- `listMemoryFacts` / `forgetMemoryFact` — You hub DurablePreferenceMemory (Phase 7A) — distinct from per-person social memory view
- Celebrations CRUD — parallel birthday store; reminder cards prefer temporal/attention projection
