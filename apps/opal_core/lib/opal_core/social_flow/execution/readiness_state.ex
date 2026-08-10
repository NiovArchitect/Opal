defmodule OpalCore.SocialFlow.Execution.ReadinessState do
  @moduledoc """
  Prepared ≠ ready ≠ execution_ready ≠ confirmed.

  Derived states (never UI labels / meters):

  - prepared — private inventory exists; humans may still be uncertain
  - decision_ready — one meaningful human decision has high leverage
  - execution_ready — external action is verified enough to ask authorization
  - confirmed — external/provider result established

  Readiness cannot Set, share, book, pay, invite, or send ETA.
  """

  @states ~w(unprepared prepared decision_ready execution_ready confirmed)

  def states, do: @states

  @doc "Rank for hysteresis / crossing detection."
  def rank(state) when is_binary(state) do
    case state do
      "unprepared" -> 0
      "prepared" -> 1
      "decision_ready" -> 2
      "execution_ready" -> 3
      "confirmed" -> 4
      _ -> 0
    end
  end

  def rank(_), do: 0

  def normalize(s) when s in @states, do: s
  def normalize("ready"), do: "decision_ready"
  def normalize("human_decision_ready"), do: "decision_ready"
  def normalize(_), do: "unprepared"

  @doc """
  Classify current readiness from existing facts — not a second alignment authority.
  """
  def classify(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["provider_confirmed"] == true or a["booked"] == true or a["confirmed"] == true ->
        "confirmed"

      execution_ready?(a) ->
        "execution_ready"

      decision_ready?(a) ->
        "decision_ready"

      prepared?(a) ->
        "prepared"

      true ->
        "unprepared"
    end
  end

  def classify(_), do: "unprepared"

  @doc "Human-facing opportunity may be considered (still needs debt/surface)."
  def may_promote_opportunity?(state), do: normalize(state) in ~w(decision_ready execution_ready)

  @doc "May ask for execution authorization (Reserve? / Directions?)."
  def may_prompt_execution?(state), do: normalize(state) in ~w(execution_ready)

  defp prepared?(a) do
    a["prepared"] == true or a["prepared_count"] not in [nil, 0] or
      a["zone_known"] == true or a["candidate_prepared"] == true or
      a["leave_by_prepared"] == true or a["booking_context_prepared"] == true or
      is_binary(a["destination"] || a["place"]) or a["set"] == true
  end

  defp decision_ready?(a) do
    social_ok?(a) and time_ok?(a) and intent_ok?(a) and required_people_ok?(a) and
      not critical_hard_block?(a) and
      (a["one_dominant_option"] == true or a["compressed_to_one"] == true or
         a["candidate_count"] in [1, nil] or a["meaningful_choice_ready"] == true or
         a["decision_ready"] == true)
  end

  defp execution_ready?(a) do
    decision_ready?(a) and place_ok?(a) and party_ok?(a) and
      (a["provider_checked"] == true or a["execution_prereqs_met"] == true or
         a["handoff_ready"] == true or a["navigation_ready"] == true) and
      a["slot_expired"] != true and a["plan_version_ok"] != false and
      a["capacity_ok"] != false
  end

  defp social_ok?(a) do
    a["set"] == true or a["socially_aligned"] == true or
      a["willingness_ok"] == true or a["required_willingness_ok"] == true or
      (a["opening_exists"] == true and a["opening_quality_band"] in ~w(strong exceptional solid))
  end

  defp time_ok?(a) do
    a["time_known"] != false and
      (match?(%DateTime{}, a["when"] || a["plan_start"]) or a["slot_label"] not in [nil, ""] or
         a["time_compatible"] == true)
  end

  defp intent_ok?(a) do
    strength = a["intent_strength"] || if a["set"] == true, do: "strong_commitment", else: "none"

    strength in ~w(forming_plan strong_commitment active_desire) or a["set"] == true or
      a["human_asked"] == true
  end

  defp required_people_ok?(a) do
    a["required_participant_unresolved"] != true and a["required_willingness_maybe"] != true and
      a["required_people_ready"] != false
  end

  defp place_ok?(a) do
    is_binary(a["destination"] || a["place"] || a["venue_id"]) or a["place_selected"] == true
  end

  defp party_ok?(a) do
    a["party_size"] not in [nil, 0] or a["party_known"] == true or a["party_size_ok"] != false
  end

  defp critical_hard_block?(a) do
    a["hard_constraint_block"] == true or a["blocked"] == true or a["privacy_ok"] == false or
      a["capacity_overflow"] == true or a["accessibility_block"] == true
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
