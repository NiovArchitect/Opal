defmodule OpalCore.Push.Workers.DigestWorker do
  @moduledoc """
  Daily digest / morning summary flush.

  Cron: hourly; only delivers around 9 AM local (adjusted via the
  stored quiet window's end, from the one QuietHours resolver).
  Deep-link opens Attention Center digest surface (`opal://attention/digest`).
  """

  use Oban.Worker, queue: :push, max_attempts: 2

  require Logger

  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Repo
  alias OpalCore.Accounts.User
  alias OpalCore.SocialFlow.Clock

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
    # Flush at quiet-end hour (morning summary), in the user's own
    # timezone from the ONE quiet-hours resolver (BS-04) — the old
    # hardcoded America/Los_Angeles shift is retired.
    window = OpalCore.SocialFlow.QuietHours.window_for(user_id)
    hour = OpalCore.SocialFlow.QuietHours.local_now(window, Clock.utc_now()).hour

    hour == end_h or hour == 9
  end
end
