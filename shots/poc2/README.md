# Phase OC-2 — Opal Center context assembly

Backend gathers a single context packet when a user messages Opal. No generation (OC-4). No intent (OC-3).

## What shipped

- `OpalCore.Taste.profile_for/1` — durable preference read (empty when absent)
- `OpalCore.OpalContext.assemble/2` — exact keys: `user`, `taste`, `temporal`, `social`, `message`
- Indexes: `shared_plans(inserted_at)`, `plan_participants(user_id)`, `messages(conversation_id, inserted_at)`, `messages(inserted_at)`
- `create_user_message` stores `metadata.context_snapshot` on the Opal reply (OC-1 placeholder unchanged)

## Evidence

| File | What |
|------|------|
| `mix_test.log` | OpalContextTest — 5/5 |
| `perf_ms.txt` | assemble timing under load (~11ms) |
| `sample_context_snapshot.json` | Live POST metadata (PII redacted) |

## Laws held

- Empty lists when no data (never invent)
- No new tables
- No response generation / intent classification
- Queries limited; assemble &lt;500ms
