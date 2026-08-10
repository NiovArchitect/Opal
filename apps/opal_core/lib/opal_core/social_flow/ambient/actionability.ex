defmodule OpalCore.SocialFlow.Ambient.Actionability do
  @moduledoc """
  First-class internal ladder (not public product states):

  interesting → relevant → viable → actionable → execution_ready → confirmed

  Legacy aliases: plausible≈relevant, aligned≈viable.

  interesting must NOT become a visible interruption.
  """

  @ladder ~w(interesting relevant viable actionable execution_ready confirmed)
  @legacy ~w(plausible aligned)

  def ladder, do: @ladder
  def legacy_levels, do: @legacy

  @doc """
  Classify how resolved an opportunity is.
  """
  def classify(attrs) when is_map(attrs) do
    a = stringify(attrs)
    vars = resolution_vars(a)
    resolved = Enum.count(Map.values(vars), & &1)
    level = level_for(a, vars, resolved)
    legacy = legacy_alias(level)
    unknowns = 8 - resolved

    {:ok,
     %{
       "level" => level,
       "legacy_level" => legacy,
       "resolved_count" => resolved,
       "unknown_count" => unknowns,
       "actionable" => level in ~w(actionable execution_ready confirmed),
       "deserves_attention" => deserves_attention?(level, a),
       "interesting_is_not_visible" => level == "interesting",
       "variables" => vars,
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

  defp resolution_vars(a) do
    %{
      "people" => truthy?(a["people_resolved"]) or List.wrap(a["viable_participant_ids"]) != [],
      "willingness" => a["willingness_ok"] == true,
      "time" => a["time_resolved"] == true or a["time_compatible"] == true,
      "place" =>
        a["place_resolved"] == true or a["place_known"] == true or a["option_count"] in 1..3,
      "travel" => a["travel_ok"] == true or a["proximity_ok"] == true,
      "cost" => a["budget_ok"] == true,
      "availability" => a["provider_available"] == true,
      "permission" => a["permission_ok"] == true,
      "hard_ok" => a["hard_ok"] != false,
      "roles_ok" => a["roles_ok"] != false,
      "fresh" => a["fresh_enough"] != false
    }
  end

  defp level_for(a, vars, resolved) do
    gates_ok? = vars["hard_ok"] and vars["roles_ok"] and vars["fresh"]

    cond do
      a["confirmed"] == true -> "confirmed"
      exec_ready?(a, vars, resolved, gates_ok?) -> "execution_ready"
      actionable_band?(vars, resolved, gates_ok?) -> "actionable"
      viable_band?(vars, resolved) -> "viable"
      resolved >= 2 and vars["people"] -> "relevant"
      true -> "interesting"
    end
  end

  defp exec_ready?(a, vars, resolved, gates_ok?) do
    a["execution_ready"] == true and vars["availability"] and resolved >= 6 and gates_ok?
  end

  defp actionable_band?(vars, resolved, gates_ok?) do
    resolved >= 5 and vars["time"] and vars["people"] and vars["travel"] and gates_ok?
  end

  defp viable_band?(vars, resolved) do
    resolved >= 4 and vars["people"] and vars["time"] and vars["hard_ok"] and vars["roles_ok"]
  end

  defp legacy_alias("relevant"), do: "plausible"
  defp legacy_alias("viable"), do: "aligned"
  defp legacy_alias(other), do: other

  defp deserves_attention?(level, a) do
    level in ~w(actionable execution_ready) and a["hard_ok"] != false and a["roles_ok"] != false and
      a["fresh_enough"] != false
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
