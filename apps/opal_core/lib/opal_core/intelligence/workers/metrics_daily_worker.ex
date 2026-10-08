defmodule OpalCore.Intelligence.Workers.MetricsDailyWorker do
  @moduledoc "Daily Oban aggregate into intelligence_daily_metrics (Paste E6)."

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.Metrics
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.ConversationIndex

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    day =
      case args["day"] do
        iso when is_binary(iso) ->
          case Date.from_iso8601(iso) do
            {:ok, d} -> d
            _ -> Date.add(Date.utc_today(), -1)
          end

        _ ->
          Date.add(Date.utc_today(), -1)
      end

    account_ids =
      from(i in ConversationIndex, distinct: true, select: i.account_id)
      |> Repo.all()

    Enum.each(account_ids, fn aid ->
      result = Metrics.aggregate_account(aid, day)

      if result.alerts != [] do
        Logger.warning(
          "intelligence_metrics.alerts account=#{aid} day=#{day} alerts=#{inspect(result.alerts)}"
        )
      end
    end)

    global = Metrics.aggregate_global(day)

    if global.alerts != [] do
      Logger.warning("intelligence_metrics.global_alerts day=#{day} alerts=#{inspect(global.alerts)}")
    end

    Logger.info(
      "intelligence_metrics.aggregated day=#{day} accounts=#{length(account_ids)}"
    )

    :ok
  end
end
