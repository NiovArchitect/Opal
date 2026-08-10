defmodule OpalCore.SocialFlow.Ambient.SmallestOutput do
  @moduledoc """
  Compress ambient evaluation into the Opal experience law:

  one useful opportunity | one smallest question | nothing

  Never a feed.
  """

  @doc """
  Reduce a full ambient result map to the smallest human-facing payload.
  """
  def compress(result) when is_map(result) do
    r = stringify(result)
    surface = get_in(r, ["surface", "surface"]) || r["surface"]

    cond do
      r["suppressed"] == true ->
        nothing("suppressed")

      surface in [:silence, "silence"] ->
        nothing(get_in(r, ["surface", "reason"]) || "silence")

      surface in [:opportunity, "opportunity"] ->
        options = Enum.take(List.wrap(r["options"] || get_in(r, ["surface", "options"])), 3)

        %{
          "kind" => "opportunity",
          "copy" => get_in(r, ["surface", "copy"]) || "This one actually lines up.",
          "options" => options,
          "option_count" => length(options),
          "then_get_quiet" => true,
          "feed" => false,
          "heat_map" => false,
          "authorizes_set" => false,
          "user_work_removed" => ~w(poll calendar_check map_search travel_math place_browse)
        }

      true ->
        question_from(r)
    end
  end

  def compress(_), do: nothing("invalid")

  @doc "Pick minimum question when not ready to surface opportunity."
  def question_from(result) when is_map(result) do
    r = stringify(result)
    v = r["viability"] || %{}
    a = r["actionability"] || %{}

    {topic, copy} =
      cond do
        v["hard_constraint_block"] == true ->
          {"hard_constraint", "This option may not work for everyone."}

        v["required_ok"] == false ->
          {"required_participant", "Still waiting on someone essential."}

        a["level"] in ["interesting", "plausible"] ->
          {"when_or_where", "When works?"}

        (a["unknown_count"] || 0) > 2 ->
          {"smallest_unknown", "One thing still open."}

        true ->
          {"confirm", "Does this work?"}
      end

    %{
      "kind" => "minimum_question",
      "topic" => topic,
      "copy" => copy,
      "options" => [],
      "feed" => false,
      "authorizes_set" => false
    }
  end

  def question_from(_), do: nothing("invalid")

  defp nothing(reason) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "feed" => false,
      "heat_map" => false,
      "authorizes_set" => false,
      "then_get_quiet" => true
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
