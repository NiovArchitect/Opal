defmodule OpalCore.SocialFlow.Execution.ReadinessCrossing do
  @moduledoc """
  Detect material transition: not ready → ready for one meaningful human decision.

  Tiny metadata churn must not flap readiness (hysteresis).
  Critical invalidation still retracts.
  """

  alias OpalCore.SocialFlow.Execution.ReadinessState

  @doc """
  Compare previous readiness snapshot to current.

  Returns crossing kind: none | promoted | retracted | material_promote | material_retract
  """
  def detect(previous, current, opts \\ [])

  def detect(previous, current, opts) when is_map(previous) and is_map(current) do
    ctx = build_ctx(previous, current, opts)

    cond do
      ctx.curr_s == "confirmed" and ctx.prev_s != "confirmed" ->
        crossing("promoted", ctx.prev_s, ctx.curr_s, "confirmed", true)

      critical_retract?(current) ->
        crossing(
          "retracted",
          ctx.prev_s,
          ctx.curr_s,
          current["retract_reason"] || "critical_invalidation",
          true
        )

      upward_to_decision?(ctx) ->
        handle_upward(ctx, previous, current)

      downward_from_decision?(ctx) ->
        handle_downward(ctx, current)

      ctx.curr_r != ctx.prev_r ->
        crossing("none", ctx.prev_s, ctx.curr_s, "rank_change_below_surface", false)

      true ->
        crossing("none", ctx.prev_s, ctx.curr_s, "stable", false)
    end
  end

  def detect(_, _, _), do: crossing("none", "unprepared", "unprepared", "invalid", false)

  @doc "Whether promotion to human attention is justified by this crossing."
  def should_promote?(%{"kind" => kind, "material" => true})
      when kind in ~w(promoted material_promote),
      do: true

  def should_promote?(_), do: false

  @doc "Whether an already-surfaced opportunity should retract."
  def should_retract?(%{"kind" => kind}) when kind in ~w(retracted material_retract), do: true
  def should_retract?(_), do: false

  defp build_ctx(previous, current, opts) do
    prev_s =
      ReadinessState.normalize(previous["readiness_state"] || previous["state"] || "unprepared")

    curr_s =
      ReadinessState.normalize(current["readiness_state"] || current["state"] || "unprepared")

    %{
      prev_s: prev_s,
      curr_s: curr_s,
      prev_r: ReadinessState.rank(prev_s),
      curr_r: ReadinessState.rank(curr_s),
      prev_gap: previous["primary_gap"] || previous["critical_gap_type"],
      curr_gap: current["primary_gap"] || current["critical_gap_type"],
      material?: Keyword.get(opts, :material_change, current["material_change"] == true)
    }
  end

  defp upward_to_decision?(ctx) do
    ctx.curr_r > ctx.prev_r and ctx.curr_r >= ReadinessState.rank("decision_ready")
  end

  defp downward_from_decision?(ctx) do
    ctx.curr_r < ctx.prev_r and ctx.prev_r >= ReadinessState.rank("decision_ready")
  end

  defp handle_upward(ctx, _previous, current) do
    if material_promote?(ctx.prev_gap, ctx.curr_gap, ctx.material?, current) do
      crossing(
        "material_promote",
        ctx.prev_s,
        ctx.curr_s,
        promote_reason(ctx.curr_gap, current),
        true
      )
    else
      upward_non_material(ctx, current)
    end
  end

  defp upward_non_material(ctx, current) do
    hold? =
      ctx.prev_r >= ReadinessState.rank("decision_ready") and not critical_retract?(current)

    if hold? do
      crossing("none", ctx.prev_s, ctx.prev_s, "hysteresis_hold", false)
    else
      if soft_material?(ctx, current) do
        crossing(
          "material_promote",
          ctx.prev_s,
          ctx.curr_s,
          promote_reason(ctx.curr_gap, current),
          true
        )
      else
        crossing("none", ctx.prev_s, ctx.curr_s, "non_material_upward", false)
      end
    end
  end

  defp soft_material?(ctx, current) do
    ctx.material? or gap_resolved?(ctx.prev_gap, ctx.curr_gap) or
      current["required_participant_resolved"] == true or
      current["willingness_resolved"] == true
  end

  defp handle_downward(ctx, current) do
    if critical_retract?(current) do
      crossing("material_retract", ctx.prev_s, ctx.curr_s, "critical_gap", true)
    else
      crossing("none", ctx.prev_s, ctx.prev_s, "hysteresis_ignore_minor_drift", false)
    end
  end

  defp material_promote?(prev_gap, curr_gap, material?, current) do
    material? or gap_resolved?(prev_gap, curr_gap) or
      current["required_participant_resolved"] == true or
      current["willingness_resolved"] == true or
      current["humans_chose"] == true or
      (current["set"] == true and current["compressed_to_one"] == true)
  end

  defp gap_resolved?(prev, nil) when not is_nil(prev), do: true
  defp gap_resolved?(prev, curr) when not is_nil(prev) and prev != curr, do: true
  defp gap_resolved?(_, _), do: false

  defp critical_retract?(curr) do
    curr["hard_constraint_block"] == true or curr["blocked"] == true or
      curr["required_willingness_maybe"] == true or
      curr["required_participant_unresolved"] == true or
      curr["slot_expired"] == true or curr["plan_version_ok"] == false or
      curr["humans_changed_direction"] == true or curr["topic_changed"] == true or
      curr["capacity_overflow"] == true or curr["cancelled"] == true
  end

  defp promote_reason(_gap, c) do
    cond do
      c["required_participant_resolved"] == true -> "required_participant_yes"
      c["willingness_resolved"] == true -> "willingness_strong"
      c["compressed_to_one"] == true -> "compressed_to_one"
      true -> "decision_ready"
    end
  end

  defp crossing(kind, from, to, reason, material?) do
    %{
      "kind" => kind,
      "from" => from,
      "to" => to,
      "reason" => reason,
      "material" => material?,
      "should_promote" => kind in ~w(promoted material_promote) and material?,
      "should_retract" => kind in ~w(retracted material_retract),
      "hysteresis" =>
        kind == "none" and reason in ~w(hysteresis_hold hysteresis_ignore_minor_drift),
      "authorizes_set" => false
    }
  end
end
