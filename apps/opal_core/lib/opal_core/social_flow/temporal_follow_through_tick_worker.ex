defmodule OpalCore.SocialFlow.TemporalFollowThroughTickWorker do
  @moduledoc """
  Oban cron tick for Track A7 TemporalFollowThrough.

  Re-evaluates open loops and projects AttentionAuthority decisions into
  AttentionCenter. Does not mutate SharedPlan / ConversationAlignment.
  STALE_BACKGROUND_JOB_MUTATES_CURRENT_STATE = 0.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.TemporalFollowThrough

  @impl Oban.Worker
  def perform(%Oban.Job{} = _job) do
    TemporalFollowThrough.reevaluate_open()
    |> Enum.each(&ingest_attention/1)

    :ok
  end

  defp ingest_attention(%{"attention" => decision}) when is_map(decision) do
    _ = AttentionCenter.ingest(decision)
    :ok
  end

  defp ingest_attention(_), do: :ok
end
