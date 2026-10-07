defmodule OpalCore.Trips.TripBookends do
  @moduledoc """
  Anticipation (before) + memory (after) bookends for trips.

  Template slots (LLM seam — fill with model later):
  - `{{destination}}` — trip.destination_label || title
  - `{{days}}` — days until / since
  - `{{teaser}}` — venue spotlight | packing tip | weather note
  - `{{confirmed_count}}` / `{{open_count}}` — logistics
  - `{{day1_plan}}` / `{{meetup}}` / `{{convoy}}` — tomorrow locked
  - `{{highlights}}` — top activities (memory)
  - `{{photo_cta}}` — "Add your photos"
  - `{{next_seed}}` — someday seed title

  Test setup: create a trip with `starts_on` / `ends_on` manipulated relative to
  `Date.utc_today()`, then call `OpalCore.Trips.TripBookends.process_trip/2`.
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Repo
  alias OpalCore.Trips.{Trip, TripActivity, TripDay, TripParticipant, TripTimeBlock}

  @anticipation_offsets [7, 3, 1]
  @memory_offset 3

  @doc "Process all trips for bookend cards (cron entry)."
  def process_all(today \\ Date.utc_today()) do
    trips = Repo.all(from(t in Trip, where: not is_nil(t.starts_on) or not is_nil(t.ends_on)))

    Enum.reduce(trips, %{sent: 0, skipped: 0}, fn trip, acc ->
      case process_trip(trip, today) do
        {:ok, n} when n > 0 -> %{acc | sent: acc.sent + n}
        _ -> %{acc | skipped: acc.skipped + 1}
      end
    end)
  end

  @doc "Process one trip. Returns {:ok, cards_sent}."
  def process_trip(%Trip{} = trip, today \\ Date.utc_today()) do
    sent =
      []
      |> maybe_anticipation(trip, today)
      |> maybe_memory(trip, today)
      |> Enum.reduce(0, fn card, n ->
        case deliver(trip, card) do
          :ok -> n + 1
          _ -> n
        end
      end)

    {:ok, sent}
  end

  def process_trip(_, _), do: {:error, :invalid}

  @doc "Pure template render for tests / LLM seam documentation."
  def render_card(kind, assigns) when is_map(assigns) do
    dest = assigns[:destination] || assigns["destination"] || "the trip"
    days = assigns[:days] || assigns["days"]

    case kind do
      :countdown_7 ->
        %{
          kind: "anticipation.countdown",
          title: "#{days} days until #{dest} ✈️",
          body: teaser_copy(assigns),
          tier: :low
        }

      :logistics_3 ->
        confirmed = assigns[:confirmed_count] || assigns["confirmed_count"] || 0
        open = assigns[:open_count] || assigns["open_count"] || 0

        %{
          kind: "anticipation.logistics",
          title: "3 days until #{dest}",
          body:
            "Logistics check: #{confirmed} confirmed, #{open} still open. Convoy opt-in is ready when you are.",
          tier: :normal
        }

      :tomorrow_1 ->
        %{
          kind: "anticipation.tomorrow",
          title: "Tomorrow's locked — #{dest}",
          body:
            "Day-1 plan: #{assigns[:day1_plan] || assigns["day1_plan"] || "meetup first"}. " <>
              "Meetup: #{assigns[:meetup] || assigns["meetup"] || "TBD"}. " <>
              "Convoy: #{assigns[:convoy] || assigns["convoy"] || "open"}.",
          tier: :urgent
        }

      :memory ->
        highlights = assigns[:highlights] || assigns["highlights"] || ["the best moments"]

        %{
          kind: "memory.remember",
          title: "Remember #{dest}?",
          body:
            "Highlights: #{Enum.join(List.wrap(highlights), " · ")}. " <>
              "Add your photos — and plan the next one?",
          tier: :low,
          someday_seed: assigns[:next_seed] || assigns["next_seed"] || "#{dest} again (someday)"
        }

      _ ->
        %{kind: "unknown", title: dest, body: "", tier: :low}
    end
  end

  defp maybe_anticipation(cards, %Trip{starts_on: %Date{} = starts} = trip, today) do
    days = Date.diff(starts, today)

    kind =
      case days do
        7 -> :countdown_7
        3 -> :logistics_3
        1 -> :tomorrow_1
        _ -> nil
      end

    if kind && not already_sent?(trip.id, kind, starts) do
      assigns = anticipation_assigns(trip, days)
      [Map.put(render_card(kind, assigns), :dedupe, dedupe(trip.id, kind, starts)) | cards]
    else
      cards
    end
  end

  defp maybe_anticipation(cards, _, _), do: cards

  defp maybe_memory(cards, %Trip{ends_on: %Date{} = ends} = trip, today) do
    days_since = Date.diff(today, ends)

    if days_since == @memory_offset and not already_sent?(trip.id, :memory, ends) do
      assigns = memory_assigns(trip)
      [Map.put(render_card(:memory, assigns), :dedupe, dedupe(trip.id, :memory, ends)) | cards]
    else
      cards
    end
  end

  defp maybe_memory(cards, _, _), do: cards

  defp anticipation_assigns(%Trip{} = trip, days) do
    dest = trip.destination_label || trip.title
    {confirmed, open} = rsvp_counts(trip.id)
    day1 = first_day_label(trip.id)

    %{
      destination: dest,
      days: days,
      teaser_kind: Enum.random([:venue, :packing, :weather]),
      confirmed_count: confirmed,
      open_count: open,
      day1_plan: day1,
      meetup: "Lobby / group chat",
      convoy: "opt-in open"
    }
  end

  defp memory_assigns(%Trip{} = trip) do
    dest = trip.destination_label || trip.title
    highlights = top_highlights(trip.id)

    %{
      destination: dest,
      highlights: highlights,
      next_seed: "#{dest} again (someday)",
      photo_cta: "Add your photos"
    }
  end

  defp teaser_copy(assigns) do
    dest = assigns[:destination] || "there"

    case assigns[:teaser_kind] || :venue do
      :packing ->
        "Packing tip from your vibe: layer light — evenings in #{dest} cool off."

      :weather ->
        "Weather note: #{dest} looks clear for arrival — golden hour walks are on."

      _ ->
        "Venue spotlight: a local favorite near your first stop in #{dest}."
    end
  end

  defp rsvp_counts(trip_id) do
    # Soft counts via day → block → activity chain when canvas exists
    count =
      from(d in TripDay,
        join: b in TripTimeBlock,
        on: b.trip_day_id == d.id,
        join: a in TripActivity,
        on: a.trip_time_block_id == b.id,
        where: d.trip_id == ^trip_id,
        select: count(a.id)
      )
      |> Repo.one() || 0

    {count, max(0, 3 - count)}
  rescue
    _ -> {0, 0}
  end

  defp first_day_label(trip_id) do
    case Repo.one(from(d in TripDay, where: d.trip_id == ^trip_id, order_by: [asc: d.day_index], limit: 1)) do
      %TripDay{label: label} when is_binary(label) and label != "" -> label
      _ -> "Day 1"
    end
  rescue
    _ -> "Day 1"
  end

  defp top_highlights(trip_id) do
    from(d in TripDay,
      join: b in TripTimeBlock,
      on: b.trip_day_id == d.id,
      join: a in TripActivity,
      on: a.trip_time_block_id == b.id,
      where: d.trip_id == ^trip_id,
      order_by: [asc: a.position],
      limit: 3,
      select: a.venue_name
    )
    |> Repo.all()
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
    |> case do
      [] -> ["the food", "the walks", "the late nights"]
      list -> list
    end
  rescue
    _ -> ["the food", "the walks", "the late nights"]
  end

  defp deliver(%Trip{} = trip, card) do
    mark_sent!(card.dedupe)
    recipients = participant_ids(trip)

    Enum.each(recipients, fn user_id ->
      _ =
        NotificationIntelligence.enqueue(
          user_id,
          card.title,
          card.body,
          %{
            "kind" => card.kind,
            "trip_id" => trip.id,
            "deep_link" => "opal://graphs/timeline",
            "tier" => Atom.to_string(card.tier),
            "someday_seed" => Map.get(card, :someday_seed)
          },
          tier: card.tier
        )
    end)

    # Memory cards seed a someday signal into low digest payload (Graphs Timeline reads seed).
    Logger.info("trip_bookend kind=#{card.kind} trip=#{trip.id} recipients=#{length(recipients)}")
    :ok
  end

  defp participant_ids(%Trip{} = trip) do
    ids =
      from(p in TripParticipant, where: p.trip_id == ^trip.id, select: p.user_id)
      |> Repo.all()

    ([trip.created_by_user_id] ++ ids)
    |> Enum.filter(&is_binary/1)
    |> Enum.uniq()
  end

  defp dedupe(trip_id, kind, date), do: "trip_bookend:#{trip_id}:#{kind}:#{Date.to_iso8601(date)}"

  defp already_sent?(trip_id, kind, date) do
    ensure_table()
    key = dedupe(trip_id, kind, date)
    match?([{^key, true}], :ets.lookup(:opal_trip_bookends, key))
  end

  defp mark_sent!(key) do
    ensure_table()
    :ets.insert(:opal_trip_bookends, {key, true})
  end

  defp ensure_table do
    case :ets.whereis(:opal_trip_bookends) do
      :undefined ->
        try do
          :ets.new(:opal_trip_bookends, [:named_table, :public, :set])
        rescue
          ArgumentError -> :ok
        end

      _ ->
        :ok
    end
  end
end
