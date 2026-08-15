defmodule OpalCoreWeb.ReservationExecutionController do
  @moduledoc """
  Product HTTP surface for Pass 19–20 reservation execution.

  Thin wrapper — presentation stays client-side.
  LIVE partner booking is NOT claimed.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.{BookingAuthorization, ReservationExecution}

  def status(conn, _params) do
    json(conn, ReservationExecution.status())
  end

  def check_availability(conn, params) do
    case ReservationExecution.check_availability(params) do
      {:ok, body} ->
        json(conn, humanize_availability(body))

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def authorize(conn, params) do
    user_id = conn.assigns.current_user_id

    attrs =
      params
      |> Map.put("actor_user_id", user_id)
      |> Map.put_new("explicit_confirm", true)

    case BookingAuthorization.issue(attrs) do
      {:ok, auth} ->
        json(conn, %{
          "authorization" => auth,
          "human_copy" => auth["proof"]["copy"],
          "live_claimed" => false
        })

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def request_booking(conn, params) do
    user_id = conn.assigns.current_user_id
    auth = params["authorization"] || %{}

    auth =
      if is_map(auth) do
        Map.put_new(auth, "actor_user_id", user_id)
      else
        %{"actor_user_id" => user_id}
      end

    attrs =
      params
      |> Map.put("authorization", auth)
      |> Map.put("actor_user_id", user_id)

    case ReservationExecution.request_booking(attrs) do
      {:ok, body} ->
        json(conn, body)

      {:error, :authorization_revoked} ->
        conn |> put_status(:forbidden) |> json(%{"error" => "authorization_revoked"})

      {:error, :authorization_expired} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "authorization_expired"})

      {:error, :availability_expired} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "availability_expired"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def show(conn, %{"id" => id}) do
    case ReservationExecution.get(id) do
      {:ok, exec} -> json(conn, %{"execution" => exec, "live_claimed" => false})
      {:error, _} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def reconcile(conn, %{"id" => id} = params) do
    opts =
      if params["force_status"],
        do: [force_status: params["force_status"]],
        else: []

    case ReservationExecution.reconcile(id, opts) do
      {:ok, body} -> json(conn, body)
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def cancel(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case ReservationExecution.cancel(id, user_id) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def drift(conn, %{"id" => id} = params) do
    reality = params["reality"] || Map.take(params, ["when", "where", "when_label", "place_display_name"])

    case ReservationExecution.detect_drift(id, reality) do
      {:ok, body} -> json(conn, body)
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  # Strip technical fields from product-facing availability payload
  defp humanize_availability(body) when is_map(body) do
    slots =
      Enum.map(body["slots"] || [], fn s ->
        %{
          "slot_id" => s["slot_id"] || s["id"],
          "label" => s["label"]
        }
      end)

    %{
      "available" => body["available"] == true,
      "status" => body["status"],
      "place_display_name" => body["place_display_name"],
      "party_size" => body["party_size"],
      "slots" => slots,
      "shared_safe_summary" => body["shared_safe_summary"],
      "live_claimed" => false,
      "mode" => body["mode"] || "synthetic_provider",
      "development_proof" => true,
      # expires_at kept for client refresh logic — never render as TTL copy
      "expires_at" => body["expires_at"],
      "availability_id" => body["availability_id"]
    }
  end
end
