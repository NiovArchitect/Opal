defmodule OpalCore.SocialFlow.Ambient.CoordinationMode do
  @moduledoc """
  Inferred coordination mode — users never pick a mode.

  Modes change which signals matter:
  - planning_ahead: calendar + expected location
  - tonight: windows + open-now
  - already_out: current location >> calendar
  - on_the_way: ETA / movement
  - group_forming: participation + quorum
  - execution: leave-by, booking, nav
  - recovery: late decline, reschedule
  """

  @modes ~w(planning_ahead tonight already_out on_the_way group_forming execution recovery)

  def modes, do: @modes

  def infer(attrs) when is_map(attrs) do
    a = stringify(attrs)
    hours_until = to_f(a["hours_until_candidate"])

    mode =
      cond do
        a["recovery"] == true or a["late_decline"] == true -> "recovery"
        a["set"] == true and a["execution_ready"] == true -> "execution"
        a["on_the_way"] == true or a["movement_active"] == true -> "on_the_way"
        a["already_out"] == true or a["current_proximity_strong"] == true -> "already_out"
        a["group_forming"] == true or a["participation_active"] == true -> "group_forming"
        is_number(hours_until) and hours_until <= 8 -> "tonight"
        is_number(hours_until) and hours_until > 48 -> "planning_ahead"
        true -> "tonight"
      end

    {:ok,
     %{
       "mode" => mode,
       "user_selected" => false,
       "signal_weights" => weights(mode),
       "private" => true
     }}
  end

  def infer(_), do: {:ok, %{"mode" => "tonight", "user_selected" => false}}

  defp weights("already_out"),
    do: %{"calendar" => 0.2, "current_location" => 0.9, "open_now" => 0.9, "travel" => 0.7}

  defp weights("on_the_way"),
    do: %{"calendar" => 0.1, "eta" => 0.95, "destination" => 0.9}

  defp weights("planning_ahead"),
    do: %{"calendar" => 0.9, "current_location" => 0.1, "expected_area" => 0.8}

  defp weights("tonight"),
    do: %{"calendar" => 0.6, "current_location" => 0.5, "open_now" => 0.7}

  defp weights("group_forming"),
    do: %{"participation" => 0.9, "quorum" => 0.8, "calendar" => 0.5}

  defp weights("execution"),
    do: %{"leave_by" => 0.9, "booking" => 0.8, "navigation" => 0.7}

  defp weights("recovery"),
    do: %{"viability" => 0.9, "provider" => 0.6, "restart" => 0.1}

  defp weights(_), do: %{}

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
