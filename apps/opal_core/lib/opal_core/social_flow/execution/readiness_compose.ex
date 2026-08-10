defmodule OpalCore.SocialFlow.Execution.ReadinessCompose do
  @moduledoc """
  Opportunity readiness + pre-execution confidence composition.

  prepare quietly → verify critical deps → detect readiness crossing →
  surface one thing (if debt allows) → execute → disappear

  Prepared work is inventory. User attention is scarce capital.

  Economies: compute (often) < provider (selective) < attention (rare).
  """

  alias OpalCore.SocialFlow.Ambient.ExecutionReadiness

  alias OpalCore.SocialFlow.Execution.{
    ClaimConfidence,
    CriticalGap,
    PromotionGate,
    ReadinessCrossing,
    ReadinessObservability,
    ReadinessState
  }

  @doc """
  Full readiness assessment for a plan snapshot.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    gaps = CriticalGap.assess(a)
    claims = ClaimConfidence.assess(a)
    state = classify_with_gaps(a, gaps)

    {:ok, exec} =
      ExecutionReadiness.assess(Map.put(a, "execution_ready", state == "execution_ready"))

    prev = a["previous_readiness"] || %{}

    current_snap = %{
      "readiness_state" => state,
      "primary_gap" => gaps["primary_gap"],
      "critical_gap_type" => gaps["primary_gap"],
      "hard_constraint_block" => a["hard_constraint_block"],
      "required_participant_unresolved" => a["required_participant_unresolved"],
      "required_willingness_maybe" => a["required_willingness_maybe"],
      "slot_expired" => a["slot_expired"],
      "plan_version_ok" => a["plan_version_ok"],
      "material_change" => a["material_change"] == true,
      "required_participant_resolved" => a["required_participant_resolved"],
      "willingness_resolved" => a["willingness_resolved"],
      "compressed_to_one" => a["compressed_to_one"] || a["one_dominant_option"],
      "set" => a["set"]
    }

    crossing = ReadinessCrossing.detect(prev, current_snap)

    explanation = explain(state, gaps, claims, a)

    result = %{
      "readiness_state" => state,
      "prepared_ne_ready" => true,
      "ready_ne_execution_ready" => true,
      "execution_ready_ne_confirmed" => true,
      "gaps" => gaps,
      "claims" => claims,
      "execution" =>
        Map.take(exec, ~w(state execution_ready may_prompt_book stale_book_cta_suppressed)),
      "crossing" => crossing,
      "may_promote_opportunity" => ReadinessState.may_promote_opportunity?(state),
      "may_prompt_execution" =>
        ReadinessState.may_prompt_execution?(state) and claims["may_prompt_book"] != false,
      "explanation" => explanation,
      "trace" => safe_trace(a, state, gaps),
      "authorizes_set" => false,
      "no_readiness_meter" => true,
      "private" => true
    }

    _ = ReadinessObservability.emit_assessment(result, a)
    {:ok, result}
  end

  def assess(_), do: {:error, :invalid}

  @doc """
  Attempt promotion of prepared intelligence to human attention.
  """
  def maybe_promote(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, readiness} <- assess(a) do
      gate =
        PromotionGate.evaluate(
          Map.merge(a, %{
            "readiness_state" => readiness["readiness_state"],
            "primary_gap" => readiness["gaps"]["primary_gap"]
          })
        )

      # Crossing required for proactive promote (not human_asked)
      promote? =
        cond do
          a["human_asked"] == true and gate["promote"] -> true
          readiness["crossing"]["should_promote"] and gate["promote"] -> true
          # Already decision_ready and gate ok without needing new crossing (re-present policy: no)
          a["allow_stable_promote"] == true and gate["promote"] -> true
          true -> false
        end

      retracted? = readiness["crossing"]["should_retract"] == true

      out =
        cond do
          retracted? and a["already_surfaced"] == true ->
            %{
              "visible" => false,
              "retracted" => true,
              "reason" => readiness["crossing"]["reason"],
              "readiness" => readiness,
              "stale_cta_cleared" => true
            }

          promote? ->
            %{
              "visible" => true,
              "promoted" => true,
              "gate" => gate,
              "readiness" => readiness,
              "surface" => gate["surface"] || gate["minimum_question"],
              "kind" => gate["kind"] || "opportunity",
              "one_meaningful_choice" => true
            }

          true ->
            %{
              "visible" => false,
              "promoted" => false,
              "quiet_success" => true,
              "reason" => gate["reason"] || readiness["crossing"]["reason"] || "not_ready",
              "readiness" => readiness,
              "prepared_inventory" => true,
              "sunk_cost_privilege" => false
            }
        end

      _ = ReadinessObservability.emit_promotion(out, a)
      {:ok, out}
    end
  end

  def maybe_promote(_), do: {:error, :invalid}

  @doc """
  Pre-execution confidence before Reserve? / external side effect.
  """
  def execution_authorization_ready?(attrs) when is_map(attrs) do
    a = stringify(attrs)
    {:ok, r} = assess(a)
    claims = r["claims"]

    ready? =
      r["readiness_state"] in ~w(execution_ready) and
        claims["may_prompt_book"] == true and
        a["slot_expired"] != true and
        a["plan_version_ok"] != false

    # Authorization binds to current material fields
    binding = %{
      "place" => a["place"] || a["destination"] || a["venue_id"],
      "when" => a["when"] || a["slot_label"],
      "party_size" => a["party_size"],
      "plan_version" => a["plan_version"]
    }

    %{
      "ready" => ready?,
      "may_ask_reserve" => ready?,
      "binding" => binding,
      "invalidates_if_material_field_changes" => true,
      "claims" => claims["claims"],
      "authorizes_set" => false
    }
  end

  def execution_authorization_ready?(_), do: %{"ready" => false}

  @doc "Old authorization invalid if material field changed."
  def authorization_still_valid?(auth, current) when is_map(auth) and is_map(current) do
    a = stringify(auth)
    c = stringify(current)
    b = a["binding"] || a

    same?(b["place"], c["place"] || c["destination"] || c["venue_id"]) and
      same?(b["when"], c["when"] || c["slot_label"]) and
      same?(b["party_size"], c["party_size"]) and
      same?(b["plan_version"], c["plan_version"])
  end

  def authorization_still_valid?(_, _), do: false

  @doc """
  Recovery: preserve ready dimensions; recompute only failed dependency.
  """
  def after_execution_failure(attrs, failed_dep) when is_map(attrs) do
    a = stringify(attrs)
    dep = to_string(failed_dep)

    preserved =
      Map.drop(a, [
        dep,
        "provider_checked",
        "provider_available",
        "user_authorized",
        "booked"
      ])

    {:ok, readiness} =
      assess(
        Map.merge(preserved, %{
          "provider_failed" => true,
          "execution_failed_dep" => dep,
          "preserve_ready_dimensions" => true
        })
      )

    %{
      "preserved" => true,
      "failed_dependency" => dep,
      "readiness" => readiness,
      "restart_from_early_prep" => false,
      "surface_dump_alternatives" => false,
      "authorizes_set" => false
    }
  end

  def after_execution_failure(_, _), do: %{"preserved" => false}

  @doc """
  Readiness probability (internal, not public score) — drives prep budget.
  """
  def actionability_probability(attrs) when is_map(attrs) do
    a = stringify(attrs)

    score =
      0.0
      |> add_if(a["set"] == true, 0.35)
      |> add_if(a["intent_strength"] in ~w(forming_plan strong_commitment), 0.25)
      |> add_if(a["intent_strength"] == "active_desire", 0.15)
      |> add_if(match?(%DateTime{}, a["when"] || a["plan_start"]), 0.15)
      |> add_if(a["zone_known"] == true or is_binary(a["place"]), 0.1)
      |> add_if(a["required_participant_unresolved"] != true, 0.1)
      |> add_if(a["recent_engagement"] == true, 0.1)
      |> min(1.0)

    tier =
      cond do
        score >= 0.7 -> "high"
        score >= 0.4 -> "medium"
        score >= 0.2 -> "low"
        true -> "dormant"
      end

    %{
      "probability" => Float.round(score * 1.0, 2),
      "band" => tier,
      "public_score" => false,
      "live_provider_justified" => tier in ~w(high) or a["need_live_inventory"] == true,
      "prepare_aggressively" => tier in ~w(high medium),
      "authorizes_set" => false
    }
  end

  def actionability_probability(_), do: %{"band" => "dormant", "probability" => 0.0}

  @doc "7-day readiness benchmark: many preps, few promotions."
  def readiness_benchmark(base \\ %{}) do
    base =
      Map.merge(
        %{
          "set" => true,
          "plan_type" => "dinner",
          "place" => "Harbor Table",
          "destination" => "Harbor Table",
          "when" => ~U[2026-08-20 19:00:00Z],
          "plan_id" => "ready-bench",
          "conversation_id" => "c-rb",
          "plan_version" => 1,
          "party_size" => 2,
          "intent_strength" => "strong_commitment"
        },
        stringify(base)
      )

    start = base["when"]
    offsets = [-7 * 24, -5 * 24, -3 * 24, -2 * 24, -24, -12, -6, -3, -1, -0.5, 0]

    {events, _} =
      Enum.reduce(offsets, {[], %{"readiness_state" => "unprepared"}}, fn h, {acc, prev} ->
        now = DateTime.add(start, trunc(h * 3600), :second)

        attrs =
          Map.merge(base, %{
            "now" => now,
            "previous_readiness" => prev,
            "prepared_count" => 3,
            "zone_known" => true,
            "candidate_prepared" => true
          })
          |> then(fn m ->
            if h >= -24 do
              Map.merge(m, %{
                "human_reports_booked" => true,
                "provider_confirmed" => false,
                "one_dominant_option" => true,
                "willingness_ok" => true,
                "compressed_to_one" => true,
                "provider_checked" => h >= -1,
                "provider_available" => h >= -1,
                "material_change" => h == -24
              })
            else
              # Early: prepared but required maybe blocks
              Map.merge(m, %{
                "required_willingness_maybe" => h < -48,
                "willingness_ok" => h >= -48,
                "one_dominant_option" => false
              })
            end
          end)

        case maybe_promote(attrs) do
          {:ok, r} ->
            state = get_in(r, ["readiness", "readiness_state"]) || "prepared"

            ev = %{
              "t_hours" => h,
              "visible" => r["visible"] == true,
              "promoted" => r["promoted"] == true,
              "state" => state
            }

            {[ev | acc], %{"readiness_state" => state, "primary_gap" => nil}}

          _ ->
            {[%{"t_hours" => h, "visible" => false} | acc], prev}
        end
      end)

    events = Enum.reverse(events)
    visible = Enum.count(events, &(&1["visible"] == true))
    total = length(events)

    %{
      "total_ticks" => total,
      "promotions" => visible,
      "pass" => visible <= 3 and total >= 10,
      "headline" => "prepare_many_promote_few",
      "events" => events
    }
  end

  # --- internals ---

  defp classify_with_gaps(a, gaps) do
    base = ReadinessState.classify(Map.merge(a, %{"decision_ready" => false}))

    cond do
      base == "confirmed" ->
        "confirmed"

      gaps["blocks_execution_ready"] and base == "execution_ready" ->
        if gaps["blocks_decision_ready"], do: "prepared", else: "decision_ready"

      gaps["blocks_decision_ready"] ->
        if prepared_flag?(a), do: "prepared", else: "unprepared"

      true ->
        # Reclassify allowing decision if gaps clear
        ReadinessState.classify(
          Map.merge(a, %{
            "decision_ready" => not gaps["blocks_decision_ready"],
            "required_people_ready" => not gaps["blocks_decision_ready"]
          })
        )
    end
  end

  defp prepared_flag?(a) do
    a["prepared_count"] not in [nil, 0] or a["candidate_prepared"] == true or
      a["set"] == true or is_binary(a["place"])
  end

  defp explain(state, gaps, claims, a) do
    %{
      "state" => state,
      "why" =>
        cond do
          state == "confirmed" ->
            "provider_or_human_confirmed"

          state == "execution_ready" ->
            "prereqs_and_live_truth"

          state == "decision_ready" ->
            "one_meaningful_choice_compressed"

          state == "prepared" and gaps["primary_gap"] ->
            "blocked_by_#{gaps["primary_gap"]}"

          state == "prepared" ->
            "inventory_only"

          true ->
            "insufficient_facts"
        end,
      "critical_gap" => gaps["primary_gap"],
      "place_fit" => get_in(claims, ["claims", "place_fit", "confident"]),
      "live_availability" => get_in(claims, ["claims", "live_availability", "confident"]),
      "spontaneous" => a["spontaneous"] == true,
      "privacy_safe" => true
    }
  end

  defp safe_trace(a, state, gaps) do
    %{
      "plan_version" => a["plan_version"],
      "attention_tier" => a["attention_tier"],
      "readiness_state" => state,
      "critical_gap_type" => gaps["primary_gap"],
      "freshness_valid" => a["fresh_enough"] != false,
      "required_people_ready" => a["required_participant_unresolved"] != true,
      "provider_truth_level" => a["provider_truth_level"] || provider_level(a),
      "no_names" => true,
      "no_private_data" => true
    }
  end

  defp provider_level(a) do
    cond do
      a["provider_confirmed"] == true -> "confirmed"
      a["provider_checked"] == true -> "live"
      a["provider_metadata_only"] == true -> "metadata"
      true -> "none"
    end
  end

  defp same?(a, b), do: to_string(a || "") == to_string(b || "")

  defp add_if(score, true, n), do: score + n
  defp add_if(score, _, _), do: score

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
