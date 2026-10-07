defmodule OpalCore.Push.Workers.DigestWorker do
  @moduledoc """
  Daily digest / morning summary flush.

  Cron: hourly; only delivers around 9 AM local (vibe-adjusted via quiet window end).
  Deep-link opens Attention Center digest surface (`opal://attention/digest`).
  """

  use Oban.Worker, queue: :push, max_attempts: 2

  require Logger

  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Repo
  alias OpalCore.Accounts.User

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    # Scan recently-active users with held items by touching known user ids lightly.
    # Held table is ETS-keyed by user_id; we iterate users who have vibe/activity.
    User
    |> Repo.all()
    |> Enum.each(fn %User{id: user_id} ->
      if should_flush_now?(user_id) do
        case NotificationIntelligence.flush_held(user_id) do
          {:ok, _} -> :ok
          other -> Logger.info("push.digest_flush user=#{user_id} result=#{inspect(other)}")
        end
      end
    end)

    :ok
  end

  defp should_flush_now?(user_id) do
    {_start, end_h} = NotificationIntelligence.quiet_window(user_id)
    # Flush at quiet-end hour (morning summary). Default end 8 → flush at 8–9.
    hour =
      case DateTime.now("America/Los_Angeles") do
        {:ok, dt} -> dt.hour
        _ -> DateTime.utc_now().hour
      end

    hour == end_h or hour == 9
  end
end
