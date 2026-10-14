defmodule OpalCore.Center.ActionOrchestrator do
  @moduledoc """
  After intent classification: accumulate PlanningContext and start provider
  jobs when enough is known. Future-tense work copy requires a job id.
  """

  import Ecto.Query

  alias OpalCore.Center.{PlanningContext, ProviderAction, ProviderActionJob}
  alias OpalCore.OpalConversations
  alias OpalCore.Repo

  @destination_re ~r/\b(?:in|to|at)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\b/
  @restaurant_re ~r/\b(restaurant|dinner|brunch|lunch|food|eat|dining|top\s+restaurant|best\s+restaurant|great\s+restaurant)\b/i
  @quality_re ~r/\b(top|best|finest|nicest|highest[- ]end|great)\b/i
  @mexico_city_re ~r/\bmexico\s*city\b/i
  @take_her_to_re ~r/\b(?:take|bring)\s+(?:her|him|them)\s+to\s+(.+)$/i
  @with_person_re ~r/\b(?:with|for)\s+([A-Z][a-zA-Z']+)(?:\s+and\s+([A-Z][a-zA-Z']+))?/
  @select_option_re ~r/\b(?:let'?s\s+go\s+with|go\s+with|pick|choose)\s+(.+?)(?:\s*\(|\.|$)/i

  @doc """
  Enrich intent entities from raw text + prior planning context, merge durable
  context, and optionally start a places search job.

  Returns `{intent, response_override | nil, action_meta}`.
  `action_meta` may include action_job_id for message metadata / promise guard.
  """
  def after_classify(user_id, raw_text, intent, ctx)
      when is_binary(user_id) and is_binary(raw_text) do
    intent = intent || %{intent: :chat, confidence: :low, entities: %{}}
    entities = Map.get(intent, :entities) || Map.get(intent, "entities") || %{}
    from_text = extract_from_text(raw_text)
    enriched = enrich_entities(raw_text, entities, ctx, from_text)

    # Drop place-like who from classifier before durable merge (P0 slot isolation).
    dest_hint = from_text["destination"] || enriched[:destination] || enriched["destination"]

    enriched =
      enriched
      |> Map.update(:who, nil, &PlanningContext.sanitize_who(&1, dest_hint))
      |> Map.reject(fn {_k, v} -> is_nil(v) or v == "" or v == [] end)

    case PlanningContext.merge(user_id, enriched, from_text) do
      {:ok, planning} ->
        intent = put_entities(intent, Map.merge(atomize(enriched), string_to_atom_map(planning)))

        case maybe_attach_selection(user_id, raw_text, intent, planning) do
          {:attached, intent2, override, meta} ->
            {intent2, override, meta}

          :no_selection ->
            maybe_start_search(user_id, intent, planning)
        end

      {:error, _} ->
        {intent, nil, %{}}
    end
  end

  def after_classify(_, _, intent, _), do: {intent, nil, %{}}

  defp maybe_attach_selection(user_id, raw_text, intent, planning) do
    case Regex.run(@select_option_re, raw_text) do
      [_, raw_name] ->
        name =
          raw_name
          |> String.trim()
          |> String.trim_trailing(".")
          |> String.replace(~r/\s*\(.*$/, "")
          |> String.trim()

        venue = resolve_selected_venue(user_id, name, planning)

        case ProviderAction.attach_selected_venue(user_id, venue, planning) do
          {:ok, result} ->
            dest = planning["destination"] || "there"
            who = format_who(planning["who"] || planning["primary_person"])

            override =
              "Locked in #{result.venue} in #{dest}#{who}. " <>
                "Same plan — Graph and Chat stay aligned."

            meta = %{
              "action_state" => "option_selected",
              "plan_id" => result.plan_id,
              "venue" => result.venue,
              "planning_context" => result.planning,
              "graph_projection" => result.graph_projection,
              "chat_projection" => result.chat_projection,
              "center_projection" => result.center_projection,
              "option_selected" => true
            }

            intent2 =
              put_entities(
                intent,
                Map.merge(Map.get(intent, :entities) || %{}, %{
                  plan_id: result.plan_id,
                  venue: result.venue,
                  who: planning["who"],
                  destination: planning["destination"]
                })
              )

            {:attached, intent2, override, meta}

          {:error, _} ->
            :no_selection
        end

      _ ->
        :no_selection
    end
  end

  defp resolve_selected_venue(user_id, name, planning) do
    # Prefer candidate snapshot from the latest results_ready job for this destination.
    dest = planning["destination"]

    job =
      if is_binary(dest) do
        from(j in ProviderActionJob,
          where:
            j.user_id == ^user_id and j.search_geography == ^dest and
              j.status == "results_ready",
          order_by: [desc: j.inserted_at],
          limit: 1
        )
        |> Repo.one()
      end

    cands = ((job && job.result) || %{})["candidates"] || []

    Enum.find(cands, fn c ->
      is_binary(c["name"]) and String.downcase(c["name"]) == String.downcase(name)
    end) ||
      Enum.find(cands, fn c ->
        is_binary(c["name"]) and
          String.contains?(String.downcase(c["name"]), String.downcase(name))
      end) ||
      %{"name" => name, "provider" => "geoapify", "search_geography" => dest}
  end

  defp maybe_start_search(user_id, intent, planning) do
    cond do
      PlanningContext.ready_for_restaurant_search?(planning) and
          not already_running?(user_id, planning["destination"]) ->
        conversation_id =
          case OpalConversations.get_or_create_conversation(user_id) do
            {:ok, c} -> c.id
            _ -> nil
          end

        # Stable plan id before the provider job (PLAN_ID_STABLE).
        {planning, plan_id} =
          case ProviderAction.ensure_plan(user_id, planning) do
            {:ok, pid, p2} ->
              _ = PlanningContext.merge(user_id, %{"plan_id" => pid}, %{})
              {p2, pid}

            _ ->
              {planning, planning["plan_id"]}
          end

        case ProviderAction.start_places_search(%{
               user_id: user_id,
               conversation_id: conversation_id,
               destination: planning["destination"],
               planning_snapshot: planning,
               plan_id: plan_id,
               quality_intent: planning["quality_intent"]
             }) do
          {:ok, job} ->
            who = format_who(planning["who"] || planning["primary_person"])
            when_s = planning["when"] || "Saturday"
            dest = planning["destination"]

            # Honest working copy — no invented "top" ranking claim.
            override =
              "Got it — #{when_s} night in #{dest}#{who}. " <>
                "Checking dinner options in #{dest} now."

            meta = %{
              "action_job_id" => job.id,
              "action_state" => "queued",
              "search_geography" => job.search_geography,
              "provider" => "geoapify",
              "plan_id" => plan_id,
              "planning_context" => Map.put(planning, "plan_id", plan_id),
              "promise_guard" => true
            }

            {intent, override, meta}

          {:error, _} ->
            {intent, nil, %{"planning_context" => planning, "plan_id" => plan_id}}
        end

      true ->
        {intent, nil, %{"planning_context" => planning}}
    end
  end

  defp already_running?(user_id, dest) when is_binary(dest) do
    cutoff = DateTime.utc_now() |> DateTime.add(-30 * 60, :second)

    from(j in ProviderActionJob,
      where:
        j.user_id == ^user_id and j.search_geography == ^dest and
          j.status in ^["queued", "running", "results_ready"] and
          j.inserted_at > ^cutoff,
      select: j.id,
      limit: 1
    )
    |> Repo.one()
    |> is_binary()
  rescue
    _ -> false
  end

  defp already_running?(_, _), do: false

  defp enrich_entities(_raw, entities, _ctx, from_text) do
    base = atomize(entities)

    Map.merge(base, string_to_atom_map(from_text), fn
      :who, v1, v2 ->
        # Prefer explicit person from text; never let empty wipe prior turn's who here
        # (durable merge preserves prior). Prefer non-place values.
        cond do
          is_nil(v2) or v2 == "" or v2 == [] -> v1
          is_nil(v1) or v1 == "" or v1 == [] -> v2
          true -> v1
        end

      _k, v1, v2 ->
        if is_nil(v1) or v1 == "" or v1 == [], do: v2, else: v1
    end)
  end

  defp extract_from_text(raw) when is_binary(raw) do
    dest =
      cond do
        Regex.match?(@mexico_city_re, raw) ->
          "Mexico City"

        Regex.run(@take_her_to_re, raw) ->
          case Regex.run(@take_her_to_re, raw) do
            [_, place] ->
              place = String.trim(place) |> String.trim_trailing(".")
              # "take her to Mexico City this Saturday" → strip trailing time clause
              place
              |> String.replace(~r/\s+(this|next|coming|on|at)\s+.+$/i, "")
              |> String.trim()

            _ ->
              nil
          end

        Regex.run(@destination_re, raw) ->
          case Regex.run(@destination_re, raw) do
            [_, place] ->
              place = String.trim(place)

              if place =~ ~r/^(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)$/i do
                nil
              else
                place
              end

            _ ->
              nil
          end

        true ->
          nil
      end

    # Never mine "who" from venue-selection utterances ("Let's go with La Terraza…").
    who =
      if Regex.match?(@select_option_re, raw) do
        nil
      else
        case Regex.run(@with_person_re, raw) do
          [_, a, b] when is_binary(b) and b != "" ->
            PlanningContext.sanitize_who([a, b], dest)

          [_, a] ->
            PlanningContext.sanitize_who(a, dest)

          _ ->
            nil
        end
      end

    restaurant? = Regex.match?(@restaurant_re, raw)
    # quality_intent is preference signal only — never implies provider rankings.
    quality = if Regex.match?(@quality_re, raw), do: "strong", else: nil

    when_s =
      cond do
        Regex.match?(~r/\bthis\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bcoming\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bnext\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bsaturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bsunday\b/i, raw) -> "Sunday"
        Regex.match?(~r/\bfriday\b/i, raw) -> "Friday"
        true -> nil
      end

    %{}
    |> then(fn m -> if dest, do: Map.put(m, "destination", dest), else: m end)
    |> then(fn m -> if who, do: Map.put(m, "who", who), else: m end)
    |> then(fn m ->
      if restaurant?,
        do: Map.merge(m, %{"category" => "restaurant", "wants_restaurant" => true}),
        else: m
    end)
    |> then(fn m -> if quality, do: Map.put(m, "quality_intent", quality), else: m end)
    |> then(fn m -> if when_s, do: Map.put(m, "when", when_s), else: m end)
  end

  defp put_entities(%{entities: _} = intent, ents), do: %{intent | entities: ents}
  defp put_entities(intent, ents) when is_map(intent), do: Map.put(intent, :entities, ents)
  defp put_entities(intent, _), do: intent

  defp format_who(nil), do: ""
  defp format_who(who) when is_binary(who), do: " with #{who}"
  defp format_who([n | _]) when is_binary(n), do: " with #{n}"
  defp format_who(_), do: ""

  defp atomize(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {k, v}
      {k, v} when is_binary(k) -> {String.to_existing_atom(k), v}
      {k, v} -> {k, v}
    end)
  rescue
    _ ->
      Map.new(map, fn
        {k, v} when is_atom(k) -> {k, v}
        {"who", v} -> {:who, v}
        {"when", v} -> {:when, v}
        {"what", v} -> {:what, v}
        {"destination", v} -> {:destination, v}
        {"category", v} -> {:category, v}
        {"quality_intent", v} -> {:quality_intent, v}
        {"wants_restaurant", v} -> {:wants_restaurant, v}
        {"plan_id", v} -> {:plan_id, v}
        {k, v} -> {k, v}
      end)
  end

  defp string_to_atom_map(map) when is_map(map) do
    Map.new(map, fn
      {"who", v} -> {:who, v}
      {"primary_person", v} -> {:primary_person, v}
      {"participants", v} -> {:participants, v}
      {"when", v} -> {:when, v}
      {"when_resolved", v} -> {:when_resolved, v}
      {"what", v} -> {:what, v}
      {"destination", v} -> {:destination, v}
      {"venue", v} -> {:venue, v}
      {"category", v} -> {:category, v}
      {"quality_intent", v} -> {:quality_intent, v}
      {"wants_restaurant", v} -> {:wants_restaurant, v}
      {"plan_id", v} -> {:plan_id, v}
      {k, v} when is_atom(k) -> {k, v}
      {_, v} -> {nil, v}
    end)
    |> Map.delete(nil)
  end
end
