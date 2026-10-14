defmodule OpalCore.Center.DependencyPlanner do
  @moduledoc """
  Internal dependency graph for an active Center intent.

  Never dump as a checklist UI. Surface only the next useful unresolved
  dependency after the current user intent is satisfied.
  """

  @trip_order [
    {"people", "Who is this with?"},
    {"when", "When should this happen?"},
    {"destination", "Where are you headed?"},
    {"availability", nil},
    {"venue", nil},
    {"travel", "Travel isn't attached yet. Want me to check that next?"},
    {"lodging", "Lodging isn't attached yet. Want me to look at that?"},
    {"work_conflict", nil},
    {"reservation", nil},
    {"reveal_invite", nil}
  ]

  @doc """
  Build dependency status map from planning context.
  Values: `"resolved"` | `"pending"` | `"not_applicable"` | `"blocked_permission"`
  """
  def build(planning) when is_map(planning) do
    c = stringify(planning)

    who? = present?(c["who"] || c["primary_person"] || c["participants"])
    when? = present?(c["when"] || c["when_resolved"])
    dest? = present?(c["destination"])
    venue? = present?(c["venue"]) and c["venue_cancelled"] != true
    surprise? = c["visibility_mode"] == "surprise" or c["surprise"] == true
    travel? = present?(c["travel"]) or c["travel_attached"] == true
    lodging? = present?(c["lodging"]) or c["lodging_attached"] == true
    avail? = c["availability_checked"] == true
    work? = c["work_conflict_evaluated"] == true

    %{
      # Solo is first-class: missing who is not_applicable unless multi-person intent.
      "people" =>
        cond do
          who? -> "resolved"
          c["solo"] == true or c["wants_restaurant"] == true -> "not_applicable"
          true -> "pending"
        end,
      "when" => if(when?, do: "resolved", else: "pending"),
      "destination" => if(dest?, do: "resolved", else: "pending"),
      "availability" =>
        cond do
          not who? -> "not_applicable"
          avail? -> "resolved"
          surprise? -> "pending"
          true -> "pending"
        end,
      "venue" =>
        cond do
          c["wants_restaurant"] == true or c["category"] in ["restaurant", "dinner", "food"] ->
            status_resolved(venue?)

          true ->
            "not_applicable"
        end,
      "travel" =>
        cond do
          dest? and venue? -> status_resolved(travel?)
          dest? -> status_resolved(travel?)
          true -> "not_applicable"
        end,
      "lodging" =>
        cond do
          dest? and multi_day?(c) -> status_resolved(lodging?)
          true -> "not_applicable"
        end,
      "work_conflict" => status_resolved(work?),
      "reservation" => if(venue?, do: "pending", else: "not_applicable"),
      "reveal_invite" =>
        cond do
          surprise? -> "pending"
          who? and venue? -> "pending"
          true -> "not_applicable"
        end
    }
  end

  def build(_), do: %{}

  @doc """
  Next consumer-facing dependency after current intent progress.
  Returns `%{id, prompt}` or nil.
  """
  def next_after(planning, just_resolved \\ nil) when is_map(planning) do
    status = build(planning)

    # After venue selection, prefer travel as the next useful surface.
    ordered =
      case just_resolved do
        "venue" -> Enum.drop_while(@trip_order, fn {id, _} -> id != "travel" end)
        _ -> @trip_order
      end

    Enum.find_value(ordered, fn {id, prompt} ->
      if status[id] == "pending" and is_binary(prompt) do
        %{"id" => id, "prompt" => prompt}
      else
        nil
      end
    end)
  end

  defp multi_day?(c) do
    c["multi_day"] == true or
      (is_binary(c["destination"]) and c["wants_lodging"] == true)
  end

  defp status_resolved(true), do: "resolved"
  defp status_resolved(_), do: "pending"

  defp present?(v) when is_binary(v), do: String.trim(v) != ""
  defp present?(v) when is_list(v), do: v != []
  defp present?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
