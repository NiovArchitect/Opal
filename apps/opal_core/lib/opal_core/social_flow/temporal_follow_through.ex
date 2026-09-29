defmodule OpalCore.SocialFlow.TemporalFollowThrough do
  @moduledoc """
  Track A7 — temporal follow-through + real-world state awareness.

  Time passing does not automatically justify interruption.
  This module matures open loops and feeds `AttentionAuthority.decide/1`.

  Does not:
  - bypass AttentionAuthority with a reminder engine
  - invent leave-by / ETA / distance without destination + permission + travel
  - turn memory or historical patterns into timers
  - mutate SharedPlan / Memory / providers
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{AttentionAuthority, Clock, TemporalFollowThroughLoop}

  @near_commitment_hours 12
  @far_commitment_hours 36
  @daypart_start_hour 10
  @daypart_end_hour 20
  @provider_fresh_default_hours 6

  # --- Laws ---

  def age_alone_causes_attention?, do: false
  def relative_date_reevaluates_canonical_plan?, do: false
  def old_plan_time_reminder_fires?, do: false
  def canceled_plan_generates_future_attention?, do: false
  def completed_commitment_reminder?, do: false
  def weak_intent_creates_reminder?, do: false
  def memory_fact_schedules_attention?, do: false
  def historical_pattern_auto_schedule?, do: false
  def fake_distance?, do: false
  def fake_eta?, do: false
  def fake_leave_by?, do: false
  def location_tracking_without_permission?, do: false
  def graph_membership_implies_location_share?, do: false
  def temporal_reevaluation_duplicates?, do: false
  def server_restart_loses_due_state?, do: false
  def temporal_tests_use_real_sleep?, do: false
  def stale_provider_data_presented_as_current?, do: false
  def old_owner_receives_reminder_after_reassignment?, do: false

  @doc """
  Register or refresh a durable open loop (idempotent by idempotency_key).
  """
  def register(attrs) when is_map(attrs) do
    a = stringify(attrs)
    key = a["idempotency_key"] || default_idem(a)

    case Repo.get_by(TemporalFollowThroughLoop, idempotency_key: key) do
      %TemporalFollowThroughLoop{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        owner = a["responsibility_user_id"] || a["owner_user_id"]

        %TemporalFollowThroughLoop{}
        |> TemporalFollowThroughLoop.changeset(%{
          kind: a["kind"],
          source_id: to_string(a["source_id"]),
          conversation_id: a["conversation_id"],
          plan_id: a["plan_id"],
          plan_version: a["plan_version"] || "1",
          owner_user_id: a["owner_user_id"] || owner,
          responsibility_user_id: owner,
          participant_ids: List.wrap(a["participant_ids"] || a["participants"]),
          timezone: a["timezone"] || "America/Los_Angeles",
          precision: a["precision"] || infer_precision(a),
          semantic_deadline_date: parse_date(a["semantic_deadline_date"] || a["deadline_date"]),
          semantic_deadline_at: parse_dt(a["semantic_deadline_at"] || a["deadline_at"]),
          plan_start_at: parse_dt(a["plan_start_at"]),
          status: a["status"] || "open",
          maturity: "not_yet",
          attention_dedupe_key: a["attention_dedupe_key"] || "tft:#{a["kind"]}:#{a["source_id"]}",
          provider_observed_at: parse_dt(a["provider_observed_at"]),
          provider_fresh_hours: a["provider_fresh_hours"] || @provider_fresh_default_hours,
          execution_status: a["execution_status"],
          destination_coords_known: a["destination_coords_known"] == true,
          travel_known: a["travel_known"] == true,
          location_permission: a["location_permission"] == true,
          metadata: a["metadata"] || %{},
          idempotency_key: key
        })
        |> Repo.insert()
        |> case do
          {:ok, loop} -> {:ok, loop, :created}
          {:error, cs} -> {:error, cs}
        end
    end
  end

  def register(_), do: {:error, :invalid}

  @doc "Mark commitment/loop completed — no future reminder."
  def complete(loop_or_id, attrs \\ %{})

  def complete(%TemporalFollowThroughLoop{} = loop, attrs) do
    now = Clock.utc_now()
    a = stringify(attrs)

    loop
    |> TemporalFollowThroughLoop.changeset(%{
      status: "completed",
      maturity: "resolved",
      last_evaluated_at: now,
      metadata: Map.merge(loop.metadata || %{}, %{"completed_note" => a["note"]})
    })
    |> Repo.update()
  end

  def complete(id, attrs) when is_binary(id) do
    case Repo.get(TemporalFollowThroughLoop, id) do
      nil -> {:error, :not_found}
      loop -> complete(loop, attrs)
    end
  end

  @doc "Cancel/supersede loops for a plan version (reschedule / cancel)."
  def invalidate_plan_version(plan_id, plan_version, reason \\ "rescheduled")
      when is_binary(plan_id) do
    now = Clock.utc_now()
    status = if reason == "cancelled", do: "cancelled", else: "superseded"

    from(l in TemporalFollowThroughLoop,
      where: l.plan_id == ^plan_id and l.plan_version == ^plan_version and l.status == "open"
    )
    |> Repo.update_all(
      set: [status: status, maturity: "resolved", last_evaluated_at: now, updated_at: now]
    )
  end

  @doc "Reassign responsibility — future attention follows new owner."
  def reassign(%TemporalFollowThroughLoop{} = loop, new_owner_id) when is_binary(new_owner_id) do
    loop
    |> TemporalFollowThroughLoop.changeset(%{
      previous_owner_user_id: loop.responsibility_user_id || loop.owner_user_id,
      responsibility_user_id: new_owner_id,
      last_evaluated_at: Clock.utc_now()
    })
    |> Repo.update()
  end

  def reassign(id, new_owner_id) when is_binary(id) do
    case Repo.get(TemporalFollowThroughLoop, id) do
      nil -> {:error, :not_found}
      loop -> reassign(loop, new_owner_id)
    end
  end

  @doc """
  Evaluate a loop at canonical server time → maturity + AttentionAuthority decision.

  Idempotent: repeated evaluation yields the same attention_dedupe_key.
  """
  def evaluate(loop_or_id, opts \\ [])

  def evaluate(%TemporalFollowThroughLoop{} = loop, opts) when is_list(opts) do
    now = Keyword.get(opts, :now) || Clock.utc_now()
    loop = maybe_refresh_status(loop)

    {maturity, reason} = mature(loop, now)
    travel = travel_claims(loop)

    {:ok, updated} =
      loop
      |> TemporalFollowThroughLoop.changeset(%{
        maturity: maturity,
        last_evaluated_at: now
      })
      |> Repo.update()

    event = attention_event(updated, maturity, reason, travel)
    decision = AttentionAuthority.decide(event)

    %{
      "loop" => updated,
      "maturity" => maturity,
      "reason" => reason,
      "attention" => decision,
      "dedupe_key" => updated.attention_dedupe_key,
      "travel" => travel,
      "provider_fresh" => provider_fresh?(updated, now),
      "availability_claim" => availability_claim(updated, now),
      "mutates_plan" => false,
      "server_restart_durable" => true
    }
  end

  def evaluate(id, opts) when is_binary(id) and is_list(opts) do
    case Repo.get(TemporalFollowThroughLoop, id) do
      nil -> {:error, :not_found}
      loop -> {:ok, evaluate(loop, opts)}
    end
  end

  @doc "Re-evaluate all open loops (scheduler tick / restart resume)."
  def reevaluate_open(opts \\ []) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    from(l in TemporalFollowThroughLoop, where: l.status == "open")
    |> Repo.all()
    |> Enum.map(fn loop -> evaluate(loop, now: now) end)
  end

  @doc """
  Attention projections for a user at `now` — for future Attention Center.
  Does not invent UI; returns Needs-you / Waiting / Updated style buckets.
  """
  def attention_for_user(user_id, opts \\ []) when is_binary(user_id) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    results =
      from(l in TemporalFollowThroughLoop,
        where:
          l.status == "open" and
            (l.responsibility_user_id == ^user_id or ^user_id in l.participant_ids)
      )
      |> Repo.all()
      |> Enum.map(fn loop -> evaluate(loop, now: now) end)

    items =
      results
      |> Enum.flat_map(fn r ->
        Enum.filter(r["attention"]["items"] || [], &(&1["recipient_user_id"] == user_id))
        |> Enum.map(fn item -> Map.put(item, "maturity", r["maturity"]) end)
      end)
      |> Enum.uniq_by(& &1["dedupe_key"])

    needs = Enum.filter(items, &(&1["level"] in ~w(attention urgent) and &1["action_required"]))
    waiting = Enum.filter(items, &(&1["level"] == "ambient" and &1["reason"] =~ "waiting"))
    updated = Enum.filter(items, &(&1["reason"] in ~w(provider_confirmation plan_materially_updated)))

    %{
      "needs_you" => needs,
      "waiting" => waiting,
      "updated" => updated,
      "actionable_count" => length(needs),
      "evaluated_at" => DateTime.to_iso8601(now)
    }
  end

  @doc "Pure maturity check without DB (fixtures / unit)."
  def mature_at(attrs, now \\ nil) when is_map(attrs) do
    a = stringify(attrs)
    now = now || Clock.utc_now()

    loop = %TemporalFollowThroughLoop{
      kind: a["kind"],
      status: a["status"] || "open",
      precision: a["precision"] || infer_precision(a),
      timezone: a["timezone"] || "America/Los_Angeles",
      semantic_deadline_date: parse_date(a["semantic_deadline_date"] || a["deadline_date"]),
      semantic_deadline_at: parse_dt(a["semantic_deadline_at"] || a["deadline_at"]),
      plan_start_at: parse_dt(a["plan_start_at"]),
      execution_status: a["execution_status"],
      destination_coords_known: a["destination_coords_known"] == true,
      travel_known: a["travel_known"] == true,
      location_permission: a["location_permission"] == true,
      provider_observed_at: parse_dt(a["provider_observed_at"]),
      provider_fresh_hours: a["provider_fresh_hours"] || @provider_fresh_default_hours,
      metadata: a["metadata"] || %{}
    }

    {maturity, reason} = mature(loop, now)
    travel = travel_claims(loop)

    %{
      "maturity" => maturity,
      "reason" => reason,
      "travel" => travel,
      "provider_fresh" => provider_fresh?(loop, now),
      "availability_claim" => availability_claim(loop, now)
    }
  end

  # --- Maturity ---

  defp mature(%{status: status}, _now) when status in ~w(completed cancelled superseded resolved) do
    {"resolved", "terminal_status"}
  end

  defp mature(%{kind: "memory_silence"}, _now), do: {"not_yet", "memory_fact_no_timer"}
  defp mature(%{kind: "pattern_silence"}, _now), do: {"not_yet", "historical_pattern_no_schedule"}

  defp mature(%{kind: "waiting_on"} = loop, now) do
    case waiting_due?(loop, now) do
      true -> {"due", "waiting_on_due"}
      false -> {"not_yet", "waiting_on_before_due"}
    end
  end

  defp mature(%{kind: "explicit_timed"} = loop, now) do
    case precise_due?(loop, now) do
      true -> {"due", "explicit_timed_due"}
      :approaching -> {"approaching", "explicit_timed_approaching"}
      false -> {"not_yet", "explicit_timed_before"}
    end
  end

  defp mature(%{kind: "commitment"} = loop, now) do
    hours = hours_until(loop.plan_start_at, now)

    cond do
      is_nil(hours) and is_nil(loop.semantic_deadline_at) and is_nil(loop.semantic_deadline_date) ->
        {"not_yet", "commitment_no_temporal_anchor"}

      is_number(hours) and hours > @far_commitment_hours ->
        {"not_yet", "commitment_far_away"}

      is_number(hours) and hours <= @near_commitment_hours and hours >= 0 ->
        {"due", "commitment_near_event"}

      is_number(hours) and hours < 0 ->
        {"due", "commitment_past_start_still_open"}

      waiting_due?(loop, now) ->
        {"due", "commitment_deadline_due"}

      is_number(hours) and hours <= @far_commitment_hours ->
        {"approaching", "commitment_approaching"}

      true ->
        {"not_yet", "commitment_not_yet"}
    end
  end

  defp mature(%{kind: "open_question"} = loop, now) do
    hours = hours_until(loop.plan_start_at, now)

    cond do
      # Age alone never elevates
      loop.metadata["age_days"] ->
        {"not_yet", "age_alone_not_attention"}

      is_number(hours) and hours <= @near_commitment_hours and hours >= 0 and
          truthy?(loop.metadata["blocking"]) ->
        {"due", "open_question_blocking_near_event"}

      is_number(hours) and hours > @far_commitment_hours ->
        {"not_yet", "open_question_far"}

      true ->
        {"not_yet", "open_question_ambient"}
    end
  end

  defp mature(%{kind: "execution"} = loop, now) do
    case loop.execution_status do
      "confirmed" -> {"resolved", "execution_confirmed"}
      "failed" -> {"due", "execution_failed"}
      "authorization_required" -> {"due", "authorization_required"}
      "submitted" ->
        if provider_fresh?(loop, now),
          do: {"approaching", "execution_submitted_waiting"},
          else: {"approaching", "execution_submitted_stale_observation"}

      _ ->
        {"not_yet", "execution_quiet"}
    end
  end

  defp mature(%{kind: "plan_approach"} = loop, now) do
    hours = hours_until(loop.plan_start_at, now)

    cond do
      loop.metadata["plan_status"] in ~w(cancelled completed) ->
        {"resolved", "plan_terminal"}

      is_number(hours) and hours <= 1 and unresolved_dependency?(loop) ->
        {"due", "plan_imminent_unresolved"}

      is_number(hours) and hours <= 24 ->
        {"approaching", "plan_approaching_ambient"}

      true ->
        {"not_yet", "plan_far"}
    end
  end

  defp mature(_, _), do: {"not_yet", "unknown_kind"}

  defp waiting_due?(loop, now) do
    cond do
      match?(%DateTime{}, loop.semantic_deadline_at) ->
        DateTime.compare(now, loop.semantic_deadline_at) != :lt

      match?(%Date{}, loop.semantic_deadline_date) ->
        # Date-only: due inside local daypart on that date — not midnight.
        {local_date, hour} = local_date_hour(now, loop.timezone)

        local_date == loop.semantic_deadline_date and hour >= @daypart_start_hour and
          hour < @daypart_end_hour

      true ->
        false
    end
  end

  defp precise_due?(loop, now) do
    case loop.semantic_deadline_at do
      %DateTime{} = dt ->
        mins = DateTime.diff(dt, now, :minute)

        cond do
          mins <= 0 -> true
          mins <= 60 -> :approaching
          true -> false
        end

      _ ->
        waiting_due?(loop, now)
    end
  end

  defp hours_until(nil, _), do: nil

  defp hours_until(%DateTime{} = start_at, now) do
    DateTime.diff(start_at, now, :second) / 3600.0
  end

  defp hours_until(_, _), do: nil

  defp unresolved_dependency?(loop) do
    truthy?(loop.metadata["place_unresolved"]) or truthy?(loop.metadata["blocking"])
  end

  defp travel_claims(loop) do
    can? =
      loop.destination_coords_known == true and loop.travel_known == true and
        loop.location_permission == true

    %{
      "leave_by_allowed" => can?,
      "distance_claimed" => false,
      "eta_claimed" => false,
      "leave_by_claimed" => false,
      "fake_distance" => false,
      "fake_eta" => false,
      "fake_leave_by" => false
    }
  end

  defp provider_fresh?(loop, now) do
    case loop.provider_observed_at do
      %DateTime{} = obs ->
        hours = loop.provider_fresh_hours || @provider_fresh_default_hours
        DateTime.diff(now, obs, :second) <= hours * 3600

      _ ->
        # No observation → cannot claim current availability
        false
    end
  end

  defp availability_claim(loop, now) do
    if provider_fresh?(loop, now) and loop.metadata["availability"] do
      %{"claim" => loop.metadata["availability"], "current" => true}
    else
      %{"claim" => nil, "current" => false, "reason" => "stale_or_unknown"}
    end
  end

  defp attention_event(loop, maturity, reason, travel) do
    owner = loop.responsibility_user_id || loop.owner_user_id
    participants = Enum.uniq(List.wrap(loop.participant_ids) ++ [owner]) |> Enum.reject(&is_nil/1)

    base = %{
      "source_id" => loop.source_id,
      "conversation_id" => loop.conversation_id,
      "dedupe_key" => loop.attention_dedupe_key,
      "participants" => participants,
      "plan_version" => loop.plan_version,
      "fake_leave_by" => travel["fake_leave_by"]
    }

    case {loop.kind, maturity} do
      {_, "resolved"} when loop.execution_status == "confirmed" ->
        Map.merge(base, %{
          "source_type" => "booking_confirmed",
          "copy" => "Reservation confirmed"
        })

      {_, "resolved"} ->
        Map.merge(base, %{
          "source_type" => "plan_update",
          "resolved" => true,
          "copy" => "Resolved"
        })

      {"waiting_on", "due"} ->
        Map.merge(base, %{
          "source_type" => "waiting_on",
          "waiting_on_user_id" => owner,
          "waiting_due" => true,
          "waiting_on_display" => loop.metadata["owner_display"] || "them",
          "copy" => loop.metadata["copy"] || "Still waiting on you"
        })

      {"waiting_on", _} ->
        Map.merge(base, %{
          "source_type" => "waiting_on",
          "waiting_on_user_id" => owner,
          "waiting_due" => false,
          "waiting_on_display" => loop.metadata["owner_display"] || "them"
        })

      {"commitment", "due"} ->
        Map.merge(base, %{
          "source_type" => "commitment",
          "commitment_owner_user_id" => owner,
          "commitment_due_soon" => true,
          "copy" => loop.metadata["copy"] || "Tickets still need an owner"
        })

      {"commitment", _} ->
        Map.merge(base, %{
          "source_type" => "commitment",
          "commitment_owner_user_id" => owner,
          "commitment_due_soon" => false,
          "copy" => loop.metadata["copy"]
        })

      {"explicit_timed", mat} when mat in ~w(due approaching) ->
        Map.merge(base, %{
          "source_type" => "commitment",
          "commitment_owner_user_id" => owner,
          "commitment_due_soon" => mat == "due",
          "copy" => loop.metadata["copy"] || "Time to follow through"
        })

      {"execution", "due"} when loop.execution_status == "failed" ->
        Map.merge(base, %{
          "source_type" => "booking_failed",
          "outcome_type" => "booking_failed",
          "authorization_required_user_id" => owner,
          "required_responder_ids" => [owner],
          "copy" => "Booking couldn't be completed"
        })

      {"execution", "due"} when loop.execution_status == "authorization_required" ->
        Map.merge(base, %{
          "source_type" => "booking_authorization",
          "authorization_required_user_id" => owner,
          "organizer_user_id" => owner,
          "required_responder_ids" => [owner],
          "copy" => "Needs your approval"
        })

      {"execution", "resolved"} ->
        Map.merge(base, %{
          "source_type" => "booking_confirmed",
          "copy" => "Reservation confirmed"
        })

      {"open_question", "due"} ->
        Map.merge(base, %{
          "source_type" => "open_question",
          "question_owner_user_id" => owner,
          "copy" => loop.metadata["copy"] || "Needs your answer"
        })

      {"open_question", _} ->
        Map.merge(base, %{
          "source_type" => "open_question",
          "copy" => loop.metadata["copy"] || "Still open"
        })

      {"memory_silence", _} ->
        Map.merge(base, %{"source_type" => "memory", "private_memory_only" => true})

      {"pattern_silence", _} ->
        Map.merge(base, %{"source_type" => "memory", "private_memory_only" => true})

      {"plan_approach", "due"} ->
        Map.merge(base, %{
          "source_type" => "open_question",
          "question_owner_user_id" => owner,
          "copy" => "Something still needs attention before the plan"
        })

      _ ->
        Map.merge(base, %{
          "source_type" => "plan_update",
          "copy" => reason
        })
    end
  end

  defp maybe_refresh_status(loop) do
    cond do
      loop.metadata["plan_status"] == "cancelled" ->
        %{loop | status: "cancelled"}

      true ->
        loop
    end
  end

  defp local_date_hour(%DateTime{} = utc, tz) when is_binary(tz) do
    case DateTime.shift_zone(utc, tz) do
      {:ok, local} ->
        {DateTime.to_date(local), local.hour}

      {:error, _} ->
        # Environments without tzdata: apply known fixed offsets (PDT/PST approx).
        offset_hours = fixed_offset_hours(tz, utc)
        local = DateTime.add(utc, offset_hours * 3600, :second)
        {DateTime.to_date(local), local.hour}
    end
  end

  # Fixed offsets when Tzdata is unavailable. Pacific uses DST approx (UTC-7 Mar–Nov).
  defp fixed_offset_hours("UTC", _), do: 0
  defp fixed_offset_hours("Etc/UTC", _), do: 0

  defp fixed_offset_hours("America/Los_Angeles", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -7, else: -8
  end

  defp fixed_offset_hours("America/New_York", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -4, else: -5
  end

  defp fixed_offset_hours(_, _), do: 0

  defp pacific_dst?(%DateTime{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(_), do: false

  defp infer_precision(a) do
    cond do
      a["precision"] -> a["precision"]
      a["deadline_at"] || a["semantic_deadline_at"] -> "datetime"
      a["deadline_date"] || a["semantic_deadline_date"] -> "date_only"
      a["approximate"] == true -> "approximate"
      true -> "unspecified"
    end
  end

  defp default_idem(a) do
    "tft:#{a["kind"]}:#{a["source_id"]}:#{a["plan_version"] || "1"}"
  end

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp parse_date(%Date{} = d), do: d

  defp parse_date(iso) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp parse_date(_), do: nil

  defp truthy?(v), do: v == true or v == "true"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
