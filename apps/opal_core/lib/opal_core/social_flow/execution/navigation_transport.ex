defmodule OpalCore.SocialFlow.Execution.NavigationTransport do
  @moduledoc """
  Real navigation handoff — eliminate copy address + open Maps + re-search.

  Builds deep links from ExecutionContext destination.
  No map UI. No re-entry of destination.

  Truth states:
  prepared | handoff_started | navigation_started | failed | stale

  Apple Maps: https://maps.apple.com/?daddr=...
  Google Maps: https://www.google.com/maps/dir/?api=1&destination=...
  """

  alias OpalCore.SocialFlow.Ambient.{ExecutionAction, ExecutionContext}

  @doc """
  Prepare navigation payload from execution context.
  """
  def prepare(ctx, opts \\ []) when is_map(ctx) do
    c = stringify(ctx)
    platform = to_string(opt(opts, :platform) || c["platform"] || "universal")

    cond do
      c["navigation_stale"] == true ->
        {:error, :destination_stale}

      not ExecutionContext.ready_for?(c, "navigation") ->
        {:error, :destination_required}

      true ->
        dest = destination_spec(c)
        urls = deep_links(dest, platform)

        {:ok, action} = ExecutionAction.prepare(c, "navigation")

        {:ok,
         Map.merge(action, %{
           "state" => "prepared",
           "transport" => "deep_link",
           "platform" => platform,
           "destination" => dest,
           "urls" => urls,
           "primary_url" => urls["primary"],
           "reentry_required" => false,
           "human_step_removed" => "copy_address_open_maps_search",
           "navigation_started" => false,
           "handoff_started" => false,
           "booked" => false
         })}
    end
  end

  def prepare(_, _), do: {:error, :invalid}

  @doc """
  User authorized → handoff to maps transport.

  Deep-link handoff sets handoff_started / navigation_started depending on
  whether the transport is considered native app launch vs web page open.
  """
  def start(prepared, opts \\ []) when is_map(prepared) do
    p = stringify(prepared)

    cond do
      opt(opts, :user_authorized) != true ->
        {:error, :user_authorization_required}

      p["state"] == "stale" or p["navigation_stale"] == true ->
        {:error, :destination_stale}

      is_nil(p["primary_url"]) ->
        {:error, :not_prepared}

      true ->
        native? = p["platform"] in ~w(ios android apple_maps google_maps_app)
        # Web universal links still eliminate re-search; truthfully handoff not in-app route start
        state = if native?, do: "navigation_started", else: "handoff_started"

        {:ok,
         Map.merge(p, %{
           "state" => state,
           "handoff_started" => true,
           "navigation_started" => native?,
           "route_guidance_active" => false,
           "claim" =>
             if(native?,
               do: "maps_app_handoff",
               else: "maps_url_handoff"
             ),
           "opened_url" => p["primary_url"],
           "reentry_required" => false,
           "authorizes_set" => false
         })}
    end
  end

  def start(_, _), do: {:error, :invalid}

  @doc "Build deep links without launching."
  def deep_links(dest, platform \\ "universal")

  def deep_links(dest, platform) when is_map(dest) do
    d = stringify(dest)
    query = destination_query(d)
    encoded = URI.encode_www_form(query)

    apple = "https://maps.apple.com/?daddr=#{encoded}&dirflg=d"
    google = "https://www.google.com/maps/dir/?api=1&destination=#{encoded}&travelmode=driving"
    # Apple URL scheme for installed Maps app
    apple_scheme = "maps://?daddr=#{encoded}&dirflg=d"
    google_scheme = "comgooglemaps://?daddr=#{encoded}&directionsmode=driving"

    primary =
      case to_string(platform) do
        "ios" -> apple_scheme
        "apple_maps" -> apple_scheme
        "android" -> google
        "google_maps_app" -> google_scheme
        "google" -> google
        _ -> apple
      end

    %{
      "primary" => primary,
      "apple_https" => apple,
      "apple_scheme" => apple_scheme,
      "google_https" => google,
      "google_scheme" => google_scheme
    }
  end

  def deep_links(_, _), do: %{}

  defp destination_spec(c) do
    coords =
      cond do
        is_map(c["coordinates"]) -> stringify(c["coordinates"])
        is_map(c["latlng"]) -> stringify(c["latlng"])
        true -> %{}
      end

    %{
      "label" => c["destination"] || c["place"] || c["place_label"],
      "address" => c["address"] || c["formatted_address"],
      "lat" => coords["lat"] || c["lat"],
      "lng" => coords["lng"] || c["lng"],
      "venue_id" => c["venue_id"] || c["provider_candidate_id"]
    }
  end

  defp destination_query(d) do
    cond do
      is_number(d["lat"]) and is_number(d["lng"]) ->
        "#{d["lat"]},#{d["lng"]}"

      is_binary(d["address"]) and d["address"] != "" ->
        d["address"]

      is_binary(d["label"]) ->
        d["label"]

      true ->
        ""
    end
  end

  defp opt(opts, key) when is_list(opts), do: Keyword.get(opts, key)
  defp opt(opts, key) when is_map(opts), do: Map.get(opts, key) || Map.get(opts, to_string(key))
  defp opt(_, _), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
