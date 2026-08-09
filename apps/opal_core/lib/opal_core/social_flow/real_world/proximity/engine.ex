defmodule OpalCore.SocialFlow.RealWorld.Proximity.Engine do
  @moduledoc """
  Private proximity / feasibility layer.

  Outputs safe abstractions only — never peer coordinates.

  Step eliminated: manually comparing drive times / maps.
  """

  @doc """
  Classify travel minutes into close | reasonable | far.
  """
  def band(minutes) when is_number(minutes) do
    cond do
      minutes <= 12 -> "close"
      minutes <= 30 -> "reasonable"
      true -> "far"
    end
  end

  def band(_), do: "unknown"

  @doc """
  Feasibility for participants to a destination.

  Input participants: list of %{user_id, travel_minutes}
  Returns shared-safe summary without coordinates.
  """
  def feasibility(participants, opts \\ [])

  def feasibility(participants, opts) when is_list(participants) do
    travels =
      participants
      |> Enum.map(fn p ->
        p = stringify(p)
        {p["user_id"], to_num(p["travel_minutes"])}
      end)
      |> Enum.reject(fn {_id, m} -> is_nil(m) end)

    if travels == [] do
      {:ok,
       %{
         "status" => "unknown",
         "shared_safe" => true,
         "label" => nil,
         "no_coordinates" => true
       }}
    else
      minutes = Enum.map(travels, &elem(&1, 1))
      max_m = Enum.max(minutes)
      min_m = Enum.min(minutes)
      avg = Enum.sum(minutes) / length(minutes)
      imbalance = max_m - min_m

      label =
        cond do
          max_m <= 15 -> "easy for both"
          max_m <= 30 and imbalance <= 15 -> "reasonable for both"
          Keyword.get(opts, :meet_halfway) == true -> "meet halfway candidate"
          true -> "far for someone"
        end

      {:ok,
       %{
         "status" => band(max_m),
         "shared_safe" => true,
         "label" => label,
         "max_burden_minutes_internal" => max_m,
         "avg_burden_minutes_internal" => avg,
         "imbalance_minutes_internal" => imbalance,
         "no_coordinates" => true,
         "participant_coordinates_exposed" => false
       }}
    end
  end

  def feasibility(_, _), do: {:error, :invalid}

  defp to_num(nil), do: nil
  defp to_num(n) when is_number(n), do: n * 1.0

  defp to_num(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_num(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
