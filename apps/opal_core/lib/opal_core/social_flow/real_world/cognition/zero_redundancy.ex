defmodule OpalCore.SocialFlow.RealWorld.Cognition.ZeroRedundancy do
  @moduledoc """
  If Opal already knows something sufficiently — do not ask again.

  Becomes increasingly allergic to redundant questions.
  """

  @doc """
  Should Opal ask about a topic given known facts?

  Topics: :time_availability | :work_end | :area | :preference | :participation
  """
  def should_ask?(topic, known) when is_map(known) do
    k = stringify(known)

    case normalize_topic(topic) do
      :time_availability ->
        not (truthy?(k["calendar_free_for_candidate"]) or
               truthy?(k["has_fresh_windows"]) or
               truthy?(k["shared_overlap_found"]))

      :work_end ->
        not (usable_confidence?(k["work_end_confidence"]) and present?(k["work_end_at"]))

      :area ->
        not (truthy?(k["area_known"]) or truthy?(k["place_fixed"]) or
               truthy?(k["both_near_same_area"]))

      :preference ->
        not (usable_confidence?(k["preference_confidence"]) and present?(k["preference"]))

      :participation ->
        not truthy?(k["participation_known"])

      _ ->
        true
    end
  end

  def should_ask?(_, _), do: true

  @doc "Filter minimum-question topics that are already answered."
  def filter_topics(topics, known) when is_list(topics) do
    Enum.filter(topics, &should_ask?(&1, known))
  end

  def filter_topics(_, _), do: []

  defp normalize_topic(t) when is_atom(t), do: t

  defp normalize_topic(t) when is_binary(t) do
    case t do
      "time_availability" -> :time_availability
      "time" -> :time_availability
      "work_end" -> :work_end
      "area" -> :area
      "place" -> :area
      "preference" -> :preference
      "participation" -> :participation
      _ -> :unknown
    end
  end

  defp normalize_topic(_), do: :unknown

  defp usable_confidence?(c) when is_number(c), do: c >= 0.75
  defp usable_confidence?(_), do: false

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(_), do: true

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
