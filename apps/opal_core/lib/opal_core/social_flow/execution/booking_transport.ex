defmodule OpalCore.SocialFlow.Execution.BookingTransport do
  @moduledoc """
  Restaurant booking transport — honest about access level.

  Research (current docs): OpenTable guest reservation APIs are **partner-only**
  (commercial approval). No public third-party "create reservation" API for
  general apps without partnership.

  Therefore default mode:

  HANDOFF ONLY — open authoritative reservation destination with as much
  prefilled context as URL allows. Never claim booked.

  Modes: handoff | partner_api (future, credential-gated) | disabled

  Human step removed when handoff lands on venue/time page vs generic home.
  """

  alias OpalCore.SocialFlow.Ambient.{ExecutionAction, ExecutionContext}

  @doc "Capability truth for ledger / product honesty."
  def capability_matrix do
    %{
      "direct_booking_api" => "partner_only",
      "opentable_public_create_reservation" => false,
      "default_mode" => "handoff",
      "claims_booked_on_handoff" => false,
      "human_steps_removed" => ["re_search_venue", "re_find_provider_home"],
      "human_steps_may_remain" => ["confirm_on_provider", "auth_on_provider"],
      "avp2_payments_only" => true,
      "provider_is_not_authority" => true
    }
  end

  @doc """
  Prepare booking handoff from ExecutionContext.

  Prefer venue-deep links over generic OpenTable home.
  """
  def prepare_handoff(ctx, opts \\ []) when is_map(ctx) do
    c = stringify(ctx)

    if ExecutionContext.ready_for?(c, "booking_inquiry") do
      {:ok, action} = ExecutionAction.prepare(c, "booking_request")
      url = reservation_url(c, opts)
      quality = handoff_quality(url, c)

      {:ok,
       Map.merge(action, %{
         "state" => "prepared",
         "mode" => "handoff",
         "handoff_url" => url,
         "handoff_quality" => quality,
         "booked" => false,
         "purchased" => false,
         "confirmed" => false,
         "handoff_started" => false,
         "reentry_required" => false,
         "human_step_removed" => quality["steps_removed"],
         "authorizes_set" => false
       })}
    else
      {:error, :not_ready}
    end
  end

  def prepare_handoff(_, _), do: {:error, :invalid}

  @doc "User authorized → open handoff. Still not booked."
  def start_handoff(prepared, opts \\ []) when is_map(prepared) do
    p = stringify(prepared)

    cond do
      opt(opts, :user_authorized) != true ->
        {:error, :user_authorization_required}

      p["state"] == "stale" ->
        {:error, :stale_action}

      true ->
        {:ok,
         Map.merge(p, %{
           "state" => "requested",
           "handoff_started" => true,
           "booked" => false,
           "confirmed" => false,
           "claim" => "handoff_started_not_booked",
           "opened_url" => p["handoff_url"]
         })}
    end
  end

  def start_handoff(_, _), do: {:error, :invalid}

  @doc """
  Build best-effort OpenTable-style reservation URL.

  Public deep-link patterns (no partner API):
  - https://www.opentable.com/r/{slug}
  - query params when available: covers, dateTime
  """
  def reservation_url(ctx, opts \\ [])

  def reservation_url(ctx, opts) when is_map(ctx) do
    c = stringify(ctx)
    provider = to_string(opt(opts, :provider) || c["provider"] || "opentable")
    slug = c["opentable_slug"] || c["venue_slug"] || slugify(c["place"] || c["place_label"])
    party = c["party_size"] || 2
    dt = datetime_param(c["when"] || c["slot_label"])

    case provider do
      "opentable" ->
        base =
          if is_binary(c["reservation_url"]) do
            c["reservation_url"]
          else
            "https://www.opentable.com/r/#{slug}"
          end

        append_query(base, %{"covers" => party, "dateTime" => dt})

      "resy" ->
        # Honest venue search handoff when no direct slug
        "https://resy.com/cities?query=#{URI.encode_www_form(to_string(c["place"] || ""))}"

      _ ->
        c["reservation_url"] || "https://www.opentable.com/r/#{slug}"
    end
  end

  def reservation_url(_, _), do: nil

  defp handoff_quality(url, c) when is_binary(url) do
    venue_specific? =
      String.contains?(url, "/r/") or is_binary(c["reservation_url"])

    time_pref? = String.contains?(url, "dateTime=") or String.contains?(url, "datetime=")
    party_pref? = String.contains?(url, "covers=") or String.contains?(url, "party")

    score =
      if(venue_specific?, do: 0.5, else: 0.1) +
        if(time_pref?, do: 0.25, else: 0.0) +
        if party_pref?, do: 0.25, else: 0.0

    %{
      "score" => Float.round(score * 1.0, 2),
      "venue_specific" => venue_specific?,
      "time_prefilled" => time_pref?,
      "party_prefilled" => party_pref?,
      "generic_home" => not venue_specific?,
      "steps_removed" =>
        ["provider_home_search"] ++
          if(venue_specific?, do: ["venue_search"], else: []) ++
          if(time_pref?, do: ["date_time_reentry"], else: []) ++
          if(party_pref?, do: ["party_size_reentry"], else: [])
    }
  end

  defp handoff_quality(_, _), do: %{"score" => 0.0, "generic_home" => true}

  defp slugify(nil), do: "restaurants"

  defp slugify(name) when is_binary(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "-")
    |> String.trim("-")
    |> case do
      "" -> "restaurants"
      s -> s
    end
  end

  defp slugify(_), do: "restaurants"

  defp datetime_param(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_param(s) when is_binary(s), do: s
  defp datetime_param(_), do: nil

  defp append_query(base, params) do
    qs =
      params
      |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
      |> Enum.map(fn {k, v} -> "#{k}=#{URI.encode_www_form(to_string(v))}" end)
      |> Enum.join("&")

    if qs == "", do: base, else: base <> if(String.contains?(base, "?"), do: "&", else: "?") <> qs
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
