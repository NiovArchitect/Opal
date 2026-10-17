# Repair #15 — Track H: Proactivity Pass

Reference pattern (founder-shared): proactivity is structural — prepared
value SURFACES to the user instead of hiding inside screens the user must
remember to visit. QUIET law governs: nothing noisy, nothing presumptuous;
proactivity only within existing consent. No implementation below creates
a new outbound contact, a new notification category, or a new consent
surface.

## Audit method

For each proactive/preparatory mechanism in the backend: does a production
producer exist, does a surface consume it, and where does prepared value
die (computed-not-surfaced, surfaced-only-inside-a-screen, zero producers)?
Producer existence was verified by call-site search in `apps/opal_core/lib`
(test-only callers do not count as producers).

## Implemented (safe, already-consented preparations)

Both implementations live in `PlanCompletion.drive/3` — the existing
"drive a plan to completion" preparation pipeline (Repair #12), already
called at plan create (Center), plan confirm, and Center plan update. The
user already made/confirmed the plan; the only gap was preparation.

| # | Opportunity | Consent basis | Action taken |
|---|---|---|---|
| H1 | **TemporalFollowThrough had zero producers.** `TemporalFollowThrough.register/1` was called nowhere in production code (tests only). The Oban tick worker ran every minute, `AttentionAuthority` gated decisions, and `AttentionCenter.feed/2` merged `attention_for_user/2` — over an always-empty loop table, so no real plan could ever mature into the Attention Center. | The plan is the user's own confirmed plan; a follow-through loop creates NO notification and NO contact — AttentionAuthority still decides if/when anything surfaces, and its laws (age alone never elevates, past plans get no future attention) are untouched. | `PlanCompletion` step (e) `follow_through`: for a future plan with a canonical start (derived by the existing `PlanStateArbitration.canonical_start/1` authority — `shared_plans.start_at` or the alignment's resolved date + exact time), register a `plan_approach` loop: participants from `PlanParticipant`, responsibility = plan creator, idempotency key per plan+version+start (reschedule-safe; the R13 invalidation of prior-version loops is untouched). Past start → `skipped_past`; no derivable start → `skipped_no_start` (honest, never guessed). Maturation is quiet by design: far = silent, ≤24h = ambient, "due" only ≤1h with an unresolved place dependency (recorded as `place_unresolved` metadata). |
| H2 | **ProductShell Coming Up had zero producers.** `ProductShell.upsert_coming_up/1` / `record_recent_change/1` were called nowhere in production code (tests only), while `home_snapshot/1` and `plans_snapshot/1` read `ShellComingUpItem` rows — so a user's real plans never appeared on their Home / Plans "coming up" unless some screen manually wrote the row. The plan was prepared (created, calendared, searched) but buried in the conversation/Center screen that created it. | The projection is owner-scoped to the plan's own participants, showing them their own plan (title, when/where labels from the plan row). No new audience, no contact, no ranking/guilt fields (the shell contract's `no_progress_percent` etc. are unchanged). | `PlanCompletion` step (f) `coming_up`: upsert one coming-up item per participant (creator + `PlanParticipant` rows), keyed `cu-<owner>-plan-<plan_id>` so re-driving updates labels instead of duplicating. State from the plan itself: tentative → `needs_confirmation`, starting today → `today`, else `upcoming`. Past plans are never projected forward (`skipped_past`). |

Tests: `repair15_proactivity_test.exs` (fresh randomized accounts) —
loop registered with correct kind/participants/responsibility/start and
quiet far maturity; re-drive idempotent (one loop, one coming-up row,
`already_registered`); coming-up reaches participants only, never an
outsider; past plan → no loop + no projection; no-start plan →
`skipped_no_start`; conversation-shaped alignment derives its canonical
start (plan_version carried through). All 6 pass; full backend suite on
this branch: **2,682 tests, 0 failures** (`mix test --seed 0`).

## Audited, already working (no gap found)

| Surface | Finding |
|---|---|
| Attention Center (`AttentionCenter.feed/2`) | Real producer/consumer pair: merges durable items + TFT + pending-plan change proposals. Its only starved input was TFT loops — fixed by H1. Pending-plan proposals already project without a screen visit. |
| Celebrations | `CelebrationReminderWorker` (daily 09:00 UTC cron) produces reminders from user-created celebrations with `mark_reminded` dedupe; `CelebrationCuration` computes days-until. Consented (user created the celebration), already surfaced. No change. |
| Weekly briefing / memory workers | `WeeklyBriefingWorker` publishes to Opal Center on a Sunday cron; `MemoryHourlyWorker`, digest, trip bookend workers all have cron producers. No change. |
| Plan completion steps (a)–(d) | Calendar projection, Geoapify restaurant discovery, ride/directions next-step offers already run at create/confirm via `PlanCompletion.drive/3` and persist on the plan row. H1/H2 extend the same pipeline. |
| Change-proposal expiry (F12-58) | Stale proposals already retire themselves at fold presentation time. No change. |
| Oracle (`oracle.ex`) | Pull-only by design (grounded answers to asked questions, member-scoped, never invents). Making it push would violate the QUIET law; left as-is deliberately. |

## Proposals (NOT implemented — consent question named)

| # | Opportunity | Why not implemented | Consent question for the founder |
|---|---|---|---|
| P1 | **ProactiveConversation has zero production callers.** `maybe_initiate/5` (closed trigger list, 1/day cap, quiet hours 8–22, 7-day activity gate, `proactive_opt_out`) is fully built and law-gated but nothing ever calls it — Opal never opens a prepared thread. | Wiring a caller creates NEW OUTBOUND CONTACT (Opal starts a conversation), which this track's scope explicitly forbids. | Should any trigger (e.g. `temporal_anchor_3d` for a plan the user already confirmed) be wired to actually open threads under the existing caps/opt-out, and if so, which trigger first? |
| P2 | **Chat-born plans never run PlanCompletion.** `ConversationAlignment.sync_conversation/1` materializes plans from chat, but `drive/3` is only called from Center/confirm endpoints — a plan locked entirely in chat gets no calendar projection, restaurant discovery, TFT loop, or coming-up row until some other path touches it. | Calling `drive/3` inside the fold/sync transaction would run provider-job creation and calendar writes inside a replayed projection (side effects in a gyroscope read path) and inside the sync transaction. The safe shape is a post-sync hook at the action endpoints (confirm/lock), which touches controller/channel flows beyond this track's files. | Should chat plan-lock endpoints (place confirm, exact-time lock) trigger `PlanCompletion.drive/3` post-sync, accepting a places search may start from a chat lock? |
| P3 | **`ProductShell.record_recent_change/1` also has no producer** — Home's "recent changes" is as empty as coming-up was. | A truthful producer must hook every material plan mutation (revision accept, schedule change, cancel) with per-owner copy; half-wiring it to `drive/3` only would present an incomplete change history as complete. | Is a drive-time-only recent-changes feed acceptable as a first step, or should it wait for the revision-chain hook? |
| P4 | **TFT kinds `waiting_on` / `open_question` / `execution` have no producers** — loops for "I'll know Friday" style commitments exist only when a caller registers them; conversation extraction never does. | Registering loops from chat text is a presumption about what counts as a commitment (QUIET law: weak intent must not create a reminder — a stated TFT law). It needs an explicit commitment signal, not a text guess. | What counts as a registrable commitment — only explicit in-product actions (e.g. a "remind me / I'll confirm by Friday" button), or also confirmed plan changes? |
| P5 | **Celebration preparation stops at a reminder.** `CelebrationCuration` knows days-until and the person; gift/plan ideas are computed nowhere and would surface only if the user opens the celebration. | Preparing gift/plan suggestions is generative content about a third party; surfacing it unprompted goes beyond the reminder the user consented to when creating the celebration. | Should an upcoming celebration quietly prepare suggestions inside the celebration surface (pull), or may it also place an item in the Attention Center (push within the app)? |

## Invariants held

- No new notification categories, no push/email/SMS sends, no proactive
  threads opened.
- `users.proactive_opt_out` scope is unchanged: it governs proactive
  thread initiation (P1), which was not wired. H1/H2 create no threads.
- Attention interruption decisions remain exclusively
  `AttentionAuthority`'s; H1 only feeds it the input it was built for.
- Gyroscope: H1 reads the plan row + arbitration authority; H2 writes the
  shell's own projection rows keyed to the plan — neither creates a second
  plan state.
