# Observability

**Status:** Phase 0

---

## Pillars

1. **Logs** — structured, correlation ids, no raw message bodies in default logs.  
2. **Metrics** — RED/USE for channels, jobs, DB, AI providers.  
3. **Traces** — request/job spans across Elixir → Python.  
4. **Audits** — consent, auth, admin, governed actions (separate retention).

---

## Correlation

- `request_id` / `trace_id` on HTTP  
- `channel_join_id`  
- `job_id` / `idempotency_key` for AI  
- `conversation_id` / `user_id` as indexed attributes (careful with cardinality)

---

## Must-have metrics (MVP eng)

| Area | Metrics |
|------|---------|
| Messaging | send latency, ack latency, offline queue depth (client), disconnects |
| Channels | joins/sec, errors, presence size |
| AI | queue wait, inference latency, error/refuse rates by type |
| Consent | deny counts |
| Safety | draft blocks |
| System | BEAM process counts, Oban queue depth, DB pool |

---

## Privacy in observability

- Default: **do not** log message text, transcripts, or draft content.  
- Debug mode: short-lived, sampled, access-controlled.  
- AI provider logs: contractual + technical minimization.

---

## Alerting philosophy

- Page on user-visible messaging outages.  
- Ticket on AI degradation (messaging continues).  
- Never alert users with fear copy based on “relationship risk” metrics.
