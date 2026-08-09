defmodule OpalCore.SocialFlow.Physical.LocationContext do
  @moduledoc """
  Location as a private feasibility source — not a product feature.

  OS permission ≠ social share.
  Precision minimized by gap purpose.
  Short-lived current location; plan-scoped grants expire.
  """

  alias OpalCore.SocialFlow.RealWorld.Location.{
    ApproximateStore,
    Grant,
    Precision,
    Retention
  }

  @purposes ~w(
    meetup_fit
    travel_estimate
    eta_share
    navigation
    nearby_experience
    plan_recovery
  )

  def purposes, do: @purposes

  @doc "Record approximate private location for a purpose (capped precision)."
  def put_approximate(owner_user_id, attrs) when is_binary(owner_user_id) do
    a = stringify(attrs)
    purpose = a["purpose"] || "meetup_fit"

    if purpose not in @purposes do
      {:error, :unknown_purpose}
    else
      precision = Precision.cap_request(a["precision"] || "coarse_area", purpose_to_fit(purpose))

      with {:ok, fact} <-
             ApproximateStore.put(owner_user_id, %{
               area_label: a["area_label"],
               approx_geohash: a["approx_geohash"],
               precision: precision,
               purpose: purpose
             }),
           {:ok, grant} <-
             Grant.build(%{
               owner_user_id: owner_user_id,
               purpose: purpose_to_grant(purpose),
               conversation_id: a["conversation_id"],
               plan_id: a["plan_id"],
               precision: precision,
               valid_until: Retention.expires_at("current_approximate_location")
             }) do
        {:ok,
         %{
           "fact" => fact,
           "grant" => grant,
           "os_permission_implies_share" => false,
           "social_share" => false,
           "step_eliminated" => "where_are_you"
         }}
      end
    end
  end

  @doc "Private expected origin for a future plan (not today's GPS)."
  def expected_origin(attrs) when is_map(attrs) do
    a = stringify(attrs)

    kind =
      cond do
        a["prior_commitment_place"] -> "prior_commitment_destination"
        a["explicit_area"] -> "explicit_expected_area"
        a["home_area"] -> "home_area_preference"
        a["work_area"] -> "work_area_preference"
        # Current GPS is only a near-term origin — never project to Thursday night
        a["current_area"] -> "current_approximate"
        true -> "unknown"
      end

    area =
      a["prior_commitment_place"] || a["explicit_area"] || a["home_area"] || a["work_area"] ||
        a["current_area"]

    near_term? = a["near_term"] == true
    projects? = kind == "current_approximate" and not near_term?
    usable? = kind != "current_approximate" or near_term?

    {:ok,
     %{
       "kind" => kind,
       "area_label" => area,
       "projects_today_to_future" => projects?,
       "usable_for_future_plan" => usable?,
       "private" => true
     }}
  end

  @doc "Shared-safe benefit copy only — never coordinates or routine."
  def shared_benefit(area_label) when is_binary(area_label) do
    %{
      "shared_safe" => true,
      "benefit_copy" => "#{area_label} is easy for both of you.",
      "no_coordinates" => true,
      "no_routine" => true,
      "no_exact_location" => true
    }
  end

  def shared_benefit(_), do: %{"shared_safe" => true, "benefit_copy" => "This area works well."}

  @doc "Revoke current approximate location authority."
  def revoke(owner_user_id) when is_binary(owner_user_id) do
    ApproximateStore.revoke(owner_user_id)
    :ok
  end

  defp purpose_to_fit("meetup_fit"), do: "neighborhood_fit"
  defp purpose_to_fit("travel_estimate"), do: "travel_burden"
  defp purpose_to_fit("eta_share"), do: "eta_share"
  defp purpose_to_fit("navigation"), do: "navigation"
  defp purpose_to_fit("nearby_experience"), do: "dinner_between"
  defp purpose_to_fit(_), do: "neighborhood_fit"

  defp purpose_to_grant("eta_share"), do: "share_eta_until_arrive"
  defp purpose_to_grant("navigation"), do: "share_meeting_point"
  defp purpose_to_grant("nearby_experience"), do: "private_nearby_suggestions"
  defp purpose_to_grant(_), do: "approximate_for_plan"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
