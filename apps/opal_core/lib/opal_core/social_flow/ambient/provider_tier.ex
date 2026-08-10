defmodule OpalCore.SocialFlow.Ambient.ProviderTier do
  @moduledoc """
  Progressive certainty for provider/world work.

  Tiers (ascending cost):

  LOW — local deterministic (opening, zone, memory)
  MEDIUM — cached world metadata / fixtures
  HIGHER — live provider query
  TRANSACTIONAL — booking / payment / action

  Move upward only when probability of user value justifies it.

  Provider work near execution/actionability boundary.
  Weak social intent must not query reservation inventory.
  Provider truth never creates Set.
  """

  @tiers ~w(low medium higher transactional)

  def tiers, do: @tiers

  @doc """
  Decide the highest justified provider tier for current formation state.

  Returns tier + whether live provider call is allowed.
  """
  def authorize(attrs) when is_map(attrs) do
    a = stringify(attrs)
    tier = max_tier(a)

    %{
      "tier" => tier,
      "live_provider_ok" => tier in ~w(higher transactional),
      "world_acquire_ok" => tier in ~w(medium higher transactional),
      "transactional_ok" => tier == "transactional",
      "provider_queries_avoided" => tier in ~w(low medium) and a["requested_live"] == true,
      "reason" => reason_for(tier, a),
      "authorizes_set" => false,
      "provider_is_not_authority" => true,
      "private" => true
    }
  end

  def authorize(_),
    do: %{
      "tier" => "low",
      "live_provider_ok" => false,
      "world_acquire_ok" => false,
      "authorizes_set" => false
    }

  @doc "Whether a live/higher-cost provider query is justified now."
  def live_ok?(attrs), do: authorize(attrs)["live_provider_ok"] == true

  @doc "Whether any world acquisition (including fixtures) is worth running."
  def world_ok?(attrs), do: authorize(attrs)["world_acquire_ok"] == true

  defp max_tier(a) do
    cond do
      a["blocked"] == true or a["topic_changed"] == true or a["humans_already_solved"] == true ->
        "low"

      a["set"] == true and a["human_authorized_execution"] == true ->
        "transactional"

      strong_actionable?(a) and a["provider_precheck_ok"] != false ->
        if a["need_live_inventory"] == true, do: "higher", else: "medium"

      solid_opening?(a) and zone_known?(a) ->
        "medium"

      weak_intent?(a) ->
        "low"

      a["social_opening"] == true or a["opening_exists"] == true ->
        "low"

      true ->
        "low"
    end
  end

  defp strong_actionable?(a) do
    (a["actionable"] == true or a["quality_band"] in ~w(strong exceptional)) and
      a["time_compatible"] == true and
      a["participants_viable"] != false and
      (a["place_category_constrained"] == true or a["category"] not in [nil, ""]) and
      zone_known?(a) and
      a["fresh_enough"] != false
  end

  defp solid_opening?(a) do
    a["quality_band"] in ~w(solid strong exceptional) or
      (a["social_opening"] == true and a["willingness_ok"] != false and
         a["time_compatible"] == true)
  end

  defp zone_known?(a) do
    a["zone_known"] == true or a["area_label"] not in [nil, ""] or
      a["primary_area"] not in [nil, ""] or a["expected_area"] not in [nil, ""]
  end

  defp weak_intent?(a) do
    a["weak_intent"] == true or a["quality_band"] in ~w(absent thin) or
      (a["social_opening"] != true and a["opening_exists"] != true)
  end

  defp reason_for("transactional", _), do: "human_authorized_execution"
  defp reason_for("higher", _), do: "strong_actionable_live_value"

  defp reason_for("medium", a) do
    if solid_opening?(a), do: "solid_opening_cached_world", else: "formation_medium"
  end

  defp reason_for("low", a) do
    cond do
      a["humans_already_solved"] == true -> "humans_solved"
      weak_intent?(a) -> "weak_intent_no_provider"
      true -> "deterministic_only"
    end
  end

  defp reason_for(_, _), do: "low"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
