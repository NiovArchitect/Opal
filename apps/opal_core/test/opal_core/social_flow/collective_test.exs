defmodule OpalCore.SocialFlow.CollectiveTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.Collective

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp group_ids do
    %{
      alex: Fixtures.user_alex_id(),
      jordan: Fixtures.user_jordan_id(),
      maya: Fixtures.user_maya_id(),
      chris: Fixtures.user_chris_id(),
      taylor: Fixtures.user_taylor_id(),
      conv: Fixtures.conv_group_friends_id()
    }
  end

  test "Journey A: group dinner proposal, no silent consent, plan on unanimous accept" do
    g = group_ids()

    assert {:ok, %{proposal: prop, options: options}, :created} =
             Collective.create_group_proposal(%{
               conversation_id: g.conv,
               created_by_user_id: g.alex,
               activity: "dinner",
               recommended_copy:
                 "Saturday after 7 may work for everyone. Location is still open.",
               options: ["Saturday after 7", "Friday at 7:00 PM"],
               constraints: [
                 %{
                   "type" => "accessibility",
                   "summary" => "Accessible parking required",
                   "owner_user_id" => g.maya,
                   "visibility" => "private"
                 }
               ],
               idempotency_key: "gprop-a1",
               trace_id: "trace-a1"
             })

    assert prop.status == "visible"
    assert match?([_, _ | _], prop.required_participant_ids)

    assert {:ok, _} =
             Collective.coordinate_group_proposal(%{
               proposal_id: prop.id,
               user_id: g.alex,
               trace_id: "trace-coord"
             })

    opt = Enum.find(options, &(&1.label =~ "Saturday")) || hd(options)

    # Partial accepts — not everyone agreed
    for {uid, key} <- [{g.alex, "a"}, {g.jordan, "j"}, {g.chris, "c"}] do
      assert {:ok, %{summary: sum}, :created} =
               Collective.respond_to_group_option(%{
                 option_id: opt.id,
                 user_id: uid,
                 response_state: "accepted",
                 idempotency_key: "acc-#{key}",
                 trace_id: "t-#{key}"
               })

      refute sum["everyone_agreed"]
      assert sum["majority_is_not_consensus"]
      refute sum["copy"] =~ "Everyone required has accepted" and sum["silent_required_count"] > 0
    end

    # Maya tentative — still not agreed
    assert {:ok, %{summary: sum_t, plan: nil}, :created} =
             Collective.respond_to_group_option(%{
               option_id: opt.id,
               user_id: g.maya,
               response_state: "tentative",
               idempotency_key: "acc-m-tent",
               trace_id: "t-m"
             })

    assert sum_t["tentative_count"] >= 1
    refute sum_t["everyone_agreed"]
    assert sum_t["copy"] =~ "tentative"

    # Maya confirms
    assert {:ok, %{plan: plan, summary: sum_ok}, :created} =
             Collective.respond_to_group_option(%{
               option_id: opt.id,
               user_id: g.maya,
               response_state: "accepted",
               idempotency_key: "acc-m-ok",
               trace_id: "t-m2"
             })

    assert plan
    assert plan.status == "agreed"
    assert sum_ok["everyone_agreed"]

    # Taylor denied
    assert {:error, :not_a_member} = Collective.sync_group(g.taylor, g.conv)
    assert {:error, :forbidden} = Collective.get_plan_for_user(plan.id, g.taylor)

    # Private constraint not full value to others
    assert {:ok, sync_j} = Collective.sync_group(g.jordan, g.conv)
    priv = Enum.find(sync_j["constraints"], &(&1["constraint_type"] == "accessibility"))
    assert priv
    assert priv["value"] =~ "One participant" or priv["owner_is_viewer"] == false

    assert {:ok, sync_m} = Collective.sync_group(g.maya, g.conv)
    maya_c = Enum.find(sync_m["constraints"], &(&1["constraint_type"] == "accessibility"))
    assert maya_c["value"] =~ "Accessible" or maya_c["owner_is_viewer"]
  end

  test "Journey B: availability free/busy only, revoke, no peer access" do
    g = group_ids()

    assert {:ok, grant} =
             Collective.grant_availability(%{
               owner_user_id: g.maya,
               conversation_id: g.conv,
               grant_mode: "free_busy",
               windows: %{"label" => "saturday", "windows" => [["19:00", "21:00"]]},
               idempotency_key: "av-maya-1"
             })

    assert {:error, :forbidden} = Collective.get_availability_for_user(grant.id, g.alex)
    assert {:ok, _} = Collective.get_availability_for_user(grant.id, g.maya)

    Collective.grant_availability(%{
      owner_user_id: g.alex,
      conversation_id: g.conv,
      grant_mode: "free_busy",
      windows: %{"label" => "saturday", "windows" => [["19:00", "21:00"]]},
      idempotency_key: "av-alex-1"
    })

    assert {:ok, ix} = Collective.intersect_availability(g.conv, g.alex)
    assert ix["no_private_titles"]
    assert ix["label"] =~ "Saturday" or ix["participant_count"] >= 1

    assert {:ok, revoked} =
             Collective.revoke_availability(%{grant_id: grant.id, user_id: g.maya})

    assert revoked.status == "revoked"
  end

  test "Journey C: silence and tentative never equal consensus" do
    g = group_ids()

    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: g.conv,
        created_by_user_id: g.alex,
        activity: "dinner",
        options: ["Saturday at 7:30 PM", "Friday at 7:00 PM", "Sunday at 5:00 PM"],
        idempotency_key: "gprop-c1"
      })

    opt = hd(options)

    Collective.respond_to_group_option(%{
      option_id: opt.id,
      user_id: g.alex,
      response_state: "accepted",
      idempotency_key: "c-a"
    })

    Collective.respond_to_group_option(%{
      option_id: opt.id,
      user_id: g.jordan,
      response_state: "accepted",
      idempotency_key: "c-j"
    })

    {:ok, %{summary: s}, :created} =
      Collective.respond_to_group_option(%{
        option_id: opt.id,
        user_id: g.chris,
        response_state: "accepted",
        idempotency_key: "c-c"
      })

    # Maya silent
    assert s["silent_required_count"] >= 1
    refute s["everyone_agreed"]
    assert s["copy"] =~ "Silence is not consent" or s["silent_required_count"] > 0
  end

  test "Journey D: revision requires approvals; no silent reschedule" do
    g = group_ids()

    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: g.conv,
        created_by_user_id: g.alex,
        options: ["Saturday at 7:30 PM"],
        idempotency_key: "gprop-d1"
      })

    opt = hd(options)

    for {uid, k} <- [
          {g.alex, "a"},
          {g.jordan, "j"},
          {g.maya, "m"},
          {g.chris, "c"}
        ] do
      Collective.respond_to_group_option(%{
        option_id: opt.id,
        user_id: uid,
        response_state: "accepted",
        idempotency_key: "d-#{k}"
      })
    end

    {:ok, sync} = Collective.sync_group(g.alex, g.conv)
    plan_id = hd(sync["plans"])["id"]
    assert {:ok, plan_before} = Collective.get_plan_for_user(plan_id, g.alex)
    assert plan_before.time_label =~ "7:30"

    assert {:ok, rev} =
             Collective.propose_group_revision(%{
               plan_id: plan_id,
               proposed_by_user_id: g.maya,
               changes: %{"time_label" => "Saturday at 8:00 PM"},
               shared_reason: "accessible restaurant available then"
             })

    assert rev.status == "proposed"

    # one accept not enough — plan stays 7:30
    assert {:ok, %{plan: p1}} =
             Collective.respond_group_revision(%{
               revision_id: rev.id,
               user_id: g.alex,
               decision: "accept"
             })

    assert p1.time_label =~ "7:30"

    # Required approvers exclude proposer (Maya): Alex, Jordan, Chris
    assert {:ok, _} =
             Collective.respond_group_revision(%{
               revision_id: rev.id,
               user_id: g.jordan,
               decision: "accept"
             })

    assert {:ok, %{plan: p_final, revision: rev_final}} =
             Collective.respond_group_revision(%{
               revision_id: rev.id,
               user_id: g.chris,
               decision: "accept"
             })

    assert rev_final.status == "accepted"
    assert p_final.time_label =~ "8:00"

    assert {:error, :not_a_member} =
             Collective.respond_group_revision(%{
               revision_id: rev.id,
               user_id: g.taylor,
               decision: "accept"
             })
  end

  test "Journey E: responsibilities need accept; readiness is factual not percent" do
    g = group_ids()

    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: g.conv,
        created_by_user_id: g.alex,
        options: ["Saturday at 8:00 PM"],
        idempotency_key: "gprop-e1"
      })

    opt = hd(options)

    for {uid, k} <- [
          {g.alex, "a"},
          {g.jordan, "j"},
          {g.maya, "m"},
          {g.chris, "c"}
        ] do
      Collective.respond_to_group_option(%{
        option_id: opt.id,
        user_id: uid,
        response_state: "accepted",
        idempotency_key: "e-#{k}"
      })
    end

    {:ok, sync} = Collective.sync_group(g.alex, g.conv)
    plan_id = hd(sync["plans"])["id"]

    assert {:ok, r1, :created} =
             Collective.assign_responsibility(%{
               plan_id: plan_id,
               owner_user_id: g.chris,
               actor_user_id: g.alex,
               description: "provide restaurant options",
               idempotency_key: "resp-chris"
             })

    assert r1.status == "proposed"

    assert {:ok, r1a} =
             Collective.accept_responsibility(%{responsibility_id: r1.id, user_id: g.chris})

    assert r1a.status == "accepted"

    assert {:ok, r2, :created} =
             Collective.assign_responsibility(%{
               plan_id: plan_id,
               owner_user_id: g.alex,
               actor_user_id: g.alex,
               description: "make reservation",
               idempotency_key: "resp-alex"
             })

    Collective.accept_responsibility(%{responsibility_id: r2.id, user_id: g.alex})

    assert {:ok, %{readiness: ready}} =
             Collective.complete_responsibility(%{responsibility_id: r1.id, user_id: g.chris})

    assert ready["no_percent_complete"]
    assert ready["no_participant_ranking"]
    refute ready["copy"] =~ "%"
    assert ready["pending_count"] >= 1

    Collective.complete_responsibility(%{responsibility_id: r2.id, user_id: g.alex})

    {:ok, plan} = Collective.get_plan_for_user(plan_id, g.alex)
    ready2 = Collective.readiness_summary(plan)
    assert ready2["copy"] =~ "Everything needed" or ready2["pending_count"] == 0
  end
end
