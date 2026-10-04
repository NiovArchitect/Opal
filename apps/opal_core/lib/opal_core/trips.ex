defmodule OpalCore.Trips do
  @moduledoc """
  Trip domain context — shared social adventure objects with ordered legs.

  People-first: a trip is agreement around a shared adventure, not an
  itinerary spreadsheet. Does not touch JourneyAuthority or SharedPlan
  machinery beyond an optional FK link on a leg.
  """

  import Ecto.Query

  alias Ecto.Changeset
  alias Ecto.Multi
  alias OpalCore.Repo
  alias OpalCore.Trips.Trip
  alias OpalCore.Trips.TripLeg

  @doc "Create a trip for a user. Zero legs is valid (planning phase)."
  def create_trip(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    params =
      attrs
      |> stringify_keys()
      |> Map.put("created_by_user_id", user_id)

    %Trip{}
    |> Trip.changeset(params)
    |> Repo.insert()
    |> maybe_preload_legs()
  end

  def create_trip(_, _), do: {:error, error_changeset(Trip, :created_by_user_id, "is required")}

  @doc "Load a trip with legs ordered by position."
  def get_trip(id) when is_binary(id) do
    case Repo.get(Trip, id) do
      %Trip{} = trip ->
        {:ok, Repo.preload(trip, legs: from(l in TripLeg, order_by: [asc: l.position]))}

      nil ->
        {:error, error_changeset(Trip, :id, "not found")}
    end
  end

  def get_trip(_), do: {:error, error_changeset(Trip, :id, "is invalid")}

  @doc "List trips created by the user, newest first, legs preloaded in order."
  def list_trips_for_user(user_id) when is_binary(user_id) do
    trips =
      from(t in Trip,
        where: t.created_by_user_id == ^user_id,
        order_by: [desc: t.inserted_at],
        preload: [legs: ^from(l in TripLeg, order_by: [asc: l.position])]
      )
      |> Repo.all()

    {:ok, trips}
  end

  def list_trips_for_user(_), do: {:error, error_changeset(Trip, :created_by_user_id, "is invalid")}

  @doc "Append a leg at max(position)+1 (or 0 when empty)."
  def add_leg(trip_id, attrs) when is_binary(trip_id) and is_map(attrs) do
    case Repo.get(Trip, trip_id) do
      nil ->
        {:error, error_changeset(TripLeg, :trip_id, "not found")}

      %Trip{} ->
        next_pos = next_position(trip_id)

        params =
          attrs
          |> stringify_keys()
          |> Map.put("trip_id", trip_id)
          |> Map.put("position", next_pos)

        %TripLeg{}
        |> TripLeg.changeset(params)
        |> Repo.insert()
    end
  end

  def add_leg(_, _), do: {:error, error_changeset(TripLeg, :trip_id, "is invalid")}

  @doc """
  Rewrite leg positions atomically to match the given ordered leg id list.
  Must include every current leg of the trip exactly once.
  """
  def reorder_legs(trip_id, leg_ids)
      when is_binary(trip_id) and is_list(leg_ids) do
    case Repo.get(Trip, trip_id) do
      nil ->
        {:error, error_changeset(TripLeg, :trip_id, "not found")}

      %Trip{} ->
        existing =
          from(l in TripLeg, where: l.trip_id == ^trip_id, select: l.id)
          |> Repo.all()
          |> MapSet.new()

        given = MapSet.new(leg_ids)

        cond do
          Enum.any?(leg_ids, &(not is_binary(&1))) ->
            {:error, error_changeset(TripLeg, :id, "is invalid")}

          length(leg_ids) != MapSet.size(given) ->
            {:error, error_changeset(TripLeg, :id, "duplicate leg ids")}

          given != existing ->
            {:error, error_changeset(TripLeg, :id, "must list every leg of the trip exactly once")}

          true ->
            do_reorder(trip_id, leg_ids)
        end
    end
  end

  def reorder_legs(_, _), do: {:error, error_changeset(TripLeg, :trip_id, "is invalid")}

  @doc "Remove a leg from a trip. Remaining positions may have gaps until reorder."
  def remove_leg(trip_id, leg_id) when is_binary(trip_id) and is_binary(leg_id) do
    case Repo.get_by(TripLeg, id: leg_id, trip_id: trip_id) do
      nil ->
        {:error, error_changeset(TripLeg, :id, "not found")}

      %TripLeg{} = leg ->
        Repo.delete(leg)
    end
  end

  def remove_leg(_, _), do: {:error, error_changeset(TripLeg, :id, "is invalid")}

  defp do_reorder(trip_id, leg_ids) do
    multi =
      leg_ids
      |> Enum.with_index()
      |> Enum.reduce(Multi.new(), fn {leg_id, pos}, multi ->
        Multi.update_all(
          multi,
          {:pos, leg_id},
          from(l in TripLeg, where: l.id == ^leg_id and l.trip_id == ^trip_id),
          set: [position: pos, updated_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)]
        )
      end)

    case Repo.transaction(multi) do
      {:ok, _} -> get_trip(trip_id)
      {:error, _step, reason, _} -> {:error, reason_to_changeset(reason)}
    end
  end

  defp next_position(trip_id) do
    case from(l in TripLeg, where: l.trip_id == ^trip_id, select: max(l.position))
         |> Repo.one() do
      nil -> 0
      n when is_integer(n) -> n + 1
    end
  end

  defp maybe_preload_legs({:ok, trip}), do: {:ok, Repo.preload(trip, :legs)}
  defp maybe_preload_legs(other), do: other

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp error_changeset(mod, field, message) do
    mod.__struct__()
    |> Changeset.change(%{})
    |> Changeset.add_error(field, message)
  end

  defp reason_to_changeset(%Changeset{} = cs), do: cs
  defp reason_to_changeset(reason), do: error_changeset(TripLeg, :position, inspect(reason))
end
