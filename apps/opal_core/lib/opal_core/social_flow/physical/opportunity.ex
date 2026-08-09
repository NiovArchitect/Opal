defmodule OpalCore.SocialFlow.Physical.Opportunity do
  @moduledoc """
  Latent alignment opportunity detection — not a feed.

  If friends have a realistic opening, proximity, and fit:
  surface a calm private/shared-safe possibility only when actionable.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.Restraint

  @doc """
  Detect whether a proactive moment is warranted.

  Silence is success when not actionable.
  Surfaces through existing Alignment/possibility — never a feed.
  """
  def detect(attrs) when is_map(attrs) do
    a = stringify(attrs)
    participant_count = length(List.wrap(a["participant_ids"] || []))
    opening_hours = num(a["opening_hours"], 0.0)
    proximity_ok = a["proximity_ok"] == true
    confidence = num(a["confidence"], 0.5)

    restraint =
      Restraint.decide(%{
        "forming?" => a["forming?"] != false,
        "context_confidence" => confidence,
        "participant_count" => max(participant_count, 2),
        "option_count" => 1,
        "preferred_quality" => 2.0,
        "recent_suggestion_count" => a["recent_suggestion_count"] || 0,
        "missing_information_count" => 0
      })

    cond do
      match?({:silence, _}, restraint) ->
        {:ok, %{"surface" => :silence, "reason" => elem(restraint, 1)}}

      opening_hours < 1.5 ->
        {:ok, %{"surface" => :silence, "reason" => "opening_too_short"}}

      not proximity_ok ->
        {:ok, %{"surface" => :silence, "reason" => "proximity_weak"}}

      confidence < 0.7 ->
        {:ok, %{"surface" => :silence, "reason" => "low_confidence"}}

      true ->
        {:ok,
         %{
           "surface" => :opportunity,
           "private_copy" => a["private_copy"] || "This could work this weekend.",
           "shared_safe_copy" => a["shared_safe_copy"] || "This could be fun.",
           "actionable" => true,
           "feed" => false,
           "authorizes_set" => false
         }}
    end
  end

  def detect(_), do: {:ok, %{"surface" => :silence, "reason" => "invalid"}}

  defp num(nil, d), do: d
  defp num(n, _) when is_number(n), do: n * 1.0
  defp num(_, d), do: d

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
