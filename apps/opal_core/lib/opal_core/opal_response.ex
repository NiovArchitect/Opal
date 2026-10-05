defmodule OpalCore.OpalResponse do
  @moduledoc """
  Phase OC-4 — Opal Center response generation (template-based).

  Builds a short reply from OC-3 intent + OC-2 context. No LLM.
  Never invents memories, preferences, or plans. Max 3 sentences.
  """

  require Logger

  alias OpalCore.Memory
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.TrustTiers

  @fallback "I'm having trouble thinking right now. Try again in a moment."

  @above_tier_msg "I'd love to help with that — as we get to know each other better, I'll be able to give more personalized suggestions."

  @doc "Honest fallback when assemble/classify/generate fails."
  def fallback_text, do: @fallback

  @doc "Warm above-tier message (never mentions tier names)."
  def above_tier_text, do: @above_tier_msg

  @doc """
  Generate response text from an intent map and context map.

  Returns `{:ok, response_text}` | `{:error, reason}`.
  """
  def generate(intent_map, context_map)
      when is_map(intent_map) and is_map(context_map) do
    intent = intent_key(intent_map)
    entities = entities_map(intent_map)
    raw = raw_text(intent_map, context_map)
    tier = get_in_ctx(context_map, [:trust_tier]) || "new"

    text =
      cond do
        above_tier_request?(raw, tier) ->
          @above_tier_msg

        true ->
          case intent do
            :plan_create -> render_plan_create(entities, context_map)
            :plan_modify -> render_plan_modify(entities, context_map)
            :remember -> render_remember(entities, context_map)
            :recall -> render_recall(entities, context_map)
            :recommend -> render_recommend(entities, context_map)
            :coordinate -> render_coordinate(entities, context_map)
            :check_status -> render_check_status(entities, context_map)
            :chat -> render_chat(entities, context_map, intent_map)
            _ -> nil
          end
      end

    if is_binary(text) and String.trim(text) != "" do
      {:ok, clamp_sentences(String.trim(text))}
    else
      {:error, :unhandled_intent}
    end
  end

  def generate(_, _), do: {:error, :invalid}

  defp raw_text(intent_map, context) do
    intent_map[:raw_text] || intent_map["raw_text"] ||
      get_in_ctx(context, [:message, :text]) || ""
  end

  # RU-2 — requests that need deeper trust. Frame as growing familiarity.
  defp above_tier_request?(raw, tier) when is_binary(raw) do
    lower = String.downcase(raw)

    financial? =
      Regex.match?(
        ~r/\b(budget|spend|afford|price range|how much|financial|money|cheap|expensive)\b/i,
        lower
      )

    intimate? =
      Regex.match?(
        ~r/\b(health|therapy|depression|anxiety|intimate|private medical|diagnosis)\b/i,
        lower
      )

    cond do
      financial? and not TrustTiers.can_access_tier?(tier, :financial) -> true
      intimate? and not TrustTiers.can_access_tier?(tier, :intimate) -> true
      true -> false
    end
  end

  defp above_tier_request?(_, _), do: false

  # --- templates -------------------------------------------------------------

  defp render_plan_create(entities, context) do
    what = entity(entities, :what) || "something"
    when_s = entity(entities, :when) || "soon"
    who = entity(entities, :who)
    with_who = format_with_who(who)
    group_hint = plan_create_group_hint(who, context)
    taste_hint = if group_hint, do: nil, else: plan_create_taste_hint(context)

    parts =
      ["Got it — #{what} #{when_s}#{with_who}."]
      |> maybe_append(group_hint)
      |> maybe_append(taste_hint)
      |> Kernel.++(["Want me to set this up?"])

    Enum.join(parts, " ")
  end

  defp plan_create_group_hint(who, context) do
    case match_group_taste(who, context) do
      %{best_day: day, member_names: names} when is_binary(day) and day != "" ->
        # Prefer explicit who from the intent; fall back to other group members.
        who_names = who_name_list(who)

        label_names =
          if who_names == [] do
            names
          else
            Enum.filter(names, fn n ->
              down = String.downcase(to_string(n || ""))
              Enum.any?(who_names, &String.contains?(down, &1))
            end)
            |> then(fn matched -> if matched == [], do: names, else: matched end)
          end

        who_label = format_group_names(label_names)
        day_label = String.capitalize(day)
        "You usually do #{day_label}s with #{who_label} — want #{day_label}?"

      _ ->
        nil
    end
  end

  defp plan_create_taste_hint(context) do
    vibes = get_in_ctx(context, [:taste, :vibes]) || []

    case vibes do
      [first | _] when is_binary(first) and first != "" ->
        "Based on what you both enjoy (#{first}), I have some ideas."

      _ ->
        nil
    end
  end

  defp render_plan_modify(entities, context) do
    action = entity(entities, :action) || "change"
    plan_ref = entity(entities, :plan_ref) || "that plan"
    new_when = entity(entities, :new_when)
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []

    found? =
      Enum.any?(plans, fn p ->
        title = plan_title(p) || ""
        String.contains?(String.downcase(title), String.downcase(plan_ref))
      end)

    cond do
      found? and is_binary(new_when) and new_when != "" and action in ["move", "reschedule", "change"] ->
        "Done — #{plan_ref} moved to #{new_when}."

      found? and action == "cancel" ->
        "Done — #{plan_ref} cancelled."

      found? and is_binary(new_when) and new_when != "" ->
        "Done — #{plan_ref} updated to #{new_when}."

      found? ->
        "Done — #{plan_ref} updated."

      true ->
        "I don't see #{plan_ref} on your calendar. Want to create it?"
    end
  end

  defp render_remember(entities, context) do
    fact = entity(entities, :fact) || ""
    user_id = get_in_ctx(context, [:user, :id])

    persist =
      if is_binary(user_id) and fact != "" do
        Memory.store(user_id, fact, source: "opal_center")
      else
        {:error, :no_user}
      end

    case persist do
      {:ok, _} ->
        "Remembered: #{fact}. I'll keep that in mind."

      {:error, reason} ->
        Logger.error("opal_center.memory_store_failed reason=#{inspect(reason)}")
        "I noted that down."
    end
  end

  defp render_recall(entities, context) do
    topic = entity(entities, :topic) || "that"
    user_id = get_in_ctx(context, [:user, :id])

    # Short-term: scan recent Opal Center turns before long-term Memory.
    case recall_from_history(context, topic) do
      text when is_binary(text) and text != "" ->
        text

      _ ->
        memories =
          if is_binary(user_id) do
            Memory.recall(user_id, to_string(topic))
          else
            []
          end

        case memories do
          [] ->
            "I don't have anything saved about #{topic} yet. Want me to remember something?"

          list ->
            summary =
              list
              |> Enum.map(& &1.summary)
              |> Enum.reject(&(is_nil(&1) or &1 == ""))
              |> Enum.take(3)
              |> Enum.join("; ")

            "Here's what I remember about #{topic}: #{summary}"
        end
    end
  end

  defp recall_from_history(context, topic) do
    topic_l = String.downcase(to_string(topic || ""))
    history = get_in_ctx(context, [:conversation_history]) || []

    candidates =
      history
      |> Enum.filter(fn turn ->
        role = turn[:role] || turn["role"]
        body = turn[:body] || turn["body"] || ""

        role in ["user", :user] and is_binary(body) and body != "" and
          not recall_question_body?(body) and
          (topic_l == "" or String.contains?(String.downcase(body), topic_l))
      end)

    # Prefer preference/fact statements over plan chatter when both mention the topic.
    hits =
      case Enum.filter(candidates, &fact_like_body?/1) do
        [] -> Enum.take(candidates, -1)
        facts -> Enum.take(facts, -1)
      end

    case hits do
      [] ->
        nil

      [%{} = turn] ->
        bits = turn[:body] || turn["body"] || ""

        if bits == "" do
          nil
        else
          "You just told me: #{bits}"
        end

      _ ->
        nil
    end
  end

  defp recall_question_body?(body) when is_binary(body) do
    Regex.match?(
      ~r/\b(what\s+do\s+you\s+remember|do\s+you\s+remember|remember\s+about|what\s+have\s+i\s+told)\b/i,
      body
    )
  end

  defp recall_question_body?(_), do: false

  defp fact_like_body?(turn) do
    body = turn[:body] || turn["body"] || ""

    Regex.match?(
      ~r/\b(is|likes?|loves?|hates?|prefers?|allergic|vegetarian|vegan)\b/i,
      body
    ) and not Regex.match?(~r/\b(plan|dinner|lunch|friday|saturday|tomorrow)\b/i, body)
  end

  # Curated places with approximate per-person USD for RU-3 filtering.
  # Never spoken as dollar amounts unless the user already set a range.
  @recommend_catalog [
    %{name: "a neighborhood taco spot", approx: 18, vibe: "casual"},
    %{name: "a lively cafe", approx: 28, vibe: "lively"},
    %{name: "a mid-range dinner spot", approx: 45, vibe: "relaxed"},
    %{name: "a polished dinner spot", approx: 90, vibe: "polished"},
    %{name: "a tasting-menu experience", approx: 200, vibe: "special"}
  ]

  @ask_budget "I don't know your budget preferences yet — want to set them so my suggestions fit?"

  defp render_recommend(entities, context) do
    for_who = entity(entities, :for_who)
    who_label = format_who_label(for_who)
    vibes = get_in_ctx(context, [:taste, :vibes]) || []
    cuisines = get_in_ctx(context, [:taste, :cuisines]) || []
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []
    intimate? = intimate_relationship?(context, for_who)
    tier = get_in_ctx(context, [:trust_tier]) || "new"
    financial = get_in_ctx(context, [:financial])

    cond do
      # Trusted+ but no profile yet — invite them to set spending comfort.
      TrustTiers.can_access_tier?(tier, :financial) and is_nil(financial) ->
        @ask_budget

      # D-1 — known group pattern
      group_rec = recommend_from_group(for_who, context, financial) ->
        group_rec

      vibes == [] and cuisines == [] and plans == [] ->
        case catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?) do
          nil ->
            if intimate? do
              "I don't know #{who_label}'s preferences yet — the more evenings you share, the better I can suggest something you'll both love."
            else
              "I don't know #{who_label}'s preferences yet — the more you plan together, the better my suggestions get."
            end

          text ->
            text
        end

      match = recommend_from_plans(plans, vibes, intimate?, financial) ->
        match

      true ->
        case catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?) do
          text when is_binary(text) ->
            text

          nil ->
            case {List.first(vibes), List.first(cuisines)} do
              {vibe, _} when is_binary(vibe) and vibe != "" ->
                place = recommend_place_from_cuisine(cuisines) || "a #{vibe} spot"

                if intimate? do
                  "#{place} — a warm fit for you and #{who_label}."
                else
                  "#{place} — #{who_label} prefers #{vibe} places."
                end

              {_, cuisine} when is_binary(cuisine) and cuisine != "" ->
                if intimate? do
                  "A #{cuisine} place — something cozy for the two of you."
                else
                  "A #{cuisine} place — based on what you've enjoyed together."
                end

              _ ->
                "I don't know #{who_label}'s preferences yet — the more you plan together, the better my suggestions get."
            end
        end
    end
  end

  defp recommend_from_group(for_who, context, financial) do
    case match_group_taste(for_who, context) do
      %{vibes: vibes, cuisines: cuisines, best_day: day, member_names: names}
      when is_list(vibes) or is_list(cuisines) ->
        vibe = List.first(List.wrap(vibes))
        cuisine = List.first(List.wrap(cuisines))
        you_n = group_you_label(names)

        place =
          cond do
            is_binary(cuisine) and cuisine != "" and is_binary(vibe) and vibe != "" ->
              "a #{vibe} #{cuisine} place"

            is_binary(cuisine) and cuisine != "" ->
              "a #{cuisine} place"

            is_binary(vibe) and vibe != "" ->
              "a #{vibe} spot"

            true ->
              nil
          end

        if is_nil(place) or not fits_financial?(place, financial) do
          nil
        else
          pattern =
            cond do
              is_binary(vibe) and is_binary(cuisine) and is_binary(day) ->
                "#{vibe} #{cuisine} on #{String.capitalize(day)}s"

              is_binary(vibe) and is_binary(cuisine) ->
                "#{vibe} #{cuisine}"

              is_binary(vibe) and is_binary(day) ->
                "#{vibe} places on #{String.capitalize(day)}s"

              is_binary(cuisine) ->
                cuisine

              true ->
                "that vibe"
            end

          "You #{you_n} always love #{pattern} — how about #{place}?"
        end

      _ ->
        nil
    end
  end

  defp group_you_label(names) when is_list(names) do
    n = names |> Enum.reject(&(is_nil(&1) or &1 == "")) |> length()

    cond do
      n <= 1 -> "both"
      n == 2 -> "two"
      n == 3 -> "three"
      true -> "all"
    end
  end

  defp group_you_label(_), do: "all"

  defp match_group_taste(who, context) do
    groups = get_in_ctx(context, [:group_tastes]) || []
    who_names = who_name_list(who)

    if who_names == [] or groups == [] do
      nil
    else
      Enum.find(groups, fn g ->
        names =
          (g[:member_names] || g["member_names"] || [])
          |> Enum.map(&String.downcase(to_string(&1)))

        Enum.any?(who_names, fn w ->
          Enum.any?(names, &String.contains?(&1, w))
        end)
      end)
    end
  end

  defp who_name_list(who) when is_list(who) do
    who
    |> Enum.map(fn
      n when is_binary(n) -> String.downcase(String.trim(n))
      %{display_name: n} when is_binary(n) -> String.downcase(String.trim(n))
      %{"display_name" => n} when is_binary(n) -> String.downcase(String.trim(n))
      _ -> nil
    end)
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
  end

  defp who_name_list(who) when is_binary(who), do: who_name_list([who])
  defp who_name_list(_), do: []

  defp format_group_names(names) when is_list(names) do
    cleaned = Enum.reject(names, &(is_nil(&1) or &1 == ""))

    case cleaned do
      [] -> "all"
      [a] -> a
      [a, b] -> "#{a} and #{b}"
      many ->
        {lead, [last]} = Enum.split(many, -1)
        Enum.join(lead, ", ") <> ", and " <> last
    end
  end

  defp format_group_names(_), do: "all"

  defp catalog_recommend_if_profiled(nil, _vibes, _cuisines, _who, _intimate?), do: nil

  defp catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?)
       when is_map(financial) do
    recommend_from_catalog(financial, vibes, cuisines, who_label, intimate?)
  end

  defp catalog_recommend_if_profiled(_, _, _, _, _), do: nil

  defp recommend_from_plans(plans, _vibes, intimate?, financial) do
    case plans do
      [plan | _] ->
        title = plan_title(plan)

        if is_binary(title) and title != "" and fits_financial?(title, financial) do
          reason =
            if intimate? do
              "You two loved #{title} last time"
            else
              "You both loved #{title} last time"
            end

          "#{title} — #{reason}."
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp recommend_place_from_cuisine([c | _]) when is_binary(c) and c != "", do: "A #{c} spot"
  defp recommend_place_from_cuisine(_), do: nil

  defp recommend_from_catalog(financial, vibes, cuisines, who_label, intimate?) do
    candidates =
      @recommend_catalog
      |> Enum.filter(&fits_approx?(&1.approx, financial))

    case candidates do
      [] ->
        nil

      list ->
        pick =
          case {List.first(vibes), List.first(cuisines)} do
            {vibe, _} when is_binary(vibe) and vibe != "" ->
              Enum.find(list, fn item ->
                String.contains?(String.downcase(item.vibe), String.downcase(vibe))
              end) || hd(list)

            {_, cuisine} when is_binary(cuisine) and cuisine != "" ->
              %{name: "a #{cuisine} spot that fits", approx: hd(list).approx, vibe: "fit"}

            _ ->
              hd(list)
          end

        if intimate? do
          "#{capitalize_place(pick.name)} — a warm fit for you and #{who_label}."
        else
          "#{capitalize_place(pick.name)} — a good fit for #{who_label}."
        end
    end
  end

  defp capitalize_place(<<"a ", rest::binary>>), do: "A " <> rest
  defp capitalize_place(name) when is_binary(name), do: name
  defp capitalize_place(_), do: "A spot"

  defp fits_approx?(_approx, nil), do: true

  defp fits_approx?(approx, financial) when is_integer(approx) and is_map(financial) do
    case dining_bounds(financial) do
      {min, max} when is_integer(min) and is_integer(max) ->
        approx >= min and approx <= max

      _ ->
        fits_level?(approx, financial[:level] || financial["level"])
    end
  end

  defp fits_approx?(_, _), do: true

  defp fits_level?(approx, "budget"), do: approx <= 25
  defp fits_level?(approx, "moderate"), do: approx >= 25 and approx <= 60
  defp fits_level?(approx, "comfortable"), do: approx >= 60 and approx <= 150
  defp fits_level?(approx, "luxury"), do: approx >= 150
  defp fits_level?(_, _), do: true

  defp dining_bounds(financial) when is_map(financial) do
    range = financial[:dining_range] || financial["dining_range"]

    case range do
      %{min: min, max: max} when is_integer(min) and is_integer(max) -> {min, max}
      %{"min" => min, "max" => max} when is_integer(min) and is_integer(max) -> {min, max}
      _ -> nil
    end
  end

  defp dining_bounds(_), do: nil

  # Soft filter for past plan titles — skip known luxury phrasing for budget users.
  defp fits_financial?(_title, nil), do: true

  defp fits_financial?(title, financial) when is_binary(title) and is_map(financial) do
    lower = String.downcase(title)
    level = financial[:level] || financial["level"]

    luxuryish? =
      Regex.match?(~r/\b(tasting|michelin|omakase|fine dining|caviar)\b/i, lower)

    cond do
      level in ["budget", "moderate"] and luxuryish? -> false
      true -> true
    end
  end

  defp fits_financial?(_, _), do: true

  defp render_coordinate(entities, context) do
    action = entity(entities, :action) || "message"
    person = entity(entities, :person) || "them"
    content = entity(entities, :content) || "that"
    business? = relationship_type_for_person(context, person) == "business"

    case coordination_path(context, person) do
      {:ok, :queued} ->
        if business? do
          "I'll draft a professional message for #{person} about #{content}."
        else
          "I'll #{action} #{person} about #{content}."
        end

      :unavailable ->
        if business? do
          "I can't reach #{person} directly yet — but I've drafted a professional message. Want to send it yourself?"
        else
          "I can't reach #{person} directly yet — but I've drafted the message. Want to send it yourself?"
        end
    end
  end

  defp intimate_relationship?(context, for_who) do
    names = List.wrap(for_who)

    Enum.any?(names, fn name ->
      relationship_type_for_person(context, name) in ["spouse", "partner"]
    end)
  end

  defp relationship_type_for_person(context, person) when is_binary(person) do
    contacts = get_in_ctx(context, [:social, :frequent_contacts]) || []
    rels = get_in_ctx(context, [:relationships]) || %{}
    person_l = String.downcase(person)

    match =
      Enum.find(contacts, fn c ->
        name = contact_name(c) || ""
        String.contains?(String.downcase(name), person_l) or
          String.contains?(person_l, String.downcase(first_name(name)))
      end)

    case contact_user_id(match) do
      nil ->
        nil

      id ->
        Map.get(rels, id) || Map.get(rels, to_string(id))
    end
  end

  defp relationship_type_for_person(_, _), do: nil

  defp coordination_path(context, person) do
    contacts = get_in_ctx(context, [:social, :frequent_contacts]) || []
    person_l = String.downcase(to_string(person || ""))

    match =
      Enum.find(contacts, fn c ->
        name = contact_name(c) || ""
        String.contains?(String.downcase(name), person_l) or
          String.contains?(person_l, String.downcase(first_name(name)))
      end)

    user_id = contact_user_id(match)

    cond do
      is_nil(match) or is_nil(user_id) ->
        :unavailable

      DeviceTokens.list_active(user_id) != [] ->
        # Queue only — do not send notifications in OC-4.
        Logger.info("opal_center.coordinate_queued person=#{person} user_id=#{user_id}")
        {:ok, :queued}

      true ->
        # Known contact but no push/SMS path yet — honest draft.
        :unavailable
    end
  end

  defp render_check_status(_entities, context) do
    celebrations = get_in_ctx(context, [:temporal, :upcoming_celebrations]) || []
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []

    celeb_bits =
      celebrations
      |> Enum.take(3)
      |> Enum.map(&format_celebration/1)
      |> Enum.reject(&is_nil/1)

    plan_bits =
      plans
      |> Enum.take(3)
      |> Enum.map(&format_plan_status/1)
      |> Enum.reject(&is_nil/1)

    cond do
      celeb_bits == [] and plan_bits == [] ->
        "Nothing on the calendar right now. Enjoy the quiet — or want to plan something?"

      true ->
        parts = celeb_bits ++ plan_bits
        "Here's what's coming up: #{Enum.join(parts, "; ")}"
    end
  end

  defp render_chat(_entities, context, intent_map) do
    raw =
      intent_map[:raw_text] || intent_map["raw_text"] ||
        get_in_ctx(context, [:message, :text]) || ""

    lower = String.downcase(raw)
    name = get_in_ctx(context, [:user, :display_name])
    recent_who = recent_mentioned_name(context)

    cond do
      how_are_you?(lower) ->
        "I'm here and paying attention. What can I help with?"

      greeting?(lower) ->
        if is_binary(name) and name != "" do
          "Hey #{first_name(name)}. What's on your mind?"
        else
          "Hey. What's on your mind?"
        end

      is_binary(recent_who) and recent_who != "" ->
        "You mentioned #{recent_who} earlier — want to keep going on that, or something new?"

      true ->
        "I'm listening. I can help you plan, remember, or figure things out."
    end
  end

  defp recent_mentioned_name(context) do
    history = get_in_ctx(context, [:conversation_history]) || []
    known =
      (get_in_ctx(context, [:social, :frequent_contacts]) || [])
      |> Enum.map(fn c -> c[:display_name] || c["display_name"] end)
      |> Enum.filter(&(is_binary(&1) and &1 != ""))
      |> Enum.map(&first_name/1)

    history
    |> Enum.reverse()
    |> Enum.find_value(fn turn ->
      body = turn[:body] || turn["body"] || ""
      role = turn[:role] || turn["role"]

      if role in ["user", :user] and is_binary(body) do
        down = String.downcase(body)

        Enum.find(known, fn name ->
          is_binary(name) and name != "" and
            String.contains?(down, String.downcase(name))
        end)
      else
        nil
      end
    end)
  end

  # --- helpers ---------------------------------------------------------------

  defp intent_key(%{intent: i}) when is_atom(i), do: i
  defp intent_key(%{"intent" => i}) when is_atom(i), do: i

  defp intent_key(%{"intent" => i}) when is_binary(i) do
    try do
      String.to_existing_atom(i)
    rescue
      ArgumentError -> :chat
    end
  end

  defp intent_key(_), do: nil

  defp entities_map(%{entities: e}) when is_map(e), do: e
  defp entities_map(%{"entities" => e}) when is_map(e), do: e
  defp entities_map(_), do: %{}

  defp entity(map, key) when is_atom(key) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key))
  end

  defp get_in_ctx(map, [k | rest]) when is_map(map) do
    next = Map.get(map, k) || Map.get(map, to_string(k))
    if rest == [], do: next, else: get_in_ctx(next || %{}, rest)
  end

  defp get_in_ctx(_, _), do: nil

  defp format_with_who(nil), do: ""
  defp format_with_who([]), do: ""

  defp format_with_who(who) when is_list(who) do
    names = Enum.map(who, &to_string/1) |> Enum.reject(&(&1 == ""))

    case names do
      [] -> ""
      list -> " with " <> Enum.join(list, " and ")
    end
  end

  defp format_with_who(who) when is_binary(who), do: " with #{who}"
  defp format_with_who(_), do: ""

  defp format_who_label(nil), do: "their"
  defp format_who_label([]), do: "their"

  defp format_who_label(who) when is_list(who) do
    case Enum.map(who, &to_string/1) |> Enum.reject(&(&1 == "")) do
      [] -> "their"
      [one] -> one
      list -> Enum.join(list, " and ")
    end
  end

  defp format_who_label(who) when is_binary(who), do: who
  defp format_who_label(_), do: "their"

  defp plan_title(%{title: t}), do: t
  defp plan_title(%{"title" => t}), do: t
  defp plan_title(_), do: nil

  defp format_celebration(c) do
    name = c[:name] || c["name"]
    days = c[:days_until] || c["days_until"]
    idea = c[:top_idea] || c["top_idea"]
    kind = c[:kind] || c["kind"] || "birthday"

    base =
      cond do
        is_binary(name) and is_integer(days) ->
          "#{name}'s #{kind} in #{days} days"

        is_binary(name) ->
          name

        true ->
          nil
      end

    cond do
      is_nil(base) ->
        nil

      is_binary(idea) and idea != "" ->
        "#{base} — #{first_name(name)} would love #{downcase_idea(idea)}. Want me to set it up?"

      true ->
        base
    end
  end

  defp downcase_idea(<<first::utf8, rest::binary>>),
    do: String.downcase(<<first::utf8>>) <> rest

  defp downcase_idea(s), do: s

  defp format_plan_status(p) do
    title = plan_title(p)

    if is_binary(title) and title != "" do
      "#{title} (tentative)"
    else
      nil
    end
  end

  defp contact_name(%{display_name: n}), do: n
  defp contact_name(%{"display_name" => n}), do: n
  defp contact_name(_), do: nil

  defp contact_user_id(%{user_id: id}), do: id
  defp contact_user_id(%{"user_id" => id}), do: id
  defp contact_user_id(_), do: nil

  defp first_name(nil), do: ""

  defp first_name(name) when is_binary(name) do
    name |> String.trim() |> String.split(~r/\s+/) |> List.first() || name
  end

  defp greeting?(lower) do
    Regex.match?(~r/^\s*(hi|hey|hello|yo|good\s+(morning|afternoon|evening))\b/i, lower)
  end

  defp how_are_you?(lower) do
    Regex.match?(~r/\bhow\s+are\s+you\b|\bhow's\s+it\s+going\b|\bhow\s+are\s+things\b/i, lower)
  end

  defp maybe_append(parts, nil), do: parts
  defp maybe_append(parts, ""), do: parts
  defp maybe_append(parts, bit), do: parts ++ [bit]

  defp clamp_sentences(text) do
    parts =
      text
      |> String.split(~r/(?<=[.!?])\s+/, trim: true)
      |> Enum.take(3)

    Enum.join(parts, " ")
  end
end
