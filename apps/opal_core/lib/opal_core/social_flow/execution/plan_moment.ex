defmodule OpalCore.SocialFlow.Execution.PlanMoment do
  @moduledoc """
  Single entry: given plan + clock, what should Opal surface?

  Temporal compression of software — not a feature dashboard.

  Composes PlanLifecycle + ExecutionRequirements + JustInTimeAction.
  Hidden preparation (leave-by calc) does not surface unless action-worthy.
  """

  alias OpalCore.SocialFlow.Ambient.ExecutionContext

  alias OpalCore.SocialFlow.Execution.{
    ExecutionRequirements,
    HumanReportedOutcome,
    JustInTimeAction,
    PlanLifecycle
  }

  @doc """
  Evaluate the plan at `now` (or attrs["now"]).
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = a["now"] || DateTime.utc_now()

    with {:ok, ctx} <- maybe_context(a),
         merged <- Map.merge(a, ctx_fields(ctx)) |> Map.put("now", now),
         {:ok, life} <- PlanLifecycle.phase(merged),
         {:ok, req} <- ExecutionRequirements.infer(Map.merge(merged, life)),
         {:ok, jit} <-
           JustInTimeAction.choose(
             Map.merge(merged, %{
               "reservation_needed" => req["reservation_needed"],
               "ticket_needed" => req["ticket_needed"],
               "navigation_useful" => req["navigation_useful"],
               "reminder_useful" => req["reminder_useful"]
             })
           ) do
      hidden = hidden_preparation(merged, life, req)

      {:ok,
       %{
         "phase" => life["phase"],
         "lifecycle" => life,
         "requirements" => req,
         "surface" => Map.take(jit, ~w(kind capability copy topic answers reason then_get_quiet)),
         "priority" => jit["priority"],
         "hidden_preparation" => hidden,
         "execution_path" => req["execution_path"],
         "one_action_at_a_time" => true,
         "workflow_ui" => false,
         "feature_stack" => false,
         "authorizes_set" => false,
         "minutes_to_start" => life["minutes_to_start"]
       }}
    end
  end

  def evaluate(_), do: {:error, :invalid}

  @doc "Continue after external handoff return."
  def after_handoff_return(attrs, human_answer) when is_map(attrs) do
    with {:ok, report} <- HumanReportedOutcome.apply(%{"answer" => human_answer}, attrs),
         {:ok, moment} <-
           evaluate(
             Map.merge(stringify(attrs), report)
             |> Map.put("awaiting_handoff_return", false)
             |> Map.put("handoff_started", true)
           ) do
      {:ok, Map.put(moment, "human_report", report)}
    end
  end

  def after_handoff_return(_, _), do: {:error, :invalid}

  @doc """
  Simulate deterministic timeline without sleeping.

  moments: list of {offset_minutes_from_set, attrs_override}
  """
  def simulate_timeline(base_attrs, moments) when is_map(base_attrs) and is_list(moments) do
    a = stringify(base_attrs)
    set_at = a["set_at"] || a["now"] || DateTime.utc_now()

    results =
      Enum.map(moments, fn
        {offset_min, override} when is_number(offset_min) and is_map(override) ->
          now = DateTime.add(set_at, trunc(offset_min * 60), :second)

          case evaluate(Map.merge(a, stringify(override)) |> Map.put("now", now)) do
            {:ok, m} ->
              %{
                "t_minutes" => offset_min,
                "phase" => m["phase"],
                "surface_kind" => m["surface"]["kind"],
                "capability" => m["surface"]["capability"],
                "reason" => m["surface"]["reason"] || m["surface"]["copy"]
              }

            {:error, e} ->
              %{"t_minutes" => offset_min, "error" => e}
          end

        other ->
          %{"error" => :bad_moment, "got" => inspect(other)}
      end)

    {:ok, %{"timeline" => results, "workflow_ui" => false}}
  end

  def simulate_timeline(_, _), do: {:error, :invalid}

  defp maybe_context(a) do
    if a["skip_context"] == true do
      {:ok, %{}}
    else
      case ExecutionContext.from_resolved(a) do
        {:ok, ctx} -> {:ok, ctx}
        _ -> {:ok, %{}}
      end
    end
  end

  defp ctx_fields(ctx) when is_map(ctx) do
    Map.take(ctx, ~w(
      set destination place place_label when party_size venue_id
      plan_version conversation_id navigation_stale
    ))
  end

  defp ctx_fields(_), do: %{}

  defp hidden_preparation(a, life, req) do
    # Preparation is silent — not a surface
    prep = []

    prep =
      if req["reminder_useful"] and life["phase"] in ~w(externally_confirmed upcoming) and
           a["reminder_scheduled"] != true do
        ["schedule_leave_reminder" | prep]
      else
        prep
      end

    prep =
      if req["navigation_useful"] and life["phase"] in ~w(upcoming departure_approaching) do
        ["normalize_destination" | prep]
      else
        prep
      end

    prep =
      if req["reservation_needed"] and life["phase"] in ~w(socially_aligned execution_preparation) do
        ["prepare_booking_handoff_url" | prep]
      else
        prep
      end

    %{
      "items" => Enum.reverse(prep),
      "visible" => false,
      "surface_preparation" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
