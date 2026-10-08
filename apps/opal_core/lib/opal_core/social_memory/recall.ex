defmodule OpalCore.SocialMemory.Recall do
  @moduledoc false

  import Ecto.Query

  alias OpalCore.Repo

  alias OpalCore.SocialMemory.{
    Cache,
    Commitment,
    ConversationIndex,
    PersonMemory,
    PlanMemory,
    Routine,
    Scoped,
    SocialPattern,
    SurfacedNudge,
    TemporalAnchor
  }

  def recall_for_conversation(%Scoped{account_id: account_id}, conversation_id)
      when is_binary(conversation_id) do
    case Cache.get(account_id, conversation_id) do
      {:ok, cached} ->
        cached

      :miss ->
        value = build_recall(account_id, conversation_id)
        _ = Cache.put(account_id, conversation_id, value)
        value
    end
  end

  def detect_conflicts(%Scoped{account_id: account_id}) do
    now = DateTime.utc_now()

    plans =
      from(p in PlanMemory,
        where: p.account_id == ^account_id and p.status == "active"
      )
      |> Repo.all()

    commitments =
      from(c in Commitment,
        where: c.account_id == ^account_id and c.status in ["open", "overdue"]
      )
      |> Repo.all()

    people =
      from(p in PersonMemory, where: p.account_id == ^account_id)
      |> Repo.all()

    overlaps =
      for a <- plans, b <- plans, a.id < b.id do
        if overlap?(a, b) do
          %{
            type: :time_overlap,
            description:
              "Plans overlap: #{a.plan_label || a.time_label} and #{b.plan_label || b.time_label}",
            involved: [a.plan_id, b.plan_id],
            severity: :high
          }
        end
      end
      |> Enum.reject(&is_nil/1)

    soon = DateTime.add(now, 48 * 3600, :second)

    overcommit =
      commitments
      |> Enum.filter(fn c ->
        match?(%DateTime{}, c.deadline_at) and DateTime.compare(c.deadline_at, soon) != :gt
      end)
      |> then(fn list ->
        if length(list) >= 3 do
          [
            %{
              type: :overcommitment,
              description: "#{length(list)} open commitments due within 48 hours",
              involved: Enum.map(list, & &1.id),
              severity: :high
            }
          ]
        else
          []
        end
      end)

    neglected =
      people
      |> Enum.flat_map(fn p ->
        (p.open_loops || [])
        |> Enum.filter(fn loop ->
          case loop["opened_at"] do
            iso when is_binary(iso) ->
              case DateTime.from_iso8601(iso) do
                {:ok, dt, _} -> DateTime.diff(now, dt, :second) > 7 * 86_400
                _ -> false
              end

            _ ->
              false
          end
        end)
        |> Enum.map(fn loop ->
          %{
            type: :neglected_followup,
            description: loop["description"] || "Open loop older than 7 days",
            involved: [p.person_id],
            severity: :medium
          }
        end)
      end)

    overlaps ++ overcommit ++ neglected
  end

  # Product priority (documented):
  # overdue commitments > time conflicts > birthdays within 3 days >
  # cooling relationships > birthdays within 7 days > unanswered questions
  def surface_nudges(%Scoped{account_id: account_id}) do
    now = DateTime.utc_now()
    conflicts = detect_conflicts(%Scoped{account_id: account_id})

    overdue =
      from(c in Commitment,
        where:
          c.account_id == ^account_id and c.status == "open" and not is_nil(c.deadline_at) and
            c.deadline_at < ^now
      )
      |> Repo.all()
      |> Enum.map(fn c ->
        %{
          type: :overdue_commitment,
          person_id: c.person_id,
          plan_id: nil,
          ref_id: c.id,
          conversation_id: c.source_conversation_id,
          message_draft: "You said: #{c.description}",
          reason: "Opal noticed this commitment is past its deadline",
          priority: 100
        }
      end)

    conflict_nudges =
      Enum.map(conflicts, fn c ->
        pri = if c.type == :time_overlap, do: 90, else: 80

        %{
          type: c.type,
          person_id: nil,
          plan_id: List.first(c.involved),
          ref_id: List.first(c.involved),
          conversation_id: nil,
          message_draft: c.description,
          reason: c.description,
          priority: pri
        }
      end)

    cooling =
      from(p in PersonMemory,
        where: p.account_id == ^account_id and p.cadence_status == "cooling"
      )
      |> Repo.all()
      |> Enum.filter(fn p ->
        freq = p.contact_frequency_days || 7.0
        last = p.last_contact_at

        if match?(%DateTime{}, last) do
          DateTime.diff(now, last, :second) / 86_400.0 >= freq * 2
        else
          false
        end
      end)
      |> Enum.map(fn p ->
        days =
          if p.last_contact_at,
            do: div(DateTime.diff(now, p.last_contact_at, :second), 86_400),
            else: 0

        %{
          type: :cooling_relationship,
          person_id: p.person_id,
          plan_id: nil,
          ref_id: p.person_id,
          conversation_id: nil,
          message_draft: "Want to reach out?",
          reason: "Opal noticed you haven't talked in #{days} days",
          priority: 60
        }
      end)

    today = Date.utc_today()
    horizon = Date.add(today, 7)

    temporal =
      from(a in TemporalAnchor,
        where:
          a.account_id == ^account_id and a.confirmed == true and a.date >= ^today and
            a.date <= ^horizon
      )
      |> Repo.all()
      |> Enum.reject(&temporal_nudge_recent?(account_id, &1, now))
      |> Enum.reject(&plan_covers_anchor?(account_id, &1))
      |> Enum.map(&temporal_nudge/1)

    routine_breaks =
      from(r in Routine,
        where: r.account_id == ^account_id and r.streak_broken == true and r.confidence >= 0.6
      )
      |> Repo.all()
      |> Enum.map(fn r ->
        %{
          type: :routine_broken,
          person_id: r.person_id,
          plan_id: nil,
          ref_id: r.id,
          conversation_id: nil,
          message_draft: routine_break_copy(r),
          reason: routine_break_copy(r),
          # Below birthdays (70–85), above cooling (60)
          priority: 65
        }
      end)

    unanswered =
      from(i in ConversationIndex,
        where: i.account_id == ^account_id and fragment("array_length(?, 1) > 0", i.open_questions)
      )
      |> Repo.all()
      |> Enum.filter(fn i ->
        match?(%DateTime{}, i.last_activity_at) and
          DateTime.diff(now, i.last_activity_at, :second) > 48 * 3600
      end)
      |> Enum.map(fn i ->
        %{
          type: :unanswered_question,
          person_id: nil,
          plan_id: nil,
          ref_id: i.conversation_id,
          conversation_id: i.conversation_id,
          message_draft: "There's still an open question in this thread",
          reason: "Opal noticed an unanswered question older than 48 hours",
          priority: 40
        }
      end)

    (overdue ++ conflict_nudges ++ cooling ++ temporal ++ routine_breaks ++ unanswered)
    |> Enum.reject(&suppressed?(account_id, &1, now))
    |> Enum.sort_by(& &1.priority, :desc)
  end

  defp temporal_nudge(%TemporalAnchor{} = a) do
    days = Date.diff(a.date, Date.utc_today())
    who = if a.person_id, do: "someone", else: "you"
    # Prefer specific copy; person display names resolved at surface time when available
    label =
      case a.anchor_type do
        "birthday" -> "birthday"
        "anniversary" -> "anniversary"
        "deadline" -> "deadline"
        "recurring_event" -> "recurring event"
        _ -> "event"
      end

    day_name = Calendar.strftime(a.date, "%A")

    reason =
      case a.anchor_type do
        t when t in ~w(birthday anniversary) ->
          "#{String.capitalize(label)} is #{day_name} (#{days} days). No plan yet."

        "deadline" ->
          "Deadline is #{day_name} (#{days} days). No plan yet."

        _ ->
          "#{String.capitalize(label)} on #{day_name} (#{days} days). No plan yet."
      end

    priority =
      cond do
        a.anchor_type in ~w(birthday anniversary) and days <= 3 -> 85
        a.anchor_type == "deadline" and days <= 2 -> 80
        a.anchor_type in ~w(birthday anniversary) and days <= 7 -> 70
        a.anchor_type == "recurring_event" -> 55
        true -> 50
      end

    %{
      type: :temporal_anchor,
      person_id: a.person_id,
      plan_id: nil,
      ref_id: a.id,
      conversation_id: nil,
      message_draft: reason,
      reason: reason,
      priority: priority,
      provenance: a.provenance || "observed",
      _who: who
    }
  end

  defp temporal_nudge_recent?(account_id, %TemporalAnchor{} = a, now) do
    since = DateTime.add(now, -30 * 86_400, :second)

    from(n in SurfacedNudge,
      where:
        n.account_id == ^account_id and n.type == "temporal_anchor" and n.ref_id == ^a.id and
          n.surfaced_at >= ^since
    )
    |> Repo.exists?()
  end

  defp plan_covers_anchor?(account_id, %TemporalAnchor{} = a) do
    day = a.date
    month_abbr = String.downcase(Calendar.strftime(day, "%b"))
    day_num = Integer.to_string(day.day)

    from(p in PlanMemory,
      where: p.account_id == ^account_id and p.status == "active"
    )
    |> Repo.all()
    |> Enum.any?(fn p ->
      cond do
        match?(%DateTime{}, p.start_at) and DateTime.to_date(p.start_at) == day ->
          true

        is_binary(p.time_label) ->
          label = String.downcase(p.time_label)
          String.contains?(label, month_abbr) and String.contains?(label, day_num)

        true ->
          false
      end
    end)
  end

  defp routine_break_copy(%Routine{} = r) do
    day =
      case r.day_of_week do
        0 -> "Sundays"
        1 -> "Mondays"
        2 -> "Tuesdays"
        3 -> "Wednesdays"
        4 -> "Thursdays"
        5 -> "Fridays"
        6 -> "Saturdays"
        _ -> "that day"
      end

    activity = r.activity || "plans"
    "You usually get #{activity} on #{day} — nothing on the books this week. Want to set something up?"
  end

  defp build_recall(account_id, conversation_id) do
    index =
      Repo.get_by(ConversationIndex, account_id: account_id, conversation_id: conversation_id)

    participant_ids = participant_ids(account_id, conversation_id, index)

    people =
      if participant_ids == [] do
        []
      else
        from(p in PersonMemory,
          where: p.account_id == ^account_id and p.person_id in ^participant_ids
        )
        |> Repo.all()
        |> Enum.map(&serialize_person/1)
      end

    commitments =
      from(c in Commitment,
        where: c.account_id == ^account_id and c.status in ["open", "overdue"],
        limit: 20
      )
      |> Repo.all()
      |> Enum.filter(fn c ->
        is_nil(c.person_id) or c.person_id in participant_ids or
          c.source_conversation_id == conversation_id
      end)
      |> Enum.map(fn c ->
        %{
          id: c.id,
          description: c.description,
          deadline_at: c.deadline_at,
          status: c.status
        }
      end)

    plans =
      from(p in PlanMemory,
        where: p.account_id == ^account_id and p.status == "active",
        limit: 20
      )
      |> Repo.all()
      |> Enum.filter(fn p ->
        conversation_id in (p.related_conversation_ids || []) or
          related_to_people?(p, participant_ids)
      end)
      |> Enum.map(&serialize_plan_private/1)

    patterns =
      from(s in SocialPattern,
        where: s.account_id == ^account_id and s.confidence >= 0.5 and s.surfaced == true
      )
      |> Repo.all()
      |> Enum.map(fn s ->
        %{type: s.pattern_type, description: s.description, confidence: s.confidence}
      end)

    %{
      account_id: account_id,
      conversation_id: conversation_id,
      conversation_summary: index && index.rolling_summary,
      people: people,
      my_open_commitments: commitments,
      active_plans: plans,
      relevant_patterns: patterns,
      memory_record_ids: memory_ids(people, commitments, plans, patterns, index)
    }
  end

  defp participant_ids(account_id, conversation_id, index) do
    from_members =
      try do
        import Ecto.Query

        from(m in OpalCore.Messaging.ConversationMember,
          where: m.conversation_id == ^conversation_id and m.user_id != ^account_id,
          select: m.user_id
        )
        |> Repo.all()
      rescue
        _ -> []
      end

    from_entities =
      case index do
        %{key_entities: %{"people" => people}} when is_list(people) ->
          Enum.filter(people, fn p -> match?({:ok, _}, Ecto.UUID.cast(p)) end)

        _ ->
          []
      end

    Enum.uniq(from_members ++ from_entities)
  end

  defp serialize_person(%PersonMemory{} = p) do
    facts =
      (p.known_facts || %{})
      |> Enum.map(fn {k, v} ->
        val = if is_map(v), do: v["value"] || v[:value], else: v
        {k, val}
      end)
      |> Map.new()

    %{
      id: p.id,
      account_id: p.account_id,
      person_id: p.person_id,
      relationship_type: p.relationship_type,
      cadence_status: p.cadence_status,
      known_facts: facts,
      open_loops: p.open_loops || [],
      sentiment_trend: p.sentiment_trend,
      behavior_override: p.behavior_override
    }
  end

  defp serialize_plan_private(%PlanMemory{} = p) do
    %{
      id: p.id,
      account_id: p.account_id,
      plan_id: p.plan_id,
      plan_label: p.plan_label,
      time_label: p.time_label,
      place_label: p.place_label,
      status: p.status,
      user_role: p.user_role,
      user_commitments: p.user_commitments || [],
      start_at: p.start_at,
      end_at: p.end_at,
      related_conversation_ids: p.related_conversation_ids || []
    }
  end

  def serialize_plan_shared(%PlanMemory{} = p) do
    %{
      plan_id: p.plan_id,
      plan_label: p.plan_label,
      time_label: p.time_label,
      place_label: p.place_label,
      status: p.status,
      start_at: p.start_at,
      end_at: p.end_at
    }
  end

  defp related_to_people?(_plan, []), do: false
  defp related_to_people?(_plan, _), do: false

  defp memory_ids(people, commitments, plans, patterns, index) do
    %{
      person_memory_ids: Enum.map(people, & &1.id),
      commitment_ids: Enum.map(commitments, & &1.id),
      plan_memory_ids: Enum.map(plans, & &1.id),
      pattern_types: Enum.map(patterns, & &1.type),
      conversation_index_id: index && index.id
    }
  end

  defp overlap?(a, b) do
    cond do
      match?(%DateTime{}, a.start_at) and match?(%DateTime{}, a.end_at) and
          match?(%DateTime{}, b.start_at) and match?(%DateTime{}, b.end_at) ->
        DateTime.compare(a.start_at, b.end_at) != :gt and
          DateTime.compare(b.start_at, a.end_at) != :gt

      is_binary(a.time_label) and is_binary(b.time_label) and a.time_label != "" and
          a.time_label == b.time_label ->
        true

      true ->
        false
    end
  end

  defp suppressed?(account_id, nudge, now) do
    type = to_string(nudge.type)
    ref = nudge[:ref_id]

    q =
      from(n in SurfacedNudge,
        where: n.account_id == ^account_id and n.type == ^type,
        order_by: [desc: n.surfaced_at],
        limit: 5
      )

    q = if ref, do: from(n in q, where: n.ref_id == ^ref), else: q

    case Repo.all(q) do
      [] ->
        false

      rows ->
        Enum.any?(rows, fn r ->
          (match?(%DateTime{}, r.suppressed_until) and
             DateTime.compare(r.suppressed_until, now) == :gt) or
            (match?(%DateTime{}, r.surfaced_at) and
               DateTime.diff(now, r.surfaced_at, :second) < 7 * 86_400 and
               (r.priority || 0) >= (nudge.priority || 0))
        end)
    end
  end
end
