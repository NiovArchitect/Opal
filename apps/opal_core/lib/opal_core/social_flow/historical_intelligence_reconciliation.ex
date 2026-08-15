defmodule OpalCore.SocialFlow.HistoricalIntelligenceReconciliation do
  @moduledoc """
  Historical capability → current owner map (Pass 24).

  Machine-readable reconciliation so intelligence loss is visible.
  Status: present | partial | law_only | frozen | risk_duplicate | not_found
  """

  @rows [
    # Historical thesis
    {"conversation_first", "Messaging + SocialReality", "present", false, "Life starts in conversation"},
    {"micro_journey", "MicroJourney + Meaning", "present", false, "SF-3 compatibility helpers"},
    {"open_loop", "OpenLoop + Meaning.detect_open_loops", "present", false, nil},
    {"ambiguity", "Meaning + contracts", "present", false, nil},
    {"repair", "Meaning.detect_repair_opportunity", "present", false, nil},
    {"restraint_silence", "InterventionResolution + Restraint path", "present", false, "Silence valid"},
    {"flexible_participation", "GroupComposition / AlignmentAuthority", "present", false, "required vs optional"},
    {"required_optional", "INT-GROUP-001", "present", false, nil},
    {"relationship_continuity", "RelationshipMemory + continuity modules", "partial", false, "Need multi-day soak"},
    {"tradition_repeat", "SocialTradition", "partial", false, "Schema exists; product light"},
    {"private_memory", "Execution.MemoryStore + DurablePreferenceMemory", "present", false, nil},
    {"shared_memory", "SharedMemory + consent", "present", false, nil},
    {"selected_contact_authority", "Onboarding + RelationshipInvitation", "present", false, nil},
    {"family_context", "Family* modules", "present", false, "Not in Pass 10–23 smoke depth"},
    {"guardian_youth", "YouthCapabilityPolicy + guardian", "present", false, "SF safety path"},
    {"block_report", "TrustSafety", "present", false, nil},
    {"private_reminders", "YouthPrivateReminder / plan reminders", "partial", false, nil},
    {"provider_boundaries", "ExternalWorldTruth + ProviderAuthority", "present", false, nil},
    {"partner_relevance", "historical product law", "law_only", false, "Not ad feed"},
    {"group_coordination", "CollectiveComposition + GroupComposition", "present", false, nil},
    {"dynamic_social_intelligence", "DynamicIntelligence/*", "partial", false, "Phase modules present"},
    {"calendar_privacy", "AvailabilityComposition", "present", false, "Access ≠ disclosure"},
    {"private_first_extend", "ExperienceContinuation + OpalApp", "present", false, "PROVEN private-first tests"},
    {"private_place_select", "INT-AUTHOR-001", "present", false, nil},
    {"attention_compression", "AttentionAuthority", "present", false, nil},
    {"social_moment", "SocialMoment + Publishing", "present", false, nil},
    {"experience_graph", "ExperienceGraph", "present", false, nil},
    {"attribution", "AttributionGraph", "present", false, "Not live economic"},
    {"follow_discovery", "FollowGraph", "partial", false, "Structural; not Postgres durable"},
    {"experience_fork", "ExperienceFork", "partial", false, "Domain; SPA not full"},
    {"experience_field", "ExperienceField", "partial", false, "Not product-named surface"},
    {"execution", "ReservationExecution", "present", false, "Synthetic live claim false"},
    {"economic_qualification", "EconomicQualification", "present", false, "Live value NOT proven"},
    {"micro_journey_reward_law", "MicroJourney.prohibited_mechanics", "present", false, "No points/streaks"},
    # Potential duplicates / competing owners
    {"place_gap", "PlaceGap + SocialReality", "present", true, "Risk: client socialReality.ts mirror"},
    {"availability", "Availability* + AvailabilityComposition", "present", true, "Multiple availability modules"},
    {"curate", "UI + CollectivePlaceFit + ProviderVertical", "partial", true, "SPA still fixture-facing gaps"}
  ]

  def rows, do: @rows

  def table do
    Enum.map(@rows, fn {cap, owner, status, dup?, note} ->
      %{
        "historical_capability" => cap,
        "current_owner" => owner,
        "status" => status,
        "duplicated_risk" => dup? == true,
        "lost" => status == "not_found",
        "superseded" => false,
        "note" => note
      }
    end)
  end

  def lost do
    Enum.filter(table(), &(&1["lost"] == true))
  end

  def duplicated_risks do
    Enum.filter(table(), &(&1["duplicated_risk"] == true))
  end

  def present_count do
    Enum.count(table(), &(&1["status"] in ~w(present partial)))
  end

  def summary do
    t = table()

    %{
      "capability_rows" => length(t),
      "present_or_partial" => present_count(),
      "lost_count" => length(lost()),
      "duplicated_risk_count" => length(duplicated_risks()),
      "lost" => lost(),
      "duplicated_risks" => duplicated_risks(),
      "honest" => true,
      "note" => "present ≠ fully smoked under organism pressure"
    }
  end
end
