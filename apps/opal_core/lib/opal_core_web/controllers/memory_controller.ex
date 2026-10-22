defmodule OpalCoreWeb.MemoryController do
  @moduledoc """
  Phase 7A — memory transparency HTTP API ("What Opal remembers").

  GET    /api/v1/product/memory/facts
  DELETE /api/v1/product/memory/facts/:id
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Auth.StepUpElevation
  alias OpalCore.SocialFlow.DurablePreferenceMemory

  def index_facts(conn, _params) do
    user_id = conn.assigns.current_user_id

    facts =
      [user_id]
      |> DurablePreferenceMemory.list_for_owners()
      |> Enum.map(&DurablePreferenceMemory.to_transparency_fact/1)
      |> Enum.reject(&is_nil/1)

    json(conn, %{"facts" => facts})
  end

  def delete_fact(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    # Repair #24 (WS-5): forgetting a memory fact is a manual memory
    # mutation - it requires a live step-up elevation for this
    # account + session, exactly like the capsule mutations.
    with {:ok, elevation} <- require_elevation(conn) do
      case DurablePreferenceMemory.forget_with_candidates(id, user_id) do
        {:ok, memory, cleanup} ->
          _ = StepUpElevation.record_mutation_audit(elevation, "fact_forgotten", id)

          json(conn, %{
            "fact" => DurablePreferenceMemory.to_transparency_fact(memory),
            "forgotten" => true,
            "candidates_removed" => cleanup["candidates_removed"],
            "candidate_cleanup" => cleanup["candidate_cleanup"]
          })

        {:error, :not_found} ->
          not_found(conn)

        {:error, :forbidden} ->
          # Foreign facts — no leak.
          not_found(conn)

        {:error, reason} ->
          conn
          |> put_status(422)
          |> json(%{"error_code" => "could_not_forget", "message" => inspect(reason)})
      end
    else
      {:error, :step_up_required} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "step_up_required",
          "message" =>
            "Confirm it is you first: Opal will send a fresh code to the phone number on your account. Your account has no password, so the phone code is the check.",
          "credential" => "phone_code",
          "password_credential_exists" => false
        })
    end
  end

  defp require_elevation(conn) do
    token =
      Plug.Conn.get_req_header(conn, "x-opal-step-up-elevation") |> List.first() ||
        conn.params["step_up_token"]

    StepUpElevation.authorize(
      conn.assigns.current_user_id,
      conn.assigns.current_session.id,
      token
    )
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end
end
