defmodule OpalCore.SocialFlow.RealWorld.Location.Precision do
  @moduledoc """
  Location precision ladder — use the LOWEST precision that solves the problem.

  city < neighborhood < coarse_area < precise_coordinates < route_eta
  """

  @levels ~w(city neighborhood coarse_area precise_coordinates route_eta)

  def levels, do: @levels

  def rank("city"), do: 1
  def rank("neighborhood"), do: 2
  def rank("coarse_area"), do: 3
  def rank("precise_coordinates"), do: 4
  def rank("route_eta"), do: 5
  def rank(_), do: 0

  @doc "Minimum precision needed for a purpose."
  def required_for(purpose) when is_binary(purpose) or is_atom(purpose) do
    case to_string(purpose) do
      "city_fit" -> "city"
      "neighborhood_fit" -> "neighborhood"
      "dinner_between" -> "coarse_area"
      "travel_burden" -> "coarse_area"
      "meet_halfway" -> "neighborhood"
      "eta_share" -> "route_eta"
      "navigation" -> "precise_coordinates"
      "arrival" -> "route_eta"
      _ -> "neighborhood"
    end
  end

  @doc "True if granted precision is enough for purpose (not over-precise requirement)."
  def sufficient?(granted, purpose) do
    rank(granted) >= rank(required_for(purpose))
  end

  @doc "Cap requested precision to purpose need — never over-collect."
  def cap_request(requested, purpose) do
    need = required_for(purpose)

    if rank(requested) > rank(need), do: need, else: requested
  end
end
