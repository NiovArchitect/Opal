defmodule OpalCore.SocialMemory.Workers.MemoryHygieneWorker do
  @moduledoc """
  Weekly memory hygiene (Paste E Phase 3).

  READ-ONLY except decay / flag / archive — never deletes. Logs every touch.

  Founder-tunable:
  - known_facts: 90d → *0.7, 180d → *0.5, confidence <0.3 → needs_revalidation
  - routines: 60d decay, 120d archived
  - social_patterns: evidence older than 90d stops counting toward confidence
  - outcome_signals: 180d decay (delegates to OutcomeLearning.effective_strength); 365d archive
  """

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.OutcomeLearning
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{OutcomeSignal, PersonMemory, Routine, SocialPattern}

  # founder-tunable
  @fact_decay_90 0.7
  @fact_decay_180 0.5
  @fact_revalidate_below 0.3
  @routine_decay_days 60
  @routine_archive_days 120
  @pattern_evidence_days 90
  @outcome_archive_days 365

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    account_id = args["account_id"]

    if is_binary(account_id) do
      run_for(account_id)
    else
      ids =
        from(p in PersonMemory, distinct: true, select: p.account_id)
        |> Repo.all()

      Enum.each(ids, &run_for/1)
      :ok
    end
  end

  def run_for(account_id) when is_binary(account_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    f = hygiene_facts(account_id, now)
    r = hygiene_routines(account_id, now)
    p = hygiene_patterns(account_id, now)
    o = hygiene_outcomes(account_id, now)

    Logger.info(
      "memory_hygiene.done account=#{account_id} facts=#{f} routines=#{r} patterns=#{p} outcomes=#{o}"
    )

    {:ok, %{facts: f, routines: r, patterns: p, outcomes: o}}
  end

  defp hygiene_facts(account_id, now) do
    from(p in PersonMemory, where: p.account_id == ^account_id)
    |> Repo.all()
    |> Enum.reduce(0, fn row, acc ->
      facts = row.known_facts || %{}

      {new_facts, touched} =
        Enum.reduce(facts, {%{}, false}, fn {key, val}, {acc_map, t?} ->
          case decay_fact_entry(val, now) do
            {^val, false} ->
              {Map.put(acc_map, key, val), t?}

            {updated, true} ->
              Logger.info(
                "memory_hygiene.fact account=#{account_id} person=#{row.person_id} key=#{key} action=decay_or_flag"
              )

              {Map.put(acc_map, key, updated), true}
          end
        end)

      if touched do
        row
        |> PersonMemory.changeset(%{
          known_facts: new_facts,
          hygiene_touched_at: now
        })
        |> Repo.update()

        acc + 1
      else
        acc
      end
    end)
  end

  defp decay_fact_entry(val, now) when is_map(val) do
    learned = parse_dt(val["learned_at"] || val[:learned_at])
    conf = fact_confidence(val)

    age_days =
      case learned do
        %DateTime{} = dt -> DateTime.diff(now, dt, :second) / 86_400.0
        _ -> 0.0
      end

    {new_conf, flagged} =
      cond do
        age_days >= 180 -> {conf * @fact_decay_180, true}
        age_days >= 90 -> {conf * @fact_decay_90, true}
        true -> {conf, false}
      end

    needs? = new_conf < @fact_revalidate_below

    if flagged or needs? do
      updated =
        val
        |> Map.put("confidence", Float.round(new_conf, 4))
        |> Map.put("needs_revalidation", needs?)
        |> Map.put("hygiene_at", DateTime.to_iso8601(now))

      {updated, true}
    else
      {val, false}
    end
  end

  defp decay_fact_entry(val, _), do: {val, false}

  defp fact_confidence(val) when is_map(val) do
    case val["confidence"] || val[:confidence] do
      c when is_number(c) -> c * 1.0
      _ -> 1.0
    end
  end

  defp hygiene_routines(account_id, now) do
    from(r in Routine, where: r.account_id == ^account_id and r.archived == false)
    |> Repo.all()
    |> Enum.reduce(0, fn r, acc ->
      last = r.last_occurrence_at || r.updated_at || r.inserted_at

      age_days =
        if match?(%DateTime{}, last),
          do: DateTime.diff(now, last, :second) / 86_400.0,
          else: 0.0

      cond do
        age_days >= @routine_archive_days ->
          Logger.info("memory_hygiene.routine account=#{account_id} id=#{r.id} action=archive")

          r
          |> Routine.changeset(%{archived: true, archived_at: now, confidence: min(r.confidence, 0.2)})
          |> Repo.update()

          acc + 1

        age_days >= @routine_decay_days ->
          Logger.info("memory_hygiene.routine account=#{account_id} id=#{r.id} action=decay")
          new_c = Float.round(r.confidence * 0.7, 4)

          r
          |> Routine.changeset(%{confidence: new_c})
          |> Repo.update()

          acc + 1

        true ->
          acc
      end
    end)
  end

  defp hygiene_patterns(account_id, now) do
    cutoff = DateTime.add(now, -@pattern_evidence_days * 86_400, :second)

    from(s in SocialPattern, where: s.account_id == ^account_id and s.archived == false)
    |> Repo.all()
    |> Enum.reduce(0, fn s, acc ->
      if match?(%DateTime{}, s.last_evidence_at) and
           DateTime.compare(s.last_evidence_at, cutoff) == :lt do
        # Evidence older than 90d stops counting — freeze evidence_count contribution
        Logger.info(
          "memory_hygiene.pattern account=#{account_id} id=#{s.id} action=stale_evidence"
        )

        new_c = Float.round((s.confidence || 0.0) * 0.5, 4)

        s
        |> SocialPattern.changeset(%{confidence: new_c, surfaced: new_c >= 0.5})
        |> Repo.update()

        acc + 1
      else
        acc
      end
    end)
  end

  defp hygiene_outcomes(account_id, now) do
    # Paste D 180d decay is read-path via OutcomeLearning.effective_strength/1 — verify callable
    _ =
      case Repo.one(
             from(o in OutcomeSignal,
               where: o.account_id == ^account_id,
               limit: 1
             )
           ) do
        %OutcomeSignal{} = s -> OutcomeLearning.effective_strength(s, now)
        _ -> 0.0
      end

    cutoff = DateTime.add(now, -@outcome_archive_days * 86_400, :second)

    {count, _} =
      from(o in OutcomeSignal,
        where:
          o.account_id == ^account_id and o.archived == false and o.recorded_at < ^cutoff
      )
      |> Repo.update_all(set: [archived: true, updated_at: now])

    if count > 0 do
      Logger.info("memory_hygiene.outcomes account=#{account_id} archived=#{count}")
    end

    count
  end

  defp parse_dt(%DateTime{} = dt), do: dt

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil
end
