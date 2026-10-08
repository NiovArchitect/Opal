defmodule OpalCore.Intelligence.Metrics do
  @moduledoc """
  Intelligence observability (Paste E Phase 6).

  Alert thresholds (warnings, founder-tunable):
  - fallback rate ≥ 30%
  - cost ≥ 2× baseline
  - dismiss rate ≥ 60%
  - hallucination count > 0
  - proactive reply rate < 20%

  IEx: `OpalCore.Intelligence.Metrics.for_account/2`, `.global/1`
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.{AttentionSlot, DailyMetric}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{OutcomeSignal, ProactiveThreadLog, SurfacedNudge}

  # founder-tunable alert thresholds
  @fallback_warn 0.30
  @cost_mult_warn 2.0
  @dismiss_warn 0.60
  @proactive_reply_min 0.20

  def alert_thresholds do
    %{
      fallback: @fallback_warn,
      cost_mult: @cost_mult_warn,
      dismiss: @dismiss_warn,
      hallucination_gt: 0,
      proactive_reply_min: @proactive_reply_min
    }
  end

  @doc "IEx helper — metrics map for one account on a day (default today)."
  def for_account(account_id, day \\ Date.utc_today()) when is_binary(account_id) do
    case Repo.get_by(DailyMetric, account_id: account_id, day: day) do
      %DailyMetric{} = m -> %{day: m.day, metrics: m.metrics, alerts: m.alerts}
      nil -> aggregate_account(account_id, day)
    end
  end

  @doc "IEx helper — global metrics for a day."
  def global(day \\ Date.utc_today()) do
    case from(m in DailyMetric, where: is_nil(m.account_id) and m.day == ^day, limit: 1)
         |> Repo.one() do
      %DailyMetric{} = m -> %{day: m.day, metrics: m.metrics, alerts: m.alerts}
      nil -> aggregate_global(day)
    end
  end

  @doc "Compute + upsert daily metrics for an account."
  def aggregate_account(account_id, day \\ Date.utc_today()) do
    metrics = compute_account(account_id, day)
    alerts = evaluate_alerts(metrics)
    upsert(account_id, day, metrics, alerts)
    %{day: day, metrics: metrics, alerts: alerts}
  end

  def aggregate_global(day \\ Date.utc_today()) do
    metrics = compute_global(day)
    alerts = evaluate_alerts(metrics)
    upsert(nil, day, metrics, alerts)
    %{day: day, metrics: metrics, alerts: alerts}
  end

  defp compute_account(account_id, day) do
    start = DateTime.new!(day, ~T[00:00:00], "Etc/UTC")
    stop = DateTime.add(start, 86_400, :second)

    slots_granted =
      from(s in AttentionSlot,
        where:
          s.account_id == ^account_id and s.granted_on == ^day and s.status == "granted"
      )
      |> Repo.aggregate(:count, :id)

    nudges =
      from(n in SurfacedNudge,
        where: n.account_id == ^account_id and n.surfaced_at >= ^start and n.surfaced_at < ^stop
      )
      |> Repo.all()

    nudge_n = length(nudges)
    dismissed = Enum.count(nudges, &(&1.status == "dismissed"))
    dismiss_rate = if nudge_n > 0, do: dismissed / nudge_n, else: 0.0

    proactive =
      from(p in ProactiveThreadLog,
        where: p.account_id == ^account_id and p.opened_at >= ^start and p.opened_at < ^stop
      )
      |> Repo.all()

    pro_n = length(proactive)
    replied = Enum.count(proactive, &(is_binary(&1.owner_response) and &1.owner_response != ""))
    reply_rate = if pro_n > 0, do: replied / pro_n, else: 1.0

    outcomes =
      from(o in OutcomeSignal,
        where: o.account_id == ^account_id and o.recorded_at >= ^start and o.recorded_at < ^stop
      )
      |> Repo.aggregate(:count, :id)

    %{
      "slots_granted" => slots_granted,
      "nudges" => nudge_n,
      "dismiss_rate" => Float.round(dismiss_rate * 1.0, 4),
      "proactive_threads" => pro_n,
      "proactive_reply_rate" => Float.round(reply_rate * 1.0, 4),
      "outcome_signals" => outcomes,
      # Point-in-time placeholders filled by LLM_VERIFY / adapter logs when present
      "fallback_rate" => 0.0,
      "hallucination_count" => 0,
      "estimated_cost_usd" => 0.0,
      "baseline_cost_usd" => 0.0
    }
  end

  defp compute_global(day) do
    start = DateTime.new!(day, ~T[00:00:00], "Etc/UTC")
    stop = DateTime.add(start, 86_400, :second)

    slots =
      from(s in AttentionSlot, where: s.granted_on == ^day and s.status == "granted")
      |> Repo.aggregate(:count, :id)

    nudges =
      from(n in SurfacedNudge, where: n.surfaced_at >= ^start and n.surfaced_at < ^stop)
      |> Repo.aggregate(:count, :id)

    %{
      "slots_granted" => slots,
      "nudges" => nudges,
      "fallback_rate" => 0.0,
      "hallucination_count" => 0,
      "estimated_cost_usd" => 0.0,
      "baseline_cost_usd" => 0.0,
      "dismiss_rate" => 0.0,
      "proactive_reply_rate" => 1.0
    }
  end

  def evaluate_alerts(metrics) when is_map(metrics) do
    fr = metrics["fallback_rate"] || 0.0
    dismiss = metrics["dismiss_rate"] || 0.0
    reply = metrics["proactive_reply_rate"] || 1.0
    hall = metrics["hallucination_count"] || 0
    cost = metrics["estimated_cost_usd"] || 0.0
    base = metrics["baseline_cost_usd"] || 0.0

    []
    |> maybe_alert(fr >= @fallback_warn, "fallback_rate=#{fr} (>=#{@fallback_warn})")
    |> maybe_alert(
      base > 0 and cost >= base * @cost_mult_warn,
      "cost=#{cost} (>=#{@cost_mult_warn}x baseline #{base})"
    )
    |> maybe_alert(dismiss >= @dismiss_warn, "dismiss_rate=#{dismiss} (>=#{@dismiss_warn})")
    |> maybe_alert(hall > 0, "hallucination_count=#{hall}")
    |> maybe_alert(
      reply < @proactive_reply_min,
      "proactive_reply_rate=#{reply} (<#{@proactive_reply_min})"
    )
  end

  defp maybe_alert(list, true, msg), do: [msg | list]
  defp maybe_alert(list, false, _), do: list

  defp upsert(account_id, day, metrics, alerts) do
    existing =
      if is_nil(account_id) do
        from(m in DailyMetric, where: is_nil(m.account_id) and m.day == ^day, limit: 1)
        |> Repo.one()
      else
        Repo.get_by(DailyMetric, account_id: account_id, day: day)
      end

    case existing do
      %DailyMetric{} = row ->
        row
        |> DailyMetric.changeset(%{metrics: metrics, alerts: alerts})
        |> Repo.update()

      nil ->
        %DailyMetric{}
        |> DailyMetric.changeset(%{
          account_id: account_id,
          day: day,
          metrics: metrics,
          alerts: alerts
        })
        |> Repo.insert()
    end
  end
end
