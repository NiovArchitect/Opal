defmodule OpalCore.SocialFlow.ExternalWorldTruth do
  @moduledoc """
  Boundary between social intelligence and external-world / execution truth.

  ## Three truth classes (never collapse)

  1. **SOCIAL_FIT** — CollectiveComposition / ranking
     "This venue looks compatible with the group."
     Does NOT imply open / bookable / reserved / paid.

  2. **PROVIDER_FACT** — inventory, hours, free/busy, travel
     Requires provenance (source, observed_at, synthetic|real).
     Does NOT authorize Set, share, or payment.

  3. **EXECUTION_STATE** — hold / book / pay / navigate attempts
     Separate machine; requires human authorization where applicable.

  LLM inference is never provider truth.
  Social ranking is never a reservation.
  """

  alias OpalCore.SocialFlow.Physical.WorldFact
  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary
  alias OpalCore.SocialFlow.RealWorld.ProviderAuthority

  @truth_classes ~w(social_fit provider_fact execution_state)

  def truth_classes, do: @truth_classes
  def execution_states, do: ProviderBoundary.states() ++ ~w(unverified checking available unavailable held authorized expired)

  @doc """
  Classify a claim into a truth class. Returns error if class is invalid.
  """
  def classify_claim(claim) when is_map(claim) do
    c = stringify(claim)
    class = c["truth_class"] || c["class"] || infer_class(c)

    cond do
      class not in @truth_classes ->
        {:error, :unknown_truth_class}

      class == "social_fit" ->
        {:ok, social_fit_contract(c)}

      class == "provider_fact" ->
        {:ok, provider_fact_contract(c)}

      class == "execution_state" ->
        {:ok, execution_contract(c)}
    end
  end

  def classify_claim(_), do: {:error, :invalid}

  @doc """
  Social fit from collective ranking — never implies provider availability or booking.
  """
  def social_fit_from_collective(option) when is_map(option) do
    o = stringify(option)

    %{
      "truth_class" => "social_fit",
      "venue_id" => o["id"],
      "venue_name" => o["name"] || o["display_name"],
      "social_fit" => "strong",
      "provider_status" => "unknown",
      "execution_state" => "unverified",
      "booked" => false,
      "open_now" => :unknown,
      "reservation_available" => :unknown,
      "authorizes_set" => false,
      "authorizes_booking" => false,
      "authorizes_payment" => false,
      "llm_is_not_provider" => true,
      "human_safe_claim" => "Looks like a good fit for the group.",
      "forbidden_claims" => ~w(bookable open confirmed reserved paid)
    }
  end

  def social_fit_from_collective(_), do: %{"truth_class" => "social_fit", "authorizes_set" => false}

  @doc "True if language would overclaim provider/execution truth from social fit alone."
  def overclaims_provider?(text) when is_binary(text) do
    Regex.match?(
      ~r/\b(booked|confirmed reservation|table is reserved|open now|available for booking|paid|charged)\b/i,
      text
    ) and not Regex.match?(~r/\b(might|looks|could|candidate|fit)\b/i, text)
  end

  def overclaims_provider?(_), do: false

  @doc """
  Invariant: social fit recommendation must not authorize Set, booking, or payment.
  """
  def assert_social_fit_boundaries!(fit) when is_map(fit) do
    f = stringify(fit)

    if f["authorizes_set"] == true, do: raise("EXTERNAL_TRUTH: social_fit authorizes_set")
    if f["authorizes_booking"] == true, do: raise("EXTERNAL_TRUTH: social_fit authorizes_booking")
    if f["authorizes_payment"] == true, do: raise("EXTERNAL_TRUTH: social_fit authorizes_payment")
    if f["booked"] == true, do: raise("EXTERNAL_TRUTH: social_fit booked without provider")
    :ok
  end

  def assert_social_fit_boundaries!(_), do: {:error, :invalid}

  @doc """
  Provider fact must carry provenance; synthetic catalog is labeled synthetic.
  """
  def assert_provider_provenance!(fact) when is_map(fact) do
    f = stringify(fact)
    prov = f["provenance"] || %{}

    cond do
      not is_map(prov) ->
        raise("EXTERNAL_TRUTH: provider fact missing provenance")

      is_nil(prov["source"]) or prov["source"] == "" ->
        raise("EXTERNAL_TRUTH: provider fact missing source")

      is_nil(prov["observed_at"]) ->
        raise("EXTERNAL_TRUTH: provider fact missing observed_at")

      true ->
        :ok
    end
  end

  def assert_provider_provenance!(_), do: {:error, :invalid}

  @doc "LLM output is never accepted as provider inventory."
  def llm_is_not_provider?(source) when is_binary(source) do
    s = String.downcase(source)
    s not in ~w(llm model inference openai anthropic grok gpt)
  end

  def llm_is_not_provider?(_), do: false

  @doc """
  Booking requires explicit user authorization and valid inquiry state.
  Ranking alone is never enough.
  """
  def may_request_booking?(inquiry, opts \\ []) do
    i = stringify(inquiry || %{})

    cond do
      Keyword.get(opts, :user_authorized) != true ->
        {:error, :user_authorization_required}

      i["from_social_rank_only"] == true ->
        {:error, :social_fit_is_not_booking}

      true ->
        ProviderBoundary.request_booking(i, opts)
    end
  end

  @doc "Failure recomposes only the broken dimension — provider fail does not erase social dims."
  def recompose_after_provider_failure(reality, failure) when is_map(reality) and is_map(failure) do
    r = stringify(reality)
    f = stringify(failure)

    r
    |> Map.put("provider_status", f["state"] || "failed")
    |> Map.put("execution_state", f["state"] || "failed")
    |> Map.put("booked", false)
    # Preserve social dimensions
    |> Map.put("what", r["what"])
    |> Map.put("when", r["when"])
    |> Map.put("where_social_fit", r["where"] || r["where_social_fit"])
    |> Map.put("next_gap", r["next_gap"] || "place")
    |> Map.put("authorizes_set", false)
    |> Map.put("failure_scope", f["scope"] || "provider")
  end

  def recompose_after_provider_failure(r, _), do: r

  @doc "Attach WorldFact provenance to a catalog/fixture venue (synthetic)."
  def fixture_provider_fact(venue) when is_map(venue) do
    v = stringify(venue)

    WorldFact.assert_fact("inventory_unknown", %{
      "source" => "fixture_catalog",
      "source_item_id" => v["id"],
      "synthetic" => true,
      "real" => false,
      "confidence" => 0.3,
      "value" => "unknown"
    })
  end

  def fixture_provider_fact(_), do: WorldFact.assert_fact("inventory_unknown", %{})

  # --- internals ---

  defp infer_class(c) do
    cond do
      c["booked"] == true or c["execution_state"] != nil -> "execution_state"
      c["provider"] != nil or c["provenance"] != nil -> "provider_fact"
      true -> "social_fit"
    end
  end

  defp social_fit_contract(c) do
    c
    |> Map.put("truth_class", "social_fit")
    |> Map.put_new("provider_status", "unknown")
    |> Map.put_new("execution_state", "unverified")
    |> Map.put_new("booked", false)
    |> Map.put("authorizes_set", false)
    |> Map.put("authorizes_booking", false)
    |> Map.put("authorizes_payment", false)
    |> Map.put("llm_is_not_provider", true)
  end

  defp provider_fact_contract(c) do
    auth = ProviderAuthority.classify_fact(c["source"] || "provider_availability", c)
    prov = c["provenance"] || WorldFact.provenance(c)

    c
    |> Map.put("truth_class", "provider_fact")
    |> Map.put("provenance", prov)
    |> Map.put("authorizes_set", false)
    |> Map.put("authorizes_booking", auth["authorizes_booking"] == true)
    |> Map.put("authorizes_payment", false)
    |> Map.put("llm_is_not_provider", llm_is_not_provider?(to_string(prov["source"] || "")))
  end

  defp execution_contract(c) do
    state = c["execution_state"] || c["state"] || "unverified"

    c
    |> Map.put("truth_class", "execution_state")
    |> Map.put("execution_state", state)
    |> Map.put("booked", state == "confirmed")
    |> Map.put("authorizes_set", false)
    |> Map.put(
      "authorizes_booking",
      state in ~w(hold_available requested) and c["user_authorized"] == true
    )
    |> Map.put("authorizes_payment", c["payment_authorized"] == true)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
