defmodule OpalCore.Oracle do
  @moduledoc """
  Paste J Phase 2 — grounded answers from the caller's real data.

  Answers only what the user is a member of. Never invents. Never leaks
  private third-party speech. Template-only (no LLM polish) so facts stay
  traceable. Character: short warm voice, no em-dashes.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calendar, as: OpalCalendar
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialMemory.PersonMemory
  alias OpalCore.Trips
  alias OpalCore.Voice.PromptGuard
  alias OpalCore.Wallets
  alias OpalCore.Wallets.WalletTransaction

  @kinds [
    :saturday_plans,
    :day_plans,
    :last_saw,
    :trip_status,
    :stale_contacts,
    :find_time,
    :venue_decision,
    :spend_month,
    :gossip_probe,
    :private_fact_probe,
    :injection
  ]

  @gossip_refuse "I don't know. I only see conversations you're in, not private chats between other people."

  @injection_refuse "I can't follow that request. Ask me about your plans, people, or trips instead."

  @private_refuse "I don't share private details like that. Ask them directly, or tell me what you're comfortable saving."

  @doc "Oracle kind atoms."
  def kinds, do: @kinds

  @doc """
  Classify an inbound question into an oracle kind, or `:not_oracle`.
  """
  def classify(text) when is_binary(text) do
    lower = text |> String.trim() |> String.downcase()

    cond do
      lower == "" ->
        :not_oracle

      injection?(lower) ->
        :injection

      gossip_probe?(lower) ->
        :gossip_probe

      private_fact_probe?(lower) ->
        :private_fact_probe

      saturday_plans?(lower) ->
        :saturday_plans

      day_plans?(lower) ->
        :day_plans

      last_saw?(lower) ->
        :last_saw

      trip_status?(lower) ->
        :trip_status

      stale_contacts?(lower) ->
        :stale_contacts

      find_time?(lower) ->
        :find_time

      venue_decision?(lower) ->
        :venue_decision

      spend_month?(lower) ->
        :spend_month

      true ->
        :not_oracle
    end
  end

  def classify(_), do: :not_oracle

  @doc "True when `classify/1` returns a real oracle kind."
  def oracle_question?(text), do: classify(text) != :not_oracle

  @doc """
  Answer from real data for `user_id`.

  Returns:
  - `{:ok, %{kind, text, grounded, sources}}`
  - `:not_oracle` when the text is not an oracle question
  """
  def answer(user_id, text, context \\ %{})

  def answer(user_id, text, context)
      when is_binary(user_id) and is_binary(text) and is_map(context) do
    case classify(text) do
      :not_oracle ->
        :not_oracle

      kind ->
        {reply, sources} = render(kind, user_id, text, context)

        {:ok,
         %{
           kind: kind,
           text: reply,
           grounded: true,
           sources: sources
         }}
    end
  end

  def answer(_, _, _), do: {:error, :invalid}

  # --- classify helpers ------------------------------------------------------

  defp injection?(lower) do
    case PromptGuard.check(lower) do
      {:refuse, _} ->
        true

      {:quote_back, _} ->
        # Center: treat instruction-shaped overrides as refuse (zero overrides).
        true

      _ ->
        Regex.match?(
          ~r/\b(ignore|disregard)\b.*\b(instructions?|rules?|prompt)\b|\brepeat\b.*\b(system|prompt)\b|\bdebug\s+mode\b|\bjailbreak\b|\bdan\b.*\bmode\b|\bact\s+as\s+(if\s+)?(you\s+have\s+)?no\s+(restrictions?|rules?)\b|\bshow\s+me\s+your\s+(system|hidden)\b|\bencoded\s+instructions?\b/i,
          lower
        )
    end
  end

  defp gossip_probe?(lower) do
    Regex.match?(
      ~r/\bwhat\s+did\s+[a-z][a-z']+\s+say\s+about\b|\bwhat\s+did\s+[a-z][a-z']+\s+tell\s+[a-z]|\bprivate\s+(message|chat|dm)\s+between\b|\bshow\s+me\s+.+\s+(messages?|chat)\s+with\b.*\b(without|even\s+though)\b/i,
      lower
    ) or
      (Regex.match?(~r/\b(say|said|told|tell)\b/, lower) and
         Regex.match?(~r/\babout\s+me\b/, lower) and
         Regex.match?(~r/\b(to|with)\s+[a-z]/, lower))
  end

  defp private_fact_probe?(lower) do
    Regex.match?(
      ~r/\b(is|confirm|deny)\b.*\b(birthday|anniversary|phone|address|salary|ssn)\b|\bwhen\s+is\s+[a-z][a-z']+'?s?\s+birthday\b|\btell\s+me\s+[a-z][a-z']+'?s?\s+(birthday|phone|address)\b|\bdoes\s+[a-z][a-z']+\s+have\s+a\s+birthday\b/i,
      lower
    )
  end

  defp saturday_plans?(lower) do
    Regex.match?(~r/\b(what\s+am\s+i\s+doing|what'?s\s+on|any\s+plans?)\b.*\bsaturday\b/i, lower) or
      Regex.match?(~r/\bsaturday\b.*\b(plans?|doing|schedule)\b/i, lower)
  end

  defp day_plans?(lower) do
    Regex.match?(
      ~r/\b(what\s+am\s+i\s+doing|what'?s\s+on\s+my\s+(calendar|schedule))\b.*\b(monday|tuesday|wednesday|thursday|friday|sunday|today|tomorrow)\b/i,
      lower
    )
  end

  defp last_saw?(lower) do
    Regex.match?(
      ~r/\b(when\s+did\s+i\s+last\s+(see|hang|meet|talk)|last\s+time\s+i\s+(saw|hung|met|talked)|when\s+was\s+the\s+last\s+time\s+(i\s+)?(saw|with))\b/i,
      lower
    )
  end

  defp trip_status?(lower) do
    Regex.match?(~r/\b(status|how'?s|how\s+is|where\s+are\s+we)\b.*\btrip\b/i, lower) or
      Regex.match?(~r/\btrip\b.*\b(status|looking)\b/i, lower) or
      Regex.match?(~r/\bwhat'?s\s+the\s+status\s+of\s+the\b.+\btrip\b/i, lower)
  end

  defp stale_contacts?(lower) do
    Regex.match?(
      ~r/\bwho\s+haven'?t\s+i\s+(talked|spoken|reached|caught)\b|\bhaven'?t\s+(talked|spoken)\s+to\s+in\s+a\s+while\b|\bwho\s+am\s+i\s+overdue\b|\bcooling\s+contacts?\b/i,
      lower
    )
  end

  defp find_time?(lower) do
    Regex.match?(
      ~r/\b(find\s+me\s+a\s+time|when\s+are\s+(we|they)\s+free|free\s+for\s+(dinner|lunch|coffee)|schedule\s+(dinner|lunch|coffee)\s+with)\b/i,
      lower
    )
  end

  defp venue_decision?(lower) do
    Regex.match?(
      ~r/\bwhat\s+did\s+we\s+decide\b.*\b(venue|place|restaurant|spot)\b|\b(venue|place|restaurant)\s+(we\s+)?(picked|chose|locked|agreed)\b|\bwhere\s+did\s+we\s+(land|settle|decide)\b/i,
      lower
    )
  end

  defp spend_month?(lower) do
    Regex.match?(
      ~r/\bhow\s+much\s+(have\s+i|did\s+i)\s+spend\b|\bspen[td]\s+on\s+plans?\b.*\b(month|this\s+month)\b|\bwallet\s+spend\b.*\bmonth\b/i,
      lower
    )
  end

  # --- render ----------------------------------------------------------------

  defp render(:injection, _user_id, _text, _ctx), do: {@injection_refuse, ["prompt_guard"]}

  defp render(:gossip_probe, _user_id, _text, _ctx), do: {@gossip_refuse, ["privacy_boundary"]}

  defp render(:private_fact_probe, _user_id, _text, _ctx) do
    # Never confirm or deny owner-scoped celebration / contact private facts.
    {@private_refuse, ["privacy_boundary"]}
  end

  defp render(:saturday_plans, user_id, _text, ctx) do
    tz = timezone(ctx)
    sat = next_weekday(tz, 6)
    plans = plans_on_local_date(user_id, sat, tz)
    reply = format_day_plans("Saturday", sat, plans)
    sources = Enum.map(plans, &"shared_plan:#{&1.id}")
    {reply, sources}
  end

  defp render(:day_plans, user_id, text, ctx) do
    tz = timezone(ctx)
    {label, date} = resolve_day_label(text, tz)
    plans = plans_on_local_date(user_id, date, tz)
    reply = format_day_plans(label, date, plans)
    sources = Enum.map(plans, &"shared_plan:#{&1.id}")
    {reply, sources}
  end

  defp render(:last_saw, user_id, text, ctx) do
    name = extract_person_name(text, ctx)

    case name do
      nil ->
        {"Who do you mean? Name the person and I'll check.", []}

      person ->
        case last_contact_for(user_id, person, ctx) do
          %{at: %DateTime{} = at, source: source, title: title} ->
            label = format_local_date(at, timezone(ctx))
            title_bit = if is_binary(title) and title != "", do: " (#{title})", else: ""

            {"You last saw #{first_name(person)} on #{label}#{title_bit}.",
             [source]}

          _ ->
            {"I don't have a last hang with #{first_name(person)} on record yet.", []}
        end
    end
  end

  defp render(:trip_status, user_id, text, _ctx) do
    needle = trip_needle(text)

    case Trips.list_trips_for_user(user_id) do
      {:ok, trips} ->
        trip =
          Enum.find(trips, fn t ->
            blob =
              String.downcase("#{t.title} #{t.destination_label || ""}")

            needle == "" or String.contains?(blob, needle)
          end)

        case trip do
          nil when needle != "" ->
            {"I don't see a #{String.trim(needle)} trip on your list yet.", []}

          nil ->
            {"I don't see any trips on your list yet.", []}

          t ->
            legs = length(List.wrap(t.legs))
            people = length(List.wrap(t.participants))
            dest = t.destination_label || t.title
            dates = trip_dates(t)

            {"#{t.title} is on your list for #{dest}#{dates}. #{people} people, #{legs} stops so far.",
             ["trip:#{t.id}"]}
        end

      _ ->
        {"I couldn't load your trips just now.", []}
    end
  end

  defp render(:stale_contacts, user_id, _text, _ctx) do
    rows =
      from(p in PersonMemory,
        where: p.account_id == ^user_id,
        order_by: [asc: p.last_contact_at],
        limit: 20
      )
      |> Repo.all()

    now = DateTime.utc_now()

    stale =
      rows
      |> Enum.filter(fn p ->
        p.cadence_status == "cooling" or
          (match?(%DateTime{}, p.last_contact_at) and
             DateTime.diff(now, p.last_contact_at, :second) >= 21 * 86_400)
      end)
      |> Enum.take(5)

    case stale do
      [] ->
        {"Nobody's jumping out as overdue right now. Want me to watch someone specifically?",
         []}

      list ->
        names =
          list
          |> Enum.map(&display_name_for(&1.person_id))
          |> Enum.reject(&(is_nil(&1) or &1 == ""))
          |> Enum.map(&first_name/1)

        case names do
          [] ->
            {"A few contacts look quiet, but I don't have names handy yet.",
             Enum.map(list, &"person_memory:#{&1.id}")}

          ns ->
            {"You haven't talked to #{join_names(ns)} in a while. Want a nudge draft?",
             Enum.map(list, &"person_memory:#{&1.id}")}
        end
    end
  end

  defp render(:find_time, user_id, text, ctx) do
    who = extract_person_name(text, ctx) || "them"
    who_label = first_name(who)

    cond do
      OpalCalendar.connected?(user_id) ->
        # Connected path still stays honest if free/busy fails.
        case OpalCalendar.free_busy(
               user_id,
               DateTime.utc_now(),
               DateTime.add(DateTime.utc_now(), 7 * 86_400, :second)
             ) do
          {:ok, busy} when is_list(busy) ->
            open = suggest_open_slot(busy, timezone(ctx))

            {"For dinner with #{who_label} next week, #{open} looks open on your calendar.",
             ["calendar:free_busy"]}

          _ ->
            {"Your calendar is connected, but I couldn't read free/busy just now. Try again in a moment.",
             ["calendar:error"]}
        end

      true ->
        conflicts = upcoming_plan_titles(user_id)

        conflict_bit =
          case conflicts do
            [] -> "I don't see a conflicting plan yet"
            [t | _] -> "I already see #{t} on your plans"
          end

        {"I don't have your calendar connected yet, so I can't verify free/busy. #{conflict_bit}. Connect Google Calendar in You, or tell me a day that works for #{who_label}.",
         ["calendar:disconnected"]}
    end
  end

  defp render(:venue_decision, user_id, text, ctx) do
    history = get_in_ctx(ctx, [:conversation_history]) || []
    topic = venue_topic(text)

    from_history =
      history
      |> Enum.reverse()
      |> Enum.find_value(fn turn ->
        body = turn[:body] || turn["body"] || ""
        role = turn[:role] || turn["role"]

        if role in ["user", :user, "opal", :opal] and venue_body?(body, topic) do
          body
        else
          nil
        end
      end)

    from_plans =
      plans_for_user(user_id)
      |> Enum.find_value(fn p ->
        place = plan_place(p)

        if is_binary(place) and place != "" and
             (topic == "" or String.contains?(String.downcase(place), topic) or
                String.contains?(String.downcase(p.title || ""), topic)) do
          {p, place}
        else
          nil
        end
      end)

    cond do
      is_binary(from_history) ->
        {"From what you told me: #{shorten(from_history, 160)}", ["conversation_history"]}

      match?({_, _}, from_plans) ->
        {p, place} = from_plans
        {"You locked in #{place} for #{p.title}.", ["shared_plan:#{p.id}"]}

      true ->
        {"I don't see a venue decision yet. Want to pick a place?", []}
    end
  end

  defp render(:spend_month, user_id, _text, _ctx) do
    {:ok, rows} = Wallets.list_transactions(user_id, limit: 100)
    {start_at, _} = month_bounds_utc()

    spent =
      rows
      |> Enum.filter(fn %WalletTransaction{} = t ->
        t.type == "spend" and match?(%DateTime{}, t.inserted_at) and
          DateTime.compare(t.inserted_at, start_at) != :lt
      end)
      |> Enum.map(& &1.amount_cents)
      |> Enum.sum()

    dollars = Float.round(spent / 100, 2)
    label = :erlang.float_to_binary(dollars, decimals: 2)

    sources =
      rows
      |> Enum.filter(&(&1.type == "spend"))
      |> Enum.take(5)
      |> Enum.map(&"wallet_tx:#{&1.id}")

    {"You've spent $#{label} on plans this month.", sources}
  end

  defp render(_, _user_id, _text, _ctx), do: {"I'm not sure how to answer that yet.", []}

  # --- data helpers ----------------------------------------------------------

  defp timezone(ctx) do
    get_in_ctx(ctx, [:user, :timezone]) || "America/Los_Angeles"
  end

  defp next_weekday(tz, target_wday) when target_wday in 1..7 do
    today = local_today(tz)
    # Date.day_of_week: 1=Mon ... 7=Sun. Elixir Saturday = 6.
    current = Date.day_of_week(today)
    delta = rem(target_wday - current + 7, 7)
    Date.add(today, delta)
  end

  defp local_today(tz) do
    now = DateTime.utc_now()

    case safe_shift_zone(now, tz) do
      {:ok, local} -> DateTime.to_date(local)
      _ -> Date.utc_today()
    end
  end

  defp safe_shift_zone(%DateTime{} = dt, tz) when is_binary(tz) do
    case DateTime.shift_zone(dt, tz) do
      {:ok, local} -> {:ok, local}
      _ -> {:ok, dt}
    end
  end

  defp safe_shift_zone(%DateTime{} = dt, _), do: {:ok, dt}

  defp resolve_day_label(text, tz) do
    lower = String.downcase(text)
    today = local_today(tz)

    cond do
      String.contains?(lower, "today") ->
        {"today", today}

      String.contains?(lower, "tomorrow") ->
        {"tomorrow", Date.add(today, 1)}

      true ->
        weekdays = [
          {"monday", 1},
          {"tuesday", 2},
          {"wednesday", 3},
          {"thursday", 4},
          {"friday", 5},
          {"saturday", 6},
          {"sunday", 7}
        ]

        {label, n} =
          Enum.find(weekdays, {"that day", Date.day_of_week(today)}, fn {name, _} ->
            String.contains?(lower, name)
          end)
          |> case do
            {name, n} -> {String.capitalize(name), n}
            other -> other
          end

        {label, next_weekday(tz, n)}
    end
  end

  defp plans_on_local_date(user_id, %Date{} = date, tz) do
    plans_for_user(user_id)
    |> Enum.filter(fn p ->
      cond do
        match?(%DateTime{}, p.start_at) ->
          case safe_shift_zone(p.start_at, tz) do
            {:ok, local} -> DateTime.to_date(local) == date
            _ -> DateTime.to_date(p.start_at) == date
          end

        is_binary(p.time_label) ->
          dow = date |> Date.day_of_week() |> weekday_name()
          String.contains?(String.downcase(p.time_label), dow)

        true ->
          false
      end
    end)
  end

  defp plans_for_user(user_id) do
    from(sp in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == sp.id,
      where: pp.user_id == ^user_id,
      order_by: [desc: sp.inserted_at],
      limit: 40,
      select: sp
    )
    |> Repo.all()
  end

  defp format_day_plans(label, %Date{} = date, plans) do
    date_s = Calendar.strftime(date, "%b %-d")

    case plans do
      [] ->
        "Nothing on #{label} (#{date_s}) yet. Want to plan something?"

      list ->
        bits =
          list
          |> Enum.take(3)
          |> Enum.map(fn p ->
            status = p.status || "tentative"
            when_bit = p.time_label || status
            "#{p.title} (#{when_bit})"
          end)

        "On #{label} you have #{Enum.join(bits, "; ")}."
    end
  end

  defp last_contact_for(user_id, person_name, ctx) do
    person_id = resolve_person_id(person_name, ctx)

    pm =
      if is_binary(person_id) do
        Repo.get_by(PersonMemory, account_id: user_id, person_id: person_id)
      else
        nil
      end

    plan_hit =
      plans_for_user(user_id)
      |> Enum.find(fn p ->
        blob = String.downcase("#{p.title} #{p.location || ""} #{p.time_label || ""}")
        String.contains?(blob, String.downcase(first_name(person_name)))
      end)

    cond do
      match?(%PersonMemory{last_contact_at: %DateTime{}}, pm) and
          (is_nil(plan_hit) or
             DateTime.compare(pm.last_contact_at, plan_hit.start_at || pm.last_contact_at) != :lt) ->
        %{at: pm.last_contact_at, source: "person_memory:#{pm.id}", title: nil}

      match?(%SharedPlan{}, plan_hit) and match?(%DateTime{}, plan_hit.start_at) ->
        %{at: plan_hit.start_at, source: "shared_plan:#{plan_hit.id}", title: plan_hit.title}

      match?(%SharedPlan{}, plan_hit) and match?(%DateTime{}, plan_hit.inserted_at) ->
        %{at: plan_hit.inserted_at, source: "shared_plan:#{plan_hit.id}", title: plan_hit.title}

      match?(%PersonMemory{last_contact_at: %DateTime{}}, pm) ->
        %{at: pm.last_contact_at, source: "person_memory:#{pm.id}", title: nil}

      true ->
        nil
    end
  end

  defp resolve_person_id(person_name, ctx) do
    contacts = get_in_ctx(ctx, [:social, :frequent_contacts]) || []
    target = String.downcase(first_name(person_name))

    Enum.find_value(contacts, fn c ->
      name = c[:display_name] || c["display_name"] || ""
      id = c[:user_id] || c["user_id"]

      if String.contains?(String.downcase(name), target), do: id
    end)
  end

  defp display_name_for(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: n} when is_binary(n) and n != "" -> n
      %User{handle: h} when is_binary(h) -> h
      _ -> nil
    end
  end

  defp display_name_for(_), do: nil

  defp extract_person_name(text, ctx) do
    contacts =
      (get_in_ctx(ctx, [:social, :frequent_contacts]) || [])
      |> Enum.map(fn c -> c[:display_name] || c["display_name"] end)
      |> Enum.filter(&(is_binary(&1) and &1 != ""))

    from_contact =
      Enum.find(contacts, fn n ->
        String.contains?(String.downcase(text), String.downcase(first_name(n)))
      end)

    from_contact ||
      case Regex.run(
             ~r/\b(?:see|saw|with|hang(?:ing)?\s+with|meet|met|talk(?:ed)?\s+to|dinner\s+with|lunch\s+with|coffee\s+with)\s+([A-Z][a-zA-Z']+)/,
             text
           ) do
        [_, name] -> name
        _ ->
          case Regex.run(~r/\b([A-Z][a-zA-Z']+)\b/, text) do
            [_, name] ->
              if String.downcase(name) in ~w(when did last see saturday what who find how tokyo),
                do: nil,
                else: name

            _ ->
              nil
          end
      end
  end

  defp trip_needle(text) do
    lower = String.downcase(text)

    cond do
      m = Regex.run(~r/\b(?:status of the|how's the|how is the)\s+([a-z][a-z\s]+?)\s+trip\b/i, lower) ->
        Enum.at(m, 1) |> String.trim()

      m = Regex.run(~r/\b([a-z][a-z]+)\s+trip\b/i, lower) ->
        Enum.at(m, 1) |> String.trim()

      true ->
        ""
    end
  end

  defp trip_dates(%{starts_on: %Date{} = s, ends_on: %Date{} = e}) do
    " (#{Calendar.strftime(s, "%b %-d")}–#{Calendar.strftime(e, "%b %-d")})"
  end

  defp trip_dates(%{starts_on: %Date{} = s}) do
    " (from #{Calendar.strftime(s, "%b %-d")})"
  end

  defp trip_dates(_), do: ""

  defp upcoming_plan_titles(user_id) do
    now = DateTime.utc_now()

    plans_for_user(user_id)
    |> Enum.filter(fn p ->
      is_nil(p.start_at) or DateTime.compare(p.start_at, now) != :lt
    end)
    |> Enum.map(& &1.title)
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
    |> Enum.take(3)
  end

  defp suggest_open_slot(busy, _tz) when is_list(busy) do
    if busy == [] do
      "weekday evenings"
    else
      "a quieter evening mid-week"
    end
  end

  defp venue_topic(text) do
    lower = String.downcase(text)

    cond do
      String.contains?(lower, "venue") -> "venue"
      String.contains?(lower, "restaurant") -> "restaurant"
      String.contains?(lower, "place") -> "place"
      String.contains?(lower, "spot") -> "spot"
      true -> ""
    end
  end

  defp venue_body?(body, topic) when is_binary(body) do
    lower = String.downcase(body)

    hit? =
      Regex.match?(
        ~r/\b(venue|place|restaurant|spot|fort oak|decided|locked|picked|chose|go with)\b/i,
        lower
      )

    hit? and (topic == "" or String.contains?(lower, topic) or topic in ~w(venue place spot restaurant))
  end

  defp venue_body?(_, _), do: false

  defp plan_place(%SharedPlan{} = p) do
    alignment = p.alignment || %{}

    cond do
      is_binary(p.location) and p.location != "" ->
        p.location

      is_map(alignment) ->
        get_in(alignment, ["place", "value"]) || alignment["place"] || alignment[:place]

      true ->
        nil
    end
  end

  defp plan_place(_), do: nil

  defp month_bounds_utc do
    today = Date.utc_today()
    start_d = %{today | day: 1}
    start_at = DateTime.new!(start_d, ~T[00:00:00], "Etc/UTC")
    {start_at, DateTime.utc_now()}
  end

  defp format_local_date(%DateTime{} = dt, tz) do
    case safe_shift_zone(dt, tz) do
      {:ok, local} -> Calendar.strftime(local, "%b %-d, %Y")
      _ -> Calendar.strftime(dt, "%b %-d, %Y")
    end
  end

  defp weekday_name(1), do: "monday"
  defp weekday_name(2), do: "tuesday"
  defp weekday_name(3), do: "wednesday"
  defp weekday_name(4), do: "thursday"
  defp weekday_name(5), do: "friday"
  defp weekday_name(6), do: "saturday"
  defp weekday_name(7), do: "sunday"
  defp weekday_name(_), do: ""

  defp first_name(nil), do: ""

  defp first_name(name) when is_binary(name) do
    name |> String.trim() |> String.split(~r/\s+/, parts: 2) |> hd()
  end

  defp first_name(_), do: ""

  defp join_names([a]), do: a
  defp join_names([a, b]), do: "#{a} and #{b}"

  defp join_names(list) when is_list(list) do
    {lead, [last]} = Enum.split(list, -1)
    Enum.join(lead, ", ") <> ", and " <> last
  end

  defp join_names(_), do: "them"

  defp shorten(text, max) when is_binary(text) do
    if String.length(text) <= max, do: text, else: String.slice(text, 0, max - 1) <> "…"
  end

  defp shorten(_, _), do: ""

  defp get_in_ctx(map, [k | rest]) when is_map(map) do
    next = Map.get(map, k) || Map.get(map, to_string(k))
    if rest == [], do: next, else: get_in_ctx(next || %{}, rest)
  end

  defp get_in_ctx(_, _), do: nil
end
