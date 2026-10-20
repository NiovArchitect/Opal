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
  # Added 2026-10-17 (B1): conversation_controller.ex reads the single
  # store to attach SharedPlan.place_projection/1 (the ONE explicit place
  # projection) to the thread alignment payload — audited: it renders the
  # row through that single projection and derives nothing itself.
  # Added 2026-10-18 (DIR-1): social_flow/next_plan.ex is the ONE
  # derivation of the shared upcoming plan fact for the conversations,
  # thread, and call-log contracts — audited: it queries the single
  # store (shared_plans + plan_participants) directly, renders place
  # through SharedPlan.place_projection/1 and participant sets through
  # SocialFlow.plan_participant_ids/1, and keeps no shadow copy.
  # Added 2026-10-18 (DIR-4): social_flow/reveal.ex is the ONE
  # proactive reveal derivation - audited: it queries the single
  # store directly, renders place through SharedPlan.place_projection/1
  # and participant sets through SocialFlow.plan_participant_ids/1,
  # and keeps no shadow copy.
  # Added 2026-10-18 (adoption wave 1): graph_people.ex is the ONE
  # derivation for intentions progress, goal status, shelf starters,
  # and the holding counters — audited: it queries the single plan
  # store directly and keeps no shadow copy; plan_history.ex is the
  # ONE derivation of a plan's own history + Who list — audited: it
  # reads the plan row, its audit events, its revisions, and its
  # participant rows, and takes counts/names from JourneyAuthority.
  # Added 2026-10-19 (R19 W1): social_flow/human_seed_world.ex — the
  # seed-gated human review world layered on the founder graph seed.
  # Audited: its plan-table queries are seed idempotency lookups
  # (find-by conversation+title, participant presence) against the
  # single store; it renders nothing and keeps no shadow copy — every
  # surface still derives state from the rows through the ONE
  # derivations above.
  @read_files ~w(
    lib/opal_core/artifacts.ex
    lib/opal_core/graph_people.ex
    lib/opal_core/celebration_curation.ex
    lib/opal_core/center/action_orchestrator.ex
    lib/opal_core/center/now_strip.ex
    lib/opal_core/center/planning_context.ex
    lib/opal_core/center/provider_action.ex
    lib/opal_core/intelligence/executor.ex
    lib/opal_core/messages.ex
    lib/opal_core/opal_context.ex
    lib/opal_core/oracle.ex
    lib/opal_core/social_flow.ex
    lib/opal_core/social_flow/attention_center.ex
    lib/opal_core/social_flow/checkin.ex
    lib/opal_core/social_flow/conversation_alignment.ex
    lib/opal_core/social_flow/follow_through.ex
    lib/opal_core/social_flow/founder_communication_seed.ex
    lib/opal_core/social_flow/founder_graph_commitment_seed.ex
    lib/opal_core/social_flow/human_seed_world.ex
    lib/opal_core/social_flow/home_projection.ex
    lib/opal_core/social_flow/household_context.ex
    lib/opal_core/social_flow/households.ex
    lib/opal_core/social_flow/journey_authority.ex
    lib/opal_core/social_flow/meaning.ex
    lib/opal_core/social_flow/next_plan.ex
    lib/opal_core/social_flow/non_response_etiquette.ex
    lib/opal_core/social_flow/orbit_projection.ex
    lib/opal_core/social_flow/plan_agreement_taste_bridge.ex
    lib/opal_core/social_flow/plan_completion.ex
    lib/opal_core/social_flow/plan_execution.ex
    lib/opal_core/social_flow/reveal.ex
    lib/opal_core/social_flow/plan_history.ex
    lib/opal_core/social_flow/temporal_habit_miner.ex
    lib/opal_core/social_flow/temporal_habit_miner_worker.ex
    lib/opal_core/trips.ex
    lib/opal_core_web/controllers/conversation_controller.ex
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
      {OpalCore.SocialFlow.SharedPlan, :plan_media_authorized?, 2,
       "Repair #19 BS-05: existence-only media byte authorization for the plan's own people (renders no plan state)"},
      {OpalCore.SocialFlow.JourneyAuthority, :project, 3, "journey projection"},
      {OpalCore.SocialFlow.HomeProjection, :from_alignment, 4,
       "chats list / thread / graphs card projection; Repair #18 attendance " <>
         "counter (going/total/viewer_state from PlanParticipant rows via " <>
         "JourneyAuthority.attendance_contract/2) and the F18-03 conflict " <>
         "object via SocialFlow.plan_conflict/1 for plan-backed cards"},
      {OpalCore.SocialFlow.HouseholdContext, :suggestion_candidates, 1,
       "Repair #18 B5: suggestion candidate shapes derived read-time from the single plan store"},
      {OpalCore.SocialFlow.Households, :open_supply_plan?, 2,
       "Repair #18 B5: open pod supply plan read from the single plan store"},
      {OpalCore.SocialFlow.NextPlan, :for_conversation, 3,
       "Repair #18 DIR-1: the one shared upcoming plan fact for the chats list and thread contracts"},
      {OpalCore.SocialFlow.NextPlan, :for_peer, 3,
       "Repair #18 DIR-1: the one shared upcoming plan fact for the call-log contract"},
      {OpalCore.SocialFlow.LeaveBy, :for_plan, 3,
       "Polish Cluster G (P10c): the one leave-by derivation - reads the viewer's own PlanLocationShare row and the plan row handed to it (queries no plan tables itself); routed travel time comes from Places.TravelTime through the places gateway"},
      {OpalCore.SocialFlow.Reveal, :for_viewer, 2,
       "Repair #18 DIR-4: the one proactive reveal derivation for deck, thread, and chats list"},
      {OpalCore.SocialFlow.Reveal, :for_conversation, 3,
       "Repair #18 DIR-4: conversation-scoped reveal derivation"},
      {OpalCore.SocialFlow.NonResponseEtiquette, :projection_for, 3,
       "Founder Polish Wave Cluster I (P13/P14): the one etiquette/limbo projection for a plan's pending request, read from the single plan store + the participant's own row"},
      {OpalCore.SocialFlow.NonResponseEtiquette, :viewer_projection, 3,
       "I2 etiquette wiring: the per-viewer etiquette projection the plan contract carries (projection_for/3 when the lifecycle is open; the same window truth from the pending participant row when it is not) - read from the single plan store only"},
      {OpalCore.GraphPeople, :intention_projection, 2,
       "Repair #18 adoption wave 1 (ST-A): the one intention progress projection, derived from real plans with that person"},
      {OpalCore.GraphPeople, :goal_projection, 2,
       "Repair #18 adoption wave 1 (4.C10): the one goal status projection, derived from linked plans only"},
      {OpalCore.GraphPeople, :holding, 1,
       "Repair #18 adoption wave 1 (4.C1): the one holding counter set, read from the same stores the surfaces read"},
      {OpalCore.SocialFlow.PlanHistory, :for_plan, 2,
       "Repair #18 adoption wave 1 (ST-G): the one plan history + Who projection, from the plan's own records and JourneyAuthority"},
      {OpalCore.SocialFlow.NextPlan, :all_for_conversation, 3,
       "Repair #20 F-19: every upcoming plan fact for a conversation (the one pick's own pipeline, list form) for the orbit ring"},
      {OpalCore.SocialFlow.NextPlan, :past_for_conversation, 3,
       "Repair #20 amendment (Orbit Projection v2): a conversation's past/settled plan facts - the same candidate scope and per-viewer vault filter as the upcoming pipeline, past defined as not-upcoming under the same L8 rule"},
      {OpalCore.SocialFlow.NonResponseEtiquette, :limbo_recipients, 2,
       "Repair #20 F-19: the etiquette machinery's own limbo recipients for one plan (stage set + window fraction from the machinery itself)"},
      {OpalCore.SocialFlow.OrbitProjection, :for_conversation, 3,
       "Repair #20 F-19: the orbit screen's one projection - a thread's parties, its plans (via NextPlan.all_for_conversation), per-party pending (participant rows' canonical states) and limbo (via NonResponseEtiquette.limbo_recipients)"},
      {OpalCore.Center.PlanningContext, :get_for_user, 1, "center in-flight planning state"},
      {OpalCore.Center.NowStrip, :plan_events, 3,
       "Center header strip: live plan commitments in window (Repair #17 W4-6)"},
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

  # ------------------------------------------------------------------
  # Repair #18 SM scoped build - GYRO-01 kernel registry for the
  # personal-memory capsule class, in this registry's pattern. The
  # plan registry above governs plan tables; this is the capsule
  # class's own read registry: the files sanctioned to query the
  # capsule table (`memory_capsules`), and the one mediated read
  # facade every capsule consumer must go through. The SM isolation
  # suite scans lib/ against `capsule_read_files/0` exactly the way
  # the plan coherence test scans against `read_files/0` - a new
  # direct capsule reader fails until it is registered here, and
  # registration is a founder-visible event.
  @capsule_read_files ~w(
    lib/opal_core/memory_wallet/capsule_read.ex
    lib/opal_core/memory_wallet/personal_memory_capsule.ex
    lib/opal_core/memory_wallet.ex
    lib/opal_core/memory_wallet/wallet.ex
    lib/opal_core/memory_wallet/memory_capsule.ex
  )

  @doc "Source files sanctioned to touch the capsule table or the capsule object (SM build)."
  def capsule_read_files, do: @capsule_read_files

  @doc """
  The sanctioned capsule read surface. Every entry is a mediated
  read through the ONE facade - there is no other capsule read
  function in the product for the covered class.
  """
  def capsule_read_functions do
    [
      {OpalCore.MemoryWallet.CapsuleRead, :list_for_owner, 2,
       "SM: the one strict mediated capsule read (owner + scope + purpose + expiry; unrecognized scope fails closed)"},
      {OpalCore.MemoryWallet.CapsuleRead, :list_for_owner_browse, 1,
       "SM: the owner's own Settings browse read, through the same facade"},
      {OpalCore.MemoryWallet.CapsuleRead, :read_one, 3,
       "SM: one capsule by id through the same mediation; foreign reads are not_found"},
      {OpalCore.MemoryWallet.ScopedContext, :assemble, 2,
       "SM: the one scoped-context assembly for capsules (LLM prompt + packages), built only from the facade's reads"},
      {OpalCore.MemoryWallet.ScopedContext, :assemble_many, 2,
       "Repair #20 amendment (Orbit Sameness fix): the same assembly over several named contexts for one account (conversation + dyad relationship), deduplicated by capsule id, built only from the facade's reads"}
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
