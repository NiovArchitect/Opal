defmodule OpalCore.SocialFlow.Ambient.Actionability do
  @moduledoc """
  First-class internal ladder (not public product states):

  interesting → relevant → viable → actionable → execution_ready → confirmed

  Legacy aliases: plausible≈relevant, aligned≈viable.

  interesting must NOT become a visible interruption.
  """

  @ladder ~w(interesting relevant viable actionable execution_ready confirmed)
  # Back-compat ladder names still accepted in tests
  @legacy ~w(plausible aligned)

  def ladder, do: @ladder
  def legacy_levels, do: @legacy

  @doc """
  Classify how resolved an opportunity is.
  """
  def classify(attrs) when is_map(attrs) do
    a = stringify(attrs)

    # Only explicit resolution counts — unknown is not "resolved"
    people? = truthy?(a["people_resolved"]) or List.wrap(a["viable_participant_ids"]) != []
    willing? = a["willingness_ok"] == true
    time? = a["time_resolved"] == true or a["time_compatible"] == true
    place? = a["place_resolved"] == true or a["place_known"] == true or a["option_count"] in 1..3
    travel? = a["travel_ok"] == true or a["proximity_ok"] == true
    cost? = a["budget_ok"] == true
    # provider_unknown does not count as availability resolved
    avail? = a["provider_available"] == true
    permission? = a["permission_ok"] == true
    hard_ok? = a["hard_ok"] != false
    roles_ok? = a["roles_ok"] != false
    fresh? = a["fresh_enough"] != false

    resolved =
      [
        people?,
        willing?,
        time?,
        place?,
        travel?,
        cost?,
        avail?,
        permission?
      ]
      |> Enum.count(& &1)

    level =
      cond do
        a["confirmed"] == true ->
          "confirmed"

        a["execution_ready"] == true and avail? and resolved >= 6 and hard_ok? and roles_ok? and
            fresh? ->
          "execution_ready"

        resolved >= 5 and time? and people? and travel? and hard_ok? and roles_ok? and fresh? ->
          "actionable"

        resolved >= 4 and people? and time? and hard_ok? and roles_ok? ->
          "viable"

        resolved >= 2 and people? ->
          "relevant"

        true ->
          "interesting"
      end

    # Legacy aliases for older call sites/tests
    legacy =
      case level do
        "relevant" -> "plausible"
        "viable" -> "aligned"
        other -> other
      end

    unknowns = 8 - resolved

    {:ok,
     %{
       "level" => level,
       "legacy_level" => legacy,
       "resolved_count" => resolved,
       "unknown_count" => unknowns,
       "actionable" => level in ~w(actionable execution_ready confirmed),
       "deserves_attention" =>
         level in ~w(actionable execution_ready) and hard_ok? and roles_ok? and fresh?,
       "interesting_is_not_visible" => level == "interesting",
       "variables" => %{
         "people" => people?,
         "willingness" => willing?,
         "time" => time?,
         "place" => place?,
         "travel" => travel?,
         "cost" => cost?,
         "availability" => avail?,
         "permission" => permission?,
         "hard_ok" => hard_ok?,
         "roles_ok" => roles_ok?,
         "fresh" => fresh?
       },
       "authorizes_set" => false
     }}
  end

  def classify(_), do: {:ok, %{"level" => "interesting", "actionable" => false}}

  @doc "Whether unknowns collapsed enough to justify a moment."
  def unknowns_collapsed?(attrs, threshold \\ 2) do
    case classify(attrs) do
      {:ok, c} -> c["unknown_count"] <= threshold and c["actionable"]
      _ -> false
    end
  end

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
