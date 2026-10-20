defmodule OpalCore.SocialFlow.NonResponseEtiquetteWorker do
  @moduledoc """
  Oban stage job for the non-response etiquette lifecycle (P13/P14).

  This is the ONLY timer in the feature, and it is not a poll: one job
  is enqueued when a request opens (`scheduled_at` = the grace
  deadline), and each stage enqueues exactly one successor job for the
  next deadline. The job carries the stage it was scheduled for;
  `NonResponseEtiquette.advance/2` due-guards and stage-guards it, so a
  stale or replayed job is an honest no-op and can never mutate current
  state (STALE_BACKGROUND_JOB_MUTATES_CURRENT_STATE = 0).
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  alias OpalCore.SocialFlow.NonResponseEtiquette

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"loop_id" => loop_id, "stage" => stage}}) do
    case NonResponseEtiquette.advance(loop_id, stage: stage) do
      {:ok, _outcome} -> :ok
      {:error, :not_found} -> {:cancel, :loop_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  def perform(%Oban.Job{args: %{"loop_id" => loop_id}}) do
    perform(%Oban.Job{args: %{"loop_id" => loop_id, "stage" => nil}})
  end

  def perform(%Oban.Job{}), do: {:cancel, :invalid_args}
end
