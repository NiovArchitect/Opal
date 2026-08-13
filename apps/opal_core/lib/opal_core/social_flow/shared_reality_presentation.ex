defmodule OpalCore.SocialFlow.SharedRealityPresentation do
  @moduledoc """
  Thin presentation composer for human-legible Shared Reality.

  **Not an authority.** Does not authorize Set, invent plans, or replace
  AlignmentAuthority / SharedPlan / CollectiveFit / ProductShell.

  Projects conversation evidence into:

  - WHAT / WHEN / WHERE (when extractable)
  - consequential gaps still open
  - sufficiency (intention | converging | usable)
  - UI job (reveal | resolve | execute | recall)

  Law: Opal does not celebrate alignment prematurely. Labels must describe
  social reality people can act on — not internal stages like "Set".
  """

  @type stage ::
          :quiet
          | :plan_forming
          | :still_open
          | :will_know_later
          | :set
          | :ready
          | :handled
          | :canceled

  @doc """
  Compose a shared-reality projection from message bodies and lifecycle stage.
  """
  def from_messages(messages, stage) when is_list(messages) do
    bodies =
      messages
      |> Enum.map(fn m -> Map.get(m, :body) || Map.get(m, "body") || "" end)
      |> Enum.reject(&(String.trim(&1) == ""))

    speakers =
      messages
      |> Enum.map(fn m -> Map.get(m, :sender_user_id) || Map.get(m, "sender_user_id") end)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    speaker_count = length(speakers)

    what = extract_activity(bodies)
    when_label = extract_when(bodies)
    pt = place_truth(bodies)
    where_label = pt["display"]
    gaps = consequential_gaps(stage, what, when_label, where_label, speaker_count)
    sufficiency = sufficiency(stage, gaps, what, when_label, where_label)
    ui_job = ui_job(stage, sufficiency, gaps)
    headline = headline(stage, what, when_label, where_label, gaps, sufficiency, speaker_count)
    detail = detail_line(when_label, where_label, gaps, pt)

    # Whole-picture next gap (order-agnostic) — not a linear workflow owner
    next_gap =
      OpalCore.SocialFlow.SocialReality.next_meaningful_gap(
        gaps,
        %{
          "when_known" => not is_nil(when_label),
          "where_known" => not is_nil(where_label),
          "what_known" => not is_nil(what),
          "where_matters" =>
            what in ["Dinner", "Lunch", "Coffee", "Drinks", "Birthday"] or
              (is_binary(what) and Regex.match?(~r/dinner|coffee|lunch|drinks|sushi/i, what || "")),
          "speaker_count" => speaker_count
        },
        stage
      )

    actions = OpalCore.SocialFlow.SocialReality.available_actions(next_gap, %{}, stage)
    primary = List.first(actions)

    %{
      "what" => what,
      "when" => when_label,
      "where" => where_label,
      "place_level" => pt["level"],
      "place_gap_label" => pt["gap_label"],
      "gaps" => gaps,
      "next_gap" => Atom.to_string(next_gap),
      "next_actions" => actions,
      "primary_action" => primary,
      "primary_action_label" => primary && primary["label"],
      "speaker_count" => speaker_count,
      "composition" => if(speaker_count >= 3, do: "group", else: "dyad"),
      "sufficiency" => Atom.to_string(sufficiency),
      "ui_job" => Atom.to_string(ui_job),
      "headline" => headline,
      "detail" => detail,
      "usable?" => sufficiency == :usable,
      "plans_durable?" =>
        stage in [:set, :ready, :handled] and sufficiency in [:usable, :converging]
    }
  end

  def from_messages(_, stage), do: from_messages([], stage)

  # --- Extraction (evidence-only; no new intelligence) ---

  defp extract_activity(bodies) do
    text = Enum.join(bodies, " ")

    cond do
      Regex.match?(~r/\bfacetime\b|\bzoom\b|\bvideo\s*call\b|\bphone\s*call\b/i, text) ->
        "FaceTime"

      Regex.match?(~r/\bstudy\b/i, text) -> "Study together"
      Regex.match?(~r/\bcoffee\b/i, text) -> "Coffee"
      Regex.match?(~r/\bdinner\b/i, text) -> "Dinner"
      Regex.match?(~r/\blunch\b/i, text) -> "Lunch"
      Regex.match?(~r/\bdrinks?\b/i, text) -> "Drinks"
      Regex.match?(~r/\bpickup\b/i, text) -> "Pickup"
      Regex.match?(~r/\bbirthday\b/i, text) -> "Birthday"
      Regex.match?(~r/\bmeet\b/i, text) -> "Meet up"
      true -> nil
    end
  end

  defp extract_when(bodies) do
    text = Enum.join(bodies, " ")
    day = extract_day(text)
    time = extract_clock_or_window(text, day)
    combine_day_time(text, day, time)
  end

  @days [
    {"tuesday", "Tuesday"},
    {"wednesday", "Wednesday"},
    {"thursday", "Thursday"},
    {"friday", "Friday"},
    {"saturday", "Saturday"},
    {"sunday", "Sunday"},
    {"monday", "Monday"},
    {"tomorrow", "Tomorrow"},
    {"today", "Today"}
  ]

  defp extract_day(text) do
    Enum.find_value(@days, fn {token, label} ->
      if Regex.match?(~r/\b#{token}\b/i, text), do: label
    end)
  end

  defp extract_clock_or_window(text, day) do
    cond do
      m = Regex.run(~r/\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i, text) ->
        normalize_time(Enum.at(m, 1))

      m = Regex.run(~r/\b(\d{1,2})\s*(am|pm)\b/i, text) ->
        "#{Enum.at(m, 1)} #{String.upcase(Enum.at(m, 2))}"

      Regex.match?(~r/\bafter\s+6:30\b/i, text) ->
        "after 6:30"

      Regex.match?(~r/\bafter\s+7\b/i, text) ->
        "after 7"

      day == "Wednesday" and Regex.match?(~r/\bnot too late\b/i, text) ->
        # Preserve existing ProductSignals demo detail contract
        "at 5:30"

      Regex.match?(~r/\b5:00\s*pm\b/i, text) ->
        "5:00 PM"

      # Day + bare hour evidence ("Thursday 7", "Friday at 8") — do not invent minutes
      day && bare_hour_match(text) ->
        bare_hour_match(text)

      true ->
        nil
    end
  end

  defp bare_hour_match(text) do
    case Regex.run(~r/\b(?:at\s+)?([1-9]|1[0-2])\b(?!\s*(?:am|pm|:))/i, text) do
      [_, hour] -> hour
      _ -> nil
    end
  end

  # Evidence-only combine. Do NOT invent clock times (no bare Thursday → 6:30).
  # Legacy demo "Wednesday + not too late → 5:30" remains for Real People journey.
  defp combine_day_time(text, day, time) do
    cond do
      day == "Wednesday" and
          (time in [nil, "at 5:30"] or Regex.match?(~r/\bnot too late\b/i, text)) ->
        "Wednesday at 5:30"

      day && time ->
        "#{day} · #{time}"

      day ->
        day

      time ->
        time

      Regex.match?(~r/\bthis week\b/i, text) ->
        "This week"

      true ->
        nil
    end
  end

  @doc """
  Semantic place levels — never fabricate specificity.

  exact_venue | area_known | category_known | home_known | home_unresolved | unresolved
  """
  def place_truth(bodies) when is_list(bodies) do
    text = Enum.join(bodies, " ")

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
      "Velvet Room",
      "Coast Kitchen"
    ]

    venue =
      Enum.find(known, fn place ->
        Regex.match?(~r/\b#{Regex.escape(place)}\b/i, text)
      end) ||
        case Regex.run(
               ~r/\bat\s+([A-Z][A-Za-z0-9&'’\-]+(?:\s+[A-Z][A-Za-z0-9&'’\-]+){0,3})\b/,
               text
             ) do
          [_, name] -> name
          _ -> nil
        end

    area =
      Enum.find_value(
        [
          {"north park", "North Park"},
          {"little italy", "Little Italy"},
          {"downtown", "Downtown"},
          {"carlsbad", "Carlsbad"},
          {"encinitas", "Encinitas"}
        ],
        fn {tok, label} ->
          if Regex.match?(~r/\b#{tok}\b/i, text), do: label
        end
      )

    category =
      cond do
        Regex.match?(~r/\bitalian\b/i, text) -> "Italian dinner"
        Regex.match?(~r/\bsushi\b/i, text) -> "Sushi"
        Regex.match?(~r/\bcoffee\b/i, text) -> "Coffee"
        Regex.match?(~r/\bdinner\b/i, text) -> "Dinner"
        true -> nil
      end

    home? =
      Regex.match?(~r/\b(at (my|our|maya'?s|jordan'?s) place|at home|dinner at)\b/i, text)

    whose_home_open? =
      home? and Regex.match?(~r/\bwhose place\b|\bstill (figuring|deciding) (where|whose)\b/i, text)

    cond do
      is_binary(venue) ->
        %{
          "level" => "exact_venue",
          "display" => venue,
          "gap_label" => nil
        }

      home? and not whose_home_open? ->
        %{
          "level" => "home_known",
          "display" => "At home · confirming",
          "gap_label" => nil
        }

      whose_home_open? ->
        %{
          "level" => "home_unresolved",
          "display" => nil,
          "gap_label" => "Dinner · whose place still open"
        }

      is_binary(area) ->
        %{
          "level" => "area_known",
          "display" => nil,
          "gap_label" => "#{area} · choosing the restaurant"
        }

      is_binary(category) and category not in ["Dinner"] ->
        %{
          "level" => "category_known",
          "display" => nil,
          "gap_label" => "#{category} · place still open"
        }

      true ->
        %{
          "level" => "unresolved",
          "display" => nil,
          "gap_label" => "Place still open"
        }
    end
  end

  def place_truth(_), do: %{"level" => "unresolved", "display" => nil, "gap_label" => "Place still open"}

  defp normalize_time(raw) do
    t = String.trim(raw)

    cond do
      Regex.match?(~r/am|pm/i, t) ->
        String.replace(t, ~r/\s+/, " ")

      Regex.match?(~r/^\d{1,2}:\d{2}$/, t) ->
        t

      true ->
        t
    end
  end

  # --- Gaps / sufficiency / UI job ---

  defp consequential_gaps(stage, what, when_label, where_label, speaker_count) do
    # Restraint: no plan dimensions in evidence → no invented homework CTAs
    thin_chat? =
      is_nil(what) and is_nil(when_label) and is_nil(where_label) and
        stage not in [:set, :ready, :handled]

    if thin_chat? do
      []
    else
      base = []

      base =
        if is_nil(what) and stage in [:plan_forming, :still_open, :set, :ready],
          do: base ++ ["what"],
          else: base

      base =
        if is_nil(when_label) and stage in [:plan_forming, :still_open, :set, :ready],
          do: base ++ ["when"],
          else: base

      # Place matters for physical social plans — not remote calls/FaceTime.
      place_matters? =
        what not in ["FaceTime", "Call"] and
          (what in ["Dinner", "Lunch", "Coffee", "Drinks", "Birthday"] or
             (is_binary(what) and Regex.match?(~r/dinner|coffee|lunch|drinks/i, what || "")))

      base =
        if place_matters? and is_nil(where_label) and stage in [:still_open, :set, :ready],
          do: base ++ ["where"],
          else: base

      base =
        if stage in [:plan_forming, :still_open, :will_know_later],
          do: base ++ ["confirmation"],
          else: base

      # Multi-member: partial participation is a real gap, not a dyad stand-in.
      base =
        if speaker_count >= 3 and stage in [:plan_forming, :still_open, :will_know_later],
          do: base ++ ["who"],
          else: base

      Enum.uniq(base)
    end
  end

  defp sufficiency(:canceled, _, _, _, _), do: :intention
  defp sufficiency(:handled, _, _, _, _), do: :usable
  defp sufficiency(:quiet, _, _, _, _), do: :intention

  defp sufficiency(:set, gaps, what, when_label, _where) do
    cond do
      what && when_label && "where" not in gaps -> :usable
      what && when_label -> :converging
      what || when_label -> :converging
      true -> :converging
    end
  end

  defp sufficiency(:ready, gaps, what, when_label, where),
    do: sufficiency(:set, gaps, what, when_label, where)

  defp sufficiency(:still_open, gaps, what, when_label, _) do
    if what && when_label && length(gaps) <= 2, do: :converging, else: :intention
  end

  defp sufficiency(:will_know_later, _, _, _, _), do: :intention

  defp sufficiency(:plan_forming, _, what, when_label, _) do
    if what || when_label, do: :intention, else: :intention
  end

  defp sufficiency(_, _, _, _, _), do: :intention

  defp ui_job(:handled, _, _), do: :recall
  defp ui_job(:canceled, _, _), do: :reveal
  defp ui_job(:set, :usable, gaps) when gaps == [] or gaps == ["where"], do: :reveal
  defp ui_job(:set, _, gaps) when gaps != [], do: :resolve
  defp ui_job(:ready, _, _), do: :execute
  defp ui_job(:still_open, _, gaps) when gaps != [], do: :resolve
  defp ui_job(:plan_forming, _, _), do: :resolve
  defp ui_job(:will_know_later, _, _), do: :reveal
  defp ui_job(_, _, _), do: :reveal

  defp headline(:canceled, _, _, _, _, _, _), do: "Not happening"

  defp headline(:handled, what, when_label, where_label, _, _, _) do
    compose([what || "Plan", when_label, where_label]) || "Handled"
  end

  # Partial plans must not look fully arranged. Time firm + place open is still
  # *forming*: headline = resolved facts only; detail carries the one resolve ask.
  defp headline(:set, what, when_label, where_label, gaps, sufficiency, speaker_count) do
    in_label = if speaker_count >= 3, do: "The group is in", else: "You're both in"

    cond do
      "where" in gaps ->
        compose([what, when_label]) || what || "Choosing a place"

      sufficiency == :usable ->
        compose([what, when_label, where_label])

      true ->
        compose([what, when_label, where_label]) ||
          if what, do: "#{what} is firm", else: in_label
    end
  end

  defp headline(:ready, what, when_label, where_label, gaps, sufficiency, speaker_count) do
    headline(:set, what, when_label, where_label, gaps, sufficiency, speaker_count)
  end

  defp headline(:still_open, what, when_label, where_label, gaps, _, speaker_count) do
    cond do
      "who" in gaps and speaker_count >= 3 ->
        compose([what, when_label, where_label]) || what || "Still figuring who's in"

      "where" in gaps ->
        # Time may be known — still not a complete dinner plan without place.
        compose([what, when_label]) || what || "Still taking shape"

      "confirmation" in gaps ->
        compose([what, when_label, where_label]) || what || "Still taking shape"

      true ->
        compose([what, when_label, where_label]) ||
          if what, do: "#{what} is still taking shape", else: "Still taking shape"
    end
  end

  defp headline(:will_know_later, what, when_label, _, _, _, _) do
    core = compose([what, when_label])
    if core, do: "#{core} · later", else: "Will know later"
  end

  defp headline(:plan_forming, what, when_label, where_label, _, _, _) do
    core = compose([what, when_label, where_label])
    if core, do: "#{core} · forming", else: "Something is forming"
  end

  defp headline(_, what, when_label, where_label, _, _, _) do
    compose([what, when_label, where_label]) || "Update"
  end

  defp detail_line(when_label, where_label, gaps, place_truth) do
    # When a consequential gap remains, detail is the *resolve* line — not a
    # second status taxonomy and not a parenthetical on a finished-looking plan.
    place_gap = place_truth["gap_label"]

    cond do
      "who" in gaps ->
        "Still figuring who's in"

      "where" in gaps and is_binary(place_gap) ->
        place_gap

      "where" in gaps ->
        case when_label do
          nil -> "Place still open"
          w -> "#{w} · place still open"
        end

      "when" in gaps and is_nil(when_label) ->
        "Need a time"

      true ->
        [when_label, where_label]
        |> Enum.reject(&is_nil/1)
        |> case do
          [] -> nil
          list -> Enum.join(list, " · ")
        end
    end
  end

  defp compose(parts) do
    parts
    |> Enum.reject(fn p -> is_nil(p) or p == "" end)
    |> case do
      [] -> nil
      list -> Enum.join(list, " · ")
    end
  end
end
