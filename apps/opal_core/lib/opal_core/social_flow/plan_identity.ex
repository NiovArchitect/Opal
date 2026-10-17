defmodule OpalCore.SocialFlow.PlanIdentity do
  @moduledoc """
  Repair #18 (Division A) - one identity for a plan intent.

  Shared normalization used by every creation path and by the conflict
  gate, so the same intent spoken three ways resolves to the same key
  instead of three rows (F18-06) and two plans at the same canonical
  time can be compared at all (F18-03).

  This module is pure: it computes keys, canonical starts and human
  titles from a plan-shaped map/struct. It writes nothing. The writers
  stay where they have always been (SocialFlow creation functions and
  the alignment fold's upsert); they all consult this module so there is
  exactly one definition of "same plan" and "same time".

  Dedupe key design (track-duplicates section 6.1):

      dedupe_key = hash(owner, sorted participant ids, venue_key, day_key)

  Two keys collide when owner, participants and venue match exactly and
  the day keys are equal OR one side is "open" (an undated intent and a
  dated intent with the same people at the same venue are one intent to
  reconcile, never two silent rows; two differently dated intents are
  distinct plans and never collide).
  """

  alias OpalCore.SocialFlow.PlanStateArbitration

  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)
  @day_words @weekdays ++ ~w(tonight today tomorrow)

  @weekday_abbreviations %{
    "mon" => "monday",
    "tue" => "tuesday",
    "tues" => "tuesday",
    "wed" => "wednesday",
    "thu" => "thursday",
    "thur" => "thursday",
    "thurs" => "thursday",
    "fri" => "friday",
    "sat" => "saturday",
    "sun" => "sunday"
  }
  @stop_fragments ~w(the a an with at on for to of)

  # ------------------------------------------------------------------
  # Normalization
  # ------------------------------------------------------------------

  def normalize_text(value) when is_binary(value) do
    value
    |> String.downcase()
    |> String.replace(~r/[^\p{L}\p{N}\s]/u, " ")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
  end

  def normalize_text(_), do: ""

  @doc "Venue key: provider place id when known, else the squashed normalized location, else the title stem."
  def venue_key(attrs) when is_map(attrs) do
    a = stringify(attrs)
    alignment = if is_map(a["alignment"]), do: a["alignment"], else: %{}

    cond do
      is_binary(alignment["venue_place_id"]) and alignment["venue_place_id"] != "" ->
        "place:" <> alignment["venue_place_id"]

      is_binary(a["location"]) and normalize_text(a["location"]) not in ["", "online"] ->
        "venue:" <> squash(a["location"])

      (a["plan_type"] || alignment["plan_type"]) == "virtual" ->
        "venue:online"

      true ->
        "stem:" <> squash(title_stem(a["title"]))
    end
  end

  @doc """
  Title stem: the title with schedule fragments (weekday, daypart, clock,
  "with ..." tail) removed. "Night Hawk - Friday" and "Nighthawk Sunday
  with Maya" both keep their subject; the schedule never identifies a plan.
  """
  def title_stem(title) when is_binary(title) do
    title
    |> normalize_text()
    |> String.split(" with ")
    |> List.first()
    |> String.split()
    |> Enum.reject(
      &(&1 in @day_words or &1 in ~w(soon open window) or
          Map.has_key?(@weekday_abbreviations, &1) or clock_token?(&1))
    )
    |> Enum.join(" ")
    |> case do
      "" -> normalize_text(title)
      stem -> stem
    end
  end

  def title_stem(_), do: ""

  @doc "Day key: resolved calendar date when known, else the normalized daypart/weekday token, else open."
  def day_key(attrs) when is_map(attrs) do
    a = stringify(attrs)
    alignment = if is_map(a["alignment"]), do: a["alignment"], else: %{}

    cond do
      match?(%DateTime{}, a["start_at"]) ->
        "date:" <> (a["start_at"] |> DateTime.to_date() |> Date.to_iso8601())

      is_binary(get_in(alignment, ["date", "resolved_on"])) ->
        "date:" <> alignment["date"]["resolved_on"]

      true ->
        case day_token(a["time_label"]) || day_token(alignment["date_label"]) ||
               day_token(get_in(alignment, ["date", "value"])) do
          nil -> "open"
          token -> "day:" <> token
        end
    end
  end

  @doc "Clock key normalized to 24h HH:MM, from start_at, the stored exact_time, or the time label."
  def clock_key(attrs) when is_map(attrs) do
    a = stringify(attrs)
    alignment = if is_map(a["alignment"]), do: a["alignment"], else: %{}

    cond do
      match?(%DateTime{}, a["start_at"]) ->
        a["start_at"] |> DateTime.to_time() |> clock_string()

      true ->
        parse_clock(get_in(alignment, ["exact_time", "value"])) ||
          parse_clock(a["time_label"]) || parse_clock(alignment["date_label"])
    end
  end

  def parse_clock(text) when is_binary(text) do
    case Regex.run(~r/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, text) do
      [_, hour, minute, meridiem] ->
        h = String.to_integer(hour)
        m = if minute in [nil, ""], do: 0, else: String.to_integer(minute)

        h24 =
          cond do
            String.downcase(meridiem) == "pm" and h < 12 -> h + 12
            String.downcase(meridiem) == "am" and h == 12 -> 0
            true -> h
          end

        clock_string_parts(h24, m)

      _ ->
        case Regex.run(~r/\b(\d{1,2}):(\d{2})\b/, text) do
          [_, hour, minute] ->
            clock_string_parts(String.to_integer(hour), String.to_integer(minute))

          _ ->
            nil
        end
    end
  end

  def parse_clock(_), do: nil

  # ------------------------------------------------------------------
  # Dedupe key
  # ------------------------------------------------------------------

  @doc "The stored components of a plan's dedupe identity (kept in alignment at creation)."
  def components(owner_id, participant_ids, attrs)
      when is_binary(owner_id) and is_list(participant_ids) and is_map(attrs) do
    participants =
      participant_ids
      |> Enum.filter(&is_binary/1)
      |> Enum.reject(&(&1 == owner_id))
      |> Enum.uniq()
      |> Enum.sort()

    %{
      "owner" => owner_id,
      "participants" => participants,
      "venue" => venue_key(attrs),
      "subject" => subject_key(attrs),
      "day" => day_key(attrs),
      "clock" => clock_key(attrs)
    }
  end

  @doc """
  Subject key: what the plan IS, from the title stem with venue words
  removed ("Aud" at Moonlight Beach vs "Just me" at Moonlight Beach are
  two plans at one venue, not one intent). Falls back to the venue
  itself when the title is only the venue ("Nighthawk" at Nighthawk).
  """
  def subject_key(attrs) when is_map(attrs) do
    a = stringify(attrs)
    stem_words = a["title"] |> title_stem() |> String.split()
    venue_words = (a["location"] || "") |> normalize_text() |> String.split()
    subject_words = stem_words -- venue_words

    case subject_words do
      [] -> squash(a["location"] || a["title"] || "")
      words -> Enum.join(words, "")
    end
  end

  def dedupe_key(%{
        "owner" => owner,
        "participants" => participants,
        "venue" => venue,
        "day" => day
      }) do
    raw = Enum.join([owner, Enum.join(participants, ","), venue, day], "|")
    :crypto.hash(:sha256, raw) |> Base.encode16(case: :lower) |> String.slice(0, 24)
  end

  @doc """
  True when two component maps describe the same intent: owner,
  participants, venue and subject equal, days equal or one side open,
  and clocks compatible (two differently clocked plans on the same day
  are two plans - 7 PM and 11 AM do not merge; a clocked and an
  unclocked twin still reconcile).
  """
  def components_match?(%{} = a, %{} = b) do
    a["owner"] == b["owner"] and a["participants"] == b["participants"] and
      a["venue"] == b["venue"] and subject_match?(a, b) and
      (a["day"] == b["day"] or a["day"] == "open" or b["day"] == "open") and
      clock_match?(a, b)
  end

  # Components stamped before the subject existed (legacy rows) carry
  # no subject key; a missing subject on one side does not block a match.
  def components_match?(_, _), do: false

  defp subject_match?(a, b) do
    case {a["subject"], b["subject"]} do
      {nil, _} -> true
      {_, nil} -> true
      {same, same} -> true
      _ -> false
    end
  end

  defp clock_match?(a, b) do
    case {a["clock"], b["clock"]} do
      {nil, _} -> true
      {_, nil} -> true
      {same, same} -> true
      _ -> false
    end
  end

  @doc "Components for a persisted plan row plus its participant user ids."
  def components_for_plan(%{} = plan, participant_ids) when is_list(participant_ids) do
    stored = if is_map(plan.alignment), do: plan.alignment["dedupe"], else: nil

    if is_map(stored) and is_binary(stored["venue"]) do
      # Stored components win for venue/day (creation-time truth); the
      # participant set is always read live so later joins are honored.
      components(plan.created_by_user_id, participant_ids, plan)
      |> Map.put("venue", stored["venue"])
      |> Map.put("day", stored["day"] || day_key(plan))
      |> then(fn c ->
        if is_binary(stored["subject"]), do: Map.put(c, "subject", stored["subject"]), else: c
      end)
    else
      components(plan.created_by_user_id, participant_ids, plan)
    end
  end

  # ------------------------------------------------------------------
  # Canonical time (conflict gate)
  # ------------------------------------------------------------------

  @doc """
  The one comparable instant for a plan: start_at when present, else the
  arbitration layer's canonical start over the stored alignment, else a
  resolution of the label's weekday/daypart plus clock. Nil when the plan
  carries no resolvable time at all - such plans cannot conflict.
  """
  def canonical_start(%{} = plan) do
    start_at = field(plan, :start_at)

    cond do
      match?(%DateTime{}, start_at) ->
        start_at

      true ->
        alignment =
          case field(plan, :alignment) do
            a when is_map(a) -> a
            _ -> %{}
          end

        arb_input =
          alignment
          |> Map.put("time_label", field(plan, :time_label))
          |> Map.put("title", field(plan, :title))

        PlanStateArbitration.canonical_start(arb_input) || resolve_label_start(plan)
    end
  end

  def canonical_start(_), do: nil

  defp resolve_label_start(plan) do
    with clock when is_binary(clock) <- clock_key(plan),
         [hour, minute] <- String.split(clock, ":"),
         date when not is_nil(date) <- resolve_label_date(plan) do
      case DateTime.new(
             date,
             Time.new!(String.to_integer(hour), String.to_integer(minute), 0),
             "Etc/UTC"
           ) do
        {:ok, dt} -> dt
        _ -> nil
      end
    else
      _ -> nil
    end
  end

  defp resolve_label_date(plan) do
    today = Date.utc_today()
    label = field(plan, :time_label) || ""

    alignment =
      case field(plan, :alignment) do
        a when is_map(a) -> a
        _ -> %{}
      end

    date_value = get_in(alignment, ["date", "value"]) || ""
    token = day_token(label) || day_token(date_value)

    cond do
      token == "tomorrow" ->
        Date.add(today, 1)

      token in ["tonight", "today"] ->
        today

      token in @weekdays ->
        target = Enum.find_index(@weekdays, &(&1 == token)) + 1
        delta = rem(target - Date.day_of_week(today) + 7, 7)
        Date.add(today, delta)

      true ->
        nil
    end
  end

  @doc "Default occupancy window for conflict comparison: canonical start plus two hours (or end_at)."
  def window(%{} = plan) do
    end_at = field(plan, :end_at)

    case canonical_start(plan) do
      %DateTime{} = start ->
        finish =
          if match?(%DateTime{}, end_at) and DateTime.compare(end_at, start) == :gt,
            do: end_at,
            else: DateTime.add(start, 2 * 3600, :second)

        {start, finish}

      nil ->
        nil
    end
  end

  def windows_overlap?({s1, e1}, {s2, e2}) do
    DateTime.compare(s1, e2) == :lt and DateTime.compare(s2, e1) == :lt
  end

  # ------------------------------------------------------------------
  # Human titles (F18-06 title hygiene)
  # ------------------------------------------------------------------

  @doc """
  A human title at creation: what (or venue) plus who. The schedule is
  never baked in - the day/clock lives in time_label and start_at - and
  there is no bare "Meetup." default: with no what and no venue, the
  fallback names the people.
  """
  def human_title(opts) when is_map(opts) do
    what = present(opts[:what] || opts["what"])
    venue = present(opts[:venue] || opts["venue"] || opts[:location] || opts["location"])
    who = first_present(opts[:who] || opts["who"])

    base =
      cond do
        is_binary(what) and title_stem(what) != "" -> capitalize_first(what)
        is_binary(venue) -> venue
        is_binary(who) -> "Plan with #{who}"
        true -> "Plan"
      end

    cond do
      is_binary(who) and not String.contains?(String.downcase(base), String.downcase(who)) ->
        String.trim(base <> " with " <> who)

      true ->
        String.trim(base)
    end
  end

  # ------------------------------------------------------------------
  # Helpers
  # ------------------------------------------------------------------

  defp squash(text), do: text |> normalize_text() |> String.replace(" ", "")

  defp clock_token?(token),
    do: not is_nil(parse_clock(token)) or Regex.match?(~r/^\d{1,2}(:\d{2})?$/, token)

  defp day_token(text) when is_binary(text) do
    normalized = normalize_text(text)

    Enum.find(@day_words, &String.contains?(normalized, &1)) ||
      Enum.find_value(String.split(normalized), fn token ->
        Map.get(@weekday_abbreviations, token)
      end)
  end

  defp day_token(_), do: nil

  defp clock_string(%Time{} = time), do: clock_string_parts(time.hour, time.minute)

  defp clock_string_parts(hour, minute) do
    :io_lib.format("~2..0B:~2..0B", [hour, minute]) |> IO.iodata_to_binary()
  end

  defp present(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> if String.downcase(trimmed) in @stop_fragments, do: nil, else: trimmed
    end
  end

  defp present(_), do: nil

  defp first_present(list) when is_list(list), do: Enum.find_value(list, &present/1)
  defp first_present(value), do: present(value)

  defp capitalize_first(text) do
    text = String.trim(text)
    String.upcase(String.slice(text, 0, 1)) <> String.slice(text, 1..-1//1)
  end

  defp stringify(%_{} = struct), do: struct |> Map.from_struct() |> stringify()

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp stringify(_), do: %{}

  # Field access that works for structs and for atom- or string-keyed maps.
  defp field(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key))
  end

  defp field(_, _), do: nil
end
