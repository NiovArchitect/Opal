defmodule OpalCore.Trips do
  @moduledoc """
  Trip domain context — shared social adventure objects with ordered legs.

  People-first: a trip is agreement around a shared adventure, not an
  itinerary spreadsheet. Optional FK link on a leg; Phase 4E can spawn a
  tentative SharedPlan from a leg (conversation_id nil, source trip_leg).
  """

  import Ecto.Query

  alias Ecto.Changeset
  alias Ecto.Multi
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanAgreementTasteBridge
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips.Trip
  alias OpalCore.Trips.TripActivity
  alias OpalCore.Trips.TripActivityResponse
  alias OpalCore.Trips.TripDay
  alias OpalCore.Trips.TripLeg
  alias OpalCore.Trips.TripParticipant
  alias OpalCore.Trips.TripTimeBlock

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
          participants: ^from(p in TripParticipant, order_by: [asc: p.inserted_at]),
          days: ^from(d in TripDay, order_by: [asc: d.day_index])
        ]
      )
      |> Repo.all()
      |> Enum.map(&preload_trip_days!/1)

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

  @doc """
  Create a tentative SharedPlan from a trip leg (Phase 4E).

  - conversation_id stays nil (trips are not conversations)
  - source: "trip_leg", trip_leg_id set
  - PlanParticipants for all trip participants at response_state "pending"
  - Links leg.shared_plan_id → new plan
  - Idempotent: if leg already linked, returns {:ok, :existing, plan, participants, leg}
  """
  def create_plan_from_leg(trip_id, leg_id, user_id)
      when is_binary(trip_id) and is_binary(leg_id) and is_binary(user_id) do
    with {:ok, trip} <- get_trip_for_user(trip_id, user_id),
         %TripLeg{trip_id: ^trip_id} = leg <- Repo.get_by(TripLeg, id: leg_id, trip_id: trip_id) do
      cond do
        is_binary(leg.shared_plan_id) ->
          case Repo.get(SharedPlan, leg.shared_plan_id) do
            %SharedPlan{} = plan ->
              participants = list_plan_participants(plan.id)
              {:ok, :existing, plan, participants, leg}

            nil ->
              do_create_plan_from_leg(trip, leg, user_id)
          end

        true ->
          do_create_plan_from_leg(trip, leg, user_id)
      end
    else
      nil -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def create_plan_from_leg(_, _, _), do: {:error, :not_found}

  @doc """
  Phase 9B — when every participant on a trip-leg plan has accept-going'd,
  transition status to `agreed` (SharedPlan changeset) and fire the 5A taste
  bridge with lawful attrs only:

  - area ← trip.destination_label (factual)
  - cuisine / vibe / price ← leg.place_ref pack fields only (never place_label text)

  Returns:
  - `{:ok, :agreed, plan, bridge_summary}` on first unanimous transition
  - `{:ok, :already_agreed, plan}` when already agreed
  - `{:ok, :awaiting_others, plan}` when not unanimous or not trip_leg
  - `{:error, :not_found}`
  """
  def agree_trip_leg_plan_if_unanimous(plan_id) when is_binary(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{source: "trip_leg"} = plan ->
        plan = Repo.preload(plan, :participants)

        cond do
          not all_participants_accepted?(plan.participants) ->
            {:ok, :awaiting_others, plan}

          plan.status == "agreed" ->
            {:ok, :already_agreed, plan}

          true ->
            do_agree_trip_leg_plan(plan)
        end

      %SharedPlan{} = plan ->
        {:ok, :awaiting_others, plan}

      nil ->
        {:error, :not_found}
    end
  end

  def agree_trip_leg_plan_if_unanimous(_), do: {:error, :not_found}

  @doc """
  Lawful taste alignment for a trip-leg plan. Never invents from place_label.
  """
  def lawful_taste_alignment(%Trip{} = trip, %TripLeg{} = leg) do
    ref = stringify_keys(leg.place_ref || %{})

    %{}
    |> put_present("area", trip.destination_label)
    |> put_present("cuisine", ref["cuisine"])
    |> put_present("vibe", ref["vibe"] || ref["atmosphere"])
    |> put_present("price", ref["price"] || ref["price_band"])
  end

  def lawful_taste_alignment(_, _), do: %{}

  defp do_agree_trip_leg_plan(%SharedPlan{} = plan) do
    leg =
      case plan.trip_leg_id do
        id when is_binary(id) -> Repo.get(TripLeg, id)
        _ -> nil
      end

    trip =
      case leg do
        %TripLeg{trip_id: tid} -> Repo.get(Trip, tid)
        _ -> nil
      end

    alignment =
      case {trip, leg} do
        {%Trip{} = t, %TripLeg{} = l} ->
          merge_alignment(plan.alignment || %{}, lawful_taste_alignment(t, l))

        _ ->
          plan.alignment || %{}
      end

    case plan
         |> SharedPlan.changeset(%{"status" => "agreed", "alignment" => alignment})
         |> Repo.update() do
      {:ok, agreed} ->
        agreed = Repo.preload(agreed, :participants)
        # Clear location for bridge extract so Catalog/CandidateProvider cannot
        # invent cuisine/vibe from place_label text (5A "never invent" law).
        # Alignment already carries lawful pack + destination attrs.
        bridge_plan = %{agreed | location: nil}
        summary = PlanAgreementTasteBridge.after_agreed(bridge_plan)
        {:ok, :agreed, agreed, summary}

      {:error, %Changeset{} = cs} ->
        {:error, cs}
    end
  end

  defp all_participants_accepted?(parts) when is_list(parts) and parts != [] do
    Enum.all?(parts, fn p -> p.response_state == "accepted" end)
  end

  defp all_participants_accepted?(_), do: false

  defp merge_alignment(existing, incoming) when is_map(existing) and is_map(incoming) do
    Map.merge(stringify_keys(existing), stringify_keys(incoming))
  end

  defp put_present(map, _key, nil), do: map
  defp put_present(map, _key, ""), do: map

  defp put_present(map, key, value) when is_binary(value) do
    trimmed = String.trim(value)

    if trimmed == "" do
      map
    else
      Map.put(map, key, trimmed)
    end
  end

  defp put_present(map, key, value) when is_atom(value) and not is_nil(value) do
    put_present(map, key, Atom.to_string(value))
  end

  defp put_present(map, _key, _), do: map

  defp do_create_plan_from_leg(%Trip{} = trip, %TripLeg{} = leg, user_id) do
    participant_user_ids =
      (trip.participants || [])
      |> Enum.map(& &1.user_id)
      |> Enum.uniq()

    participant_user_ids =
      if user_id in participant_user_ids,
        do: participant_user_ids,
        else: [user_id | participant_user_ids]

    location = location_from_leg(leg)
    {start_at, end_at} = datetimes_from_leg(leg)

    plan_attrs = %{
      "title" => leg.place_label,
      "location" => location,
      "start_at" => start_at,
      "end_at" => end_at,
      "timezone" => "UTC",
      "status" => "tentative",
      "created_by_user_id" => user_id,
      "source" => "trip_leg",
      "trip_leg_id" => leg.id,
      "conversation_id" => nil
    }

    Multi.new()
    |> Multi.insert(:plan, SharedPlan.changeset(%SharedPlan{}, plan_attrs))
    |> Multi.run(:participants, fn repo, %{plan: plan} ->
      insert_plan_participants(repo, plan.id, participant_user_ids)
    end)
    |> Multi.run(:link_leg, fn repo, %{plan: plan} ->
      leg
      |> TripLeg.changeset(%{shared_plan_id: plan.id})
      |> repo.update()
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{plan: plan, participants: participants, link_leg: leg}} ->
        {:ok, :created, plan, participants, leg}

      {:error, :plan, %Changeset{} = cs, _} ->
        {:error, cs}

      {:error, :participants, %Changeset{} = cs, _} ->
        {:error, cs}

      {:error, :link_leg, %Changeset{} = cs, _} ->
        {:error, cs}

      {:error, _step, reason, _} ->
        {:error, reason_to_changeset(SharedPlan, reason)}
    end
  end

  defp insert_plan_participants(repo, plan_id, user_ids) do
    Enum.reduce_while(user_ids, {:ok, []}, fn uid, {:ok, acc} ->
      case %PlanParticipant{}
           |> PlanParticipant.changeset(%{
             plan_id: plan_id,
             user_id: uid,
             role: "participant",
             response_state: "pending",
             authority_source: "trip_leg_create_plan"
           })
           |> repo.insert() do
        {:ok, row} -> {:cont, {:ok, [row | acc]}}
        {:error, cs} -> {:halt, {:error, cs}}
      end
    end)
    |> case do
      {:ok, rows} -> {:ok, Enum.reverse(rows)}
      {:error, _} = e -> e
    end
  end

  defp list_plan_participants(plan_id) do
    from(p in PlanParticipant, where: p.plan_id == ^plan_id, order_by: [asc: p.inserted_at])
    |> Repo.all()
  end

  # Never invent place — place_label is required on legs; place_ref name only if present.
  defp location_from_leg(%TripLeg{} = leg) do
    ref_name =
      case leg.place_ref do
        %{"name" => name} when is_binary(name) and name != "" -> name
        %{"label" => label} when is_binary(label) and label != "" -> label
        _ -> nil
      end

    ref_name || leg.place_label
  end

  # Date-only legs → UTC midnight bounds; nil stays nil (never invent).
  defp datetimes_from_leg(%TripLeg{} = leg) do
    {date_at_start(leg.starts_on), date_at_end(leg.ends_on)}
  end

  defp date_at_start(nil), do: nil

  defp date_at_start(%Date{} = d) do
    DateTime.new!(d, ~T[00:00:00.000000], "Etc/UTC")
  end

  defp date_at_end(nil), do: nil

  defp date_at_end(%Date{} = d) do
    DateTime.new!(d, ~T[23:59:59.999999], "Etc/UTC")
  end

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

    days =
      (trip.days || [])
      |> Enum.sort_by(& &1.day_index)
      |> Enum.map(&TripDay.to_contract/1)

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
      "days" => days,
      "participants" => participants,
      "inserted_at" => dt(trip.inserted_at),
      "updated_at" => dt(trip.updated_at)
    }
  end

  @doc "Add a canvas day (soft multi-day model)."
  def add_day(trip_id, attrs) when is_binary(trip_id) and is_map(attrs) do
    case Repo.get(Trip, trip_id) do
      nil ->
        {:error, :not_found}

      %Trip{} ->
        params =
          attrs
          |> stringify_keys()
          |> Map.put("trip_id", trip_id)
          |> Map.put_new_lazy("day_index", fn -> next_day_index(trip_id) end)

        %TripDay{}
        |> TripDay.changeset(params)
        |> Repo.insert()
        |> case do
          {:ok, day} -> {:ok, Repo.preload(day, time_blocks: :activities)}
          {:error, cs} -> {:error, cs}
        end
    end
  end

  def add_day(_, _), do: {:error, :not_found}

  @doc "Add a loose time block to a day."
  def add_time_block(trip_id, day_id, attrs)
      when is_binary(trip_id) and is_binary(day_id) and is_map(attrs) do
    with %TripDay{trip_id: ^trip_id} = day <- Repo.get(TripDay, day_id) do
      params =
        attrs
        |> stringify_keys()
        |> Map.put("trip_day_id", day.id)
        |> Map.put_new_lazy("position", fn -> next_block_position(day.id) end)

      %TripTimeBlock{}
      |> TripTimeBlock.changeset(params)
      |> Repo.insert()
      |> case do
        {:ok, block} -> {:ok, Repo.preload(block, activities: :responses)}
        {:error, cs} -> {:error, cs}
      end
    else
      nil -> {:error, :not_found}
      %TripDay{} -> {:error, :not_found}
    end
  end

  def add_time_block(_, _, _), do: {:error, :not_found}

  @doc "Propose an activity (real venue) inside a time block."
  def add_activity(trip_id, block_id, attrs)
      when is_binary(trip_id) and is_binary(block_id) and is_map(attrs) do
    with %TripTimeBlock{} = block <- Repo.get(TripTimeBlock, block_id),
         %TripDay{trip_id: ^trip_id} <- Repo.get(TripDay, block.trip_day_id) do
      params =
        attrs
        |> stringify_keys()
        |> Map.put("trip_time_block_id", block.id)
        |> Map.put_new_lazy("position", fn -> next_activity_position(block.id) end)

      %TripActivity{}
      |> TripActivity.changeset(params)
      |> Repo.insert()
      |> case do
        {:ok, activity} -> {:ok, Repo.preload(activity, :responses)}
        {:error, cs} -> {:error, cs}
      end
    else
      _ -> {:error, :not_found}
    end
  end

  def add_activity(_, _, _), do: {:error, :not_found}

  @doc "Set or update a person's response on an activity (in | interested | passed)."
  def set_activity_response(trip_id, activity_id, user_id, state)
      when is_binary(trip_id) and is_binary(activity_id) and is_binary(user_id) and
             is_binary(state) do
    with %TripActivity{} = activity <- Repo.get(TripActivity, activity_id),
         %TripTimeBlock{} = block <- Repo.get(TripTimeBlock, activity.trip_time_block_id),
         %TripDay{trip_id: ^trip_id} <- Repo.get(TripDay, block.trip_day_id),
         true <- member_of_trip?(trip_id, user_id) do
      case Repo.get_by(TripActivityResponse,
             trip_activity_id: activity_id,
             user_id: user_id
           ) do
        nil ->
          %TripActivityResponse{}
          |> TripActivityResponse.changeset(%{
            trip_activity_id: activity_id,
            user_id: user_id,
            state: state
          })
          |> Repo.insert()

        %TripActivityResponse{} = row ->
          row
          |> TripActivityResponse.changeset(%{state: state})
          |> Repo.update()
      end
    else
      false -> {:error, :not_found}
      _ -> {:error, :not_found}
    end
  end

  def set_activity_response(_, _, _, _), do: {:error, :not_found}

  @doc """
  Seed a 4-day Mexico City canvas with real venues, free blocks, and subgroup RSVPs.

  Does not invent coordinates. Uses Pujol / Contramar / Quintonil-class names.
  """
  def seed_mexico_city_canvas(trip_id, user_ids)
      when is_binary(trip_id) and is_list(user_ids) do
    ids = user_ids |> Enum.filter(&is_binary/1) |> Enum.uniq()

    with {:ok, trip} <- get_trip(trip_id),
         true <- length(ids) >= 1 do
      [a, b, c | rest] = pad_users(ids)
      d = List.first(rest) || a

      Multi.new()
      |> Multi.run(:clear_days, fn repo, _ ->
        from(day in TripDay, where: day.trip_id == ^trip_id) |> repo.delete_all()
        {:ok, :cleared}
      end)
      |> Multi.run(:canvas, fn repo, _ ->
        build_mexico_canvas(repo, trip_id, %{a: a, b: b, c: c, d: d})
      end)
      |> Repo.transaction()
      |> case do
        {:ok, _} -> get_trip(trip_id)
        {:error, _step, reason, _} -> {:error, reason_to_changeset(TripDay, reason)}
      end
    else
      false -> {:error, error_changeset(Trip, :base, "need at least one participant")}
      {:error, _} = e -> e
    end
  end

  def seed_mexico_city_canvas(_, _), do: {:error, :not_found}

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
    trip
    |> Repo.preload(
      legs: from(l in TripLeg, order_by: [asc: l.position]),
      participants: from(p in TripParticipant, order_by: [asc: p.inserted_at]),
      days: from(d in TripDay, order_by: [asc: d.day_index])
    )
    |> preload_trip_days!()
  end

  defp preload_trip_days!(%Trip{} = trip) do
    days =
      (trip.days || [])
      |> Repo.preload(
        time_blocks:
          {from(b in TripTimeBlock, order_by: [asc: b.position]),
           [activities: {from(a in TripActivity, order_by: [asc: a.position]), [:responses]}]}
      )

    %{trip | days: days}
  end

  defp member_of_trip?(trip_id, user_id) do
    case get_trip(trip_id) do
      {:ok, trip} -> member?(trip, user_id)
      _ -> false
    end
  end

  defp next_day_index(trip_id) do
    case from(d in TripDay, where: d.trip_id == ^trip_id, select: max(d.day_index))
         |> Repo.one() do
      nil -> 0
      n when is_integer(n) -> n + 1
    end
  end

  defp next_block_position(day_id) do
    case from(b in TripTimeBlock, where: b.trip_day_id == ^day_id, select: max(b.position))
         |> Repo.one() do
      nil -> 0
      n when is_integer(n) -> n + 1
    end
  end

  defp next_activity_position(block_id) do
    case from(a in TripActivity, where: a.trip_time_block_id == ^block_id, select: max(a.position))
         |> Repo.one() do
      nil -> 0
      n when is_integer(n) -> n + 1
    end
  end

  defp pad_users([a]), do: [a, a, a]
  defp pad_users([a, b]), do: [a, b, a]
  defp pad_users([a, b, c | rest]), do: [a, b, c | rest]

  defp build_mexico_canvas(repo, trip_id, %{a: a, b: b, c: c, d: d}) do
    days_spec = mexico_city_days_spec()

    Enum.reduce_while(days_spec, {:ok, []}, fn day_spec, {:ok, acc} ->
      case insert_day_tree(repo, trip_id, day_spec, %{a: a, b: b, c: c, d: d}) do
        {:ok, day} -> {:cont, {:ok, [day | acc]}}
        {:error, cs} -> {:halt, {:error, cs}}
      end
    end)
  end

  defp insert_day_tree(repo, trip_id, day_spec, users) do
    with {:ok, day} <-
           %TripDay{}
           |> TripDay.changeset(%{
             trip_id: trip_id,
             day_index: day_spec.day_index,
             on_date: day_spec.on_date,
             label: day_spec.label,
             notes: day_spec[:notes]
           })
           |> repo.insert() do
      Enum.reduce_while(day_spec.blocks, {:ok, day}, fn block_spec, {:ok, _} ->
        case insert_block_tree(repo, day.id, block_spec, users) do
          {:ok, _} -> {:cont, {:ok, day}}
          {:error, cs} -> {:halt, {:error, cs}}
        end
      end)
    end
  end

  defp insert_block_tree(repo, day_id, block_spec, users) do
    with {:ok, block} <-
           %TripTimeBlock{}
           |> TripTimeBlock.changeset(%{
             trip_day_id: day_id,
             position: block_spec.position,
             slot: block_spec.slot,
             time_label: block_spec.time_label,
             block_kind: block_spec.block_kind,
             title: block_spec[:title],
             notes: block_spec[:notes]
           })
           |> repo.insert() do
      activities = block_spec[:activities] || []

      Enum.reduce_while(activities, {:ok, block}, fn act_spec, {:ok, _} ->
        case insert_activity_tree(repo, block.id, act_spec, users) do
          {:ok, _} -> {:cont, {:ok, block}}
          {:error, cs} -> {:halt, {:error, cs}}
        end
      end)
    end
  end

  defp insert_activity_tree(repo, block_id, act_spec, users) do
    with {:ok, activity} <-
           %TripActivity{}
           |> TripActivity.changeset(%{
             trip_time_block_id: block_id,
             position: act_spec[:position] || 0,
             venue_name: act_spec.venue_name,
             venue_area: act_spec[:venue_area],
             activity_kind: act_spec[:activity_kind] || "activity",
             vibe_tags: act_spec[:vibe_tags] || [],
             notes: act_spec[:notes]
           })
           |> repo.insert() do
      responses = expand_responses(act_spec[:responses] || %{}, users)

      Enum.reduce_while(responses, {:ok, activity}, fn {uid, state}, {:ok, acc} ->
        case %TripActivityResponse{}
             |> TripActivityResponse.changeset(%{
               trip_activity_id: activity.id,
               user_id: uid,
               state: state
             })
             |> repo.insert() do
          {:ok, _} -> {:cont, {:ok, acc}}
          {:error, cs} -> {:halt, {:error, cs}}
        end
      end)
    end
  end

  # Seed spec keys :in / :interested / :passed → user slots :a :b :c :d.
  defp expand_responses(map, users) when is_map(map) do
    Enum.flat_map(map, fn
      {:in, keys} -> Enum.map(List.wrap(keys), &{Map.fetch!(users, &1), "in"})
      {:interested, keys} -> Enum.map(List.wrap(keys), &{Map.fetch!(users, &1), "interested"})
      {:passed, keys} -> Enum.map(List.wrap(keys), &{Map.fetch!(users, &1), "passed"})
      _ -> []
    end)
  end

  defp expand_responses(_, _), do: []

  defp mexico_city_days_spec do
    [
      %{
        day_index: 0,
        on_date: ~D[2026-11-12],
        label: "Thu · arrive",
        notes: "Landing day — soft edges only.",
        blocks: [
          %{
            position: 0,
            slot: "afternoon",
            time_label: "afternoon-ish",
            block_kind: "free",
            title: "Settle in",
            notes: "Explicit free time after the flight."
          },
          %{
            position: 1,
            slot: "evening",
            time_label: "~8pm",
            block_kind: "meal",
            title: "First dinner",
            activities: [
              %{
                venue_name: "Contramar",
                venue_area: "Roma Norte",
                activity_kind: "meal",
                vibe_tags: ["seafood", "lively", "classic"],
                responses: %{in: [:a, :b, :c], interested: [:d]}
              }
            ]
          }
        ]
      },
      %{
        day_index: 1,
        on_date: ~D[2026-11-13],
        label: "Fri",
        blocks: [
          %{
            position: 0,
            slot: "morning",
            time_label: "morning-ish",
            block_kind: "activity",
            title: "Market + photo split",
            activities: [
              %{
                venue_name: "Mercado de San Juan",
                venue_area: "Centro",
                activity_kind: "activity",
                vibe_tags: ["market", "foodie", "early"],
                notes: "Chanelle-energy market morning.",
                responses: %{in: [:a, :b], passed: [:c], interested: [:d]}
              },
              %{
                venue_name: "Rooftop golden hour — Roma",
                venue_area: "Roma Norte",
                activity_kind: "activity",
                vibe_tags: ["photography", "golden_hour"],
                notes: "Alex photography track — meet the others later.",
                position: 1,
                responses: %{in: [:c], interested: [:d], passed: [:a, :b]}
              }
            ]
          },
          %{
            position: 1,
            slot: "afternoon",
            time_label: "free afternoon",
            block_kind: "free",
            title: "Breathing room"
          },
          %{
            position: 2,
            slot: "evening",
            time_label: "7:30",
            block_kind: "meal",
            title: "Together dinner",
            activities: [
              %{
                venue_name: "Pujol",
                venue_area: "Polanco",
                activity_kind: "meal",
                vibe_tags: ["fine_dining", "reservation", "together"],
                responses: %{in: [:a, :b, :c, :d]}
              }
            ]
          }
        ]
      },
      %{
        day_index: 2,
        on_date: ~D[2026-11-14],
        label: "Sat",
        blocks: [
          %{
            position: 0,
            slot: "morning",
            time_label: "morning-ish",
            block_kind: "activity",
            title: "Split morning → lunch meetup",
            activities: [
              %{
                venue_name: "Teotihuacan day trip",
                venue_area: "Teotihuacan",
                activity_kind: "activity",
                vibe_tags: ["ruins", "outdoors"],
                responses: %{in: [:a, :c, :d], passed: [:b]}
              },
              %{
                venue_name: "Casa Jacaranda cooking class",
                venue_area: "Roma Norte",
                activity_kind: "activity",
                vibe_tags: ["cooking", "intimate"],
                position: 1,
                notes: "Maya track — regroup for lunch.",
                responses: %{in: [:b], interested: [:d], passed: [:a, :c]}
              }
            ]
          },
          %{
            position: 1,
            slot: "afternoon",
            time_label: "~1pm",
            block_kind: "meal",
            title: "Lunch together",
            activities: [
              %{
                venue_name: "Quintonil",
                venue_area: "Polanco",
                activity_kind: "meal",
                vibe_tags: ["contemporary", "reunion"],
                responses: %{in: [:a, :b, :c], interested: [:d]}
              }
            ]
          },
          %{
            position: 2,
            slot: "evening",
            time_label: "evening",
            block_kind: "free",
            title: "Open night"
          }
        ]
      },
      %{
        day_index: 3,
        on_date: ~D[2026-11-15],
        label: "Sun · depart",
        blocks: [
          %{
            position: 0,
            slot: "morning",
            time_label: "late morning",
            block_kind: "meal",
            title: "Send-off brunch",
            activities: [
              %{
                venue_name: "Panadería Rosetta",
                venue_area: "Roma Norte",
                activity_kind: "meal",
                vibe_tags: ["bakery", "casual", "daylight"],
                responses: %{in: [:a, :b, :c, :d]}
              }
            ]
          },
          %{
            position: 1,
            slot: "afternoon",
            time_label: "afternoon",
            block_kind: "transit",
            title: "Airport push",
            notes: "Loose — no minute-level schedule."
          }
        ]
      }
    ]
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
