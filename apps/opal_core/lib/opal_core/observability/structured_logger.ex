defmodule OpalCore.Observability.StructuredLogger do
  @moduledoc """
  Phase 3.4 — structured JSON logging for auth, messaging, intelligence, errors, latency.
  """

  require Logger

  @doc "Emit a structured JSON log line. Never logs secrets or OTP codes."
  def log(event, fields \\ %{}) when is_binary(event) and is_map(fields) do
    payload =
      fields
      |> Map.put("event", event)
      |> Map.put("ts", DateTime.utc_now() |> DateTime.to_iso8601())
      |> Map.put("service", "opal_core")
      |> redact()

    Logger.info(Jason.encode!(payload))
    :ok
  end

  def log_error(event, fields \\ %{}) when is_binary(event) and is_map(fields) do
    payload =
      fields
      |> Map.put("event", event)
      |> Map.put("ts", DateTime.utc_now() |> DateTime.to_iso8601())
      |> Map.put("service", "opal_core")
      |> Map.put("level", "error")
      |> redact()

    Logger.error(Jason.encode!(payload))
    :ok
  end

  defp redact(map) do
    Map.drop(map, [
      "auth_token",
      "access_token",
      "refresh_token",
      "code",
      "otp",
      "password",
      "authorization"
    ])
  end
end
