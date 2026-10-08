defmodule OpalCore.Bookings.OpenTable do
  @moduledoc """
  OpenTable restaurant adapter.

  Gates on `OPENTABLE_API_KEY`. Without the key every callback returns
  `{:disabled, "OPENTABLE_API_KEY missing"}`.

  OpenTable has no simple self-serve booking API for most partners — search-only
  plus "call to book" is the honest path when disabled/informational. Even with a
  key, `book/2` refuses to invent a reservation confirmation and returns a
  call-to-book disabled result.
  """

  @behaviour OpalCore.Bookings.Provider

  @impl true
  def search(params, opts \\ []) when is_map(params) do
    with {:ok, _key} <- api_key(opts) do
      # Informational search path — options are not remotely bookable via API.
      query = params["query"] || params[:query] || params["place"] || params[:place] || "restaurant"
      party = params["party_size"] || params[:party_size] || 2
      when_label = params["when"] || params[:when] || params["time"] || params[:time]

      {:ok,
       [
         %{
           "provider" => "opentable",
           "name" => to_string(query),
           "party_size" => party,
           "when" => when_label,
           "bookable" => false,
           "call_to_book" => true,
           "message" => "OpenTable search is informational — call the restaurant to book."
         }
       ]}
    end
  end

  @impl true
  def book(params, opts \\ []) when is_map(params) do
    case api_key(opts) do
      {:disabled, _} = dis ->
        dis

      {:ok, _} ->
        {:disabled,
         "OpenTable has no self-serve booking API for most partners — call to book"}
    end
  end

  @impl true
  def cancel(params, opts \\ []) when is_map(params) do
    case api_key(opts) do
      {:disabled, _} = dis -> dis
      {:ok, _} -> {:disabled, "OpenTable cancel not available via self-serve API"}
    end
  end

  @impl true
  def get_booking(_ref) do
    case api_key([]) do
      {:disabled, _} = dis -> dis
      {:ok, _} -> {:error, :not_supported}
    end
  end

  defp api_key(opts) do
    key = Keyword.get(opts, :api_key) || System.get_env("OPENTABLE_API_KEY")

    if is_binary(key) and String.trim(key) != "" do
      {:ok, String.trim(key)}
    else
      {:disabled, "OPENTABLE_API_KEY missing"}
    end
  end
end
