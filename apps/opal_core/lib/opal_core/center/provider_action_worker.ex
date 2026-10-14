defmodule OpalCore.Center.ProviderActionWorker do
  @moduledoc "Oban worker for Center ProviderActionJob execution."

  use Oban.Worker, queue: :events, max_attempts: 3

  alias OpalCore.Center.ProviderAction
  alias OpalCore.Center.ProviderActionJob
  alias OpalCore.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"job_id" => job_id}}) do
    case Repo.get(ProviderActionJob, job_id) do
      %ProviderActionJob{status: status} = job when status in ~w(queued running) ->
        case ProviderAction.perform(job) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end

      %ProviderActionJob{} ->
        :ok

      nil ->
        :ok
    end
  end

  def perform(%Oban.Job{args: args}) do
    case args do
      %{job_id: job_id} -> perform(%Oban.Job{args: %{"job_id" => job_id}})
      _ -> :ok
    end
  end
end
