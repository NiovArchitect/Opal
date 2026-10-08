defmodule OpalCore.Intelligence.EnvironmentContext do
  @moduledoc """
  Cross-modal environment context (Paste D Phase 3).

  Independently gated sources:
  - location: coarse city/neighborhood ONLY — NEVER GPS in prompts; resolved
    per-request and NEVER stored (privacy guarantee).
  - calendar: omitted permanently until an integration exists (not faked).
  - time_of_day: always available from owner timezone.

  Reuses existing convoy/trip location permission — no new permission request.
  """

  @doc """
  Returns `%{location: map | :unavailable, calendar: :unavailable | map, time_of_day: string}`.
  Never returns `:fake`.
  """
  # Process dictionary audit for zero-persist proofs (tests only).
  @persist_probe :opal_env_context_persist_probe

  def get_environment_context(account_id, opts \\ []) when is_binary(account_id) do
    tz = opts[:timezone] || "America/Los_Angeles"
    coarse = opts[:coarse_location]

    # Coarse location is request-scoped — never written to Repo / ETS durable tables.
    if Process.get(@persist_probe) do
      Process.put(@persist_probe, Process.get(@persist_probe, 0) + 1)
    end

    %{
      location: location_section(coarse),
      calendar: :unavailable,
      time_of_day: time_of_day(tz),
      account_id: account_id
    }
  end

  @doc false
  def enable_persist_probe!, do: Process.put(@persist_probe, 0)

  @doc false
  def persist_probe_count, do: Process.get(@persist_probe, 0)

  def format_section(ctx) when is_map(ctx) do
    parts =
      [
        case ctx.time_of_day do
          t when is_binary(t) -> "It's #{t}."
          _ -> nil
        end,
        case ctx.location do
          %{neighborhood: n} when is_binary(n) -> "You're in #{n}."
          %{city: c} when is_binary(c) -> "You're in #{c}."
          :unavailable -> nil
          _ -> nil
        end,
        case ctx.calendar do
          %{events: events} when is_list(events) and events != [] ->
            "Calendar: " <> Enum.map_join(events, "; ", & &1[:title])

          _ ->
            nil
        end
      ]
      |> Enum.reject(&is_nil/1)

    if parts == [] or (length(parts) == 1 and match?("It's " <> _, hd(parts)) and ctx.location == :unavailable and ctx.calendar == :unavailable) do
      # Only time_of_day — still useful as Environment section
      if parts != [], do: "Environment:\n" <> Enum.join(parts, " "), else: nil
    else
      "Environment:\n" <> Enum.join(parts, " ")
    end
  end

  def format_section(_), do: nil

  defp location_section(%{neighborhood: n} = m) when is_binary(n) do
    # Discard any precise keys if present
    %{neighborhood: n, city: m[:city]}
  end

  defp location_section(%{"neighborhood" => n} = m) when is_binary(n) do
    %{neighborhood: n, city: m["city"]}
  end

  defp location_section(%{city: c}) when is_binary(c), do: %{city: c}
  defp location_section(%{"city" => c}) when is_binary(c), do: %{city: c}
  defp location_section(_), do: :unavailable

  defp time_of_day(tz) do
    case DateTime.now(tz) do
      {:ok, local} ->
        dow = Calendar.strftime(local, "%A")

        period =
          cond do
            local.hour < 5 -> "late_night"
            local.hour < 12 -> "morning"
            local.hour < 17 -> "afternoon"
            local.hour < 21 -> "evening"
            true -> "late_night"
          end

        "#{dow} #{period}"

      _ ->
        "today"
    end
  end
end
