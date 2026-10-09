defmodule OpalCore.Lives do
  @moduledoc """
  Paste K Lives context — placed-only LiveRooms, venue verification, stickers, Opal Pay.
  """

  import Ecto.Query

  alias OpalCore.Lives.{
    LiveRoom,
    StickerCatalog,
    Stickers,
    Verification,
    Venue,
    VenueMaxing,
    OpalPay
  }

  alias OpalCore.Repo

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
      "residential_reject" => Verification.residential_reject_message()
    }
  end

  @doc """
  Start a live. Requires Places-validated place_id. No skip / no unplaced path.
  """
  def go_live(host_account_id, place_id, opts \\ [])

  def go_live(host_account_id, place_id, opts)
      when is_binary(host_account_id) and is_binary(place_id) do
    title = Keyword.get(opts, :title)

    with {:ok, venue, _origin} <-
           Verification.resolve_venue(place_id,
             introduced_by: host_account_id,
             allow_fixture: Keyword.get(opts, :allow_fixture, Mix.env() == :test),
             details: Keyword.get(opts, :details),
             name: Keyword.get(opts, :name),
             address: Keyword.get(opts, :address),
             types: Keyword.get(opts, :types),
             status: Keyword.get(opts, :venue_status) || "quarantine",
             residential: Keyword.get(opts, :residential, false)
           ),
         :ok <- Verification.check_lives_per_venue_day(host_account_id, venue.id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

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

      attrs = %{
        host_account_id: host_account_id,
        venue_id: venue.id,
        status: "live",
        started_at: now,
        title: title,
        metadata: %{
          "consequence" => "Anyone can see you're at #{venue.name}",
          "place_id" => venue.place_id
        }
      }

      case %LiveRoom{} |> LiveRoom.changeset(attrs) |> Repo.insert() do
        {:ok, room} ->
          _ = VenueMaxing.record_attendance(host_account_id, venue)
          {:ok, %{live_room: room, venue: venue, copy: go_live_copy()}}

        {:error, cs} ->
          {:error, cs}
      end
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
