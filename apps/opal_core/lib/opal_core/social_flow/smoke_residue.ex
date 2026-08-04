defmodule OpalCore.SocialFlow.SmokeResidue do
  @moduledoc """
  Detects and removes engineering smoke-test message residue from product history.

  Smoke tests must never leave consumer-visible clutter. Patterns match SF17-era
  browser harness labels (live pings, RT/OFF/REG markers with timestamp suffixes).
  """

  import Ecto.Query

  alias OpalCore.Messaging.Message
  alias OpalCore.Repo

  # Consumer-visible harness labels from SF17 automation. Intentionally narrow.
  @body_patterns [
    ~r/\ASF17\b/i,
    ~r/\ASF17[\s-]*(live|ghcr|saf|ping|reg|rt|off)/i,
    ~r/\ART\s+(live|reply)\b/i,
    ~r/\AOFF[0-9]+\b/i,
    ~r/\AREG\s+\d{8,}\z/i,
    ~r/\A(SF17|RT|OFF|REG)[^\n]{0,40}\d{10,}\z/i,
    ~r/\ASAFRT\d+\z/i,
    ~r/\ASF17[- ]?SAFARI[- ]?\d+/i,
    ~r/\ASF17[- ]?GHCR[- ]?\d+/i
  ]

  @doc """
  True when a message body is engineering smoke residue, not social content.
  """
  def smoke_body?(body) when is_binary(body) do
    trimmed = String.trim(body)
    trimmed != "" and Enum.any?(@body_patterns, &Regex.match?(&1, trimmed))
  end

  def smoke_body?(_), do: false

  @doc """
  Filters a list of message contracts or maps, dropping smoke residue bodies.
  """
  def reject_smoke_messages(messages) when is_list(messages) do
    Enum.reject(messages, fn m ->
      body = message_body(m)
      smoke_body?(body)
    end)
  end

  @doc """
  Prefer a non-smoke preview for conversation list rows.
  """
  def consumer_preview(body) when is_binary(body) do
    if smoke_body?(body), do: "", else: body
  end

  def consumer_preview(_), do: ""

  @doc """
  Deletes smoke-residue messages when environment allows.

  Requires `OPAL_SYNTHETIC_FIXTURE_ONLY=true` (or opts force for tests).
  Returns `{count, ids}` of deleted records (ids for evidence only).
  """
  def cleanup!(opts \\ []) do
    allowed? =
      Keyword.get(opts, :force, false) or
        Application.get_env(:opal_core, :synthetic_fixture_only) == true

    unless allowed? do
      raise "Smoke residue cleanup requires OPAL_SYNTHETIC_FIXTURE_ONLY=true (or force: true in tests)"
    end

    dry_run? = Keyword.get(opts, :dry_run, false)

    candidates =
      from(m in Message, order_by: [asc: m.inserted_at])
      |> Repo.all()
      |> Enum.filter(&smoke_body?(&1.body))

    ids = Enum.map(candidates, & &1.id)

    unless dry_run? do
      Enum.each(candidates, &Repo.delete!/1)
    end

    {length(ids), ids}
  end

  defp message_body(%{body: body}), do: body
  defp message_body(%{"body" => body}), do: body
  defp message_body(_), do: ""
end
