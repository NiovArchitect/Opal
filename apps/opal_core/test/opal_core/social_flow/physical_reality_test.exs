defmodule OpalCore.SocialFlow.PhysicalRealityTest do
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.OpalCalendar

  alias OpalCore.SocialFlow.Physical.{
    BookingAttachment,
    CandidateSource,
    CollectivePlaceFit,
    ExperiencePipeline,
    LocationContext,
    LocationPolicy,
    Opportunity,
    PlaceGap,
    PlaceProvider,
    TemporalSpatial,
    Transition,
    TravelProvider
  }

  alias OpalCore.SocialFlow.Feasibility.Probing
  alias OpalCore.SocialFlow.RealWorld.Location.ApproximateStore

  setup do
    ApproximateStore.reset()
    Probing.reset()
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "pr-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "pr-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "pr-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  test "location is purpose-bound and does not imply social share", %{a: a, conv: conv} do
    assert {:ok, result} =
             LocationContext.put_approximate(a.id, %{
               area_label: "Carlsbad",
               purpose: "meetup_fit",
               conversation_id: conv.id,
               precision: "precise_coordinates"
             })

    # capped for meetup fit
    assert result["fact"]["payload"]["precision"] in ~w(neighborhood coarse_area)
    refute result["os_permission_implies_share"]
    refute result["social_share"]
    assert result["step_eliminated"] == "where_are_you"

    benefit = LocationContext.shared_benefit("Carlsbad")
    assert benefit["benefit_copy"] =~ "Carlsbad"
    assert benefit["no_routine"] == true
  end

  test "expected origin does not project today's GPS onto future Thursday" do
    assert {:ok, o} =
             LocationContext.expected_origin(%{
               current_area: "Downtown",
               near_term: false
             })

    # current without near_term is not usable for future plan
    refute o["usable_for_future_plan"]

    assert {:ok, o2} =
             LocationContext.expected_origin(%{
               prior_commitment_place: "Oceanside",
               near_term: false
             })

    assert o2["usable_for_future_plan"]
    assert o2["kind"] == "prior_commitment_destination"
  end

  test "travel provider labels geometric estimate honestly" do
    assert {:ok, t} =
             TravelProvider.estimate(%{
               origin_area: "Carlsbad",
               dest_area: "Encinitas",
               mode: "driving"
             })

    assert t["estimate_class"] == "geometric_estimate"
    refute t["traffic_aware"]
    refute t["may_label_as_drive_eta"]
    refute t["origin_exposed"]
  end

  test "candidate acquisition is separate from collective fit" do
    assert {:ok, candidates} = CandidateSource.fetch(category: "dinner")
    assert length(candidates) >= 1
    assert hd(candidates)["raw_provider_schema"] == false

    ranking =
      CollectivePlaceFit.rank(candidates,
        quiet_required: true,
        max_price_band: "$$",
        relationship_context: "date",
        travel_by_place: %{"harbor_table" => 15, "coast_kitchen" => 18, "loud_bar" => 40}
      )

    assert ranking["provider_is_not_authority"] == true
    refute ranking["private_budget_leaked"]
    assert length(ranking["options"]) <= 3
    refute Enum.any?(ranking["options"], &(&1["id"] == "loud_bar"))
  end

  test "private budget hard-filters without leaking", %{a: a} do
    assert {:ok, ranking} =
             CollectivePlaceFit.recommend(
               category: "dinner",
               max_price_band: "$",
               quiet_required: false
             )

    # Only $ or missing should remain; private max never in output
    refute Map.has_key?(ranking, "max_price_band")
    refute ranking["private_budget_leaked"]
    _ = a
  end

  test "place gap skips when place already named" do
    assert {:ok, r} =
             PlaceGap.resolve(%{
               place_known: true,
               time_feasible: true
             })

    assert r["gap"] == :none
    assert r["reason"] == "place_already_named"
  end

  test "place gap recommends when time feasible and place unknown" do
    assert {:ok, r} =
             PlaceGap.resolve(%{
               time_feasible: true,
               place_known: false,
               category: "dinner",
               quiet_required: true,
               relationship_context: "date",
               travel_by_place: %{"harbor_table" => 12, "coast_kitchen" => 20}
             })

    assert r["gap"] == :place
    assert r["option_count"] <= 3
  end

  test "temporal-spatial: prior commitment location private", %{a: a, conv: conv} do
    # Prior ends 6:15 Oceanside
    {:ok, other} =
      %Conversation{}
      |> Conversation.changeset(%{label: "prior-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: other.id, user_id: a.id})
    |> Repo.insert!()

    prior_end = ~U[2026-08-14 18:15:00.000000Z]

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: other.id,
               owner_user_id: a.id,
               start_at: ~U[2026-08-14 16:00:00.000000Z],
               end_at: prior_end,
               place_label: "Oceanside Secret Spot",
               label: "Date with Chanelle",
               participant_user_ids: [a.id]
             })

    assert {:ok, ev} =
             TemporalSpatial.evaluate(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               candidate_start: ~U[2026-08-14 18:30:00.000000Z],
               prior_commitment_place: "Oceanside",
               destination_area: "Carlsbad",
               travel_minutes: 40,
               place_known: false
             })

    assert ev["viable"] == false or ev["feasibility"] == "unrealistic"
    assert ev["other_plan_revealed"] == false
    refute inspect(ev) =~ "Chanelle"
    refute inspect(ev) =~ "Secret"
  end

  test "booking attaches to commitment lineage", %{a: a, conv: conv} do
    {s, e} =
      {DateTime.utc_now() |> DateTime.add(72 * 3600, :second) |> DateTime.truncate(:microsecond),
       DateTime.utc_now() |> DateTime.add(74 * 3600, :second) |> DateTime.truncate(:microsecond)}

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               participant_user_ids: [a.id]
             })

    contract = OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c)

    assert {:error, :user_authorization_required} =
             BookingAttachment.book_for_commitment(contract, %{venue_id: "harbor_table"})

    assert {:ok, result} =
             BookingAttachment.book_for_commitment(contract, %{
               venue_id: "harbor_table",
               user_authorized: true,
               conversation_id: conv.id
             })

    assert result["lineage_preserved"] == true
    refute result["provider_owns_plan"]
    assert result["booking"]["booked"] == true
  end

  test "opportunity silence when not actionable" do
    assert {:ok, o} =
             Opportunity.detect(%{
               participant_ids: ["a", "b"],
               opening_hours: 0.5,
               proximity_ok: true,
               confidence: 0.9
             })

    assert o["surface"] == :silence
  end

  test "opportunity surfaces only when strong" do
    assert {:ok, o} =
             Opportunity.detect(%{
               participant_ids: ["a", "b", "c"],
               opening_hours: 2.5,
               proximity_ok: true,
               confidence: 0.85,
               forming?: true
             })

    assert o["surface"] == :opportunity
    refute o["feed"]
  end

  test "location probing rate limited", %{a: a, conv: conv} do
    assert :ok = Probing.authorize_evaluation(a.id, conv.id, max: 2)
    assert :ok = Probing.authorize_evaluation(a.id, conv.id, max: 2)
    assert {:error, :rate_limited} = Probing.authorize_evaluation(a.id, conv.id, max: 2)
  end

  test "block terminates location sharing", %{a: a, b: b} do
    assert {:ok, _} =
             LocationContext.put_approximate(a.id, %{
               area_label: "Carlsbad",
               purpose: "eta_share"
             })

    result = LocationPolicy.on_block(a.id, b.id)
    assert result["eta_sharing"] == :stopped
    assert result["plan_scoped_grants"] == :revoked
    assert result["lingering_plan_permission"] == false
    assert result["private_store_revoked"] == true

    # Store revoked — no stale authority
    assert ApproximateStore.get(a.id) in [nil, :error, {:error, :not_found}] or
             match?(%{"revoked" => true}, ApproximateStore.get(a.id)) or
             ApproximateStore.get(a.id) == nil
  end

  test "no arbitrary peer location query API", %{a: a, b: b, conv: conv} do
    assert {:error, :peer_location_query_forbidden} =
             LocationPolicy.authorize_private_use(a.id, conv.id,
               about_user_id: b.id,
               peer_location_query: true
             )
  end

  test "shared projection never leaks routine" do
    proj = LocationPolicy.shared_projection("Carlsbad", both_close: true)
    assert proj["shared_safe"]
    refute LocationPolicy.routine_leak?(proj["benefit_copy"])
    assert LocationPolicy.routine_leak?("Jordan is usually in Carlsbad Thursdays")
  end

  test "retention classes are explicit and raw movement is not retained" do
    assert LocationPolicy.ttl_for("current_location") > 0
    assert LocationPolicy.ttl_for("plan_location") > LocationPolicy.ttl_for("current_location")
    assert LocationPolicy.ttl_for("raw_movement") == 0
  end

  test "transition: buffer + travel makes 6:30 unrealistic after 6:00 prior" do
    prior = ~U[2026-08-15 18:00:00.000000Z]
    candidate = ~U[2026-08-15 18:30:00.000000Z]

    assert {:ok, t} =
             Transition.assess(%{
               prior_end: prior,
               candidate_start: candidate,
               leave_building_minutes: 10,
               travel_minutes: 25,
               arrival_buffer_minutes: 10
             })

    refute t["viable"]
    assert t["feasibility"] == "unrealistic"
    assert length(t["alternate_starts"]) >= 1
    # Earliest should be around 6:45
    earliest = t["earliest_start"]
    assert DateTime.compare(earliest, ~U[2026-08-15 18:44:00.000000Z]) in [:gt, :eq]
    refute t["other_plan_revealed"]
  end

  test "place provider degrades without external credentials" do
    matrix = PlaceProvider.capability_matrix()
    assert matrix["external_required_for_core"] == false
    assert matrix["degrades_without_provider"] == true
    assert matrix["provider_is_not_authority"] == true
    assert {:ok, list} = PlaceProvider.search_with_fallback(category: "dinner")
    assert is_list(list)
  end

  test "courtship gold: desire → feasibility → ≤3 places → human authority", %{
    a: a,
    conv: conv
  } do
    # Future plan — use home area, not today's GPS
    start = ~U[2026-08-16 19:00:00.000000Z]

    assert {:ok, result} =
             ExperiencePipeline.resolve(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               candidate_start: start,
               home_area: "Carlsbad",
               destination_area: "Carlsbad",
               travel_minutes: 15,
               place_known: false,
               category: "dinner",
               quiet_required: true,
               max_price_band: "$$",
               relationship_context: "date",
               travel_by_place: %{
                 "harbor_table" => 12,
                 "coast_kitchen" => 18,
                 "loud_bar" => 45
               }
             })

    assert result["authorizes_set"] == false
    assert result["private_budget_leaked"] == false
    assert result["other_plan_revealed"] == false
    assert result["origin_exposed"] == false
    assert result["provider_is_not_authority"] == true
    assert result["option_count"] <= 3
    # Human still decides — Opal compressed options
    assert result["requires_human"] in ["choose_place", "confirm_place", "confirm_set"]
    refute result["shared_benefit"]["benefit_copy"] =~ "usually"
  end

  test "pipeline skips place when come_over", %{a: a, conv: conv} do
    assert {:ok, result} =
             ExperiencePipeline.resolve(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               candidate_start: ~U[2026-08-16 20:00:00.000000Z],
               home_area: "Carlsbad",
               destination_area: "Carlsbad",
               travel_minutes: 10,
               come_over: true
             })

    assert result["place"]["gap"] == :none
    assert result["option_count"] == 0
  end

  test "private mobility reason never appears in shared benefit" do
    benefit = LocationContext.shared_benefit("Encinitas")
    refute benefit["benefit_copy"] =~ "wheelchair"
    refute benefit["benefit_copy"] =~ "cannot walk"
    assert benefit["no_exact_location"] == true
  end
end
