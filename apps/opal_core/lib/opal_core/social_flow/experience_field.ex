defmodule OpalCore.SocialFlow.ExperienceField do
  @moduledoc """
  Internal Experience Field — discovery of Moments **without a doomscroll feed**.

  Product naming NOT locked (Feed / Discover / Moments / Trail / Pulse TBD).
  Internal name: ExperienceField.

  HOME / AttentionAuthority = what needs you **now**.
  EXPERIENCE FIELD = possibilities you may want to **enter**.

  Never merge those jobs.

  Laws (Pass 23 + Pass 29):
  - Not infinite low-value scrolling requirement
  - Not ranked by commission / economic value
  - Not ranked by raw views or posting volume alone
  - Newest is not automatically best
  - Follow edges may surface creator Moments for discovery
  - Friend Moments remain RelationshipGraph authority (caller must filter visibility)
  - Earned attention: relevance + actionability, not dark patterns
  - Viewport density: tiny visible set even when candidate pool is large

  Does not replace SocialMomentVisibility or RelationshipGraph.
  """

  alias OpalCore.SocialFlow.{AttributionGraph, FollowGraph}

  @default_visible_cap 3
  @hard_visible_cap 5

  @doc """
  Build a private discovery surface for a viewer.

  moments: list of moment maps (already filtered for basic visibility by caller/server)
  opts:
  - follow_graph
  - max_visible (default 3, max 5)
  - hour (0–23 daypart)
  - viewer_city
  - current_intent (string)
  - minutes_to_next_commitment
  - prefer_followed (default true)
  - collapse_near_duplicates (default true)
  """
  def for_viewer(viewer_user_id, moments, opts \\ %{})

  def for_viewer(viewer_user_id, moments, opts)
      when is_binary(viewer_user_id) and is_list(moments) do
    o = stringify(opts || %{})
    g = o["follow_graph"]
    following = if is_map(g), do: FollowGraph.following_ids(g, viewer_user_id), else: []
    max_vis = visible_cap(o["max_visible"])
    hour = o["hour"]
    daypart = daypart_from_hour(hour)
    viewer_city = o["viewer_city"]
    intent = o["current_intent"]
    minutes = o["minutes_to_next_commitment"]

    # Explicit invariant: commission never ranks
    _ = AttributionGraph.social_rank_uses_commission?()

    scored =
      moments
      |> Enum.map(&stringify/1)
      |> Enum.map(fn m ->
        score_card(m, %{
          viewer_user_id: viewer_user_id,
          following: following,
          daypart: daypart,
          viewer_city: viewer_city,
          intent: intent,
          minutes: minutes
        })
      end)
      |> Enum.reject(fn c -> c["suppress"] == true end)
      |> maybe_collapse_duplicates(o)
      |> Enum.sort_by(fn c -> {-c["score"], c["moment_id"] || ""} end)

    selected = Enum.take(scored, max_vis)

    %{
      "kind" => "experience_field",
      "schema" => "experience_field.v1",
      "viewer_user_id" => viewer_user_id,
      "product_name_locked" => false,
      "internal_name" => "ExperienceField",
      "job" => "possibility_discovery",
      "not_home_attention" => true,
      "not_a_feed_engine" => true,
      "not_doomscroll_required" => true,
      "not_infinite_scroll" => true,
      "discovery_uses_commission" => false,
      "discovery_uses_raw_views" => false,
      "discovery_uses_posting_volume" => false,
      "discovery_newest_wins" => false,
      "earned_attention" => true,
      "dark_pattern_addiction" => false,
      "metric_hint" => "meaningful_experiences_per_attention_minute",
      "daypart" => daypart,
      "candidate_count" => length(moments),
      "scored_count" => length(scored),
      "visible_cap" => max_vis,
      "cards" => Enum.map(selected, &public_card/1),
      "card_count" => length(selected),
      "editorial_hierarchy" => editorial_hierarchy(selected),
      "why_internal" => Enum.map(selected, & &1["why"]),
      "is_payout" => false
    }
  end

  def for_viewer(_, _, _),
    do: %{
      "cards" => [],
      "not_a_feed_engine" => true,
      "candidate_count" => 0,
      "card_count" => 0
    }

  @doc "Scale probe: rank N synthetic candidates; return timing + density metrics."
  def scale_probe(viewer_user_id, n, opts \\ %{}) when is_integer(n) and n > 0 do
    t0 = System.monotonic_time(:microsecond)
    moments = Enum.map(1..n, &synthetic_moment/1)
    field = for_viewer(viewer_user_id, moments, opts)
    t1 = System.monotonic_time(:microsecond)

    %{
      "n" => n,
      "candidate_count" => field["candidate_count"],
      "visible_count" => field["card_count"],
      "visible_cap" => field["visible_cap"],
      "latency_us" => t1 - t0,
      "latency_ms" => div(t1 - t0, 1000),
      "not_rendered_all" => field["card_count"] < n,
      "discovery_uses_commission" => false,
      "pass" =>
        field["card_count"] <= @hard_visible_cap and field["not_a_feed_engine"] == true and
          field["card_count"] <= field["visible_cap"]
    }
  end

  @doc "Why a follower uses a creator Moment instead of Googling the venue."
  def portability_value_props do
    %{
      "not_just_a_destination" => true,
      "contains" => [
        "TRUST",
        "CONTEXT",
        "PROOF_OF_EXPERIENCE",
        "VIBE",
        "RELATIONAL_RELEVANCE",
        "CURATED_POSSIBILITY",
        "ONE_TAP_REALITY",
        "INTELLIGENT_COORDINATION",
        "PROVIDER_CONTINUITY",
        "ATTRIBUTION"
      ],
      "human_framing" => "I want THAT EXPERIENCE in MY LIFE",
      "architecture_law" => "experience_inherited_logistics_recomposed",
      "not_affiliate_link" => true,
      "creator_labor" => "LIVE · CAPTURE · POST",
      "opal_labor" => "lineage · place identity · fork · recompose · attribution"
    }
  end

  def discovery_uses_commission?, do: false

  def doomscroll_required?, do: false

  def discovery_uses_raw_views?, do: false

  def discovery_uses_posting_volume?, do: false

  def discovery_newest_wins?, do: false

  def not_home_attention?, do: true

  # --- scoring ---

  defp score_card(m, ctx) do
    author = m["author_user_id"]
    followed? = author in ctx.following
    friend? = m["authority"] == "friend" or m["from_friend"] == true
    group? = m["authority"] == "group" or m["from_group"] == true
    open_event? = m["open_event"] == true or m["authority"] == "open_event"
    views = as_num(m["views"] || m["view_count"] || 0)
    posts_today = as_num(m["author_posts_today"] || 0)
    commission = as_num(m["commission_value"] || m["economic_value"] || 0)
    recency_boost = as_num(m["recency_boost"] || 0)
    city = place_city(m)
    remote_place? =
      is_binary(ctx.viewer_city) and is_binary(city) and city != "" and
        String.downcase(city) != String.downcase(ctx.viewer_city)

    caption = String.downcase("#{m["caption"]} #{m["social_context"]}")
    daypart_fit = daypart_fit(caption, ctx.daypart)
    intent_fit = intent_fit(caption, ctx.intent)
    commitment_block = commitment_blocks?(ctx.minutes, caption)

    # Hard: commission never contributes score
    score =
      0
      |> add(if(followed?, do: 40, else: 0))
      |> add(if(friend?, do: 35, else: 0))
      |> add(if(group?, do: 20, else: 0))
      |> add(if(open_event?, do: 15, else: 0))
      |> add(daypart_fit)
      |> add(intent_fit)
      |> add(if(remote_place?, do: -15, else: 10))
      |> add(if(commitment_block, do: -50, else: 0))
      # Explicitly ignore views / volume / commission / pure recency
      |> add(0 * views)
      |> add(0 * posts_today)
      |> add(0 * commission)
      |> add(min(recency_boost, 5))

    # Suppress commerce-led
    suppress = m["commerce_led"] == true or m["book_now_cta"] == true

    cta =
      cond do
        open_event? -> "I'm in"
        followed? or author == ctx.viewer_user_id -> "I want to do this"
        friend? -> "Do this with your people"
        true -> "I want to do this"
      end

    why = %{
      "followed" => followed?,
      "friend" => friend?,
      "group" => group?,
      "open_event" => open_event?,
      "daypart_fit" => daypart_fit,
      "intent_fit" => intent_fit,
      "remote_place" => remote_place?,
      "commitment_block" => commitment_block,
      "views_ignored" => views,
      "posts_today_ignored" => posts_today,
      "commission_ignored" => commission
    }

    %{
      "moment_id" => m["id"],
      "author_user_id" => author,
      "caption" => m["caption"],
      "place_label" => place_label(m),
      "place_city" => city,
      "from_followed_creator" => followed?,
      "from_friend" => friend?,
      "authority" =>
        cond do
          friend? -> "friend"
          followed? -> "following"
          group? -> "group"
          open_event? -> "open_event"
          true -> "discovery"
        end,
      "local_execution" => not remote_place?,
      "remote_experience_pattern_only" => remote_place?,
      "cta" => cta,
      "forkable" => not open_event?,
      "joinable" => open_event?,
      "not_affiliate_card" => true,
      "commerce_led" => false,
      "book_now_cta" => false,
      "earn_money_cta" => false,
      "suppress_commerce" => true,
      "score" => score,
      "why" => why,
      "suppress" => suppress,
      "dup_key" => dup_key(m)
    }
  end

  defp public_card(c) do
    Map.drop(c, ["score", "why", "suppress", "dup_key"])
    |> Map.put("not_a_feed_item", true)
  end

  defp editorial_hierarchy([]), do: %{"dominant" => nil, "secondary" => nil, "quiet" => []}

  defp editorial_hierarchy([a]), do: %{"dominant" => a["moment_id"], "secondary" => nil, "quiet" => []}

  defp editorial_hierarchy([a, b | rest]) do
    %{
      "dominant" => a["moment_id"],
      "secondary" => b["moment_id"],
      "quiet" => Enum.map(rest, & &1["moment_id"])
    }
  end

  defp maybe_collapse_duplicates(cards, o) do
    if o["collapse_near_duplicates"] == false do
      cards
    else
      cards
      |> Enum.group_by(& &1["dup_key"])
      |> Enum.map(fn {_k, group} ->
        Enum.max_by(group, & &1["score"])
      end)
    end
  end

  defp dup_key(m) do
    place = place_label(m) || ""
    cap = String.slice(String.downcase(m["caption"] || ""), 0, 24)
    "#{String.downcase(place)}|#{cap}"
  end

  defp daypart_from_hour(h) when is_integer(h) do
    cond do
      h >= 5 and h < 12 -> "morning"
      h >= 12 and h < 17 -> "afternoon"
      h >= 17 and h < 21 -> "evening"
      true -> "night"
    end
  end

  defp daypart_from_hour(_), do: nil

  defp daypart_fit(_caption, nil), do: 0

  defp daypart_fit(caption, "morning") do
    cond do
      Regex.match?(~r/coffee|breakfast|brunch|morning|walk/i, caption) -> 25
      Regex.match?(~r/jazz|club|late|concert|nightlife/i, caption) -> -30
      true -> 0
    end
  end

  defp daypart_fit(caption, "afternoon") do
    cond do
      Regex.match?(~r/museum|coffee|beach|shop|hike|lunch/i, caption) -> 20
      Regex.match?(~r/club|after midnight|3am/i, caption) -> -20
      true -> 0
    end
  end

  defp daypart_fit(caption, "evening") do
    cond do
      Regex.match?(~r/dinner|sunset|date|evening/i, caption) -> 20
      Regex.match?(~r/breakfast only/i, caption) -> -15
      true -> 0
    end
  end

  defp daypart_fit(caption, "night") do
    cond do
      Regex.match?(~r/jazz|concert|night|late|ramen/i, caption) -> 25
      Regex.match?(~r/brunch|breakfast|morning coffee/i, caption) -> -25
      true -> 0
    end
  end

  defp daypart_fit(_, _), do: 0

  defp intent_fit(_caption, nil), do: 0
  defp intent_fit(_caption, ""), do: 0

  defp intent_fit(caption, intent) when is_binary(intent) do
    i = String.downcase(intent)

    cond do
      String.contains?(caption, i) -> 30
      Regex.match?(~r/tonight/i, i) and Regex.match?(~r/dinner|night|tonight/i, caption) -> 25
      Regex.match?(~r/solo/i, i) and Regex.match?(~r/solo|alone|walk/i, caption) -> 20
      true -> 0
    end
  end

  defp intent_fit(_, _), do: 0

  defp commitment_blocks?(minutes, caption)
       when is_integer(minutes) and minutes < 45 do
    Regex.match?(~r/long dinner|all night|road trip|flight/i, caption)
  end

  defp commitment_blocks?(_, _), do: false

  defp place_label(m) do
    p = m["place_ref"] || %{}
    p = if is_map(p), do: stringify(p), else: %{}
    p["display_name"] || p["name"] || m["place_label"]
  end

  defp place_city(m) do
    p = m["place_ref"] || %{}
    p = if is_map(p), do: stringify(p), else: %{}
    p["city"] || p["area_label"] || m["city"]
  end

  defp visible_cap(nil), do: @default_visible_cap

  defp visible_cap(n) when is_integer(n) do
    n |> max(1) |> min(@hard_visible_cap)
  end

  defp visible_cap(_), do: @default_visible_cap

  defp synthetic_moment(i) do
    %{
      "id" => "m-#{i}",
      "author_user_id" => "creator-#{rem(i, 50)}",
      "caption" =>
        Enum.at(
          ["coffee morning", "dinner date", "jazz night", "museum afternoon", "solo walk"],
          rem(i, 5)
        ),
      "views" => i * 1000,
      "author_posts_today" => rem(i, 20),
      "commission_value" => rem(i, 7) * 10,
      "recency_boost" => rem(i, 100),
      "place_ref" => %{
        "display_name" => "Place #{rem(i, 30)}",
        "city" => if(rem(i, 4) == 0, do: "Tokyo", else: "San Diego")
      },
      "from_friend" => rem(i, 11) == 0
    }
  end

  defp add(a, b), do: a + b
  defp as_num(n) when is_number(n), do: n
  defp as_num(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
