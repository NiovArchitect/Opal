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
  POST   /api/v1/product/trips/:id/legs/:leg_id/create-plan
  POST   /api/v1/product/trips/:id/curate
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips
  alias OpalCore.Trips.GroupCurator
  alias OpalCore.Trips.TripCurator
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

  def create_plan(conn, %{"id" => id, "leg_id" => leg_id}) do
    user_id = conn.assigns.current_user_id

    case Trips.create_plan_from_leg(id, leg_id, user_id) do
      {:ok, :created, plan, participants, leg} ->
        conn
        |> put_status(201)
        |> json(plan_create_body(plan, participants, leg))

      {:ok, :existing, plan, participants, leg} ->
        json(conn, plan_create_body(plan, participants, leg))

      {:error, :not_found} ->
        not_found(conn)

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)
    end
  end

  @doc "Add a canvas day (Trip → Day)."
  def add_day(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, day} <- Trips.add_day(id, params) do
      conn
      |> put_status(201)
      |> json(%{"day" => OpalCore.Trips.TripDay.to_contract(day)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  @doc "Add a loose time block to a day."
  def add_time_block(conn, %{"id" => id, "day_id" => day_id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, block} <- Trips.add_time_block(id, day_id, params) do
      conn
      |> put_status(201)
      |> json(%{"time_block" => OpalCore.Trips.TripTimeBlock.to_contract(block)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  @doc "Propose a real-venue activity inside a block."
  def add_activity(conn, %{"id" => id, "block_id" => block_id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, activity} <- Trips.add_activity(id, block_id, params) do
      conn
      |> put_status(201)
      |> json(%{"activity" => OpalCore.Trips.TripActivity.to_contract(activity)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  @doc "Set in | interested | passed on an activity (subgroup signal)."
  def set_activity_response(conn, %{"id" => id, "activity_id" => activity_id} = params) do
    user_id = conn.assigns.current_user_id
    state = params["state"]

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, row} <- Trips.set_activity_response(id, activity_id, user_id, state) do
      json(conn, %{"response" => OpalCore.Trips.TripActivityResponse.to_contract(row)})
    else
      {:error, :not_found} -> not_found(conn)
      {:error, %Ecto.Changeset{} = cs} -> unprocessable(conn, cs)
    end
  end

  @doc "Learned vibe profiles for everyone on the trip."
  def vibe_profiles(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    with {:ok, _trip} <- Trips.get_trip_for_user(id, user_id),
         {:ok, profiles} <- Trips.vibe_profiles_for_trip(id) do
      json(conn, %{"profiles" => profiles})
    else
      {:error, :not_found} -> not_found(conn)
    end
  end

  @doc "Seed Mexico City 4-day canvas with real venues + free blocks + RSVPs."
  def seed_mexico_city_canvas(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    with {:ok, trip} <- Trips.get_trip_for_user(id, user_id) do
      peer_ids = Enum.map(trip.participants || [], & &1.user_id)

      case Trips.seed_mexico_city_canvas(id, [user_id | peer_ids]) do
        {:ok, seeded} ->
          json(conn, %{"trip" => Trips.to_contract(seeded)})

        {:error, %Ecto.Changeset{} = cs} ->
          unprocessable(conn, cs)

        {:error, :not_found} ->
          not_found(conn)
      end
    else
      {:error, :not_found} -> not_found(conn)
    end
  end

  @doc """
  Phase 3 experience curation — together / splits / free / proposals (commits nothing).
  """
  def curate_experience(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case GroupCurator.curate(id, user_id) do
      {:ok, result} -> json(conn, result)
      {:error, :not_found} -> not_found(conn)
    end
  end

  @doc """
  Phase 4G — suggest stops for a trip destination (commits nothing).
  """
  def curate(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case TripCurator.curate(id, user_id) do
      {:ok, result} ->
        json(conn, result)

      {:error, :not_found} ->
        not_found(conn)

      {:error, {:no_curated_destination, label}} ->
        conn
        |> put_status(404)
        |> json(%{
          "error_code" => "no_curated_destination",
          "error" => "no_curated_destination",
          "destination" => label
        })

      {:error, :user_ids_required} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "user_ids_required"})

      {:error, {:unknown_users, _}} ->
        not_found(conn)

      {:reject, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "rejected", "message" => to_string(reason)})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "curate_failed", "message" => inspect(reason)})
    end
  end

  defp plan_create_body(%SharedPlan{} = plan, participants, %TripLeg{} = leg) do
    %{
      "plan" => SharedPlan.to_contract(plan),
      "participants" =>
        Enum.map(participants, fn p ->
          %{
            "user_id" => p.user_id,
            "role" => p.role,
            "response_state" => p.response_state
          }
        end),
      "leg" => TripLeg.to_contract(leg)
    }
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
