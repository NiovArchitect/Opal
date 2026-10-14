defmodule OpalCore.Places.Provider do
  @moduledoc """
  Places provider behaviour — server-side only.

  Resolves destinations and discovers what exists. Never invents ratings,
  reservations, or confirmation numbers. Opal judgment decides fit.
  """

  @type destination :: map()
  @type candidate :: map()
  @type search_result :: map()

  @callback id() :: String.t()
  @callback capabilities() :: map()
  @callback health() :: map()
  @callback resolve_destination(query :: map() | String.t()) ::
              {:ok, destination()} | {:error, term()}
  @callback search_places(query :: map()) :: {:ok, search_result()} | {:error, term()}
  @callback get_place(id :: String.t()) :: {:ok, candidate()} | {:error, term()}
end
