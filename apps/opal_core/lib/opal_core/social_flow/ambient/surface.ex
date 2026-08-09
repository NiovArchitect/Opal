defmodule OpalCore.SocialFlow.Ambient.Surface do
  @moduledoc """
  Gate whether Ambient Opportunity materializes into conversation.

  Silence is success. High threshold. Existing Restraint + existing Opal grammar.
  No heat map, no feed, no Around You page.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.Restraint

  @doc """
  Decide surface vs silence for a computed opportunity.
  """
  def decide(attrs) when is_map(attrs) do
    a = stringify(attrs)

    confidence = to_f(a["confidence"] || 0.5)
    actionable? = a["actionable"] == true
    rising? = a["momentum_rising"] == true or a["this_got_easy"] == true
    density_ok? = to_f(a["density"] || 0.0) >= 0.45
    privacy_ok? = a["privacy_ok"] != false
    stale? = a["topic_changed"] == true or a["stale"] == true
    blocked? = a["blocked"] == true
    interruption_cost = to_f(a["interruption_cost"] || 0.3)
    recent = to_i(a["recent_suggestion_count"] || 0)

    restraint =
      Restraint.decide(%{
        "forming?" => a["forming?"] != false,
        "context_confidence" => confidence,
        "participant_count" => max(to_i(a["participant_count"] || 2), 2),
        "option_count" => max(to_i(a["option_count"] || 1), 1),
        "preferred_quality" => to_f(a["preferred_quality"] || 2.0),
        "recent_suggestion_count" => recent,
        "missing_information_count" => to_i(a["unknown_count"] || 0)
      })

    cond do
      blocked? ->
        silence("blocked")

      stale? ->
        silence("topic_changed")

      not privacy_ok? ->
        silence("privacy")

      match?({:silence, _}, restraint) ->
        silence(elem(restraint, 1))

      not actionable? ->
        silence("not_actionable")

      confidence < 0.72 ->
        silence("low_confidence")

      interruption_cost > 0.7 and not rising? ->
        silence("interruption_cost")

      not density_ok? and not rising? ->
        silence("weak_density")

      true ->
        {:ok,
         %{
           "surface" => :opportunity,
           "copy" => a["copy"] || default_copy(a),
           "options" => Enum.take(List.wrap(a["options"]), 3),
           "feed" => false,
           "heat_map" => false,
           "around_you_page" => false,
           "authorizes_set" => false,
           "then_get_quiet" => true
         }}
    end
  end

  def decide(_), do: silence("invalid")

  defp silence(reason) do
    {:ok,
     %{"surface" => :silence, "reason" => reason, "feed" => false, "authorizes_set" => false}}
  end

  defp default_copy(a) do
    cond do
      a["this_got_easy"] == true -> "This one actually lines up."
      a["expiring"] == true -> "This works right now."
      a["option_count"] in 1..3 -> "This could be fun tonight."
      true -> "This could work."
    end
  end

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
