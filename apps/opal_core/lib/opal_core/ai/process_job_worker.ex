defmodule OpalCore.AI.ProcessJobWorker do
  use Oban.Worker, queue: :ai, max_attempts: 3

  alias OpalCore.AI
  alias OpalCore.AI.AiJob
  alias OpalCore.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"job_id" => job_id}, attempt: attempt, max_attempts: max}) do
    case Repo.get(AiJob, job_id) do
      nil ->
        :ok

      %AiJob{} = job ->
        # HA-09 (Repair #18 hunt-fix): a retryable AI failure returns
        # {:error, _} so Oban actually spends max_attempts on real
        # re-executions. The old mapping turned every outcome into
        # :ok, so the declared retries never happened.
        case AI.process_job(job, oban_attempt: attempt, oban_max_attempts: max) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end
    end
  end
end
