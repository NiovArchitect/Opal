defmodule OpalCore.SocialFlow.Ambient.OpportunityLayers do
  @moduledoc """
  Separate layers — do not collapse:

  SOCIAL OPENING — these people realistically have room to do something
  WORLD OPPORTUNITY — something exists that could be worth doing
  ACTIONABLE OPPORTUNITY — intersection strong enough to deserve attention

  None of these are Set authority.
  """

  alias OpalCore.SocialFlow.Ambient.{
    Actionability,
    OpeningQuality,
    OpportunityDensity,
    SocialOpening,
    TrustFact
  }

  @doc """
  Classify the three layers from composed signals.
  """
  def classify(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, opening} <-
           SocialOpening.detect(%{
             "participant_ids" => a["participant_ids"],
             "viable_participant_ids" => a["viable_participant_ids"] || a["in_ids"],
             "required_ids" => a["required_ids"],
             "opening_hours" => a["opening_hours"],
             "time_compatible" => a["time_compatible"],
             "willingness_ok" => a["willingness_ok"],
             "proximity_ok" => a["proximity_ok"],
             "travel_burden_low" => a["travel_burden_low"],
             "proximity_optional" => a["proximity_optional"],
             "world_opportunity" => a["world_candidate_count"] not in [nil, 0],
             "min_viable" => a["min_viable"],
             "relationship_context" => a["relationship_context"],
             "native_commitments_known" => a["native_commitments_known"],
             "near_term" => a["near_term"],
             "fresh_enough" => a["fresh_enough"],
             "human_asked" => a["human_asked"]
           }),
         {:ok, density} <- OpportunityDensity.score(a),
         {:ok, action} <-
           Actionability.classify(
             Map.merge(a, %{
               "people_resolved" => opening["exists"],
               "viable_participant_ids" => a["viable_participant_ids"] || a["in_ids"],
               "time_resolved" => opening["time_ok"],
               "travel_ok" => opening["proximity_ok"] or a["travel_ok"] == true
             })
           ) do
      world_exists? = world_exists?(a, density)
      quality = resolve_quality(a, opening)
      quality_ok? = quality_allows_surface?(opening, quality, a)
      flags = layer_flags(a, opening, action, world_exists?, quality_ok?)

      {:ok,
       %{
         "social_opening" => opening["exists"],
         "social_opening_detail" => opening,
         "opening_quality" => quality,
         "opening_quality_band" => quality["band"] || opening["quality_band"],
         "world_opportunity" => world_exists?,
         "actionable_opportunity" => flags.actionable?,
         "social_alone_valuable" => flags.social_alone_valuable?,
         "world_without_social_quiet" => flags.world_without_social?,
         "must_stay_quiet" => flags.must_stay_quiet?,
         "thin_opening_quiet" => flags.thin_opening_quiet?,
         "actionability" => action,
         "density" => density,
         "layers_separated" => true,
         "authorizes_set" => false,
         "heat_map_ui" => false,
         "feed" => false
       }}
    end
  end

  defp world_exists?(a, density) do
    to_i(a["world_candidate_count"] || a["candidate_count"] || 0) > 0 or
      a["world_opportunity"] == true or density["unusually_interesting"] == true
  end

  defp resolve_quality(a, opening) do
    case opening["quality"] do
      %{} = q when map_size(q) > 0 ->
        q

      _ ->
        case OpeningQuality.assess(Map.merge(a, opening)) do
          {:ok, q} -> q
          _ -> %{"band" => "absent", "proactive_surface_ok" => false}
        end
    end
  end

  defp quality_allows_surface?(opening, quality, a) do
    opening["proactive_surface_ok"] == true or quality["proactive_surface_ok"] == true or
      a["human_asked"] == true
  end

  defp layer_flags(a, opening, action, world_exists?, quality_ok?) do
    social_alone =
      opening["exists"] and opening["viable_count"] >= (a["min_viable"] || 2) and
        a["opening_alone_ok"] != false and quality_ok?

    world_without_social? = world_exists? and not opening["exists"]

    actionable? =
      action["deserves_attention"] == true and opening["exists"] and quality_ok? and
        (world_exists? or social_alone) and a["fresh_enough"] != false

    thin_quiet? =
      opening["exists"] and not quality_ok? and a["human_asked"] != true

    must_stay_quiet? =
      world_without_social? or action["interesting_is_not_visible"] == true or
        a["trust_usable"] == false or thin_quiet?

    %{
      social_alone_valuable?: social_alone and not world_exists?,
      world_without_social?: world_without_social?,
      actionable?: actionable? and not must_stay_quiet?,
      must_stay_quiet?: must_stay_quiet?,
      thin_opening_quiet?: thin_quiet?
    }
  end

  def classify(_), do: {:ok, %{"must_stay_quiet" => true, "actionable_opportunity" => false}}

  @doc "Trust gate for proactive surface."
  def trust_allows_surface?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    case TrustFact.evaluate(%{
           "source_class" => a["primary_source"] || "conversation_evidence",
           "observed_at" => a["observed_at"] || DateTime.utc_now(),
           "active_plan_id" => a["active_plan_id"],
           "plan_id" => a["plan_id"],
           "superseded" => a["superseded"] == true
         }) do
      {:ok, t} -> t["may_influence"] == true
      _ -> false
    end
  end

  def trust_allows_surface?(_), do: false

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
