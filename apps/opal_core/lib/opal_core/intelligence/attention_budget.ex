defmodule OpalCore.Intelligence.AttentionBudget do
  @moduledoc """
  Global attention budget across proactive surfaces (Paste E Phase 1).

  Founder-tunable constants (do not loosen without approval):
  - `@daily_budget` — max granted slots that count against budget per local day (default 5)
  - Quiet hours: 22:00–08:00 owner TZ (`@quiet_start` / `@quiet_end`)
  - Active window for quiet-hours bypass: message in last `@active_window_minutes` (30)
  - Dedup window: 24h on (person_id,date) or (person_id,topic)

  Priority order (higher wins on dedup):
  time_critical > mediation > reminder > proactive_thread > weekly_briefing > routine_break

  `weekly_briefing` does NOT count against daily budget but still respects quiet hours
  (defer until 08:00 local). Denied requests are logged, never tabled.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.AttentionSlot
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.ConversationIndex

  # founder-tunable
  @daily_budget 5
  @quiet_start 22
  @quiet_end 8
  @active_window_minutes 30
  @default_tz "America/Los_Angeles"

  @priority_rank %{
    "time_critical" => 6,
    "mediation" => 5,
    "reminder" => 4,
    "proactive_thread" => 3,
    "weekly_briefing" => 2,
    "routine_break" => 1
  }

  def daily_budget, do: @daily_budget
  def priority_rank, do: @priority_rank

  @doc """
  Request an attention slot.

  `surface` — calling surface atom/string (nudge | proactive_thread | mediation |
  reminder | weekly_briefing | routine_break).
  `priority` — one of AttentionSlot.priorities/0.
  `ref` — map with optional `:person_id`, `:date`, `:topic`, `:provenance`, `:nudge_type`.

  Returns `{:granted, slot_id}` | `{:denied, reason}`.
  """
  def request_slot(account_id, surface, priority, ref \\ %{})
      when is_binary(account_id) and is_binary(surface) do
    priority = normalize_priority(priority)
    ref = stringify_keys(ref || %{})
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    {_tz, local_now, local_date} = local_clock(account_id, now)

    cond do
      priority not in AttentionSlot.priorities() ->
        deny(account_id, surface, priority, :invalid_priority)

      inferred_only?(ref) ->
        # Paste E4 hard rule — never proactive on inferred alone
        deny(account_id, surface, priority, :inferred_only)

      maturity_blocks?(account_id, priority) ->
        deny(account_id, surface, priority, :maturity_gate)

      travel_blocks_routine_break?(account_id, priority) ->
        deny(account_id, surface, priority, :travel_pause_routine_break)

      in_quiet_hours?(local_now) and not quiet_bypass?(account_id, priority, now) ->
        if priority == "weekly_briefing" do
          deny(account_id, surface, priority, :quiet_hours_defer_8am)
        else
          deny(account_id, surface, priority, :quiet_hours)
        end

      # Paste I — relationship-type bounds enforce nudge frequency/style
      relationship_nudge_blocked?(account_id, priority, ref) ->
        deny(account_id, surface, priority, :relationship_bounds)

      true ->
        dedupe = dedupe_key(ref, local_date)
        grant_or_dedupe(account_id, surface, priority, ref, dedupe, local_date)
    end
  rescue
    e ->
      Logger.warning("attention_budget.request_failed #{Exception.message(e)}")
      {:denied, :error}
  end

  def request_slot(_, _, _, _), do: {:denied, :invalid}

  @doc "Map a memory nudge type to AttentionBudget priority."
  def priority_for_nudge_type(type) do
    case to_string(type) do
      "routine_broken" -> "routine_break"
      _ -> "reminder"
    end
  end

  @doc false
  def used_today(account_id, local_date \\ nil) do
    date = local_date || Date.utc_today()

    from(s in AttentionSlot,
      where:
        s.account_id == ^account_id and s.granted_on == ^date and s.status == "granted" and
          s.counts_against_budget == true
    )
    |> Repo.aggregate(:count, :id)
  end

  @doc "Intelligence maturity — delegated to ColdStart when present (E2+)."
  def maturity_of(account_id) when is_binary(account_id) do
    mod = OpalCore.Intelligence.ColdStart

    if Code.ensure_loaded?(mod) and function_exported?(mod, :maturity_of, 1) do
      mod.maturity_of(account_id)
    else
      :established
    end
  rescue
    _ -> :established
  end

  def owner_tz(account_id) do
    # Prefer travel local TZ when TravelMode is active (E5)
    mod = OpalCore.Intelligence.TravelMode

    if Code.ensure_loaded?(mod) and function_exported?(mod, :active_state, 1) do
      case mod.active_state(account_id) do
        %{current_timezone: tz} when is_binary(tz) and tz != "" ->
          tz

        _ ->
          home_tz(account_id)
      end
    else
      home_tz(account_id)
    end
  rescue
    _ -> home_tz(account_id)
  end

  defp home_tz(account_id) do
    case Repo.get_by(AssistancePreference, user_id: account_id) do
      %AssistancePreference{timezone: tz} when is_binary(tz) and tz != "" and tz != "UTC" ->
        tz

      %AssistancePreference{timezone: "UTC"} ->
        @default_tz

      _ ->
        Logger.info("attention_budget.tz_default account=#{account_id} tz=#{@default_tz}")
        @default_tz
    end
  rescue
    _ -> @default_tz
  end

  defp grant_or_dedupe(account_id, surface, priority, ref, dedupe, local_date) do
    since = DateTime.add(DateTime.utc_now(), -24 * 3600, :second)

    existing =
      from(s in AttentionSlot,
        where:
          s.account_id == ^account_id and s.dedupe_key == ^dedupe and s.status == "granted" and
            s.inserted_at >= ^since,
        order_by: [desc: s.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case existing do
      %AttentionSlot{} = slot ->
        if rank(priority) > rank(slot.priority) do
          _ =
            slot
            |> AttentionSlot.changeset(%{status: "superseded"})
            |> Repo.update()

          do_grant(account_id, surface, priority, ref, dedupe, local_date)
        else
          deny(account_id, surface, priority, :duplicate)
        end

      nil ->
        # Paste I E5 — time_critical / mediation break through when daily cap is full
        counts? = priority not in ~w(weekly_briefing time_critical mediation)

        if counts? and used_today(account_id, local_date) >= @daily_budget do
          deny(account_id, surface, priority, :daily_budget)
        else
          do_grant(account_id, surface, priority, ref, dedupe, local_date)
        end
    end
  end

  defp do_grant(account_id, surface, priority, ref, dedupe, local_date) do
    counts? = priority not in ~w(weekly_briefing time_critical mediation)

    {:ok, slot} =
      %AttentionSlot{}
      |> AttentionSlot.changeset(%{
        account_id: account_id,
        surface: surface,
        priority: priority,
        ref: ref,
        dedupe_key: dedupe,
        granted_on: local_date,
        counts_against_budget: counts?,
        status: "granted"
      })
      |> Repo.insert()

    Logger.info(
      "attention_budget.granted account=#{account_id} surface=#{surface} priority=#{priority} slot=#{slot.id}"
    )

    {:granted, slot.id}
  end

  defp deny(account_id, surface, priority, reason) do
    Logger.info(
      "attention_budget.denied account=#{account_id} surface=#{surface} priority=#{priority} reason=#{reason}"
    )

    {:denied, reason}
  end

  defp dedupe_key(ref, local_date) do
    person = ref["person_id"] || "none"
    topic = ref["topic"]
    date = ref["date"] || Date.to_iso8601(local_date)

    if is_binary(topic) and topic != "" do
      "person_topic:#{person}:#{topic}"
    else
      "person_date:#{person}:#{date}"
    end
  end

  defp rank(p), do: Map.get(@priority_rank, to_string(p), 0)

  # Paste I — "nudge" is the casual surface alias for proactive_thread priority
  defp normalize_priority(:nudge), do: "proactive_thread"
  defp normalize_priority("nudge"), do: "proactive_thread"
  defp normalize_priority(p) when is_atom(p), do: Atom.to_string(p)
  defp normalize_priority(p) when is_binary(p), do: p
  defp normalize_priority(_), do: "reminder"

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp local_clock(account_id, now) do
    tz = owner_tz(account_id)

    local =
      case DateTime.shift_zone(now, tz) do
        {:ok, l} ->
          l

        {:error, _} ->
          # Environments without tzdata: fixed offset fallback (PDT/PST approx).
          DateTime.add(now, fixed_offset_hours(tz, now) * 3600, :second)

        _ ->
          now
      end

    {tz, local, DateTime.to_date(local)}
  end

  defp fixed_offset_hours("UTC", _), do: 0
  defp fixed_offset_hours("Etc/UTC", _), do: 0

  defp fixed_offset_hours("America/Los_Angeles", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -7, else: -8
  end

  defp fixed_offset_hours("America/New_York", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -4, else: -5
  end

  # Paste H — tzdata-less fallback so night-LA CI with Asia/Tokyo test prefs stay daytime
  defp fixed_offset_hours("Asia/Tokyo", _), do: 9
  defp fixed_offset_hours("Asia/Shanghai", _), do: 8
  defp fixed_offset_hours("Australia/Sydney", %DateTime{} = utc) do
    # Rough AEDT/AEST: Oct–Mar ~AEDT (+11), else AEST (+10)
    if utc.month >= 10 or utc.month <= 3, do: 11, else: 10
  end

  defp fixed_offset_hours(_, _), do: 0

  defp pacific_dst?(%DateTime{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(_), do: false

  defp in_quiet_hours?(%DateTime{} = local) do
    h = local.hour
    h >= @quiet_start or h < @quiet_end
  end

  defp quiet_bypass?(account_id, "time_critical", now), do: active_recently?(account_id, now)
  # Paste G/I — user-command reminders never subject to quiet hours / AttentionBudget spam rules
  defp quiet_bypass?(_, "reminder", _), do: true
  defp quiet_bypass?(_, _, _), do: false

  defp active_recently?(account_id, now) do
    since = DateTime.add(now, -@active_window_minutes * 60, :second)

    from(i in ConversationIndex,
      where: i.account_id == ^account_id and i.last_activity_at >= ^since,
      limit: 1
    )
    |> Repo.exists?()
  end

  defp inferred_only?(ref) do
    case ref["provenance"] do
      "inferred" -> true
      :inferred -> true
      _ -> false
    end
  end

  defp maturity_blocks?(account_id, priority) do
    case maturity_of(account_id) do
      :new -> priority not in ~w(time_critical mediation)
      :learning -> priority not in ~w(time_critical mediation reminder)
      :established -> false
      _ -> false
    end
  end

  defp travel_blocks_routine_break?(account_id, "routine_break") do
    mod = OpalCore.Intelligence.TravelMode

    if Code.ensure_loaded?(mod) and function_exported?(mod, :active?, 1) do
      mod.active?(account_id)
    else
      false
    end
  rescue
    _ -> false
  end

  defp travel_blocks_routine_break?(_, _), do: false

  defp relationship_nudge_blocked?(account_id, priority, ref) do
    person_id = ref["person_id"] || ref[:person_id]
    type = ref["relationship_type"] || ref[:relationship_type]

    type =
      cond do
        is_binary(type) ->
          type

        is_binary(person_id) ->
          OpalCore.Relationships.get_type(account_id, person_id)

        true ->
          nil
      end

    cond do
      is_nil(type) ->
        false

      priority in ~w(time_critical mediation reminder weekly_briefing) ->
        # User reminders / mediation / briefings are not casual type-gated
        false

      priority in ~w(nudge proactive_thread routine_break) ->
        not OpalCore.Relationships.Behavior.nudge_allowed?(type, priority)

      true ->
        false
    end
  rescue
    _ -> false
  end
end
