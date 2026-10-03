defmodule OpalCore.SocialFlow.PlanStateArbitration do
  @moduledoc """
  Separates plan-alignment, temporal lifecycle, occurrence, and execution layers.

  Canonical start prefers alignment `resolved_on` + `exact_time` + timezone
  over stale `shared_plans.start_at`. Past plans cannot be Next Together,
  upcoming Ready, or future execution CTAs.

  Founder lifecycle distinction:
  Past Shared Reality ≠ proven attendance ≠ Durable Memory ≠ Published Memory.

  A mutually accepted, uncanceled plan whose event time has passed remains
  historical relationship context (`past_shared_reality`). That does not
  auto-confirm attendance, auto-promote Durable Memory, or publish socially.

  Temporal state is always derived from canonical plan timestamp + plan
  timezone + authoritative server `now` (Clock). Surfaces must consume this
  owner — COMPONENT_LOCAL_PAST_CALCULATION = 0.

  Composes `Execution.PlanLifecycle` for phase hints; does not invent a
  parallel SharedPlan engine.
  """

  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.DateTimeChange
  alias OpalCore.SocialFlow.Execution.PlanLifecycle

  @temporal_states ~w(future approaching live past)
  @occurrence_states ~w(planned_only past_unverified likely_occurred confirmed_occurred contradicted)
  @live_window_minutes 180
  @approaching_minutes 90

  def temporal_states, do: @temporal_states
  def occurrence_states, do: @occurrence_states

  @doc """
  Full arbitration snapshot from alignment / plan attrs.

  Accepts string or atom keys. Optional `now:` override (else Clock.utc_now/0).
  """
  @spec evaluate(map(), keyword()) :: map()
  def evaluate(attrs, opts \\ []) when is_map(attrs) do
    a = stringify(attrs)
    now = Keyword.get(opts, :now) || parse_dt(a["now"]) || Clock.utc_now()
    start = canonical_start(a)
    temporal = classify_temporal(a, now)
    alignment = plan_alignment_state(a)
    execution = execution_state(a)
    lifecycle = lifecycle_phase(a, start, now)

    dominant = dominant_hints(alignment, temporal, execution)
    next? = next_together_eligible_from(alignment, temporal)
    ready? = upcoming_ready_from(alignment, temporal)
    exec? = future_execution_actionable_from(alignment, temporal, execution)
    past_shared? = past_shared_reality_from(alignment, temporal)
    {occurrence, evidence} = occurrence_from(a, alignment, temporal, past_shared?)

    snapshot = %{
      "canonical_start_at" => start && DateTime.to_iso8601(start),
      "canonical_start" => start,
      "plan_timezone" => timezone(a),
      "now" => now,
      "plan_alignment_state" => alignment,
      "temporal_state" => temporal,
      "execution_state" => execution,
      "lifecycle_phase" => lifecycle,
      "dominant_hints" => dominant,
      "next_together_eligible" => next?,
      "upcoming_ready" => ready?,
      "future_execution_actionable" => exec?,
      "past_shared_reality" => past_shared?,
      "occurrence_state" => occurrence,
      "occurrence_evidence" => evidence,
      "memory_candidate_input" => past_shared?,
      "past_plan_as_next_together" => false,
      "past_plan_as_upcoming_ready" => false,
      "past_plan_future_execution_cta" => false,
      "past_plan_future_attention" => false,
      "past_plan_auto_memory" => false,
      "past_accepted_plan_disappears_from_history" => false,
      "location_required_to_create_past_history" => false,
      "location_required_to_create_memory" => false,
      "plan_participant_implies_attendance" => false,
      "past_shared_reality_auto_publishes" => false,
      "confirmed_experience_auto_publishes" => false,
      "component_local_past_calculation" => false,
      "reliability_score" => false,
      "flake_score" => false
    }

    Map.put(snapshot, "impossible_combinations", detect_impossible(snapshot))
  end

  def evaluate(_, _), do: evaluate(%{})

  @doc """
  Resolve canonical plan start DateTime (UTC).

  Prefers `date.resolved_on` + exact_time value + timezone.
  Falls back to `start_at` / `when` / `plan_start`.
  """
  @spec canonical_start(map()) :: DateTime.t() | nil
  def canonical_start(attrs) when is_map(attrs) do
    a = stringify(attrs)
    tz = timezone(a)

    case resolved_on(a) do
      %Date{} = date ->
        case exact_clock(a) do
          {hour, minute} -> wall_to_utc(date, hour, minute, tz)
          nil -> wall_to_utc(date, 12, 0, tz)
        end

      nil ->
        fallback_start(a)
    end
  end

  def canonical_start(_), do: nil

  @doc "Classify temporal layer: future | approaching | live | past."
  @spec classify_temporal(map(), DateTime.t() | nil) :: String.t()
  def classify_temporal(attrs, now \\ nil) when is_map(attrs) do
    a = stringify(attrs)
    now = now || parse_dt(a["now"]) || Clock.utc_now()

    cond do
      canceled?(a) or superseded?(a) ->
        "past"

      true ->
        case canonical_start(a) do
          %DateTime{} = start ->
            mins = DateTime.diff(start, now, :second) / 60.0

            cond do
              mins > @approaching_minutes -> "future"
              mins > 0 -> "approaching"
              mins > -@live_window_minutes -> "live"
              true -> "past"
            end

          nil ->
            "future"
        end
    end
  end

  def classify_temporal(_, _), do: "future"

  @spec next_together_eligible?(map()) :: boolean()
  def next_together_eligible?(arb) when is_map(arb) do
    a = stringify(arb)

    if Map.has_key?(a, "next_together_eligible") and is_boolean(a["next_together_eligible"]) do
      a["next_together_eligible"]
    else
      evaluate(a)["next_together_eligible"]
    end
  end

  def next_together_eligible?(_), do: false

  @spec upcoming_ready?(map()) :: boolean()
  def upcoming_ready?(arb) when is_map(arb) do
    a = stringify(arb)

    if Map.has_key?(a, "upcoming_ready") and is_boolean(a["upcoming_ready"]) do
      a["upcoming_ready"]
    else
      evaluate(a)["upcoming_ready"]
    end
  end

  def upcoming_ready?(_), do: false

  @spec future_execution_actionable?(map()) :: boolean()
  def future_execution_actionable?(arb) when is_map(arb) do
    a = stringify(arb)

    if Map.has_key?(a, "future_execution_actionable") and is_boolean(a["future_execution_actionable"]) do
      a["future_execution_actionable"]
    else
      evaluate(a)["future_execution_actionable"]
    end
  end

  def future_execution_actionable?(_), do: false

  @doc """
  Mutually accepted, uncanceled plan whose event time has passed.
  Historical relationship context — not proven attendance or Memory.
  """
  @spec past_shared_reality?(map()) :: boolean()
  def past_shared_reality?(arb) when is_map(arb) do
    a = stringify(arb)

    if Map.has_key?(a, "past_shared_reality") and is_boolean(a["past_shared_reality"]) do
      a["past_shared_reality"]
    else
      evaluate(a)["past_shared_reality"]
    end
  end

  def past_shared_reality?(_), do: false

  @doc """
  Occurrence confidence. Past shared reality alone stays `past_unverified`.
  PLAN_PARTICIPANT_IMPLIES_ATTENDANCE = 0.
  """
  @spec occurrence_state(map()) :: String.t()
  def occurrence_state(arb) when is_map(arb) do
    a = stringify(arb)

    if is_binary(a["occurrence_state"]) and a["occurrence_state"] in @occurrence_states do
      a["occurrence_state"]
    else
      evaluate(a)["occurrence_state"]
    end
  end

  def occurrence_state(_), do: "planned_only"

  @doc """
  Past shared reality may feed MemoryCandidate intelligence as soft input.
  It does not auto-promote Durable Memory or publish socially.
  """
  @spec memory_candidate_input(map()) :: {:ok, map()} | {:reject, String.t()}
  def memory_candidate_input(attrs) when is_map(attrs) do
    arb = if Map.has_key?(stringify(attrs), "past_shared_reality"), do: stringify(attrs), else: evaluate(attrs)

    cond do
      arb["past_shared_reality"] != true ->
        {:reject, "not_past_shared_reality"}

      arb["past_shared_reality_auto_publishes"] == true ->
        {:reject, "auto_publish_forbidden"}

      true ->
        {:ok,
         %{
           "type" => "shared_experience",
           "confidence" => arb["occurrence_state"] || "past_unverified",
           "auto_durable" => false,
           "auto_publish" => false,
           "provenance" => "plan_alignment_temporal"
         }}
    end
  end

  def memory_candidate_input(_), do: {:reject, "invalid"}

  @doc """
  True when claimed layer flags form an impossible product combination
  (e.g. PAST + NEXT_TOGETHER, PAST + BOOKING_APPROVAL_REQUIRED).
  """
  @spec impossible_combination?(map()) :: boolean()
  def impossible_combination?(arb) when is_map(arb) do
    detect_impossible(stringify(arb)) != []
  end

  def impossible_combination?(_), do: false

  # --- internals ---

  defp next_together_eligible_from(alignment, temporal) do
    temporal in ~w(future approaching live) and
      alignment not in ~w(canceled cancelled superseded) and
      alignment in ~w(aligned execution_ready forming constrained candidate)
  end

  defp upcoming_ready_from(alignment, temporal) do
    temporal in ~w(future approaching) and alignment in ~w(aligned execution_ready)
  end

  defp future_execution_actionable_from(alignment, temporal, execution) do
    temporal in ~w(future approaching) and
      alignment in ~w(aligned execution_ready) and
      execution not in ~w(agreed executed cancelled canceled)
  end

  defp past_shared_reality_from(alignment, temporal) do
    temporal == "past" and alignment in ~w(aligned execution_ready)
  end

  defp occurrence_from(a, alignment, temporal, past_shared?) do
    evidence = occurrence_evidence_list(a)

    cond do
      attendance_contradicted?(a) ->
        {"contradicted", evidence}

      past_shared? != true ->
        {"planned_only", evidence}

      confirmed_occurrence?(a, evidence) ->
        {"confirmed_occurred", evidence}

      likely_occurrence?(a, evidence) ->
        {"likely_occurred", evidence}

      temporal == "past" and alignment in ~w(aligned execution_ready) ->
        # Accepted + time passed + no cancel → historical, attendance unverified
        {"past_unverified", evidence}

      true ->
        {"planned_only", evidence}
    end
  end

  defp occurrence_evidence_list(a) do
    base = List.wrap(a["occurrence_evidence"]) |> Enum.filter(&is_binary/1)

    [
      {"explicit_confirmation", a["human_reports_completed"] == true or a["explicit_went"] == true},
      {"journey_arrival", a["journey_arrived"] == true or a["navigation_started"] == true},
      {"provider_fulfillment",
       a["provider_confirmed"] == true or a["provider_redeemed"] == true or
         a["human_reports_booked"] == true},
      {"post_event_conversation", a["post_event_conversation_evidence"] == true},
      {"attached_media", a["graph_media_attached"] == true},
      {"location_arrival",
       a["location_permission"] == true and
         (a["arrived_near_destination"] == true or a["co_presence"] == true)},
      {"participant_completion", a["participant_marked_complete"] == true}
    ]
    |> Enum.filter(fn {_k, v} -> v end)
    |> Enum.map(fn {k, _} -> k end)
    |> Kernel.++(base)
    |> Enum.uniq()
  end

  defp confirmed_occurrence?(a, evidence) do
    a["occurrence_state"] == "confirmed_occurred" or
      a["human_reports_completed"] == true or
      a["explicit_went"] == true or
      ("explicit_confirmation" in evidence and length(evidence) >= 2) or
      ("provider_fulfillment" in evidence and "journey_arrival" in evidence)
  end

  defp likely_occurrence?(_a, evidence) do
    length(evidence) >= 1
  end

  defp attendance_contradicted?(a) do
    a["attendance_contradicted"] == true or
      a["occurrence_state"] == "contradicted" or
      a["could_not_attend"] == true
  end

  defp detect_impossible(a) when is_map(a) do
    temporal = a["temporal_state"]
    alignment = a["plan_alignment_state"]

    []
    |> maybe_impossible(temporal == "past" and a["next_together_eligible"] == true, "PAST+NEXT_TOGETHER")
    |> maybe_impossible(temporal == "past" and a["upcoming_ready"] == true, "PAST+UPCOMING_READY")
    |> maybe_impossible(
      temporal == "past" and a["future_execution_actionable"] == true,
      "PAST+BOOKING_APPROVAL_REQUIRED"
    )
    |> maybe_impossible(
      temporal == "past" and a["reservation_authorizable"] == true,
      "PAST+BOOKING_APPROVAL_REQUIRED"
    )
    |> maybe_impossible(
      alignment in ~w(canceled cancelled) and a["upcoming_ready"] == true,
      "CANCELED+READY"
    )
    |> maybe_impossible(
      alignment == "superseded" and a["next_together_eligible"] == true,
      "SUPERSEDED+NEXT_TOGETHER"
    )
    |> maybe_impossible(
      a["past_shared_reality"] == true and a["plan_participant_implies_attendance"] == true,
      "PAST_SHARED+AUTO_ATTENDANCE"
    )
    |> maybe_impossible(
      a["past_shared_reality"] == true and a["past_plan_auto_memory"] == true,
      "PAST_SHARED+AUTO_MEMORY"
    )
    |> maybe_impossible(
      a["past_shared_reality_auto_publishes"] == true,
      "PAST_SHARED+AUTO_PUBLISH"
    )
  end

  defp maybe_impossible(list, true, label), do: Enum.uniq(list ++ [label])
  defp maybe_impossible(list, false, _), do: list

  defp plan_alignment_state(a) do
    cond do
      canceled?(a) -> "canceled"
      superseded?(a) -> "superseded"
      is_binary(a["commitment"]) and a["commitment"] != "" -> a["commitment"]
      field_state(a, "exact_time") == "locked" and field_state(a, "place") == "locked" -> "aligned"
      field_state(a, "exact_time") in ~w(candidate constrained) -> "forming"
      true -> a["plan_alignment_state"] || "forming"
    end
  end

  defp execution_state(a) do
    cond do
      is_binary(a["execution_state"]) and a["execution_state"] != "" ->
        a["execution_state"]

      is_map(a["execution"]) ->
        a["execution"]["state"] ||
          if(a["execution"]["executed"] == true, do: "executed", else: "unknown")

      true ->
        "unknown"
    end
  end

  defp lifecycle_phase(a, start, now) do
    attrs =
      %{
        "set" => a["commitment"] in ~w(aligned execution_ready) or
          (field_state(a, "exact_time") == "locked" and field_state(a, "place") == "locked"),
        "when" => start,
        "plan_start" => start,
        "now" => now,
        "cancelled" => canceled?(a),
        "superseded" => superseded?(a),
        "reservation_needed" => reservation_needed?(a),
        "provider_confirmed" => a["provider_confirmed"] == true,
        "human_reports_booked" => a["human_reports_booked"] == true,
        "navigation_started" => a["navigation_started"] == true,
        "directions_started" => a["directions_started"] == true,
        "in_transit" => a["in_transit"] == true,
        "human_reports_completed" => a["human_reports_completed"] == true,
        "plan_type" => a["plan_type"] || get_in(a, ["activity", "value"])
      }

    case PlanLifecycle.phase(attrs) do
      {:ok, %{"phase" => phase}} -> phase
      _ -> "forming"
    end
  end

  defp dominant_hints(alignment, temporal, execution) do
    cond do
      temporal == "past" ->
        ["historical_plan", "no_future_execution"]

      temporal in ~w(future approaching) and alignment in ~w(aligned execution_ready) and
          execution not in ~w(agreed executed) ->
        ["plan_set", "reservation_approval_distinct"]

      temporal in ~w(future approaching) and alignment in ~w(aligned execution_ready) ->
        ["plan_set", "upcoming"]

      temporal == "live" ->
        ["live_window"]

      true ->
        ["forming"]
    end
  end

  defp reservation_needed?(a) do
    get_in(a, ["activity", "execution_type"]) in ["reservation", nil] or
      a["reservation_needed"] == true
  end

  defp canceled?(a) do
    a["cancelled"] == true or a["canceled"] == true or
      a["status"] in ~w(cancelled canceled) or
      a["commitment"] in ~w(cancelled canceled) or
      a["plan_alignment_state"] in ~w(cancelled canceled)
  end

  defp superseded?(a) do
    a["superseded"] == true or a["commitment"] == "superseded" or
      a["plan_alignment_state"] == "superseded"
  end

  defp field_state(a, field) do
    case a[field] do
      %{"state" => state} -> state
      _ -> nil
    end
  end

  defp resolved_on(a) do
    raw =
      get_in(a, ["date", "resolved_on"]) ||
        a["resolved_on"] ||
        get_in(a, ["datetime", "resolved_on"])

    parse_date(raw)
  end

  defp exact_clock(a) do
    value =
      get_in(a, ["exact_time", "value"]) ||
        a["exact_time_value"] ||
        (is_binary(a["exact_time"]) && a["exact_time"]) ||
        nil

    parse_clock(value)
  end

  defp timezone(a) do
    get_in(a, ["date", "timezone"]) ||
      a["plan_timezone"] ||
      a["timezone"] ||
      DateTimeChange.timezone()
  end

  defp fallback_start(a) do
    parse_dt(a["start_at"] || a["when"] || a["plan_start"] || a["canonical_start_at"])
  end

  defp parse_clock(nil), do: nil

  defp parse_clock(value) when is_binary(value) do
    text =
      value
      |> String.trim()
      |> String.upcase()
      |> String.replace(~r/\s+/, " ")

    cond do
      match = Regex.run(~r/\A(\d{1,2}):(\d{2})\s*(AM|PM)\z/, text) ->
        [_, h, m, ap] = match
        {to_24(String.to_integer(h), ap), String.to_integer(m)}

      match = Regex.run(~r/\A(\d{1,2})\s*(AM|PM)\z/, text) ->
        [_, h, ap] = match
        {to_24(String.to_integer(h), ap), 0}

      match = Regex.run(~r/\A(\d{1,2}):(\d{2})\z/, text) ->
        [_, h, m] = match
        hour = String.to_integer(h)
        if hour in 0..23, do: {hour, String.to_integer(m)}, else: nil

      true ->
        nil
    end
  end

  defp parse_clock(_), do: nil

  defp to_24(12, "AM"), do: 0
  defp to_24(12, "PM"), do: 12
  defp to_24(h, "AM") when h in 1..11, do: h
  defp to_24(h, "PM") when h in 1..11, do: h + 12
  defp to_24(h, _), do: h

  defp wall_to_utc(%Date{} = date, hour, minute, tz) when is_binary(tz) do
    case DateTime.new(date, Time.new!(hour, minute, 0), tz) do
      {:ok, local, _} ->
        shift_to_utc(local)

      {:ok, local} ->
        shift_to_utc(local)

      {:ambiguous, first, _} ->
        shift_to_utc(first)

      {:gap, _first, second} ->
        shift_to_utc(second)

      _ ->
        # No tz database: apply known fixed offsets (Pacific DST approx).
        offset_hours = fixed_offset_hours(tz, date)
        naive = NaiveDateTime.new!(date.year, date.month, date.day, hour, minute, 0)
        utc_naive = NaiveDateTime.add(naive, -offset_hours * 3600, :second)

        DateTime.from_naive!(utc_naive, "Etc/UTC")
        |> DateTime.truncate(:microsecond)
    end
  end

  defp shift_to_utc(%DateTime{} = local) do
    case DateTime.shift_zone(local, "Etc/UTC") do
      {:ok, utc} -> DateTime.truncate(utc, :microsecond)
      _ -> DateTime.truncate(local, :microsecond)
    end
  end

  defp fixed_offset_hours("UTC", _), do: 0
  defp fixed_offset_hours("Etc/UTC", _), do: 0

  defp fixed_offset_hours("America/Los_Angeles", %Date{} = date) do
    if pacific_dst?(date), do: -7, else: -8
  end

  defp fixed_offset_hours("America/New_York", %Date{} = date) do
    if pacific_dst?(date), do: -4, else: -5
  end

  defp fixed_offset_hours(_, _), do: 0

  # Approx US Pacific DST: March–November inclusive (matches temporal_follow_through).
  defp pacific_dst?(%Date{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(%DateTime{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(_), do: false

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

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  # DateTime/Date/Time structs are maps but must not be walked as enumerable maps.
  defp stringify_val(%DateTime{} = dt), do: dt
  defp stringify_val(%Date{} = d), do: d
  defp stringify_val(%Time{} = t), do: t
  defp stringify_val(%NaiveDateTime{} = n), do: n
  defp stringify_val(%{__struct__: _} = struct), do: struct
  defp stringify_val(m) when is_map(m), do: stringify(m)
  defp stringify_val(v), do: v

  @doc "Alias used by ConversationAlignment projection."
  def arbitrate(alignment, opts \\ %{}) do
    opts_kw =
      cond do
        is_list(opts) -> opts
        is_map(opts) ->
          opts
          |> Enum.map(fn {k, v} -> {if(is_atom(k), do: k, else: String.to_atom(to_string(k))), v} end)
        true -> []
      end

    evaluate(alignment || %{}, opts_kw)
  end

  @doc """
  Gate reservation_authorizable for API projection.
  Past / canceled plans never keep a future booking CTA.
  """
  def gate_reservation_authorizable(alignment, authorizable?, opts \\ %{}) do
    if !authorizable? do
      false
    else
      a =
        (alignment || %{})
        |> stringify()
        |> Map.put("reservation_authorizable", true)

      opts_kw =
        cond do
          is_list(opts) -> opts
          is_map(opts) ->
            opts
            |> Enum.map(fn {k, v} -> {if(is_atom(k), do: k, else: String.to_atom(to_string(k))), v} end)
          true -> []
        end

      evaluate(a, opts_kw)["future_execution_actionable"] == true
    end
  end
end
