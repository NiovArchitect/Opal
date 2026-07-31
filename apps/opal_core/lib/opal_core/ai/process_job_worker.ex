defmodule OpalCore.AI.ProcessJobWorker do
  use Oban.Worker, queue: :ai, max_attempts: 3

  alias OpalCore.AI
  alias OpalCore.AI.AiJob
  alias OpalCore.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"job_id" => job_id}}) do
    case Repo.get(AiJob, job_id) do
      nil ->
        :ok

      %AiJob{} = job ->
        case AI.process_job(job) do
          {:ok, _} -> :ok
          {:error, _} -> :ok
        end
    end
  end
end
