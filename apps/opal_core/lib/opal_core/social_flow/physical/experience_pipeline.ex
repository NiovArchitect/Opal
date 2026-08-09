defmodule OpalCore.SocialFlow.Physical.ExperiencePipeline do
  @moduledoc """
  End-to-end physical reality pipeline under frozen UX.

  intent → temporal-spatial feasibility → place gap (only if gap) →
  ≤3 collective options → human authority → optional booking attach.

  No maps page, no explore feed, no restaurant browsing chrome.
  """

  alias OpalCore.SocialFlow.Physical.{
    BookingAttachment,
    LocationContext,
    LocationPolicy,
    PlaceGap,
    PlaceProvider,
    TemporalSpatial,
    Transition
  }

  @doc """
  Resolve a plan-forming moment into the smallest useful physical result.

  Does not authorize Set. Does not book without user_authorized.
  """
  def resolve(attrs) when is_map(attrs) do
    a = stringify(attrs)
    owner = a["owner_user_id"]
    conv = a["conversation_id"]

    with true <- is_binary(owner) and is_binary(conv),
         :ok <-
           LocationPolicy.authorize_private_use(owner, conv,
             about_user_id: a["about_user_id"] || owner,
             blocked: a["blocked"] == true,
             peer_location_query: a["peer_location_query"] == true
           ),
         {:ok, spatial} <-
           TemporalSpatial.evaluate(%{
             "owner_user_id" => owner,
             "conversation_id" => conv,
             "candidate_start" => a["candidate_start"],
             "candidate_end" => a["candidate_end"],
             "prior_commitment_place" => a["prior_commitment_place"],
             "explicit_area" => a["explicit_area"],
             "home_area" => a["home_area"],
             "destination_area" => a["destination_area"] || a["area_label"],
             "travel_minutes" => a["travel_minutes"],
             "mode" => a["mode"],
             "place_known" => a["place_known"],
             "event_named" => a["event_named"],
             "come_over" => a["come_over"],
             "near_term" => a["near_term"],
             "current_area" => a["current_area"],
             "blocked" => a["blocked"]
           }) do
      transition =
        case {a["prior_end"], a["candidate_start"]} do
          {prior, start} when not is_nil(prior) and not is_nil(start) ->
            case Transition.assess(%{
                   "prior_end" => prior,
                   "candidate_start" => start,
                   "travel_minutes" => spatial["travel_minutes"] || a["travel_minutes"],
                   "mode" => a["mode"]
                 }) do
              {:ok, t} -> t
              _ -> nil
            end

          _ ->
            nil
        end

      viable? =
        spatial["viable"] == true and
          (is_nil(transition) or transition["viable"] == true)

      place =
        if viable? and spatial["place_is_gap"] do
          case PlaceGap.resolve(%{
                 "time_feasible" => true,
                 "place_known" => a["place_known"],
                 "event_named" => a["event_named"],
                 "come_over" => a["come_over"],
                 "category" => a["category"] || "dinner",
                 "quiet_required" => a["quiet_required"] == true,
                 "max_price_band" => a["max_price_band"],
                 "travel_by_place" => a["travel_by_place"] || %{},
                 "relationship_context" => a["relationship_context"] || "date",
                 "area_label" => a["destination_area"] || a["area_label"]
               }) do
            {:ok, p} -> p
            _ -> %{"gap" => :none}
          end
        else
          %{"gap" => :none, "reason" => skip_place_reason(spatial, a)}
        end

      options = get_in(place, ["ranking", "options"]) || []

      {:ok,
       %{
         "viable" => viable?,
         "spatial" => spatial,
         "transition" => transition,
         "place" => place,
         "options" => Enum.take(options, 3),
         "option_count" => min(length(options), 3),
         "shared_benefit" =>
           spatial["shared_benefit"] ||
             LocationContext.shared_benefit(a["destination_area"] || a["area_label"]),
         "private_budget_leaked" => false,
         "provider_is_not_authority" => true,
         "place_provider" => PlaceProvider.capability_matrix(),
         "authorizes_set" => false,
         "requires_human" => requires_human(viable?, place, a),
         "smallest_question" => smallest_question(viable?, place, a),
         "other_plan_revealed" => false,
         "origin_exposed" => false
       }}
    else
      {:error, _} = err -> err
      false -> {:error, :invalid}
      _ -> {:error, :invalid}
    end
  end

  def resolve(_), do: {:error, :invalid}

  @doc "Optional booking after human chose a place + authorized."
  def book_after_choice(commitment, venue_id, opts \\ []) do
    BookingAttachment.book_for_commitment(
      commitment,
      %{
        "venue_id" => venue_id,
        "user_authorized" => Keyword.get(opts, :user_authorized, false),
        "conversation_id" => Keyword.get(opts, :conversation_id),
        "category" => Keyword.get(opts, :category, "dinner")
      }
    )
  end

  defp skip_place_reason(spatial, a) do
    cond do
      a["place_known"] == true -> "place_already_named"
      a["event_named"] == true -> "event_already_named"
      a["come_over"] == true -> "come_over"
      spatial["viable"] != true -> "time_not_ready"
      not spatial["place_is_gap"] -> "not_place_gap"
      true -> "not_place_gap"
    end
  end

  defp requires_human(false, _, _), do: "timing"

  defp requires_human(true, place, a) do
    cond do
      a["place_known"] == true -> "confirm_set"
      place["gap"] == :place and (place["option_count"] || 0) > 1 -> "choose_place"
      place["gap"] == :place and (place["option_count"] || 0) == 1 -> "confirm_place"
      true -> "confirm_set"
    end
  end

  defp smallest_question(false, _, _), do: "when_works"

  defp smallest_question(true, place, a) do
    cond do
      a["place_known"] == true -> nil
      place["gap"] == :place -> "which_of_these"
      true -> nil
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
