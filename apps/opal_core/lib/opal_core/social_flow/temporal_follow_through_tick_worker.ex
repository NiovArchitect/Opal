defmodule OpalCore.SocialFlow.TemporalFollowThroughTickWorker do
  @moduledoc """
  Oban cron tick for Track A7 TemporalFollowThrough.

  Re-evaluates open loops and projects AttentionAuthority decisions into
  AttentionCenter. Does not mutate SharedPlan / ConversationAlignment.
  STALE_BACKGROUND_JOB_MUTATES_CURRENT_STATE = 0.

  Repair #18 B4: the same tick first materializes due care-rotation
  occurrences (idempotent) and, after re-evaluation, surfaces missed
  check-ins exactly once through CareRotations. No new cron, no new
  scheduler — the TFT tick is the clock.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.CareRotations
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.TemporalFollowThrough

  @impl Oban.Worker
  def perform(%Oban.Job{} = _job) do
    _ = run_now()
    :ok
  end

  @doc "One full tick at the canonical clock. Shared by the cron worker and the dev staging seam."
  def run_now do
    now = Clock.utc_now()
    materialized = CareRotations.materialize_active(now)

    TemporalFollowThrough.reevaluate_open(now: now)
    |> Enum.each(&ingest_attention/1)

    missed = CareRotations.surface_missed(now)

    %{materialized: materialized, missed: missed}
  end

  defp ingest_attention(%{"attention" => decision}) when is_map(decision) do
    _ = AttentionCenter.ingest(decision)
    :ok
  end

  defp ingest_attention(_), do: :ok
end
