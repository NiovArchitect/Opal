defmodule OpalCore.Intelligence.WorldEnrichment do
  @moduledoc """
  Cost-guarded Search + Places enrichment for LLM prompts (Paste G Phase 2).

  Only triggers for venue/event-like intents. Results are injected as
  SEARCH RESULTS / PLACES RESULTS sections with the rule: if a fact is not
  in the results, do not state it as fact. Never invents hits.
  """

  require Logger

  alias OpalCore.Places
  alias OpalCore.Search

  @venue_event_intents ~w(world.lookup world.venue world.event plan.propose plan.question recommend booking_request)
  @venue_re ~r/\b(restaurant|cafe|coffee|bar|venue|place|hotel|museum|park|concert|show|event|nightlife|dinner|brunch|lunch|where\s+can|best\s+\w+\s+in)\b/i
  @event_re ~r/\b(concert|festival|show|tickets?|what'?s\s+on|happening|event)\b/i

  @doc "True when message/intent looks like a venue or event ask."
  def venue_or_event_like?(intent, text) when is_binary(text) do
    intent_hit? = is_binary(intent) and intent in @venue_event_intents
    text_hit? = Regex.match?(@venue_re, text) or Regex.match?(@event_re, text)
    intent_hit? or text_hit?
  end

  def venue_or_event_like?(_, _), do: false

  @doc """
  Optionally fetch search + places for the current message.

  Returns a map suitable for PromptBuilder / LlmRespond:
  `%{search_section: binary | nil, places_section: binary | nil, meta: map}`.
  """
  def enrich(intent, text, opts \\ [])

  def enrich(intent, text, opts) when is_binary(text) do
    if venue_or_event_like?(intent, text) do
      do_enrich(intent, text, opts)
    else
      Logger.info("world_enrichment.skipped reason=not_venue_event intent=#{intent}")
      %{search_section: nil, places_section: nil, meta: %{triggered: false}}
    end
  end

  def enrich(_, _, _), do: %{search_section: nil, places_section: nil, meta: %{triggered: false}}

  @doc "Format rule block always appended when any results section is present."
  def honesty_rule do
    "SEARCH/PLACES RULE: Only state venues, events, or facts that appear in SEARCH RESULTS or PLACES RESULTS below. If something is not in those results, say you couldn't find it — never invent names, ratings, or addresses."
  end

  defp do_enrich(intent, text, opts) do
    query = Keyword.get(opts, :query) || distill_query(text)
    city = Keyword.get(opts, :city)

    Logger.info(
      "world_enrichment.trigger intent=#{intent} query_len=#{String.length(query)} metrics=search_places"
    )

    search_section = maybe_search(query)
    places_section = maybe_places(query, city, text)

    %{
      search_section: search_section,
      places_section: places_section,
      meta: %{
        triggered: true,
        query: query,
        search?: not is_nil(search_section),
        places?: not is_nil(places_section)
      }
    }
  end

  defp maybe_search(query) do
    case Search.search(query, count: 5) do
      {:ok, []} ->
        "SEARCH RESULTS:\n(no hits — do not invent results)\n" <> honesty_rule()

      {:ok, results} ->
        lines =
          Enum.map(results, fn r ->
            "- #{r.title} | #{r.url} | #{String.slice(r.snippet || "", 0, 160)}"
          end)

        "SEARCH RESULTS:\n" <> Enum.join(lines, "\n") <> "\n" <> honesty_rule()

      {:disabled, reason} ->
        Logger.info("world_enrichment.search_disabled reason=#{reason}")
        nil

      {:error, reason} ->
        Logger.warning("world_enrichment.search_error=#{inspect(reason)}")
        "SEARCH RESULTS:\n(unavailable — do not invent results)\n" <> honesty_rule()
    end
  end

  defp maybe_places(query, city, text) do
    places_query =
      cond do
        is_binary(city) and city != "" -> %{"text_query" => "#{query} in #{city}"}
        true -> %{"text_query" => query, "max_result_count" => 5}
      end

    case Places.search_text(places_query) do
      {:ok, %{"candidates" => candidates}} when is_list(candidates) and candidates != [] ->
        lines =
          Enum.map(candidates, fn c ->
            name = c["name"] || c["display_name"] || "unknown"
            addr = c["address"] || c["formatted_address"] || ""
            rating = c["rating"]
            src = c["source"] || "google_places"
            "- #{name} | #{addr} | rating=#{inspect(rating)} | source=#{src}"
          end)

        "PLACES RESULTS:\n" <> Enum.join(lines, "\n") <> "\n" <> honesty_rule()

      {:ok, _} ->
        "PLACES RESULTS:\n(no venues found for this query — do not invent places)\n" <>
          honesty_rule()

      {:disabled, reason} ->
        Logger.info("world_enrichment.places_disabled reason=#{reason}")
        # Adversarial honesty path when keyed path is off: still tell model not to invent.
        if Regex.match?(@venue_re, text) do
          "PLACES RESULTS:\n(places provider not connected — do not invent venues)\n" <>
            honesty_rule()
        else
          nil
        end

      {:error, reason} ->
        Logger.warning("world_enrichment.places_error=#{inspect(reason)}")
        "PLACES RESULTS:\n(unavailable — do not invent places)\n" <> honesty_rule()
    end
  end

  defp distill_query(text) do
    text
    |> String.trim()
    |> String.slice(0, 200)
  end
end
