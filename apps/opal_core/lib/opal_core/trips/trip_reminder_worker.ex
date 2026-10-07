defmodule OpalCore.Trips.TripReminderWorker do
  @moduledoc """
  Daily Oban cron for trip anticipation + memory bookends.

  Runs TripBookends.process_all/1. Template slots documented on TripBookends
  are the seam for future LLM generation.
  """

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger

  alias OpalCore.Trips.TripBookends

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    today =
      case args["today"] do
        iso when is_binary(iso) ->
          case Date.from_iso8601(iso) do
            {:ok, d} -> d
            _ -> Date.utc_today()
          end

        _ ->
          Date.utc_today()
      end

    summary = TripBookends.process_all(today)
    Logger.info("trip_reminder sent=#{summary.sent} skipped=#{summary.skipped} today=#{Date.to_iso8601(today)}")
    :ok
  end
end
