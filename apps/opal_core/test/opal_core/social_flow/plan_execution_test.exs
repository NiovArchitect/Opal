defmodule OpalCore.SocialFlow.PlanExecutionTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Calls.Outcomes
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    ConversationAlignment,
    PlaceIdentity,
    PlanExecution,
    SharedPlan
  }

  test "Fort Oak place identity resolves via recorded/live path — no silent North Park invent" do
    id = PlaceIdentity.resolve("Fort Oak")
    assert id["canonical_name"] == "Fort Oak"
    assert id["area"] == "Mission Hills"
    assert id["address"] =~ "1011 Fort Stockton"
    assert is_map(id["coordinates"])
    assert is_binary(id["provider_place_id"])
    assert id["unresolved"]["address"] == false
    assert id["unresolved"]["coordinates"] == false
    assert PlaceIdentity.precise?(id)
    refute id["area"] == "North Park"

    caps = PlaceIdentity.capabilities(id)
    assert caps["directions"]["available"] == true
    assert caps["directions"]["mode"] == "precise_destination"
    assert caps["directions"]["precise"] == true
    assert caps["directions"]["live_travel_time"] == false
    assert caps["reservation_booking"]["available"] == false
    assert caps["reservation_booking"]["live"] == false
    assert caps["reservation_booking"]["reason"] == "booking_not_connected"
    assert caps["live_availability"]["available"] == false
    assert is_binary(PlaceIdentity.maps_handoff_url(id))
  end

  test "settled plan readiness is truthful — no false Reserve control" do
    {_a, _b, plan} = settled_fort_oak()

    assert {:ok, ready} = PlanExecution.readiness(plan.id)
    assert ready["settled"] == true
    assert ready["status"] == "unavailable"
    assert ready["live_booking_claimed"] == false
    assert ready["false_reservation_success"] == false
    assert ready["presentation"]["reserve_control"] == false
    assert ready["presentation"]["label"] =~ "isn't connected"
    assert ready["place_identity"]["canonical_name"] == "Fort Oak"
    assert is_binary(ready["place_identity"]["provider_place_id"])
    assert ready["place_identity"]["area"] == "Mission Hills"
    assert ready["capabilities"]["directions"]["available"] == true
    assert ready["capabilities"]["reservation_booking"]["available"] == false
    assert ready["agreed"]["exact_time"] == "8:00 PM"
    assert ready["agreed"]["place"] == "Fort Oak"
  end

  test "STALE_AUTH_EXECUTION is zero after plan version advances" do
    {a, _b, plan} = settled_fort_oak()

    assert {:ok, auth_body} =
             PlanExecution.authorize(plan.id, a.id, %{
               "allow_synthetic_booking" => true,
               "provider_place_id" => "synthetic:fort-oak",
               "explicit_confirm" => true
             })

    auth = auth_body["authorization"]
    assert auth["plan_id"] == plan.id
    assert auth["plan_version"] == auth_body["plan_version"]
    assert length(outcomes_of(plan.conversation_id, "booking_authorized")) == 1

    bump_plan_version!(plan)

    assert {:error, :stale_authorization} =
             PlanExecution.execute(plan.id, a.id, %{
               "authorization" => auth,
               "scenario" => "available"
             })

    assert Repo.aggregate(
             from(e in OpalCore.SocialFlow.ReservationExecutionRecord,
               where: e.reality_id == ^plan.conversation_id
             ),
             :count
           ) == 0
  end

  test "EXECUTION_DOUBLE_TAP_DUPLICATES is zero" do
    {a, _b, plan} = settled_fort_oak()

    assert {:ok, auth_body} =
             PlanExecution.authorize(plan.id, a.id, %{
               "allow_synthetic_booking" => true,
               "provider_place_id" => "synthetic:fort-oak-idem",
               "explicit_confirm" => true
             })

    auth = auth_body["authorization"]
    key = "plan-exec-double-#{System.unique_integer([:positive])}"

    attrs = %{
      "authorization" => auth,
      "idempotency_key" => key,
      "scenario" => "available"
    }

    assert {:ok, r1} = PlanExecution.execute(plan.id, a.id, attrs)
    assert {:ok, r2} = PlanExecution.execute(plan.id, a.id, attrs)
    assert r1["execution"]["execution_id"] == r2["execution"]["execution_id"]
    assert r2["idempotent"] == true
    assert r1["execution"]["live_claimed"] == false

    submitted = outcomes_of(plan.conversation_id, "booking_submitted")
    confirmed = outcomes_of(plan.conversation_id, "booking_confirmed")
    # One non-idempotent lineage write; replay does not duplicate
    assert length(submitted) + length(confirmed) == 1
  end

  test "PROVIDER_FAILURE_PRESERVES_PLAN and open loop remains" do
    {a, _b, plan} = settled_fort_oak()
    before = Repo.get!(SharedPlan, plan.id)

    assert {:ok, auth_body} =
             PlanExecution.authorize(plan.id, a.id, %{
               "allow_synthetic_booking" => true,
               "provider_place_id" => "rest-fail-slot",
               "explicit_confirm" => true
             })

    assert {:ok, result} =
             PlanExecution.execute(plan.id, a.id, %{
               "authorization" => auth_body["authorization"],
               "scenario" => "fail",
               "idempotency_key" => "plan-fail-#{System.unique_integer([:positive])}"
             })

    assert result["execution"]["status"] == "failed"
    assert result["execution"]["booked"] == false
    assert result["plan_preserved"] == true

    assert {:ok, recovery} = PlanExecution.recover_after_failure(plan.id, result["execution"])
    assert recovery["plan_intact"] == true
    assert recovery["open_loop"] == "reservation_not_placed"
    assert recovery["auto_changed_when"] == false

    after_plan = Repo.get!(SharedPlan, plan.id)
    assert get_in(after_plan.alignment, ["place", "value"]) == "Fort Oak"
    assert get_in(after_plan.alignment, ["exact_time", "value"]) == "8:00 PM"
    assert after_plan.alignment["plan_version"] == before.alignment["plan_version"]
    assert length(outcomes_of(plan.conversation_id, "booking_failed")) >= 1

    for row <- outcomes_of(plan.conversation_id, "booking_failed") do
      assert Outcomes.write_long_term_memory?(row) == false
    end
  end

  test "PROVIDER_CONFIRMATION through adapter boundary retains reference without live claim" do
    {a, _b, plan} = settled_fort_oak()

    assert {:ok, auth_body} =
             PlanExecution.authorize(plan.id, a.id, %{
               "allow_synthetic_booking" => true,
               "provider_place_id" => "synthetic:fort-oak-confirm",
               "explicit_confirm" => true
             })

    assert {:ok, result} =
             PlanExecution.execute(plan.id, a.id, %{
               "authorization" => auth_body["authorization"],
               "scenario" => "hold",
               "idempotency_key" => "plan-confirm-#{System.unique_integer([:positive])}"
             })

    exec = result["execution"]
    assert exec["status"] == "held"
    assert exec["live_claimed"] == false
    assert result["false_reservation_success"] == false
    assert length(outcomes_of(plan.conversation_id, "booking_submitted")) == 1

    assert {:ok, confirmed} =
             PlanExecution.confirm_via_reconcile(exec["execution_id"], force_status: "confirmed")

    final = confirmed["execution"]
    assert final["status"] == "confirmed"
    assert is_binary(final["provider_response_id"]) or is_binary(final["provider_resource_id"])
    assert final["live_claimed"] == false
    assert length(outcomes_of(plan.conversation_id, "booking_confirmed")) == 1
  end

  test "CURRENT_LOCATION_PUBLIC_LEAK remains zero in readiness projection" do
    {_a, _b, plan} = settled_fort_oak()
    assert {:ok, ready} = PlanExecution.readiness(plan.id)
    refute Map.has_key?(ready, "current_location")
    refute Map.has_key?(ready["place_identity"], "viewer_lat")
    refute get_in(ready, ["place_identity", "provenance", "viewer_location"])
  end

  # --- fixtures ---

  defp bump_plan_version!(plan) do
    alignment =
      plan.alignment
      |> Map.update("plan_version", 1, &(&1 + 1))
      |> put_in(["exact_time", "value"], "8:30 PM")

    plan
    |> SharedPlan.changeset(%{alignment: alignment, time_label: "Tuesday · 8:30 PM"})
    |> Repo.update!()
  end

  defp outcomes_of(conversation_id, type) do
    Repo.all(
      from o in CallOutcome,
        where: o.conversation_id == ^conversation_id and o.outcome_type == ^type,
        order_by: [asc: o.inserted_at]
    )
  end

  defp settled_fort_oak do
    a = user("exec-a")
    b = user("exec-b")
    conv = dyad(a, b)

    for {body, seq, sender} <- [
          {"Can you meet tomorrow?", 10, a.id},
          {"Any time after 6 works.", 11, b.id},
          {"Let's do 8:00.", 12, a.id}
        ] do
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: sender,
        client_message_id: "m-#{seq}-#{System.unique_integer([:positive])}",
        message_type: "text",
        body: body,
        server_seq: seq
      })
      |> Repo.insert!()
    end

    actions = [
      act("activity_lock", a.id, "dinner", 10, "user_stated"),
      act("place_propose", a.id, "Fort Oak", 11),
      act("place_confirm", b.id, "Fort Oak", 12, "agreed"),
      act("reservation_authorize", a.id, "Fort Oak", 13),
      act("reservation_authorize", b.id, "Fort Oak", 14, "agreed")
    ]

    state =
      ConversationAlignment.fold(
        [
          %{id: "1", body: "Can you meet tomorrow?", sender_user_id: a.id, seq: 10},
          %{id: "2", body: "Any time after 6 works.", sender_user_id: b.id, seq: 11},
          %{id: "3", body: "Let's do 8:00.", sender_user_id: a.id, seq: 12}
        ],
        [a.id, b.id],
        actions
      )

    # Force locked 8:00 PM for Track A3 settled proof (fold may leave 8:00 as candidate).
    state =
      state
      |> put_in(["exact_time"], %{
        "state" => "locked",
        "value" => "8:00 PM",
        "truth" => "locked",
        "explicit" => true,
        "schema_version" => 1
      })
      |> Map.put("commitment", state["commitment"] || "aligned")
      |> Map.put("plan_version", state["plan_version"] || 1)
      |> Map.put("participants", [a.id, b.id])

    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Fort Oak",
        status: "agreed",
        timezone: "America/Los_Angeles",
        location: "Fort Oak",
        time_label: "Tuesday · 8:00 PM",
        created_by_user_id: a.id,
        alignment: state
      })
      |> Repo.insert!()

    {a, b, plan}
  end

  defp act(kind, actor, value, seq, truth \\ "proposed") do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "seq" => seq,
      "truth" => truth,
      "explicit" => true
    }
  end

  defp user(prefix) do
    %User{}
    |> User.changeset(%{handle: "#{prefix}-#{System.unique_integer([:positive])}", display_name: prefix})
    |> Repo.insert!()
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "plan-exec-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for person <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: person.id})
      |> Repo.insert!()
    end

    conv
  end
end
