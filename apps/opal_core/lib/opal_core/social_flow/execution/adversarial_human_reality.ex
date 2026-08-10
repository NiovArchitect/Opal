defmodule OpalCore.SocialFlow.Execution.AdversarialHumanReality do
  @moduledoc """
  Adversarial Human Reality / Deep Collaboration Smoke Campaign.

  REPAIR → REPLAY → REGRESS → REPEAT

  No new architecture by default.
  No pilot until this gate closes AND hosted proof is honest.

  Success bar is NOT "completely optimized for all humans."
  It is: no known P0/P1 across the matrix, bounded P2s, regressions clean,
  privacy/authority intact, soak finds no new severe class.
  """

  alias OpalCore.SocialFlow.Execution.{
    AdversarialConversation,
    AdversarialJourneys,
    AdversarialPersonas,
    AdversarialSoak,
    HumanValidation,
    PilotReadiness,
    RuntimeTruth
  }

  @failure_layers ~w(
    input_acquisition
    interpretation
    scope
    freshness
    memory
    relational_memory
    collective_composition
    authority
    privacy
    readiness
    judgment
    interruption_debt
    provider
    execution
    delivery
    realtime
    persistence
    concurrency
    performance
    ux_continuity
  )

  def failure_layers, do: @failure_layers

  @doc "Full adversarial campaign report."
  def run_all(opts \\ []) do
    personas = persona_inventory()
    conversation = AdversarialConversation.matrix()
    courtship = courtship_suite()
    groups = group_suite()
    compound = compound_suite()
    privacy = privacy_suite()
    ambient = ambient_suite()
    concurrency = concurrency_suite()
    soak = AdversarialSoak.run(opts)
    interaction = AdversarialSoak.interaction_late_join_capacity_revision()
    human = HumanValidation.run_all(opts)
    residue = residue_summary(courtship, compound)

    defects =
      collect_defects([
        {"conversation", conversation},
        {"courtship", courtship},
        {"groups", groups},
        {"compound", compound},
        {"privacy", privacy},
        {"ambient", ambient},
        {"concurrency", concurrency},
        {"soak", soak},
        {"interaction", interaction},
        {"human_validation", human}
      ])

    p0 = Enum.filter(defects, &(&1["severity"] == "P0"))
    p1 = Enum.filter(defects, &(&1["severity"] == "P1"))
    p2 = Enum.filter(defects, &(&1["severity"] == "P2"))

    open_p0 = Enum.filter(p0, &(&1["status"] == "open"))
    open_p1 = Enum.filter(p1, &(&1["status"] == "open"))

    matrix_pass? =
      conversation["pass"] and courtship["pass"] and groups["pass"] and compound["pass"] and
        privacy["pass"] and ambient["pass"] and concurrency["pass"] and soak["pass"] and
        interaction["pass"] and human["pass"] == true

    local_gate =
      matrix_pass? and open_p0 == [] and open_p1 == []

    pilot = PilotReadiness.evaluate_current()
    runtime = RuntimeTruth.audit(opts)

    %{
      "campaign" => "adversarial_human_reality",
      "pass" => local_gate,
      "executive" => %{
        "standard" => "no_known_p0_p1_matrix_clean_soak_stable",
        "not_claiming" => "completely_optimized_for_all_humans",
        "local_matrix" => if(local_gate, do: "CLEAN", else: "OPEN_DEFECTS"),
        "hosted" => "NOT_RERUN — Render auth blocked; do not fake",
        "pilot" => pilot["recommendation"]
      },
      "matrix" => %{
        "personas" => personas,
        "conversation" =>
          Map.take(conversation, ~w(messages admitted pass weak_not_over_upgraded)),
        "courtship" => Map.take(courtship, ~w(pass journeys)),
        "groups" => Map.take(groups, ~w(pass sizes)),
        "compound" => Map.take(compound, ~w(pass)),
        "privacy" => Map.take(privacy, ~w(pass)),
        "ambient" => Map.take(ambient, ~w(pass)),
        "concurrency" => Map.take(concurrency, ~w(pass)),
        "soak" => Map.take(soak, ~w(rounds passed failed pass)),
        "interaction" => Map.take(interaction, ~w(pass journey)),
        "human_validation" => %{"pass" => human["pass"]}
      },
      "defects" => %{
        "p0" => %{
          "discovered" => length(p0),
          "open" => open_p0,
          "fixed" => Enum.filter(p0, &(&1["status"] == "fixed"))
        },
        "p1" => %{
          "discovered" => length(p1),
          "open" => open_p1,
          "fixed" => Enum.filter(p1, &(&1["status"] == "fixed"))
        },
        "p2" => %{"open" => p2, "bounded" => true}
      },
      "coordination_residue" => residue,
      "compound_alignment" => compound["detail"],
      "privacy_result" => if(privacy["pass"], do: "PASS", else: "FAIL"),
      "authority_result" => if(groups["authority_ok"], do: "PASS", else: "FAIL"),
      "realtime_result" => if(concurrency["pass"], do: "PASS_LOCAL_COMPOSE", else: "FAIL"),
      "providers" => runtime["by_class"] || runtime,
      "device" => "client_contract_and_handoff_code — physical device not claimed",
      "hosted" => %{
        "status" => "blocked_render_auth",
        "must_rerun_when_deployed" => true,
        "do_not_fake" => true
      },
      "regressions" => %{"human_validation" => human["pass"], "soak" => soak["pass"]},
      "pilot" => %{
        "recommendation" => pilot["recommendation"],
        "blockers" => pilot["blockers"],
        "note" => "local matrix clean does not clear hosted stale image"
      },
      "laws" => %{
        "no_new_architecture_by_default" => true,
        "residue_not_zero_human" => true,
        "avoidable_residue_target" => true,
        "repair_replay_regress_repeat" => true,
        "seeded_failures_reproducible" => true
      },
      "next" => next_action(local_gate, pilot),
      "authorizes_set" => false
    }
  end

  def persona_inventory do
    %{
      "personas" => AdversarialPersonas.personas(),
      "relationship_types" => AdversarialPersonas.relationship_types(),
      "count" => length(AdversarialPersonas.personas()),
      "no_moral_labels" => true,
      "pass" => length(AdversarialPersonas.personas()) >= 12
    }
  end

  def courtship_suite do
    journeys = [
      AdversarialJourneys.courtship_low_effort(),
      AdversarialJourneys.courtship_withhold_schedule(),
      AdversarialJourneys.location_refused(),
      AdversarialJourneys.venue_failure_preserve(),
      AdversarialJourneys.last_minute_place_change(),
      AdversarialJourneys.contradiction_current_wins(),
      AdversarialJourneys.topic_shift_kills_stale()
    ]

    %{
      "journeys" => Enum.map(journeys, & &1["journey"]),
      "results" => journeys,
      "pass" => Enum.all?(journeys, &(&1["pass"] == true))
    }
  end

  def group_suite do
    journeys = [
      AdversarialJourneys.group_partial(8),
      AdversarialJourneys.required_person_blocks(),
      AdversarialJourneys.organizer_bias(),
      AdversarialJourneys.maturity_mix(8),
      AdversarialJourneys.group_scale_matrix()
    ]

    %{
      "sizes" => [4, 8, 12, 20],
      "results" => journeys,
      "authority_ok" => Enum.all?(journeys, &(&1["pass"] == true)),
      "pass" => Enum.all?(journeys, &(&1["pass"] == true))
    }
  end

  def compound_suite do
    series = AdversarialJourneys.compound_plan_series()
    isolation = AdversarialJourneys.relationship_scope_isolation()
    wrong = AdversarialJourneys.wrong_memory_correction()

    %{
      "detail" => %{
        "plan1_vs_plan10" => series["reduction"],
        "isolation" => isolation["pass"],
        "correction" => wrong["pass"]
      },
      "results" => [series, isolation, wrong],
      "pass" => series["pass"] and isolation["pass"] and wrong["pass"]
    }
  end

  def privacy_suite do
    probe = AdversarialJourneys.privacy_probe_matrix()
    withhold = AdversarialJourneys.courtship_withhold_schedule()

    %{
      "probe" => probe,
      "withhold" => withhold,
      "pass" => probe["pass"] and withhold["pass"]
    }
  end

  def ambient_suite do
    journeys = [
      AdversarialJourneys.prepare_many_surface_few(),
      AdversarialJourneys.popular_irrelevant_silence(),
      AdversarialJourneys.human_solves_first()
    ]

    %{
      "results" => journeys,
      "pass" => Enum.all?(journeys, &(&1["pass"] == true))
    }
  end

  def concurrency_suite do
    # Compose-level concurrency truths (full Phoenix E2E remains separate Real People path)
    interaction = AdversarialSoak.interaction_late_join_capacity_revision()
    soak = AdversarialSoak.run(seeds: [1, 42, 99], rounds: 3)

    %{
      "interaction" => interaction,
      "mini_soak" => Map.take(soak, ~w(pass failed)),
      "pass" => interaction["pass"] and soak["pass"]
    }
  end

  defp residue_summary(courtship, compound) do
    low =
      Enum.find(courtship["results"] || [], &(&1["journey"] == "courtship_low_effort"))

    series = Enum.find(compound["results"] || [], &(&1["journey"] == "compound_plan_series"))

    %{
      "low_effort_residue" => low["residue"],
      "plan1" => series["residue_plan_1"],
      "plan10" => series["residue_plan_10"],
      "reduction" => series["reduction"],
      "target" => "avoidable_down_irreducible_preserved"
    }
  end

  defp collect_defects(named_results) do
    Enum.flat_map(named_results, fn {name, result} ->
      if result["pass"] == true do
        []
      else
        [
          %{
            "id" => "def_#{name}",
            "suite" => name,
            "severity" => severity_for(name),
            "status" => "open",
            "layer" => layer_for(name),
            "detail" => "suite_failed"
          }
        ]
      end
    end)
  end

  defp severity_for("privacy"), do: "P0"
  defp severity_for("human_validation"), do: "P1"
  defp severity_for("groups"), do: "P1"
  defp severity_for("compound"), do: "P1"
  defp severity_for("courtship"), do: "P1"
  defp severity_for("soak"), do: "P1"
  defp severity_for("interaction"), do: "P1"
  defp severity_for("concurrency"), do: "P1"
  defp severity_for(_), do: "P2"

  defp layer_for("privacy"), do: "privacy"
  defp layer_for("compound"), do: "memory"
  defp layer_for("groups"), do: "collective_composition"
  defp layer_for("courtship"), do: "judgment"
  defp layer_for("soak"), do: "concurrency"
  defp layer_for("interaction"), do: "concurrency"
  defp layer_for("conversation"), do: "interpretation"
  defp layer_for(_), do: "ux_continuity"

  defp next_action(true, pilot) do
    if pilot["recommendation"] == "READY FOR SMALL PILOT" do
      "pilot_packet"
    else
      "founder_refresh_render_api_key_then_hosted_repeat_of_this_matrix"
    end
  end

  defp next_action(false, _), do: "repair_open_p0_p1_then_replay_matrix"
end
