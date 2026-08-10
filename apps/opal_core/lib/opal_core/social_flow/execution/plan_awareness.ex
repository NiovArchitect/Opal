defmodule OpalCore.SocialFlow.Execution.PlanAwareness do
  @moduledoc """
  Which living plans deserve background attention — invisible internal judgment.

  Not every conversation. Not every relationship. Not every future commitment.
  Does not create a visible Plan Awareness UI/state.

  Composes PlanLifecycle + ExecutionRequirements + IntentStrength + AttentionTier.
  """

  alias OpalCore.SocialFlow.Execution.{
    AttentionTier,
    ExecutionRequirements,
    IntentStrength,
    PlanLifecycle
  }

  @doc """
  Derive attention tier and private work budget for a plan snapshot.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = a["now"] || DateTime.utc_now()
    intent = IntentStrength.assess(Map.put(a, "now", now))
    {:ok, life} = PlanLifecycle.phase(Map.put(a, "now", now))
    {:ok, req} = ExecutionRequirements.infer(Map.merge(a, life))

    mins_to_start = life["minutes_to_start"]
    mins_to_leave = life["minutes_to_leave"]
    phase = life["phase"]

    tier =
      cond do
        terminal?(phase, a) ->
          "dormant"

        urgent?(a, phase, mins_to_start, mins_to_leave, req) ->
          "urgent_actionable"

        actionable?(a, phase, mins_to_start, req, intent) ->
          "actionable"

        prepare?(a, phase, mins_to_start, req, intent) ->
          "prepare"

        watch?(a, phase, mins_to_start, intent) ->
          "watch"

        true ->
          "dormant"
      end

    tier = AttentionTier.normalize(tier)
    signals = awareness_signals(a, phase, req, intent)

    {:ok,
     %{
       "attention_tier" => tier,
       "attention_rank" => AttentionTier.rank(tier),
       "may_surface" => AttentionTier.may_surface?(tier),
       "may_prepare" => AttentionTier.may_prepare?(tier),
       "may_push" => AttentionTier.may_push?(tier),
       "max_surface" => AttentionTier.max_surface(tier),
       "allowed_work" => AttentionTier.allowed_work(tier),
       "phase" => phase,
       "minutes_to_start" => mins_to_start,
       "minutes_to_leave" => mins_to_leave,
       "intent" => intent,
       "requirements" => req,
       "lifecycle" => life,
       "signals" => signals,
       "watch_ne_notify" => true,
       "prepare_ne_ask" => true,
       "prepare_early_interrupt_late" => true,
       "visible_plan_awareness" => false,
       "workflow_ui" => false,
       "authorizes_set" => false,
       "private" => true
     }}
  end

  def evaluate(_),
    do:
      {:ok,
       %{
         "attention_tier" => "dormant",
         "may_surface" => false,
         "may_prepare" => false,
         "private" => true
       }}

  defp terminal?(phase, a) do
    phase in ~w(cancelled superseded completed) or a["cancelled"] == true or
      a["superseded"] == true or a["blocked"] == true
  end

  defp urgent?(a, phase, mins_start, mins_leave, req) do
    cond do
      phase in ~w(departure_approaching in_transit) ->
        true

      is_number(mins_leave) and mins_leave <= 45 and mins_leave > -15 ->
        true

      is_number(mins_start) and mins_start <= 60 and mins_start > 0 and
          (req["navigation_useful"] or a["leave_reminder_due"] == true) ->
        true

      real_deadline_urgent?(a) ->
        true

      true ->
        false
    end
  end

  defp actionable?(a, phase, mins_start, req, intent) do
    cond do
      a["human_asked"] == true ->
        true

      a["required_participant_unresolved"] == true and a["required_ids"] not in [nil, []] ->
        true

      phase in ~w(execution_preparation) and req["reservation_needed"] and
        a["provider_confirmed"] != true and a["human_reports_booked"] != true and
          a["booking_declined"] != true ->
        # PREPARE ≠ ASK: surface only when decision is actually due
        booking_surface_window?(a, mins_start) or a["surface_booking_now"] == true

      phase in ~w(socially_aligned) and
        intent["intent_strength"] in ~w(forming_plan strong_commitment) and
        a["proactive_surface_ok"] == true and a["opening_quality_band"] in ~w(strong exceptional) ->
        true

      a["decision_deadline_approaching"] == true and real_deadline?(a) ->
        true

      true ->
        false
    end
  end

  defp prepare?(a, phase, mins_start, req, intent) do
    cond do
      not intent["proactive_prepare_ok"] and a["set"] != true ->
        false

      a["set"] == true and
          phase in ~w(externally_confirmed upcoming execution_preparation socially_aligned) ->
        # Set commitments get prepare attention inside watch window
        watch_window_prepare?(a, mins_start, req)

      intent["intent_strength"] in ~w(forming_plan strong_commitment) and
          phase in ~w(forming socially_aligned execution_preparation) ->
        true

      a["material_participant_change"] == true and a["set"] == true ->
        true

      true ->
        false
    end
  end

  defp watch?(a, phase, mins_start, intent) do
    cond do
      a["set"] == true and
          phase in ~w(upcoming externally_confirmed socially_aligned execution_preparation) ->
        true

      intent["intent_strength"] in ~w(active_desire forming_plan) and
          phase in ~w(forming socially_aligned) ->
        true

      is_number(mins_start) and mins_start > 0 and mins_start <= 14 * 24 * 60 and a["set"] == true ->
        true

      true ->
        false
    end
  end

  defp watch_window_prepare?(a, mins_start, req) do
    type = req["plan_type"] || a["plan_type"] || "meetup"

    cond do
      # Concert/tickets — prepare earlier
      type in ~w(concert event sports) and is_number(mins_start) and mins_start <= 14 * 24 * 60 ->
        true

      # Dinner booking unresolved within ~3 days
      type in ~w(dinner restaurant) and req["reservation_needed"] and
        a["provider_confirmed"] != true and is_number(mins_start) and mins_start <= 3 * 24 * 60 ->
        true

      # Travel context within ~6h
      is_number(mins_start) and mins_start <= 6 * 60 ->
        true

      # Default set plan within 2 days: prepare leave-by/zone cheaply
      is_number(mins_start) and mins_start <= 2 * 24 * 60 ->
        true

      a["provider_hold"] == true or real_deadline?(a) ->
        true

      true ->
        false
    end
  end

  # Surface-worthy booking is tighter than prepare window (PREPARE ≠ ASK)
  defp booking_surface_window?(a, mins_start) do
    cond do
      match?(%DateTime{}, a["booking_deadline_at"]) ->
        true

      a["deadline_urgent"] == true and a["real_deadline"] == true ->
        true

      a["plan_type"] in ~w(dinner restaurant) and is_number(mins_start) and
        mins_start <= 18 * 60 and mins_start > 0 ->
        true

      a["plan_type"] in ~w(concert event sports) and is_number(mins_start) and
        mins_start <= 3 * 24 * 60 and mins_start > 0 ->
        true

      a["surface_booking_now"] == true ->
        true

      true ->
        false
    end
  end

  defp real_deadline?(a) do
    a["real_deadline"] == true or
      match?(
        %DateTime{},
        a["booking_deadline_at"] || a["ticket_expiry_at"] || a["provider_cutoff_at"]
      ) or
      a["provider_hold"] == true
  end

  defp real_deadline_urgent?(a) do
    case a["booking_deadline_at"] || a["ticket_expiry_at"] || a["provider_cutoff_at"] do
      %DateTime{} = dt ->
        now = a["now"] || DateTime.utc_now()
        mins = DateTime.diff(dt, now, :second) / 60.0
        mins > 0 and mins <= 120

      _ ->
        a["deadline_urgent"] == true
    end
  end

  defp awareness_signals(a, phase, req, intent) do
    [
      if(a["set"] == true, do: "active_set"),
      if(phase in ~w(forming socially_aligned), do: "forming_or_aligned"),
      if(req["reservation_needed"] and a["provider_confirmed"] != true, do: "booking_unresolved"),
      if(req["ticket_needed"] and a["tickets_secured"] != true, do: "tickets_unresolved"),
      if(phase == "departure_approaching", do: "departure_approaching"),
      if(a["material_participant_change"] == true, do: "participant_change"),
      if(a["proactive_surface_ok"] == true, do: "strong_social_opening"),
      if(real_deadline?(a), do: "real_deadline"),
      if(intent["intent_strength"], do: "intent_#{intent["intent_strength"]}")
    ]
    |> Enum.reject(&is_nil/1)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
