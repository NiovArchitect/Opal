defmodule OpalCore.Bookings.Duffel do
  @moduledoc """
  Duffel flights + hotels adapter.

  Gates on `DUFFEL_API_KEY`. Without the key every callback returns
  `{:disabled, "DUFFEL_API_KEY missing"}`. Never invents confirmation numbers.
  """

  @behaviour OpalCore.Bookings.Provider

  @api_base "https://api.duffel.com"

  @impl true
  def search(params, opts \\ []) when is_map(params) do
    with {:ok, key} <- api_key(opts) do
      do_search(params, key, opts)
    end
  end

  @impl true
  def book(params, opts \\ []) when is_map(params) do
    with {:ok, key} <- api_key(opts) do
      do_book(params, key, opts)
    end
  end

  @impl true
  def cancel(params, opts \\ []) when is_map(params) do
    with {:ok, key} <- api_key(opts) do
      do_cancel(params, key, opts)
    end
  end

  @impl true
  def get_booking(provider_ref) when is_binary(provider_ref) do
    with {:ok, key} <- api_key([]) do
      do_get(provider_ref, key)
    end
  end

  def get_booking(_), do: {:error, :invalid_ref}

  defp api_key(opts) do
    key = Keyword.get(opts, :api_key) || System.get_env("DUFFEL_API_KEY")

    if is_binary(key) and String.trim(key) != "" do
      {:ok, String.trim(key)}
    else
      {:disabled, "DUFFEL_API_KEY missing"}
    end
  end

  defp do_search(params, key, _opts) do
    # Thin live path — surfaces provider errors; never fabricates offers.
    body = %{
      "data" => %{
        "slices" => List.wrap(params["slices"] || params[:slices]),
        "passengers" => List.wrap(params["passengers"] || params[:passengers] || [%{"type" => "adult"}]),
        "cabin_class" => params["cabin_class"] || params[:cabin_class] || "economy"
      }
    }

    case Req.post("#{@api_base}/air/offer_requests",
           json: body,
           headers: duffel_headers(key),
           receive_timeout: 15_000
         ) do
      {:ok, %{status: status, body: resp}} when status in 200..299 ->
        offers = get_in(resp, ["data", "offers"]) || resp["offers"] || []
        {:ok, Enum.map(List.wrap(offers), &normalize_offer/1)}

      {:ok, %{status: status, body: body}} ->
        {:error, {:duffel_http, status, truncate(body)}}

      {:error, reason} ->
        {:error, {:duffel_request, reason}}
    end
  end

  defp do_book(params, key, _opts) do
    offer_id = params["offer_id"] || params[:offer_id] || params["provider_ref"] || params[:provider_ref]

    if is_binary(offer_id) and offer_id != "" do
      body = %{
        "data" => %{
          "selected_offers" => [offer_id],
          "payments" => List.wrap(params["payments"] || params[:payments] || []),
          "passengers" => List.wrap(params["passengers"] || params[:passengers] || [])
        }
      }

      case Req.post("#{@api_base}/air/orders",
             json: body,
             headers: duffel_headers(key),
             receive_timeout: 30_000
           ) do
        {:ok, %{status: status, body: resp}} when status in 200..299 ->
          data = resp["data"] || resp
          conf = data["booking_reference"] || data["confirmation_number"]

          if is_binary(conf) and conf != "" do
            {:ok,
             %{
               "provider" => "duffel",
               "provider_ref" => data["id"] || offer_id,
               "confirmation_number" => conf,
               "status" => "confirmed",
               "raw" => Map.take(data, ["id", "booking_reference", "total_amount", "total_currency"])
             }}
          else
            # Live response without a real confirmation — refuse to invent one.
            {:error, :missing_confirmation_from_provider}
          end

        {:ok, %{status: status, body: body}} ->
          {:error, {:duffel_http, status, truncate(body)}}

        {:error, reason} ->
          {:error, {:duffel_request, reason}}
      end
    else
      {:error, :offer_id_required}
    end
  end

  defp do_cancel(params, key, _opts) do
    ref = params["provider_ref"] || params[:provider_ref] || params["id"] || params[:id]

    if is_binary(ref) and ref != "" do
      case Req.post("#{@api_base}/air/orders/#{ref}/actions/cancel",
             json: %{},
             headers: duffel_headers(key),
             receive_timeout: 15_000
           ) do
        {:ok, %{status: status, body: resp}} when status in 200..299 ->
          {:ok, %{"provider" => "duffel", "provider_ref" => ref, "status" => "cancelled", "raw" => resp}}

        {:ok, %{status: status, body: body}} ->
          {:error, {:duffel_http, status, truncate(body)}}

        {:error, reason} ->
          {:error, {:duffel_request, reason}}
      end
    else
      {:error, :provider_ref_required}
    end
  end

  defp do_get(ref, key) do
    case Req.get("#{@api_base}/air/orders/#{ref}",
           headers: duffel_headers(key),
           receive_timeout: 15_000
         ) do
      {:ok, %{status: status, body: resp}} when status in 200..299 ->
        data = resp["data"] || resp

        {:ok,
         %{
           "provider" => "duffel",
           "provider_ref" => data["id"] || ref,
           "confirmation_number" => data["booking_reference"],
           "status" => data["status"] || "unknown"
         }}

      {:ok, %{status: status, body: body}} ->
        {:error, {:duffel_http, status, truncate(body)}}

      {:error, reason} ->
        {:error, {:duffel_request, reason}}
    end
  end

  defp duffel_headers(key) do
    [
      {"authorization", "Bearer #{key}"},
      {"duffel-version", "v2"},
      {"accept", "application/json"},
      {"content-type", "application/json"}
    ]
  end

  defp normalize_offer(offer) when is_map(offer) do
    %{
      "provider" => "duffel",
      "offer_id" => offer["id"],
      "total_amount" => offer["total_amount"],
      "total_currency" => offer["total_currency"],
      "bookable" => true
    }
  end

  defp normalize_offer(_), do: %{"provider" => "duffel", "bookable" => false}

  defp truncate(body) when is_binary(body), do: String.slice(body, 0, 240)
  defp truncate(body) when is_map(body), do: body |> Jason.encode!() |> truncate()
  defp truncate(other), do: inspect(other) |> truncate()
end
