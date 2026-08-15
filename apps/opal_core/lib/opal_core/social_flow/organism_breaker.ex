defmodule OpalCore.SocialFlow.OrganismBreaker do
  @moduledoc """
  Pass 24 — THE ORGANISM BREAKER.

  Seeded adversarial soak across dimensions. Not "24 combos architecture looks good."

  Each seed builds a messy human scenario and checks cross-layer invariants.
  Failures emit reproducible seeds.

  This is organism pressure on pure domain composition.
  It does NOT claim live multi-client OS push, CDN, or partner booking.
  """

  alias OpalCore.SocialFlow.{
    ExperienceContinuation,
    ExperienceField,
    ExperienceFork,
    ExternalWorldTruth,
    FinancialFit,
    FollowGraph,
    HistoricalIntelligenceReconciliation,
    MicroJourney,
    PersonalLifeCuration,
    PrivatePreparation,
    RelationshipGraph,
    SocialMoment,
    SocialReality
  }

  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary

  @dayparts ~w(morning afternoon evening night remote)
  @audiences ~w(solo dyad friends coworkers family date creator_follower mixed_hostile)
  @budgets [20, 50, 100, 500, nil]
  @cities [
    {"San Diego", -8},
    {"New York", -5},
    {"London", 0},
    {"Madrid", 1},
    {"Mexico City", -6},
    {"Tokyo", 9}
  ]
  @whats [
    "Dinner",
    "Coffee",
    "Brunch",
    "Lunch",
    "Museum",
    "Beach",
    "Concert",
    "Workout",
    "Hike",
    "Shopping",
    "Jazz",
    "FaceTime",
    "Drinks",
    "Gallery",
    "Airport layover"
  ]

  def default_rounds, do: 512

  @doc """
  Run organism soak.

  opts:
  - :rounds (default 512)
  - :base_seed (default 1)
  """
  def run(opts \\ []) do
    rounds = Keyword.get(opts, :rounds, default_rounds())
    base = Keyword.get(opts, :base_seed, 1)

    results =
      for i <- 0..(rounds - 1) do
        seed = base + i * 9973
        run_seed(seed)
      end

    failures = Enum.filter(results, &(&1["pass"] == false))
    by_class = Enum.group_by(failures, & &1["failure_class"])

    %{
      "kind" => "organism_breaker",
      "rounds" => length(results),
      "passed" => Enum.count(results, &(&1["pass"] == true)),
      "failed" => length(failures),
      "pass_rate" => Float.round(Enum.count(results, &(&1["pass"] == true)) / max(length(results), 1), 4),
      "failures" => Enum.take(failures, 25),
      "failure_classes" => Map.new(by_class, fn {k, v} -> {k, length(v)} end),
      "pass" => failures == [],
      "not_architecture_admiration" => true,
      "honest_scope" => "domain_composition_soak",
      "does_not_claim" => [
        "live_multi_client_ui",
        "live_partner_booking",
        "live_economic_value",
        "os_push_delivery",
        "cdn_media"
      ],
      "historical" => HistoricalIntelligenceReconciliation.summary(),
      "scorecard" => scorecard(results, failures)
    }
  end

  @doc "Single reproducible seed."
  def run_seed(seed) when is_integer(seed) do
    :rand.seed(:exsss, {seed, seed * 3 + 1, seed * 7 + 2})

    audience = Enum.random(@audiences)
    daypart = Enum.random(@dayparts)
    budget = Enum.random(@budgets)
    {city, tz} = Enum.random(@cities)
    what = Enum.random(@whats)
    hour = hour_for(daypart)
    remote? = daypart == "remote" or Regex.match?(~r/facetime|zoom|call/i, what)
    hostile? = audience == "mixed_hostile" or :rand.uniform() < 0.15
    provider_fail? = :rand.uniform() < 0.25
    leader_stealth? = audience in ~w(date dyad) and :rand.uniform() < 0.5
    solo? = audience == "solo"
    creator_mode? = audience == "creator_follower" or :rand.uniform() < 0.2

    scenario = %{
      "seed" => seed,
      "audience" => audience,
      "daypart" => daypart,
      "hour" => hour,
      "budget" => budget,
      "city" => city,
      "tz_offset" => tz,
      "what" => what,
      "remote" => remote?,
      "hostile" => hostile?,
      "provider_fail" => provider_fail?,
      "leader_stealth" => leader_stealth?,
      "solo" => solo?,
      "creator_mode" => creator_mode?
    }

    checks = []
    checks = checks ++ [check_reality(scenario)]
    checks = checks ++ [check_continuation(scenario)]
    checks = checks ++ [check_financial(scenario)]
    checks = checks ++ [check_micro_journey_laws(scenario)]
    checks = checks ++ [check_follow_friend_separation(scenario)]
    checks = checks ++ [check_fork(scenario)]
    checks = checks ++ [check_private_prep(scenario)]
    checks = checks ++ [check_provider_failure_preserve(scenario)]
    checks = checks ++ [check_field_not_commerce(scenario)]
    checks = checks ++ [check_solo_value(scenario)]
    checks = checks ++ [check_leadership_not_control(scenario)]
    checks = checks ++ [check_external_truth_boundaries(scenario)]

    fails = Enum.filter(checks, &(&1["ok"] == false))

    %{
      "seed" => seed,
      "scenario" => scenario,
      "checks" => length(checks),
      "failures_detail" => fails,
      "pass" => fails == [],
      "failure_class" =>
        case fails do
          [f | _] -> f["class"]
          _ -> nil
        end
    }
  end

  def run_seed(_), do: %{"pass" => false, "failure_class" => "invalid_seed"}

  # --- checks ---

  defp check_reality(s) do
    msgs =
      cond do
        s["remote"] ->
          [%{"body" => "Want to #{s["what"]}?", "sender_user_id" => "a"}, %{"body" => "sure facetime", "sender_user_id" => "b"}]

        s["solo"] ->
          [%{"body" => "thinking #{s["what"]} in #{s["city"]}", "sender_user_id" => "solo"}]

        true ->
          [
            %{"body" => "Want to do #{s["what"]}?", "sender_user_id" => "a"},
            %{"body" => "Thursday works", "sender_user_id" => "b"},
            %{"body" => "somewhere in #{s["city"]}", "sender_user_id" => "a"}
          ]
      end

    proj = SocialReality.project(msgs, :plan_forming, remote?: s["remote"])

    ok =
      is_map(proj) and
        proj["authorizes_set"] == false and
        is_binary(proj["next_gap"]) and
        (not s["remote"] or proj["next_gap"] != "place" or proj["dimensions"]["where_matters"] == false)

    %{
      "class" => "social_reality",
      "ok" => ok,
      "next_gap" => proj["next_gap"],
      "detail" => if(ok, do: nil, else: "reality projection broken for seed")
    }
  end

  defp check_continuation(s) do
    p = ExperienceContinuation.present(%{"hour" => s["hour"], "remote?" => s["remote"], "participant_count" => if(s["solo"], do: 1, else: 2)})
    label = p["label"] || ""

    # Night-only hardcode failure if morning uses "Extend the night"
    night_bias =
      s["daypart"] in ~w(morning afternoon) and Regex.match?(~r/extend the night/i, label)

    ok = is_binary(label) and label != "" and not night_bias and p["verb"] == "continue"

    %{
      "class" => "continuation_daypart",
      "ok" => ok,
      "label" => label,
      "detail" => if(ok, do: nil, else: "daypart continuation grammar failed")
    }
  end

  defp check_financial(s) do
    cost = Enum.random([15, 40, 80, 250, 400])
    fit = FinancialFit.assess(%{"discretionary_budget" => s["budget"], "estimated_cost" => cost})

    ok =
      fit["authorizes_payment"] == false and
        fit["expose_to_followers"] != true and
        (is_nil(s["budget"]) or fit["fit"] in ~w(fits over unknown) or fit["abstain"] == true)

    # If budget known and cost over, must not authorize
    over_ok =
      if is_number(s["budget"]) and cost > s["budget"] do
        fit["fit"] == "over" and fit["authorizes_payment"] == false
      else
        true
      end

    %{
      "class" => "financial_fit",
      "ok" => ok and over_ok,
      "detail" => if(ok and over_ok, do: nil, else: "financial fit leaked authority")
    }
  end

  defp check_micro_journey_laws(_s) do
    prohibited = MicroJourney.prohibited_mechanics()

    ok =
      :points_for_app_open in prohibited and
        :daily_use_streak in prohibited and
        :variable_compulsion_reward in prohibited

    %{
      "class" => "micro_journey_reward_law",
      "ok" => ok,
      "detail" => if(ok, do: nil, else: "engagement dark patterns not prohibited")
    }
  end

  defp check_follow_friend_separation(s) do
    if s["creator_mode"] or s["audience"] == "creator_follower" do
      {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "fan-#{s["seed"]}", "creator-x")
      following? = FollowGraph.following?(g, "fan-#{s["seed"]}", "creator-x")
      friend? = RelationshipGraph.friend_visibility_authorized?("creator-x", "fan-#{s["seed"]}")

      ok =
        following? and
          friend? == false and
          FollowGraph.grants_friend_visibility?() == false and
          FollowGraph.grants_calendar?() == false

      %{
        "class" => "follow_not_friend",
        "ok" => ok,
        "detail" => if(ok, do: nil, else: "follow collapsed into friend")
      }
    else
      %{"class" => "follow_not_friend", "ok" => true, "detail" => "skipped"}
    end
  end

  defp check_fork(s) do
    creator = "creator-#{rem(s["seed"], 50)}"
    actor = if s["solo"], do: creator, else: "actor-#{rem(s["seed"], 77)}"

    moment =
      SocialMoment.new(%{
        "id" => "m-#{s["seed"]}",
        "author_user_id" => creator,
        "caption" => "#{s["what"]} vibes in #{s["city"]}",
        "social_context" => String.downcase(s["what"]),
        "place_ref" => %{
          "display_name" => "#{s["city"]} Spot",
          "provider_place_id" => "places/seed-#{rem(s["seed"], 20)}",
          "provider" => "recorded_fixture"
        }
      })

    fg =
      if actor != creator do
        {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), actor, creator)
        g
      else
        FollowGraph.new()
      end

    people =
      cond do
        s["solo"] -> [actor]
        s["audience"] == "family" -> [actor, "fam-1", "fam-2"]
        s["audience"] == "coworkers" -> [actor, "co-1"]
        true -> [actor, "peer-1"]
      end

    case ExperienceFork.fork_moment(moment, %{
           "actor_user_id" => actor,
           "participant_user_ids" => people,
           "what" => s["what"],
           "when" => "open",
           "follow_graph" => fg,
           "require_follow" => actor != creator
         }) do
      {:ok, fork} ->
        creator_invited = creator in fork["reality_seed"]["participant_user_ids"] and actor != creator

        ok =
          fork["not_reservation_clone"] == true and
            fork["authorizes_booking"] == false and
            fork["authorizes_set"] == false and
            (not creator_invited or actor == creator)

        %{
          "class" => "experience_fork",
          "ok" => ok,
          "detail" => if(ok, do: nil, else: "fork violated independence/creator invite")
        }

      {:error, reason} ->
        %{"class" => "experience_fork", "ok" => false, "detail" => inspect(reason)}
    end
  end

  defp check_private_prep(s) do
    if s["leader_stealth"] do
      seq =
        PrivatePreparation.stealth_date_sequence([
          :curate_accept,
          :select_place,
          :sequence_activity,
          :prepare_surprise,
          :check_availability,
          # only last step may share
          :share_place
        ])

      ok = seq["leak_free"] == true and PrivatePreparation.leadership_is_control?() == false

      %{
        "class" => "private_preparation",
        "ok" => ok,
        "detail" => if(ok, do: nil, else: "private prep leaked send")
      }
    else
      %{"class" => "private_preparation", "ok" => true, "detail" => "skipped"}
    end
  end

  defp check_provider_failure_preserve(s) do
    if s["provider_fail"] do
      reality = %{
        "what" => s["what"],
        "when" => "Thursday",
        "where" => s["city"],
        "where_social_fit" => s["city"]
      }

      next =
        ExternalWorldTruth.recompose_after_provider_failure(reality, %{
          "scope" => "provider",
          "state" => "failed"
        })

      # Failure should not authorize set; social preference preserved in recompose
      ok =
        next["authorizes_set"] != true and
          (next["what"] == s["what"] or next["what"] == reality["what"])

      # ProviderBoundary fail path
      {:ok, inq} = ProviderBoundary.inquire(%{"venue_id" => "v1", "party_size" => 2})
      {:ok, failed} = ProviderBoundary.fail(inq, "filled_up")

      ok2 = failed["booked"] == false and failed["state"] == "failed"

      %{
        "class" => "provider_failure_preserve",
        "ok" => ok and ok2,
        "detail" => if(ok and ok2, do: nil, else: "provider fail destroyed plan authority")
      }
    else
      %{"class" => "provider_failure_preserve", "ok" => true, "detail" => "skipped"}
    end
  end

  defp check_field_not_commerce(s) do
    moment =
      SocialMoment.new(%{
        "id" => "field-#{s["seed"]}",
        "author_user_id" => "creator",
        "caption" => s["what"],
        "place_ref" => %{"display_name" => s["city"]}
      })

    field = ExperienceField.for_viewer("viewer", [moment], %{})
    card = hd(field["cards"] ++ [%{}])

    ok =
      field["discovery_uses_commission"] == false and
        field["not_a_feed_engine"] == true and
        card["commerce_led"] != true and
        card["book_now_cta"] != true and
        SocialMoment.commerce_led?(moment) == false

    %{
      "class" => "experience_field_not_ads",
      "ok" => ok,
      "detail" => if(ok, do: nil, else: "field became commerce/feed")
    }
  end

  defp check_solo_value(s) do
    if s["solo"] or s["audience"] == "solo" do
      cur = PersonalLifeCuration.suggest(%{
        "area_label" => s["city"],
        "discretionary_budget" => s["budget"] || 50
      })

      ok =
        cur["solo_ok"] == true and
          cur["fake_friend_required"] == false and
          cur["not_life_coach_monologue"] == true and
          is_list(cur["suggestions"])

      %{
        "class" => "solo_opal",
        "ok" => ok,
        "detail" => if(ok, do: nil, else: "solo path forced friends or monologue")
      }
    else
      %{"class" => "solo_opal", "ok" => true, "detail" => "skipped"}
    end
  end

  defp check_leadership_not_control(_s) do
    ok =
      PrivatePreparation.leadership_is_control?() == false and
        :hard_availability_no in PrivatePreparation.cannot_override() and
        :explicit_consent_no in PrivatePreparation.cannot_override()

    %{
      "class" => "leadership_not_control",
      "ok" => ok,
      "detail" => if(ok, do: nil, else: "leader control architecture")
    }
  end

  defp check_external_truth_boundaries(_s) do
    fit =
      ExternalWorldTruth.social_fit_from_collective(%{
        "id" => "v1",
        "name" => "Somewhere"
      })

    ok =
      try do
        :ok = ExternalWorldTruth.assert_social_fit_boundaries!(fit)
        fit["authorizes_booking"] != true and fit["booked"] != true
      rescue
        _ -> false
      end

    %{
      "class" => "external_truth",
      "ok" => ok,
      "detail" => if(ok, do: nil, else: "social fit overclaimed provider/execution")
    }
  end

  defp hour_for("morning"), do: 8
  defp hour_for("afternoon"), do: 14
  defp hour_for("evening"), do: 19
  defp hour_for("night"), do: 22
  defp hour_for("remote"), do: 16
  defp hour_for(_), do: 12

  defp scorecard(results, failures) do
    %{
      "organism_soak_rounds" => length(results),
      "organism_soak_failed" => length(failures),
      "architecture_admiration_rejected" => true,
      "ui_390_soak" => "NOT_RUN",
      "multi_client_realtime_soak" => "NOT_RUN",
      "multi_day_personal_curation" => "NOT_RUN",
      "live_provider" => "NOT_CLAIMED",
      "live_economic" => "NOT_PROVEN",
      "follow_graph_durable" => "NOT_POSTGRES",
      "historical_lost" => length(HistoricalIntelligenceReconciliation.lost()),
      "historical_dup_risk" => length(HistoricalIntelligenceReconciliation.duplicated_risks()),
      "propagation_metric" => "experience_generations",
      "fastest_trust_preserving_revenue_path" =>
        "provider-funded completed actions after live execution truth — not creator payouts first",
      "note" => "Domain soak is necessary but not sufficient for product organism proof"
    }
  end
end

