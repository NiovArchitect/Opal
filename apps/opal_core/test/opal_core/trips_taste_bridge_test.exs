defmodule OpalCore.TripsTasteBridgeTest do
  @moduledoc """
  Phase 9B — trip-leg unanimous accept → agreed → PlanAgreementTasteBridge.

  Lawful attrs only: area from destination_label; cuisine/vibe/price from
  place_ref pack data. Never invent from place_label text.
  """

  use OpalCoreWeb.ConnCase

  import Ecto.Query

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanAgreementTasteBridge
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips
  alias OpalCore.Trips.TripLeg

  @alex "+12025550101"
  @jordan "+12025550102"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "p9b-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp create_jt_trip_with_leg(token_a, user_b, place_ref) do
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{
        "title" => "Joshua Tree weekend",
        "destination_label" => "Joshua Tree",
        "user_ids" => [user_b]
      })

    trip_id = json_response(conn, 201)["trip"]["id"]

    leg_attrs = %{
      "leg_type" => "meal",
      "place_label" => (place_ref && place_ref["name"]) || "Campfire",
      "starts_on" => "2026-11-14",
      "ends_on" => "2026-11-14"
    }

    leg_attrs =
      if is_map(place_ref),
        do: Map.put(leg_attrs, "place_ref", place_ref),
        else: leg_attrs

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs", leg_attrs)

    leg_id = json_response(conn, 201)["leg"]["id"]

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    plan_id = json_response(conn, 201)["plan"]["id"]
    {trip_id, leg_id, plan_id}
  end

  defp taste_summaries(user_id) do
    from(c in MemoryCandidate,
      where: c.owner_user_id == ^user_id,
      where: like(c.candidate_summary, ^"taste:%"),
      select: c.candidate_summary
    )
    |> Repo.all()
  end

  test "one accept → still tentative, no bridge; both accept → agreed + area", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "P9B A", "p9b_a")
    {_token_b, user_b} = activate(build_conn(), @jordan, "P9B B", "p9b_b")

    {_trip_id, _leg_id, plan_id} =
      create_jt_trip_with_leg(token_a, user_b, nil)

    assert {:ok, one} = JourneyAuthority.accept_going(plan_id, user_a)
    assert one["response_state"] == "accepted"
    assert one["plan_status"] == "tentative"

    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.status == "tentative"
    assert taste_summaries(user_a) == []
    assert taste_summaries(user_b) == []

    assert {:ok, both} = JourneyAuthority.accept_going(plan_id, user_b)
    assert both["response_state"] == "accepted"
    assert both["plan_status"] == "agreed"

    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.status == "agreed"
    assert plan.alignment["area"] == "Joshua Tree"
    refute Map.has_key?(plan.alignment, "cuisine")

    a_sums = taste_summaries(user_a)
    b_sums = taste_summaries(user_b)
    assert "taste:area:joshua tree" in a_sums
    assert "taste:area:joshua tree" in b_sums
    refute Enum.any?(a_sums, &String.starts_with?(&1, "taste:cuisine:"))
  end

  test "pack place_ref with cuisine → bridge gets cuisine + area", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "P9B Pack", "p9b_pack")
    {_token_b, user_b} = activate(build_conn(), @jordan, "P9B Pack B", "p9b_pack_b")

    place_ref = %{
      "source" => "destination_pack",
      "pack_entry_id" => "ps_birba",
      "name" => "Birba",
      "cuisine" => "italian",
      "price_band" => "$$",
      "area_label" => "Palm Springs"
    }

    # Destination still Joshua Tree for area law (trip.destination_label)
    {_trip_id, leg_id, plan_id} = create_jt_trip_with_leg(token_a, user_b, place_ref)

    leg = Repo.get!(TripLeg, leg_id)
    assert get_in(leg.place_ref, ["cuisine"]) == "italian"

    assert {:ok, _} = JourneyAuthority.accept_going(plan_id, user_a)
    assert {:ok, both} = JourneyAuthority.accept_going(plan_id, user_b)
    assert both["plan_status"] == "agreed"

    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.alignment["area"] == "Joshua Tree"
    assert plan.alignment["cuisine"] == "italian"
    assert plan.alignment["price"] == "$$"

    sums = taste_summaries(user_a)
    assert "taste:area:joshua tree" in sums
    assert "taste:cuisine:italian" in sums
    assert Enum.any?(sums, &(&1 =~ "taste:price:"))
  end

  test "manual leg (no place_ref) named Campfire → area only, no cuisine invented", %{
    conn: conn
  } do
    {token_a, user_a} = activate(conn, @alex, "P9B Manual", "p9b_man")
    {_token_b, user_b} = activate(build_conn(), @jordan, "P9B Manual B", "p9b_man_b")

    # place_label "Campfire" exists in SD catalog — must NOT invent cuisine
    {_trip_id, _leg_id, plan_id} = create_jt_trip_with_leg(token_a, user_b, nil)

    assert {:ok, _} = JourneyAuthority.accept_going(plan_id, user_a)
    assert {:ok, _} = JourneyAuthority.accept_going(plan_id, user_b)

    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.status == "agreed"
    assert plan.alignment["area"] == "Joshua Tree"
    refute Map.has_key?(plan.alignment || %{}, "cuisine")

    sums = taste_summaries(user_a)
    assert "taste:area:joshua tree" in sums
    refute Enum.any?(sums, &String.contains?(&1, "cuisine"))
  end

  test "lawful_taste_alignment never copies place_label into cuisine" do
    trip = %OpalCore.Trips.Trip{destination_label: "Palm Springs"}
    leg = %TripLeg{place_label: "Campfire", place_ref: nil}
    assert Trips.lawful_taste_alignment(trip, leg) == %{"area" => "Palm Springs"}

    leg2 = %TripLeg{
      place_label: "Campfire",
      place_ref: %{"name" => "Birba", "cuisine" => "italian", "price_band" => "$$"}
    }

    attrs = Trips.lawful_taste_alignment(trip, leg2)
    assert attrs["area"] == "Palm Springs"
    assert attrs["cuisine"] == "italian"
    assert attrs["price"] == "$$"
  end

  test "regular conversation plan agreement path unaffected (regression)", %{conn: conn} do
    # Bridge contract unchanged
    assert PlanAgreementTasteBridge.taste_dimensions() == ~w(cuisine vibe price area time_of_day)

    # Missing id → not_found (trip helper never invents agreement)
    assert {:error, :not_found} =
             Trips.agree_trip_leg_plan_if_unanimous("00000000-0000-0000-0000-000000000000")

    # Conversation-source plan: trip unanimous helper is a no-op even if all accepted
    {token_a, user_a} = activate(conn, "+12025550111", "P9B Reg A", "p9b_reg_a")
    {_token_b, user_b} = activate(build_conn(), "+12025550112", "P9B Reg B", "p9b_reg_b")

    {:ok, conv} =
      %OpalCore.Messaging.Conversation{}
      |> OpalCore.Messaging.Conversation.changeset(%{
        "label" => "p9b-reg-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        "title" => "Dinner",
        "status" => "tentative",
        "source" => "conversation",
        "conversation_id" => conv.id,
        "timezone" => "America/Los_Angeles",
        "created_by_user_id" => user_a,
        "alignment" => %{"cuisine" => "thai", "area" => "North Park"}
      })
      |> Repo.insert()

    for {uid, role} <- [{user_a, "proposer"}, {user_b, "invitee"}] do
      %OpalCore.SocialFlow.PlanParticipant{}
      |> OpalCore.SocialFlow.PlanParticipant.changeset(%{
        "plan_id" => plan.id,
        "user_id" => uid,
        "role" => role,
        "response_state" => "accepted"
      })
      |> Repo.insert!()
    end

    assert {:ok, :awaiting_others, p} = Trips.agree_trip_leg_plan_if_unanimous(plan.id)
    assert p.id == plan.id
    assert Repo.get!(SharedPlan, plan.id).status == "tentative"

    # Regular 5A path still works when after_agreed is called with agreed status
    {:ok, agreed} =
      plan
      |> SharedPlan.changeset(%{"status" => "agreed"})
      |> Repo.update()

    agreed = Repo.preload(agreed, :participants)
    summary = PlanAgreementTasteBridge.after_agreed(agreed)
    assert summary.submitted >= 1

    sums = taste_summaries(user_a)
    assert "taste:cuisine:thai" in sums
    assert "taste:area:north park" in sums

    _ = token_a
  end
end
