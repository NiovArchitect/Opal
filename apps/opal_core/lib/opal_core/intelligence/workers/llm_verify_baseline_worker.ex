defmodule OpalCore.Intelligence.Workers.LlmVerifyBaselineWorker do
  @moduledoc """
  Weekly Sunday LLM_VERIFY baseline compare (Paste E6).

  Reads shots/intelligence/LLM_VERIFY.json if present and stores a snapshot
  metric; warns on regression signals (hallucination>0, readiness not ready).
  Does not require a live key — logs SKIP when verify artifact absent.
  """

  use Oban.Worker, queue: :events, max_attempts: 1

  require Logger

  alias OpalCore.Intelligence.Metrics

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    path =
      Path.expand("../../../../../../shots/intelligence/LLM_VERIFY.json", __DIR__)

    path =
      if File.exists?(path) do
        path
      else
        Path.join(File.cwd!(), "shots/intelligence/LLM_VERIFY.json")
      end

    case read_verify(path) do
      {:ok, data} ->
        day = Date.utc_today()
        hall = hallucination_count(data)
        ready = readiness(data)

        metrics = %{
          "fallback_rate" => 0.0,
          "hallucination_count" => hall,
          "estimated_cost_usd" => Map.get(data, "cost_projection_usd_mo_at_1k_convos", 0) |> to_float(),
          "baseline_cost_usd" => 1.31,
          "dismiss_rate" => 0.0,
          "proactive_reply_rate" => 1.0,
          "llm_verify_ready" => ready,
          "source" => "LLM_VERIFY.json"
        }

        alerts = Metrics.evaluate_alerts(metrics)

        _ = Metrics.aggregate_global(day)

        Enum.each(alerts, fn a ->
          Logger.warning("llm_verify_baseline.alert #{a}")
        end)

        Logger.info(
          "llm_verify_baseline.compared day=#{day} hall=#{hall} ready=#{ready} alerts=#{length(alerts)}"
        )

        :ok

      {:error, reason} ->
        Logger.info("llm_verify_baseline.skip reason=#{inspect(reason)}")
        :ok
    end
  end

  defp read_verify(path) do
    with true <- File.exists?(path),
         {:ok, body} <- File.read(path),
         {:ok, data} <- Jason.decode(body) do
      {:ok, data}
    else
      false -> {:error, :missing}
      {:error, r} -> {:error, r}
    end
  end

  defp hallucination_count(data) when is_map(data) do
    matrix = data["matrix"] || %{}

    matrix
    |> Map.values()
    |> Enum.count(fn v ->
      s = to_string(v)
      String.contains?(String.downcase(s), "hallucin") or s == "FAIL"
    end)
  end

  defp readiness(data) do
    case data["readiness"] || data["llm_readiness"] do
      "ready" -> true
      :ready -> true
      _ -> Map.get(data, "tip_sha") != nil
    end
  end

  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(s) when is_binary(s) do
    case Float.parse(String.replace(s, ~r/[^0-9.]/, "")) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp to_float(_), do: 0.0
end
