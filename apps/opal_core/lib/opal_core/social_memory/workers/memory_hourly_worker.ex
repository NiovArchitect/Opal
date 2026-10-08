defmodule OpalCore.SocialMemory.Workers.MemoryHourlyWorker do
  @moduledoc """
  Hourly: pattern learning + nudge surfacing for accounts with recent activity.
  Cap: max 3 nudges per account per day (product decision).
  """

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{ConversationIndex, PlanMemory, SocialPattern, SurfacedNudge}

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
      upsert_pattern(account_id, "overcommit_signal",
        "Multiple active plans may overlap in the next week", 0.7, overlaps, now)
    end

    weekend =
      Enum.count(plans, fn p ->
        label = String.downcase("#{p.time_label} #{p.plan_label}")
        String.contains?(label, "fri") or String.contains?(label, "sat") or
          String.contains?(label, "sun") or String.contains?(label, "weekend")
      end)

    if weekend >= 3 do
      upsert_pattern(account_id, "weekend_planner",
        "Often plans for Fri–Sun", min(0.9, 0.3 + 0.1 * weekend), weekend, now)
    end

    :ok
  end

  def surface_for_account(account_id) do
    scoped = SocialMemory.for_account(account_id)
    candidates = SocialMemory.surface_nudges(scoped)
    today = Date.utc_today()

    already_today =
      from(n in SurfacedNudge,
        where: n.account_id == ^account_id and fragment("(? AT TIME ZONE 'UTC')::date = ?", n.surfaced_at, ^today)
      )
      |> Repo.aggregate(:count, :id)

    room = max(0, 3 - already_today)

    candidates
    |> Enum.take(room)
    |> Enum.each(fn nudge ->
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
    end)

    :ok
  rescue
    e ->
      Logger.warning("social_memory.nudge_failed account=#{account_id} error=#{Exception.message(e)}")
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
end
