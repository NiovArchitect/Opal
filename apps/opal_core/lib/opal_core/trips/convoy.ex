defmodule OpalCore.Trips.Convoy do
  @moduledoc """
  Trip convoy — opt-in "where are the homies" during a multi-day trip.

  Not constant surveillance. Members must opt in before pings publish.
  Geometric ETA only when both sides have real coordinates; otherwise
  place_label presence only (no fabricated traffic).
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Trips
  alias OpalCore.Trips.TripConvoyMember

  @doc "Opt in to sharing on this trip."
  def opt_in(trip_id, user_id) when is_binary(trip_id) and is_binary(user_id) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, user_id) do
      upsert(trip.id, user_id, %{sharing: true})
    end
  end

  def opt_in(_, _), do: {:error, :not_found}

  @doc "Opt out — clears place label and coords."
  def opt_out(trip_id, user_id) when is_binary(trip_id) and is_binary(user_id) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, user_id) do
      upsert(trip.id, user_id, %{
        sharing: false,
        place_label: nil,
        lat: nil,
        lng: nil,
        last_ping_at: nil
      })
    end
  end

  def opt_out(_, _), do: {:error, :not_found}

  @doc """
  Publish a presence ping. Requires sharing=true (auto-opts-in if already member
  with sharing, else error until opt_in).
  """
  def ping(trip_id, user_id, attrs)
      when is_binary(trip_id) and is_binary(user_id) and is_map(attrs) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, user_id),
         {:ok, member} <- ensure_sharing(trip.id, user_id) do
      params =
        attrs
        |> stringify()
        |> Map.take(["place_label", "lat", "lng"])
        |> Map.put("last_ping_at", DateTime.utc_now() |> DateTime.truncate(:microsecond))
        |> Map.put("sharing", true)

      member
      |> TripConvoyMember.changeset(params)
      |> Repo.update()
    end
  end

  def ping(_, _, _), do: {:error, :not_found}

  @doc "Convoy roster for a trip participant — only sharing members are detailed."
  def roster(trip_id, viewer_user_id)
      when is_binary(trip_id) and is_binary(viewer_user_id) do
    with {:ok, _trip} <- Trips.get_trip_for_user(trip_id, viewer_user_id) do
      members =
        from(m in TripConvoyMember, where: m.trip_id == ^trip_id)
        |> Repo.all()

      viewer = Enum.find(members, &(&1.user_id == viewer_user_id))

      rows =
        members
        |> Enum.filter(&(&1.sharing == true))
        |> Enum.map(fn m ->
          contract = TripConvoyMember.to_contract(m)
          Map.put(contract, "eta_note", eta_note(viewer, m))
        end)

      {:ok,
       %{
         "sharing" => viewer && viewer.sharing == true,
         "members" => rows,
         "note" => "Opt-in only. Geometric ETA when both sides share coordinates."
       }}
    end
  end

  def roster(_, _), do: {:error, :not_found}

  defp ensure_sharing(trip_id, user_id) do
    case Repo.get_by(TripConvoyMember, trip_id: trip_id, user_id: user_id) do
      %TripConvoyMember{sharing: true} = m ->
        {:ok, m}

      %TripConvoyMember{sharing: false} ->
        {:error, :not_sharing}

      nil ->
        {:error, :not_sharing}
    end
  end

  defp upsert(trip_id, user_id, attrs) do
    case Repo.get_by(TripConvoyMember, trip_id: trip_id, user_id: user_id) do
      nil ->
        %TripConvoyMember{}
        |> TripConvoyMember.changeset(Map.merge(attrs, %{trip_id: trip_id, user_id: user_id}))
        |> Repo.insert()

      %TripConvoyMember{} = row ->
        row
        |> TripConvoyMember.changeset(attrs)
        |> Repo.update()
    end
  end

  defp eta_note(%TripConvoyMember{lat: lat1, lng: lng1}, %TripConvoyMember{
         lat: lat2,
         lng: lng2,
         place_label: label,
         user_id: uid
       })
       when is_number(lat1) and is_number(lng1) and is_number(lat2) and is_number(lng2) do
    km = haversine_km(lat1, lng1, lat2, lng2)
    # Geometric walk ~5 km/h — not traffic.
    minutes = max(1, round(km / 5.0 * 60))

    where = if is_binary(label) and label != "", do: label, else: "nearby"
    "#{short(uid)} · ~#{minutes} min geometric · #{where}"
  end

  defp eta_note(_, %TripConvoyMember{place_label: label, user_id: uid})
       when is_binary(label) and label != "" do
    "#{short(uid)} · at #{label}"
  end

  defp eta_note(_, %TripConvoyMember{user_id: uid}) do
    "#{short(uid)} · sharing"
  end

  defp short(uid) when is_binary(uid), do: String.slice(uid, 0, 8)
  defp short(_), do: "member"

  defp haversine_km(lat1, lon1, lat2, lon2) do
    r = 6371.0
    dlat = deg2rad(lat2 - lat1)
    dlon = deg2rad(lon2 - lon1)

    a =
      :math.sin(dlat / 2) * :math.sin(dlat / 2) +
        :math.cos(deg2rad(lat1)) * :math.cos(deg2rad(lat2)) *
          :math.sin(dlon / 2) * :math.sin(dlon / 2)

    c = 2 * :math.atan2(:math.sqrt(a), :math.sqrt(1 - a))
    r * c
  end

  defp deg2rad(d), do: d * :math.pi() / 180.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
