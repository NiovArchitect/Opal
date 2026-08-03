defmodule OpalCoreWeb.ContactController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Onboarding

  def resolve(conn, params) do
    attrs = %{
      requester_user_id: conn.assigns.current_user_id,
      identifier_raw: params["phone"] || params["identifier_raw"],
      local_display_label: params["label"] || params["local_display_label"],
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"] || "trace-contact"
    }

    case Onboarding.resolve_contact(attrs) do
      {:ok, res, origin} ->
        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{"resolution" => res, "origin" => to_string(origin)})

      {:error, :invalid_identifier} ->
        error(conn, 422, "invalid_identifier", "Enter a valid phone number")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Too many lookups. Try again later")

      {:error, :youth_adult_matching_denied} ->
        error(conn, 403, "youth_matching_denied", "This path is not available")

      {:error, reason} ->
        error(conn, 422, "resolve_failed", inspect(reason))
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
