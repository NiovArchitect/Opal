defmodule OpalCoreWeb.FounderSeedController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.FounderCommunicationSeed

  @doc """
  POST /api/v1/product/dev/founder-communication-seed

  Body: `{ "explicit_opt_in": true }`

  Only when Application env `:allow_founder_communication_seed` is true (dev/test).
  Provisions deterministic Direct + Group via existing Messages owner.
  """
  def ensure_communication(conn, params) do
    user_id = conn.assigns.current_user_id
    explicit? = params["explicit_opt_in"] in [true, "true", "1", 1]

    case FounderCommunicationSeed.ensure!(user_id, explicit_opt_in: explicit?) do
      {:ok, payload} ->
        json(conn, Map.put(payload, "ok", true))

      {:error, :founder_seed_disabled} ->
        error(conn, 403, "founder_seed_disabled", "Founder communication seed is not enabled")

      {:error, :explicit_opt_in_required} ->
        error(conn, 422, "explicit_opt_in_required", "explicit_opt_in must be true")

      {:error, reason} ->
        error(conn, 422, "founder_seed_failed", inspect(reason))
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
