defmodule OpalCore.SocialFlow.Execution.FoodHandoff do
  @moduledoc """
  Repair #18 (Division B, Track B2) — food handoff transport, modeled
  directly on BookingTransport / NavigationTransport honesty doctrine.

  There is NO delivery-provider integration in this codebase: no API
  client, no cart prefill, no menu data. The lawful v1 shape is
  compose-inside-Opal (the group's own shared order list) plus a
  PER-PERSON handoff: each person opens the restaurant's own site (a
  real URL Opal actually holds from a verified places candidate) or
  their own delivery provider's public search (with the restaurant
  name as the search term, labeled a search), and places + pays for
  their own order there, delivered to the address in THEIR provider
  account. Opal never sees an address, never charges, never learns
  whether an order happened — the person's own "I placed my order"
  tap is the only confirmation that exists, and it is a self-report.

  NEVER slug-guess a provider store URL (design §3.5): a guessed
  delivery-store link in front of a payment is worse than an honest
  search handoff. When neither a held website nor a recipient-chosen
  provider exists, there is NO button: the step returns the no-rail
  fact with the restaurant name (and a real phone only when held).
  """

  @doc "Capability truth for ledger / product honesty (§3.6)."
  def capability_matrix do
    %{
      "direct_ordering_api" => "none_connected",
      "cart_prefill_supported" => false,
      "cart_prefill_verified_providers" => [],
      "default_mode" => "handoff",
      "claims_ordered_on_handoff" => false,
      "payment_handled_by" => "provider_only",
      "address_handled_by" => "provider_only",
      "provider_is_not_authority" => true
    }
  end

  # The recipient's own provider choice: public search bases ONLY. The
  # restaurant name travels as a search term; the result is labeled a
  # search, never a store page. A provider not in this map has no rail.
  @provider_search %{
    "doordash" => "https://www.doordash.com/search/store/",
    "ubereats" => "https://www.ubereats.com/search?q=",
    "grubhub" => "https://www.grubhub.com/search?query="
  }

  @doc "Provider keys a recipient may pick in their own handoff sheet."
  def provider_choices, do: Map.keys(@provider_search)

  @doc """
  Prepare a handoff for ONE recipient from held data only.

  Input (string or atom keys): `restaurant_name`, `restaurant_website`
  (a real URL held from a verified candidate, or nil),
  `restaurant_phone` (real, or nil), `provider_choice` (the recipient's
  own pick or nil), `items` (their household's own list).

  Returns `{:ok, prepared}` with `"ordered" => false` and
  `"provider_confirmed" => false` ALWAYS, or `{:ok, no_rail}` when no
  lawful target exists — the no-rail fact is a successful honest
  answer, not an error.
  """
  def prepare_handoff(attrs, _opts \\ []) when is_map(attrs) do
    a = stringify(attrs)
    name = present(a["restaurant_name"])
    website = http_url(a["restaurant_website"])
    phone = present(a["restaurant_phone"])
    choice = present(a["provider_choice"])

    cond do
      # Repair #18 (apifix, FR-18-B2-01): no restaurant chosen yet is a
      # FACT the handoff surface must state (the honest no-rail
      # answer: nothing handed off, nothing ordered), not a 422 - a
      # participant tapping handoff before the group picks a place
      # got an error where the contract promises handoff-only truth.
      is_nil(name) ->
        {:ok,
         %{
           "state" => "no_rail",
           "mode" => "handoff",
           "restaurant_name" => nil,
           "handoff_url" => nil,
           "ordered" => false,
           "provider_confirmed" => false,
           "no_rail_reason" =>
             "No restaurant has been chosen for this plan yet. Once the group picks a place, your own handoff opens here."
         }}

      # The recipient's OWN explicit provider pick wins for their handoff;
      # with no pick, the held restaurant website is the default target.
      is_binary(choice) and Map.has_key?(@provider_search, choice) ->
        {:ok,
         base(a, name)
         |> Map.merge(%{
           "state" => "prepared",
           "target_kind" => "provider_search",
           "handoff_url" => @provider_search[choice] <> URI.encode_www_form(name),
           "label" => "Open your delivery app - search #{name}"
         })}

      is_binary(website) ->
        {:ok,
         base(a, name)
         |> Map.merge(%{
           "state" => "prepared",
           "target_kind" => "restaurant_site",
           "handoff_url" => website,
           "label" => "Open #{name} site to order"
         })}

      true ->
        {:ok,
         %{
           "state" => "no_rail",
           "mode" => "handoff",
           "restaurant_name" => name,
           "handoff_url" => nil,
           "ordered" => false,
           "provider_confirmed" => false,
           "no_rail_reason" => no_rail_copy(name, phone)
         }}
    end
  end

  def prepare_handoff(_, _), do: {:error, :invalid}

  @doc """
  The recipient's own tap starts the handoff. Requires the explicit
  `user_authorized: true` flag — nobody can start another person's
  handoff. Returns handoff facts only: opening a URL is the last fact
  Opal knows. `"claim" => "handoff_started_not_ordered"`.
  """
  def start_handoff(prepared, opts \\ []) when is_map(prepared) do
    p = stringify(prepared)

    cond do
      Keyword.get(opts, :user_authorized) != true ->
        {:error, :user_authorization_required}

      p["state"] == "no_rail" ->
        {:ok,
         Map.merge(p, %{
           "state" => "no_rail",
           "handoff_started" => false,
           "ordered" => false,
           "provider_confirmed" => false,
           "claim" => "no_ordering_link_for_this_restaurant"
         })}

      p["state"] != "prepared" ->
        {:error, :not_prepared}

      true ->
        {:ok,
         Map.merge(p, %{
           "state" => "handed_off",
           "handoff_started" => true,
           "opened_url" => p["handoff_url"],
           "ordered" => false,
           "provider_confirmed" => false,
           "claim" => "handoff_started_not_ordered",
           "copy" =>
             "You opened the ordering page. When you have placed your order there, tap I placed my order."
         })}
    end
  end

  def start_handoff(_, _), do: {:error, :invalid}

  @doc "Canonical no-rail copy (§5.2); phone clause only when a real phone is held."
  def no_rail_copy(name, phone) do
    base = "No ordering link for this restaurant. "

    if is_binary(phone) and String.trim(phone) != "" do
      base <> "Call #{phone} or open your usual delivery app and search #{name}."
    else
      base <> "Open your usual delivery app and search #{name}."
    end
  end

  defp base(a, name) do
    %{
      "mode" => "handoff",
      "restaurant_name" => name,
      "items" => List.wrap(a["items"] || []),
      "ordered" => false,
      "provider_confirmed" => false,
      "header" =>
        "Opal does not place this order. You order and pay in the provider, delivered to the address in your provider account."
    }
  end

  defp http_url(url) when is_binary(url) do
    url = String.trim(url)

    if String.starts_with?(url, "https://") or String.starts_with?(url, "http://"),
      do: url,
      else: nil
  end

  defp http_url(_), do: nil

  defp present(v) when is_binary(v) do
    case String.trim(v) do
      "" -> nil
      t -> t
    end
  end

  defp present(_), do: nil

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
