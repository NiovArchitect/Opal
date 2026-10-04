defmodule OpalCoreWeb.TripController do
  @moduledoc """
  Phase 4C — trip HTTP API (backend only).

  POST   /api/v1/product/trips
  GET    /api/v1/product/trips
  GET    /api/v1/product/trips/:id
  PATCH  /api/v1/product/trips/:id
  POST   /api/v1/product/trips/:id/legs
  PATCH  /api/v1/product/trips/:id/legs/reorder
  DELETE /api/v1/product/trips/:id/legs/:leg_id
  POST   /api/v1/product/trips/:id/legs/:leg_id/link-plan
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Trips
  alias OpalCore.Trips.TripLeg

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Trips.create_trip(user_id, params) do
      {:ok, trip} ->
        conn
        |> put_status(201)
        |> json(%{"trip" => Trips.to_contract(trip)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)
    end
  end

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    case Trips.list_trips_for_user(user_id) do
      {:ok, trips} ->
        json(conn, %{"trips" => Enum.map(trips, &Trips.to_contract/1)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Trips.get_trip_for_user(id, user_id) do
      {:ok, trip} -> json(conn, %{"trip" => Trips.to_contract(trip)})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def update(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, updated} <- Trips.update_trip(trip, params) do
      json(conn, %{"trip" => Trips.to_contract(updated)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  def add_leg(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, leg} <- Trips.add_leg(id, params) do
      conn
      |> put_status(201)
      |> json(%{"leg" => TripLeg.to_contract(leg)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  def reorder_legs(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    leg_ids = List.wrap(params["leg_ids"])

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, trip} <- Trips.reorder_legs(id, leg_ids) do
      json(conn, %{"trip" => Trips.to_contract(trip)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  def remove_leg(conn, %{"id" => id, "leg_id" => leg_id}) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, leg} <- Trips.remove_leg(id, leg_id) do
      json(conn, %{"leg" => TripLeg.to_contract(leg), "removed" => true})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  def link_plan(conn, %{"id" => id, "leg_id" => leg_id} = params) do
    user_id = conn.assigns.current_user_id
    plan_id = params["shared_plan_id"]

    cond do
      not is_binary(plan_id) or String.trim(plan_id) == "" ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "shared_plan_id_required"})

      true ->
        with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
             {:ok, leg} <- Trips.link_leg_plan(id, leg_id, plan_id, user_id) do
          json(conn, %{"leg" => TripLeg.to_contract(leg)})
        else
          {:error, :not_found} -> not_found(conn)
          {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
        end
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" => Ecto.Changeset.traverse_errors(cs, fn {msg, _} -> msg end)
    })
  end
end
