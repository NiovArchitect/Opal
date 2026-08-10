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
             "min_viable" => a["min_viable"]
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
      world_exists? =
        to_i(a["world_candidate_count"] || a["candidate_count"] || 0) > 0 or
          a["world_opportunity"] == true or density["unusually_interesting"] == true

      # Social opening alone can be valuable without world candidates
      social_alone_valuable? =
        opening["exists"] and opening["viable_count"] >= (a["min_viable"] || 2) and
          a["opening_alone_ok"] != false

      world_without_social? = world_exists? and not opening["exists"]

      actionable? =
        action["deserves_attention"] == true and opening["exists"] and
          (world_exists? or social_alone_valuable?) and a["fresh_enough"] != false

      # Popular event alone must not interrupt
      must_stay_quiet? =
        world_without_social? or action["interesting_is_not_visible"] == true or
          a["trust_usable"] == false

      {:ok,
       %{
         "social_opening" => opening["exists"],
         "social_opening_detail" => opening,
         "world_opportunity" => world_exists?,
         "actionable_opportunity" => actionable? and not must_stay_quiet?,
         "social_alone_valuable" => social_alone_valuable? and not world_exists?,
         "world_without_social_quiet" => world_without_social?,
         "must_stay_quiet" => must_stay_quiet?,
         "actionability" => action,
         "density" => density,
         "layers_separated" => true,
         "authorizes_set" => false,
         "heat_map_ui" => false,
         "feed" => false
       }}
    end
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
