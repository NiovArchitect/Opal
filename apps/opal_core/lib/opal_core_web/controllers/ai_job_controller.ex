defmodule OpalCoreWeb.AiJobController do
  use OpalCoreWeb, :controller

  alias OpalCore.AI
  alias OpalCore.Contracts

  def show(conn, %{"job_id" => job_id}) do
    user_id = conn.assigns.current_user_id

    case AI.get_job_for_user(job_id, user_id) do
      nil ->
        envelope =
          Contracts.error_envelope("job_not_found", "AI job not found for user",
            trace_id: "trace-http-error-0002"
          )

        conn
        |> put_status(404)
        |> json(envelope)

      job ->
        json(conn, %{"job" => AI.job_to_api(job)})
    end
  end
end
