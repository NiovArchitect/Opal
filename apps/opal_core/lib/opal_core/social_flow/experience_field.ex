defmodule OpalCore.SocialFlow.ExperienceField do
  @moduledoc """
  Internal Experience Field — discovery of Moments without a doomscroll feed (Pass 23 add-on).

  Product naming NOT locked (Feed / Discover / Moments / Trail / Pulse TBD).
  Internal name: ExperienceField.

  Laws:
  - Not infinite low-value scrolling requirement
  - Not ranked by commission / economic value
  - Follow edges may surface creator Moments for discovery
  - Friend Moments remain RelationshipGraph authority
  - Earned attention: relevance + actionability, not dark patterns

  Does not replace SocialMomentVisibility or RelationshipGraph.
  """

  alias OpalCore.SocialFlow.{AttributionGraph, FollowGraph}

  @doc """
  Build a private discovery surface for a viewer.

  moments: list of moment maps (already filtered for basic visibility by caller/server)
  follow_graph: optional FollowGraph for creator discovery bias
  """
  def for_viewer(viewer_user_id, moments, opts \\ %{})

  def for_viewer(viewer_user_id, moments, opts)
      when is_binary(viewer_user_id) and is_list(moments) do
    o = stringify(opts || %{})
    g = o["follow_graph"]
    following = if is_map(g), do: FollowGraph.following_ids(g, viewer_user_id), else: []

    cards =
      moments
      |> Enum.map(&stringify/1)
      |> Enum.map(fn m ->
        author = m["author_user_id"]
        followed? = author in following

        %{
          "moment_id" => m["id"],
          "author_user_id" => author,
          "caption" => m["caption"],
          "place_label" => place_label(m),
          "from_followed_creator" => followed?,
          "cta" => if(followed? or author == viewer_user_id, do: "I want that experience", else: "Do this with your people"),
          "forkable" => true,
          "not_affiliate_card" => true,
          "commerce_led" => false,
          "book_now_cta" => false,
          "earn_money_cta" => false,
          "suppress_commerce" => true
        }
      end)
      # Never rank by commission
      |> Enum.reject(fn _ -> AttributionGraph.social_rank_uses_commission?() end)
      |> maybe_prefer_followed(following, o)

    %{
      "kind" => "experience_field",
      "schema" => "experience_field.v1",
      "viewer_user_id" => viewer_user_id,
      "product_name_locked" => false,
      "internal_name" => "ExperienceField",
      "not_a_feed_engine" => true,
      "not_doomscroll_required" => true,
      "discovery_uses_commission" => false,
      "earned_attention" => true,
      "dark_pattern_addiction" => false,
      "metric_hint" => "meaningful_experiences_per_attention_minute",
      "cards" => cards,
      "card_count" => length(cards),
      "is_payout" => false
    }
  end

  def for_viewer(_, _, _), do: %{"cards" => [], "not_a_feed_engine" => true}

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
      "not_affiliate_link" => true,
      "creator_labor" => "LIVE · CAPTURE · POST",
      "opal_labor" => "lineage · place identity · fork · recompose · attribution"
    }
  end

  def discovery_uses_commission?, do: false

  def doomscroll_required?, do: false

  defp maybe_prefer_followed(cards, following, o) do
    if o["prefer_followed"] == false or following == [] do
      cards
    else
      {followed, rest} = Enum.split_with(cards, &(&1["from_followed_creator"] == true))
      followed ++ rest
    end
  end

  defp place_label(m) do
    p = m["place_ref"] || %{}
    p = if is_map(p), do: stringify(p), else: %{}
    p["display_name"] || p["name"]
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
