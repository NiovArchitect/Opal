defmodule OpalCoreWeb.ConsentController do
  @moduledoc """
  Phase 1D — consent HTTP API for act-on-behalf management UI.

  GET    /api/v1/product/consents
  POST   /api/v1/product/consents
  DELETE /api/v1/product/consents/:id
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Consent
  alias OpalCore.Consent.ConsentProof

  @product_capabilities Consent.act_on_behalf_capabilities()

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    consents =
      user_id
      |> Consent.list_for_user()
      |> Enum.map(&ConsentProof.to_contract/1)

    json(conn, %{"consents" => consents})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    capability = params["capability"]

    cond do
      not is_binary(capability) or String.trim(capability) == "" ->
        unprocessable(conn, "capability_required", "Choose a capability")

      normalize_product_capability(capability) not in @product_capabilities ->
        unprocessable(conn, "invalid_capability", "Capability is not available")

      true ->
        case Consent.grant(user_id, capability, %{
               "expires_at" => params["expires_at"],
               "evidence_type" => "settings_grant",
               "evidence_reference" => "consent.settings/#{user_id}/#{capability}"
             }) do
          {:ok, proof} ->
            conn
            |> put_status(201)
            |> json(%{"consent" => ConsentProof.to_contract(proof)})

          {:error, :expires_at_required} ->
            unprocessable(conn, "expires_at_required", "An expiry is required")

          {:error, :invalid_expires_at} ->
            unprocessable(conn, "invalid_expires_at", "Expiry is not valid")

          {:error, :unknown_capability} ->
            unprocessable(conn, "invalid_capability", "Capability is not available")

          {:error, reason} ->
            unprocessable(conn, "could_not_grant", inspect(reason))
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Consent.revoke(id, user_id) do
      {:ok, proof} ->
        json(conn, %{"consent" => ConsentProof.to_contract(proof)})

      {:error, :not_found} ->
        not_found(conn)

      {:error, :user_mismatch} ->
        # Foreign proofs — no leak.
        not_found(conn)

      {:error, reason} ->
        unprocessable(conn, "could_not_revoke", inspect(reason))
    end
  end

  defp normalize_product_capability(cap) when is_binary(cap) do
    Map.get(Consent.capability_label_map(), cap, cap)
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp unprocessable(conn, code, message) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => code, "message" => message})
  end
end
