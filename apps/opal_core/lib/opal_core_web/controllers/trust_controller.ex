defmodule OpalCoreWeb.TrustController do
  @moduledoc """
  Phase RU-2 — progressive trust tiers HTTP API.

  GET  /api/v1/product/trust/tier
  POST /api/v1/product/trust/tier/grant
  """

  use OpalCoreWeb, :controller

  alias OpalCore.TrustTiers

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, TrustTiers.tier_info(user_id))
  end

  def grant(conn, params) do
    user_id = conn.assigns.current_user_id
    tier = params["tier"]

    # API only allows user-granted inner_circle (other tiers are automatic).
    cond do
      tier != "inner_circle" ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid",
          "message" => "Only inner_circle can be granted manually via this endpoint."
        })

      true ->
        case TrustTiers.grant_tier(user_id, "inner_circle", "user") do
          {:ok, row} ->
            json(conn, %{
              "tier" => TrustTiers.to_contract(row)["tier"] || "inner_circle",
              "relationship" => TrustTiers.to_contract(row),
              "info" => TrustTiers.tier_info(user_id)
            })

          {:error, :cannot_skip} ->
            conn
            |> put_status(422)
            |> json(%{
              "error_code" => "cannot_skip",
              "message" => "Reach trusted first — as we get to know each other better."
            })

          {:error, reason} ->
            conn
            |> put_status(422)
            |> json(%{"error_code" => "invalid", "reason" => to_string(reason)})
        end
    end
  end
end
