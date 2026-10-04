defmodule OpalCore.SocialFlow.TemporalHabitMiner do
  @moduledoc """
  Phase 5B — temporal habit miner ("Friday nights / never mornings").

  Analyzes a user's agreed/completed SharedPlans, extracts weekday×daypart
  patterns, and submits `recurring_routine` candidates through
  `MemoryIntelligence.consider/1`. No cron/Oban wiring — callers invoke
  `mine/1` directly.

  Dayparts reuse `AvailabilityComposition.resolve_daypart/3` windows
  (morning / afternoon / evening / night). Plan local time uses each
  plan's `timezone` field.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AvailabilityComposition
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.MemoryIntelligence
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  @core_dayparts ~w(morning afternoon evening night)
  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)
  @min_plans_prefers 5
  @min_plans_avoids 10
  @prefers_share 0.40
  @signal_statuses ~w(agreed completed)

  @doc """
  Mine temporal habits for `user_id`.

  Returns:
  - `:insufficient_data` when fewer than #{@min_plans_prefers} timed
    agreed/completed plans exist
  - `%{submitted: n, patterns: [...], results: [...], plan_count: n}` otherwise
  """
  def mine(user_id) when is_binary(user_id) do
    case Ecto.UUID.cast(user_id) do
      :error ->
        :insufficient_data

      {:ok, uid} ->
        samples = load_timed_samples(uid)
        total = length(samples)

        if total < @min_plans_prefers do
          :insufficient_data
        else
          prefers = prefers_patterns(samples, total)
          avoids = avoids_patterns(samples, total)
          patterns = prefers ++ avoids

          results =
            Enum.map(patterns, fn pattern ->
              submit_pattern(uid, pattern, total)
            end)

          submitted = Enum.count(results, &(&1.status == :submitted))

          %{
            submitted: submitted,
            patterns: patterns,
            results: results,
            plan_count: total
          }
        end
    end
  end

  def mine(_), do: :insufficient_data

  @doc "Core dayparts mined (aligned with AvailabilityComposition)."
  def dayparts, do: @core_dayparts

  @doc false
  def classify_sample(%SharedPlan{} = plan) do
    case plan.start_at do
      %DateTime{} = start_at ->
        tz = plan.timezone || "UTC"
        local = to_zone(start_at, tz)

        case classify_daypart(start_at, local, tz) do
          nil ->
            nil

          daypart ->
            weekday = Enum.at(@weekdays, Date.day_of_week(local) - 1)

            %{
              plan_id: plan.id,
              weekday: weekday,
              daypart: daypart,
              timezone: tz
            }
        end

      _ ->
        nil
    end
  end

  # --- load ---

  defp load_timed_samples(user_id) do
    from(p in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == p.id,
      where: pp.user_id == ^user_id,
      where: p.status in ^@signal_statuses,
      where: not is_nil(p.start_at),
      select: p
    )
    |> Repo.all()
    |> Enum.map(&classify_sample/1)
    |> Enum.reject(&is_nil/1)
  end

  # --- patterns ---

  defp prefers_patterns(samples, total) when total >= @min_plans_prefers do
    samples
    |> Enum.frequencies_by(fn s -> {s.weekday, s.daypart} end)
    |> Enum.flat_map(fn {{weekday, daypart}, count} ->
      share = count / total

      if share >= @prefers_share do
        [
          %{
            kind: :prefers,
            weekday: weekday,
            daypart: daypart,
            count: count,
            share: share,
            value_key: "temporal:prefers:#{weekday}_#{daypart}",
            value: "temporal:prefers:#{weekday}_#{daypart}"
          }
        ]
      else
        []
      end
    end)
  end

  defp prefers_patterns(_, _), do: []

  defp avoids_patterns(samples, total) when total >= @min_plans_avoids do
    present =
      samples
      |> Enum.map(& &1.daypart)
      |> MapSet.new()

    @core_dayparts
    |> Enum.reject(&MapSet.member?(present, &1))
    |> Enum.map(fn daypart ->
      %{
        kind: :avoids,
        daypart: daypart,
        count: 0,
        share: 0.0,
        value_key: "temporal:avoids:#{daypart}",
        value: "temporal:avoids:#{daypart}"
      }
    end)
  end

  defp avoids_patterns(_, _), do: []

  # --- submit ---

  defp submit_pattern(user_id, pattern, total) do
    value = pattern.value
    value_key = consider_value_key(value)

    if already_have?(user_id, value_key) do
      %{
        status: :skipped,
        reason: :idempotent,
        value_key: value_key,
        pattern: pattern.kind
      }
    else
      obs =
        case pattern.kind do
          :prefers -> pattern.count
          :avoids -> total
        end

      MemoryIntelligence.consider(%{
        "owner_user_id" => user_id,
        "subject_user_id" => user_id,
        "memory_class" => "recurring_routine",
        "kind" => "recurring_routine",
        "value" => value,
        "evidence_kind" => "repeated_behavior",
        "force_candidate" => true,
        "observation_count" => obs,
        "auto_promote" => false,
        "source_type" => "temporal_miner",
        "source" => "temporal_miner",
        "idempotency_key" => idem_key(user_id, value),
        "context_dims" => %{
          "source" => "temporal_miner",
          "pattern_kind" => Atom.to_string(pattern.kind),
          "daypart" => pattern.daypart,
          "weekday" => Map.get(pattern, :weekday),
          "plan_count" => total,
          "match_count" => pattern.count,
          "conceptual_value_key" => pattern.value_key
        },
        "evidence" => %{
          "source" => "temporal_miner",
          "pattern_kind" => Atom.to_string(pattern.kind),
          "daypart" => pattern.daypart,
          "weekday" => Map.get(pattern, :weekday),
          "plan_count" => total,
          "match_count" => pattern.count
        }
      })
      |> case do
        {:ok, payload} ->
          %{
            status: :submitted,
            action: payload[:action] || payload["action"],
            value_key: value_key,
            candidate_id: candidate_id(payload),
            pattern: pattern.kind
          }

        {:reject, reason} ->
          %{status: :rejected, reason: reason, value_key: value_key, pattern: pattern.kind}

        other ->
          %{status: :rejected, reason: other, value_key: value_key, pattern: pattern.kind}
      end
    end
  end

  defp already_have?(owner, value_key) when is_binary(value_key) do
    from(c in MemoryCandidate,
      where: c.owner_user_id == ^owner,
      where: c.value_key == ^value_key,
      where: c.status not in ^~w(rejected superseded expired),
      select: c.id,
      limit: 1
    )
    |> Repo.one()
    |> is_binary()
  end

  defp consider_value_key(value) when is_binary(value) do
    "recurring_routine:" <> slug(value)
  end

  defp idem_key(owner, value) do
    "temporal-miner:#{owner}:#{slug(value)}"
  end

  # --- daypart via AvailabilityComposition ---

  defp classify_daypart(%DateTime{} = utc_start, %DateTime{} = local, tz) do
    date = DateTime.to_date(local)

    Enum.find(@core_dayparts, fn daypart ->
      case AvailabilityComposition.resolve_daypart(daypart, date, tz) do
        {:ok, %{"start_at" => window_start, "end_at" => window_end}} ->
          in_window?(utc_start, window_start, window_end)

        _ ->
          false
      end
    end)
  end

  defp in_window?(%DateTime{} = t, %DateTime{} = start_at, %DateTime{} = end_at) do
    DateTime.compare(t, start_at) != :lt and DateTime.compare(t, end_at) != :gt
  end

  defp to_zone(%DateTime{} = dt, "UTC"), do: dt

  defp to_zone(%DateTime{} = dt, tz) when is_binary(tz) do
    case DateTime.shift_zone(dt, tz) do
      {:ok, local} -> local
      _ -> dt
    end
  end

  defp to_zone(dt, _), do: dt

  defp candidate_id(%{candidate: %MemoryCandidate{id: id}}), do: id
  defp candidate_id(%{"candidate" => %{"id" => id}}), do: id
  defp candidate_id(%{candidate: cand}) when is_map(cand), do: cand[:id] || cand["id"]
  defp candidate_id(_), do: nil

  defp slug(s) when is_binary(s) do
    s
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
    |> String.slice(0, 80)
  end
end
