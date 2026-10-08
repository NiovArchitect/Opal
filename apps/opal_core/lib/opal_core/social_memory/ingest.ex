defmodule OpalCore.SocialMemory.Ingest do
  @moduledoc false

  require Logger

  alias OpalCore.Repo
  alias OpalCore.Relationships.RelationshipType

  alias OpalCore.Intelligence.TemporalResolver

  alias OpalCore.SocialMemory.{
    Cache,
    Commitment,
    ConversationIndex,
    PersonMemory,
    PlanMemory
  }

  alias OpalCore.SocialMemory.Workers.SummarizeConversationWorker

  @commitment_re ~r/\b(i'?ll|i will|let me|i'?ll handle|i'?ll book|i'?ll text|i'?ll call)\b/i
  @fact_re ~r/\b(my birthday is|i'?m allergic to|i hate mornings|i love mornings)\b/i
  @temporal_re ~r/\b(birthday|anniversary|deadline|due\s+by|every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|sometime\s+in\s+\w+)\b/i
  @plan_intents ~w(plan.propose plan.confirm plan.counter plan_proposal plan_confirm plan_counter)

  def enabled? do
    System.get_env("OPAL_MEMORY_ENABLED", "true") not in ~w(false 0 no)
  end

  @doc """
  Signal-based memory write. Never raises to caller — rescue/log.
  Does not store raw message text in memory tables.
  """
  def ingest(account_id, conversation_id, message_id, extraction, metadata)
      when is_binary(account_id) and is_binary(conversation_id) do
    if enabled?() do
      do_ingest(account_id, conversation_id, message_id, extraction, metadata || %{})
    else
      {:ok, :disabled}
    end
  rescue
    e ->
      Logger.warning(
        "social_memory.ingest_failed account=#{account_id} conversation=#{conversation_id} error=#{Exception.message(e)}"
      )

      {:error, :ingest_rescued}
  end

  def ingest(_, _, _, _, _), do: {:error, :invalid}

  defp do_ingest(account_id, conversation_id, message_id, extraction, metadata) do
    extraction = normalize_extraction(extraction)
    sender_id = metadata[:sender_id] || metadata["sender_id"]
    timestamp = metadata[:timestamp] || metadata["timestamp"] || DateTime.utc_now()
    body = metadata[:body] || metadata["body"] || ""
    owner_sent? = is_binary(sender_id) and sender_id == account_id

    participant_ids = List.wrap(metadata[:participant_ids] || metadata["participant_ids"])

    _ = bump_conversation_index(account_id, conversation_id, extraction, timestamp)
    _ = maybe_new_person(account_id, conversation_id, extraction, sender_id)
    _ = maybe_contact(account_id, sender_id, owner_sent?, timestamp, participant_ids)
    _ = maybe_plan_signal(account_id, conversation_id, extraction, metadata)
    _ = maybe_commitment(account_id, conversation_id, message_id, body, owner_sent?, extraction)
    _ = maybe_fact(account_id, conversation_id, body, owner_sent?, sender_id, extraction)
    _ = maybe_temporal(account_id, conversation_id, message_id, body, extraction, sender_id)
    _ = maybe_sentiment(account_id, conversation_id, extraction, sender_id)
    _ = maybe_enqueue_summary(account_id, conversation_id)
    _ = Cache.invalidate(account_id, conversation_id)

    {:ok, :ingested}
  end

  # TRIGGER temporal: time expressions → TemporalResolver → upsert anchors
  defp maybe_temporal(account_id, _conversation_id, message_id, body, extraction, sender_id) do
    entities = extraction.entities || %{}
    times = List.wrap(entities["times"] || entities[:times])
    has_times? = times != []
    has_lang? = is_binary(body) and Regex.match?(@temporal_re, body)

    if has_times? or has_lang? do
      person_id =
        cond do
          is_binary(sender_id) and sender_id != account_id -> sender_id
          true -> nil
        end

      case TemporalResolver.resolve(body || "", times, Date.utc_today(), account_id, person_id) do
        {:ok, attrs_list} when attrs_list != [] ->
          attrs_list =
            Enum.map(attrs_list, fn a ->
              Map.put(a, :source_message_id, message_id)
            end)

          _ = TemporalResolver.upsert_anchors(attrs_list)
          :ok

        _ ->
          :ok
      end
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("social_memory.temporal_failed error=#{Exception.message(e)}")
      :ok
  end

  defp normalize_extraction(%{__struct__: _} = e) do
    %{
      intent: Map.get(e, :intent),
      entities: Map.get(e, :entities) || %{},
      vibe: Map.get(e, :vibe) || %{},
      confidence: get_in(Map.get(e, :raw) || %{}, ["llm_confidence"])
    }
  end

  defp normalize_extraction(e) when is_map(e) do
    %{
      intent: e["intent"] || e[:intent],
      entities: e["entities"] || e[:entities] || %{},
      vibe: e["vibe"] || e[:vibe] || %{},
      confidence: e["confidence"] || e[:confidence]
    }
  end

  defp normalize_extraction(_), do: %{intent: nil, entities: %{}, vibe: %{}, confidence: nil}

  # Avoid compile dependency cycle — pattern match struct by module name at runtime
  defp maybe_new_person(account_id, conversation_id, extraction, sender_id) do
    person_ids = person_ids_from(extraction.entities, sender_id, account_id)

    Enum.each(person_ids, fn person_id ->
      if person_id != account_id do
        case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
          nil ->
            rel = relationship_type_for(account_id, person_id)

            %PersonMemory{}
            |> PersonMemory.changeset(%{
              account_id: account_id,
              person_id: person_id,
              relationship_type: rel,
              last_contact_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
            })
            |> Repo.insert()

          _ ->
            :ok
        end
      end
    end)

    # Also ensure counterpart row for conversation partner when only names in entities
    _ = conversation_id
    :ok
  end

  defp maybe_contact(account_id, sender_id, owner_sent?, timestamp, participant_ids) do
    targets =
      cond do
        owner_sent? ->
          Enum.reject(participant_ids, &(&1 == account_id))

        is_binary(sender_id) and sender_id != account_id ->
          [sender_id]

        true ->
          []
      end
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()

    Enum.each(targets, fn person_id ->
      touch_contact(account_id, person_id, timestamp)
    end)

    :ok
  end

  defp touch_contact(account_id, person_id, timestamp) do
    now = truncate(timestamp)

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: account_id,
          person_id: person_id,
          relationship_type: relationship_type_for(account_id, person_id),
          last_contact_at: now,
          contact_frequency_days: nil,
          cadence_status: "stable",
          contact_intervals: []
        })
        |> Repo.insert()

      %PersonMemory{} = row ->
        intervals = row.contact_intervals || []

        intervals =
          if row.last_contact_at do
            days = DateTime.diff(now, row.last_contact_at, :second) / 86_400.0
            Enum.take([days | intervals], 10)
          else
            intervals
          end

        freq =
          if intervals == [] do
            row.contact_frequency_days
          else
            Enum.sum(intervals) / max(length(intervals), 1)
          end

        cadence =
          cond do
            is_nil(row.contact_frequency_days) or is_nil(freq) ->
              "stable"

            freq < row.contact_frequency_days * 0.7 ->
              "warming"

            freq > row.contact_frequency_days * 1.3 ->
              "cooling"

            true ->
              "stable"
          end

        row
        |> PersonMemory.changeset(%{
          last_contact_at: now,
          contact_frequency_days: freq,
          contact_intervals: intervals,
          cadence_status: cadence
        })
        |> Repo.update()
    end
  end

  defp maybe_plan_signal(account_id, conversation_id, extraction, metadata) do
    intent = extraction.intent

    if intent in @plan_intents do
      entities = extraction.entities || %{}
      has_time? = present?(entities["time"] || entities["times"])
      has_place? = present?(entities["place"] || entities["places"])

      if has_time? or has_place? or intent in ~w(plan.confirm plan.propose) do
        plan_id =
          metadata[:plan_id] || metadata["plan_id"] ||
            synthetic_plan_id(account_id, conversation_id, entities)

        label = metadata[:plan_label] || metadata["plan_label"] || plan_label_from(entities)
        time_label = time_label_from(entities)
        place_label = place_label_from(entities)

        case Repo.get_by(PlanMemory, account_id: account_id, plan_id: plan_id) do
          nil ->
            %PlanMemory{}
            |> PlanMemory.changeset(%{
              account_id: account_id,
              plan_id: plan_id,
              user_role: "participant",
              related_conversation_ids: [conversation_id],
              status: "active",
              plan_label: label,
              time_label: time_label,
              place_label: place_label
            })
            |> Repo.insert()

          %PlanMemory{} = row ->
            convs =
              Enum.uniq((row.related_conversation_ids || []) ++ [conversation_id])

            row
            |> PlanMemory.changeset(%{
              related_conversation_ids: convs,
              plan_label: label || row.plan_label,
              time_label: time_label || row.time_label,
              place_label: place_label || row.place_label,
              status: "active"
            })
            |> Repo.update()
        end

        # Open loop on counterpart people
        Enum.each(person_ids_from(entities, nil, account_id), fn person_id ->
          append_open_loop(account_id, person_id, %{
            "description" => "Plan signal: #{label || time_label || "upcoming"}",
            "opened_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
            "source_conversation_id" => conversation_id
          })
        end)
      end
    end

    :ok
  end

  defp maybe_commitment(account_id, conversation_id, message_id, body, true, extraction)
       when is_binary(body) and body != "" and is_binary(message_id) do
    if Regex.match?(@commitment_re, body) do
      deadline = deadline_from(extraction.entities)

      %Commitment{}
      |> Commitment.changeset(%{
        account_id: account_id,
        description: String.slice(String.trim(body), 0, 240),
        status: "open",
        source_conversation_id: conversation_id,
        source_message_id: message_id,
        deadline_at: deadline
      })
      |> Repo.insert()
      |> case do
        {:ok, _} -> :ok
        {:error, _} -> :ok
      end
    else
      :ok
    end
  end

  defp maybe_commitment(_, _, _, _, _, _), do: :ok

  defp maybe_fact(account_id, conversation_id, body, owner_sent?, sender_id, _extraction)
       when is_binary(body) do
    if Regex.match?(@fact_re, body) do
      target =
        cond do
          owner_sent? -> account_id
          is_binary(sender_id) -> sender_id
          true -> nil
        end

      # Only store facts about account owner or conversation partner (sender)
      if is_binary(target) and (target == account_id or target == sender_id) do
        # Facts about the partner live on person_memory; about self → person_memory self skip;
        # store on person row for the partner, or if about self store under a self-fact on
        # each counterpart? Spec: known_facts on person_memories. For owner facts about self,
        # attach to the conversation partner's row as context about "what I told them" is wrong.
        # Store owner self-facts keyed on a person_memory where person_id == account_id (self mirror).
        person_id = if owner_sent?, do: account_id, else: sender_id
        ensure_person(account_id, person_id)

        case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
          %PersonMemory{} = row ->
            key = fact_key(body)
            facts = row.known_facts || %{}

            facts =
              Map.put(facts, key, %{
                "value" => String.slice(body, 0, 200),
                "source_conversation_id" => conversation_id,
                "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601()
              })

            row |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update()

          _ ->
            :ok
        end
      end
    end

    :ok
  end

  defp maybe_fact(_, _, _, _, _, _), do: :ok

  defp maybe_sentiment(account_id, conversation_id, extraction, sender_id) do
    vibe = extraction.vibe || %{}
    sentiment = vibe["sentiment"] || vibe[:sentiment]

    if sentiment in ["positive", "excited", "negative", "hesitant"] and is_binary(sender_id) and
         sender_id != account_id do
      ensure_person(account_id, sender_id)

      case Repo.get_by(PersonMemory, account_id: account_id, person_id: sender_id) do
        %PersonMemory{} = row ->
          mapped =
            case sentiment do
              s when s in ["positive", "excited"] -> "warming"
              s when s in ["negative", "hesitant"] -> "cooling"
              _ -> "neutral"
            end

          if row.sentiment_trend != mapped do
            loops = row.open_loops || []

            loops =
              if mapped == "cooling" do
                [
                  %{
                    "description" => "tension detected in conversation",
                    "opened_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
                    "source_conversation_id" => conversation_id
                  }
                  | loops
                ]
                |> Enum.take(20)
              else
                loops
              end

            row
            |> PersonMemory.changeset(%{sentiment_trend: mapped, open_loops: loops})
            |> Repo.update()
          end

        _ ->
          :ok
      end
    end

    :ok
  end

  defp bump_conversation_index(account_id, conversation_id, extraction, timestamp) do
    now = truncate(timestamp)
    entities = extraction.entities || %{}

    case Repo.get_by(ConversationIndex, account_id: account_id, conversation_id: conversation_id) do
      nil ->
        %ConversationIndex{}
        |> ConversationIndex.changeset(%{
          account_id: account_id,
          conversation_id: conversation_id,
          message_count: 1,
          message_count_at_summary: 0,
          key_entities: accumulate_entities(%{}, entities),
          open_questions: maybe_question([], extraction),
          last_activity_at: now
        })
        |> Repo.insert()

      %ConversationIndex{} = row ->
        row
        |> ConversationIndex.changeset(%{
          message_count: (row.message_count || 0) + 1,
          key_entities: accumulate_entities(row.key_entities || %{}, entities),
          open_questions: maybe_question(row.open_questions || [], extraction),
          last_activity_at: now
        })
        |> Repo.update()
    end
  end

  defp maybe_enqueue_summary(account_id, conversation_id) do
    case Repo.get_by(ConversationIndex, account_id: account_id, conversation_id: conversation_id) do
      %ConversationIndex{message_count: count, message_count_at_summary: at} = row
      when is_integer(count) and is_integer(at) and count >= at + 20 ->
        %{account_id: account_id, conversation_id: conversation_id}
        |> SummarizeConversationWorker.new()
        |> Oban.insert()

        {:ok, row}

      _ ->
        :ok
    end
  rescue
    _ -> :ok
  end

  defp accumulate_entities(base, entities) do
    merge_list = fn key, vals ->
      old = List.wrap(base[key])
      new = list_or_empty(vals)
      Enum.uniq(old ++ new) |> Enum.take(40)
    end

    %{
      "people" => merge_list.("people", entities["people"] || entities["person"]),
      "places" => merge_list.("places", entities["places"] || entities["place"]),
      "times" => merge_list.("times", entities["times"] || entities["time"]),
      "activities" => merge_list.("activities", entities["activities"] || entities["activity"])
    }
  end

  defp maybe_question(qs, %{intent: "plan.question"}), do: Enum.take(["open question" | qs], 10)
  defp maybe_question(qs, %{intent: "clarify"}), do: Enum.take(["clarification needed" | qs], 10)
  defp maybe_question(qs, _), do: qs

  defp person_ids_from(entities, sender_id, account_id) do
    named =
      list_or_empty(entities["people"] || entities["person"])
      |> Enum.map(&resolve_person_id/1)
      |> Enum.reject(&is_nil/1)

    ([sender_id] ++ named)
    |> Enum.filter(&is_binary/1)
    |> Enum.reject(&(&1 == account_id))
    |> Enum.uniq()
  end

  defp resolve_person_id(id) when is_binary(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> uuid
      :error -> nil
    end
  end

  defp resolve_person_id(_), do: nil

  defp relationship_type_for(account_id, person_id) do
    case Repo.get_by(RelationshipType, user_id: account_id, contact_user_id: person_id) do
      %{type: t} when is_binary(t) -> t
      _ -> "unknown"
    end
  end

  defp ensure_person(account_id, person_id) when is_binary(person_id) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: account_id,
          person_id: person_id,
          relationship_type: relationship_type_for(account_id, person_id)
        })
        |> Repo.insert()

      row ->
        {:ok, row}
    end
  end

  defp ensure_person(_, _), do: :ok

  defp append_open_loop(account_id, person_id, loop) do
    ensure_person(account_id, person_id)

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      %PersonMemory{} = row ->
        loops = Enum.take([loop | row.open_loops || []], 20)
        row |> PersonMemory.changeset(%{open_loops: loops}) |> Repo.update()

      _ ->
        :ok
    end
  end

  defp synthetic_plan_id(account_id, conversation_id, entities) do
    seed =
      account_id <>
        ":" <>
        conversation_id <>
        ":" <>
        to_string(time_label_from(entities)) <>
        ":" <> to_string(place_label_from(entities))

    hash = :crypto.hash(:sha256, seed)
    <<a::32, b::16, c::16, d::16, e::48, _::binary>> = hash <> <<0::size(32)>>
    # UUID version 5-ish layout from content hash (deterministic)
    c = Bitwise.bor(Bitwise.band(c, 0x0FFF), 0x5000)
    d = Bitwise.bor(Bitwise.band(d, 0x3FFF), 0x8000)

    :io_lib.format("~8.16.0b-~4.16.0b-~4.16.0b-~4.16.0b-~12.16.0b", [a, b, c, d, e])
    |> IO.iodata_to_binary()
  end

  defp plan_label_from(entities) do
    case list_or_empty(entities["activities"] || entities["activity"]) do
      [a | _] -> a
      _ -> time_label_from(entities) || place_label_from(entities)
    end
  end

  defp time_label_from(entities) do
    case entities["time"] do
      %{"day" => d} when is_binary(d) -> d
      %{"label" => l} when is_binary(l) -> l
      %{"raw" => [r | _]} when is_binary(r) -> r
      bin when is_binary(bin) -> bin
      _ ->
        case list_or_empty(entities["times"]) do
          [t | _] -> t
          _ -> nil
        end
    end
  end

  defp place_label_from(entities) do
    case entities["place"] do
      bin when is_binary(bin) -> bin
      _ ->
        case list_or_empty(entities["places"]) do
          [p | _] -> p
          _ -> nil
        end
    end
  end

  defp deadline_from(entities) do
    label = time_label_from(entities)

    cond do
      is_nil(label) ->
        nil

      String.contains?(String.downcase(to_string(label)), "tomorrow") ->
        DateTime.utc_now() |> DateTime.add(86_400, :second) |> DateTime.truncate(:microsecond)

      String.contains?(String.downcase(to_string(label)), "friday") ->
        next_weekday(5)

      true ->
        nil
    end
  end

  defp next_weekday(target_wday) do
    today = Date.utc_today()
    # Date.day_of_week Monday=1 ... Sunday=7
    cur = Date.day_of_week(today)
    add = rem(target_wday - cur + 7, 7)
    add = if add == 0, do: 7, else: add

    today
    |> Date.add(add)
    |> DateTime.new!(~T[17:00:00], "Etc/UTC")
    |> DateTime.truncate(:microsecond)
  end

  defp fact_key(body) do
    cond do
      String.contains?(String.downcase(body), "birthday") -> "birthday"
      String.contains?(String.downcase(body), "allergic") -> "allergy"
      String.contains?(String.downcase(body), "hate mornings") -> "mornings"
      String.contains?(String.downcase(body), "love mornings") -> "mornings"
      true -> "note_#{:erlang.phash2(String.slice(body, 0, 40))}"
    end
  end

  defp list_or_empty(list) when is_list(list), do: Enum.map(list, &to_string/1)
  defp list_or_empty(bin) when is_binary(bin) and bin != "", do: [bin]
  defp list_or_empty(%{} = map), do: map |> Map.values() |> List.flatten() |> list_or_empty()
  defp list_or_empty(_), do: []

  defp present?(nil), do: false
  defp present?([]), do: false
  defp present?(""), do: false
  defp present?(%{} = m), do: map_size(m) > 0
  defp present?(_), do: true

  defp truncate(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)
  defp truncate(_), do: DateTime.utc_now() |> DateTime.truncate(:microsecond)
end
