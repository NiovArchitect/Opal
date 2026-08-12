defmodule OpalCore.SocialFlow.GroupComposition do
  @moduledoc """
  Compound group intelligence from conversation evidence.

  Separates realities that dyad-proxy flattening destroys:

  - **Who** — required vs optional; late join; "can Sam come?"
  - **When** — strongest common start; early leave / late arrival
  - **Where** — hard exclusions (not downtown)
  - **Food** — conflicts (not sushi)
  - **Participation** — late/early do not kill the plan
  - **Capacity** — optional guest may change venue feasibility
  - **Authority** — Set needs required affirmatives, not every member

  Not an authority for Set. Feeds AlignmentAuthority + Shared Reality.
  Private causes stay out of shared projection.
  """

  import Ecto.Query

  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SmokeResidue

  @opt_out_patterns [
    ~r/\bstart without me\b/i,
    ~r/\bi'?ll meet you\b/i,
    ~r/\bmeet you (there|around|later)\b/i,
    ~r/\bjoin (you )?(later|around)\b/i,
    ~r/\bcan'?t make the start\b/i,
    ~r/\bi'?ll be late\b/i,
    ~r/\bcome late\b/i
  ]

  @early_leave_patterns [
    ~r/\bleaving around\b/i,
    ~r/\bhave to leave\b/i,
    ~r/\bout by\b/i,
    ~r/\bcan'?t stay (past|after)\b/i,
    ~r/\bi'?m leaving\b/i
  ]

  @guest_ask_patterns [
    ~r/\bcan (\w+) come\b/i,
    ~r/\bbring (\w+)\b/i,
    ~r/\binvite (\w+)\b/i,
    ~r/\b(\w+) join\b/i
  ]

  @place_exclude_patterns [
    {~r/\banywhere but downtown\b/i, "downtown"},
    {~r/\bnot downtown\b/i, "downtown"},
    {~r/\bno downtown\b/i, "downtown"},
    {~r/\bavoid downtown\b/i, "downtown"}
  ]

  @food_exclude_patterns [
    {~r/\bnot sushi\b/i, "sushi"},
    {~r/\bno sushi\b/i, "sushi"},
    {~r/\bsushi again\b/i, "sushi"}
  ]

  @affirm_patterns [
    ~r/\bi'?m in\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bagreed\b/i,
    ~r/\bsee you (there|then|at)\b/i,
    ~r/\bit'?s a plan\b/i,
    ~r/\bwe('?re| are) set\b/i
  ]

  @doc """
  Compose multi-dimensional group reality for a conversation.
  """
  def compose(conversation_id, messages) when is_binary(conversation_id) and is_list(messages) do
    member_ids = member_ids(conversation_id)
    social = social_messages(messages)
    bodies = Enum.map(social, &body/1)

    participations = participation_by_user(social, member_ids)
    optional_ids = optional_participant_ids(participations, social)
    required_ids = member_ids -- optional_ids

    # Guest names that are NOT yet real members (projection only until membership path runs).
    guests =
      guest_requests(bodies)
      |> Enum.reject(fn name ->
        # if already a member display, don't double-count as guest
        false and name
      end)

    # Real membership is authoritative for who; guest_asks are pending invites only.
    who_count = length(member_ids)

    time = compose_time(bodies)
    place = compose_place(bodies)
    food = compose_food(bodies)

    affirmatives =
      social
      |> Enum.filter(fn m -> match_any?(body(m), @affirm_patterns) end)
      |> Enum.map(&sender_id/1)
      |> Enum.uniq()
      |> Enum.filter(&(&1 in member_ids))

    required_affirmed =
      Enum.filter(required_ids, &(&1 in affirmatives))

    optional_affirmed =
      Enum.filter(optional_ids, &(&1 in affirmatives))

    late_ok? = Enum.any?(participations, fn {_id, p} -> p.late_arrival? end)
    early_leave_ok? = Enum.any?(participations, fn {_id, p} -> p.early_leave? end)

    # Partial participation does not kill viability when required are in.
    participation_kills? = false

    capacity = %{
      "member_count" => length(member_ids),
      "guest_asks_pending" => guests,
      "party_size" => who_count,
      "projected_party_size" => who_count,
      "venue_feasibility_may_change" => length(guests) > 0,
      "note" =>
        if(length(guests) > 0,
          do: "Pending invite may change table size when they join",
          else: nil
        )
    }

    surface_base = %{
      "composition" => if(length(member_ids) >= 3, do: "group", else: "dyad"),
      "member_count" => length(member_ids),
      "who" => %{
        "member_count" => length(member_ids),
        "projected_count" => who_count,
        "required_participant_ids" => required_ids,
        "optional_participant_ids" => optional_ids,
        "guest_asks" => guests,
        "pending_invites" => guests,
        "required_affirmed_count" => length(required_affirmed),
        "optional_affirmed_count" => length(optional_affirmed),
        "required_pending_count" => length(required_ids) - length(required_affirmed)
      },
      "when" => time,
      "where" => place,
      "food" => food,
      "participation" => %{
        "late_arrival_present" => late_ok?,
        "early_leave_present" => early_leave_ok?,
        "kills_plan" => participation_kills?,
        "note" =>
          cond do
            late_ok? and early_leave_ok? ->
              "Late arrival and early leave do not block the plan"

            late_ok? ->
              "Late arrival does not block the plan"

            early_leave_ok? ->
              "Early leave does not block the plan"

            true ->
              nil
          end
      },
      "capacity" => capacity,
      "authority" => %{
        "model" => "required_participants",
        "required_must_affirm" => true,
        "optional_may_skip" => true,
        "unanimous_all_members" => false,
        "required_satisfied" =>
          required_ids != [] and MapSet.subset?(MapSet.new(required_ids), MapSet.new(affirmatives))
      },
      "constraints" => public_constraints(place, food),
      "shared_safe" => true
    }

    Map.put(surface_base, "human_surface", human_surface(surface_base))
  end

  def compose(_, _), do: empty_composition()

  @doc "Required participant ids for Set gate (optional excluded)."
  def required_participant_ids(conversation_id, messages) do
    c = compose(conversation_id, messages)
    get_in(c, ["who", "required_participant_ids"]) || member_ids(conversation_id)
  end

  @doc """
  Human-facing compression — consequence, not constraint graph.
  Never dumps private causes.
  """
  def human_surface(composition) when is_map(composition) do
    who = composition["who"] || %{}
    when_m = composition["when"] || %{}
    where_m = composition["where"] || %{}
    food = composition["food"] || %{}
    n = who["member_count"] || composition["member_count"] || 0
    start = when_m["strongest_common_start"]
    day = when_m["day"]

    place_line =
      cond do
        is_binary(where_m["known_place"]) ->
          where_m["known_place"]

        where_m["downtown_incompatible"] ->
          # Area consequence without dumping "Alex said..."
          "Choosing the place"

        is_list(where_m["compatible_areas"]) and where_m["compatible_areas"] != [] ->
          Enum.join(where_m["compatible_areas"], " · ") <> " · choosing the restaurant"

        true ->
          "Place still open"
      end

    when_line =
      cond do
        day && start -> "#{day} · around #{String.replace(start, ~r/^after\s+/i, "")}"
        start -> "Around #{String.replace(start, ~r/^after\s+/i, "")} works best for the group"
        day -> day
        true -> nil
      end

    title_what = if is_binary(day), do: "#{day} dinner", else: nil

    who_line = if is_integer(n) and n > 0, do: "#{n} people", else: nil
    # When title already has day, do not duplicate when_line into headline.
    when_for_headline = if is_nil(title_what) and is_binary(when_line), do: when_line, else: nil

    %{
      "headline" =>
        [title_what, who_line, when_for_headline]
        |> Enum.filter(&(is_binary(&1) and &1 != ""))
        |> case do
          [] -> "Something is forming"
          parts -> Enum.join(Enum.take(parts, 3), " · ")
        end,
      "who_line" => if(n > 0, do: "#{n} people", else: nil),
      "when_line" => when_line,
      "place_line" => place_line,
      "place_gap" => is_nil(where_m["known_place"]),
      "food_consequence" =>
        if(food["sushi_conflict"], do: "Sushi drops out for this group", else: nil),
      "area_consequence" =>
        if(where_m["downtown_incompatible"], do: "Downtown drops out for this group", else: nil),
      "shared_safe" => true
    }
  end

  def human_surface(_), do: %{"headline" => "Something is forming", "shared_safe" => true}

  @doc """
  Venue fit for party size + hard exclusions. Recomputes when membership changes.
  """
  def venue_fit(composition) when is_map(composition) do
    alias OpalCore.SocialFlow.RealWorld.Place.Catalog

    who = composition["who"] || %{}
    where_m = composition["where"] || %{}
    food = composition["food"] || %{}
    party = who["member_count"] || composition["member_count"] || 2
    # Real members only for seating (guests unresolved are not seated yet)
    exclude_downtown? = where_m["downtown_incompatible"] == true
    exclude_sushi? = food["sushi_conflict"] == true
    prefer_quiet? = food["prefer_quiet"] == true

    candidates =
      Catalog.list_candidates(capacity_min: party)
      |> Enum.reject(fn p ->
        (exclude_downtown? and String.downcase(p["area_label"] || "") == "downtown") or
          (exclude_sushi? and String.downcase(p["cuisine"] || "") == "sushi")
      end)

    ranked =
      Catalog.rank_for_group(
        capacity_min: party,
        quiet_only: prefer_quiet?,
        exclude_area: if(exclude_downtown?, do: "Downtown", else: nil)
      )

    strongest = List.first(ranked["options"] || candidates) || List.first(candidates)

    %{
      "party_size" => party,
      "strongest" => strongest,
      "options" => ranked["options"] || candidates,
      "eliminated" =>
        Enum.filter(
          [
            if(exclude_downtown?, do: "downtown"),
            if(exclude_sushi?, do: "sushi"),
            if(party >= 6, do: "tables_under_6")
          ],
          & &1
        ),
      "note" =>
        if(is_map(strongest),
          do: "#{strongest["display_name"]} fits #{party}",
          else: "Still choosing a place"
        )
    }
  end

  def venue_fit(_), do: %{"party_size" => 0, "strongest" => nil, "options" => [], "eliminated" => []}

  defp empty_composition do
    %{
      "composition" => "dyad",
      "member_count" => 0,
      "who" => %{},
      "when" => %{},
      "where" => %{},
      "food" => %{},
      "participation" => %{},
      "capacity" => %{},
      "authority" => %{"model" => "required_participants"},
      "constraints" => [],
      "shared_safe" => true
    }
  end

  defp member_ids(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: cm.user_id
    )
    |> Repo.all()
    |> Enum.uniq()
  end

  defp social_messages(messages) do
    Enum.filter(messages, fn m ->
      b = body(m)
      not SmokeResidue.smoke_body?(b) and String.trim(b) != ""
    end)
  end

  defp body(m), do: Map.get(m, :body) || Map.get(m, "body") || ""
  defp sender_id(m), do: Map.get(m, :sender_user_id) || Map.get(m, "sender_user_id")

  defp participation_by_user(social, member_ids) do
    Map.new(member_ids, fn uid ->
      bodies =
        social
        |> Enum.filter(&(sender_id(&1) == uid))
        |> Enum.map(&body/1)
        |> Enum.join(" ")

      late? = match_any?(bodies, @opt_out_patterns)
      early? = match_any?(bodies, @early_leave_patterns)
      leave_at = extract_leave_time(bodies)
      # Explicit can't-start-before is a constraint, not optional membership.
      arrive_after =
        case Regex.run(~r/\bcan'?t get there before\s+(\d{1,2}(?::\d{2})?)\b/i, bodies) do
          [_, t] -> normalize_clock(t)
          _ -> nil
        end

      {uid,
       %{
         late_arrival?: late?,
         early_leave?: early? or not is_nil(leave_at),
         leave_at: leave_at,
         arrive_after: arrive_after,
         optional?: late?
       }}
    end)
  end

  defp optional_participant_ids(participations, _social) do
    # Explicit "start without me" / meet later → optional for Set.
    # Early leave alone does NOT make someone optional (they can still be required).
    participations
    |> Enum.filter(fn {_uid, p} -> p.optional? or p.late_arrival? end)
    |> Enum.map(&elem(&1, 0))
  end

  defp guest_requests(bodies) do
    text = Enum.join(bodies, " ")

    @guest_ask_patterns
    |> Enum.flat_map(fn re ->
      case Regex.run(re, text) do
        [_, name] ->
          n = String.trim(name)

          if String.downcase(n) in ~w(i we you they someone anyone) do
            []
          else
            [String.capitalize(n)]
          end

        _ ->
          []
      end
    end)
    |> Enum.uniq()
  end

  defp compose_time(bodies) do
    text = Enum.join(bodies, " ")
    starts = extract_start_candidates(text)
    leave = extract_leave_time(text)
    day = extract_day(text)

    strongest =
      case starts do
        [] -> nil
        # Strongest common start = latest mentioned lower bound (e.g. 7:30 beats 7)
        xs -> Enum.max_by(xs, &time_minutes/1)
      end

    %{
      "day" => day,
      "strongest_common_start" => strongest,
      "start_candidates" => starts,
      "early_leave" => leave,
      "window_note" =>
        cond do
          strongest && leave ->
            "#{strongest} start · one person may leave around #{leave}"

          strongest ->
            "Strongest common start around #{strongest}"

          true ->
            nil
        end
    }
  end

  defp compose_place(bodies) do
    text = Enum.join(bodies, " ")

    excluded =
      @place_exclude_patterns
      |> Enum.filter(fn {re, _} -> Regex.match?(re, text) end)
      |> Enum.map(fn {_, label} -> label end)
      |> Enum.uniq()

    known = extract_known_place(text)

    %{
      "known_place" => known,
      "excluded_areas" => excluded,
      "downtown_incompatible" => "downtown" in excluded,
      "gap" => if(is_nil(known) and excluded == [], do: "where", else: nil)
    }
  end

  defp compose_food(bodies) do
    text = Enum.join(bodies, " ")

    excluded =
      @food_exclude_patterns
      |> Enum.filter(fn {re, _} -> Regex.match?(re, text) end)
      |> Enum.map(fn {_, label} -> label end)
      |> Enum.uniq()

    %{
      "excluded" => excluded,
      "sushi_conflict" => "sushi" in excluded,
      "note" =>
        if("sushi" in excluded, do: "Sushi conflicts with at least one participant", else: nil)
    }
  end

  defp public_constraints(place, food) do
    []
    |> then(fn acc ->
      Enum.reduce(place["excluded_areas"] || [], acc, fn a, a2 ->
        [%{"type" => "place_exclude", "value" => a, "visibility" => "shared"} | a2]
      end)
    end)
    |> then(fn acc ->
      Enum.reduce(food["excluded"] || [], acc, fn f, a2 ->
        [%{"type" => "food_exclude", "value" => f, "visibility" => "shared"} | a2]
      end)
    end)
    |> Enum.reverse()
  end

  defp extract_start_candidates(text) do
    times = []

    times =
      Regex.scan(~r/\bafter\s+(\d{1,2}(?::\d{2})?)\b/i, text)
      |> Enum.reduce(times, fn [_, t], acc -> ["after #{normalize_clock(t)}" | acc] end)

    times =
      Regex.scan(~r/\b(\d{1,2}:\d{2})\b/, text)
      |> Enum.reduce(times, fn [_, t], acc -> [normalize_clock(t) | acc] end)

    times =
      Regex.scan(~r/\baround\s+(\d{1,2}(?::\d{2})?)\b/i, text)
      |> Enum.reduce(times, fn [_, t], acc -> ["around #{normalize_clock(t)}" | acc] end)

    times =
      if Regex.match?(~r/\bcan'?t get there before\s+(\d{1,2}(?::\d{2})?)\b/i, text) do
        case Regex.run(~r/\bcan'?t get there before\s+(\d{1,2}(?::\d{2})?)\b/i, text) do
          [_, t] -> ["#{normalize_clock(t)}+" | times]
          _ -> times
        end
      else
        times
      end

    Enum.uniq(Enum.reverse(times))
  end

  defp extract_leave_time(text) do
    cond do
      m = Regex.run(~r/\bleaving around\s+(\d{1,2}(?::\d{2})?)\b/i, text) ->
        normalize_clock(Enum.at(m, 1))

      m = Regex.run(~r/\bleave (?:around |by |at )?(\d{1,2}(?::\d{2})?)\b/i, text) ->
        normalize_clock(Enum.at(m, 1))

      true ->
        nil
    end
  end

  defp extract_day(text) do
    Enum.find_value(
      [
        {"saturday", "Saturday"},
        {"sunday", "Sunday"},
        {"friday", "Friday"},
        {"thursday", "Thursday"},
        {"wednesday", "Wednesday"},
        {"tuesday", "Tuesday"},
        {"monday", "Monday"}
      ],
      fn {tok, label} ->
        if Regex.match?(~r/\b#{tok}\b/i, text), do: label
      end
    )
  end

  defp extract_known_place(text) do
    known = [
      "Harbor Table",
      "Communal Coffee",
      "Campfire",
      "Jeune et Jolie",
      "Juniper & Ivy",
      "Herb & Wood",
      "Green Lantern",
      "Summit Grill",
      "Steps Bistro",
      "Velvet Room"
    ]

    Enum.find(known, fn place ->
      Regex.match?(~r/\b#{Regex.escape(place)}\b/i, text)
    end)
  end

  defp normalize_clock(t) do
    t = String.trim(t)

    cond do
      Regex.match?(~r/^\d{1,2}$/, t) -> "#{t}:00"
      true -> t
    end
  end

  defp time_minutes("after " <> rest), do: time_minutes(rest) + 1
  defp time_minutes("around " <> rest), do: time_minutes(rest)

  defp time_minutes(t) when is_binary(t) do
    t2 = String.replace(t, "+", "")

    case Regex.run(~r/^(\d{1,2})(?::(\d{2}))?$/, t2) do
      [_, h, m] -> String.to_integer(h) * 60 + String.to_integer(m)
      [_, h] -> String.to_integer(h) * 60
      _ -> 0
    end
  end

  defp time_minutes(_), do: 0

  defp match_any?(body, patterns), do: Enum.any?(patterns, &Regex.match?(&1, body || ""))
end
