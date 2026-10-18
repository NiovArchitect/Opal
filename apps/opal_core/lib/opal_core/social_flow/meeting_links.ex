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

  @providers ~w(zoom google_meet teams facetime other)

  @doc "The lawful meeting_provider label set (a label only - no provider integration exists)."
  def providers, do: @providers

  @doc """
  Derive the provider LABEL from a sanitized meeting link's host, or
  from explicit intent vocabulary when there is no link. Returns nil
  when nothing is known - surfaces must never guess a provider.
  """
  def provider_for(url) when is_binary(url) do
    case sanitize(url) do
      nil ->
        nil

      clean ->
        host = URI.parse(clean).host |> String.downcase()

        cond do
          String.contains?(host, "zoom.") or host == "zoom.us" -> "zoom"
          String.contains?(host, "meet.google.") -> "google_meet"
          String.contains?(host, "teams.microsoft.") or String.contains?(host, "teams.live.") -> "teams"
          String.contains?(host, "facetime.") or String.contains?(host, "apple.com") -> "facetime"
          true -> "other"
        end
    end
  end

  def provider_for(_), do: nil

  @doc "Provider label from intent vocabulary (zoom / meet / teams / facetime), or nil."
  def provider_from_text(text) when is_binary(text) do
    down = String.downcase(text)

    cond do
      String.contains?(down, "zoom") -> "zoom"
      String.contains?(down, "google meet") or String.contains?(down, "meet.google") -> "google_meet"
      String.contains?(down, "teams") -> "teams"
      String.contains?(down, "facetime") -> "facetime"
      true -> nil
    end
  end

  def provider_from_text(_), do: nil

  @doc "Normalize an explicitly supplied provider label; nil when not in the set."
  def normalize_provider(p) when p in @providers, do: p
  def normalize_provider(_), do: nil
end
