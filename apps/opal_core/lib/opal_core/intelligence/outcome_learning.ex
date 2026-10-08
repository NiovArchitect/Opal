defmodule OpalCore.Intelligence.OutcomeLearning do
  @moduledoc """
  Outcome signals + learned preferences (Paste D Phase 1).

  Decay (founder-tunable product decision): strength *= 0.5 after 180 days.
  Yearly archive (not delete) of signals older than 365 days.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialMemory.OutcomeSignal

  @max_prefs 3

  def record(attrs) when is_map(attrs) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %OutcomeSignal{}
    |> OutcomeSignal.changeset(
      Map.merge(
        %{
          recorded_at: now,
          context: attrs[:context] || attrs["context"] || %{},
          strength: attrs[:strength] || attrs["strength"] || 0.5,
          outcome: attrs[:outcome] || attrs["outcome"] || "neutral"
        },
        Map.take(attrs, [
          :account_id,
          :signal_type,
          :ref_type,
          :ref_id,
          :context,
          :outcome,
          :strength,
          "account_id",
          "signal_type",
          "ref_type",
          "ref_id"
        ])
        |> Map.new(fn
          {k, v} when is_atom(k) -> {k, v}
          {k, v} when is_binary(k) -> {String.to_existing_atom(k), v}
        end)
      )
    )
    |> Repo.insert()
  rescue
    e ->
      Logger.warning("outcome_learning.record_failed #{Exception.message(e)}")
      {:error, :rescued}
  end

  @doc "Effective strength with 180-day half-life decay."
  def effective_strength(%OutcomeSignal{} = s, now \\ DateTime.utc_now()) do
    age_days = DateTime.diff(now, s.recorded_at, :second) / 86_400.0
    base = s.strength || 0.5
    if age_days > 180, do: base * 0.5, else: base
  end

  @doc "Top learned preferences for prompt injection (max 3, recency-weighted)."
  def learned_preferences(account_id, now \\ DateTime.utc_now()) do
    since = DateTime.add(now, -90 * 86_400, :second)

    from(s in OutcomeSignal,
      where: s.account_id == ^account_id and s.recorded_at >= ^since and s.archived == false
    )
    |> Repo.all()
    |> Enum.map(fn s -> {s, effective_strength(s, now)} end)
    |> Enum.filter(fn {s, str} ->
      (s.outcome == "negative" and str >= 0.6) or (s.outcome == "positive" and str >= 0.8)
    end)
    |> Enum.sort_by(fn {s, str} -> {-str, -DateTime.to_unix(s.recorded_at)} end)
    |> Enum.take(@max_prefs)
    |> Enum.map(fn {s, _str} -> format_pref(s) end)
  end

  defp format_pref(%OutcomeSignal{outcome: "negative"} = s) do
    ctx = s.context || %{}
    what = ctx["what"] || ctx[:what] || s.signal_type
    # Outcome-derived prefs are observed (behavior), not stated
    "[observed] Avoid: #{what} (#{s.signal_type})."
  end

  defp format_pref(%OutcomeSignal{outcome: "positive"} = s) do
    ctx = s.context || %{}
    what = ctx["what"] || ctx[:what] || s.signal_type
    "[observed] Prefer: #{what} (#{s.signal_type})."
  end

  defp format_pref(s), do: "[observed] #{s.signal_type}"
end

