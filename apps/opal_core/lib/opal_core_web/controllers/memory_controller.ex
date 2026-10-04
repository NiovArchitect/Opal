defmodule OpalCoreWeb.MemoryController do
  @moduledoc """
  Phase 7A — memory transparency HTTP API ("What Opal remembers").

  GET    /api/v1/product/memory/facts
  DELETE /api/v1/product/memory/facts/:id
  """

  use OpalCoreWeb, :controller

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

    case DurablePreferenceMemory.forget_with_candidates(id, user_id) do
      {:ok, memory, cleanup} ->
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
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end
end
