defmodule OpalCore.Lives do
  @moduledoc """
  Paste K Lives context — placed-only LiveRooms, venue verification, stickers, Opal Pay.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Lives.{
    LiveRoom,
    StickerCatalog,
    Stickers,
    Verification,
    Venue,
    VenueMaxing,
    OpalPay
  }

  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RelationshipGraph

  @audiences ~w(friends close_circle)
  @location_precisions ~w(venue area)
  @close_circle_types ~w(spouse partner family close_friend)

  def catalog, do: StickerCatalog.to_contract()

  def go_live_copy do
    %{
      "step" => 1,
      "prompt" => "Where are you?",
      "required" => true,
      "skip_allowed" => false,
      "default" => nil,
      "trade" =>
        "Confirmed venues get discovered on the heat map — that's how your people (and new fans) find you.",
      "consequence_template" => "Anyone can see you're at [venue].",
      "reject_free_text" => "we couldn't find that venue — try searching",
      "residential_reject" => Verification.residential_reject_message(),
      "manual_testing_label" => "Enter venue manually (testing)",
      "manual_testing_only_under" => "opal_lives=1",
      "audiences" => @audiences,
      "location_precisions" => @location_precisions,
      "audience_default" => "friends",
      "location_precision_default" => "venue"
    }
  end

  def search_venues(query), do: Verification.search_venues(query)

  @doc """
  Start a live. Requires Places-validated place_id (or provisional test-* when allowed).
  No skip / no unplaced path.
  """
  def go_live(host_account_id, place_id, opts \\ [])

  def go_live(host_account_id, place_id, opts)
      when is_binary(host_account_id) and is_binary(place_id) do
    title = Keyword.get(opts, :title)
    allow_fixture? = Keyword.get(opts, :allow_fixture, Mix.env() == :test)
    allow_provisional? = Keyword.get(opts, :allow_provisional, false)

    with {:ok, venue, _origin} <-
           Verification.resolve_venue(place_id,
             introduced_by: host_account_id,
             allow_fixture: allow_fixture?,
             allow_provisional: allow_provisional?,
             details: Keyword.get(opts, :details),
             name: Keyword.get(opts, :name),
             address: Keyword.get(opts, :address),
             types: Keyword.get(opts, :types),
             status: Keyword.get(opts, :venue_status) || "quarantine",
             residential: Keyword.get(opts, :residential, false),
             test_only: Keyword.get(opts, :test_only, false)
           ),
         :ok <- Verification.check_lives_per_venue_day(host_account_id, venue.id) do
      insert_live(host_account_id, venue, title, opts)
    else
      {:error, :residential, msg} ->
        {:error, :residential, msg}

      {:error, :venue_not_found, msg} ->
        {:error, :venue_not_found, msg}

      {:error, reason} ->
        {:error, reason}

      other ->
        other
    end
  end

  def go_live(_, nil, _), do: {:error, :place_id_required}

  def go_live(_, "", _), do: {:error, :place_id_required}

  def go_live(host, %{name: name}, _) when is_binary(host) and is_binary(name) do
    Verification.reject_free_text(name)
  end

  def go_live(_, _, _), do: {:error, :invalid}

  @doc """
  Go live at a provisional testing venue (name + city → test-<slug>).
  Only when allow_provisional: true (dev/test / ?opal_lives=1). Never production.
  """
  def go_live_provisional(host_account_id, name, city, opts \\ [])

  def go_live_provisional(host_account_id, name, city, opts)
      when is_binary(host_account_id) and is_binary(name) and is_binary(city) do
    allow? = Keyword.get(opts, :allow_provisional, false)

    with true <- allow?,
         {:ok, venue, _origin} <-
           Verification.create_provisional_venue(name, city,
             introduced_by: host_account_id,
             allow_provisional: true
           ),
         :ok <- Verification.check_lives_per_venue_day(host_account_id, venue.id) do
      insert_live(host_account_id, venue, Keyword.get(opts, :title), opts)
    else
      false ->
        {:error, :provisional_not_allowed}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def go_live_provisional(_, _, _, _), do: {:error, :invalid}

  defp insert_live(host_account_id, venue, title, opts \\ []) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    audience = normalize_audience(Keyword.get(opts, :audience))
    precision = normalize_precision(Keyword.get(opts, :location_precision))

    # One active Live per host — ending prior rooms keeps Home/visible honest.
    _ = end_active_lives_for(host_account_id, now)

    venue =
      if is_nil(venue.first_live_at) do
        case venue
             |> Venue.changeset(%{first_live_at: now})
             |> Repo.update() do
          {:ok, v} -> v
          _ -> venue
        end
      else
        venue
      end

    place_label = place_label(venue, precision)
    consequence = consequence_for(audience, place_label)

    attrs = %{
      host_account_id: host_account_id,
      venue_id: venue.id,
      status: "live",
      started_at: now,
      title: title,
      metadata: %{
        "consequence" => consequence,
        "place_id" => venue.place_id,
        "test_only" => Venue.test_only?(venue),
        "audience" => audience,
        "location_precision" => precision
      }
    }

    case %LiveRoom{} |> LiveRoom.changeset(attrs) |> Repo.insert() do
      {:ok, room} ->
        _ = VenueMaxing.record_attendance(host_account_id, venue)
        {:ok, %{live_room: room, venue: venue, copy: go_live_copy()}}

      {:error, cs} ->
        {:error, cs}
    end
  end

  defp end_active_lives_for(host_account_id, now) when is_binary(host_account_id) do
    from(r in LiveRoom,
      where: r.host_account_id == ^host_account_id and r.status == "live"
    )
    |> Repo.update_all(set: [status: "ended", ended_at: now, updated_at: now])
  end

  defp end_active_lives_for(_, _), do: {0, nil}

  def end_live(live_room_id, host_account_id)
      when is_binary(live_room_id) and is_binary(host_account_id) do
    case Repo.get(LiveRoom, live_room_id) do
      %LiveRoom{host_account_id: ^host_account_id} = room ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        room
        |> LiveRoom.changeset(%{status: "ended", ended_at: now})
        |> Repo.update()

      %LiveRoom{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def get_live(id) when is_binary(id) do
    case Repo.get(LiveRoom, id) do
      %LiveRoom{} = room ->
        venue = Repo.get(Venue, room.venue_id)
        {:ok, room, venue}

      nil ->
        {:error, :not_found}
    end
  end

  def list_live_at_venue(venue_id) when is_binary(venue_id) do
    rooms =
      from(r in LiveRoom,
        where: r.venue_id == ^venue_id and r.status == "live",
        order_by: [desc: r.started_at]
      )
      |> Repo.all()

    {:ok, rooms}
  end

  @doc """
  Active lives the viewer may see: own live + friends/close-circle permitted hosts.
  No GPS. Location label respects host location_precision (venue vs area).
  """
  def list_visible_lives(viewer_id) when is_binary(viewer_id) do
    rooms =
      from(r in LiveRoom,
        where: r.status == "live",
        order_by: [desc: r.started_at],
        limit: 50
      )
      |> Repo.all()

    venue_ids = rooms |> Enum.map(& &1.venue_id) |> Enum.uniq()
    host_ids = rooms |> Enum.map(& &1.host_account_id) |> Enum.uniq()

    venues =
      if venue_ids == [] do
        %{}
      else
        from(v in Venue, where: v.id in ^venue_ids)
        |> Repo.all()
        |> Map.new(&{&1.id, &1})
      end

    hosts =
      if host_ids == [] do
        %{}
      else
        from(u in User, where: u.id in ^host_ids, select: {u.id, {u.display_name, u.handle}})
        |> Repo.all()
        |> Map.new()
      end

    rooms
    |> Enum.filter(&visible_to_viewer?(&1, viewer_id))
    |> Enum.map(fn room ->
      venue = Map.get(venues, room.venue_id)
      {name, handle} = Map.get(hosts, room.host_account_id, {nil, nil})
      precision = room_precision(room)
      audience = room_audience(room)

      %{
        "live_room" =>
          LiveRoom.to_contract(room, venue)
          |> Map.merge(%{
            "audience" => audience,
            "location_precision" => precision,
            "place_label" => place_label(venue, precision),
            "host_display_name" => name,
            "host_handle" => handle,
            "mine" => room.host_account_id == viewer_id
          })
      }
    end)
  end

  def list_visible_lives(_), do: []

  def active_live_for(host_account_id) when is_binary(host_account_id) do
    case from(r in LiveRoom,
           where: r.host_account_id == ^host_account_id and r.status == "live",
           order_by: [desc: r.started_at],
           limit: 1
         )
         |> Repo.one() do
      %LiveRoom{} = room ->
        venue = Repo.get(Venue, room.venue_id)
        {:ok, room, venue}

      nil ->
        {:error, :not_found}
    end
  end

  def active_live_for(_), do: {:error, :invalid}

  defp visible_to_viewer?(%LiveRoom{host_account_id: host} = room, viewer_id) do
    cond do
      host == viewer_id ->
        true

      not RelationshipGraph.friend_visibility_authorized?(host, viewer_id) ->
        false

      room_audience(room) == "close_circle" ->
        Relationships.get_type(viewer_id, host) in @close_circle_types or
          Relationships.get_type(host, viewer_id) in @close_circle_types

      true ->
        true
    end
  end

  defp normalize_audience(v) when v in @audiences, do: v
  defp normalize_audience("close"), do: "close_circle"
  defp normalize_audience(_), do: "friends"

  defp normalize_precision(v) when v in @location_precisions, do: v
  defp normalize_precision("approximate"), do: "area"
  defp normalize_precision(_), do: "venue"

  defp room_audience(%LiveRoom{metadata: meta}) when is_map(meta) do
    normalize_audience(meta["audience"] || meta[:audience])
  end

  defp room_audience(_), do: "friends"

  defp room_precision(%LiveRoom{metadata: meta}) when is_map(meta) do
    normalize_precision(meta["location_precision"] || meta[:location_precision])
  end

  defp room_precision(_), do: "venue"

  defp place_label(nil, _), do: "a venue"

  defp place_label(%Venue{} = venue, "area") do
    cond do
      is_binary(venue.formatted_address) and String.trim(venue.formatted_address) != "" ->
        venue.formatted_address

      true ->
        "nearby"
    end
  end

  defp place_label(%Venue{} = venue, _), do: Venue.display_name(venue)

  defp consequence_for("close_circle", place),
    do: "Your close circle can see you're at #{place}."

  defp consequence_for(_, place), do: "Friends can see you're at #{place}."

  def report_host_not_here(live_room_id, reporter_id),
    do: Verification.report_host_not_here(live_room_id, reporter_id)

  def scan_presence(token, scanner_id, opts \\ []),
    do: Verification.scan_presence(token, scanner_id, opts)

  def send_sticker(live_room_id, sender_id, sticker_key, idempotency_key, opts \\ []),
    do: Stickers.purchase(live_room_id, sender_id, sticker_key, idempotency_key, opts)

  def pay_venue(token_or_venue_id, payer_id, amount_cents, idempotency_key, opts \\ []),
    do: OpalPay.pay(token_or_venue_id, payer_id, amount_cents, idempotency_key, opts)

  def venue_qr(venue_id) when is_binary(venue_id) do
    case Repo.get(Venue, venue_id) do
      %Venue{} = v -> {:ok, OpalPay.qr_payload(v)}
      nil -> {:error, :not_found}
    end
  end

  def reward_contributor(venue_id, contributor_id, amount_cents, idempotency_key, opts \\ []),
    do: VenueMaxing.reward(venue_id, contributor_id, amount_cents, idempotency_key, opts)

  def contributors(venue_id, viewer_id, opts \\ []),
    do: VenueMaxing.list_contributors(venue_id, viewer_id, opts)

  def private_streaks(account_id), do: VenueMaxing.private_streaks(account_id)

  def sticker_live_money? do
    System.get_env("OPAL_STICKER_LIVE_MONEY") in ~w(true 1 yes)
  end

  def pay_live_money? do
    System.get_env("OPAL_PAY_LIVE_MONEY") in ~w(true 1 yes)
  end

  def get_venue(id) when is_binary(id), do: Repo.get(Venue, id)
  def get_venue_by_place_id(place_id) when is_binary(place_id), do: Repo.get_by(Venue, place_id: place_id)
  def get_venue_by_pay_token(token) when is_binary(token), do: Repo.get_by(Venue, pay_token: token)
end
