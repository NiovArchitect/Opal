defmodule OpalCore.Bookings.Provider do
  @moduledoc """
  Behaviour for booking providers (flights, hotels, restaurants, activities).

  Adapters must return `{:disabled, reason}` when credentials are absent —
  never invent confirmation numbers or claim a live booking.
  """

  @callback search(map(), keyword()) :: {:ok, [map()]} | {:error, term()} | {:disabled, term()}
  @callback book(map(), keyword()) :: {:ok, map()} | {:error, term()} | {:disabled, term()}
  @callback cancel(map(), keyword()) :: {:ok, map()} | {:error, term()} | {:disabled, term()}
  @callback get_booking(String.t()) :: {:ok, map()} | {:error, term()} | {:disabled, term()}
end
