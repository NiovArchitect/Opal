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
         :ok <- authorize(a, owner, conv),
         {:ok, spatial} <- TemporalSpatial.evaluate(spatial_attrs(a, owner, conv)) do
      transition = maybe_transition(a, spatial)
      viable? = viable?(spatial, transition)
      place = resolve_place(viable?, spatial, a)
      options = get_in(place, ["ranking", "options"]) || []
      {:ok, package_result(viable?, spatial, transition, place, options, a)}
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

  defp authorize(a, owner, conv) do
    LocationPolicy.authorize_private_use(owner, conv,
      about_user_id: a["about_user_id"] || owner,
      blocked: a["blocked"] == true,
      peer_location_query: a["peer_location_query"] == true
    )
  end

  defp spatial_attrs(a, owner, conv) do
    %{
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
    }
  end

  defp maybe_transition(a, spatial) do
    prior = a["prior_end"]
    start = a["candidate_start"]

    if is_nil(prior) or is_nil(start) do
      nil
    else
      case Transition.assess(%{
             "prior_end" => prior,
             "candidate_start" => start,
             "travel_minutes" => spatial["travel_minutes"] || a["travel_minutes"],
             "mode" => a["mode"]
           }) do
        {:ok, t} -> t
        _ -> nil
      end
    end
  end

  defp viable?(spatial, nil), do: spatial["viable"] == true

  defp viable?(spatial, transition),
    do: spatial["viable"] == true and transition["viable"] == true

  defp resolve_place(true, %{"place_is_gap" => true}, a) do
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
  end

  defp resolve_place(_viable, spatial, a) do
    %{"gap" => :none, "reason" => skip_place_reason(spatial, a)}
  end

  defp package_result(viable?, spatial, transition, place, options, a) do
    capped = Enum.take(options, 3)

    %{
      "viable" => viable?,
      "spatial" => spatial,
      "transition" => transition,
      "place" => place,
      "options" => capped,
      "option_count" => Enum.count(capped),
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
    }
  end

  defp skip_place_reason(spatial, a) do
    cond do
      a["place_known"] == true -> "place_already_named"
      a["event_named"] == true -> "event_already_named"
      a["come_over"] == true -> "come_over"
      spatial["viable"] != true -> "time_not_ready"
      true -> "not_place_gap"
    end
  end

  defp requires_human(false, _, _), do: "timing"

  defp requires_human(true, place, a) do
    count = place["option_count"] || 0

    cond do
      a["place_known"] == true -> "confirm_set"
      place["gap"] == :place and count > 1 -> "choose_place"
      place["gap"] == :place and count == 1 -> "confirm_place"
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
