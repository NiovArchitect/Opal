# ROOT_CAUSE_MAP — Repair #11

**Branch:** `muse/repair-11`
**Baseline:** `c474d95f` (Repair #10 evidence stamp; product `5e7a7b4a`)
**Method:** five parallel code-path investigations + independent blind-spot audit, every headline claim self-verified by direct reads. Read-only phase; no fixes in this document.
**Release authority:** `FOUNDER_ACCEPTED = NO` · `FREEZE = HOLD` · `PASS2 = NO` · `FOUNDER_PHONE_PASS = NOT_CLAIMED`

## Headline

The founder's live failures (F01–F07) do **not** share one technical root cause, but they share one structural condition: **there is no consistently enforced source of truth for conversation state, plan state, participant authority, or memory.** Concretely:

1. The founder's phone walk was testing a **client-side seed simulation**, not the product backend, in the affected threads. Repair #10's 28/28 measured the simulation.
2. The real backend paths the failures *would* have exercised are **genuinely missing or unreachable** (confirmation, cancellation, location wiring) — so this is not "you tested the wrong thing."
3. Where real machinery exists, **broadcasts and transactions are misordered, concurrency is unlocked, and expiry is never enforced.**

---

## F01 — Message chronology changes after navigation

**VERIFIED root cause:** fabricated messages vanish on re-entry; nothing was reordered.

- In-session (seed path), `OpalApp.tsx:3780-3838` appends the user's message to thread state, then 280ms later `applySeedThreadIntelligence` → `paintIntel` (`:3712-3761`) appends two fabricated messages (`seed-peer-*` as fake Chanelle, `seed-opal-*` as Opal). Render order is array order → user's message appears **above** them.
- On re-entry, `openChat` rebuilds the thread from designed seed turns + `collectSeedLocalExtras` (`OpalApp.tsx:3594-3642`). The `isExtra` filter (`:3599-3604`) keeps only the user's own messages (`from === "me"`); fabricated `from: "them"` seed messages are dropped.
- Result: the user's message is now **below** everything. No timestamp/seq/sort logic moved anything — the messages beneath it ceased to exist.
- **Cleared:** server `history:sync` is `ORDER BY server_seq ASC` (`conversation_channel.ex:212-239`); seq assignment is atomic via `FOR UPDATE` (`messages.ex:564-604`); live client merge dedupes + sorts deterministically (`OpalApp.tsx:1736-1758`).

## F02 — Opal intervention disappears after leaving the thread

**VERIFIED root cause:** the intervention was never persisted anywhere.

- The exact text exists in exactly one place: `seedThreadIntelligence.ts:218` — a hardcoded string in the seed script.
- Painted via `setThreads` only (`OpalApp.tsx:3734-3737`). No DB write, no HTTP call, no channel event. `rememberSeedLocalMessage` (`:3566`) persists only `from === "me"`.
- The "timestamp" the founder saw was the literal string `time: "Now"`.
- "The underlying plan still appeared to continue" because plan chrome lives in separate state (`chats[].signalLabel/planProjection`, `confirmedTimesByChatId`), not in the thread.

## F03 — "Confirm" overflows the right edge of the message area

**SUSPECTED** (needs a phone screenshot; two candidates):
1. `ReservationExperiencePanel.tsx:141-159` — `.row-actions` (`styles.css:817`) is `display:flex` with no `flex-wrap` and no `min-width:0` on children; under large Dynamic Type / narrow viewports the "Confirm" button can push past the container edge.
2. Confirm-time sheet (`OpalApp.tsx:6483-6548`, `position:fixed; inset:0`) — on iOS WebView with keyboard open, fixed positioning tracks the layout viewport, not the visual viewport.
- **Cleared:** `.bubble` (`overflow:hidden`, `overflow-wrap:anywhere`), filament labels (ellipsis), `.journey-cta-row` (wraps).

## F04 — Incorrect cancellation authority and participant handling

**VERIFIED root cause:** "cancel" is a regex, not a state transition. No cancellation authority exists anywhere.

- Zero definitions of `cancel_plan` across `opal_core`, `opal_ai`, mobile, web.
- `AlignmentAuthority` (`social_flow/alignment_authority.ex:110-114`): `@cancel_patterns` (`cancel`, `not this time`, `not happening`) scanned over **any** message body by **any** sender; feeds `canceled?: true` into `AlignmentState.set_gate_satisfied?/1`, which merely blocks "Set" elevation. No plan-state mutation, no participant-state change, no notification, no role check.
- The one correct withdrawal primitive — `JourneyAuthority.cant_make_it/3` (`journey_authority.ex:96-149`), which sets `response_state: "withdrawn"` with `cancels_everyone: false` — is reachable only via `POST /journeys/:id/cant-make-it`. **Chat text has no route to it.**
- The only code setting `SharedPlan.status = "cancelled"` on user plans is `ConversationAlignment.reconcile_conversation_plans/1` — a system dedupe for duplicate plans, not a user cancel. (It has **zero callers** — dead code.)

## F05 — Repeated confirmation produces a dead-end loop

**VERIFIED — two compounding causes, one in the harness, one in the product:**

1. **Harness:** the founder's exact evidence strings are hardcoded in `seedThreadIntelligence.ts:206-221`. The `YES` regex (`:31-32`) is `^`-anchored with no mid-sentence "confirm" alternative → "I confirm." never matches. "Let's do 8 o'clock p.m." matches `TIME` but the counter-proposal branch requires `/free|after|before|works|can do|prefer|better|make/i` → falls through to the default branch, which returns the identical canned pair every turn. **No state exists to advance.**
2. **Product:** even outside seed, confirmation is unreachable. `SocialFlow.create_proposal_from_ai_result/1` (`social_flow.ex:32`) has no result type for "confirmation of a pending revision" (taxonomy at `contracts.ex:309-345` is closed). "I confirm" in chat → `message:send` → AI pipeline → LLM reply; never calls `SocialFlow.respond_to_revision/1`. The mobile "Accept change" button renders **without its `onAction` handler** (`ConversationScreen.tsx:~311` → `<SocialFlowSignalCard signal={signal}/>`; `SocialFlowSignalCard.tsx:47` `onPress={() => onAction?.(a.id, signal)}` = no-op). The backend channel event `social_flow:respond_revision` (`conversation_channel.ex:424`) exists but **no client code pushes it**. The revision stays `status: "proposed"` forever; the LLM keeps emitting "awaiting confirmation" copy because committed state never advances.
3. **Attribution violation:** the canned peer reply is painted with `humanSpeaker: true`, `senderDisplayName: "Chanelle"` (`OpalApp.tsx:3715-3723`) — a generated message presented as a real person's response, with no authentication or authorization.
4. **Structural solo-test trap:** `accept_committed_change` rejects self-confirmation (`:cannot_confirm_own_proposal`, `conversation_alignment.ex:510-511`) — a solo tester who proposes then confirms gets rejected, and the LLM layer re-prompts "until you confirm": structurally unresolvable.

## F06 — Unrelated conversation memory captures Opal Center

**VERIFIED — two compounding defects:**

1. **The search never ran.** `try_recommend` (`opal_intent.ex:472`) fires only on `suggest|recommend`, `where should`, `what should`, `ideas? for`, `find (something|somewhere|a place)`, `nearby`. "Find **Nighthawk** in Coronado" matches none → falls through to `intent: :chat`. **There is no named-venue search intent in the taxonomy.**
2. **Sticky re-engagement swallows the `:chat` turn.** `render_chat` (`opal_response.ex:1129`) → after Repair #10's `capability_question?` check → `is_binary(recent_who)` → `"You mentioned #{recent_who} earlier — want to keep going on that, or something new?"` (`:1159-1160`). "Something new." classifies as `:chat` again (matches none of the `switch_topic` patterns in `plan_context_patch.ex:860-880`) → identical prompt repeats. **Loop verified.** Repair #10's fix covers only "what can you help…" phrasings.
- **Precision:** this is *not* cross-namespace leakage — Center history assembly (`opal_context.ex:414`) reads only the Center thread. It is sticky re-engagement *within* Center's single per-user thread. `start_new_chat`/`clear_visible_conversation` exist but have no natural-language trigger.

## F07 — Location and geographic relevance are incomplete

**VERIFIED:** the pipeline is not wired into the Center chat at all. Neither the API nor the LLM is at fault.

| Layer | Status | Evidence |
|---|---|---|
| Device permission (mobile) | NOT_WIRED | zero `expo-location` imports; not in `package.json` |
| Device permission (web) | PARTIAL | `deviceLocation.ts` wraps `navigator.geolocation`; onboarding + Journey sheet only |
| Coords → Center chat | NOT_WIRED | `sendText` pushes `{schema_version, client_message_id, conversation_id, body, trace_id}` — no coords (`opalSocket.ts:62-68`); web `sendMessage` posts `{body, client_message_id}` only |
| Center request | NO COORDS | `ProviderAction.start_places_search` builds from destination text / venue name only (`center/provider_action.ex:20+`) |
| Geoapify construction | WIRED, destination-anchored | `filter=circle:<dest_lon>,<dest_lat>,<radius>` from server-side geocode of destination text; "no home-location bias" |
| Distance | ABSENT | no haversine in Center path; only haversine is a dead demo module (`Places.Midpoint`, zero callers, fake venues, `mode: :demo`) |
| UI origin indicator | NOT_WIRED | Center renders only "Checking {search_geography}…"; no device-vs-manual distinction |
| Near-me | HONEST GAP | intercepted pre-search (`action_orchestrator.ex:464-465`): "I can look for nearby ideas once location access is available" — no search launched, no fabrication |

**SUSPECTED fabrication-adjacent:** `OpalApp.tsx` `LocationPermissionSheet.onContinue` persists hardcoded `travel_minutes: 18` despite a comment claiming geometric computation.

---

## Cross-cutting architectural weaknesses (verified)

**W1 — Two authority systems on the same plan rows, contradictory rules.**
The conversation track (`SocialFlow`: membership-only auth, no organizer — `create_shared_plan` assigns `role: "participant"` to the creator, `social_flow.ex:522`; unlocked read-modify-write in `respond_to_revision`/`respond_to_option`) and the Journey track (`JourneyAuthority`: lead-only, `FOR UPDATE` locks, `expected_revision_id` staleness checks) both mutate `SharedPlan.status`, `current_revision_id`, `PlanParticipant` rows with no cross-check. `latest_plan` (`inserted_at` order) and `active_plan_for_conversation` (`updated_at` order) can select different "current" plans.

**W2 — Broadcast/transaction misordering (ghost plans / silent plans).**
`create_shared_plan`: `Repo.transaction` (`social_flow.ex:503`) → broadcast (`:563`) → `Publisher.record` failure → `Repo.rollback` (`:593`). Rollback cannot unsend the broadcast → both participants render a plan that was never persisted. Reverse: `approve_coordination`, `propose_revision`, `respond_to_revision` do insert/update → audit → broadcast with **no transaction** → state can commit while the chat-visible event never fires.

**W3 — Concurrency without locks.**
`respond_to_option` → `maybe_create_shared_plan_from_option`: in-memory all-accepted check, no `FOR UPDATE`, no `lock_version`, no unique constraint → two near-simultaneous accepts create two plans, or both see `:awaiting_others` and no plan is ever created (permanently stuck). Same in `respond_to_revision` → `apply_revision`. `upsert_plan` (`conversation_alignment.ex:1735-1770`) reads `plan_version` but never compares it.

**W4 — Expiry fields nothing reads.**
`Proposal.expires_at` stamped at `social_flow.ex:91`; zero readers; `approve_coordination`/`respond_to_option` gate on status only → days-old proposals can still convert. (`Collective.not_expired/1` enforces TTL only for group revisions.)

**W5 — LLM output can become de-facto state on the intelligence pipeline.**
Every persisted message runs `Pipeline.on_message_created` (`messages.ex:630`) → LLM-preferred extraction → `Reasoner` → `Executor` posts into the real thread. LLM-extracted `plan.confirm` passes a static name allowlist (`may_commit?`, `extractor.ex:228`) and the executor posts "Locked in!" (`reasoner.ex:100-106`, `executor.ex:111-113`) without calling `confirm_exact_time`, checking proposal state, or verifying authority. `plan.cancel` posts "Got it — I'll release this one." with no deterministic cancel behind it. The durable state machine (`ConversationAlignment`) is bypassed by this path. (Center pipeline is commit-before-render and sound; this is the direct-conversation pipeline.)

**W6 — Seed simulation spliced into the production path with name-based triggering.**
`seedChatKeyFrom` (`seedThreadIntelligence.ts:82-96`) matches display names (`chanelle|maya|alex|sabrina|juniper crew|saturday crew`) → fabrication engine fires for **real** conversations with those names, painting unauthenticated `humanSpeaker: true` peer messages. No stable thread identity across re-entry (four incompatible id schemes); re-entry merge silently drops a message class.

**W7 — Native mobile realtime is dead code with lethal latent bugs.**
`ConversationScreen.tsx:82` calls `connectSocket`, which throws (`opalSocket.ts:33-38`); `connectSocketWithSession` has zero callers; `MessageRepository.upsert` is a bare `INSERT` (UNIQUE violation on reconcile); `reconnectAfterMs: () => null` (no auto-reconnect). Not reachable from the founder's phone (WebView), but will bite on revival.

## Runner-ups (verified)

- "Change it" always targets the newest plan; no venue/title disambiguation; `reconcile_conversation_plans` (the dedupe) has zero callers.
- Push double-send on retry: `DeliverPushWorker` (`max_attempts: 3`, no Oban `unique`, no per-token completion record).
- Quiet-hours held notifications silently dropped: `flush_held/1` is a stub returning `{:ok, :empty}`; held items sit in node-local ETS, lost on restart.
- LLM recall cache 60s TTL with no invalidation on plan edits; `Cache.invalidate_account/1` has zero callers.
- Lock-screen push previews bypass `NotificationContent`'s minimal-body guarantee (`messaging/inbox.ex:41-53`).

## Checked and cleared

- Backend wrong-thread delivery: channel join verifies session + membership; `message:new` uses `broadcast_from!` on member-only topics; social_flow events filter by audience. No backend path broadcasts to the wrong topic.
- Cross-account isolation: every memory query carries `account_id`; `PromptBuilder.assert_scope!/2` raises on mismatch; no vector DB / embeddings exist.
- Delivery-ack dedup: `accept_message` idempotent on `client_message_id`; `record_delivery` dedups via unique constraint.
- Reservation honesty: `reservation_truth` hardcodes `not_requested` / `synthetic_default: true`; `get_place` returns `:not_implemented`. No real provider integrated — correctly non-claiming. **Preserve.**
- Python AI service: deterministic, stateless, no retrieval — no cross-thread leak possible there.
