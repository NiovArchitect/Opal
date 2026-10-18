defmodule OpalCore.Observability.Sentry do
  @moduledoc """
  Sentry error reporting — HONEST NO-OP (Repair #18, BS-5).

  No Sentry SDK is linked and nothing is ever delivered to Sentry by
  this module, with or without a DSN. The previous implementation
  logged a line and returned `{:ok, :queued}` when a DSN was set — a
  fake success: callers and the health surface could believe an event
  had been reported while reports went nowhere.

  Current, explicit contract:

  - `capture/2` NEVER returns `:ok`. It returns
    `{:error, :not_configured}` when no DSN is set and
    `{:error, :reporting_not_wired}` when a DSN is set but delivery is
    not wired. The event is written to the structured log only, and
    the log line says so.
  - `configured?/0` means only "a DSN string is present". It does NOT
    mean reporting works; use `delivery_available?/0` /
    `reporting_status/0` for that truth (exposed on /health as
    `sentry_reporting`).

  Real delivery lands when the Sentry SDK dependency is approved and
  wired; until then this module's job is to refuse to pretend.
  """

  alias OpalCore.Observability.StructuredLogger

  @doc "True when a DSN env value is present. NOT a delivery claim."
  def configured? do
    dsn = System.get_env("OPAL_SENTRY_DSN") || System.get_env("SENTRY_DSN")
    is_binary(dsn) and dsn != ""
  end

  @doc "True only when capture/2 can actually deliver. Currently never."
  def delivery_available?, do: false

  @doc "Machine-readable reporting truth for health surfaces."
  def reporting_status do
    cond do
      delivery_available?() -> :delivering
      configured?() -> :not_wired
      true -> :not_configured
    end
  end

  @doc """
  Record an exception or error map in the structured log.

  Always returns an error tuple — nothing is sent to Sentry, so no
  result may claim `:queued`, `:skipped`-as-success, or delivery.
  """
  def capture(error, context \\ %{}) do
    case reporting_status() do
      :not_configured ->
        StructuredLogger.log("sentry.not_configured", %{
          "delivery" => "none",
          "reason" => "dsn_missing",
          "error" => inspect(error)
        })

        {:error, :not_configured}

      :not_wired ->
        StructuredLogger.log("sentry.not_wired", %{
          "delivery" => "none",
          "reason" => "dsn_present_but_sdk_not_linked",
          "error" => inspect(error),
          "context" => sanitize(context)
        })

        {:error, :reporting_not_wired}

      :delivering ->
        # Unreachable until a real SDK is wired; kept so the day
        # delivery_available?/0 flips, capture has exactly one honest
        # success path to implement — never a log-only one.
        {:error, :reporting_not_wired}
    end
  end

  defp sanitize(map) when is_map(map) do
    Map.drop(map, ["access_token", "refresh_token", "authorization", "code", "otp"])
  end

  defp sanitize(other), do: %{"value" => inspect(other)}
end
