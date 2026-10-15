# STATE_AUTHORITY — Repair #11

**Branch:** `muse/repair-11` · **Baseline:** `c474d95f`
**Purpose:** declare, per domain, what the authoritative store is, who may mutate it, and where the current code violates the declaration. Repairs must move the code toward this document, not away from it.

## The law

> The LLM interprets natural language and proposes the next action. Verified application state determines whether a plan was changed, who approved it, and what notification was actually delivered. No user-visible claim may outrun committed state.

## Authority table

| Domain | Authoritative store | Who may mutate | Current violations |
|---|---|---|---|
| Chat message content & order | `messages` table, ordered by `server_seq` (atomic, `FOR UPDATE`) | sender via `message:send`; Opal via executor with bot sender id | Seed script fabricates `humanSpeaker: true` messages attributed to real people; `call_transcription` posts Opal-composed text under a human `sender_user_id` |
| Message delivery state | `messages` delivery columns; client ladder derived | server ack; `message:delivered` events | Seed path has no delivery states; native mobile `upsert` is a bare INSERT |
| Plan existence & status | `shared_plans` row, mutated inside a DB transaction | confirmed state machine only | Broadcast fires inside the transaction before commit (ghost plans); several paths broadcast with no transaction (silent plans) |
| Plan revision lifecycle | `plan_revisions` with `proposed → accepted/rejected/expired/superseded` | `respond_to_revision` with row lock + approvals check | No lock; stale read-modify-write; chat-text confirm has no path here; mobile accept button dead |
| Proposal lifecycle | `proposals` / `plan_options` with TTL | coordination flow with expiry enforcement | `expires_at` never read; any member can approve/dismiss anyone's proposal |
| Participant roles | `plan_participants.role` (`lead`/`co_lead`/`participant`) | lead only (`JourneyAuthority`) | Conversation track assigns `participant` to everyone incl. creator; no organizer concept |
| Attendance | `plan_participants.response_state` | the participant themselves, or lead for others where permitted | `cant_make_it` (correct primitive) is REST-only; chat cannot reach it |
| Cancellation (whole plan) | **does not exist yet** | — | "Cancel" is a message-body regex; no state transition, no authority check, no notification |
| Reservation truth | `reservation_truth` (`not_requested` / synthetic) | provider integration (none) or explicit user action | Honest today — **preserve**; never claim provider state without verification |
| Notifications of plan decisions | durable per-participant delivery (to be built) | the committing transaction | Today: ephemeral PubSub broadcast only; offline participants get nothing; no `Message` row is created for the peer |
| Memory: durable user facts | memory store, account-scoped | ingest pipeline with provenance | Recall cache not invalidated on plan edits |
| Memory: conversation intent | per-conversation pending state, cleared on topic switch / new chat | router | Sticky `recent_who` re-engagement overrides explicit new intent; `switch_topic` patterns too narrow |
| Location origin | explicit `origin_source` (`device`/`manual`/`named_destination`) | user grant or explicit selection | No origin concept in Center flow; no device coords on mobile at all |
| Seed/demo content | clearly-labeled demo namespace, never in production path | demo tooling only | Seed engine spliced into production send/render path, triggered by display-name match |

## Canonical distinctions — enforcement status

| Distinction | Status |
|---|---|
| Proposal ≠ Confirmation | Declared in schema (`plan_revisions` statuses); **unenforced** — no reachable confirm path from chat or client |
| Withdrawal ≠ Cancellation | Enforced in Journey track (`cant_make_it` non-destructive); **no whole-plan cancel exists** |
| Interested ≠ Going | Enforced (`participation_counts`) |
| Suggested venue ≠ Verified reservation | Enforced (honest `not_requested`) — **preserve** |
| Draft ≠ Delivered | Enforced on live web path; absent in seed path |
| Personal memory ≠ Current intent | **Violated** — sticky re-engagement injects prior-person context over explicit new requests |
| Bot-authored ≠ Human-authored | **Violated** — seed peer fabrication + `call_transcription` human-sender posts |

## Repair direction (authorized by founder directive §10 + architectural recommendation)

1. **Single authoritative event history for shared-plan decisions**, with per-participant projections. One writer per transition, inside a transaction; broadcasts fire only after commit.
2. **Deterministic plan state machine** owning proposal → authorization → commit → notification, with explicit authorization rules per mutation (lead/organizer vs participant vs self), row locks, idempotent handlers, and TTL enforcement.
3. **Natural-language intents route into the state machine** — "I confirm" and "cancel" become structured intents bound to a specific proposal/plan id, never free-floating text and never regex side-effects.
4. **Seed/demo quarantine**: the simulation may only run behind an explicit, visible demo flag, never triggered by display-name match, never attributing content to real people, never in the production send path.
5. **Location provenance**: device coords (with permission) or explicit manual origin, carried through the request, surfaced unobtrusively in UI; no distances without real coordinates.
6. **Durable per-participant notification** for plan decisions — a plan change the peer never received is not a completed workflow.
