defmodule OpalCore.Bookings.OpenTable do
  @moduledoc """
  OpenTable restaurant adapter.

  Gates on `OPENTABLE_API_KEY` for informational partner search. Without the
  key every callback returns `{:disabled, "OPENTABLE_API_KEY missing"}`.

  OpenTable has no simple self-serve booking API for most partners — search-only
  plus **call to book** is the honest path. Even with a key, `book/2` refuses to
  invent a reservation confirmation.

  Paste G Phase 6: when a `place_id` is present, enriches call-to-book with a
  **real phone** from `OpalCore.Places.get_details/1` + draft SMS/call script.
  Never fabricates phone numbers or reservation confirmations.
  """

  @behaviour OpalCore.Bookings.Provider

  alias OpalCore.Places

  @impl true
  def search(params, opts \\ []) when is_map(params) do
    with {:ok, _key} <- api_key(opts) do
      query = params["query"] || params[:query] || params["place"] || params[:place] || "restaurant"
      party = params["party_size"] || params[:party_size] || 2
      when_label = params["when"] || params[:when] || params["time"] || params[:time]
      place_id = params["place_id"] || params[:place_id]

      call_to_book = build_call_to_book(query, party, when_label, place_id)

      {:ok,
       [
         Map.merge(
           %{
             "provider" => "opentable",
             "name" => to_string(query),
             "party_size" => party,
             "when" => when_label,
             "place_id" => place_id,
             "bookable" => false,
             "call_to_book" => true,
             "message" => "OpenTable search is informational — call the restaurant to book."
           },
           call_to_book
         )
       ]}
    end
  end

  @impl true
  def book(params, opts \\ []) when is_map(params) do
    case api_key(opts) do
      {:disabled, _} = dis ->
        dis

      {:ok, _} ->
        # Never invent a reservation confirmation — call-to-book only.
        _ = params
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

  @doc """
  Build call-to-book helper with real Places phone when available.

  Returns map keys: phone, draft_message, place_details (optional).
  """
  def build_call_to_book(name, party_size, when_label, place_id \\ nil) do
    details =
      if is_binary(place_id) and place_id != "" do
        case Places.get_details(place_id) do
          {:ok, d} -> d
          _ -> nil
        end
      else
        nil
      end

    phone = details && details["phone"]
    display_name = (details && details["name"]) || to_string(name)
    when_bit = if when_label, do: " for #{when_label}", else: ""
    party_bit = "party of #{party_size}"

    draft =
      cond do
        is_binary(phone) and phone != "" ->
          "Hi, I'd like to reserve a table at #{display_name}#{when_bit}, #{party_bit}. Is that available?"

        true ->
          "I'd like to call #{display_name} to reserve#{when_bit}, #{party_bit}. Phone not on file yet — look up the restaurant."
      end

    %{
      "phone" => phone,
      "draft_message" => draft,
      "place_details" => details,
      "call_to_book" => true
    }
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
