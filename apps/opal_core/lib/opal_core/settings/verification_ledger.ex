defmodule OpalCore.Settings.VerificationLedger do
  @moduledoc """
  Repair #18 DIR-2 — the verification ledger behind Settings >
  Connections (verification report Part 4.4).

  Freshness TTL: 7 days for probe verification, 30 days for function
  evidence. Past TTL a connection degrades from working to unverified —
  green is never sticky. `last_verified_at` is the most recent PASSING
  event of the relevant kind(s); it is nil when no pass exists.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Settings.ConnectionVerification

  @probe_ttl_days 7
  @function_ttl_days 30

  def probe_ttl_days, do: @probe_ttl_days
  def function_ttl_days, do: @function_ttl_days

  @doc """
  Record one verification event. This is the ONLY writer. Callers are
  the probe runner and function-evidence hooks (and, in tests, the
  recorded probe outcomes from the verification report, entered as
  fixtures through this same function so the derivation path is the
  real one).
  """
  def record(attrs) when is_map(attrs) do
    attrs =
      attrs
      |> Map.new(fn
        {k, v} when is_atom(k) -> {k, v}
        {k, v} -> {safe_key(k), v}
      end)
      |> Map.put_new(:recorded_at, DateTime.utc_now() |> DateTime.truncate(:microsecond))

    %ConnectionVerification{}
    |> ConnectionVerification.changeset(attrs)
    |> Repo.insert()
  end

  defp safe_key("connection_id"), do: :connection_id
  defp safe_key("kind"), do: :kind
  defp safe_key("outcome"), do: :outcome
  defp safe_key("provider_error_code"), do: :provider_error_code
  defp safe_key("build_ref"), do: :build_ref
  defp safe_key("recorded_at"), do: :recorded_at
  defp safe_key(other), do: raise(ArgumentError, "unknown verification field: #{other}")

  @doc "All recorded events for one connection, newest first."
  def events_for(connection_id) when is_binary(connection_id) do
    from(v in ConnectionVerification,
      where: v.connection_id == ^connection_id,
      order_by: [desc: v.recorded_at]
    )
    |> Repo.all()
  end

  @doc "Every connection id that has at least one recorded event."
  def known_connection_ids do
    from(v in ConnectionVerification, select: v.connection_id, distinct: true)
    |> Repo.all()
  end

  @doc """
  Summarize the ledger for one connection at `now`:

      %{
        last_probe_pass_at: DateTime | nil,
        last_function_pass_at: DateTime | nil,
        last_event_at: DateTime | nil,
        last_event_outcome: "pass" | "fail" | "refused" | nil,
        last_error_code: String | nil
      }
  """
  def summary(connection_id, _now \\ nil) do
    events = events_for(connection_id)

    pass_at = fn kind ->
      events
      |> Enum.filter(&(&1.kind == kind and &1.outcome == "pass"))
      |> Enum.map(& &1.recorded_at)
      |> Enum.max(DateTime, fn -> nil end)
    end

    last = List.first(events)

    %{
      last_probe_pass_at: pass_at.("probe"),
      last_function_pass_at: pass_at.("function_evidence"),
      last_event_at: last && last.recorded_at,
      last_event_outcome: last && last.outcome,
      last_error_code: last && last.provider_error_code
    }
  end

  @doc "True when `at` is within `ttl_days` of `now` (and not in the future beyond a small skew)."
  def fresh?(nil, _now, _ttl_days), do: false

  def fresh?(at, now, ttl_days) do
    diff = DateTime.diff(now, at, :second)
    diff >= -60 and diff <= ttl_days * 86_400
  end

  @doc """
  Whether the recorded verification satisfies a row's basis at `now`,
  and the most recent passing timestamp for that basis.

  Returns `{satisfied?, last_verified_at, stale_pass_at}` where
  `stale_pass_at` is the most recent pass even when it is too old —
  the UI names it ("Last checked <date>") instead of going blank.
  A later fail/refused event for a basis kind voids that kind's pass.
  """
  def basis_state(summary, basis, now) do
    kinds =
      case basis do
        "probe" -> ["probe"]
        "function_evidence" -> ["function_evidence"]
        _ -> ["probe", "function_evidence"]
      end

    passes =
      Enum.map(kinds, fn
        "probe" -> summary.last_probe_pass_at
        "function_evidence" -> summary.last_function_pass_at
      end)

    ttls =
      Enum.map(kinds, fn
        "probe" -> @probe_ttl_days
        "function_evidence" -> @function_ttl_days
      end)

    stale_pass_at =
      passes |> Enum.reject(&is_nil/1) |> Enum.max(DateTime, fn -> nil end)

    failed_after_pass? =
      summary.last_event_outcome in ["fail", "refused"] and
        not is_nil(stale_pass_at) and
        DateTime.compare(summary.last_event_at, stale_pass_at) == :gt

    satisfied? =
      not failed_after_pass? and
        Enum.all?(Enum.zip(passes, ttls), fn {at, ttl} -> fresh?(at, now, ttl) end)

    last_verified_at = if satisfied?, do: stale_pass_at, else: nil

    {satisfied?, last_verified_at, stale_pass_at}
  end
end
