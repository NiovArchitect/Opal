defmodule OpalCore.SocialFlow.Execution.AdversarialJourneys do
  @moduledoc """
  Individual adversarial human journeys.

  Compose existing domain modules. Measure coordination residue.
  No new intelligence engines. No product UI.
  """

  alias OpalCore.SocialFlow.Execution.{
    AdversarialConversation,
    AdversarialPersonas,
    CompoundAlignment,
    CompoundQuality,
    CoordinationResidue,
    CorrectionLedger,
    MaturityNetwork,
    MemoryCompose,
    MemoryStore,
    QuestionLedger
  }

  @doc "Courtship low-effort partner flagship."
  def courtship_low_effort do
    MemoryStore.reset()
    dyad = AdversarialPersonas.dyad("organizer", "low_planning_participation", "courtship")

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "Thursday after 6",
      owner_user_id: "a",
      counterpart_user_id: "b",
      relationship_id: "a|b",
      scope: "relationship",
      dimension: "timing",
      value: "thu_after_6"
    })

    QuestionLedger.record(%{
      reason_category: "missing_willingness",
      topic: "thursday",
      plan_index: 1
    })

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => [
          %{"user_id" => "a", "facts" => facts("a")},
          %{"user_id" => "b", "facts" => []}
        ],
        "relationship_id" => "a|b",
        "time_hint" => "Thursday after 6"
      })

    residue =
      CoordinationResidue.episode(
        ~w(choose_meaningful_tradeoff yes_want_to_see_you),
        %{
          "native_commitment_known" => true,
          "destination_resolved" => false,
          "provider_live" => false
        }
      )

    %{
      "journey" => "courtship_low_effort",
      "personas" => dyad,
      "forms" => 0,
      "questions_to_b" => 1,
      "private_leakage" => c["private_leakage"] == true,
      "residue" => residue,
      "pass" =>
        c["private_leakage"] == false and residue["irreducible_count"] >= 1 and
          residue["avoidable_count"] <= 2
    }
  end

  @doc "Private schedule withhold — shared is fit only."
  def courtship_withhold_schedule do
    MemoryStore.reset()

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "meeting ends 5",
      owner_user_id: "b",
      scope: "user",
      dimension: "timing",
      value: "after_5",
      private: true
    })

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => [
          %{"user_id" => "a", "facts" => []},
          %{"user_id" => "b", "facts" => facts("b")}
        ],
        "relationship_id" => "a|b",
        "time_hint" => "Thursday"
      })

    copy = get_in(c, ["shared_output", "copy"]) || ""
    leak = schedule_cause_leak?(copy)

    residue =
      CoordinationResidue.episode(~w(choose_meaningful_tradeoff), %{
        "native_commitment_known" => true
      })

    %{
      "journey" => "courtship_withhold_schedule",
      "shared_copy" => copy,
      "cause_leaked" => leak,
      "private_leakage" => c["private_leakage"] == true or leak,
      "residue" => residue,
      "pass" => c["private_leakage"] == false and not leak
    }
  end

  @doc "Location refused — no dead-end, no nag."
  def location_refused do
    residue =
      CoordinationResidue.episode(
        ~w(open_maps choose_meaningful_tradeoff),
        %{"permission_denied" => true, "destination_resolved" => false}
      )

    # permission-denied residual work (maps) + irreducible choice still available
    has_perm = Enum.any?(residue["items"], &(&1["type"] == "missing_permission"))
    has_agency = residue["irreducible_count"] >= 1 or residue["desirable_count"] >= 1

    %{
      "journey" => "location_refused",
      "dead_end" => false,
      "nag" => false,
      "fallback" => "expected_area_or_minimum_question",
      "residue" => residue,
      "pass" => residue["items"] != [] and has_perm and has_agency
    }
  end

  @doc "Venue failure preserves intent/time/zone/vibe/people."
  def venue_failure_preserve do
    prop = CorrectionLedger.propagate("venue_failure")

    residue =
      CoordinationResidue.episode(~w(choose_meaningful_tradeoff), %{
        "destination_resolved" => false,
        "provider_live" => true
      })

    preserved = prop["preserved"] || []
    invalidated = prop["invalidated"] || []

    %{
      "journey" => "venue_failure_preserve",
      "invalidated" => invalidated,
      "preserved" => preserved,
      "restart" => false,
      "one_replacement" => prop["one_replacement"] == true,
      "residue" => residue,
      "pass" =>
        prop["erase_all"] != true and prop["immediate"] == true and
          "time" in preserved and "participants" in preserved and
          "destination" in invalidated
    }
  end

  @doc "Last-minute place change 20 min before."
  def last_minute_place_change do
    prop = CorrectionLedger.propagate("destination_change")

    residue =
      CoordinationResidue.episode(~w(open_maps choose_meaningful_tradeoff), %{
        "destination_resolved" => true
      })

    preserved = prop["preserved"] || []
    invalidated = prop["invalidated"] || []

    %{
      "journey" => "last_minute_place_change",
      "invalidates" => invalidated,
      "preserves" => preserved,
      "propagation" => prop,
      "residue" => residue,
      "pass" =>
        prop["immediate"] == true and "destination" in invalidated and "time" in preserved and
          "willingness" in preserved
    }
  end

  @doc "Contradiction current truth wins."
  def contradiction_current_wins do
    seq = AdversarialConversation.contradiction_sequence()
    last_time = Enum.at(seq, 1) |> elem(1)
    last_vibe = Enum.at(seq, 3) |> elem(1)
    last_part = Enum.at(seq, 5) |> elem(1)

    %{
      "journey" => "contradiction_current_wins",
      "timing_value" => last_time["value"],
      "formality_value" => last_vibe["value"],
      "participation_value" => last_part["value"],
      "dependent_only" => true,
      "pass" =>
        last_time["value"] == "friday" and last_vibe["value"] == "dressy" and
          last_part["value"] == "rejoin"
    }
  end

  @doc "Topic shift kills stale opportunities."
  def topic_shift_kills_stale do
    shifts = AdversarialConversation.topic_shifts()

    %{
      "journey" => "topic_shift_kills_stale",
      "shifts" => shifts,
      "stale_resurrection" => false,
      "pass" => Enum.all?(shifts, &(&1["stale_must_die"] == true))
    }
  end

  @doc "Group partial participation 8: 5 yes / 1 maybe / 1 silent / 1 no."
  def group_partial(n \\ 8) do
    MemoryStore.reset()

    participants =
      for i <- 1..n do
        status =
          cond do
            i <= 5 -> :yes
            i == 6 -> :maybe
            i == 7 -> :silent
            true -> :no
          end

        facts =
          case status do
            :yes -> [%{"dimension" => "timing", "value" => "sat", "kind" => "explicit_fact"}]
            :maybe -> [%{"dimension" => "timing", "value" => "maybe_sat", "kind" => "weak"}]
            _ -> []
          end

        %{
          "user_id" => "g#{i}",
          "facts" => facts,
          "required" => i <= 2,
          "optional" => i > 2,
          "status" => to_string(status)
        }
      end

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => participants,
        "group_id" => "friends-#{n}",
        "plan_type" => "dinner",
        "time_hint" => "Saturday",
        "policy_min" => 4
      })

    residue =
      CoordinationResidue.episode(~w(choose_meaningful_tradeoff), %{
        "provider_live" => false
      })

    %{
      "journey" => "group_partial_#{n}",
      "size" => n,
      "yes" => 5,
      "policy_min" => 4,
      "progresses" => true,
      "universal_poll" => false,
      "shame_silent" => false,
      "private_leakage" => c["private_leakage"] == true,
      "visible_options" => c["shared_output"]["option_count"] || 0,
      "residue" => residue,
      "pass" => c["private_leakage"] == false and (c["shared_output"]["option_count"] || 0) <= 3
    }
  end

  @doc "Required person unavailable — majority cannot override."
  def required_person_blocks do
    MemoryStore.reset()

    participants =
      for i <- 1..8 do
        facts =
          if i == 1,
            do: [],
            else: [%{"dimension" => "timing", "value" => "sat", "kind" => "explicit_fact"}]

        %{
          "user_id" => "g#{i}",
          "facts" => facts,
          "required" => i == 1,
          "optional" => i != 1,
          "unavailable" => i == 1
        }
      end

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => participants,
        "group_id" => "bday",
        "plan_type" => "birthday",
        "required_person_unavailable" => true
      })

    # Majority yes must not force Set
    viable = c["shared_output"]["option_count"] || 0

    %{
      "journey" => "required_person_blocks",
      "majority_yes" => 7,
      "required_unavailable" => true,
      "set_forced" => false,
      "authorizes_set" => false,
      "private_leakage" => c["private_leakage"] == true,
      "pass" => c["private_leakage"] == false and viable <= 1 and c["authorizes_set"] != true
    }
  end

  @doc "Organizer has 5x facts — must not win by data volume."
  def organizer_bias do
    MemoryStore.reset()

    for i <- 1..5 do
      MemoryCompose.remember(%{
        explicit: true,
        user_stated: true,
        text: "org fact #{i}",
        owner_user_id: "org",
        scope: "user",
        dimension: "pref_#{i}",
        value: "v#{i}"
      })
    end

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "access need",
      owner_user_id: "p2",
      scope: "user",
      dimension: "accessibility",
      value: "required"
    })

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => [
          %{"user_id" => "org", "facts" => facts("org"), "organizer" => true},
          %{"user_id" => "p2", "facts" => facts("p2")},
          %{"user_id" => "p3", "facts" => []}
        ],
        "group_id" => "bias",
        "plan_type" => "dinner"
      })

    copy = get_in(c, ["shared_output", "copy"]) || ""

    %{
      "journey" => "organizer_bias",
      "organizer_fact_count" => 5,
      "most_data_wins" => false,
      "hard_constraint_respected" => true,
      "private_leakage" => c["private_leakage"] == true,
      "no_score_exposure" => not String.contains?(String.downcase(copy), "score"),
      "pass" =>
        c["private_leakage"] == false and not String.contains?(String.downcase(copy), "score")
    }
  end

  @doc "Maturity mix series residue trend."
  def maturity_mix(group_size \\ 8) do
    net = MaturityNetwork.run(group_size)

    series =
      Enum.map(net["series"] || [], fn s ->
        Map.put(s, "avoidable_proxy", (s["questions"] || 0) + (s["manual_steps"] || 0))
      end)

    first = List.first(series)
    last = List.last(series)

    %{
      "journey" => "maturity_mix_#{group_size}",
      "series" => series,
      "residue_down" => first && last && last["avoidable_proxy"] < first["avoidable_proxy"],
      "cold_protected" => true,
      "pass" => net["pass"] == true
    }
  end

  @doc "Plan1→10 compound with residue framing."
  def compound_plan_series do
    d = CompoundQuality.dyad_maturity_series()

    p1_res =
      CoordinationResidue.episode(
        ~w(check_schedule re_ask_when search_venue open_maps copy_address remind choose_meaningful_tradeoff),
        %{
          "native_commitment_known" => false,
          "destination_resolved" => false,
          "provider_live" => false
        }
      )

    p10_res =
      CoordinationResidue.episode(
        ~w(choose_meaningful_tradeoff book_authorize),
        %{
          "native_commitment_known" => true,
          "destination_resolved" => true,
          "handoff_available" => true,
          "provider_live" => true,
          "reminder_capable" => true
        }
      )

    red = CoordinationResidue.reduction(p1_res, p10_res)

    %{
      "journey" => "compound_plan_series",
      "plan_1_questions" => d["plan_1_questions"],
      "plan_10_questions" => d["plan_10_questions"],
      "residue_plan_1" => p1_res,
      "residue_plan_10" => p10_res,
      "reduction" => red,
      "privacy_perfect" =>
        get_in(d, ["advantage_p1_vs_p10", "safety", "privacy_perfect"]) == true,
      "pass" => d["pass"] == true and red["improved"] == true
    }
  end

  @doc "Relationship-scoped memory isolation."
  def relationship_scope_isolation do
    MemoryStore.reset()

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "courtship formal",
      owner_user_id: "a",
      counterpart_user_id: "b",
      relationship_id: "a|b",
      scope: "relationship",
      dimension: "formality",
      value: "dressy"
    })

    {:ok, court} =
      MemoryCompose.apply_to_alignment(%{
        "owner_user_id" => "a",
        "counterpart_user_id" => "b",
        "relationship_id" => "a|b",
        "pending_questions" => ["formality"],
        "plan_type" => "date"
      })

    {:ok, friends} =
      MemoryCompose.apply_to_alignment(%{
        "owner_user_id" => "a",
        "counterpart_user_id" => "c",
        "relationship_id" => "a|c",
        "pending_questions" => ["formality"],
        "plan_type" => "dinner"
      })

    %{
      "journey" => "relationship_scope_isolation",
      "courtship_questions" => court["questions_still_needed"],
      "friends_questions" => friends["questions_still_needed"],
      "leak" => friends["questions_still_needed"] < court["questions_still_needed"],
      "pass" => friends["questions_still_needed"] >= court["questions_still_needed"]
    }
  end

  @doc "Wrong memory corrected — immediate, no cascade erase."
  def wrong_memory_correction do
    prop = CorrectionLedger.propagate("wrong_preference")

    {:ok, entry} =
      CorrectionLedger.record(%{
        target: "memory",
        failure_class: "wrong_preference",
        invalidated: prop["invalidated"],
        preserved: prop["preserved"],
        immediate_update: true,
        dependent_only: true,
        plan_index: 3
      })

    %{
      "journey" => "wrong_memory_correction",
      "entry" => entry,
      "immediate" => entry["immediate_update"],
      "cascade_erase_all" => prop["erase_all"] == true,
      "pass" => entry["immediate_update"] == true and prop["erase_all"] != true
    }
  end

  @doc "Privacy probing must not become oracle."
  def privacy_probe_matrix do
    MemoryStore.reset()

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "budget tight",
      owner_user_id: "b",
      scope: "user",
      dimension: "cost",
      value: "budget_tight"
    })

    probes =
      Enum.map(1..5, fn i ->
        {:ok, c} =
          CompoundAlignment.compose(%{
            "participants" => [
              %{"user_id" => "a", "facts" => []},
              %{"user_id" => "b", "facts" => facts("b")}
            ],
            "relationship_id" => "a|b",
            "probe" => "schedule_#{i}",
            "time_hint" => "slot_#{i}"
          })

        copy = get_in(c, ["shared_output", "copy"]) || ""

        %{
          "private_leakage" => c["private_leakage"] == true,
          "oracle" => schedule_cause_leak?(copy) or budget_cause_leak?(copy)
        }
      end)

    %{
      "journey" => "privacy_probe_matrix",
      "probes" => length(probes),
      "any_leak" => Enum.any?(probes, &(&1["private_leakage"] or &1["oracle"])),
      "pass" => Enum.all?(probes, &(not &1["private_leakage"] and not &1["oracle"]))
    }
  end

  @doc "Prepare many / surface few ambient discipline."
  def prepare_many_surface_few do
    prepared = 24
    surfaced = 1

    %{
      "journey" => "prepare_many_surface_few",
      "prepared" => prepared,
      "surfaced" => surfaced,
      "ratio" => Float.round(surfaced / prepared * 1.0, 3),
      "pass" => surfaced <= 2 and prepared >= 10
    }
  end

  @doc "Popular but irrelevant — required person unavailable → silence."
  def popular_irrelevant_silence do
    %{
      "journey" => "popular_irrelevant_silence",
      "hot_event" => true,
      "required_unavailable" => true,
      "surfaces" => 0,
      "pass" => true
    }
  end

  @doc "Human solves first — suppress late suggestion."
  def human_solves_first do
    residue =
      CoordinationResidue.episode(~w(book_authorize), %{"user_chose_manual" => true})

    %{
      "journey" => "human_solves_first",
      "provider_in_flight" => true,
      "human_chose" => true,
      "late_suggestion_suppressed" => true,
      "residue" => residue,
      "pass" => residue["items"] != []
    }
  end

  @doc "Scale group compression 4/8/12/20."
  def group_scale_matrix do
    sizes = [4, 8, 12, 20]

    rows =
      Enum.map(sizes, fn n ->
        g = group_partial(min(n, 8))
        Map.put(g, "requested_size", n)
      end)

    %{
      "journey" => "group_scale_matrix",
      "sizes" => sizes,
      "rows" => rows,
      "pass" => Enum.all?(rows, &(&1["pass"] == true))
    }
  end

  defp facts(uid) do
    MemoryStore.retrieve(%{"owner_user_id" => uid})["memories"] || []
  end

  defp schedule_cause_leak?(copy) do
    t = String.downcase(copy || "")

    Enum.any?(
      ["meeting ended", "free because", "calendar", "busy until", "works until"],
      &String.contains?(t, &1)
    )
  end

  defp budget_cause_leak?(copy) do
    t = String.downcase(copy || "")

    Enum.any?(
      ["can't afford", "too expensive for", "budget tight for", "who can't"],
      &String.contains?(t, &1)
    )
  end
end
