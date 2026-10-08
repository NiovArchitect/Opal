# Paste E — Phase 0 Ground Truth

## Proactive surfaces → trigger points → caps

| Surface | Cap / trigger today | Exact code location |
|---|---|---|
| Nudge engine | Max **3/day** per account; quiet window `@quiet_start 8` / `@quiet_end 22` in worker comments; surfaces via `AttentionCenter.ingest` | `OpalCore.SocialMemory.Workers.MemoryHourlyWorker.surface_for_account/1` (`memory_hourly_worker.ex`); candidates from `SocialMemory.surface_nudges/1` |
| Proactive threads | **1/day**, quiet hours, permanent opt-out; closed trigger list | `OpalCore.Intelligence.ProactiveConversation.maybe_initiate/5` (`proactive_conversation.ex`) — checks `within_quiet_hours?`, `daily_cap_reached?`, opt-out |
| Mediation cards | On `consensus_status: "blocked"`; 7d dismiss; owner Center only | `OpalCore.Intelligence.GroupCoordinator.maybe_mediate_to_owner/1`; dismiss `GroupDecision.dismiss_mediation/2` |
| Reminder / temporal | Temporal anchors + CelebrationReminderWorker → AttentionCenter | `TemporalResolver`; `Celebrations.CelebrationReminderWorker`; hourly worker nudge path |
| Weekly briefing | Sunday-oriented worker; content in `weekly_briefings` | `OpalCore.SocialMemory.Workers.WeeklyBriefingWorker`; schema `WeeklyBriefing` |

**Gap:** No **global** AttentionBudget across surfaces (Paste E Phase 1).

## Onboarding / cold-start today

- Holy Shit / first-run Promise + Meet Opal conversation (see `topics/opal-holy-shit-first-run.md`).
- Opal Center chips: Plan / Remember / What's coming up?
- **No** dedicated "who do you see regularly / big dates" intelligence seed Q&A.
- Contact import: existing contacts permission paths elsewhere — reuse only if already granted (do not request new permission).

**Gap:** No `intelligence_maturity`; no accelerated learning seed prompt.

## known_facts shape (provenance)

`person_memories.known_facts` is a **map** (`:map` default `%{}`), entries like:

```elixir
%{"birthday" => %{"value" => "…", "source_message_id" => …, …}}
```

**Does NOT currently distinguish stated vs inferred vs observed.** Paste E Phase 4 adds `provenance`.

## Timezone / quiet hours

- `OpalCore.SocialFlow.AssistancePreference` (`user_assistance_preferences`): `timezone` (default `"UTC"`), `quiet_hours_start` `"22:00"`, `quiet_hours_end` `"08:00"`, `max_proactive_signals_per_day` default 3.
- ProactiveConversation quiet hours currently use fixed hour checks (see module) — travel mode must switch to **local** TZ.
- Home timezone: AssistancePreference.timezone; if unset → default `America/Los_Angeles` + log (Paste E travel).

## Preferences store for maturity / opt-out

- Use **AssistancePreference** (existing) — extend with `intelligence_maturity` and ensure proactive opt-out lives with ProactiveConversation's existing opt-out (do not create parallel prefs table).
- Proactive opt-out already in ProactiveConversation (`set_opt_out/2`).

## Observability today

- `OpalCore.Intelligence.FeedbackLoop` + tier logging / LlmAdapter token logging exist as point-in-time.
- **No** `intelligence_daily_metrics` table or daily aggregate Oban job.
- Verification suites are scripts under `shots/intelligence/*_VERIFY.json`.

## Rules reminder

- Do not modify LlmAdapter / SocialMemory core / PromptBuilder / EventSubscriber internals — **extend** via new modules/tables.
- Migrations additive only.
- Re-run five suites after each phase: LLM_VERIFY, MEMORY_LAYER leakage, TRANCHE_ONE, COORDINATOR, LEARNER.
