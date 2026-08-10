defmodule OpalCore.SocialFlow.Execution.JustInTimeAction do
  @moduledoc """
  One execution action at a time — capability ≠ interruption.

  Same SmallestOutput / interruption-debt spirit as Ambient Opportunity:

  one action | one question | nothing

  Never stacks Book? + Reminder? + Directions? + Share ETA?
  """

  alias OpalCore.SocialFlow.Ambient.InterruptionDebt
  alias OpalCore.SocialFlow.Execution.{ExecutionRequirements, PlanLifecycle}

  @doc """
  Choose the single highest-value action for the present moment.

  attrs combine plan context + lifecycle + completion flags.
  """
  def choose(attrs) when is_map(attrs) do
    a = stringify(attrs)
    {:ok, life} = PlanLifecycle.phase(a)
    {:ok, req} = ExecutionRequirements.infer(Map.merge(a, life))

    candidates = candidates(a, life, req)
    suppressed = Enum.filter(candidates, & &1["suppressed"])
    active = Enum.reject(candidates, & &1["suppressed"])

    ranked =
      active
      |> Enum.map(&score_candidate(&1, a, life))
      |> Enum.sort_by(& &1["priority"], :desc)

    chosen = List.first(ranked)

    surface =
      cond do
        is_nil(chosen) ->
          nothing("no_action_due")

        chosen["priority"] < 0.35 ->
          nothing("below_interruption_threshold")

        debt_blocks?(chosen, a) ->
          nothing("interruption_debt_not_repaid")

        chosen["kind"] == "question" ->
          question(chosen)

        true ->
          action(chosen)
      end

    {:ok,
     Map.merge(surface, %{
       "phase" => life["phase"],
       "requirements" => req,
       "candidates_considered" => length(candidates),
       "suppressed_count" => length(suppressed),
       "one_action_at_a_time" => true,
       "workflow_ui" => false,
       "authorizes_set" => false
     })}
  end

  def choose(_), do: {:ok, nothing("invalid")}

  defp candidates(a, life, req) do
    phase = life["phase"]

    [
      booking_candidate(a, phase, req),
      ticket_candidate(a, phase, req),
      handoff_return_candidate(a, phase),
      directions_candidate(a, phase, req),
      leave_reminder_surface(a, phase, req),
      eta_candidate(a, phase)
    ]
    |> Enum.reject(&is_nil/1)
  end

  defp booking_candidate(a, phase, req) do
    done? =
      a["provider_confirmed"] == true or a["human_reports_booked"] == true or
        a["booking_confirmed"] == true

    needed? = req["reservation_needed"] == true

    cond do
      not needed? or done? or a["booking_declined"] == true ->
        nil

      a["humans_already_booked_elsewhere"] == true ->
        suppress("booking_handoff", "humans_already_handled")

      phase in ~w(socially_aligned execution_preparation) ->
        %{
          "id" => "booking_handoff",
          "kind" => "action",
          "capability" => "booking_handoff",
          "copy" => "Reserve a table?",
          "base_priority" => 0.85,
          "time_sensitive" => false,
          "suppressed" => false
        }

      phase == "upcoming" and not done? ->
        %{
          "id" => "booking_handoff",
          "kind" => "action",
          "capability" => "booking_handoff",
          "copy" => "Still need a reservation?",
          "base_priority" => 0.55,
          "suppressed" => false
        }

      true ->
        nil
    end
  end

  defp ticket_candidate(a, phase, req) do
    done? = a["tickets_secured"] == true or a["human_reports_tickets"] == true
    needed? = req["ticket_needed"] == true

    if needed? and not done? and phase in ~w(socially_aligned execution_preparation upcoming) do
      %{
        "id" => "ticket_handoff",
        "kind" => "action",
        "capability" => "ticket_handoff",
        "copy" => "Get tickets?",
        "base_priority" => 0.8,
        "suppressed" => false
      }
    end
  end

  defp handoff_return_candidate(a, phase) do
    # After external handoff, Opal may not know outcome
    if a["handoff_started"] == true and a["provider_confirmed"] != true and
         a["human_reports_booked"] != true and a["human_reports_failed"] != true and
         phase in ~w(execution_preparation upcoming externally_confirmed socially_aligned) and
         a["awaiting_handoff_return"] != false do
      %{
        "id" => "handoff_return",
        "kind" => "question",
        "capability" => "human_reported_outcome",
        "topic" => "did_handoff_work",
        "copy" => "Did that work?",
        "answers" => ["Yes", "No"],
        "base_priority" => 0.75,
        "suppressed" => a["suppress_return_question"] == true
      }
    end
  end

  defp directions_candidate(a, phase, req) do
    done? = a["directions_started"] == true or a["navigation_started"] == true
    useful? = req["navigation_useful"] != false

    cond do
      not useful? or done? or a["navigation_stale"] == true ->
        nil

      phase in ~w(departure_approaching in_transit) ->
        %{
          "id" => "directions",
          "kind" => "action",
          "capability" => "navigation",
          "copy" => "Directions?",
          "base_priority" => 0.9,
          "time_sensitive" => true,
          "suppressed" => false
        }

      # Spontaneous / already out
      a["spontaneous"] == true or a["already_out"] == true ->
        %{
          "id" => "directions",
          "kind" => "action",
          "capability" => "navigation",
          "copy" => "Directions?",
          "base_priority" => 0.88,
          "suppressed" => false
        }

      # Three days early — hide
      true ->
        nil
    end
  end

  defp leave_reminder_surface(a, phase, req) do
    # Reminders are usually hidden preparation; surface only if delivery failed
    if req["reminder_useful"] and a["reminder_failed"] == true and
         phase in ~w(upcoming departure_approaching) do
      %{
        "id" => "reminder_retry",
        "kind" => "action",
        "capability" => "reminder",
        "copy" => "Couldn't set your leave reminder.",
        "base_priority" => 0.4,
        "suppressed" => false
      }
    else
      # Quiet scheduling is preparation — not a surface action
      nil
    end
  end

  defp eta_candidate(a, phase) do
    if phase in ~w(in_transit departure_approaching) and a["eta_share_useful"] == true and
         a["eta_shared"] != true and a["likely_late"] == true do
      %{
        "id" => "share_eta",
        "kind" => "action",
        "capability" => "eta_share",
        "copy" => "Share ETA?",
        "base_priority" => 0.7,
        "suppressed" => a["eta_share_authorized"] == false and a["force_eta_prompt"] != true
      }
    end
  end

  defp suppress(id, reason) do
    %{
      "id" => id,
      "suppressed" => true,
      "suppress_reason" => reason,
      "base_priority" => 0.0
    }
  end

  defp score_candidate(c, a, life) do
    base = c["base_priority"] || 0.5
    time_boost = if c["time_sensitive"], do: 0.1, else: 0.0
    phase_boost = phase_affinity(c["capability"], life["phase"])
    req_key = "user_requested_" <> to_string(c["capability"] || "")
    human_boost = if a[req_key] == true, do: 0.2, else: 0.0

    priority = Float.round(base + time_boost + phase_boost + human_boost, 3)
    Map.put(c, "priority", min(priority, 1.0))
  end

  defp phase_affinity("navigation", "departure_approaching"), do: 0.15
  defp phase_affinity("navigation", "in_transit"), do: 0.1
  defp phase_affinity("booking_handoff", "execution_preparation"), do: 0.12
  defp phase_affinity("booking_handoff", "socially_aligned"), do: 0.1
  defp phase_affinity("ticket_handoff", "execution_preparation"), do: 0.12
  defp phase_affinity("human_reported_outcome", _), do: 0.05
  defp phase_affinity(_, _), do: 0.0

  defp debt_blocks?(chosen, a) do
    # Time-critical execution (leave/directions) defaults to lower interruption cost
    cost =
      cond do
        chosen["time_sensitive"] == true -> 0.2
        chosen["capability"] in ~w(booking_handoff ticket_handoff) -> 0.28
        true -> a["interruption_cost"] || 0.32
      end

    debt =
      InterruptionDebt.evaluate(%{
        "effort_removed" => max(chosen["priority"] || 0.5, 0.55),
        "uncertainty_removed" => if(chosen["kind"] == "question", do: 0.65, else: 0.5),
        "this_got_easy" => chosen["time_sensitive"] == true or a["set"] == true,
        "actionable" => true,
        "confidence" => 0.85,
        "interruption_cost" => cost,
        "quality_band" => if((chosen["priority"] || 0) >= 0.75, do: "strong", else: "solid"),
        "option_count" => 1,
        "human_asked" => a["human_asked"] == true
      })

    debt["repays_debt"] != true and a["human_asked"] != true
  end

  defp action(c) do
    %{
      "kind" => "action",
      "capability" => c["capability"],
      "copy" => c["copy"],
      "priority" => c["priority"],
      "then_get_quiet" => true,
      "feed" => false
    }
  end

  defp question(c) do
    %{
      "kind" => "minimum_question",
      "topic" => c["topic"] || "confirm",
      "copy" => c["copy"],
      "answers" => c["answers"] || ["Yes", "No"],
      "capability" => c["capability"],
      "priority" => c["priority"],
      "then_get_quiet" => true,
      "feed" => false
    }
  end

  defp nothing(reason) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "then_get_quiet" => true,
      "feed" => false,
      "workflow_ui" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
