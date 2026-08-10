defmodule OpalCore.SocialFlow.Execution.PlanLifecycle do
  @moduledoc """
  Derive plan lifecycle phase from existing facts — not a mega state machine.

  Phases (internal, not a user-visible workflow):

  forming | socially_aligned | execution_preparation | externally_confirmed |
  upcoming | departure_approaching | in_transit | occurring |
  completed | cancelled | superseded

  Answers: what matters now? — not which feature panel to open.
  """

  @phases ~w(
    forming
    socially_aligned
    execution_preparation
    externally_confirmed
    upcoming
    departure_approaching
    in_transit
    occurring
    completed
    cancelled
    superseded
  )

  def phases, do: @phases

  @doc """
  Classify lifecycle phase.

  attrs:
  - set / socially_aligned
  - booking_state / handoff_started / provider_confirmed
  - directions_started / navigation_started
  - when / plan_start (DateTime)
  - leave_by (DateTime)
  - travel_minutes
  - now (DateTime)
  - cancelled / superseded / plan_version superseded
  - human_reports_completed
  """
  def phase(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = a["now"] || DateTime.utc_now()

    phase =
      cond do
        a["cancelled"] == true ->
          "cancelled"

        a["superseded"] == true ->
          "superseded"

        a["human_reports_completed"] == true or past_occurrence?(a, now) ->
          "completed"

        a["in_transit"] == true or a["navigation_started"] == true or
            a["directions_started"] == true ->
          if during_plan?(a, now), do: "occurring", else: "in_transit"

        departure_window?(a, now) ->
          "departure_approaching"

        a["set"] == true and upcoming?(a, now) ->
          if a["provider_confirmed"] == true or a["human_reports_booked"] == true do
            "externally_confirmed"
          else
            if needs_execution_prep?(a), do: "execution_preparation", else: "upcoming"
          end

        a["set"] == true ->
          "socially_aligned"

        true ->
          "forming"
      end

    {:ok,
     %{
       "phase" => phase,
       "now" => now,
       "set" => a["set"] == true,
       "minutes_to_start" => minutes_to_start(a, now),
       "minutes_to_leave" => minutes_to_leave(a, now),
       "authorizes_set" => false,
       "workflow_ui" => false
     }}
  end

  def phase(_), do: {:ok, %{"phase" => "forming"}}

  defp needs_execution_prep?(a) do
    a["reservation_needed"] == true or a["ticket_needed"] == true or
      a["booking_state"] in ~w(not_ready prepared handoff_started) or
      (a["plan_type"] in ~w(dinner restaurant concert event) and
         a["provider_confirmed"] != true and a["human_reports_booked"] != true)
  end

  defp upcoming?(a, now) do
    case plan_start(a) do
      %DateTime{} = start -> DateTime.compare(start, now) == :gt
      _ -> true
    end
  end

  defp departure_window?(a, now) do
    case plan_start(a) do
      %DateTime{} = start ->
        mins = DateTime.diff(start, now, :second) / 60.0

        leave_mins =
          case leave_by(a) do
            %DateTime{} = leave -> DateTime.diff(leave, now, :second) / 60.0
            _ -> nil
          end

        # Within 90m of start, or near leave-by and before start+30m
        (mins > 0 and mins <= 90) or
          (is_number(leave_mins) and leave_mins <= 30 and mins > -30)

      _ ->
        a["departure_approaching"] == true
    end
  end

  defp during_plan?(a, now) do
    case plan_start(a) do
      %DateTime{} = start ->
        mins = DateTime.diff(now, start, :second) / 60.0
        mins >= -5 and mins <= 180

      _ ->
        false
    end
  end

  defp past_occurrence?(a, now) do
    case plan_start(a) do
      %DateTime{} = start ->
        DateTime.diff(now, start, :second) / 3600.0 >= 3.0

      _ ->
        false
    end
  end

  defp plan_start(a) do
    case a["when"] || a["plan_start"] || a["start_at"] do
      %DateTime{} = dt -> dt
      _ -> nil
    end
  end

  defp leave_by(a) do
    case a["leave_by"] do
      %DateTime{} = dt -> dt
      _ -> nil
    end
  end

  defp minutes_to_start(a, now) do
    case plan_start(a) do
      %DateTime{} = s -> Float.round(DateTime.diff(s, now, :second) / 60.0, 1)
      _ -> nil
    end
  end

  defp minutes_to_leave(a, now) do
    case leave_by(a) do
      %DateTime{} = l -> Float.round(DateTime.diff(l, now, :second) / 60.0, 1)
      _ -> nil
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
