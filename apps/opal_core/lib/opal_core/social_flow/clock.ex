defmodule OpalCore.SocialFlow.Clock do
  @moduledoc """
  Small injectable server clock for temporal follow-through and the
  notification / quiet-hours path (AttentionBudget, NotificationIntelligence,
  ProactiveConversation, celebration reminders, inbox fanout).

  Production: DateTime.utc_now/0.
  Tests / verification runs may pin "now" — highest precedence first:

  1. `freeze/1` / `unfreeze/0` — process-local frozen instant.
  2. Application env `:opal_core, :clock_override` — a `%DateTime{}`, an
     ISO-8601 binary, or a 0-arity fun returning a `%DateTime{}`.
     Global (crosses process boundaries, unlike `freeze/1`), so it also
     pins code running in request/worker processes.
  3. Application config `:opal_core, OpalCore.SocialFlow.Clock, now: fun`
     (legacy seam).
  4. `OPAL_CLOCK_OVERRIDE` OS env var — an ISO-8601 instant, e.g.
     `OPAL_CLOCK_OVERRIDE=2026-10-17T09:00:00Z mix test` pins the whole
     run to 02:00 America/Los_Angeles (PDT); `...T21:00:00Z` pins 14:00.

  With none of these set, behavior is exactly the real wall clock.

  Client clocks are never authority for durable deadline evaluation.
  """

  @process_key :opal_social_flow_clock_now

  @doc "Canonical UTC now for scheduler / temporal evaluation."
  def utc_now do
    cond do
      match?(%DateTime{}, Process.get(@process_key)) ->
        Process.get(@process_key)

      match?(%DateTime{}, app_override()) ->
        app_override()

      is_function(config_now(), 0) ->
        config_now().()

      match?(%DateTime{}, env_override()) ->
        env_override()

      true ->
        DateTime.utc_now() |> DateTime.truncate(:microsecond)
    end
  end

  @doc "Freeze clock in the current process (tests)."
  def freeze(%DateTime{} = dt) do
    Process.put(@process_key, DateTime.truncate(dt, :microsecond))
    :ok
  end

  def freeze(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> freeze(dt)
      _ -> {:error, :invalid_datetime}
    end
  end

  @doc "Clear process freeze."
  def unfreeze do
    Process.delete(@process_key)
    :ok
  end

  @doc "Advance frozen clock by seconds (tests)."
  def advance(seconds) when is_integer(seconds) do
    case Process.get(@process_key) do
      %DateTime{} = dt ->
        freeze(DateTime.add(dt, seconds, :second))

      _ ->
        {:error, :not_frozen}
    end
  end

  defp app_override do
    case Application.get_env(:opal_core, :clock_override) do
      %DateTime{} = dt -> DateTime.truncate(dt, :microsecond)
      iso when is_binary(iso) -> parse_iso(iso)
      fun when is_function(fun, 0) -> coerce(fun.())
      _ -> nil
    end
  end

  defp env_override do
    case System.get_env("OPAL_CLOCK_OVERRIDE") do
      iso when is_binary(iso) and iso != "" -> parse_iso(iso)
      _ -> nil
    end
  end

  defp coerce(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)
  defp coerce(_), do: nil

  defp parse_iso(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp config_now do
    Application.get_env(:opal_core, __MODULE__, [])[:now]
  end
end
