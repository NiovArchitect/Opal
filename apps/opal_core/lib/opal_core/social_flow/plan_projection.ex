defmodule OpalCore.SocialFlow.PlanProjection do
  @moduledoc """
  Gyroscope — the single-projection-store registry (Repair #13, W6).

  Every read path that renders plan / proposal / revision state must read the
  single source of truth — the `shared_plans`, `social_flow_proposals`, and
  `plan_revisions` rows — never a per-surface shadow copy. This module is the
  registry of sanctioned readers.

  Two enforcement mechanisms:

  1. `PlanProjectionCoherenceTest` "read-path registry" test scans
     `apps/opal_core/lib/**/*.ex` for plan-table query patterns and FAILS if
     a file queries plan tables without being listed in `read_files/0`.
     A new surface must register its reader (or be removed) before it ships.
  2. The coherence test mutates a plan through the transition gate and reads
     it back through every function in `read_functions/0`, asserting identical
     state — proving no reader holds a stale copy.

  Derived projections (caches) are allowed ONLY with a wired invalidation
  path. The one that exists:

  - `OpalCore.SocialMemory.Cache` (ETS recall cache, 60s TTL) — invalidated
    at the single post-commit choke point `SocialFlow.broadcast_plan/4`, so
    every committed plan mutation clears it. See `invalidate_derived/0`.

  The audit that produced this registry lives in
  `shots/repair13/GYROSCOPE.md` ("Projection coherence audit").
  """

  # Files (relative to apps/opal_core/lib) permitted to query plan tables.
  # Anything else matching the scan patterns fails the registry test.
  # Verified 2026-10-16: every entry below was read and confirmed to query
  # the single store (shared_plans / social_flow_proposals / plan_revisions)
  # directly — no per-surface shadow copies exist. Audit notes live in
  # shots/repair13/GYROSCOPE.md ("Projection coherence audit").
  @read_files ~w(
    lib/opal_core/artifacts.ex
    lib/opal_core/celebration_curation.ex
    lib/opal_core/center/action_orchestrator.ex
    lib/opal_core/center/planning_context.ex
    lib/opal_core/center/provider_action.ex
    lib/opal_core/intelligence/executor.ex
    lib/opal_core/messages.ex
    lib/opal_core/opal_context.ex
    lib/opal_core/oracle.ex
    lib/opal_core/social_flow.ex
    lib/opal_core/social_flow/attention_center.ex
    lib/opal_core/social_flow/conversation_alignment.ex
    lib/opal_core/social_flow/follow_through.ex
    lib/opal_core/social_flow/founder_graph_commitment_seed.ex
    lib/opal_core/social_flow/journey_authority.ex
    lib/opal_core/social_flow/meaning.ex
    lib/opal_core/social_flow/plan_agreement_taste_bridge.ex
    lib/opal_core/social_flow/plan_completion.ex
    lib/opal_core/social_flow/plan_execution.ex
    lib/opal_core/social_flow/temporal_habit_miner.ex
    lib/opal_core/social_flow/temporal_habit_miner_worker.ex
    lib/opal_core/trips.ex
    lib/opal_core_web/controllers/plan_execution_controller.ex
  )

  # Precise query patterns the registry test scans for: Ecto `from`
  # bindings and direct Repo reads against the plan schemas. Mere mentions
  # (aliases, typespecs, comments, schema definitions) do NOT match — only
  # real reads.
  @scan_patterns [
    ~r/in (SharedPlan|PlanRevision|Proposal)[^a-zA-Z_]/,
    ~r/Repo\.(get|get!|get_by|one!)\((SharedPlan|PlanRevision|Proposal)[,)]/
  ]

  @doc "Source files sanctioned to query plan tables."
  def read_files, do: @read_files

  @doc "Substrings the registry test scans for."
  def scan_patterns, do: @scan_patterns

  @doc """
  Sanctioned read functions returning plan state. Each entry is
  `{module, function, arity, note}`. The coherence test exercises the
  primary ones; the list documents the full sanctioned surface.
  """
  def read_functions do
    [
      {OpalCore.SocialFlow, :sync_for_user, 2, "chat surface: proposals+plans+revisions"},
      {OpalCore.SocialFlow, :list_plans_for_user, 2, "Center surface: plan list"},
      {OpalCore.SocialFlow, :get_plan_for_user, 2, "single plan read"},
      {OpalCore.SocialFlow.ConversationAlignment, :active_plan_for_conversation, 1,
       "fold current-plan ordering (latest_plan/1 delegates to it)"},
      {OpalCore.SocialFlow.SharedPlan, :to_contract, 2, "canonical plan contract"},
      {OpalCore.SocialFlow.SharedPlan, :viewer_card, 3, "per-viewer plan card"},
      {OpalCore.SocialFlow.JourneyAuthority, :project, 3, "journey projection"},
      {OpalCore.Center.PlanningContext, :get_for_user, 1, "center in-flight planning state"},
      {OpalCore.SocialFlow.PlanTransition, :tables, 0, "the transition table itself"}
    ]
  end

  @doc """
  Derived (cached) projections of plan state and their invalidation path.
  Every entry must name the single choke point that clears it.
  """
  def derived_projections do
    [
      %{
        module: OpalCore.SocialMemory.Cache,
        kind: "ETS recall cache, 60s TTL, keyed {account_id, conversation_id}",
        invalidated_at:
          "PlanProjection.invalidate_derived/2 — called post-commit from " <>
            "SocialFlow.broadcast_plan/4 (chat track) and " <>
            "JourneyAuthority.material_change/3 (journey track)"
      }
    ]
  end

  @doc """
  Clear every derived projection of plan state for a conversation.

  THE single choke point: every committed plan mutation path calls this
  after commit (never inside the transaction — a rollback must not leave a
  phantom invalidation, though a phantom would only cause a recompute).
  Invalidation is idempotent; a miss recomputes from the single store.
  """
  def invalidate_derived(conversation_id, member_user_ids)
      when is_binary(conversation_id) and is_list(member_user_ids) do
    for uid <- member_user_ids, is_binary(uid) do
      OpalCore.SocialMemory.Cache.invalidate(uid, conversation_id)
    end

    :ok
  end
end
