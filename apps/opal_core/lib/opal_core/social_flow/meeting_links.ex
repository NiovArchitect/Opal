defmodule OpalCore.SocialFlow.MeetingLinks do
  @moduledoc """
  Phase 4 — validate meeting URLs for virtual plans.

  Never invent a URL. Accept only http(s). Reject javascript:, data:, and
  relative schemes. Used by SharedPlan, reminders join actions, and FE contracts.
  """

  @doc "Return trimmed http(s) URL or nil. Never fabricates a link."
  def sanitize(nil), do: nil
  def sanitize(""), do: nil

  def sanitize(url) when is_binary(url) do
    trimmed = String.trim(url)

    case URI.parse(trimmed) do
      %URI{scheme: scheme, host: host} when scheme in ["http", "https"] and is_binary(host) and host != "" ->
        trimmed

      _ ->
        nil
    end
  end

  def sanitize(_), do: nil

  @doc "true when URL is a validated http(s) absolute URL."
  def valid?(url), do: is_binary(sanitize(url))

  @doc "Extract first http(s) URL from free text, or nil."
  def extract_from_text(nil), do: nil
  def extract_from_text(""), do: nil

  def extract_from_text(text) when is_binary(text) do
    case Regex.run(~r/https?:\/\/[^\s<>"']+/i, text) do
      [url | _] ->
        url
        |> String.trim_trailing(".,);]!?")
        |> sanitize()

      _ ->
        nil
    end
  end

  def extract_from_text(_), do: nil
end
