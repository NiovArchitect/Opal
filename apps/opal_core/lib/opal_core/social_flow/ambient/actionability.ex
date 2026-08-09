defmodule OpalCore.SocialFlow.Ambient.Actionability do
  @moduledoc """
  interesting → plausible → aligned → actionable → execution_ready → confirmed

  Opal cares more about actionability than generic relevance.
  A concert nearby is interesting; both free + nearby + starts soon is actionable.
  """

  @ladder ~w(interesting plausible aligned actionable execution_ready confirmed)

  def ladder, do: @ladder

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
    avail? = a["provider_available"] == true or a["provider_unknown"] == true
    permission? = a["permission_ok"] == true

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

        a["execution_ready"] == true and resolved >= 7 ->
          "execution_ready"

        resolved >= 6 and time? and people? and travel? ->
          "actionable"

        resolved >= 4 and people? and time? ->
          "aligned"

        resolved >= 2 ->
          "plausible"

        true ->
          "interesting"
      end

    unknowns = 8 - resolved

    {:ok,
     %{
       "level" => level,
       "resolved_count" => resolved,
       "unknown_count" => unknowns,
       "actionable" => level in ~w(actionable execution_ready confirmed),
       "deserves_attention" => level in ~w(actionable execution_ready),
       "variables" => %{
         "people" => people?,
         "willingness" => willing?,
         "time" => time?,
         "place" => place?,
         "travel" => travel?,
         "cost" => cost?,
         "availability" => avail?,
         "permission" => permission?
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
