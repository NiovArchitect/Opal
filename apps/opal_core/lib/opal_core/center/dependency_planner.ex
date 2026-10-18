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

    # B1 (A5): a virtual Center plan's room IS its destination. Venue,
    # travel, lodging and reservation are not_applicable - never
    # pending questions - and the one real dependency is the meeting
    # link (resolved when a link or the user's usual link exists).
    if c["plan_type"] == "virtual" do
      who? = present?(c["who"] || c["primary_person"] || c["participants"])
      when? = present?(c["when"] || c["when_resolved"])
      link? = present?(c["meeting_link"]) or present?(c["usual_meeting_link"])

      return = %{
        "people" =>
          cond do
            who? -> "resolved"
            c["solo"] == true -> "not_applicable"
            true -> "pending"
          end,
        "when" => if(when?, do: "resolved", else: "pending"),
        "destination" => "not_applicable",
        "availability" => if(who?, do: "pending", else: "not_applicable"),
        "venue" => "not_applicable",
        "travel" => "not_applicable",
        "lodging" => "not_applicable",
        "work_conflict" => "pending",
        "reservation" => "not_applicable",
        "reveal_invite" => "not_applicable",
        "meeting_link" => if(link?, do: "resolved", else: "pending")
      }

      return
    else
      build_physical(c)
    end
  end

  defp build_physical(c) do
    who? = present?(c["who"] || c["primary_person"] || c["participants"])
    when? = present?(c["when"] || c["when_resolved"])
    venue? = present?(c["venue"]) and c["venue_cancelled"] != true
    # Exact venue / selected place already answers "where are you headed?"
    dest? =
      present?(c["destination"]) or venue? or
        present?(c["requested_venue_name"]) or present?(c["requested_venue_locality"])
    surprise? = c["visibility_mode"] == "surprise" or c["surprise"] == true
    travel? = present?(c["travel"]) or c["travel_attached"] == true
    lodging? = present?(c["lodging"]) or c["lodging_attached"] == true
    avail? = c["availability_checked"] == true
    work? = c["work_conflict_evaluated"] == true
    travel_class = travel_class(c)

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
          not travel_applicable?(c) -> "not_applicable"
          travel? -> "resolved"
          true -> "pending"
        end,
      "lodging" =>
        cond do
          travel_class in ["trip", "destination_travel"] and multi_day?(c) ->
            status_resolved(lodging?)

          true ->
            "not_applicable"
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
    c = stringify(planning)

    # B1 (A5): for a virtual plan the only place-shaped dependency is
    # the meeting link - surface it (with the existing honest ask)
    # ahead of the physical trip order, which is all not_applicable.
    if c["plan_type"] == "virtual" and status["meeting_link"] == "pending" and
         status["when"] == "resolved" do
      %{
        "id" => "meeting_link",
        "prompt" => "Want to use your usual meeting link, or paste one when you have it?"
      }
    else
      next_after_physical(planning, status, c, just_resolved)
    end
  end

  defp next_after_physical(planning, status, c, just_resolved) do

    # After venue selection, never ask destination — venue/locality already known.
    # Prefer travel only when travel is applicable; otherwise no destination prompt.
    ordered =
      case just_resolved do
        "venue" ->
          if travel_applicable?(planning) do
            Enum.drop_while(@trip_order, fn {id, _} -> id != "travel" end)
          else
            Enum.reject(@trip_order, fn {id, _} ->
              id in ["travel", "lodging", "destination", "people"]
            end)
          end

        _ ->
          if present?(c["venue"]) or present?(c["requested_venue_name"]) do
            Enum.reject(@trip_order, fn {id, _} -> id == "destination" end)
          else
            @trip_order
          end
      end

    Enum.find_value(ordered, fn {id, prompt} ->
      if status[id] == "pending" and is_binary(prompt) do
        %{"id" => id, "prompt" => prompt}
      else
        nil
      end
    end)
  end

  @doc """
  Travel dependency is only for meaningful destination travel — not local dinner.

  Classes: `local_activity` | `regional_outing` | `trip` | `destination_travel`
  """
  def travel_class(planning) when is_map(planning) do
    c = stringify(planning)
    dest = c["destination"]

    cond do
      # B1 (A5): a virtual plan's "Online" destination is not a place
      # and never classifies as travel.
      c["plan_type"] == "virtual" -> "local_activity"
      c["travel_required"] == true or c["wants_travel"] == true -> "destination_travel"
      multi_day?(c) -> "trip"
      is_binary(dest) and distant_destination?(dest, c) -> "destination_travel"
      is_binary(dest) and local_destination?(dest, c) -> "local_activity"
      c["solo"] == true and c["wants_restaurant"] == true -> "local_activity"
      is_binary(dest) -> "regional_outing"
      true -> "local_activity"
    end
  end

  def travel_class(_), do: "local_activity"

  def travel_applicable?(planning) when is_map(planning) do
    travel_class(planning) in ["trip", "destination_travel"]
  end

  def travel_applicable?(_), do: false

  defp multi_day?(c) do
    c["multi_day"] == true or
      (is_binary(c["destination"]) and c["wants_lodging"] == true)
  end

  # Known long-haul / foreign destinations that justify travel dependency.
  defp distant_destination?(dest, _c) when is_binary(dest) do
    d = String.downcase(dest)

    Enum.any?(
      [
        "mexico city",
        "cdmx",
        "tokyo",
        "paris",
        "london",
        "rome",
        "lisbon",
        "barcelona",
        "madrid",
        "berlin",
        "amsterdam",
        "seoul",
        "bangkok",
        "dubai",
        "sydney",
        "honolulu",
        "hawaii",
        "nyc",
        "new york",
        "miami",
        "chicago",
        "seattle",
        "boston",
        "austin",
        "denver",
        "las vegas"
      ],
      &String.contains?(d, &1)
    ) or Regex.match?(~r/\b(flight|fly|airport|overnight|weekend trip|road trip)\b/i, d)
  end

  defp distant_destination?(_, _), do: false

  # Local / home-metro places for Walk fixtures and common CA metros.
  defp local_destination?(dest, c) when is_binary(dest) do
    d = String.downcase(dest)
    home = String.downcase(to_string(c["home_metro"] || c["user_metro"] || "san diego"))

    Enum.any?(
      [
        "san diego",
        "la jolla",
        "pacific beach",
        "north park",
        "hillcrest",
        "downtown",
        "gaslamp",
        "mission valley",
        "chula vista",
        "carlsbad",
        "encinitas",
        "del mar",
        "oceanside"
      ],
      &String.contains?(d, &1)
    ) or String.contains?(d, home)
  end

  defp local_destination?(_, _), do: false

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
