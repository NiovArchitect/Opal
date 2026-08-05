defmodule OpalCore.SocialFlow.DynamicIntelligence.Restraint do
  @moduledoc """
  Decides whether Opal should surface anything at all.

  Silence is a first-class successful outcome.
  """

  @min_context_confidence 0.6
  @min_option_quality 1.2
  @max_recent_suggestions 1

  @doc """
  Return `{:surface, meta}` or `{:silence, reason}`.
  """
  def decide(attrs) when is_map(attrs) do
    attrs = stringify(attrs)

    cond do
      attrs["permission_revoked"] == true ->
        {:silence, "permission_revoked"}

      attrs["group_suppressed"] == true ->
        {:silence, "group_correction"}

      not true?(attrs["forming?"]) ->
        {:silence, "context_not_forming"}

      to_float(attrs["context_confidence"]) < @min_context_confidence ->
        {:silence, "low_context_confidence"}

      to_int(attrs["participant_count"]) < 2 ->
        {:silence, "insufficient_participants"}

      to_int(attrs["option_count"]) < 1 ->
        {:silence, "no_valid_options"}

      to_float(attrs["preferred_quality"]) < @min_option_quality ->
        {:silence, "low_option_quality"}

      to_int(attrs["recent_suggestion_count"]) > @max_recent_suggestions ->
        {:silence, "suggestion_cooldown"}

      privacy_risk_high?(attrs) ->
        {:silence, "privacy_risk"}

      true ->
        social_value = estimate_value(attrs)
        cost = estimate_cost(attrs)

        if social_value > cost do
          {:surface,
           %{
             "social_value" => social_value,
             "interruption_cost" => cost,
             "decision" => "surface"
           }}
        else
          {:silence, "value_not_worth_interruption"}
        end
    end
  end

  def decide(_), do: {:silence, "invalid_input"}

  defp estimate_value(attrs) do
    conf = to_float(attrs["context_confidence"])
    quality = to_float(attrs["preferred_quality"])
    participants = to_int(attrs["participant_count"])
    conf * 2.0 + quality + participants * 0.15
  end

  defp estimate_cost(attrs) do
    base = 1.5
    recent = to_int(attrs["recent_suggestion_count"]) * 0.8
    missing = to_int(attrs["missing_information_count"]) * 0.4
    privacy = if privacy_risk_high?(attrs), do: 5.0, else: 0.2
    base + recent + missing + privacy
  end

  defp privacy_risk_high?(attrs) do
    attrs["privacy_risk"] in [true, "high"]
  end

  defp true?(true), do: true
  defp true?("true"), do: true
  defp true?(_), do: false

  defp to_float(nil), do: 0.0
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp to_float(_), do: 0.0

  defp to_int(nil), do: 0
  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_float(n), do: trunc(n)

  defp to_int(s) when is_binary(s) do
    case Integer.parse(s) do
      {i, _} -> i
      :error -> 0
    end
  end

  defp to_int(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
