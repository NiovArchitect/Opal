defmodule OpalCore.Center.PlanningContext do
  @moduledoc """
  Accumulated Center planning draft across turns.

  Stored on `opal_conversations.planning_context`. Semantic slots are independent:
  participants / primary_person (`who`), destination, venue, when, intent, preferences.
  A newly extracted destination or venue must never overwrite an already-resolved
  participant. Explicit destination outranks current/home location for search geography.
  """

  import Ecto.Changeset
  alias OpalCore.Repo
  alias OpalCore.OpalConversations.OpalConversation

  # Tokens that are places/time/intent — never people.
  @place_stop MapSet.new(~w(
    mexico city mexico city cd mx cdmx
    san diego vista california california ca
    united kingdom uk usa us america
    restaurant restaurants dinner brunch lunch food dining
    place places destination city town area neighborhood
    saturday sunday monday tuesday wednesday thursday friday
    tonight tomorrow weekend night evening morning afternoon
    her him them us me we
    take bring go visit travel trip
    la el los las the terraza casa hotel plaza parque
  ))

  @doc "Load planning context map for a conversation (may be empty)."
  def get(%OpalConversation{planning_context: ctx}) when is_map(ctx), do: stringify(ctx)
  def get(_), do: %{}

  def get_for_user(user_id) when is_binary(user_id) do
    case Repo.get_by(OpalConversation, user_id: user_id) do
      %OpalConversation{} = c -> get(c)
      _ -> %{}
    end
  end

  @doc "Merge entities from this turn into durable planning context."
  def merge(user_id, entities, extras \\ %{}) when is_binary(user_id) and is_map(entities) do
    case Repo.get_by(OpalConversation, user_id: user_id) do
      %OpalConversation{} = c ->
        prev = get(c)
        next = merge_maps(prev, entities_to_ctx(entities), stringify(extras))

        c
        |> change(%{planning_context: next})
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, get(updated)}
          err -> err
        end

      _ ->
        {:error, :no_conversation}
    end
  end

  @doc "Replace durable planning context with an already-composed map (patch apply)."
  def put(user_id, ctx) when is_binary(user_id) and is_map(ctx) do
    case Repo.get_by(OpalConversation, user_id: user_id) do
      %OpalConversation{} = c ->
        next =
          ctx
          |> stringify()
          |> Map.put("updated_at", DateTime.utc_now() |> DateTime.to_iso8601())

        c
        |> change(%{planning_context: next})
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, get(updated)}
          err -> err
        end

      _ ->
        {:error, :no_conversation}
    end
  end

  @doc "True when we have enough to start restaurant discovery without more questions."
  def ready_for_restaurant_search?(ctx) when is_map(ctx) do
    c = stringify(ctx)
    dest = c["destination"] || c["requested_venue_locality"]
    when_s = c["when"] || c["when_resolved"]
    category = c["category"]
    exact? = c["search_mode"] == "exact_entity" and is_binary(c["requested_venue_name"]) and
               c["requested_venue_name"] != ""
    discovery_request? = c["discovery_request"] == true or c["search_mode"] == "discovery"

    # Solo is first-class: who/participants are optional.
    restaurant? =
      category in ["restaurant", "dinner", "food"] or
        c["quality_intent"] in ["top", "best", "high", "strong"] or
        c["wants_restaurant"] == true or
        exact? or
        (discovery_request? and is_binary(c["cuisine"]) and c["cuisine"] != "")

    # Exact named venue can start without a day if locality + name are present.
    # Explicit cuisine/category discovery ("find Mediterranean restaurants in X")
    # can start without a day — the ask is options, not a timed commitment yet.
    # Soft planning discovery still prefers a when when available.
    cond do
      exact? and is_binary(dest) and dest != "" and
          (is_binary(when_s) and when_s != "" or restaurant?) ->
        true

      discovery_request? and is_binary(dest) and dest != "" and restaurant? ->
        true

      is_binary(dest) and dest != "" and restaurant? and is_binary(when_s) and when_s != "" ->
        true

      true ->
        false
    end
  end

  def ready_for_restaurant_search?(_), do: false

  @doc "Resolve weekday names to next upcoming date (Temporal Truth)."
  def resolve_when(when_s, now \\ DateTime.utc_now())

  def resolve_when(when_s, %DateTime{} = now) when is_binary(when_s) do
    down = String.downcase(String.trim(when_s))

    weekday =
      cond do
        String.contains?(down, "monday") -> 1
        String.contains?(down, "tuesday") -> 2
        String.contains?(down, "wednesday") -> 3
        String.contains?(down, "thursday") -> 4
        String.contains?(down, "friday") -> 5
        String.contains?(down, "saturday") -> 6
        String.contains?(down, "sunday") -> 7
        true -> nil
      end

    cond do
      is_nil(weekday) ->
        when_s

      true ->
        today = DateTime.to_date(now)
        # Elixir Date.day_of_week: 1=Mon … 7=Sun
        current = Date.day_of_week(today)
        delta = rem(weekday - current + 7, 7)
        delta = if delta == 0, do: 7, else: delta
        target = Date.add(today, delta)
        Date.to_iso8601(target)
    end
  end

  def resolve_when(other, _), do: other

  @doc "Filter who values that are actually destinations/places/pronouns."
  def sanitize_who(who, destination \\ nil)

  def sanitize_who(nil, _), do: nil

  def sanitize_who(who, destination) when is_binary(who) do
    case sanitize_who([who], destination) do
      [n] -> n
      list when is_list(list) and list != [] -> list
      _ -> nil
    end
  end

  def sanitize_who(who, destination) when is_list(who) do
    dest_tokens = destination_tokens(destination)

    cleaned =
      who
      |> Enum.map(&normalize_who_item/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&place_like?(&1, dest_tokens))
      |> Enum.uniq_by(&String.downcase/1)

    case cleaned do
      [] -> nil
      list -> list
    end
  end

  def sanitize_who(other, destination), do: sanitize_who(normalize_who(other), destination)

  defp entities_to_ctx(entities) do
    e = atomize_or_string(entities)

    who = e[:who] || e["who"] || e[:primary_person] || e["primary_person"]
    participants = e[:participants] || e["participants"]
    when_raw = e[:when] || e["when"]
    what = e[:what] || e["what"]
    dest = e[:destination] || e["destination"]
    venue = e[:venue] || e["venue"]

    who_clean = sanitize_who(who || participants, dest)
    primary = primary_from_who(who_clean)

    %{
      "who" => who_clean,
      "primary_person" => primary,
      "participants" => who_clean,
      "when" => when_raw,
      "when_resolved" => if(is_binary(when_raw), do: resolve_when(when_raw), else: nil),
      "what" => what,
      "destination" => dest,
      "venue" => venue,
      "category" => e[:category] || e["category"],
      "quality_intent" => e[:quality_intent] || e["quality_intent"],
      "wants_restaurant" => e[:wants_restaurant] || e["wants_restaurant"],
      "plan_id" => e[:plan_id] || e["plan_id"]
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" or v == [] end)
    |> Map.new()
  end

  defp merge_maps(prev, turn, extras) do
    base = stringify(prev)
    incoming = Map.merge(turn, extras)

    # Destination/venue from this turn must not clobber who.
    dest = incoming["destination"] || base["destination"]

    incoming
    |> Enum.reduce(base, fn {k, v}, acc ->
      cond do
        is_nil(v) or v == "" or v == [] ->
          acc

        k in ["who", "primary_person", "participants"] ->
          merge_who_slot(acc, k, v, dest)

        true ->
          Map.put(acc, k, v)
      end
    end)
    |> then(fn acc ->
      # Re-sanitize who against final destination (covers dest arriving same turn).
      who = sanitize_who(acc["who"] || acc["participants"], acc["destination"])

      acc
      |> then(fn m -> if who, do: Map.put(m, "who", who), else: Map.delete(m, "who") end)
      |> then(fn m ->
        if who,
          do: Map.put(m, "participants", who) |> Map.put("primary_person", primary_from_who(who)),
          else: m
      end)
    end)
    |> Map.put("updated_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  defp merge_who_slot(acc, k, v, dest) do
    prior = acc["who"] || acc["participants"] || acc["primary_person"]
    incoming = sanitize_who(v, dest)

    cond do
      is_nil(incoming) ->
        # Reject place-like who; keep prior participants.
        acc

      who_present?(prior) and place_like_who?(incoming, dest) ->
        acc

      who_present?(prior) and not place_like_who?(incoming, dest) ->
        # Accumulate distinct people; prefer prior order.
        merged = merge_people(prior, incoming)
        put_who_slots(acc, merged)

      true ->
        put_who_slots(acc, incoming)
    end
    |> then(fn m ->
      # Keep primary_person / participants in sync when writing who.
      if k == "who", do: m, else: m
    end)
  end

  defp put_who_slots(acc, who) do
    acc
    |> Map.put("who", who)
    |> Map.put("participants", who)
    |> Map.put("primary_person", primary_from_who(who))
  end

  defp merge_people(prior, incoming) do
    (List.wrap(prior) ++ List.wrap(incoming))
    |> Enum.map(&normalize_who_item/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq_by(&String.downcase/1)
  end

  defp who_present?(who) when is_binary(who), do: String.trim(who) != ""
  defp who_present?(who) when is_list(who), do: who != []
  defp who_present?(_), do: false

  defp place_like_who?(who, dest) do
    case sanitize_who(who, dest) do
      nil -> true
      _ ->
        # If sanitize kept it, check whether the *unsanitized* set was mostly place tokens.
        tokens =
          List.wrap(who)
          |> Enum.map(&normalize_who_item/1)
          |> Enum.reject(&is_nil/1)

        tokens != [] and Enum.all?(tokens, &place_like?(&1, destination_tokens(dest)))
    end
  end

  defp place_like?(name, dest_tokens) when is_binary(name) do
    down = String.downcase(String.trim(name))
    MapSet.member?(@place_stop, down) or MapSet.member?(dest_tokens, down) or
      Enum.any?(dest_tokens, &String.contains?(&1, down)) or
      Enum.any?(dest_tokens, &String.contains?(down, &1))
  end

  defp place_like?(_, _), do: true

  defp destination_tokens(nil), do: MapSet.new()

  defp destination_tokens(dest) when is_binary(dest) do
    dest
    |> String.downcase()
    |> String.split(~r/[^a-z0-9]+/u, trim: true)
    |> MapSet.new()
  end

  defp destination_tokens(_), do: MapSet.new()

  defp primary_from_who(nil), do: nil
  defp primary_from_who(who) when is_binary(who), do: who
  defp primary_from_who([n | _]) when is_binary(n), do: n
  defp primary_from_who(_), do: nil

  defp normalize_who(nil), do: nil
  defp normalize_who(who) when is_binary(who), do: who
  defp normalize_who(who) when is_list(who), do: who
  defp normalize_who(%{name: n}) when is_binary(n), do: n
  defp normalize_who(%{"name" => n}) when is_binary(n), do: n
  defp normalize_who(other), do: other

  defp normalize_who_item(n) when is_binary(n) do
    t = String.trim(n)
    if t == "", do: nil, else: t
  end

  defp normalize_who_item(%{name: n}) when is_binary(n), do: normalize_who_item(n)
  defp normalize_who_item(%{"name" => n}) when is_binary(n), do: normalize_who_item(n)
  defp normalize_who_item(_), do: nil

  defp atomize_or_string(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {k, v}
      {k, v} when is_binary(k) -> {String.to_atom(k), v}
      {k, v} -> {k, v}
    end)
  rescue
    _ -> stringify(map)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(_), do: %{}
end
