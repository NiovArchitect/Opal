defmodule OpalCore.SocialFlow.Execution.PromotionGate do
  @moduledoc """
  Before prepared work becomes human-facing: recheck critical deps only.

  Economies (ascending threshold):
  1. Compute — was this worth calculating?
  2. Provider — was this worth querying externally?
  3. Attention — was this worth interrupting the human?

  Prepared ≠ ready. Ready + low value may still stay quiet (InterruptionDebt).
  Push readiness is stricter than conversation readiness.
  """

  alias OpalCore.SocialFlow.Ambient.{Freshness, InterruptionDebt}

  alias OpalCore.SocialFlow.Execution.{
    AttentionTier,
    ClaimConfidence,
    CriticalGap,
    ReadinessState,
    SurfaceRouter
  }

  @doc """
  Gate promotion of an opportunity or action to a surface.

  Returns promote? + surface routing decision + reason.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    state = ReadinessState.normalize(a["readiness_state"] || ReadinessState.classify(a))
    gaps = CriticalGap.assess(a)
    claims = ClaimConfidence.assess(a)
    surface_intent = a["surface"] || a["preferred_surface"] || "active_conversation"

    cond do
      a["humans_already_solved"] == true or a["humans_chose"] == true ->
        deny("humans_solved")

      a["cancelled"] == true or a["superseded"] == true ->
        deny("plan_terminal")

      not plan_version_ok?(a) ->
        deny("plan_version_stale")

      not freshness_ok?(a) ->
        deny("freshness_stale")

      # Book CTA requires live availability claim, not mere place fit
      # (checked before gap questions so metadata fit never becomes Reserve?)
      a["prompt"] == "book" and not claims["may_prompt_book"] ->
        deny("place_fit_ne_book_confidence")

      gaps["blocks_decision_ready"] and not ReadinessState.may_prompt_execution?(state) ->
        # May still allow private minimum question for critical gap
        if gaps["minimum_question"] do
          question_path(gaps, a)
        else
          deny("critical_gap_#{gaps["primary_gap"] || "unknown"}")
        end

      not ReadinessState.may_promote_opportunity?(state) and a["human_asked"] != true ->
        deny("not_decision_ready")

      a["privacy_projection_safe"] == false ->
        deny("privacy_unsafe")

      true ->
        route_ok(a, state, claims, gaps, surface_intent)
    end
  end

  def evaluate(_), do: deny("invalid")

  @doc "Push/lock requires stricter readiness than chat."
  def push_ready?(attrs) when is_map(attrs) do
    a = stringify(attrs)
    state = ReadinessState.normalize(a["readiness_state"] || ReadinessState.classify(a))

    ReadinessState.may_promote_opportunity?(state) and
      (a["time_sensitive"] == true or AttentionTier.may_push?(a["attention_tier"] || "")) and
      a["privacy_projection_safe"] != false and
      high_delay_cost?(a) and
      plan_version_ok?(a) and
      freshness_ok?(a)
  end

  def push_ready?(_), do: false

  @doc "Lock-screen: highest threshold."
  def lock_screen_ready?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    push_ready?(a) and a["time_sensitive"] == true and
      (is_number(a["minutes_to_leave"]) and a["minutes_to_leave"] <= 30) and
      a["confidence"] != :low and a["privacy_safe_copy"] != false
  end

  def lock_screen_ready?(_), do: false

  @doc "Recheck critical deps only before promotion (not full recompute)."
  def recheck_critical(attrs) when is_map(attrs) do
    a = stringify(attrs)
    gaps = CriticalGap.assess(a)

    %{
      "critical_ok" => not gaps["blocks_decision_ready"],
      "primary_gap" => gaps["primary_gap"],
      "plan_version_ok" => plan_version_ok?(a),
      "freshness_ok" => freshness_ok?(a),
      "reran_everything" => false,
      "critical_only" => true
    }
  end

  def recheck_critical(_), do: %{"critical_ok" => false}

  defp route_ok(a, state, claims, gaps, surface_intent) do
    # Escalate surface conservatively
    preferred =
      cond do
        a["chat_open"] == true or a["in_conversation"] == true ->
          "active_conversation"

        push_ready?(Map.put(a, "readiness_state", state)) and
            surface_intent in ~w(push lock_screen) ->
          surface_intent

        true ->
          "in_app_passive"
      end

    # Stricter: if preferred is push but not push_ready, fall back
    preferred =
      if preferred in ~w(push lock_screen) and
           not push_ready?(Map.put(a, "readiness_state", state)) do
        if a["app_foreground"] == true, do: "in_app_passive", else: "none"
      else
        preferred
      end

    if preferred == "none" do
      deny("no_surface_meets_threshold")
    else
      route =
        SurfaceRouter.route(
          Map.merge(a, %{
            "attention_tier" => a["attention_tier"] || tier_for_state(state),
            "surface" => preferred,
            "chat_open" => a["chat_open"],
            "in_conversation" => a["in_conversation"],
            "time_sensitive" => a["time_sensitive"],
            "minutes_to_leave" => a["minutes_to_leave"],
            "quality_band" => a["quality_band"] || "strong"
          })
        )

      debt =
        InterruptionDebt.evaluate(%{
          "effort_removed" => a["effort_removed"] || 0.8,
          "uncertainty_removed" => a["uncertainty_removed"] || 0.7,
          "this_got_easy" => true,
          "actionable" => true,
          "confidence" => 0.9,
          "surface" => route["surface"] || preferred,
          "quality_band" => a["quality_band"] || "strong",
          "option_count" => 1,
          "human_asked" => a["human_asked"] == true
        })

      if (route["present"] and debt["surface_ok"]) or a["human_asked"] == true do
        %{
          "promote" => true,
          "visible" => true,
          "readiness_state" => state,
          "surface" => route["surface"],
          "route" => route,
          "interruption_debt" => debt,
          "claims" => claims,
          "critical_gaps" => gaps["critical_gaps"],
          "reason" => "decision_ready_debt_repaid",
          "economies" => %{
            "compute" => "already_spent",
            "provider" => a["provider_queried"] == true,
            "attention" => "spent"
          },
          "authorizes_set" => false
        }
      else
        deny(route["reason"] || "debt_not_repaid")
      end
    end
  end

  defp question_path(gaps, a) do
    q = gaps["minimum_question"]

    debt =
      InterruptionDebt.evaluate(%{
        "effort_removed" => 0.7,
        "uncertainty_removed" => 0.75,
        "this_got_easy" => true,
        "actionable" => true,
        "confidence" => 0.85,
        "surface" => "active_conversation",
        "quality_band" => "solid",
        "option_count" => 1,
        "private_prompt" => true
      })

    if debt["surface_ok"] or a["human_asked"] == true do
      %{
        "promote" => true,
        "visible" => true,
        "kind" => "minimum_question",
        "minimum_question" => q,
        "surface" => "active_conversation",
        "private" => q["private"] == true,
        "reason" => "critical_gap_question",
        "authorizes_set" => false
      }
    else
      deny("question_debt_not_repaid")
    end
  end

  defp deny(reason) do
    %{
      "promote" => false,
      "visible" => false,
      "reason" => reason,
      "quiet_success" => reason in ~w(humans_solved not_decision_ready),
      "authorizes_set" => false
    }
  end

  defp plan_version_ok?(a),
    do: a["plan_version_ok"] != false and a["plan_version_mismatch"] != true

  defp freshness_ok?(a) do
    cond do
      a["fresh_enough"] == false or a["stale"] == true ->
        false

      match?(%DateTime{}, a["prepared_at"]) ->
        {:ok, f} =
          Freshness.confidence(%{
            "source_class" => a["prep_source_class"] || "provider_inventory",
            "observed_at" => a["prepared_at"],
            "now" => a["now"] || DateTime.utc_now()
          })

        f["usable"] != false

      true ->
        true
    end
  end

  defp high_delay_cost?(a) do
    a["time_sensitive"] == true or
      (is_number(a["minutes_to_leave"]) and a["minutes_to_leave"] <= 45) or
      a["real_deadline"] == true
  end

  defp tier_for_state("execution_ready"), do: "urgent_actionable"
  defp tier_for_state("decision_ready"), do: "actionable"
  defp tier_for_state("prepared"), do: "prepare"
  defp tier_for_state(_), do: "watch"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
