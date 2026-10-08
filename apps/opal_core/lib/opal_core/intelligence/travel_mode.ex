defmodule OpalCore.Intelligence.TravelMode do
  @moduledoc """
  Travel mode (Paste E Phase 5).

  Detection: 2 city/TZ readings ≥6h apart with ≥3h timezone shift → active travel.
  City-level ONLY — never GPS.

  While active:
  - pause routine-break (AttentionBudget)
  - quiet hours use local (travel) TZ
  - briefing uses local TZ
  - temporal nudges get travel-aware copy
  - optional one proactive thread if engaged in last 48h

  On return: end state; log travel gap on routines.
  Privacy: account-scoped — B's prompts never contain A's travel.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.{AttentionBudget, TravelState}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.{ConversationIndex, Routine}

  # founder-tunable
  @reading_gap_hours 6
  @tz_shift_hours 3
  @engaged_hours 48

  def active?(account_id) when is_binary(account_id) do
    from(t in TravelState,
      where: t.account_id == ^account_id and t.active == true,
      limit: 1
    )
    |> Repo.exists?()
  end

  def active_state(account_id) when is_binary(account_id) do
    from(t in TravelState,
      where: t.account_id == ^account_id and t.active == true,
      order_by: [desc: t.started_at],
      limit: 1
    )
    |> Repo.one()
  end

  @doc "Effective timezone for quiet hours / briefing (travel local if active)."
  def effective_tz(account_id) when is_binary(account_id) do
    case active_state(account_id) do
      %TravelState{current_timezone: tz} when is_binary(tz) and tz != "" -> tz
      _ -> AttentionBudget.owner_tz(account_id)
    end
  end

  @doc """
  Ingest a coarse city/TZ reading. Never accepts lat/lng keys.
  Returns `{:ok, :tracking | :activated | :ignored}` | `{:error, reason}`.
  """
  def ingest_reading(account_id, attrs) when is_binary(account_id) and is_map(attrs) do
    city = attrs[:city] || attrs["city"]
    tz = attrs[:timezone] || attrs["timezone"]
    at = attrs[:at] || attrs["at"] || DateTime.utc_now()

    # Strip any precise keys if present
    if Map.has_key?(attrs, :lat) or Map.has_key?(attrs, "lat") or
         Map.has_key?(attrs, :lng) or Map.has_key?(attrs, "lng") or
         Map.has_key?(attrs, :latitude) or Map.has_key?(attrs, "gps") do
      Logger.warning("travel_mode.rejected_gps account=#{account_id}")
      {:error, :gps_forbidden}
    else
      do_ingest(account_id, city, tz, at)
    end
  end

  def end_travel(account_id) when is_binary(account_id) do
    case active_state(account_id) do
      %TravelState{} = state ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, state} =
          state
          |> TravelState.changeset(%{active: false, ended_at: now})
          |> Repo.update()

        _ = log_routine_gaps(account_id, state)
        Logger.info("travel_mode.ended account=#{account_id} id=#{state.id}")
        {:ok, state}

      nil ->
        {:ok, :noop}
    end
  end

  @doc "Travel-aware copy for temporal nudges."
  def temporal_nudge_copy(account_id, base_copy) when is_binary(base_copy) do
    case active_state(account_id) do
      %TravelState{current_city: city} when is_binary(city) and city != "" ->
        "#{base_copy} (You're in #{city} — adjust timing for local time.)"

      %TravelState{} ->
        "#{base_copy} (You're traveling — use local time.)"

      _ ->
        base_copy
    end
  end

  @doc "Whether a single optional proactive thread is allowed while traveling."
  def allow_travel_proactive?(account_id) when is_binary(account_id) do
    active?(account_id) and engaged_recently?(account_id)
  end

  @doc "Privacy: travel context for prompt — only for the scoped account."
  def prompt_section(account_id) when is_binary(account_id) do
    case active_state(account_id) do
      %TravelState{current_city: city, current_timezone: tz} ->
        city_bit = if is_binary(city) and city != "", do: " in #{city}", else: ""
        "Travel: currently away#{city_bit} (local TZ #{tz}). Pause routine-break nudges."

      _ ->
        nil
    end
  end

  defp do_ingest(account_id, city, tz, at) when is_binary(tz) do
    at = truncate_dt(at)
    home_tz = home_timezone(account_id)
    home_city = home_city(account_id)

    if active?(account_id) do
      # Update current city/tz on active trip
      state = active_state(account_id)

      {:ok, _} =
        state
        |> TravelState.changeset(%{
          current_city: city || state.current_city,
          current_timezone: tz
        })
        |> Repo.update()

      {:ok, :tracking}
    else
      readings = pending_readings(account_id)
      reading = %{"city" => city, "timezone" => tz, "at" => DateTime.to_iso8601(at)}
      readings = Enum.take([reading | readings], 4)
      put_pending_readings(account_id, readings)

      case detect_activation(readings, home_tz) do
        {:activate, remote_tz, remote_city} ->
          {:ok, state} =
            %TravelState{}
            |> TravelState.changeset(%{
              account_id: account_id,
              home_city: home_city,
              current_city: remote_city || city,
              home_timezone: home_tz,
              current_timezone: remote_tz,
              started_at: at,
              active: true,
              detection_readings: %{"readings" => readings}
            })
            |> Repo.insert()

          clear_pending_readings(account_id)
          Logger.info("travel_mode.activated account=#{account_id} id=#{state.id} tz=#{remote_tz}")
          {:ok, :activated}

        :wait ->
          {:ok, :tracking}
      end
    end
  end

  defp do_ingest(_, _, _, _), do: {:error, :invalid}

  defp detect_activation(readings, home_tz) when is_list(readings) do
    with [a, b | _] <- readings,
         {:ok, at_a} <- parse_dt(a["at"]),
         {:ok, at_b} <- parse_dt(b["at"]) do
      gap_h = abs(DateTime.diff(at_a, at_b, :second)) / 3600.0
      tz_a = a["timezone"]
      tz_b = b["timezone"]

      shift_ok? =
        tz_shift_hours(tz_a, home_tz) >= @tz_shift_hours or
          tz_shift_hours(tz_b, home_tz) >= @tz_shift_hours

      remote_tz =
        cond do
          tz_shift_hours(tz_a, home_tz) >= @tz_shift_hours -> tz_a
          tz_shift_hours(tz_b, home_tz) >= @tz_shift_hours -> tz_b
          true -> nil
        end

      if gap_h >= @reading_gap_hours and shift_ok? and is_binary(remote_tz) do
        city = if remote_tz == tz_a, do: a["city"], else: b["city"]
        {:activate, remote_tz, city}
      else
        :wait
      end
    else
      _ -> :wait
    end
  end

  defp tz_shift_hours(a, b) when is_binary(a) and is_binary(b) do
    abs(fixed_offset(a) - fixed_offset(b))
  end

  defp tz_shift_hours(_, _), do: 0

  defp fixed_offset("America/Los_Angeles"), do: -7
  defp fixed_offset("America/New_York"), do: -4
  defp fixed_offset("America/Chicago"), do: -5
  defp fixed_offset("Europe/London"), do: 1
  defp fixed_offset("Europe/Paris"), do: 2
  defp fixed_offset("Asia/Tokyo"), do: 9
  defp fixed_offset("UTC"), do: 0
  defp fixed_offset("Etc/UTC"), do: 0
  defp fixed_offset(_), do: 0

  defp engaged_recently?(account_id) do
    since = DateTime.add(DateTime.utc_now(), -@engaged_hours * 3600, :second)

    from(i in ConversationIndex,
      where: i.account_id == ^account_id and i.last_activity_at >= ^since,
      limit: 1
    )
    |> Repo.exists?()
  end

  defp log_routine_gaps(account_id, %TravelState{} = state) do
    from(r in Routine, where: r.account_id == ^account_id and r.archived == false)
    |> Repo.all()
    |> Enum.each(fn r ->
      Logger.info(
        "travel_mode.routine_gap account=#{account_id} routine=#{r.id} travel=#{state.id} from=#{state.started_at} to=#{state.ended_at}"
      )
    end)

    state
    |> TravelState.changeset(%{routine_gap_logged: true})
    |> Repo.update()
  end

  defp home_timezone(account_id) do
    case Repo.get_by(AssistancePreference, user_id: account_id) do
      %AssistancePreference{timezone: tz} when is_binary(tz) and tz != "" and tz != "UTC" ->
        tz

      _ ->
        "America/Los_Angeles"
    end
  end

  defp home_city(_account_id), do: nil

  # Process-dictionary pending readings (tests + short-lived); durable path uses travel_states.detection_readings on activate
  @pending_key :opal_travel_pending_readings

  defp pending_readings(account_id) do
    dict = Process.get(@pending_key) || %{}
    Map.get(dict, account_id, [])
  end

  defp put_pending_readings(account_id, readings) do
    dict = Process.get(@pending_key) || %{}
    Process.put(@pending_key, Map.put(dict, account_id, readings))
  end

  defp clear_pending_readings(account_id) do
    dict = Process.get(@pending_key) || %{}
    Process.put(@pending_key, Map.delete(dict, account_id))
  end

  defp truncate_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp truncate_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> DateTime.utc_now() |> DateTime.truncate(:microsecond)
    end
  end

  defp truncate_dt(_), do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> :error
    end
  end

  defp parse_dt(%DateTime{} = dt), do: {:ok, dt}
  defp parse_dt(_), do: :error
end
