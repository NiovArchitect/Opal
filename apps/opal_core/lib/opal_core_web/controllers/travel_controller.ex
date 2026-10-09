defmodule OpalCoreWeb.TravelController do
  @moduledoc """
  Phase X — timezone-only travel ingest + home timezone settings.

  POST /api/v1/product/travel/ingest
    Body: %{timezone: "Asia/Tokyo", city?: "Tokyo", at?: iso8601}
    City optional (only when location granted). GPS keys → 422 gps_forbidden.

  GET  /api/v1/product/travel/home_timezone
  PATCH /api/v1/product/travel/home_timezone  %{timezone: "..."}
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Intelligence.TravelMode

  def ingest(conn, params) do
    user_id = conn.assigns.current_user_id
    attrs = stringify(params)

    case TravelMode.ingest_reading(user_id, attrs) do
      {:ok, status} ->
        json(conn, %{
          "ok" => true,
          "status" => to_string(status),
          "active" => TravelMode.active?(user_id),
          "effective_timezone" => TravelMode.effective_tz(user_id),
          "home_timezone" => TravelMode.home_timezone(user_id),
          "privacy" => "Opal knows your timezone, never your precise location."
        })

      {:error, :gps_forbidden} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "gps_forbidden",
          "message" => "Opal knows your timezone, never your precise location."
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason)})
    end
  end

  def show_home_timezone(conn, _params) do
    user_id = conn.assigns.current_user_id

    json(conn, %{
      "home_timezone" => TravelMode.home_timezone(user_id),
      "effective_timezone" => TravelMode.effective_tz(user_id),
      "active" => TravelMode.active?(user_id),
      "privacy" => "Opal knows your timezone, never your precise location."
    })
  end

  def update_home_timezone(conn, params) do
    user_id = conn.assigns.current_user_id
    tz = params["timezone"] || params["home_timezone"]

    case TravelMode.set_home_timezone(user_id, tz) do
      {:ok, _} ->
        json(conn, %{
          "home_timezone" => TravelMode.home_timezone(user_id),
          "effective_timezone" => TravelMode.effective_tz(user_id),
          "active" => TravelMode.active?(user_id),
          "privacy" => "Opal knows your timezone, never your precise location."
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason)})
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
