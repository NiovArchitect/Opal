defmodule OpalCoreWeb.PlaceSignalController do
  @moduledoc """
  Repair #23 (WS-23-5) - the place signal read path.

  POST /api/v1/product/places/signals with {"places" => [names]}:
  the names are places the viewer's own home feed already holds
  (the R22 place stones' names). The response carries, per name,
  ONLY a qualitative tier and a coarse nearby boolean - both
  computed server-side from facts this viewer is already
  permitted to know (PlaceSignal). No numeric heat value, no
  coordinate, no distance ever crosses this wire.

  A POST (not GET) because the request body is a list of names
  the client holds; the read itself writes nothing.

  The response also carries nearby_user_ids: the coarse
  per-person nearby set for the story rail's "nearby" stone
  state - user ids only, derived from the same fresh per-plan
  location shares, with no position attached.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Ambient.PlaceSignal

  def signals(conn, params) do
    viewer_id = conn.assigns.current_user_id
    places = params["places"]

    signals = PlaceSignal.signals_for(viewer_id, List.wrap(places))

    json(conn, %{
      "signals" => signals,
      "nearby_user_ids" => viewer_id |> PlaceSignal.nearby_people() |> MapSet.to_list(),
      "heat_map_ui" => false
    })
  end
end
