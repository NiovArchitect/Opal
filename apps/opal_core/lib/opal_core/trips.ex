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
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips.Trip
  alias OpalCore.Trips.TripLeg
  alias OpalCore.Trips.TripParticipant

  @doc "Create a trip for a user. Optional user_ids[] become participants. Zero legs is valid."
  def create_trip(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    params =
      attrs
      |> stringify_keys()
      |> Map.put("created_by_user_id", user_id)

    peer_ids = List.wrap(params["user_ids"] || params["participant_user_ids"] || [])

    Multi.new()
    |> Multi.insert(:trip, Trip.changeset(%Trip{}, params))
    |> Multi.run(:memberships, fn repo, %{trip: trip} ->
      insert_memberships(repo, trip.id, user_id, peer_ids)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{trip: trip}} -> {:ok, preload_trip!(trip)}
      {:error, :trip, %Changeset{} = cs, _} -> {:error, cs}
      {:error, :memberships, %Changeset{} = cs, _} -> {:error, cs}
      {:error, _step, reason, _} -> {:error, reason_to_changeset(Trip, reason)}
    end
  end

  def create_trip(_, _), do: {:error, error_changeset(Trip, :created_by_user_id, "is required")}

  @doc "Load a trip with legs ordered by position and participants."
  def get_trip(id) when is_binary(id) do
    case Repo.get(Trip, id) do
      %Trip{} = trip -> {:ok, preload_trip!(trip)}
      nil -> {:error, :not_found}
    end
  end

  def get_trip(_), do: {:error, :not_found}

  @doc "Get trip if user is creator or participant; otherwise :not_found (no leak)."
  def get_trip_for_user(id, user_id) when is_binary(id) and is_binary(user_id) do
    with {:ok, trip} <- get_trip(id),
         true <- member?(trip, user_id) do
      {:ok, trip}
    else
      false -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def get_trip_for_user(_, _), do: {:error, :not_found}

  @doc "List trips where user is creator or participant, newest first."
  def list_trips_for_user(user_id) when is_binary(user_id) do
    trip_ids =
      from(p in TripParticipant, where: p.user_id == ^user_id, select: p.trip_id)
      |> Repo.all()

    trips =
      from(t in Trip,
        where: t.id in ^trip_ids or t.created_by_user_id == ^user_id,
        order_by: [desc: t.inserted_at],
        preload: [
          legs: ^from(l in TripLeg, order_by: [asc: l.position]),
          participants: ^from(p in TripParticipant, order_by: [asc: p.inserted_at])
        ]
      )
      |> Repo.all()

    {:ok, trips}
  end

  def list_trips_for_user(_), do: {:error, error_changeset(Trip, :created_by_user_id, "is invalid")}

  @doc "Update trip title / destination / dates. Caller must already be authorized."
  def update_trip(%Trip{} = trip, attrs) when is_map(attrs) do
    params =
      attrs
      |> stringify_keys()
      |> Map.take(["title", "destination_label", "starts_on", "ends_on"])

    trip
    |> Trip.changeset(params)
    |> Repo.update()
    |> case do
      {:ok, updated} -> {:ok, preload_trip!(updated)}
      {:error, cs} -> {:error, cs}
    end
  end

  def update_trip(_, _), do: {:error, error_changeset(Trip, :id, "is invalid")}

  @doc "Append a leg at max(position)+1 (or 0 when empty)."
  def add_leg(trip_id, attrs) when is_binary(trip_id) and is_map(attrs) do
    case Repo.get(Trip, trip_id) do
      nil ->
        {:error, :not_found}

      %Trip{} ->
        next_pos = next_position(trip_id)

        params =
          attrs
          |> stringify_keys()
          |> Map.put("trip_id", trip_id)
          |> Map.put("position", next_pos)
          # Linking goes through link_leg_plan/3 — keep add_leg from silently attaching.
          |> Map.drop(["shared_plan_id"])

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
        {:error, :not_found}

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
      nil -> {:error, :not_found}
      %TripLeg{} = leg -> Repo.delete(leg)
    end
  end

  def remove_leg(_, _), do: {:error, error_changeset(TripLeg, :id, "is invalid")}

  @doc """
  Link a leg to an existing SharedPlan. Verifies plan exists and user can see it
  (conversation membership). Does not modify the plan.
  """
  def link_leg_plan(trip_id, leg_id, shared_plan_id, user_id)
      when is_binary(trip_id) and is_binary(leg_id) and is_binary(shared_plan_id) and
             is_binary(user_id) do
    with %TripLeg{trip_id: ^trip_id} = leg <- Repo.get_by(TripLeg, id: leg_id, trip_id: trip_id),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, shared_plan_id),
         :ok <- ensure_plan_visible(plan, user_id) do
      leg
      |> TripLeg.changeset(%{shared_plan_id: plan.id})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def link_leg_plan(_, _, _, _), do: {:error, :not_found}

  @doc "True when user is creator or listed participant."
  def member?(%Trip{} = trip, user_id) when is_binary(user_id) do
    trip.created_by_user_id == user_id or
      Enum.any?(trip.participants || [], &(&1.user_id == user_id)) or
      participant_exists?(trip.id, user_id)
  end

  def member?(_, _), do: false

  def to_contract(%Trip{} = trip) do
    legs =
      (trip.legs || [])
      |> Enum.sort_by(& &1.position)
      |> Enum.map(&TripLeg.to_contract/1)

    participants =
      (trip.participants || [])
      |> Enum.map(fn p ->
        %{
          "user_id" => p.user_id,
          "role" => p.role
        }
      end)

    %{
      "id" => trip.id,
      "title" => trip.title,
      "destination_label" => trip.destination_label,
      "starts_on" => date(trip.starts_on),
      "ends_on" => date(trip.ends_on),
      "created_by_user_id" => trip.created_by_user_id,
      "legs" => legs,
      "participants" => participants,
      "inserted_at" => dt(trip.inserted_at),
      "updated_at" => dt(trip.updated_at)
    }
  end

  defp insert_memberships(repo, trip_id, creator_id, peer_ids) do
    peers =
      peer_ids
      |> Enum.filter(&(is_binary(&1) and &1 != "" and &1 != creator_id))
      |> Enum.uniq()

    rows =
      [
        %{
          trip_id: trip_id,
          user_id: creator_id,
          role: "creator"
        }
        | Enum.map(peers, fn uid ->
            %{trip_id: trip_id, user_id: uid, role: "participant"}
          end)
      ]

    Enum.reduce_while(rows, {:ok, []}, fn attrs, {:ok, acc} ->
      case %TripParticipant{} |> TripParticipant.changeset(attrs) |> repo.insert() do
        {:ok, row} -> {:cont, {:ok, [row | acc]}}
        {:error, cs} -> {:halt, {:error, cs}}
      end
    end)
  end

  defp ensure_plan_visible(%SharedPlan{conversation_id: cid}, user_id)
       when is_binary(cid) and is_binary(user_id) do
    case Repo.get_by(ConversationMember, conversation_id: cid, user_id: user_id) do
      %ConversationMember{} -> :ok
      nil -> {:error, :not_found}
    end
  end

  defp ensure_plan_visible(_, _), do: {:error, :not_found}

  defp participant_exists?(trip_id, user_id) do
    Repo.exists?(
      from(p in TripParticipant, where: p.trip_id == ^trip_id and p.user_id == ^user_id)
    )
  end

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
      {:error, _step, reason, _} -> {:error, reason_to_changeset(TripLeg, reason)}
    end
  end

  defp next_position(trip_id) do
    case from(l in TripLeg, where: l.trip_id == ^trip_id, select: max(l.position))
         |> Repo.one() do
      nil -> 0
      n when is_integer(n) -> n + 1
    end
  end

  defp preload_trip!(trip) do
    Repo.preload(trip,
      legs: from(l in TripLeg, order_by: [asc: l.position]),
      participants: from(p in TripParticipant, order_by: [asc: p.inserted_at])
    )
  end

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

  defp reason_to_changeset(mod, %Changeset{} = cs) when is_atom(mod), do: cs
  defp reason_to_changeset(mod, reason), do: error_changeset(mod, :base, inspect(reason))

  defp date(nil), do: nil
  defp date(%Date{} = d), do: Date.to_iso8601(d)

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
