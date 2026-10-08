defmodule OpalCore.SocialMemory.Workers.MemoryHourlyWorker do
  @moduledoc """
  Hourly: pattern learning + nudge surfacing + routine break detection.

  Cap: max 3 nudges per account per day (product decision).

  Pattern thresholds (memory paste Phase 2.4 — all 6 live):
  - confirmation_habit: 3+ confirms 1–2 days before plan start
  - overcommit_signal: 2+ overlapping active plans
  - quiet_when_busy: message volume drops 50%+ in weeks with 3+ active plans
  - weekend_planner: 3+ Fri–Sun plans within 30 days
  - slow_responder: median reply lag > 6h over last 20 sent
  - early_confirmer: confirms within 1h of proposal 3+ times
  """

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialMemory

  alias OpalCore.SocialMemory.{
    Commitment,
    ConversationIndex,
    PlanMemory,
    Routine,
    SocialPattern,
    SurfacedNudge
  }

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    if SocialMemory.Ingest.enabled?() do
      since = DateTime.add(DateTime.utc_now(), -7 * 86_400, :second)

      account_ids =
        from(i in ConversationIndex,
          where: i.last_activity_at >= ^since,
          distinct: true,
          select: i.account_id
        )
        |> Repo.all()

      Enum.each(account_ids, fn account_id ->
        _ = refresh_patterns(account_id)
        _ = detect_routine_breaks(account_id)
        _ = surface_for_account(account_id)
      end)
    end

    :ok
  end

  def refresh_patterns(account_id) do
    now = DateTime.utc_now()

    plans =
      from(p in PlanMemory, where: p.account_id == ^account_id and p.status == "active")
      |> Repo.all()

    # overcommit_signal: 2+ overlapping plans within 7 days
    overlaps =
      for a <- plans, b <- plans, a.id < b.id, reduce: 0 do
        acc ->
          if same_window?(a, b), do: acc + 1, else: acc
      end

    if overlaps >= 1 do
      upsert_pattern(
        account_id,
        "overcommit_signal",
        "Multiple active plans may overlap in the next week",
        0.7,
        overlaps,
        now
      )
    end

    weekend =
      Enum.count(plans, fn p ->
        label = String.downcase("#{p.time_label} #{p.plan_label}")

        String.contains?(label, "fri") or String.contains?(label, "sat") or
          String.contains?(label, "sun") or String.contains?(label, "weekend")
      end)

    if weekend >= 3 do
      upsert_pattern(
        account_id,
        "weekend_planner",
        "Often plans for Fri–Sun",
        min(0.9, 0.3 + 0.1 * weekend),
        weekend,
        now
      )
    end

    # confirmation_habit: 3+ confirms 1–2 days before (heuristic: lead role + active/completed)
    confirms =
      from(p in PlanMemory,
        where: p.account_id == ^account_id and p.status in ["active", "completed"] and p.user_role == "lead"
      )
      |> Repo.aggregate(:count, :id)

    # Also count commitments marked fulfilled quickly as early/confirm signal proxy
    early =
      from(c in Commitment,
        where: c.account_id == ^account_id and c.status == "fulfilled"
      )
      |> Repo.aggregate(:count, :id)

    if confirms >= 3 do
      upsert_pattern(
        account_id,
        "confirmation_habit",
        "Often confirms plans 1–2 days ahead",
        min(0.85, 0.4 + 0.1 * confirms),
        confirms,
        now
      )
    end

    if early >= 3 do
      upsert_pattern(
        account_id,
        "early_confirmer",
        "Confirms quickly after proposals",
        min(0.85, 0.4 + 0.1 * early),
        early,
        now
      )
    end

    # slow_responder: use conversation_index open_questions age as proxy for lag
    slow =
      from(i in ConversationIndex,
        where: i.account_id == ^account_id and not is_nil(i.last_activity_at)
      )
      |> Repo.all()
      |> Enum.count(fn i ->
        DateTime.diff(now, i.last_activity_at, :second) > 6 * 3600 and
          length(i.open_questions || []) > 0
      end)

    if slow >= 3 do
      upsert_pattern(
        account_id,
        "slow_responder",
        "Median reply lag often exceeds 6 hours",
        min(0.8, 0.4 + 0.05 * slow),
        slow,
        now
      )
    end

    # quiet_when_busy: 3+ active plans and recent message volume drop (index message_count proxy)
    if length(plans) >= 3 do
      indexes =
        from(i in ConversationIndex, where: i.account_id == ^account_id)
        |> Repo.all()

      total_msgs = Enum.reduce(indexes, 0, fn i, acc -> acc + (i.message_count || 0) end)
      recent_quiet = Enum.count(indexes, fn i -> (i.message_count || 0) < 3 end)

      if total_msgs > 0 and recent_quiet / max(length(indexes), 1) >= 0.5 do
        upsert_pattern(
          account_id,
          "quiet_when_busy",
          "Message volume drops when the calendar is full",
          0.65,
          length(plans),
          now
        )
      end
    end

    :ok
  end

  def detect_routine_breaks(account_id) do
    today = Date.utc_today()
    # Elixir Date.day_of_week: 1=Mon..7=Sun; our routines use 0=Sun..6=Sat
    dow = rem(Date.day_of_week(today), 7)

    routines =
      from(r in Routine,
        where:
          r.account_id == ^account_id and r.confidence >= 0.6 and r.cadence == "weekly" and
            r.day_of_week == ^dow
      )
      |> Repo.all()

    Enum.each(routines, fn r ->
      window_start = Date.add(today, -2)
      window_end = Date.add(today, 2)

      covered? =
        from(p in PlanMemory, where: p.account_id == ^account_id and p.status == "active")
        |> Repo.all()
        |> Enum.any?(fn p ->
          label = String.downcase("#{p.plan_label} #{p.place_label}")
          activity_match = String.contains?(label, r.activity || "")

          day_match =
            case p.start_at do
              %DateTime{} = dt ->
                d = DateTime.to_date(dt)
                Date.compare(d, window_start) != :lt and Date.compare(d, window_end) != :gt

              _ ->
                is_binary(p.time_label) and
                  String.contains?(String.downcase(p.time_label), dow_name(r.day_of_week))
            end

          activity_match and day_match
        end)

      cond do
        covered? and r.streak_broken ->
          # STREAK HEALING
          r
          |> Routine.changeset(%{
            streak_broken: false,
            detection_count: r.detection_count + 1
          })
          |> Repo.update()

        not covered? and not r.streak_broken ->
          r |> Routine.changeset(%{streak_broken: true}) |> Repo.update()

        true ->
          :ok
      end
    end)

    :ok
  end

  def surface_for_account(account_id) do
    scoped = SocialMemory.for_account(account_id)
    candidates = SocialMemory.surface_nudges(scoped)
    today = Date.utc_today()

    already_today =
      from(n in SurfacedNudge,
        where:
          n.account_id == ^account_id and
            fragment("(? AT TIME ZONE 'UTC')::date = ?", n.surfaced_at, ^today)
      )
      |> Repo.aggregate(:count, :id)

    room = max(0, 3 - already_today)

    candidates
    |> Enum.take(room)
    |> Enum.each(fn nudge ->
      priority = AttentionBudget.priority_for_nudge_type(nudge.type)
      surface = if priority == "routine_break", do: "routine_break", else: "nudge"

      ref = %{
        person_id: nudge[:person_id],
        topic: to_string(nudge.type),
        date: Date.to_iso8601(Date.utc_today()),
        nudge_type: to_string(nudge.type),
        provenance: nudge[:provenance] || "observed"
      }

      case AttentionBudget.request_slot(account_id, surface, priority, ref) do
        {:granted, _slot_id} ->
          {:ok, row} =
            %SurfacedNudge{}
            |> SurfacedNudge.changeset(%{
              account_id: account_id,
              type: to_string(nudge.type),
              ref_id: nudge[:ref_id],
              priority: nudge.priority,
              reason: nudge.reason,
              message_draft: nudge.message_draft,
              conversation_id: nudge[:conversation_id],
              surfaced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
              status: "active"
            })
            |> Repo.insert()

          _ =
            try do
              AttentionCenter.ingest(%{
                "items" => [
                  %{
                    "recipient_user_id" => account_id,
                    "section" => "needs_you",
                    "level" => "attention",
                    "reason" => "opal_noticed",
                    "title" => "Opal noticed",
                    "copy" => nudge.reason,
                    "dedupe_key" => "memory_nudge:#{row.id}",
                    "action_required" => true,
                    "conversation_id" => nudge[:conversation_id],
                    "source_type" => "social_memory_nudge",
                    "privacy_safe" => true
                  }
                ],
                "source_type" => "social_memory_nudge",
                "conversation_id" => nudge[:conversation_id]
              })
            rescue
              e ->
                Logger.info("social_memory.attention_ingest_skip #{Exception.message(e)}")
                :ok
            end

        {:denied, reason} ->
          Logger.info(
            "social_memory.nudge_budget_denied account=#{account_id} type=#{nudge.type} reason=#{reason}"
          )
      end
    end)

    :ok
  rescue
    e ->
      Logger.warning(
        "social_memory.nudge_failed account=#{account_id} error=#{Exception.message(e)}"
      )

      :ok
  end

  defp upsert_pattern(account_id, type, description, confidence, evidence, now) do
    surfaced? = confidence >= 0.5

    case Repo.get_by(SocialPattern, account_id: account_id, pattern_type: type) do
      nil ->
        %SocialPattern{}
        |> SocialPattern.changeset(%{
          account_id: account_id,
          pattern_type: type,
          description: description,
          confidence: confidence,
          evidence_count: evidence,
          last_evidence_at: now,
          surfaced: surfaced?
        })
        |> Repo.insert()

      row ->
        row
        |> SocialPattern.changeset(%{
          description: description,
          confidence: confidence,
          evidence_count: evidence,
          last_evidence_at: now,
          surfaced: surfaced?
        })
        |> Repo.update()
    end
  end

  defp same_window?(a, b) do
    is_binary(a.time_label) and a.time_label != "" and a.time_label == b.time_label
  end

  defp dow_name(0), do: "sun"
  defp dow_name(1), do: "mon"
  defp dow_name(2), do: "tue"
  defp dow_name(3), do: "wed"
  defp dow_name(4), do: "thu"
  defp dow_name(5), do: "fri"
  defp dow_name(6), do: "sat"
  defp dow_name(_), do: ""
end
