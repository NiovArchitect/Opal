defmodule OpalCore.OpalIntent do
  @moduledoc """
  Phase OC-3 — Opal Center intent taxonomy (rule-based).

  Classifies exactly one intent from message text + OC-2 context.
  Includes `:plan_confirm` when the user affirms a pending plan_create ask.
  No ML/LLM. No response generation (OC-4). Empty entities when none extracted.
  """

  @intents [
    :plan_create,
    :plan_confirm,
    :plan_modify,
    :remember,
    :recall,
    :recommend,
    :coordinate,
    :check_status,
    :chat
  ]

  @intent_keys ~w(intent confidence entities raw_text)a

  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)
  @relative_when ~w(today tomorrow tonight weekend)

  @doc """
  Classify `message_text` given an OC-2 `context` map.

  Returns `{:ok, intent_map}` with exact keys:
  `:intent`, `:confidence`, `:entities`, `:raw_text`.
  """
  def classify(message_text, context)
      when is_binary(message_text) and is_map(context) do
    text = String.trim(message_text)

    if text == "" do
      {:error, :empty_text}
    else
      known_names = known_contact_names(context)
      normalized = normalize(text)

      # Affirmation of a pending "Want me to set this up?" must win before chat.
      result =
        case try_plan_confirm(normalized, context) do
          %{confidence: conf} = hit when conf in [:high, :medium] ->
            hit

          _ ->
            [
              &try_plan_create/2,
              &try_plan_modify/2,
              # Recall before remember so "what do you remember about X" is not stored.
              &try_recall/2,
              &try_remember/2,
              &try_recommend/2,
              &try_coordinate/2,
              &try_check_status/2
            ]
            |> Enum.find_value(fn try_fn ->
              case try_fn.(normalized, known_names) do
                %{confidence: conf} = hit when conf in [:high, :medium] -> hit
                _ -> nil
              end
            end)
        end

      intent_map =
        case result do
          %{intent: intent, confidence: conf, entities: ents}
          when intent in @intents ->
            %{
              intent: intent,
              confidence: conf,
              entities: ents || %{},
              raw_text: text
            }

          _ ->
            %{
              intent: :chat,
              confidence: :high,
              entities: %{},
              raw_text: text
            }
        end

      {:ok, intent_map}
    end
  end

  def classify(_, _), do: {:error, :invalid}

  def intents, do: @intents
  def intent_keys, do: @intent_keys

  # --- classifiers ------------------------------------------------------------

  @affirmations ~r/^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|all\s+right|please|do\s+it|go\s+ahead|sounds\s+good|let'?s\s+do\s+it)\s*[.!?]?\s*$/i

  defp try_plan_confirm(%{original: original} = _norm, context) do
    if Regex.match?(@affirmations, original || "") do
      case pending_plan_create(context) do
        %{what: _, when: _, who: _} = ents ->
          %{intent: :plan_confirm, confidence: :high, entities: ents}

        %{what: _} = ents ->
          %{intent: :plan_confirm, confidence: :high, entities: ents}

        _ ->
          nil
      end
    else
      nil
    end
  end

  defp try_plan_confirm(_, _), do: nil

  defp pending_plan_create(context) when is_map(context) do
    history = context[:conversation_history] || context["conversation_history"] || []

    history
    |> Enum.reverse()
    |> Enum.find_value(fn turn ->
      role = turn[:role] || turn["role"]
      body = turn[:body] || turn["body"] || ""
      intent = turn[:intent] || turn["intent"]

      cond do
        role in ["opal", :opal] and pending_setup_ask?(body, intent) ->
          entities_from_pending(intent, body)

        true ->
          nil
      end
    end)
  end

  defp pending_plan_create(_), do: nil

  defp pending_setup_ask?(body, intent) when is_binary(body) do
    intent_name = intent_name(intent)

    String.contains?(String.downcase(body), "want me to set this up") or
      intent_name in ["plan_create", :plan_create]
  end

  defp pending_setup_ask?(_, _), do: false

  defp intent_name(%{intent: i}), do: i
  defp intent_name(%{"intent" => i}), do: i
  defp intent_name(_), do: nil

  defp entities_from_pending(intent, body) when is_map(intent) do
    ents = intent[:entities] || intent["entities"] || %{}

    what = ents[:what] || ents["what"]
    when_s = ents[:when] || ents["when"]
    who = ents[:who] || ents["who"]

    if is_binary(what) and what != "" do
      %{what: what, when: when_s, who: who}
    else
      # Recover from the prior Opal ask body when entities were thin.
      recover_entities_from_ask(body)
    end
  end

  defp entities_from_pending(_, body), do: recover_entities_from_ask(body)

  defp recover_entities_from_ask(body) when is_binary(body) do
    # "Got it — dinner Friday with Maya. Want me to set this up?"
    case Regex.run(
           ~r/Got it\s*[—-]\s*(.+?)(?:\.|\s+Want me to set this up)/i,
           body
         ) do
      [_, middle] ->
        middle = String.trim(middle)
        when_s = extract_when(%{original: middle, lower: String.downcase(middle)})
        who = extract_who_loose(middle)
        what = strip_when_who(middle, when_s, who)

        if is_binary(what) and what != "" do
          %{what: what, when: when_s, who: who}
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp recover_entities_from_ask(_), do: nil

  defp extract_who_loose(text) when is_binary(text) do
    case Regex.run(~r/\bwith\s+([A-Z][a-zA-Z']+(?:\s+and\s+[A-Z][a-zA-Z']+)*)/, text) do
      [_, names] ->
        names
        |> String.split(~r/\s+and\s+/i)
        |> Enum.map(&String.trim/1)
        |> Enum.reject(&(&1 == ""))

      _ ->
        nil
    end
  end

  defp extract_who_loose(_), do: nil

  defp strip_when_who(text, when_s, who) do
    text
    |> then(fn t ->
      if is_binary(when_s) and when_s != "",
        do: String.replace(t, ~r/\b#{Regex.escape(when_s)}\b/i, ""),
        else: t
    end)
    |> then(fn t ->
      case who do
        list when is_list(list) and list != [] ->
          Enum.reduce(list, t, fn name, acc ->
            String.replace(acc, ~r/\bwith\s+#{Regex.escape(name)}\b/i, "")
          end)

        _ ->
          t
      end
    end)
    |> String.replace(~r/\s+/, " ")
    |> String.trim(" .,—-")
  end

  defp try_plan_create(norm, names) do
    cond do
      match_phrase?(norm, ~r/\b(set\s+up|organize|arrange|plan)\b/i) ->
        what = extract_what(norm, ~r/\b(?:set\s+up|organize|arrange|plan)\b/i)
        when_s = extract_when(norm)
        who = extract_who(norm, names)

        entities = %{
          what: what,
          when: when_s,
          who: who
        }

        conf =
          cond do
            is_binary(what) and what != "" and (who != nil or when_s != nil) -> :high
            is_binary(what) and what != "" -> :high
            true -> :medium
          end

        %{intent: :plan_create, confidence: conf, entities: entities}

      true ->
        nil
    end
  end

  defp try_plan_modify(norm, _names) do
    action =
      cond do
        match_phrase?(norm, ~r/\breschedule\b/i) -> "reschedule"
        match_phrase?(norm, ~r/\bcancel\b/i) -> "cancel"
        match_phrase?(norm, ~r/\bmove\b/i) -> "move"
        match_phrase?(norm, ~r/\bchange\b/i) -> "change"
        true -> nil
      end

    if is_nil(action) do
      nil
    else
      plan_ref = extract_plan_ref(norm, action)
      new_when = extract_when(norm)

      conf =
        if is_binary(plan_ref) and plan_ref != "" do
          :high
        else
          :medium
        end

      %{
        intent: :plan_modify,
        confidence: conf,
        entities: %{action: action, plan_ref: plan_ref || "", new_when: new_when}
      }
    end
  end

  defp try_remember(norm, _names) do
    # Interrogative "remember" belongs to recall (handled earlier).
    if recall_question?(norm) do
      nil
    else
      cond do
        match_phrase?(norm, ~r/\bdon't\s+forget\b/i) ->
          fact = capture_after(norm, ~r/\bdon't\s+forget\b(?:\s+to)?\s*/i)
          remember_hit(fact)

        match_phrase?(norm, ~r/\bnote\s+that\b/i) ->
          fact = capture_after(norm, ~r/\bnote\s+that\b\s*/i)
          remember_hit(fact)

        match_phrase?(norm, ~r/\bremember\b/i) ->
          fact = capture_after(norm, ~r/\bremember\b(?:\s+that)?\s*/i)
          remember_hit(fact)

        match_phrase?(norm, ~r/\bsave\b/i) and
            match_phrase?(norm, ~r/\b(that|this|note|fact|preference)\b/i) ->
          fact = capture_after(norm, ~r/\bsave\b(?:\s+that)?\s*/i)
          remember_hit(fact)

        match_phrase?(norm, ~r/\bsave\b/i) ->
          fact = capture_after(norm, ~r/\bsave\b\s*/i)

          if is_binary(fact) and fact != "" do
            remember_hit(fact)
          else
            nil
          end

        # Plain preference facts: "Maya is vegetarian", "Jordan is allergic to shellfish"
        preference_fact?(norm) ->
          remember_hit(norm.original)

        true ->
          nil
      end
    end
  end

  defp preference_fact?(%{lower: lower}) do
    Regex.match?(
      ~r/\b[a-z][a-z']+\s+is\s+(a\s+)?(vegetarian|vegan|pescatarian|allergic|gluten[\s-]?free|dairy[\s-]?free|lactose\s+intolerant)\b/i,
      lower
    )
  end

  defp preference_fact?(_), do: false

  defp remember_hit(fact) do
    cleaned = fact |> to_string() |> String.trim() |> strip_trailing_punct()

    conf = if cleaned != "", do: :high, else: :medium

    %{
      intent: :remember,
      confidence: conf,
      entities: %{fact: cleaned}
    }
  end

  defp try_recall(norm, _names) do
    # Explicit memory questions, or WH + past cue (avoid status/recommend collide).
    wh? = match_phrase?(norm, ~r/\b(what|when|where|who|how)\b/i)

    past? =
      match_phrase?(
        norm,
        ~r/\b(did|was|were|have\s+we|last|ago|previous|before|earlier|happened)\b/i
      )

    if recall_question?(norm) or (wh? and past?) do
      topic = extract_recall_topic(norm)
      question = norm.original

      conf = if topic, do: :high, else: :medium

      %{
        intent: :recall,
        confidence: conf,
        entities: %{question: question, topic: topic}
      }
    else
      nil
    end
  end

  defp recall_question?(norm) do
    match_phrase?(norm, ~r/\bwhat\s+do\s+you\s+remember\b/i) or
      match_phrase?(norm, ~r/\bdo\s+you\s+remember\b/i) or
      match_phrase?(norm, ~r/\bremember\s+about\b/i) or
      match_phrase?(norm, ~r/\bwhat\s+have\s+i\s+told\s+you\b/i)
  end

  defp try_recommend(norm, names) do
    hit? =
      match_phrase?(norm, ~r/\b(suggest|recommend)\b/i) or
        match_phrase?(norm, ~r/\bwhere\s+should\b/i) or
        match_phrase?(norm, ~r/\bwhat\s+should\b/i) or
        match_phrase?(norm, ~r/\bideas?\s+for\b/i)

    if hit? do
      category = extract_recommend_category(norm)
      for_who = extract_who(norm, names)
      when_s = extract_when(norm)

      conf =
        cond do
          category != nil or for_who != nil -> :high
          true -> :medium
        end

      %{
        intent: :recommend,
        confidence: conf,
        entities: %{category: category, for_who: for_who, when: when_s}
      }
    else
      nil
    end
  end

  defp try_coordinate(norm, names) do
    action =
      cond do
        match_phrase?(norm, ~r/\binvite\b/i) -> "invite"
        match_phrase?(norm, ~r/\btell\b/i) -> "tell"
        match_phrase?(norm, ~r/\bask\b/i) -> "ask"
        match_phrase?(norm, ~r/\bmessage\b/i) -> "message"
        true -> nil
      end

    if is_nil(action) do
      nil
    else
      person = extract_coordinate_person(norm, action, names)
      content = extract_coordinate_content(norm, action, person)

      conf =
        cond do
          is_binary(person) and person != "" and is_binary(content) and content != "" ->
            :high

          is_binary(person) and person != "" ->
            :medium

          true ->
            # Trigger alone without a person is too weak — leave for later intents/chat.
            :low
        end

      if conf == :low do
        nil
      else
        %{
          intent: :coordinate,
          confidence: conf,
          entities: %{
            person: person || "",
            action: action,
            content: content || ""
          }
        }
      end
    end
  end

  defp try_check_status(norm, _names) do
    hit? =
      match_phrase?(norm, ~r/\bwhat's\b/i) or
        match_phrase?(norm, ~r/\bwhats\b/i) or
        match_phrase?(norm, ~r/\bhow's\b/i) or
        match_phrase?(norm, ~r/\bhows\b/i) or
        match_phrase?(norm, ~r/\bstatus\b/i) or
        match_phrase?(norm, ~r/\bupcoming\b/i) or
        match_phrase?(norm, ~r/\bcoming\s+up\b/i)

    if hit? do
      scope = extract_status_scope(norm)

      conf =
        cond do
          scope != nil -> :high
          match_phrase?(norm, ~r/\b(upcoming|coming\s+up|status)\b/i) -> :high
          true -> :medium
        end

      %{
        intent: :check_status,
        confidence: conf,
        entities: %{scope: scope}
      }
    else
      nil
    end
  end

  # --- entity helpers --------------------------------------------------------

  defp normalize(text) do
    %{
      original: text,
      lower: String.downcase(text)
    }
  end

  defp match_phrase?(%{lower: lower}, %Regex{} = re), do: Regex.match?(re, lower)

  defp capture_after(%{original: original, lower: lower}, %Regex{} = re) do
    case Regex.run(re, lower, return: :index) do
      [{start, len} | _] ->
        String.slice(original, start + len, byte_size(original))
        |> String.trim()
        |> strip_trailing_punct()

      _ ->
        ""
    end
  end

  defp extract_what(norm, trigger_re) do
    after_trigger = capture_after(norm, trigger_re)

    after_trigger
    |> String.replace(~r/\b(with|for|on|at|this|next|a|an|the)\b.*$/i, "")
    |> String.trim()
    |> strip_trailing_punct()
    |> blank_to_nil()
    |> case do
      nil -> nil
      w -> if String.downcase(w) in vague_whats(), do: nil, else: w
    end
  end

  defp vague_whats, do: MapSet.new(~w(something anything everything nothing stuff things))

  defp extract_when(%{original: original, lower: lower}) do
    cond do
      m = Regex.run(~r/\b(today|tomorrow|tonight)\b/i, original) ->
        hd(m)

      m = Regex.run(~r/\bnext\s+week\b/i, original) ->
        hd(m)

      m = Regex.run(~r/\bthis\s+weekend\b/i, original) ->
        hd(m)

      m = Regex.run(~r/\b(?:on\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i, original) ->
        # Prefer bare weekday token
        Enum.find(m, &(&1 =~ ~r/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i)) ||
          hd(m)

      m = Regex.run(~r/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?)\b/i, original) ->
        hd(m)

      Enum.any?(@weekdays, &String.contains?(lower, &1)) ->
        Enum.find_value(@weekdays, fn day ->
          if String.contains?(lower, day) do
            Regex.run(~r/\b#{day}\b/i, original) |> List.first()
          end
        end)

      Enum.any?(@relative_when, &String.contains?(lower, &1)) ->
        Enum.find_value(@relative_when, fn w ->
          if String.contains?(lower, w), do: w
        end)

      true ->
        nil
    end
  end

  defp extract_who(%{original: original}, known_names) do
    from_contacts = names_from_contacts(original, known_names)
    from_caps = capitalized_names(original, known_names)

    names =
      (from_contacts ++ from_caps)
      |> Enum.uniq_by(&String.downcase/1)

    case names do
      [] -> nil
      list -> list
    end
  end

  defp names_from_contacts(text, known_names) do
    Enum.filter(known_names, fn name ->
      String.contains?(String.downcase(text), String.downcase(name))
    end)
  end

  defp capitalized_names(text, known_names) do
    known_lower = MapSet.new(Enum.map(known_names, &String.downcase/1))

    # Tokenize; skip sentence-start capitalizations unless known contact.
    tokens = Regex.scan(~r/[A-Za-z][A-Za-z'-]*/, text) |> List.flatten()

    tokens
    |> Enum.with_index()
    |> Enum.filter(fn {tok, idx} ->
      first = String.first(tok)
      capital? = first == String.upcase(first) and first != String.downcase(first)
      known? = MapSet.member?(known_lower, String.downcase(tok))
      stop? = String.downcase(tok) in stop_words()

      capital? and not stop? and (idx > 0 or known?)
    end)
    |> Enum.map(fn {tok, _} -> tok end)
  end

  defp stop_words do
    MapSet.new(~w(
      i i'm i'll i've a an the this that these those
      monday tuesday wednesday thursday friday saturday sunday
      today tomorrow tonight next week weekend
      plan organize arrange change move reschedule cancel
      remember note save suggest recommend invite tell ask message
      what when where who how what's how's status upcoming
      with for on at to from of in by and or but
      dinner lunch brunch breakfast coffee drinks restaurant
      something anything everything nothing
      hey hello hi please thanks thank
    ))
  end

  defp extract_plan_ref(norm, action) do
    # "Move dinner to Saturday" / "Cancel brunch" / "Change the dinner plan"
    tail =
      capture_after(
        norm,
        Regex.compile!("\\b#{Regex.escape(action)}\\b(?:\\s+the)?\\s*", "i")
      )

    tail
    |> String.replace(~r/\b(to|for|on|at|until|from)\b.*$/i, "")
    |> String.replace(~r/\bplan\b/i, "")
    |> String.trim()
    |> strip_trailing_punct()
    |> blank_to_nil()
  end

  defp extract_recall_topic(%{original: original, lower: lower}) do
    cond do
      m = Regex.run(~r/\babout\s+([A-Za-z][A-Za-z']+)\b/i, original) ->
        Enum.at(m, 1)

      String.contains?(lower, "birthday") ->
        "birthday"

      String.contains?(lower, "anniversary") ->
        "anniversary"

      String.contains?(lower, "dinner") ->
        "dinner"

      String.contains?(lower, "trip") ->
        "trip"

      String.contains?(lower, "plan") ->
        "plan"

      m = Regex.run(~r/\blast\s+(\w+)/i, original) ->
        Enum.at(m, 1)
      true -> nil
    end
  end

  defp extract_recommend_category(%{original: original, lower: lower}) do
    cond do
      String.contains?(lower, "restaurant") -> "restaurant"
      String.contains?(lower, "cafe") or String.contains?(lower, "coffee") -> "coffee"
      String.contains?(lower, "bar") or String.contains?(lower, "drinks") -> "drinks"
      String.contains?(lower, "activity") or String.contains?(lower, "thing to do") -> "activity"
      String.contains?(lower, "place") -> "place"
      m = Regex.run(~r/\b(?:suggest|recommend)\s+(?:a|an|some)?\s*([a-z]+)/i, original) ->
        word = Enum.at(m, 1) |> String.downcase()

        if word in ~w(for me us something anything) do
          nil
        else
          word
        end

      true ->
        nil
    end
  end

  defp extract_coordinate_person(norm, action, known_names) do
    tail =
      capture_after(
        norm,
        Regex.compile!("\\b#{Regex.escape(action)}\\b\\s*", "i")
      )

    # "Invite John to dinner" / "Tell Maya that..." / "Ask Sam about..."
    who = extract_who(%{original: tail, lower: String.downcase(tail)}, known_names)

    cond do
      is_list(who) and who != [] ->
        hd(who)

      m = Regex.run(~r/^([A-Z][a-zA-Z'-]+)/, String.trim(tail)) ->
        hd(m)

      true ->
        nil
    end
  end

  defp extract_coordinate_content(norm, action, person) do
    tail =
      capture_after(
        norm,
        Regex.compile!("\\b#{Regex.escape(action)}\\b\\s*", "i")
      )

    tail
    |> then(fn s ->
      if is_binary(person) and person != "" do
        String.replace(s, ~r/^#{Regex.escape(person)}\b\s*/i, "")
      else
        s
      end
    end)
    |> String.replace(~r/^(to|that|about|if)\s+/i, "")
    |> String.trim()
    |> strip_trailing_punct()
    |> blank_to_nil()
    |> case do
      nil -> ""
      other -> other
    end
  end

  defp extract_status_scope(%{lower: lower}) do
    cond do
      String.contains?(lower, "celebrat") or String.contains?(lower, "birthday") or
          String.contains?(lower, "coming up") ->
        "celebrations"

      String.contains?(lower, "today") ->
        "today"

      String.contains?(lower, "week") ->
        "week"

      String.contains?(lower, "plan") ->
        "plans"

      String.contains?(lower, "upcoming") ->
        "celebrations"

      true ->
        nil
    end
  end

  defp known_contact_names(context) do
    contacts =
      get_in(context, [:social, :frequent_contacts]) ||
        get_in(context, ["social", "frequent_contacts"]) ||
        []

    contacts
    |> List.wrap()
    |> Enum.map(fn
      %{display_name: n} when is_binary(n) -> first_name(n)
      %{"display_name" => n} when is_binary(n) -> first_name(n)
      _ -> nil
    end)
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
  end

  defp first_name(display_name) do
    display_name |> String.trim() |> String.split(~r/\s+/) |> List.first()
  end

  defp strip_trailing_punct(s) when is_binary(s) do
    String.replace(s, ~r/[\s?.!,;:]+$/u, "")
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(s) when is_binary(s), do: s
end
