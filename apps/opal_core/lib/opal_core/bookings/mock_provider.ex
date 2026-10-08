defmodule OpalCore.Bookings.MockProvider do
  @moduledoc """
  TEST-ONLY mock provider — never ship as production default.
  """

  @behaviour OpalCore.Bookings.Provider

  @impl true
  def search(params, opts \\ []) when is_map(params) do
    with :ok <- assert_test_only(opts) do
      booking_type = params["booking_type"] || params[:booking_type] || "flight"

      {:ok,
       [
         %{
           "provider" => "mock",
           "offer_id" => "mock_offer_#{booking_type}_1",
           "booking_type" => booking_type,
           "label" => "Mock #{booking_type} option",
           "total_amount" => "120.00",
           "total_currency" => "USD",
           "bookable" => true
         }
       ]}
    end
  end

  @impl true
  def book(params, opts \\ []) when is_map(params) do
    with :ok <- assert_test_only(opts) do
      offer_id = params["offer_id"] || params[:offer_id] || "mock_offer_1"
      conf = "MOCK" <> Integer.to_string(System.unique_integer([:positive]))

      {:ok,
       %{
         "provider" => "mock",
         "provider_ref" => "mock_ref_#{offer_id}",
         "confirmation_number" => conf,
         "status" => "confirmed",
         "booking_type" => params["booking_type"] || params[:booking_type] || "flight"
       }}
    end
  end

  @impl true
  def cancel(params, opts \\ []) when is_map(params) do
    with :ok <- assert_test_only(opts) do
      ref = params["provider_ref"] || params[:provider_ref] || params["id"] || "mock_ref"

      {:ok,
       %{
         "provider" => "mock",
         "provider_ref" => ref,
         "status" => "cancelled"
       }}
    end
  end

  @impl true
  def get_booking(ref) when is_binary(ref) do
    with :ok <- assert_test_only([]) do
      {:ok,
       %{
         "provider" => "mock",
         "provider_ref" => ref,
         "status" => "confirmed",
         "confirmation_number" => nil
       }}
    end
  end

  def get_booking(_), do: {:error, :invalid_ref}

  defp assert_test_only(opts) do
    allow? = Keyword.get(opts, :allow_test_mock, false) == true

    if Mix.env() == :test or allow? do
      :ok
    else
      {:error, :test_mock_refused}
    end
  end
end
