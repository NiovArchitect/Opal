defmodule OpalCore.Bookings.OpenTable do
  @moduledoc """
  OpenTable restaurant adapter — HONESTLY ABSENT as a search provider.

  Repair #18 FALSE-fix F-01: there is no wired OpenTable partner search
  call in this codebase. The previous `search/2`, when a key was present,
  performed NO HTTP request and returned the caller's own query string
  echoed back as a result row — a result-shaped fabrication. That behavior
  is deleted: `search/2` now returns `{:disabled, reason}` whether or not
  `OPENTABLE_API_KEY` is provisioned, so provisioning a key can never arm
  the echo. Search stays disabled until a real partner call exists.

  OpenTable has no simple self-serve booking API for most partners, so
  `book/2` / `cancel/1` also refuse — **call to book** is the honest path.
  `build_call_to_book/4` remains as an honest helper: when a `place_id`
  is present it enriches the draft with a **real phone** from
  `OpalCore.Places.get_details/1`; it never fabricates phone numbers or
  reservation confirmations.
  """

  @behaviour OpalCore.Bookings.Provider

  alias OpalCore.Places

  @impl true
  def search(params, opts \\ []) when is_map(params) do
    # F-01: no partner search call exists, so search is disabled in BOTH
    # key states. It must be impossible for a provisioned key to produce
    # a result row — the old keyed branch echoed the query as the result.
    _ = params

    case api_key(opts) do
      {:disabled, _} = dis ->
        dis

      {:ok, _} ->
        {:disabled,
         "OpenTable search is not connected — no partner search API is wired; call the restaurant to book"}
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
