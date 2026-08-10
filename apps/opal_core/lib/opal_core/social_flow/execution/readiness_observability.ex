defmodule OpalCore.SocialFlow.Execution.ReadinessObservability do
  @moduledoc """
  Privacy-safe readiness events and quality metrics.

  No names, places, or private payloads in shared events.
  """

  use Agent

  def start_link(_ \\ []) do
    Agent.start_link(fn -> %{events: [], metrics: empty_metrics()} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          _ -> :ok
        end

      pid ->
        if Process.alive?(pid), do: :ok, else: start_link([]) && :ok
    end
  end

  def reset do
    ensure_started()

    try do
      Agent.update(__MODULE__, fn _ -> %{events: [], metrics: empty_metrics()} end)
    catch
      :exit, _ -> ensure_started()
    end

    :ok
  end

  def emit_assessment(result, attrs) when is_map(result) do
    ensure_started()
    a = stringify(attrs)
    state = result["readiness_state"]
    prev = a["previous_readiness"]["readiness_state"] || a["previous_readiness"]["state"]

    events = []

    events =
      if prev && prev != state do
        [event("plan.readiness_changed", %{"from" => prev, "to" => state}) | events]
      else
        events
      end

    events =
      if result["gaps"]["primary_gap"] do
        [
          event("plan.critical_gap_changed", %{"gap" => result["gaps"]["primary_gap"]})
          | events
        ]
      else
        events
      end

    events =
      if a["prepared_count"] not in [nil, 0] or a["candidate_prepared"] == true do
        [event("opportunity.prepared", %{"count" => a["prepared_count"] || 1}) | events]
      else
        events
      end

    metrics_delta = %{
      "prepared_count" => prepared_metric_delta(a)
    }

    record(events, metrics_delta)
    :ok
  end

  def emit_assessment(_, _), do: :ok

  def emit_promotion(out, attrs) when is_map(out) do
    ensure_started()
    _a = stringify(attrs)

    {events, delta} =
      cond do
        out["retracted"] == true ->
          {[event("opportunity.retracted", %{"reason" => out["reason"]})],
           %{"retracted_before_action" => 1}}

        out["promoted"] == true ->
          {[event("opportunity.promoted", %{"surface" => surface_name(out)})],
           %{"promoted_count" => 1}}

        out["quiet_success"] == true ->
          {[], %{"never_promoted" => 1}}

        true ->
          {[], %{}}
      end

    record(events, delta)
    :ok
  end

  def emit_promotion(_, _), do: :ok

  def emit_execution(kind, meta \\ %{}) when is_binary(kind) do
    ensure_started()
    record([event("execution.#{kind}", sanitize(meta))], %{})
    :ok
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, & &1)
  end

  def metrics do
    ensure_started()
    Agent.get(__MODULE__, & &1.metrics)
  end

  def events do
    ensure_started()
    Agent.get(__MODULE__, & &1.events)
  end

  defp record(new_events, delta) do
    Agent.update(__MODULE__, fn state ->
      metrics =
        Enum.reduce(delta, state.metrics, fn {k, v}, m ->
          Map.update(m, k, v, &(&1 + v))
        end)

      %{state | events: Enum.reverse(new_events) ++ state.events, metrics: metrics}
    end)
  catch
    :exit, _ -> :ok
  end

  defp event(name, payload) do
    %{
      "event" => name,
      "payload" => sanitize(payload),
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
      "privacy_safe" => true
    }
  end

  defp sanitize(map) when is_map(map) do
    map
    |> stringify()
    |> Map.drop(~w(
      name email phone place destination venue address
      copy user_id actor_user_id conversation_text
    ))
  end

  defp sanitize(_), do: %{}

  defp surface_name(out) do
    case out["surface"] do
      %{"delivery_surface" => s} -> s
      s when is_binary(s) -> s
      _ -> out["gate"]["surface"] || "unknown"
    end
  end

  defp prepared_metric_delta(a) do
    if a["prepared_count"] in [nil, 0], do: 0, else: 1
  end

  defp empty_metrics do
    %{
      "prepared_count" => 0,
      "promoted_count" => 0,
      "never_promoted" => 0,
      "retracted_before_action" => 0,
      "minimum_questions_used" => 0,
      "questions_avoided" => 0,
      "provider_queries_used_to_close_gap" => 0,
      "provider_queries_wasted" => 0,
      "human_solved_before_promotion" => 0
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
