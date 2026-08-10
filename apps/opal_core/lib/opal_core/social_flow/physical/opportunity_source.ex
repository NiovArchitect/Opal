defmodule OpalCore.SocialFlow.Physical.OpportunitySource do
  @moduledoc """
  Bounded opportunity source contract.

  Sources discover WHAT EXISTS in the world.
  Opal judgment decides WHAT IS WORTH ATTENTION.
  Humans retain social authority.

  Not a search product. Not a feed. Not provider-specific SocialFlow logic.

  Quality metric for a source is NOT listing volume.
  It is: how often this source allows Opal to remove a search, question,
  comparison, or app switch (alignment compression).
  """

  alias OpalCore.SocialFlow.Physical.{CandidateSource, WorldFact}
  alias OpalCore.SocialFlow.Physical.Providers.{GooglePlaces, Metrics, Mode, TicketmasterEvents}

  @type query :: map()
  @type candidate :: map()

  @callback fetch_candidates(query()) :: {:ok, [candidate()]} | {:error, term()}
  @callback source_id() :: String.t()
  @callback cost_tier() :: String.t()

  @doc """
  Acquire candidates through the source contract with query bounding.

  Uses staged narrowing already done by caller (zone/time/category).
  Default backend: CandidateSource fixtures (synthetic).
  """
  def acquire(query) when is_map(query) do
    q = stringify(query)

    case query_worth_running?(q) do
      {:skip, reason} ->
        {:ok,
         %{
           "candidates" => [],
           "candidate_count" => 0,
           "skipped" => true,
           "reason" => reason,
           "answers" => "what_exists",
           "does_not_answer" => "what_should_users_do",
           "authorizes_set" => false,
           "feed" => false
         }}

      :ok ->
        do_fetch(q)
    end
  end

  def acquire(_), do: {:error, :invalid}

  @doc """
  Before provider query: could a perfect result be used soon?

  Weak social intent must not justify reservation inventory.
  """
  def query_worth_running?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["blocked"] == true ->
        {:skip, "blocked"}

      a["humans_already_solved"] == true ->
        {:skip, "humans_solved"}

      a["topic_changed"] == true ->
        {:skip, "topic_changed"}

      a["weak_intent"] == true and a["force_query"] != true ->
        {:skip, "weak_intent_no_value"}

      missing_bounds?(a) ->
        {:skip, "unbounded_query"}

      a["actionability_probability"] != nil and to_f(a["actionability_probability"]) < 0.25 and
          a["force_query"] != true ->
        {:skip, "low_actionability_probability"}

      true ->
        :ok
    end
  end

  def query_worth_running?(_), do: {:skip, "invalid"}

  defp missing_bounds?(a) do
    zone_missing = a["area_label"] in [nil, ""] and a["primary_area"] in [nil, ""]
    # Category optional for pure open-now density, but force_query only
    zone_missing and a["allow_unbounded"] != true
  end

  defp do_fetch(q) do
    source = source_atom(q)
    family = if source == :events, do: :events, else: :places
    mode = Mode.resolve(family)

    case fetch_from_backend(q, source, mode) do
      {:ok, raw, meta} ->
        normalized =
          raw
          |> Enum.map(&normalize_candidate(&1, q, source_label(source, meta)))
          |> Enum.reject(&is_nil/1)
          |> Enum.take(to_i(q["max_candidates"] || 20))

        {:ok,
         %{
           "candidates" => normalized,
           "candidate_count" => length(normalized),
           "source" => meta["source"] || to_string(source),
           "provider_mode" => mode["mode"],
           "real" => meta["real"] == true,
           "synthetic" => meta["synthetic"] != false and meta["real"] != true,
           "query_fingerprint" => fingerprint(q),
           "plan_version" => q["plan_version"],
           "answers" => "what_exists",
           "does_not_answer" => "what_should_users_do",
           "provider_is_not_authority" => true,
           "does_not_claim_availability_slots" =>
             meta["does_not_claim_availability_slots"] != false,
           "authorizes_set" => false,
           "feed" => false,
           "map_ui" => false,
           "compression_oriented" => true
         }}

      {:error, reason} ->
        # Never silently swap real→synthetic when mode is connected
        if mode["silent_synthetic_fallback_forbidden"] do
          Metrics.emit("provider.error", family: to_string(family))

          {:ok,
           %{
             "candidates" => [],
             "candidate_count" => 0,
             "error" => to_string(reason),
             "provider_mode" => "error",
             "real" => false,
             "synthetic" => false,
             "skipped" => true,
             "reason" => "provider_error_no_silent_fallback",
             "answers" => "what_exists",
             "provider_is_not_authority" => true,
             "authorizes_set" => false,
             "feed" => false
           }}
        else
          fetch_synthetic(q, source)
        end
    end
  end

  defp fetch_from_backend(q, source, mode) do
    cond do
      mode["mode"] == "connected" and source == :events ->
        case TicketmasterEvents.fetch_candidates(q) do
          {:ok, %{"candidates" => list} = meta} -> {:ok, list, meta}
          {:error, r} -> {:error, r}
        end

      mode["mode"] == "connected" and source in [:catalog, :places] ->
        case GooglePlaces.fetch_candidates(q) do
          {:ok, %{"candidates" => list} = meta} -> {:ok, list, meta}
          {:error, r} -> {:error, r}
        end

      mode["mode"] in ~w(disabled error) ->
        {:error, :provider_unavailable}

      true ->
        # intentional synthetic
        area = q["area_label"] || q["primary_area"]
        category = q["category"] || q["experience_type"]

        case CandidateSource.fetch(
               source: source,
               category: if(source == :catalog, do: category || "dinner", else: nil),
               area_label: area
             ) do
          {:ok, list} ->
            {:ok, list,
             %{
               "source" => "fixture_" <> to_string(source),
               "real" => false,
               "synthetic" => true
             }}

          err ->
            err
        end
    end
  end

  defp fetch_synthetic(q, source) do
    area = q["area_label"] || q["primary_area"]
    category = q["category"] || q["experience_type"]

    with {:ok, raw} <-
           CandidateSource.fetch(
             source: source,
             category: if(source == :catalog, do: category || "dinner", else: nil),
             area_label: area
           ) do
      normalized =
        raw
        |> Enum.map(&normalize_candidate(&1, q, source))
        |> Enum.reject(&is_nil/1)
        |> Enum.take(to_i(q["max_candidates"] || 20))

      {:ok,
       %{
         "candidates" => normalized,
         "candidate_count" => length(normalized),
         "source" => "fixture_" <> to_string(source),
         "provider_mode" => "synthetic",
         "real" => false,
         "synthetic" => true,
         "query_fingerprint" => fingerprint(q),
         "plan_version" => q["plan_version"],
         "answers" => "what_exists",
         "does_not_answer" => "what_should_users_do",
         "provider_is_not_authority" => true,
         "authorizes_set" => false,
         "feed" => false,
         "map_ui" => false,
         "compression_oriented" => true
       }}
    end
  end

  defp source_label(:events, meta), do: meta["source"] || "events"
  defp source_label(_, meta), do: meta["source"] || "catalog"

  @doc "Normalize provider payload to minimum useful fields + provenance."
  def normalize_candidate(raw, query \\ %{}, source \\ :catalog)

  def normalize_candidate(raw, query, source) when is_map(raw) do
    p = stringify(raw)
    q = stringify(query)
    base = CandidateSource.normalize_place(p) || %{}
    if base == %{}, do: nil, else: finish_normalize(base, p, q, source)
  end

  def normalize_candidate(_, _, _), do: nil

  defp finish_normalize(base, p, q, source) do
    facts = derive_facts(base, p)

    Map.merge(base, %{
      "candidate_id" => base["provider_place_id"] || p["id"],
      "type" => candidate_type(base),
      "coordinates" => p["coordinates"] || p["latlng"],
      "area" => base["area_label"] || q["area_label"],
      "time_availability" => p["time_availability"],
      "opening_hours" => p["opening_hours"] || p["hours"],
      "event_start" => p["event_start"] || p["start_at"],
      "event_end" => p["event_end"] || p["end_at"],
      "cost_indication" => base["price_level"],
      "party_size_compatible" => p["party_size_compatible"] != false,
      "provider_capability" => p["provider_capability"] || %{},
      "reservation_support" => base["reservation_support"] == true,
      "ticket_support" => p["ticket_support"] == true,
      "facts" => facts,
      "provenance" =>
        WorldFact.provenance(%{
          "source" => to_string(source),
          "source_item_id" => base["provider_place_id"],
          "area_label" => base["area_label"] || q["area_label"],
          "coordination_mode" => q["coordination_mode"],
          "live" => q["live"] == true or p["live"] == true,
          "synthetic" => p["real"] != true,
          "real" => p["real"] == true,
          "retrieval_mode" =>
            q["retrieval_mode"] || p["provider_freshness"] || "fixture_or_cache",
          "confidence" => p["confidence"],
          "valid_until" => p["valid_until"]
        }),
      "raw_provider_schema" => false,
      "giant_payload_rejected" => true
    })
  end

  defp derive_facts(base, p) do
    [
      WorldFact.assert_fact("venue_exists", %{"source_item_id" => base["provider_place_id"]}),
      if(base["open_now"] != false,
        do: WorldFact.assert_fact("venue_open", %{}),
        else: nil
      ),
      if(p["opening_hours"] || p["hours"],
        do: WorldFact.assert_fact("venue_hours_known", %{}),
        else: nil
      ),
      if("event" in List.wrap(base["categories"]),
        do: WorldFact.assert_fact("event_scheduled", %{}),
        else: nil
      ),
      if(base["reservation_support"] == true,
        do: WorldFact.assert_fact("reservation_supported", %{}),
        else: nil
      ),
      cond do
        p["inventory"] == "available" ->
          WorldFact.assert_fact("inventory_available", %{"live" => p["live"] == true})

        p["inventory"] == "low" ->
          WorldFact.assert_fact("inventory_low", %{"live" => true})

        p["reservation_checked"] == true ->
          WorldFact.assert_fact("reservation_checked", %{"live" => true})

        true ->
          WorldFact.assert_fact("inventory_unknown", %{})
      end,
      if(p["rating"] || p["review_count"],
        do: WorldFact.assert_fact("popularity_signal", %{"value" => p["rating"]}),
        else: nil
      ),
      if(p["live_demand"] == true or p["activity_signal"] == true,
        do: WorldFact.assert_fact("activity_signal", %{"live" => true}),
        else: nil
      )
    ]
    |> Enum.reject(&is_nil/1)
  end

  defp candidate_type(base) do
    cats = List.wrap(base["categories"])

    cond do
      "event" in cats or "concert" in cats -> "event"
      "dinner" in cats or "restaurant" in cats -> "place"
      true -> "place"
    end
  end

  defp source_atom(q) do
    case q["source"] || q["source_kind"] do
      "events" -> :events
      :events -> :events
      s when s in ["catalog", :catalog, nil] -> :catalog
      other when is_atom(other) -> other
      other when is_binary(other) -> String.to_existing_atom(other)
      _ -> :catalog
    end
  rescue
    ArgumentError -> :catalog
  end

  @doc "Stable fingerprint for plan-versioned provider results."
  def fingerprint(query) when is_map(query) do
    q = stringify(query)

    parts = [
      q["plan_version"] || 0,
      q["area_label"] || q["primary_area"] || "",
      q["category"] || q["experience_type"] || "",
      q["party_size"] || 0,
      q["time_window"] || q["coordination_mode"] || "",
      q["source"] || "catalog"
    ]

    :crypto.hash(:sha256, Enum.join(Enum.map(parts, &to_string/1), "|"))
    |> Base.encode16(case: :lower)
    |> binary_part(0, 16)
  end

  def fingerprint(_), do: "invalid"

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
