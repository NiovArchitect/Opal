defmodule OpalCore.SocialFlow.ExperienceFork do
  @moduledoc """
  Fork a creator Social Moment into the follower's own Reality (Pass 23 add-on).

  ## Law

  CREATOR EXPERIENCE → inspiration → FOLLOWER REALITY

  Follower is recreating an **experience**, not copying a reservation.

  Moment may contribute: place, activity, vibe, product, event, route, pattern.
  Follower Reality recomposes: WHO, WHEN, availability, budget, travel,
  preferences, constraints, providers.

  Does NOT:
  - invite the creator automatically
  - clone creator logistics / reservation
  - grant friend authority via follow
  - expose creator private finances / calendar

  Additive to SocialMoment.do_with_people / MomentRealityBridge.
  """

  alias OpalCore.SocialFlow.{
    ExperienceGraph,
    FollowGraph,
    SocialMoment
  }

  @doc """
  Fork a Moment into an independent Reality for the actor.

  opts:
  - actor_user_id (required)
  - participant_user_ids (optional; default solo = [actor])
  - what / when overrides
  - follow_graph (optional) — if provided, require follow OR author
  - invite_creator (must not be true by default)
  """
  def fork_moment(moment_attrs, opts \\ %{})

  def fork_moment(moment_attrs, opts) when is_map(moment_attrs) do
    moment = SocialMoment.new(moment_attrs)
    o = stringify(opts)
    actor = o["actor_user_id"] || o["user_id"]
    creator = moment["author_user_id"]

    cond do
      blank?(actor) ->
        {:error, :actor_required}

      o["invite_creator"] == true and o["explicit_open_event"] != true ->
        {:error, :creator_not_auto_invited}

      follow_required_and_missing?(o, actor, creator) ->
        {:error, :follow_or_author_required}

      true ->
        people = resolve_people(o, actor, creator)
        do_fork(moment, actor, creator, people, o)
    end
  end

  def fork_moment(_, _), do: {:error, :invalid}

  @doc """
  Derive private reusable structure from a Moment — not product template UI.

  Returns experience pattern hints for recomposition.
  """
  def derive_experience_pattern(moment_attrs) when is_map(moment_attrs) do
    m = SocialMoment.new(moment_attrs)
    place = m["place_ref"] || %{}
    context = m["social_context"] || ""

    segments =
      context
      |> to_string()
      |> String.split(~r/[·•|,\/]/)
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))

    %{
      "kind" => "experience_pattern",
      "source_moment_id" => m["id"],
      "not_product_template_ui" => true,
      "place_hint" => place["display_name"] || place["name"],
      "place_identity" => place_identity(place),
      "vibe_tags" => segments,
      "activity_hints" => infer_activities(m, segments),
      "sequence" => infer_sequence(segments),
      "portable" => true,
      "logistics_not_cloned" => true,
      "commerce_led" => false
    }
  end

  def derive_experience_pattern(_), do: %{"kind" => "experience_pattern", "portable" => false}

  @doc "Invariant: fork never invites creator unless open event."
  def auto_invites_creator?, do: false

  @doc "Invariant: fork does not clone reservation/logistics."
  def clones_creator_logistics?, do: false

  # --- internals ---

  defp do_fork(moment, actor, creator, people, o) do
    pattern = derive_experience_pattern(moment)

    with {:ok, seed} <-
           SocialMoment.do_with_people(moment, %{
             "actor_user_id" => actor,
             "participant_user_ids" => people,
             "what" => o["what"] || infer_what(moment, pattern),
             "when" => o["when"] || "open"
           }) do
      reality_id = o["reality_id"] || "reality-fork-#{moment["id"]}-#{actor}"

      {:ok, graph} =
        ExperienceGraph.new()
        |> ExperienceGraph.link_moment_to_reality(moment["id"], reality_id, %{
          "moment" => %{"author" => creator},
          "reality" => %{"what" => seed["what"], "actor" => actor},
          "fork" => true,
          "inspiration_only" => true
        })

      # Explicit non-invitation of creator
      creator_in_circle = creator in people

      {:ok,
       %{
         "kind" => "experience_fork",
         "source_moment_id" => moment["id"],
         "creator_user_id" => creator,
         "actor_user_id" => actor,
         "reality_id" => reality_id,
         "reality_seed" =>
           seed
           |> Map.put("forked_from_moment_id", moment["id"])
           |> Map.put("inspiration_only", true)
           |> Map.put("logistics_not_cloned", true)
           |> Map.put("creator_auto_invited", false)
           |> Map.put("creator_in_circle", creator_in_circle)
           |> Map.put("solo", length(people) == 1 and hd(people) == actor)
           |> Map.put("when", seed["when"] || "open")
           |> Map.put("experience_pattern", pattern),
         "experience_pattern" => pattern,
         "experience_graph" => graph,
         "not_creator_invitation" => not creator_in_circle,
         "not_reservation_clone" => true,
         "authorizes_set" => false,
         "authorizes_booking" => false,
         "bookability" => "unknown",
         "execution" => "none",
         "is_payout" => false,
         "compound_extends_relationship_graph" => true,
         "follow_is_not_friend" => true
       }}
    end
  end

  defp resolve_people(o, actor, creator) do
    people = List.wrap(o["participant_user_ids"] || o["people"] || [])

    people =
      if people == [] do
        # Solo Personal Reality — no fake friend
        [actor]
      else
        people
      end

    people =
      if o["invite_creator"] == true and o["explicit_open_event"] == true do
        Enum.uniq([creator | people])
      else
        Enum.reject(people, &(&1 == creator and o["force_exclude_creator"] != false and actor != creator))
        |> then(fn p -> if p == [] and actor == creator, do: [actor], else: p end)
      end

    # Default: never auto-include creator when actor is a follower
    if actor != creator and o["invite_creator"] != true do
      Enum.reject(people, &(&1 == creator)) |> then(fn p -> if p == [], do: [actor], else: p end)
    else
      Enum.uniq(people)
    end
  end

  defp follow_required_and_missing?(o, actor, creator) do
    g = o["follow_graph"]

    cond do
      actor == creator -> false
      o["require_follow"] != true -> false
      not is_map(g) -> true
      true -> not FollowGraph.following?(g, actor, creator)
    end
  end

  defp infer_what(moment, pattern) do
    m = stringify(moment)
    context = m["social_context"]

    cond do
      is_binary(context) and context != "" ->
        # First segment often the primary activity
        context |> String.split(~r/[·•|,]/) |> List.first() |> String.trim() |> String.capitalize()

      is_list(pattern["activity_hints"]) and pattern["activity_hints"] != [] ->
        hd(pattern["activity_hints"])

      true ->
        "Experience"
    end
  end

  defp infer_activities(m, segments) do
    base = if segments != [], do: segments, else: []
    place = get_in(m, ["place_ref", "display_name"]) || get_in(m, ["place_ref", "name"])
    if place, do: Enum.uniq(base ++ ["place"]), else: base
  end

  defp infer_sequence(segments) when is_list(segments) and segments != [], do: segments
  defp infer_sequence(_), do: []

  defp place_identity(place) when is_map(place) do
    p = stringify(place)

    %{
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "provider" => p["provider"] || "unknown",
      "display_name" => p["display_name"] || p["name"]
    }
  end

  defp place_identity(_), do: nil

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
