defmodule OpalCore.Observability.Sentry do
  @moduledoc """
  Phase 3.4 — Sentry error tracking stub.

  When `SENTRY_DSN` (or `OPAL_SENTRY_DSN`) is set, capture/1 logs that a report
  would be sent. Full Sentry SDK wiring is BLOCKED until founder provides the DSN.
  """

  alias OpalCore.Observability.StructuredLogger

  def configured? do
    dsn = System.get_env("OPAL_SENTRY_DSN") || System.get_env("SENTRY_DSN")
    is_binary(dsn) and dsn != ""
  end

  @doc "Capture an exception or error map. No-ops (with structured log) when DSN missing."
  def capture(error, context \\ %{}) do
    if configured?() do
      StructuredLogger.log("sentry.capture", %{
        "configured" => true,
        "error" => inspect(error),
        "context" => sanitize(context)
      })

      # SDK not linked until founder DSN + dependency approval.
      {:ok, :queued}
    else
      StructuredLogger.log("sentry.skipped", %{
        "configured" => false,
        "reason" => "dsn_missing",
        "error" => inspect(error)
      })

      {:ok, :skipped}
    end
  end

  defp sanitize(map) when is_map(map) do
    Map.drop(map, ["access_token", "refresh_token", "authorization", "code", "otp"])
  end

  defp sanitize(other), do: %{"value" => inspect(other)}
end
