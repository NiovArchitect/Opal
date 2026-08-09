defmodule OpalCore.SocialFlow.Physical.PlaceGap do
  @moduledoc """
  Invoke place intelligence only when place is the unresolved gap.

  Skip when place/event already named or "come over".
  """

  alias OpalCore.SocialFlow.Physical.CollectivePlaceFit

  @doc """
  Decide whether place is the gap, and optionally recommend.
  """
  def resolve(attrs) when is_map(attrs) do
    a = stringify(attrs)

    gap? =
      a["place_known"] != true and a["event_named"] != true and a["come_over"] != true and
        a["time_feasible"] == true

    if gap? do
      case CollectivePlaceFit.recommend(
             category: a["category"] || "dinner",
             quiet_required: a["quiet_required"] == true,
             max_price_band: a["max_price_band"],
             travel_by_place: a["travel_by_place"] || %{},
             relationship_context: a["relationship_context"] || "general",
             area_label: a["area_label"]
           ) do
        {:ok, ranking} ->
          {:ok,
           %{
             "gap" => :place,
             "ranking" => ranking,
             "option_count" => length(ranking["options"] || []),
             "authorizes_set" => false
           }}

        err ->
          err
      end
    else
      {:ok, %{"gap" => :none, "reason" => skip_reason(a), "authorizes_set" => false}}
    end
  end

  def resolve(_), do: {:ok, %{"gap" => :none}}

  defp skip_reason(a) do
    cond do
      a["place_known"] == true -> "place_already_named"
      a["event_named"] == true -> "event_already_named"
      a["come_over"] == true -> "come_over"
      a["time_feasible"] != true -> "time_not_ready"
      true -> "not_place_gap"
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
