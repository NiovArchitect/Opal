defmodule OpalCore.SocialFlow.AvailabilityComposition do
  @moduledoc """
  Private multi-person availability composition.

  Core law: **KNOW AVAILABILITY DEEPLY. REVEAL MINIMALLY.**

  Calendar access is not calendar disclosure. Opal may reason over permissioned
  free/busy for many people and surface only the smallest useful shared
  coordination signal — never peer event titles, private causes, or
  high-resolution free/busy introspection of another human.

  Temporal models:
  - `fixed_event` — event time is truth; assess participation around it
  - `chosen_social_time` — humans are choosing; search overlapping availability

  This module does **not**:
  - authorize Set
  - write or move calendar events
  - invent end times for open-ended social time
  - expose calendar heatmaps on Home
  """

  alias OpalCore.SocialFlow.RealWorld.Calendar.Aggregation

  @schema "0.1.0"
  @slot_step_minutes 15
  @preferred_slot_minutes 30
  @soft_horizon_minutes 90
  @oracle_probe_limit 4
  @oracle_min_bucket_minutes 15

  @forbidden_shared_keys ~w(
    calendar_title event_title event_notes private_reason unavailable_reason
    therapy work_meeting medical family_obligation raw_calendar_title
    peer_busy_until peer_free_from busy_reason conflict_title
  )

  @dayparts %{
    "morning" => {8, 0, 12, 0},
    "afternoon" => {12, 0, 17, 0},
    "evening" => {17, 0, 21, 0},
    "night" => {21, 0, 23, 59},
    "after_work" => {17, 0, 21, 0},
    "after work" => {17, 0, 21, 0},
    "after_school" => {15, 0, 18, 0},
    "after school" => {15, 0, 18, 0},
    "lunch" => {11, 30, 13, 30},
    "brunch" => {10, 0, 13, 0},
    "late_night" => {22, 0, 24, 0},
    "late night" => {22, 0, 24, 0},
    "weekend_evening" => {17, 0, 22, 0},
    "weekend evening" => {17, 0, 22, 0},
    "weekday_evening" => {17, 0, 21, 0},
    "weekday evening" => {17, 0, 21, 0}
  }

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc """
  Compose multi-person free/busy into a privacy-preserving fit result.

  Required attrs:
  - `:participants` — list of maps:
      `%{user_id, busy_blocks, calendar_connected, required?, optional?,
         flexibility, late_ok?, timezone}`
  - `:mode` — `"fixed_event"` | `"chosen_social_time"` (default)

  Optional:
  - `:daypart` / `:dayparts` — human daypart strings
  - `:date` — Date or ISO date for daypart anchoring
  - `:candidate_start` / `:candidate_end` — explicit window (UTC DateTime)
  - `:fixed_start` / `:fixed_end` — fixed event time
  - `:actor_user_id` — for private-only guidance
  - `:timezone` — display / daypart zone (default `"UTC"`)
  - `:probe_history` — prior probe count for oracle resistance
  - `:open_ended` — default true for chosen social time
  - `:conversation_agreed_daypart` — true when humans already agreed the daypart
  """
  def compose_fit(attrs) when is_map(attrs) do
    a = stringify(attrs)
    mode = a["mode"] || "chosen_social_time"
    participants = normalize_participants(a["participants"] || [])
    tz = a["timezone"] || "UTC"
    actor = a["actor_user_id"]

    result =
      case mode do
        "fixed_event" ->
          compose_fixed(a, participants, tz, actor)

        _ ->
          compose_chosen(a, participants, tz, actor)
      end

    assert_disclosure_safe!(result["shared"])
    result
  end

  def compose_fit(_), do: error_result(:invalid)

  @doc "Resolve a human daypart into a local wall-clock window on a date."
  def resolve_daypart(daypart, date, timezone \\ "UTC")

  def resolve_daypart(daypart, %Date{} = date, timezone) when is_binary(daypart) do
    key = daypart |> String.trim() |> String.downcase()

    case Map.get(@dayparts, key) do
      {sh, sm, eh, em} ->
        with {:ok, start_at} <- wall_to_utc(date, sh, sm, timezone),
             {:ok, end_at} <- wall_to_utc(date, eh, em, timezone) do
          {:ok,
           %{
             "daypart" => key,
             "start_at" => start_at,
             "end_at" => end_at,
             "timezone" => timezone,
             "exact_time" => false
           }}
        end

      nil ->
        {:error, :unknown_daypart}
    end
  end

  def resolve_daypart(daypart, iso, timezone) when is_binary(daypart) and is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> resolve_daypart(daypart, d, timezone)
      _ -> {:error, :invalid_date}
    end
  end

  def resolve_daypart(_, _, _), do: {:error, :invalid}

  @doc """
  Shared-safe human surface only. Never includes private causes.
  """
  def shared_safe_result(%{"shared" => shared}) when is_map(shared), do: shared
  def shared_safe_result(result) when is_map(result), do: Map.get(result, "shared") || %{}

  @doc """
  Owner-private guidance for the actor. May reference the actor's own conflict
  softly; never names peer calendar content.
  """
  def private_guidance(%{"private" => private}, actor_user_id)
      when is_map(private) and is_binary(actor_user_id) do
    case private[actor_user_id] || private[to_string(actor_user_id)] do
      nil -> nil
      guide when is_map(guide) -> Map.put(guide, "only_you", true)
      other -> other
    end
  end

  def private_guidance(_, _), do: nil

  @doc """
  Oracle-resistant probe response.

  Repeated narrow free/busy probes must not become an unrestricted free/busy
  oracle of another person. Returns only coarse shared consequences or a
  privacy-preserving refusal — never peer busy edges at arbitrary precision.
  """
  def probe_response(composition, probe) when is_map(composition) and is_map(probe) do
    p = stringify(probe)
    history = to_int(p["probe_count"] || composition["probe_count"] || 0)
    shared = shared_safe_result(composition)

    cond do
      history >= @oracle_probe_limit ->
        %{
          "schema_version" => @schema,
          "shared_safe" => true,
          "oracle_protected" => true,
          "label" => shared["label"] || "A shared window is already clear when it exists.",
          "allows_high_res_peer_busy" => false,
          "peer_busy_edges" => nil,
          "response_class" => "oracle_refusal"
        }

      is_map(shared) and shared["fit_status"] in ~w(fit partial_fit) ->
        %{
          "schema_version" => @schema,
          "shared_safe" => true,
          "oracle_protected" => true,
          "label" => shared["label"],
          "suggested_start" => shared["suggested_start"],
          "allows_high_res_peer_busy" => false,
          "peer_busy_edges" => nil,
          "response_class" => "shared_consequence_only"
        }

      true ->
        %{
          "schema_version" => @schema,
          "shared_safe" => true,
          "oracle_protected" => true,
          "label" => "Not a clear shared window yet.",
          "allows_high_res_peer_busy" => false,
          "peer_busy_edges" => nil,
          "response_class" => "no_high_res"
        }
    end
  end

  def probe_response(_, _), do: %{"shared_safe" => true, "oracle_protected" => true}

  @doc "Assert shared payload has no private calendar disclosure."
  def assert_disclosure_safe!(payload) when is_map(payload) do
    for key <- @forbidden_shared_keys do
      if Map.has_key?(payload, key) or nested_has_key?(payload, key) do
        raise "calendar disclosure leak: #{key}"
      end
    end

    # No event-name-like strings in shared labels
    label = payload["label"] || ""

    if is_binary(label) and String.match?(label, ~r/\b(therapy|work meeting|medical|appointment)\b/i) do
      raise "calendar disclosure leak: private cause in label"
    end

    :ok
  end

  def assert_disclosure_safe!(_), do: :ok

  @doc "Availability composition never authorizes Set."
  def authorizes_set?(_ \\ nil), do: false

  @doc "Composition never writes or moves calendar events."
  def authorizes_calendar_write?(_ \\ nil), do: false

  @doc "Minimum necessary shared copy for a fit."
  def fit_label(%DateTime{} = start_at, opts \\ []) do
    tz = Keyword.get(opts, :timezone, "UTC")
    open_ended? = Keyword.get(opts, :open_ended, true)
    participant_count = Keyword.get(opts, :participant_count, 2)
    who = who_phrase(participant_count)

    day = format_weekday(start_at, tz)
    time = format_clock(start_at, tz)

    if open_ended? do
      "#{day} · #{time} works for #{who}."
    else
      end_at = Keyword.get(opts, :end_at)
      end_s = if match?(%DateTime{}, end_at), do: "–#{format_clock(end_at, tz)}", else: ""
      "#{day} · #{time}#{end_s} works for #{who}."
    end
  end

  def daypart_label(daypart, opts \\ []) when is_binary(daypart) do
    participant_count = Keyword.get(opts, :participant_count, 2)
    who = who_phrase(participant_count)
    pretty = daypart |> String.replace("_", " ") |> String.trim() |> String.capitalize()
    "#{pretty} works for #{who}."
  end

  # ---------------------------------------------------------------------------
  # Fixed event mode
  # ---------------------------------------------------------------------------

  defp compose_fixed(a, participants, tz, actor) do
    with {:ok, fixed_start} <- parse_dt(a["fixed_start"] || a["candidate_start"]),
         {:ok, fixed_end} <- optional_dt(a["fixed_end"] || a["candidate_end"]) do
      soft_end = fixed_end || DateTime.add(fixed_start, @soft_horizon_minutes * 60, :second)

      assessments =
        Enum.map(participants, fn p ->
          assess_participant(p, fixed_start, soft_end)
        end)

      required = Enum.filter(assessments, & &1["required"])
      optional = Enum.filter(assessments, & &1["optional"])

      required_ok = Enum.all?(required, & &1["can_participate"])
      late_joiners = Enum.filter(assessments, & &1["late_join"])

      shared =
        cond do
          required_ok and late_joiners == [] ->
            %{
              "schema_version" => @schema,
              "mode" => "fixed_event",
              "fit_status" => "fit",
              "label" => fixed_event_label(a, fixed_start, tz),
              "event_start" => DateTime.to_iso8601(fixed_start),
              "event_end" => if(fixed_end, do: DateTime.to_iso8601(fixed_end), else: nil),
              "open_ended" => is_nil(fixed_end),
              "shared_safe" => true,
              "no_private_schedule" => true,
              "find_a_time" => false,
              "authorizes_set" => false
            }

          required_ok ->
            %{
              "schema_version" => @schema,
              "mode" => "fixed_event",
              "fit_status" => "partial_fit",
              "label" => partial_fixed_label(a, fixed_start, late_joiners, tz),
              "event_start" => DateTime.to_iso8601(fixed_start),
              "open_ended" => is_nil(fixed_end),
              "shared_safe" => true,
              "no_private_schedule" => true,
              "late_join_count" => length(late_joiners),
              "find_a_time" => false,
              "authorizes_set" => false
            }

          true ->
            %{
              "schema_version" => @schema,
              "mode" => "fixed_event",
              "fit_status" => "conflict",
              "label" => "This time may not work for everyone.",
              "event_start" => DateTime.to_iso8601(fixed_start),
              "shared_safe" => true,
              "no_private_schedule" => true,
              "find_a_time" => false,
              "authorizes_set" => false
            }
        end

      private = build_private(assessments, actor, fixed_start, soft_end)

      %{
        "schema_version" => @schema,
        "mode" => "fixed_event",
        "shared" => shared,
        "private" => private,
        "coverage" => coverage(participants),
        "participant_count" => length(participants),
        "optional_count" => length(optional),
        "authorizes_set" => false,
        "authorizes_calendar_write" => false
      }
    else
      _ -> error_result(:invalid_fixed_time)
    end
  end

  # ---------------------------------------------------------------------------
  # Chosen social time mode
  # ---------------------------------------------------------------------------

  defp compose_chosen(a, participants, tz, actor) do
    coverage = coverage(participants)

    with {:ok, window_start, window_end, daypart_meta} <- resolve_search_window(a, tz) do
      # Partial calendar: do not claim "both" without evidence
      required = Enum.filter(participants, & &1["required"])
      connected_required =
        Enum.filter(required, fn p ->
          p["calendar_connected"] == true or p["busy_blocks"] != []
        end)

      assessments =
        Enum.map(participants, fn p ->
          free_from = free_from_in_window(p, window_start, window_end)
          flexible? = flexible?(p)

          %{
            "user_id" => p["user_id"],
            "required" => p["required"],
            "optional" => p["optional"],
            "calendar_connected" => p["calendar_connected"] == true,
            "free_from" => free_from,
            "flexible" => flexible?,
            "late_ok" => p["late_ok"] == true,
            "coverage" => participant_coverage(p)
          }
        end)

      required_assess = Enum.filter(assessments, & &1["required"])

      case choose_slot(required_assess, assessments, window_start, window_end, a) do
        {:ok, slot_start, meta} ->
          open_ended? = a["open_ended"] != false
          soft_end = DateTime.add(slot_start, @soft_horizon_minutes * 60, :second)
          n = length(required_assess)
          fit_status = meta["fit_status"] || "fit"

          label =
            cond do
              fit_status == "needs_flexibility_confirm" ->
                "Possible if someone makes room — confirmation needed."

              daypart_meta["exact_time"] == false and a["conversation_agreed_daypart"] == true and
                  a["prefer_daypart_label"] == true ->
                daypart_label(daypart_meta["daypart"] || "evening", participant_count: n)

              true ->
                fit_label(slot_start,
                  timezone: tz,
                  open_ended: open_ended?,
                  participant_count: n
                )
            end

          shared = %{
            "schema_version" => @schema,
            "mode" => "chosen_social_time",
            "fit_status" => fit_status,
            "label" => label,
            "suggested_start" =>
              if(fit_status == "needs_flexibility_confirm",
                do: nil,
                else: DateTime.to_iso8601(slot_start)
              ),
            # Soft internal horizon never becomes fabricated human end
            "suggested_end" => nil,
            "open_ended" => open_ended?,
            "daypart" => daypart_meta["daypart"],
            "timezone" => tz,
            "shared_safe" => true,
            "no_private_schedule" => true,
            "coverage" => coverage,
            "auto_moved_calendar" => false,
            "authorizes_set" => false,
            "find_a_time" => true
          }

          # Do not claim multi-person fit without calendar evidence for required peers
          shared =
            if length(connected_required) < length(required) and length(required) > 1 do
              incomplete_shared(shared, assessments, actor, tz, daypart_meta)
            else
              shared
            end

          private = build_private_chosen(assessments, actor, slot_start, soft_end)

          %{
            "schema_version" => @schema,
            "mode" => "chosen_social_time",
            "shared" => shared,
            "private" => private,
            "coverage" => coverage,
            "participant_count" => length(participants),
            "window_start" => DateTime.to_iso8601(window_start),
            "window_end" => DateTime.to_iso8601(window_end),
            "internal_soft_horizon_minutes" => @soft_horizon_minutes,
            "authorizes_set" => false,
            "authorizes_calendar_write" => false,
            "probe_count" => to_int(a["probe_count"] || 0)
          }

        {:error, :no_overlap} ->
          %{
            "schema_version" => @schema,
            "mode" => "chosen_social_time",
            "shared" => %{
              "schema_version" => @schema,
              "mode" => "chosen_social_time",
              "fit_status" => "no_overlap",
              "label" => "Not a clear shared window yet.",
              "shared_safe" => true,
              "no_private_schedule" => true,
              "authorizes_set" => false
            },
            "private" => build_private_chosen(assessments, actor, window_start, window_end),
            "coverage" => coverage,
            "authorizes_set" => false,
            "authorizes_calendar_write" => false
          }

        {:error, :needs_flexibility_confirm} = err ->
          flex_result(err, assessments, actor, window_start, window_end, coverage, tz, daypart_meta)
      end
    else
      {:error, reason} -> error_result(reason)
    end
  end

  defp incomplete_shared(shared, assessments, actor, tz, daypart_meta) do
    # Private calendar only for actor + conversation evidence path
    actor_assess =
      Enum.find(assessments, fn a -> a["user_id"] == actor end)

    cond do
      actor_assess && actor_assess["free_from"] ->
        start_at = actor_assess["free_from"]

        shared
        |> Map.put("fit_status", "partial_coverage")
        |> Map.put(
          "label",
          "#{format_weekday(start_at, tz)} works for you. Waiting on others' availability."
        )
        |> Map.put("suggested_start", nil)
        |> Map.put("works_for_both", false)

      daypart_meta["daypart"] ->
        shared
        |> Map.put("fit_status", "partial_coverage")
        |> Map.put("label", "Waiting on everyone's availability.")
        |> Map.put("suggested_start", nil)
        |> Map.put("works_for_both", false)

      true ->
        shared
        |> Map.put("fit_status", "partial_coverage")
        |> Map.put("label", "Waiting on everyone's availability.")
        |> Map.put("works_for_both", false)
    end
  end

  defp flex_result(
         {:error, :needs_flexibility_confirm},
         assessments,
         actor,
         window_start,
         window_end,
         coverage,
         _tz,
         _daypart_meta
       ) do
    %{
      "schema_version" => @schema,
      "mode" => "chosen_social_time",
      "shared" => %{
        "schema_version" => @schema,
        "mode" => "chosen_social_time",
        "fit_status" => "needs_flexibility_confirm",
        "label" => "Possible if someone makes room — confirmation needed.",
        "shared_safe" => true,
        "no_private_schedule" => true,
        "authorizes_set" => false,
        "auto_moved_calendar" => false
      },
      "private" => build_private_chosen(assessments, actor, window_start, window_end),
      "coverage" => coverage,
      "authorizes_set" => false,
      "authorizes_calendar_write" => false
    }
  end

  # ---------------------------------------------------------------------------
  # Slot selection
  # ---------------------------------------------------------------------------

  defp choose_slot(required_assess, all_assess, window_start, window_end, attrs) do
    free_froms =
      required_assess
      |> Enum.map(& &1["free_from"])
      |> Enum.reject(&is_nil/1)

    blocked_required =
      Enum.filter(required_assess, fn a ->
        is_nil(a["free_from"]) and a["coverage"] in ~w(calendar busy_blocks)
      end)

    cond do
      # Someone is calendar-busy for the whole window and signaled flexibility
      blocked_required != [] and
          (Enum.any?(blocked_required, &(&1["flexible"] == true)) or
             attrs["flexibility_signaled"] == true) ->
        maybe_flex(required_assess, all_assess, window_start, window_end, attrs)

      free_froms == [] and Enum.any?(required_assess, &(&1["flexible"] == true)) ->
        {:error, :needs_flexibility_confirm}

      free_froms == [] ->
        {:error, :no_overlap}

      length(free_froms) < length(required_assess) ->
        # Some required lack calendar; handled by incomplete_shared when partial coverage
        if Enum.all?(required_assess, &(&1["coverage"] == "none")) do
          slot = round_up_slot(window_start)
          {:ok, slot, %{"fit_status" => "conversation_only"}}
        else
          max_from = Enum.max_by(free_froms, &DateTime.to_unix(&1, :microsecond))
          slot = round_up_slot(max_from)

          if DateTime.compare(slot, window_end) == :lt and blocked_required == [] do
            {:ok, slot, %{"fit_status" => "partial_fit"}}
          else
            maybe_flex(required_assess, all_assess, window_start, window_end, attrs)
          end
        end

      true ->
        max_from = Enum.max_by(free_froms, &DateTime.to_unix(&1, :microsecond))
        slot = round_up_slot(max_from)

        if DateTime.compare(slot, window_end) == :lt do
          # Optional late joiners do not block
          {:ok, slot, %{"fit_status" => "fit"}}
        else
          maybe_flex(required_assess, all_assess, window_start, window_end, attrs)
        end
    end
  end

  defp maybe_flex(required_assess, _all, window_start, window_end, attrs) do
    if Enum.any?(required_assess, &(&1["flexible"] == true)) or
         attrs["flexibility_signaled"] == true do
      # Flexibility is considered — but never auto-moves calendar
      slot = round_up_slot(window_start)

      if DateTime.compare(slot, window_end) == :lt do
        {:ok, slot,
         %{
           "fit_status" => "needs_flexibility_confirm",
           "auto_moved" => false,
           "auto_moved_calendar" => false
         }}
      else
        {:error, :needs_flexibility_confirm}
      end
    else
      {:error, :no_overlap}
    end
  end

  defp free_from_in_window(p, window_start, window_end) do
    busy = List.wrap(p["busy_blocks"])

    cond do
      p["calendar_connected"] != true and busy == [] ->
        nil

      busy == [] ->
        window_start

      true ->
        # Find earliest start in window where soft-horizon is free, or after last overlapping busy
        overlapping =
          busy
          |> Enum.map(&normalize_busy/1)
          |> Enum.reject(&is_nil/1)
          |> Enum.filter(fn {bs, be} ->
            DateTime.compare(be, window_start) == :gt and
              DateTime.compare(window_end, bs) == :gt
          end)
          |> Enum.sort_by(fn {bs, _} -> DateTime.to_unix(bs, :microsecond) end)

        case overlapping do
          [] ->
            window_start

          blocks ->
            # Earliest free start = max(window_start, max busy end of blocks that cover window_start chain)
            free_cursor = advance_past_busy(window_start, blocks)

            if DateTime.compare(free_cursor, window_end) == :lt do
              free_cursor
            else
              nil
            end
        end
    end
  end

  defp advance_past_busy(cursor, []), do: cursor

  defp advance_past_busy(cursor, blocks) do
    Enum.reduce(blocks, cursor, fn {bs, be}, cur ->
      # If busy overlaps current cursor, jump to busy end
      if DateTime.compare(be, cur) == :gt and DateTime.compare(cur, bs) != :lt do
        be
      else
        # If busy starts at/after cur and we only care free-from earliest continuous
        if DateTime.compare(bs, cur) != :gt and DateTime.compare(be, cur) == :gt do
          be
        else
          cur
        end
      end
    end)
  end

  defp normalize_busy(b) do
    b = stringify(b)

    with {:ok, s} <- parse_dt(b["start_at"] || b["start"]),
         {:ok, e} <- parse_dt(b["end_at"] || b["end"]) do
      {s, e}
    else
      _ -> nil
    end
  end

  defp round_up_slot(%DateTime{} = dt) do
    # Prefer :30 then :00 after free_from for human-friendly social times
    seconds = dt.second
    micro = dt.microsecond

    dt =
      if seconds > 0 or elem(micro, 0) > 0 do
        dt
        |> DateTime.add(60 - seconds, :second)
        |> Map.put(:microsecond, {0, 6})
      else
        dt
      end

    minutes = dt.minute

    cond do
      minutes == 0 or minutes == @preferred_slot_minutes ->
        dt

      minutes < @preferred_slot_minutes ->
        DateTime.add(dt, (@preferred_slot_minutes - minutes) * 60, :second)

      true ->
        DateTime.add(dt, (60 - minutes) * 60, :second)
    end
  end

  # ---------------------------------------------------------------------------
  # Participant assessment (fixed)
  # ---------------------------------------------------------------------------

  defp assess_participant(p, start_at, end_at) do
    busy = List.wrap(p["busy_blocks"])
    free? = free_during_normalized?(busy, start_at, end_at)
    flexible? = flexible?(p)
    late_ok? = p["late_ok"] == true

    free_from = free_from_in_window(p, start_at, end_at)

    late_join? =
      not free? and late_ok? and match?(%DateTime{}, free_from) and
        DateTime.compare(free_from, start_at) == :gt and
        DateTime.compare(free_from, end_at) == :lt

    can? = free? or flexible? or late_join?

    %{
      "user_id" => p["user_id"],
      "required" => p["required"],
      "optional" => p["optional"],
      "can_participate" => can?,
      "free" => free?,
      "flexible" => flexible?,
      "late_join" => late_join?,
      "free_from" => free_from,
      "calendar_connected" => p["calendar_connected"] == true
    }
  end

  defp free_during_normalized?(busy_blocks, %DateTime{} = start_at, %DateTime{} = end_at)
       when is_list(busy_blocks) do
    blocks =
      busy_blocks
      |> Enum.map(&normalize_busy/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(fn {s, e} -> %{"start_at" => s, "end_at" => e, "busy" => true} end)

    Aggregation.free_during?(blocks, start_at, end_at)
  end

  defp free_during_normalized?(_, _, _), do: false

  # ---------------------------------------------------------------------------
  # Private guidance
  # ---------------------------------------------------------------------------

  defp build_private(assessments, actor, start_at, _end_at) when is_binary(actor) do
    case Enum.find(assessments, &(&1["user_id"] == actor)) do
      nil ->
        %{}

      a ->
        copy =
          cond do
            a["free"] == true ->
              "You're clear for this time."

            a["late_join"] == true and match?(%DateTime{}, a["free_from"]) ->
              "You have a conflict earlier. Joining after #{format_clock(a["free_from"], "UTC")} still works."

            a["flexible"] == true ->
              "You signaled flexibility — confirm if you want to make room. Opal will not move calendar events without you."

            true ->
              "You have a conflict at #{format_clock(start_at, "UTC")}."
          end

        %{
          actor => %{
            "only_you" => true,
            "copy" => copy,
            "shared_safe" => false,
            "no_peer_calendar_details" => true
          }
        }
    end
  end

  defp build_private(_, _, _, _), do: %{}

  defp build_private_chosen(assessments, actor, slot_start, _soft_end) when is_binary(actor) do
    case Enum.find(assessments, &(&1["user_id"] == actor)) do
      nil ->
        %{}

      a ->
        copy =
          cond do
            match?(%DateTime{}, a["free_from"]) and
                DateTime.compare(a["free_from"], slot_start) == :gt ->
              "You have a conflict near #{format_clock(a["free_from"], "UTC")}. #{format_clock(slot_start, "UTC")} fits both calendars better."

            match?(%DateTime{}, a["free_from"]) ->
              "You're clear by #{format_clock(slot_start, "UTC")}."

            a["flexible"] == true ->
              "You said you can move things — confirm before anything is treated as free. No calendar moves without you."

            a["calendar_connected"] != true ->
              "Calendar not connected — using what you've said."

            true ->
              "Private availability only."
          end

        %{
          actor => %{
            "only_you" => true,
            "copy" => copy,
            "shared_safe" => false,
            "no_peer_calendar_details" => true
          }
        }
    end
  end

  defp build_private_chosen(_, _, _, _), do: %{}

  # ---------------------------------------------------------------------------
  # Window resolution
  # ---------------------------------------------------------------------------

  defp resolve_search_window(a, tz) do
    cond do
      a["candidate_start"] ->
        with {:ok, s} <- parse_dt(a["candidate_start"]),
             {:ok, e} <- parse_dt(a["candidate_end"] || DateTime.add(s, 4 * 3600, :second)) do
          {:ok, s, e, %{"exact_time" => true}}
        end

      a["daypart"] || a["dayparts"] ->
        daypart = a["daypart"] || List.first(List.wrap(a["dayparts"]))
        date = parse_date(a["date"]) || next_matching_date(daypart, DateTime.utc_now())

        case resolve_daypart(daypart, date, tz) do
          {:ok, w} -> {:ok, w["start_at"], w["end_at"], w}
          err -> err
        end

      true ->
        {:error, :need_daypart_or_candidate}
    end
  end

  defp parse_date(%Date{} = d), do: d

  defp parse_date(iso) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp parse_date(_), do: nil

  defp next_matching_date(daypart, %DateTime{} = now) do
    # weekend evening → next sat/sun; else today or tomorrow if past daypart
    key = daypart |> to_string() |> String.downcase()
    today = DateTime.to_date(now)

    cond do
      String.contains?(key, "weekend") ->
        next_weekend(today)

      true ->
        today
    end
  end

  defp next_weekend(%Date{} = d) do
    case Date.day_of_week(d) do
      6 -> d
      7 -> d
      n -> Date.add(d, 6 - n)
    end
  end

  # ---------------------------------------------------------------------------
  # Labels
  # ---------------------------------------------------------------------------

  defp fixed_event_label(a, start_at, tz) do
    title = a["event_label"] || a["title"] || "Event"
    "#{title} · #{format_weekday(start_at, tz)} · #{format_clock(start_at, tz)}"
  end

  defp partial_fixed_label(a, start_at, late_joiners, tz) do
    base = fixed_event_label(a, start_at, tz)
    n = length(late_joiners)

    if n == 1 do
      "#{base} · one person joining later."
    else
      "#{base} · #{n} joining later."
    end
  end

  defp who_phrase(1), do: "you"
  defp who_phrase(2), do: "both of you"
  defp who_phrase(n) when is_integer(n) and n > 2, do: "everyone"
  defp who_phrase(_), do: "you"

  defp format_weekday(%DateTime{} = dt, tz) do
    local = to_zone(dt, tz)
    Enum.at(~w(Monday Tuesday Wednesday Thursday Friday Saturday Sunday), Date.day_of_week(local) - 1)
  end

  defp format_clock(%DateTime{} = dt, tz) do
    local = to_zone(dt, tz)
    hour = local.hour
    minute = local.minute
    {h12, ampm} = if hour >= 12, do: {if(hour == 12, do: 12, else: hour - 12), "PM"}, else: {if(hour == 0, do: 12, else: hour), "AM"}

    if minute == 0 do
      "#{h12} #{ampm}"
    else
      "#{h12}:#{String.pad_leading(Integer.to_string(minute), 2, "0")} #{ampm}"
    end
  end

  defp to_zone(%DateTime{} = dt, "UTC"), do: dt

  defp to_zone(%DateTime{} = dt, tz) when is_binary(tz) do
    case DateTime.shift_zone(dt, tz) do
      {:ok, local} -> local
      _ -> dt
    end
  end

  defp to_zone(dt, _), do: dt

  defp wall_to_utc(%Date{} = date, hour, minute, timezone) do
    # hour 24 → next day 00:00
    {date, hour, minute} =
      if hour >= 24 do
        {Date.add(date, 1), hour - 24, minute}
      else
        {date, hour, minute}
      end

    case DateTime.new(date, Time.new!(hour, minute, 0), timezone) do
      {:ok, local, _} ->
        case DateTime.shift_zone(local, "Etc/UTC") do
          {:ok, utc} -> {:ok, DateTime.truncate(utc, :microsecond)}
          _ -> {:ok, DateTime.truncate(local, :microsecond)}
        end

      {:ok, local} ->
        {:ok, DateTime.truncate(local, :microsecond)}

      {:ambiguous, a, _} ->
        {:ok, DateTime.truncate(a, :microsecond)}

      {:gap, a, _} ->
        {:ok, DateTime.truncate(a, :microsecond)}

      _ ->
        # Fallback: treat as UTC wall clock
        {:ok,
         %DateTime{
           year: date.year,
           month: date.month,
           day: date.day,
           hour: hour,
           minute: minute,
           second: 0,
           microsecond: {0, 6},
           time_zone: "Etc/UTC",
           zone_abbr: "UTC",
           utc_offset: 0,
           std_offset: 0
         }}
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp normalize_participants(list) when is_list(list) do
    Enum.map(list, fn p ->
      p = stringify(p)
      optional? = p["optional"] == true
      required? = if Map.has_key?(p, "required"), do: p["required"] != false, else: not optional?

      %{
        "user_id" => p["user_id"] || p["id"],
        "busy_blocks" => strip_titles(List.wrap(p["busy_blocks"] || [])),
        "calendar_connected" => p["calendar_connected"] == true,
        "required" => required?,
        "optional" => optional?,
        "flexibility" => p["flexibility"] || p["flexibility_signal"],
        "late_ok" => p["late_ok"] == true or p["start_without_me"] == true,
        "timezone" => p["timezone"] || "UTC"
      }
    end)
  end

  defp strip_titles(blocks) do
    Enum.map(blocks, fn b ->
      b = stringify(b)

      Map.drop(b, ~w(title event_title summary description attendees therapy notes))
      |> Map.put("no_event_titles", true)
      |> Map.put("busy", b["busy"] != false)
    end)
  end

  defp flexible?(p) do
    f = p["flexibility"] || p["flexibility_signal"]

    f in [
      true,
      "flexible",
      "can_move",
      "can_make_room",
      "possible_with_change",
      "I'll skip that",
      "i can move things around"
    ] or
      (is_binary(f) and String.contains?(String.downcase(f), "move"))
  end

  defp coverage(participants) do
    connected = Enum.count(participants, &(&1["calendar_connected"] == true))
    total = length(participants)

    cond do
      total == 0 -> "none"
      connected == 0 -> "none"
      connected == total -> "full"
      true -> "partial"
    end
  end

  defp participant_coverage(p) do
    cond do
      p["calendar_connected"] == true -> "calendar"
      p["busy_blocks"] != [] -> "busy_blocks"
      true -> "none"
    end
  end

  defp error_result(reason) do
    %{
      "schema_version" => @schema,
      "shared" => %{
        "schema_version" => @schema,
        "fit_status" => "error",
        "label" => "Could not resolve a shared time.",
        "shared_safe" => true,
        "no_private_schedule" => true,
        "reason_class" => to_string(reason),
        "authorizes_set" => false
      },
      "private" => %{},
      "authorizes_set" => false,
      "authorizes_calendar_write" => false
    }
  end

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    iso = if String.contains?(iso, "T"), do: iso, else: iso <> "T00:00:00Z"
    iso = if String.ends_with?(iso, "Z") or String.contains?(iso, "+"), do: iso, else: iso <> "Z"

    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp parse_dt(_), do: {:error, :invalid_datetime}

  defp optional_dt(nil), do: {:ok, nil}
  defp optional_dt(v), do: parse_dt(v)

  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_binary(n), do: String.to_integer(n)
  defp to_int(_), do: 0

  defp nested_has_key?(map, key) when is_map(map) do
    Enum.any?(map, fn
      {^key, _} -> true
      {_, v} when is_map(v) -> nested_has_key?(v, key)
      {_, v} when is_list(v) -> Enum.any?(v, &(is_map(&1) and nested_has_key?(&1, key)))
      _ -> false
    end)
  end

  defp nested_has_key?(_, _), do: false

  defp stringify(%DateTime{} = dt), do: dt
  defp stringify(%Date{} = d), do: d
  defp stringify(%Time{} = t), do: t
  defp stringify(%NaiveDateTime{} = n), do: n

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(%DateTime{} = dt), do: dt
  defp stringify_val(%Date{} = d), do: d
  defp stringify_val(%Time{} = t), do: t
  defp stringify_val(%NaiveDateTime{} = n), do: n
  defp stringify_val(list) when is_list(list), do: Enum.map(list, &stringify_val/1)
  defp stringify_val(%{__struct__: _} = struct), do: struct
  defp stringify_val(map) when is_map(map), do: stringify(map)
  defp stringify_val(v), do: v

  # Silence unused attrs for slot step constant (reserved for future grid search)
  def slot_step_minutes, do: @slot_step_minutes
  def oracle_min_bucket_minutes, do: @oracle_min_bucket_minutes
end
