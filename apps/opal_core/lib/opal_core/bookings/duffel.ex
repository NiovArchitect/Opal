defmodule OpalCore.Bookings.Duffel do
  @moduledoc """
  Duffel flights + hotels adapter.

  Gates on `DUFFEL_API_KEY`. Without the key every callback returns
  `{:disabled, "DUFFEL_API_KEY missing"}`. Never invents confirmation numbers.

  ## Test mode (Paste G Phase 6)

  Real Duffel **test** API is used only when the key is present AND test mode is
  **explicit**:
  - `DUFFEL_TEST_MODE=true`, or
  - the key itself looks like a Duffel test token (`duffel_test_…`)

  Test mode must NEVER default on in production runtime. Live keys without an
  explicit test flag hit the live API host.
  """

  @behaviour OpalCore.Bookings.Provider

  @api_base_live "https://api.duffel.com"
  # Duffel uses the same host for test tokens; test vs live is the key prefix.
  @api_base_test "https://api.duffel.com"

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

  @doc """
  Whether Duffel test mode is active for this key/opts.

  Explicit only: `DUFFEL_TEST_MODE=true` OR key prefix `duffel_test_`.
  Never defaults true in production.
  """
  def test_mode?(key, opts \\ [])

  def test_mode?(key, opts) when is_binary(key) do
    explicit_env? = test_mode_env?()
    opts_flag? = Keyword.get(opts, :test_mode, false) == true
    test_key? = String.starts_with?(String.trim(key), "duffel_test_")

    cond do
      opts_flag? -> true
      explicit_env? -> true
      test_key? -> true
      true -> false
    end
  end

  def test_mode?(_, _), do: false

  defp api_key(opts) do
    key = Keyword.get(opts, :api_key) || System.get_env("DUFFEL_API_KEY")

    if is_binary(key) and String.trim(key) != "" do
      {:ok, String.trim(key)}
    else
      {:disabled, "DUFFEL_API_KEY missing"}
    end
  end

  defp test_mode_env? do
    case System.get_env("DUFFEL_TEST_MODE") do
      v when v in ["true", "1", "TRUE", "yes"] -> true
      _ -> false
    end
  end

  defp api_base(key, opts) do
    if test_mode?(key, opts), do: @api_base_test, else: @api_base_live
  end

  defp do_search(params, key, opts) do
    # Thin live/test path — surfaces provider errors; never fabricates offers.
    body = %{
      "data" => %{
        "slices" => List.wrap(params["slices"] || params[:slices]),
        "passengers" => List.wrap(params["passengers"] || params[:passengers] || [%{"type" => "adult"}]),
        "cabin_class" => params["cabin_class"] || params[:cabin_class] || "economy"
      }
    }

    base = api_base(key, opts)

    case Req.post("#{base}/air/offer_requests",
           json: body,
           headers: duffel_headers(key),
           receive_timeout: 15_000
         ) do
      {:ok, %{status: status, body: resp}} when status in 200..299 ->
        offers = get_in(resp, ["data", "offers"]) || resp["offers"] || []

        {:ok,
         Enum.map(List.wrap(offers), fn o ->
           o
           |> normalize_offer()
           |> Map.put("test_mode", test_mode?(key, opts))
         end)}

      {:ok, %{status: status, body: body}} ->
        {:error, {:duffel_http, status, truncate(body)}}

      {:error, reason} ->
        {:error, {:duffel_request, reason}}
    end
  end

  defp do_book(params, key, opts) do
    offer_id = params["offer_id"] || params[:offer_id] || params["provider_ref"] || params[:provider_ref]

    if is_binary(offer_id) and offer_id != "" do
      body = %{
        "data" => %{
          "selected_offers" => [offer_id],
          "payments" => List.wrap(params["payments"] || params[:payments] || []),
          "passengers" => List.wrap(params["passengers"] || params[:passengers] || [])
        }
      }

      base = api_base(key, opts)

      case Req.post("#{base}/air/orders",
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
               "test_mode" => test_mode?(key, opts),
               "raw" => Map.take(data, ["id", "booking_reference", "total_amount", "total_currency"])
             }}
          else
            # Live/test response without a real confirmation — refuse to invent one.
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

  defp do_cancel(params, key, opts) do
    ref = params["provider_ref"] || params[:provider_ref] || params["id"] || params[:id]

    if is_binary(ref) and ref != "" do
      base = api_base(key, opts)

      case Req.post("#{base}/air/orders/#{ref}/actions/cancel",
             json: %{},
             headers: duffel_headers(key),
             receive_timeout: 15_000
           ) do
        {:ok, %{status: status, body: resp}} when status in 200..299 ->
          {:ok,
           %{
             "provider" => "duffel",
             "provider_ref" => ref,
             "status" => "cancelled",
             "test_mode" => test_mode?(key, opts),
             "raw" => resp
           }}

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
    case Req.get("#{@api_base_live}/air/orders/#{ref}",
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
           "status" => data["status"] || "unknown",
           "test_mode" => test_mode?(key, [])
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
