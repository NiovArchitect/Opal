defmodule OpalCore.SocialMemory.Ingest do
  @moduledoc false

  require Logger

  import Ecto.Query, only: [from: 2]

  alias OpalCore.Repo
  alias OpalCore.Relationships.RelationshipType

  alias OpalCore.Intelligence.LlmMemoryExtract
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
  # Repair #26 (F-3b) — dislikes generalize beyond mornings: "i can't
  # stand X" and a generic "i hate X" are stated facts too. The mornings
  # shapes stay (fact_key/1 keys them "mornings", never "dislike:...").
  @fact_re ~r/\b(my birthday is|i'?m allergic to|i hate mornings|i love mornings)\b|\bi\s+can'?t\s+stand\b|\bi\s+hate\s+[\w\-]+/i
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
    _ = maybe_life_event(account_id, body, owner_sent?, extraction)
    _ = maybe_set_reminder(account_id, conversation_id, body, owner_sent?, extraction)
    _ = maybe_sentiment(account_id, conversation_id, extraction, sender_id)
    _ = maybe_llm_memory(account_id, conversation_id, message_id, body, sender_id, metadata)
    _ = maybe_enqueue_summary(account_id, conversation_id)
    _ = Cache.invalidate(account_id, conversation_id)

    {:ok, :ingested}
  end

  # Paste G Phase 5 — user-told life events → person memory + temporal/open-loop nudge path
  defp maybe_life_event(account_id, body, true, extraction) when is_binary(body) do
    intent = extraction.intent

    if intent == "life_event" or match?(%{event_type: _}, OpalCore.Social.LifeEvents.detect(body)) do
      person =
        get_in(extraction.entities || %{}, ["person"]) ||
          get_in(extraction.entities || %{}, ["people"]) |> List.wrap() |> List.first()

      _ =
        OpalCore.Social.LifeEvents.ingest_user_told(account_id, body,
          person_name: if(is_binary(person), do: person, else: nil)
        )

      :ok
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("social_memory.life_event_failed error=#{Exception.message(e)}")
      :ok
  end

  defp maybe_life_event(_, _, _, _), do: :ok

  # Paste G Phase 8 — conversational set_reminder (owner-sent only)
  # Paste H — may_commit? gate blocks negation / retract / conditional false commits
  defp maybe_set_reminder(account_id, conversation_id, body, true, extraction)
       when is_binary(body) do
    entities = extraction.entities || %{}

    if extraction.intent == "set_reminder" and
         OpalCore.Intelligence.Extractor.may_commit?(extraction.intent, entities) do
      task = entities["task"] || body
      when_expr = entities["when"] || List.first(List.wrap(entities["times"]))
      recurrence = entities["recurrence"]

      attrs =
        %{
          "task" => task,
          "conversation_id" => conversation_id,
          "account_id" => account_id
        }
        |> then(fn m -> if when_expr, do: Map.put(m, "when", when_expr), else: m end)
        |> then(fn m -> if recurrence, do: Map.put(m, "recurrence", recurrence), else: m end)
        |> then(fn m ->
          if is_nil(when_expr) and is_nil(m["remind_at"]) do
            Map.put(m, "when", "in 1 hours")
          else
            m
          end
        end)

      case OpalCore.Reminders.create(account_id, attrs) do
        {:ok, _} ->
          :ok

        {:error, reason} ->
          Logger.info("social_memory.reminder_create_skip reason=#{inspect(reason)}")
          :ok
      end
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("social_memory.reminder_failed error=#{Exception.message(e)}")
      :ok
  end

  defp maybe_set_reminder(_, _, _, _, _), do: :ok

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
        label = metadata[:plan_label] || metadata["plan_label"] || plan_label_from(entities)
        time_label = time_label_from(entities)
        place_label = place_label_from(entities)
        activity = activity_from(entities)
        explicit_plan_id = metadata[:plan_id] || metadata["plan_id"]

        # Repair #26 (F-3b) — merge-target selection replaces the old
        # synthetic-id bucket: labels are usually nil/coarse, so unrelated
        # plans sharing one conversation overwrote each other (dinner →
        # lunch, saturday → market) whenever their synthetic ids collided.
        # An explicit plan_id from the caller still names its row directly.
        written? =
          cond do
            is_binary(explicit_plan_id) ->
              upsert_plan_row(
                Repo.get_by(PlanMemory, account_id: account_id, plan_id: explicit_plan_id),
                explicit_plan_id,
                account_id,
                conversation_id,
                label,
                activity,
                time_label,
                place_label
              )

            true ->
              case select_merge_target(
                     account_id,
                     conversation_id,
                     place_label,
                     activity,
                     intent
                   ) do
                %PlanMemory{} = row ->
                  update_plan_row(row, conversation_id, label, activity, time_label, place_label)
                  true

                nil ->
                  create_plan_row(
                    account_id,
                    conversation_id,
                    entities,
                    label,
                    activity,
                    time_label,
                    place_label
                  )
              end
          end

        if written? do
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
    end

    :ok
  end

  # Active PlanMemory rows for the account whose related conversations
  # include this conversation, oldest first (stable merge priority).
  defp active_plan_candidates(account_id, conversation_id) do
    from(p in PlanMemory,
      where: p.account_id == ^account_id and p.status == "active",
      where: ^conversation_id in p.related_conversation_ids,
      order_by: [asc: p.inserted_at, asc: p.id]
    )
    |> Repo.all()
  end

  # (a) same place → same plan; (b) same activity label → same plan;
  # (c) a confirm/counter with exactly one candidate → that plan;
  # (d) otherwise nil (caller creates a new row).
  defp select_merge_target(account_id, conversation_id, place_label, activity, intent) do
    candidates = active_plan_candidates(account_id, conversation_id)

    by_place =
      if is_binary(place_label) and place_label != "" do
        Enum.find(candidates, fn row ->
          is_binary(row.place_label) and
            String.downcase(row.place_label) == String.downcase(place_label)
        end)
      end

    by_activity =
      if is_binary(activity) and activity != "" do
        Enum.find(candidates, fn row ->
          is_binary(row.plan_label) and
            String.downcase(row.plan_label) == String.downcase(activity)
        end)
      end

    cond do
      by_place ->
        by_place

      by_activity ->
        by_activity

      intent in ~w(plan.confirm plan.counter plan_confirm plan_counter) and
          length(candidates) == 1 ->
        hd(candidates)

      true ->
        nil
    end
  end

  defp create_plan_row(
         account_id,
         conversation_id,
         entities,
         label,
         activity,
         time_label,
         place_label
       ) do
    plan_id = synthetic_plan_id(account_id, conversation_id, entities)

    case Repo.get_by(PlanMemory, account_id: account_id, plan_id: plan_id) do
      %PlanMemory{} = row ->
        # The synthetic seed itself collided with an existing row —
        # merge into it rather than violating the unique index.
        update_plan_row(row, conversation_id, label, activity, time_label, place_label)
        true

      nil ->
        # A new plan needs an anchor beyond a bare day: a place, an
        # activity, or a concrete clock time. A day-only signal
        # ("Can we do Saturday instead?") with no plan to merge into
        # creates nothing.
        if present?(place_label) or present?(activity) or present?(clock_time_from(entities)) do
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

          true
        else
          false
        end
    end
  end

  defp upsert_plan_row(
         nil,
         plan_id,
         account_id,
         conversation_id,
         label,
         _activity,
         time_label,
         place_label
       ) do
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

    true
  end

  defp upsert_plan_row(
         %PlanMemory{} = row,
         _plan_id,
         _account_id,
         conversation_id,
         label,
         activity,
         time_label,
         place_label
       ) do
    update_plan_row(row, conversation_id, label, activity, time_label, place_label)
    true
  end

  # Repair #26 (F-3b) — updates merge per component instead of replacing:
  # the activity label is never overwritten by a time/place fallback, the
  # time label keeps its day and clock components independently (new wins
  # per component), and a place once known is only replaced by a new one.
  defp update_plan_row(row, conversation_id, label, activity, time_label, place_label) do
    convs = Enum.uniq((row.related_conversation_ids || []) ++ [conversation_id])

    row
    |> PlanMemory.changeset(%{
      related_conversation_ids: convs,
      plan_label: activity || row.plan_label || label,
      time_label: merge_time_labels(row.time_label, time_label),
      place_label: place_label || row.place_label,
      status: "active"
    })
    |> Repo.update()
  end

  @time_day_tokens ~w(monday tuesday wednesday thursday friday saturday sunday tomorrow today)

  defp merge_time_labels(old_label, nil), do: old_label
  defp merge_time_labels(nil, new_label), do: new_label

  defp merge_time_labels(old_label, new_label) do
    day = time_day_of(new_label) || time_day_of(old_label)
    clock = time_clock_of(new_label) || time_clock_of(old_label)

    cond do
      day && clock -> "#{day} #{clock}"
      day -> day
      clock -> clock
      true -> new_label
    end
  end

  defp time_day_of(label) when is_binary(label) do
    lower = String.downcase(label)

    @time_day_tokens
    |> Enum.map(fn word ->
      case Regex.run(~r/\b#{word}\b/, lower, return: :index) do
        [{idx, _len}] -> {idx, word}
        _ -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)
    |> Enum.sort_by(fn {idx, _word} -> idx end)
    |> case do
      [{_idx, word} | _] -> word
      [] -> nil
    end
  end

  defp time_day_of(_), do: nil

  defp time_clock_of(label) when is_binary(label) do
    case Regex.run(~r/\b\d{1,2}:\d{2}\b/, label) do
      [clock] -> clock
      _ -> nil
    end
  end

  defp time_clock_of(_), do: nil

  defp activity_from(entities) do
    case list_or_empty(entities["activities"] || entities["activity"]) do
      [a | _] -> a
      _ -> nil
    end
  end

  defp clock_time_from(entities) do
    case entities["time"] do
      %{"time" => t} when is_binary(t) -> t
      _ -> nil
    end
  end

  defp maybe_commitment(account_id, conversation_id, message_id, body, true, extraction)
       when is_binary(body) and body != "" and is_binary(message_id) do
    if Regex.match?(@commitment_re, body) do
      deadline = deadline_from(extraction.entities)

      create_commitment(
        account_id,
        conversation_id,
        message_id,
        String.slice(String.trim(body), 0, 240),
        deadline
      )
    else
      :ok
    end
  end

  defp maybe_commitment(_, _, _, _, _, _), do: :ok

  # The one Commitment writer, shared by the rules leg and the
  # Repair #26 LLM memory leg. Same fields/description style for both.
  defp create_commitment(account_id, conversation_id, message_id, description, deadline) do
    %Commitment{}
    |> Commitment.changeset(%{
      account_id: account_id,
      description: description,
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
  end

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

        put_fact(account_id, person_id, conversation_id, fact_key(body), %{
          "value" => String.slice(body, 0, 200),
          "source_conversation_id" => conversation_id,
          "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "provenance" => "stated"
        })
      end
    end

    :ok
  end

  defp maybe_fact(_, _, _, _, _, _), do: :ok

  # The one known_facts writer, shared by the rules leg (provenance
  # "stated") and the Repair #26 LLM memory leg ("stated_llm").
  defp put_fact(account_id, person_id, _conversation_id, key, entry)
       when is_binary(person_id) and is_map(entry) do
    ensure_person(account_id, person_id)

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      %PersonMemory{} = row ->
        facts = Map.put(row.known_facts || %{}, key, entry)
        row |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update()

      _ ->
        :ok
    end

    :ok
  end

  defp put_fact(_, _, _, _, _), do: :ok

  # Repair #26 (F-4) — language-aware memory leg. The rules legs above
  # are English-shaped, so a non-English utterance (per the import
  # row's language, threaded through metadata) gets one scoped LLM
  # extraction pass and its results land through the SAME writers the
  # rules use. The guard runs before any LLM readiness check: English
  # or unknown language never touches the LLM on this leg. A disabled
  # or failing LLM is an honest degraded state — ingest completes and
  # nothing is extracted, never fabricated.
  defp maybe_llm_memory(account_id, conversation_id, message_id, body, sender_id, metadata) do
    language = metadata[:language] || metadata["language"]
    owner_sent? = is_binary(sender_id) and sender_id == account_id

    if non_english_language?(language) and is_binary(body) and body != "" and
         is_binary(message_id) do
      scoped = OpalCore.SocialMemory.for_account(account_id)
      speaker = if owner_sent?, do: :self, else: :other

      case LlmMemoryExtract.extract_account_memory(account_id, scoped, conversation_id, body,
             speaker: speaker
           ) do
        {:ok, extracted} ->
          _ =
            apply_llm_facts(
              account_id,
              conversation_id,
              body,
              owner_sent?,
              sender_id,
              extracted.facts
            )

          _ =
            apply_llm_commitments(
              account_id,
              conversation_id,
              message_id,
              owner_sent?,
              extracted.commitments
            )

          _ = apply_llm_plans(account_id, conversation_id, extracted.plans)
          :ok

        {:error, reason} ->
          Logger.info("social_memory.llm_memory_skip reason=#{inspect(reason)}")
          :ok
      end
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("social_memory.llm_memory_failed error=#{Exception.message(e)}")
      :ok
  end

  defp non_english_language?(language) when is_binary(language) do
    normalized = language |> String.trim() |> String.downcase()
    normalized != "" and not String.starts_with?(normalized, "en")
  end

  defp non_english_language?(_), do: false

  defp apply_llm_facts(account_id, conversation_id, body, owner_sent?, sender_id, facts) do
    person_id =
      cond do
        owner_sent? -> account_id
        is_binary(sender_id) -> sender_id
        true -> nil
      end

    if is_binary(person_id) do
      Enum.each(facts, fn %{"object" => object} ->
        key = "dislike:" <> (object |> String.trim() |> String.downcase())

        put_fact(account_id, person_id, conversation_id, key, %{
          "value" => String.slice(body, 0, 200),
          "object" => String.trim(object),
          "source_conversation_id" => conversation_id,
          "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "provenance" => "stated_llm"
        })
      end)
    end

    :ok
  end

  # Commitments are the speaker's own promises: they land only on the
  # speaker-account's own ingest, never on the other party's.
  defp apply_llm_commitments(account_id, conversation_id, message_id, true, commitments) do
    Enum.each(commitments, fn %{"text" => text} ->
      create_commitment(
        account_id,
        conversation_id,
        message_id,
        String.slice(String.trim(text), 0, 240),
        nil
      )
    end)

    :ok
  end

  defp apply_llm_commitments(_, _, _, _, _), do: :ok

  defp apply_llm_plans(account_id, conversation_id, plans) do
    Enum.each(plans, fn plan ->
      case llm_plan_extraction(plan) do
        nil -> :ok
        extraction -> maybe_plan_signal(account_id, conversation_id, extraction, %{})
      end
    end)

    :ok
  end

  # Rebuild an extraction-shaped map the Cluster B plan writer already
  # understands: day and clock travel together in the "time" entity
  # map, so merge/label behavior is identical to the rules path. A
  # plan with no day, time, place, or activity carries nothing — skip.
  defp llm_plan_extraction(%{
         "activity" => activity,
         "day" => day,
         "time_24h" => time_24h,
         "place" => place
       }) do
    if is_nil(activity) and is_nil(day) and is_nil(time_24h) and is_nil(place) do
      nil
    else
      time_map =
        %{}
        |> maybe_put_entity("day", day)
        |> maybe_put_entity("time", time_24h)

      entities =
        %{}
        |> maybe_put_entity("time", if(time_map == %{}, do: nil, else: time_map))
        |> maybe_put_entity("place", place)
        |> maybe_put_entity("activities", if(is_binary(activity), do: [activity], else: nil))

      %{intent: "plan.propose", entities: entities, vibe: %{}, confidence: nil}
    end
  end

  defp llm_plan_extraction(_), do: nil

  defp maybe_put_entity(map, _key, nil), do: map
  defp maybe_put_entity(map, key, value), do: Map.put(map, key, value)

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

  # Repair #26 (F-3) — a time entity carrying BOTH a day and a clock
  # (Extractor now combines them) labels as "saturday 19:00", not just
  # the day. Day-only and clock-only shapes keep their single-part label;
  # the label/raw/binary/times fallbacks are unchanged.
  defp time_label_from(entities) do
    case entities["time"] do
      %{"day" => d, "time" => t} when is_binary(d) and is_binary(t) ->
        "#{d} #{t}"

      %{"day" => d} when is_binary(d) ->
        d

      %{"time" => t} when is_binary(t) ->
        t

      %{"label" => l} when is_binary(l) ->
        l

      %{"raw" => [r | _]} when is_binary(r) ->
        r

      bin when is_binary(bin) ->
        bin

      _ ->
        case list_or_empty(entities["times"]) do
          [t | _] -> t
          _ -> nil
        end
    end
  end

  defp place_label_from(entities) do
    case entities["place"] do
      bin when is_binary(bin) ->
        bin

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
    lower = String.downcase(body)

    cond do
      String.contains?(lower, "birthday") -> "birthday"
      String.contains?(lower, "allergic") -> "allergy"
      # The mornings keying predates the generalized dislikes and wins
      # over them: "i hate mornings" keys "mornings", not a dislike.
      String.contains?(lower, "hate mornings") -> "mornings"
      String.contains?(lower, "love mornings") -> "mornings"
      # Repair #26 (F-3b) — generalized dislikes.
      dislike = cant_stand_dislike(body) -> "dislike:#{dislike}"
      dislike = hate_dislike(body) -> "dislike:#{dislike}"
      true -> "note_#{:erlang.phash2(String.slice(body, 0, 40))}"
    end
  end

  # "i can't stand cilantro" → "cilantro" (1–3 words after the phrase,
  # cut at the first comma/period and trimmed).
  defp cant_stand_dislike(body) do
    case Regex.run(~r/\bi\s+can'?t\s+stand\s+([^.,;!?]+)/i, body) do
      [_, words] ->
        words
        |> String.trim()
        |> String.downcase()
        |> String.split(~r/\s+/)
        |> Enum.reject(&(&1 == ""))
        |> Enum.take(3)
        |> Enum.join(" ")
        |> case do
          "" -> nil
          dislike -> dislike
        end

      _ ->
        nil
    end
  end

  # Generic "i hate <word>" (non-morning; mornings handled in fact_key/1).
  defp hate_dislike(body) do
    case Regex.run(~r/\bi\s+hate\s+([\w\-]+)/i, body) do
      [_, word] -> String.downcase(word)
      _ -> nil
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
