defmodule OpalCore.SocialMemory.Workers.RoutineDetectorWorker do
  @moduledoc """
  Weekly Oban job: detect repeating (person, activity, weekday) triples in
  plan_memories + conversation_index within 90 days.

  Thresholds:
  - 3+ → confidence 0.6
  - 5+ → 0.8
  - 8+ → 0.9
  Below 0.6 stored never surfaced.
  """

  use Oban.Worker, queue: :events, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{ConversationIndex, PlanMemory, Routine}

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    if SocialMemory.Ingest.enabled?() do
      since = DateTime.add(DateTime.utc_now(), -90 * 86_400, :second)

      account_ids =
        from(i in ConversationIndex,
          where: i.last_activity_at >= ^since,
          distinct: true,
          select: i.account_id
        )
        |> Repo.all()

      Enum.each(account_ids, &detect_for_account/1)
    end

    :ok
  end

  def detect_for_account(account_id) when is_binary(account_id) do
    since = DateTime.add(DateTime.utc_now(), -90 * 86_400, :second)

    plans =
      from(p in PlanMemory,
        where: p.account_id == ^account_id and p.inserted_at >= ^since
      )
      |> Repo.all()

    triples =
      plans
      |> Enum.flat_map(&plan_to_triples/1)
      |> Enum.frequencies()

    Enum.each(triples, fn {{person_id, activity, dow}, count} ->
      conf = confidence_for(count)

      if count >= 2 do
        upsert_routine(account_id, person_id, activity, dow, count, conf)
      end
    end)

    :ok
  end

  defp confidence_for(n) when n >= 8, do: 0.9
  defp confidence_for(n) when n >= 5, do: 0.8
  defp confidence_for(n) when n >= 3, do: 0.6
  defp confidence_for(n), do: min(0.9, 0.3 + 0.15 * max(0, n - 2))

  defp plan_to_triples(%PlanMemory{} = p) do
    activity = normalize_activity("#{p.plan_label} #{p.place_label}")
    dow = day_of_week(p)

    if activity && dow do
      # Solo if no related people in label; person_id nil for gym/run style
      person_id = nil
      [{person_id, activity, dow}]
    else
      []
    end
  end

  defp normalize_activity(text) when is_binary(text) do
    t = String.downcase(text)

    cond do
      String.contains?(t, "coffee") -> "coffee"
      String.contains?(t, "dinner") -> "dinner"
      String.contains?(t, "lunch") -> "lunch"
      String.contains?(t, "call") -> "call"
      String.contains?(t, "gym") -> "gym"
      String.contains?(t, "run") -> "run"
      String.contains?(t, "drink") -> "drinks"
      true ->
        t
        |> String.split(~r/[^a-z]+/, trim: true)
        |> List.first()
    end
  end

  defp normalize_activity(_), do: nil

  defp day_of_week(%PlanMemory{start_at: %DateTime{} = dt}), do: Date.day_of_week(DateTime.to_date(dt)) |> rem(7)

  defp day_of_week(%PlanMemory{time_label: label}) when is_binary(label) do
    l = String.downcase(label)

    cond do
      String.contains?(l, "sun") -> 0
      String.contains?(l, "mon") -> 1
      String.contains?(l, "tue") -> 2
      String.contains?(l, "wed") -> 3
      String.contains?(l, "thu") -> 4
      String.contains?(l, "fri") -> 5
      String.contains?(l, "sat") -> 6
      true -> nil
    end
  end

  defp day_of_week(_), do: nil

  defp upsert_routine(account_id, person_id, activity, dow, count, conf) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    existing =
      from(r in Routine,
        where:
          r.account_id == ^account_id and r.activity == ^activity and r.cadence == "weekly" and
            r.day_of_week == ^dow
      )
      |> maybe_person(person_id)
      |> Repo.one()

    attrs = %{
      account_id: account_id,
      person_id: person_id,
      activity: activity,
      cadence: "weekly",
      day_of_week: dow,
      confidence: conf,
      detection_count: count,
      last_occurrence_at: now
    }

    case existing do
      nil ->
        %Routine{} |> Routine.changeset(attrs) |> Repo.insert()

      row ->
        row
        |> Routine.changeset(%{
          confidence: conf,
          detection_count: count,
          last_occurrence_at: now,
          streak_broken: false
        })
        |> Repo.update()
    end
  end

  defp maybe_person(q, nil), do: where(q, [r], is_nil(r.person_id))
  defp maybe_person(q, id), do: where(q, [r], r.person_id == ^id)
end
