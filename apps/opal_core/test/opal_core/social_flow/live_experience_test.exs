defmodule OpalCore.SocialFlow.LiveExperienceTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.{Collective, LiveExperience}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp g do
    %{
      alex: Fixtures.user_alex_id(),
      jordan: Fixtures.user_jordan_id(),
      maya: Fixtures.user_maya_id(),
      chris: Fixtures.user_chris_id(),
      taylor: Fixtures.user_taylor_id(),
      conv: Fixtures.conv_group_friends_id()
    }
  end

  defp settled_plan!(ids) do
    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: ids.conv,
        created_by_user_id: ids.alex,
        options: ["Saturday at 8:00 PM"],
        idempotency_key: "sf6-plan-#{System.unique_integer([:positive])}"
      })

    opt = hd(options)

    for {uid, k} <- [
          {ids.alex, "a"},
          {ids.jordan, "j"},
          {ids.maya, "m"},
          {ids.chris, "c"}
        ] do
      Collective.respond_to_group_option(%{
        option_id: opt.id,
        user_id: uid,
        response_state: "accepted",
        idempotency_key: "sf6-acc-#{k}-#{System.unique_integer([:positive])}"
      })
    end

    {:ok, sync} = Collective.sync_group(ids.alex, ids.conv)
    plan_id = hd(sync["plans"])["id"]

    {:ok, plan} =
      Collective.get_plan_for_user(plan_id, ids.alex)

    # set location as SF5 would after selection
    plan
    |> OpalCore.SocialFlow.GroupSharedPlan.changeset(%{location: "Harbor Table"})
    |> OpalCore.Repo.update!()

    plan_id
  end

  defp open_exp!(ids) do
    plan_id = settled_plan!(ids)

    {:ok, exp, :created} =
      LiveExperience.open_experience(%{
        conversation_id: ids.conv,
        user_id: ids.alex,
        plan_id: plan_id,
        reservation_handled: true,
        transport_owner_user_id: ids.jordan,
        idempotency_key: "sf6-exp-#{System.unique_integer([:positive])}"
      })

    {exp, plan_id}
  end

  test "Journey A: day-of readiness without ranking or percent" do
    ids = g()
    {exp, _} = open_exp!(ids)

    assert {:ok, %{experience: day, readiness: ready}} =
             LiveExperience.enter_day_of(%{experience_id: exp.id, user_id: ids.alex})

    assert day.status == "day_of"
    assert day.day_of_copy =~ "8:00"
    assert day.day_of_copy =~ "reservation"
    assert ready["group_copy"] =~ "Transportation"
    assert ready["no_percent_complete"]
    assert ready["no_participant_ranking"]
    refute ready["all_ready"]

    jordan_ready = LiveExperience.readiness_summary(exp.id, ids.jordan)
    assert Enum.any?(jordan_ready["private_owner_copy"], &(&1 =~ "transportation"))

    maya_ready = LiveExperience.readiness_summary(exp.id, ids.maya)
    assert maya_ready["private_owner_copy"] == []

    transport =
      Enum.find(ready["items"], &(&1["item_type"] == "transportation"))

    assert {:ok, %{readiness: after_t}, :created} =
             LiveExperience.complete_readiness_item(%{
               item_id: transport["id"],
               user_id: ids.jordan
             })

    assert after_t["all_ready"]
    assert after_t["group_copy"] =~ "Everything needed"

    # duplicate
    assert {:ok, _, :idempotent} =
             LiveExperience.complete_readiness_item(%{
               item_id: transport["id"],
               user_id: ids.jordan
             })

    assert {:error, :not_a_member} = LiveExperience.sync_experience(ids.taylor, ids.conv)
    assert {:error, :forbidden} = LiveExperience.get_experience_for_user(exp.id, ids.taylor)
  end

  test "Journey B: late arrival requires share approval; no blame" do
    ids = g()
    {exp, _} = open_exp!(ids)

    assert {:ok, private, :private_only} =
             LiveExperience.propose_late_notice(%{
               experience_id: exp.id,
               user_id: ids.chris,
               delay_minutes: 20,
               arrival_label: "around 8:20",
               share: false
             })

    assert private.private_prompt =~ "8:20"
    assert "Share with group" in private.actions

    assert {:ok, shared, :shared} =
             LiveExperience.propose_late_notice(%{
               experience_id: exp.id,
               user_id: ids.chris,
               delay_minutes: 20,
               arrival_label: "around 8:20",
               share: true,
               idempotency_key: "late-shared-1"
             })

    assert shared.group_copy =~ "8:20"
    refute shared.group_copy =~ "unreliable"
    refute shared.group_copy =~ "holding"
    assert shared.plan_time =~ "8:00"
    assert shared.state.arrival_state == "running_late"
  end

  test "Journey C: approximate ETA share, revoke, no coordinates" do
    ids = g()
    {exp, _} = open_exp!(ids)

    assert {:ok, eta, :created} =
             LiveExperience.share_eta(%{
               experience_id: exp.id,
               user_id: ids.jordan,
               arrival_window_label: "between 7:50 and 8:00",
               visibility_scope: "group",
               precision_class: "approximate_window",
               idempotency_key: "eta-j1"
             })

    assert eta.precision_class == "approximate_window"
    assert eta.status == "active"
    public = OpalCore.SocialFlow.ETAEnvelope.to_public_contract(eta)
    assert public["no_precise_coordinates"]
    assert public["no_route"]

    assert {:ok, _} = LiveExperience.get_eta_for_user(eta.id, ids.alex)
    assert {:error, :not_a_member} = LiveExperience.get_eta_for_user(eta.id, ids.taylor)

    assert {:ok, revoked} = LiveExperience.revoke_eta(%{eta_id: eta.id, user_id: ids.jordan})
    assert revoked.status == "revoked"
    assert {:error, :expired_or_revoked} = LiveExperience.get_eta_for_user(eta.id, ids.alex)

    assert {:error, :forbidden} =
             LiveExperience.revoke_eta(%{eta_id: eta.id, user_id: ids.alex})
  end

  test "Journey D: venue unavailable does not auto-cancel; explicit replace" do
    ids = g()
    {exp, plan_id} = open_exp!(ids)
    assert exp.location_label == "Harbor Table"

    assert {:ok, cand, :created} =
             LiveExperience.report_venue_unavailable(%{
               experience_id: exp.id,
               user_id: ids.alex,
               venue_label: "Harbor Table",
               idempotency_key: "vchg-1"
             })

    assert cand.shared_copy =~ "may no longer be available"
    assert cand.status == "proposed"

    # still harbor until accepted
    {:ok, exp_same} = LiveExperience.get_experience_for_user(exp.id, ids.alex)
    assert exp_same.location_label == "Harbor Table"

    assert {:ok, %{experience: kept}} =
             LiveExperience.resolve_venue_change(%{
               change_id: cand.id,
               user_id: ids.alex,
               decision: "keep_current"
             })

    assert kept.location_label == "Harbor Table"

    # new change then accept replacement
    {:ok, cand2, _} =
      LiveExperience.report_venue_unavailable(%{
        experience_id: exp.id,
        user_id: ids.alex,
        venue_label: "Harbor Table",
        idempotency_key: "vchg-2"
      })

    assert {:ok, %{experience: updated}} =
             LiveExperience.resolve_venue_change(%{
               change_id: cand2.id,
               user_id: ids.alex,
               decision: "accept_replacement",
               replacement_location: "Green Lantern Kitchen"
             })

    assert updated.location_label == "Green Lantern Kitchen"
    {:ok, plan} = Collective.get_plan_for_user(plan_id, ids.alex)
    assert plan.location == "Green Lantern Kitchen"
  end

  test "Journey E: explicit arrival only; silence unknown; no time inference" do
    ids = g()
    {exp, _} = open_exp!(ids)

    assert {:error, :time_does_not_imply_arrival} =
             LiveExperience.infer_arrival_from_time(exp.id, DateTime.utc_now())

    assert {:ok, alex} =
             LiveExperience.set_arrival_state(%{
               experience_id: exp.id,
               user_id: ids.alex,
               arrival_state: "arrived",
               visibility: "group"
             })

    assert alex.arrival_state == "arrived"

    assert {:ok, jordan} =
             LiveExperience.set_arrival_state(%{
               experience_id: exp.id,
               user_id: ids.jordan,
               arrival_state: "on_the_way"
             })

    assert jordan.arrival_state == "on_the_way"

    {:ok, sync} = LiveExperience.sync_experience(ids.alex, ids.conv)
    snap = hd(sync["experiences"])
    maya = Enum.find(snap["participant_states"], &(&1["user_id"] == ids.maya))
    assert maya["arrival_state"] == "no_update"
    # must not claim absent
    refute inspect(snap) =~ "absent"
    assert snap["no_attendance_score"]

    assert {:error, :not_a_member} =
             LiveExperience.set_arrival_state(%{
               experience_id: exp.id,
               user_id: ids.taylor,
               arrival_state: "arrived"
             })
  end

  test "Journey F: follow-ups private then close" do
    ids = g()
    {exp, _} = open_exp!(ids)

    assert {:ok, _} =
             LiveExperience.complete_experience(%{experience_id: exp.id, user_id: ids.alex})

    assert {:ok, f1, :created} =
             LiveExperience.add_follow_up(%{
               experience_id: exp.id,
               owner_user_id: ids.alex,
               description: "reimburse Jordan for parking",
               visibility: "private",
               idempotency_key: "fu1"
             })

    assert {:ok, f2, :created} =
             LiveExperience.add_follow_up(%{
               experience_id: exp.id,
               owner_user_id: ids.alex,
               description: "send Maya the pictures",
               visibility: "private",
               idempotency_key: "fu2"
             })

    assert {:ok, %{copy: copy, private_signal: sig}} =
             LiveExperience.close_experience(%{experience_id: exp.id, user_id: ids.alex})

    assert copy =~ "follow-up"
    assert sig["copy"] =~ "2 follow-ups" or length(sig["items"]) == 2

    LiveExperience.complete_follow_up(%{follow_up_id: f1.id, user_id: ids.alex})
    LiveExperience.complete_follow_up(%{follow_up_id: f2.id, user_id: ids.alex})

    assert {:ok, %{experience: closed, copy: done}} =
             LiveExperience.close_experience(%{experience_id: exp.id, user_id: ids.alex})

    assert closed.status == "closed"
    assert done =~ "Everything from dinner is handled"

    # peer does not see private descriptions
    {:ok, sync_j} = LiveExperience.sync_experience(ids.jordan, ids.conv)
    fu_blob = Jason.encode!(hd(sync_j["experiences"])["follow_ups"])
    refute String.contains?(fu_blob, "parking")
    assert String.contains?(fu_blob, "Private follow-up")
  end
end
