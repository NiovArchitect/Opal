defmodule OpalCore.GraphPeople do
  @moduledoc """
  Repair #18 adoption wave 1 - the graph/people cluster.

  One derivation per concept (gyroscope law); no surface re-derives
  what these projections serve:

  - ST-A intentions: durable owner-scoped intention rows; progress is
    derived HERE from the existing plan records (the kept record is
    real plans with that person) and nowhere else.
  - ST-B ideas shelf: sparks are the owner's own idea-door plans
    (SharedPlan rows whose alignment entry is the idea door); starters
    are derived at read time from the owner's own celebrations and
    plan history, each carrying the basis line that justifies it - a
    starter whose basis fact dies disappears on the next read because
    it is never stored.
  - 4.C10 working goals: durable owner-scoped goal rows; the status
    line is derived HERE from the linked SharedPlan rows only.
  - 4.C1 holding counters: one counter set read from the same stores
    the surfaces read (plans, pending answers and revisions, durable
    preference memories, the connections ledger projection). The chat
    answer and the holding endpoint both serve THIS map, so the
    figures agree by construction; Opal never estimates.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Repo
  alias OpalCore.Settings.Connections
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.RelationshipIntention
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.WorkingGoal

  @active_statuses ~w(tentative agreed changed)
  @stale_person_days 45
  @celebration_starter_days 60

  # =====================================================================
  # ST-A - relationship intentions
  # =====================================================================

  def create_intention(owner_id, attrs)
      when is_binary(owner_id) and is_map(attrs) do
    subject_id = attrs["subject_user_id"] || attrs[:subject_user_id]
    title = attrs["title"] || attrs[:title]

    cond do
      not uuid?(subject_id) ->
        {:error, :invalid_subject}

      subject_id == owner_id ->
        {:error, :invalid_subject}

      not Repo.exists?(from(u in User, where: u.id == ^subject_id)) ->
        {:error, :invalid_subject}

      not is_binary(title) or String.trim(title) == "" ->
        {:error, :invalid_title}

      true ->
        %RelationshipIntention{owner_user_id: owner_id, subject_user_id: subject_id}
        |> RelationshipIntention.changeset(%{
          title: String.trim(title),
          cadence_days: attrs["cadence_days"] || attrs[:cadence_days]
        })
        |> Repo.insert()
        |> case do
          {:ok, intention} -> {:ok, intention_projection(intention)}
          {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
        end
    end
  end

  def create_intention(_, _), do: {:error, :invalid}

  def list_intentions(owner_id, opts \\ []) when is_binary(owner_id) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    from(i in RelationshipIntention,
      where: i.owner_user_id == ^owner_id,
      order_by: [asc: i.inserted_at]
    )
    |> Repo.all()
    |> Enum.map(&intention_projection(&1, now: now))
  end

  def list_intentions(_, _), do: []

  def delete_intention(owner_id, intention_id)
      when is_binary(owner_id) and is_binary(intention_id) do
    case Repo.get(RelationshipIntention, intention_id) do
      %RelationshipIntention{owner_user_id: ^owner_id} = intention ->
        Repo.delete(intention)

      _ ->
        {:error, :not_found}
    end
  end

  def delete_intention(_, _), do: {:error, :not_found}

  @doc """
  Record the ONE permitted missed-window surfacing for an intention,
  against the last-kept plan it concerns. After this, the projection's
  `missed_needs_surface` is false until a NEWER kept plan lands and
  its own window is missed - the surfacing can never repeat for the
  same kept record.
  """
  def mark_missed_surfaced(owner_id, intention_id)
      when is_binary(owner_id) and is_binary(intention_id) do
    case Repo.get(RelationshipIntention, intention_id) do
      %RelationshipIntention{owner_user_id: ^owner_id} = intention ->
        projection = intention_projection(intention)

        cond do
          not projection["missed"] ->
            {:error, :not_missed}

          is_nil(projection["last_kept"]) ->
            {:error, :not_missed}

          true ->
            intention
            |> RelationshipIntention.changeset(%{
              missed_surfaced_for_plan_id: projection["last_kept"]["plan_id"]
            })
            |> Repo.update()
            |> case do
              {:ok, updated} -> {:ok, intention_projection(updated)}
              {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
            end
        end

      _ ->
        {:error, :not_found}
    end
  end

  def mark_missed_surfaced(_, _), do: {:error, :not_found}

  @doc """
  The ONE intention projection. GUARDRAIL (product law): every field
  describes the OWNER's own rhythm - their stated words, their kept
  plans, their next expected window. There is deliberately no field
  about the subject: no score, no grade, no per-person metric, and
  the subject's own surfaces never receive this projection (the list
  is owner-scoped at the query).
  """
  def intention_projection(%RelationshipIntention{} = intention, opts \\ []) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    kept = kept_plans_with(intention.owner_user_id, intention.subject_user_id, now)
    last = List.last(kept)
    last_at = if last, do: kept_at(last), else: nil

    next_window_at =
      if intention.cadence_days && last_at do
        DateTime.add(last_at, intention.cadence_days * 86_400, :second)
      end

    missed = next_window_at != nil and DateTime.compare(now, next_window_at) == :gt

    needs_surface =
      missed and
        (is_nil(intention.missed_surfaced_for_plan_id) or
           (last != nil and intention.missed_surfaced_for_plan_id != last.id))

    subject_name = display_name(intention.subject_user_id) || "them"

    %{
      "id" => intention.id,
      "title" => intention.title,
      "subject_user_id" => intention.subject_user_id,
      "subject_name" => subject_name,
      "cadence_days" => intention.cadence_days,
      "kept_count" => length(kept),
      "last_kept" =>
        if last do
          %{
            "plan_id" => last.id,
            "title" => last.title,
            "when_label" => last.time_label,
            "at" => DateTime.to_iso8601(kept_at(last))
          }
        end,
      "next_window_at" => if(next_window_at, do: DateTime.to_iso8601(next_window_at)),
      "missed" => missed,
      "missed_needs_surface" => needs_surface,
      "status_line" =>
        intention_status_line(intention, subject_name, last, next_window_at, missed),
      "created_at" => DateTime.to_iso8601(intention.inserted_at)
    }
  end

  defp intention_status_line(_i, subject_name, nil, _next, _missed) do
    "You have not kept a plan with #{subject_name} yet. Your intention is on your list, in your words."
  end

  defp intention_status_line(_i, subject_name, last, nil, _missed) do
    "Last time you kept a plan with #{subject_name}: #{last.title}. No rhythm set, so there is no next window to miss."
  end

  defp intention_status_line(_i, subject_name, last, next_window_at, missed) do
    date = Calendar.strftime(next_window_at, "%b %d")

    if missed do
      "Last time you kept a plan with #{subject_name}: #{last.title}. The window you set for the next one passed around #{date}."
    else
      "Last time you kept a plan with #{subject_name}: #{last.title}. At your rhythm, the next one lands around #{date}."
    end
  end

  # The kept record: real plans the owner and the subject share, that
  # actually happened or were committed to and whose time has come -
  # completed plans, plus agreed/changed plans whose start has passed.
  # A tentative idea neither of them kept is not a kept plan.
  defp kept_plans_with(owner_id, subject_id, now) do
    owner_id
    |> plans_involving()
    |> Enum.filter(fn plan ->
      subject_id in SocialFlow.plan_participant_ids(plan) and kept?(plan, now)
    end)
    |> Enum.sort_by(&kept_at/1, DateTime)
  end

  defp kept?(%SharedPlan{status: "completed"}, _now), do: true

  defp kept?(%SharedPlan{status: status, start_at: %DateTime{} = start}, now)
       when status in ["agreed", "changed"] do
    DateTime.compare(start, now) != :gt
  end

  defp kept?(_, _), do: false

  defp kept_at(%SharedPlan{} = plan) do
    plan.completed_at || plan.start_at || plan.inserted_at
  end

  # =====================================================================
  # 4.C10 - things you are working toward
  # =====================================================================

  def create_goal(owner_id, attrs) when is_binary(owner_id) and is_map(attrs) do
    title = attrs["title"] || attrs[:title]

    if is_binary(title) and String.trim(title) != "" do
      %WorkingGoal{owner_user_id: owner_id}
      |> WorkingGoal.changeset(%{title: String.trim(title)})
      |> Repo.insert()
      |> case do
        {:ok, goal} -> {:ok, goal_projection(goal)}
        {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
      end
    else
      {:error, :invalid_title}
    end
  end

  def create_goal(_, _), do: {:error, :invalid}

  def list_goals(owner_id) when is_binary(owner_id) do
    from(g in WorkingGoal, where: g.owner_user_id == ^owner_id, order_by: [asc: g.inserted_at])
    |> Repo.all()
    |> Enum.map(&goal_projection/1)
  end

  def list_goals(_), do: []

  def delete_goal(owner_id, goal_id) when is_binary(owner_id) and is_binary(goal_id) do
    case fetch_goal(owner_id, goal_id) do
      %WorkingGoal{} = goal -> Repo.delete(goal)
      nil -> {:error, :not_found}
    end
  end

  def delete_goal(_, _), do: {:error, :not_found}

  def link_goal_plan(owner_id, goal_id, plan_id)
      when is_binary(owner_id) and is_binary(goal_id) and is_binary(plan_id) do
    with %WorkingGoal{} = goal <- fetch_goal(owner_id, goal_id) || :not_found,
         {:ok, _plan} <- SocialFlow.get_plan_for_user(plan_id, owner_id) do
      ids = Enum.uniq(goal.linked_plan_ids ++ [plan_id])

      goal
      |> WorkingGoal.changeset(%{linked_plan_ids: ids})
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, goal_projection(updated)}
        {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
      end
    else
      :not_found -> {:error, :not_found}
      {:error, :not_found} -> {:error, :plan_not_found}
      {:error, _} -> {:error, :plan_not_found}
    end
  end

  def link_goal_plan(_, _, _), do: {:error, :invalid}

  def unlink_goal_plan(owner_id, goal_id, plan_id)
      when is_binary(owner_id) and is_binary(goal_id) and is_binary(plan_id) do
    case fetch_goal(owner_id, goal_id) do
      %WorkingGoal{} = goal ->
        ids = Enum.reject(goal.linked_plan_ids, &(&1 == plan_id))

        goal
        |> WorkingGoal.changeset(%{linked_plan_ids: ids})
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, goal_projection(updated)}
          {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
        end

      nil ->
        {:error, :not_found}
    end
  end

  def unlink_goal_plan(_, _, _), do: {:error, :invalid}

  defp fetch_goal(owner_id, goal_id) do
    if uuid?(goal_id) do
      case Repo.get(WorkingGoal, goal_id) do
        %WorkingGoal{owner_user_id: ^owner_id} = goal -> goal
        _ -> nil
      end
    end
  end

  @doc """
  The ONE goal projection. The status line is derived from the linked
  plan rows only: a goal with no linked activity says so, in those
  words; Opal summarizes what the linked plans show and invents
  nothing beyond them.
  """
  def goal_projection(%WorkingGoal{} = goal, opts \\ []) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    plans =
      goal.linked_plan_ids
      |> Enum.map(&Repo.get(SharedPlan, &1))
      |> Enum.reject(&is_nil/1)

    completed =
      plans
      |> Enum.filter(&(&1.status == "completed"))
      |> Enum.sort_by(&kept_at/1, DateTime)

    upcoming =
      plans
      |> Enum.filter(fn p ->
        p.status in @active_statuses and
          (is_nil(p.start_at) or DateTime.compare(p.start_at, now) != :lt)
      end)
      |> Enum.sort_by(fn p -> p.start_at || p.inserted_at end, DateTime)

    last_completed = List.last(completed)
    next_upcoming = List.first(upcoming)

    %{
      "id" => goal.id,
      "title" => goal.title,
      "linked_plan_ids" => goal.linked_plan_ids,
      "linked_count" => length(plans),
      "completed_count" => length(completed),
      "last_completed" =>
        if last_completed do
          %{
            "plan_id" => last_completed.id,
            "title" => last_completed.title,
            "at" => DateTime.to_iso8601(kept_at(last_completed))
          }
        end,
      "next_upcoming" =>
        if next_upcoming do
          %{
            "plan_id" => next_upcoming.id,
            "title" => next_upcoming.title,
            "when_label" => next_upcoming.time_label
          }
        end,
      "status_line" => goal_status_line(goal, plans, last_completed, next_upcoming),
      "created_at" => DateTime.to_iso8601(goal.inserted_at)
    }
  end

  defp goal_status_line(_goal, [], _last, _next) do
    "No plans linked yet. Link a plan and this will keep itself up to date from it - Opal does not guess progress."
  end

  defp goal_status_line(_goal, _plans, nil, nil) do
    "Plans are linked, and none of them has finished or is coming up right now. Nothing to report yet."
  end

  defp goal_status_line(_goal, _plans, last, nil) when not is_nil(last) do
    "Last finished: #{last.title}. Nothing linked is coming up right now."
  end

  defp goal_status_line(_goal, _plans, nil, next) when not is_nil(next) do
    "Next up: #{next.title}#{if next.time_label, do: " - #{next.time_label}", else: ""}. Nothing linked has finished yet."
  end

  defp goal_status_line(_goal, _plans, last, next) do
    "Last finished: #{last.title}. Next up: #{next.title}#{if next.time_label, do: " - #{next.time_label}", else: ""}."
  end

  # =====================================================================
  # ST-B - the ideas shelf, with starters
  # =====================================================================

  @doc """
  The shelf: the owner's saved sparks plus starters derived from the
  owner's own truth. Sparks are real SharedPlan rows born at the idea
  door (alignment entry "c2-idea"); a promoted spark's state is read
  from the plan it promoted to, never from a local flag.
  """
  def shelf(owner_id, opts \\ []) when is_binary(owner_id) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    %{
      "sparks" => Enum.map(spark_plans(owner_id), &spark_projection/1),
      "starters" => starters(owner_id, now)
    }
  end

  def shelf(_, _), do: %{"sparks" => [], "starters" => []}

  defp spark_plans(owner_id) do
    from(p in SharedPlan,
      where:
        p.created_by_user_id == ^owner_id and p.status != "cancelled" and
          fragment("? ->> 'entry' = ?", p.alignment, "c2-idea"),
      order_by: [desc: p.inserted_at]
    )
    |> Repo.all()
  end

  def spark_projection(%SharedPlan{} = spark) do
    promoted_id = get_in(spark.alignment || %{}, ["promoted_to_plan_id"])

    promoted =
      if is_binary(promoted_id) do
        case Repo.get(SharedPlan, promoted_id) do
          %SharedPlan{} = plan ->
            %{"plan_id" => plan.id, "title" => plan.title, "status" => plan.status}

          _ ->
            nil
        end
      end

    %{
      "id" => spark.id,
      "title" => spark.title,
      "state" => if(promoted, do: "promoted", else: "spark"),
      "promoted_plan" => promoted,
      "prefill" => %{
        "title" => spark.title,
        "location" => spark.location,
        "time_label" => spark.time_label,
        "participant_user_ids" =>
          SocialFlow.plan_participant_ids(spark) |> Enum.reject(&(&1 == spark.created_by_user_id))
      },
      "created_at" => DateTime.to_iso8601(spark.inserted_at)
    }
  end

  @doc """
  Promote one spark to a real plan, through the existing graph-create
  door (the same authority Center and Graphs create through). The new
  plan is pre-filled from the spark; nothing is sent to anyone - a
  plan is created, and the spark records which plan it became, so the
  spark's state follows the plan on every later read. Promoting an
  already-promoted spark returns the plan it already became.
  """
  def promote_spark(owner_id, spark_id, overrides \\ %{})
      when is_binary(owner_id) and is_binary(spark_id) and is_map(overrides) do
    spark =
      if uuid?(spark_id) do
        case Repo.get(SharedPlan, spark_id) do
          %SharedPlan{created_by_user_id: ^owner_id} = plan -> plan
          _ -> nil
        end
      end

    cond do
      is_nil(spark) ->
        {:error, :not_found}

      get_in(spark.alignment || %{}, ["entry"]) != "c2-idea" ->
        {:error, :not_a_spark}

      is_binary(get_in(spark.alignment || %{}, ["promoted_to_plan_id"])) ->
        promoted_id = get_in(spark.alignment, ["promoted_to_plan_id"])

        case Repo.get(SharedPlan, promoted_id) do
          %SharedPlan{} = plan -> {:ok, spark_projection(spark), SocialFlow.plan_payload(plan)}
          _ -> {:error, :not_found}
        end

      true ->
        prefill = spark_projection(spark)["prefill"]

        attrs = %{
          "title" => overrides["title"] || prefill["title"],
          "location" => overrides["location"] || prefill["location"],
          "time_label" => overrides["time_label"] || prefill["time_label"],
          "participant_user_ids" =>
            overrides["participant_user_ids"] || prefill["participant_user_ids"],
          "source_plan_id" => spark.id,
          "force_new" => true,
          "entry" => "shelf-promote"
        }

        case SocialFlow.create_plan_from_graph_create(owner_id, attrs) do
          {:ok, plan, _participants, _deduped} ->
            alignment =
              (spark.alignment || %{})
              |> Map.put("promoted_to_plan_id", plan.id)
              |> Map.put(
                "promoted_at",
                DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
              )

            {:ok, updated_spark} =
              spark
              |> SharedPlan.changeset(%{alignment: alignment})
              |> Repo.update()

            {:ok, spark_projection(updated_spark), SocialFlow.plan_payload(plan)}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def promote_spark(_, _, _), do: {:error, :invalid}

  # Starters: derived at read time, never stored. Each carries the
  # basis line that justifies it; when the basis fact dies (the
  # celebration is deleted, a plan with that person lands), the
  # starter is simply not derived on the next read.
  defp starters(owner_id, now) do
    celebration_starters(owner_id, now) ++ stale_person_starters(owner_id, now)
  end

  defp celebration_starters(owner_id, now) do
    today = DateTime.to_date(now)

    case Celebrations.list_for_user(owner_id) do
      {:ok, celebrations} ->
        celebrations
        |> Enum.map(fn c ->
          next = Celebrations.next_occurrence(today, c.month, c.day)
          days = Date.diff(next, today)

          if days >= 0 and days <= @celebration_starter_days do
            date_label = Celebrations.Celebration.date_label(c.month, c.day)

            %{
              "id" => "celebration-#{c.id}",
              "kind" => "celebration",
              "title" => "Plan something for #{c.person_name}",
              "basis_line" =>
                "You saved #{c.person_name}'s #{c.kind} - it is coming up on #{date_label}.",
              "basis_ref" => c.id,
              "prefill" => %{
                "title" => "Something for #{c.person_name}'s #{c.kind}",
                "participant_user_ids" => []
              }
            }
          end
        end)
        |> Enum.reject(&is_nil/1)

      _ ->
        []
    end
  end

  defp stale_person_starters(owner_id, now) do
    plans = plans_involving(owner_id, all: true)

    # "Something coming up" means an active plan that has not ended
    # yet - an old agreed plan in the past is a kept plan, not an
    # upcoming one (the same plan-time reading the intention
    # projection uses for its kept record).
    upcoming_with =
      plans
      |> Enum.filter(
        &(&1.status in @active_statuses and
            DateTime.compare(&1.end_at || &1.start_at || now, now) != :lt)
      )
      |> Enum.flat_map(&SocialFlow.plan_participant_ids/1)
      |> MapSet.new()

    last_by_person =
      plans
      |> Enum.reject(&(&1.status in ["cancelled", "expired"]))
      |> Enum.reduce(%{}, fn plan, acc ->
        at = plan.start_at || plan.updated_at

        plan
        |> SocialFlow.plan_participant_ids()
        |> Enum.reject(&(&1 == owner_id))
        |> Enum.reduce(acc, fn person_id, inner ->
          case Map.get(inner, person_id) do
            nil ->
              Map.put(inner, person_id, at)

            existing ->
              if DateTime.compare(at, existing) == :gt,
                do: Map.put(inner, person_id, at),
                else: inner
          end
        end)
      end)

    last_by_person
    |> Enum.filter(fn {person_id, last_at} ->
      not MapSet.member?(upcoming_with, person_id) and
        DateTime.diff(now, last_at, :day) >= @stale_person_days
    end)
    |> Enum.sort_by(fn {_person_id, last_at} -> last_at end, DateTime)
    |> Enum.take(3)
    |> Enum.map(fn {person_id, last_at} ->
      name = display_name(person_id) || "them"
      date = Calendar.strftime(last_at, "%b %d")

      %{
        "id" => "person-#{person_id}",
        "kind" => "person",
        "title" => "Plan something with #{name}",
        "basis_line" =>
          "You last planned with #{name} on #{date}, and nothing is coming up with them.",
        "basis_ref" => person_id,
        "prefill" => %{
          "title" => "Time with #{name}",
          "participant_user_ids" => [person_id]
        }
      }
    end)
  end

  # =====================================================================
  # 4.C1 - Opal can say what it holds
  # =====================================================================

  @holding_question_fragments [
    "what are you holding",
    "what do you hold for me",
    "what are you holding for me"
  ]

  @doc "True when a Center message is asking Opal what it holds (4.C1)."
  def holding_question?(text) when is_binary(text) do
    normalized =
      text
      |> String.downcase()
      |> String.replace(~r/[^a-z0-9 ]/, " ")
      |> String.replace(~r/\s+/, " ")
      |> String.trim()

    Enum.any?(@holding_question_fragments, &String.contains?(normalized, &1))
  end

  def holding_question?(_), do: false

  @doc """
  The ONE holding counter set (4.C1). Every figure is read at answer
  time from the same store its surface reads:

  - plans in motion: the owner's active plans (the Graphs list's own
    status set);
  - approvals waiting: the owner's unanswered participant rows on
    active plans, plus proposed revisions that name the owner as a
    required approver;
  - memories held: the owner's durable preference memory records -
    the exact list "What Opal remembers" renders;
  - sources connected: the connections ledger projection's rows in a
    working state - the exact payload Settings renders.

  Each figure carries the surface it links into. Opal never estimates:
  a figure that cannot be read is not stated.
  """
  def holding(owner_id) when is_binary(owner_id) do
    plans_in_motion =
      Repo.aggregate(
        from(p in SharedPlan,
          where:
            p.status in ^@active_statuses and
              (p.created_by_user_id == ^owner_id or
                 p.id in subquery(participant_plan_ids_query(owner_id)))
        ),
        :count,
        :id
      )

    pending_answers =
      Repo.aggregate(
        from(pp in PlanParticipant,
          join: p in SharedPlan,
          on: pp.plan_id == p.id,
          where:
            pp.user_id == ^owner_id and p.status in ^@active_statuses and
              pp.response_state in ^~w(pending proposed tentative)
        ),
        :count,
        :id
      )

    pending_revisions =
      Repo.aggregate(
        from(r in PlanRevision,
          where:
            r.status == "proposed" and
              fragment("? = ANY(?)", type(^owner_id, :binary_id), r.required_approvals)
        ),
        :count,
        :id
      )

    memories_held =
      owner_id |> List.wrap() |> DurablePreferenceMemory.list_for_owners() |> length()

    sources_connected =
      owner_id
      |> Connections.build()
      |> Map.get("connections", [])
      |> Enum.count(fn row -> row["status"] in ["working", "working_test"] end)

    counters = %{
      "plans_in_motion" => plans_in_motion,
      "approvals_waiting" => pending_answers + pending_revisions,
      "memories_held" => memories_held,
      "sources_connected" => sources_connected
    }

    %{
      "counters" => counters,
      "links" => %{
        "plans_in_motion" => "graphs",
        "approvals_waiting" => "graphs",
        "memories_held" => "what-opal-remembers",
        "sources_connected" => "connections"
      },
      "answer_text" =>
        "Here is what I am holding for you: #{plans_in_motion} #{plural(plans_in_motion, "plan")} in motion, " <>
          "#{counters["approvals_waiting"]} waiting on your answer, " <>
          "#{memories_held} #{plural(memories_held, "memory", "memories")} held, and " <>
          "#{sources_connected} #{plural(sources_connected, "source")} connected."
    }
  end

  def holding(_), do: {:error, :invalid}

  defp plural(1, singular, _plural_form), do: singular
  defp plural(_n, singular, plural_form), do: plural_form
  defp plural(n, singular), do: plural(n, singular, singular <> "s")

  # =====================================================================
  # shared helpers
  # =====================================================================

  defp participant_plan_ids_query(user_id) do
    from(pp in PlanParticipant, where: pp.user_id == ^user_id, select: pp.plan_id)
  end

  defp plans_involving(user_id, opts \\ []) do
    participant_ids =
      from(pp in PlanParticipant, where: pp.user_id == ^user_id, select: pp.plan_id)
      |> Repo.all()

    query =
      from(p in SharedPlan,
        where: p.created_by_user_id == ^user_id or p.id in ^participant_ids
      )

    query =
      if Keyword.get(opts, :all) do
        query
      else
        from(p in query, where: p.status not in ^["cancelled", "expired"])
      end

    Repo.all(query)
  end

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) ->
        case String.trim(name) do
          "" -> nil
          trimmed -> trimmed
        end

      _ ->
        nil
    end
  end

  defp uuid?(value) when is_binary(value), do: match?({:ok, _}, Ecto.UUID.cast(value))
  defp uuid?(_), do: false
end
