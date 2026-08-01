defmodule OpalCore.SocialFlow.DiscoveryTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.{Collective, Discovery, SyntheticProviders}

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

  defp agreed_plan!(g) do
    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: g.conv,
        created_by_user_id: g.alex,
        options: ["Saturday at 8:00 PM"],
        idempotency_key: "sf5-plan-#{System.unique_integer([:positive])}"
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
        idempotency_key: "sf5-acc-#{k}-#{System.unique_integer([:positive])}"
      })
    end

    {:ok, sync} = Collective.sync_group(g.alex, g.conv)
    plan_id = hd(sync["plans"])["id"]
    {:ok, plan} = Collective.get_plan_for_user(plan_id, g.alex)
    plan
  end

  test "Journey A: restaurant resolution with intent gate and three options" do
    g = group_ids()
    plan = agreed_plan!(g)
    assert is_nil(plan.location) or plan.location == ""

    # No intent → no discovery
    assert {:error, :intent_required} = Discovery.deny_without_intent(g.conv, g.alex)

    assert {:ok, intent, :created} =
             Discovery.create_intent(%{
               conversation_id: g.conv,
               owner_user_id: g.alex,
               plan_id: plan.id,
               objective_type: "restaurant",
               source: "explicit_request",
               idempotency_key: "intent-a1"
             })

    assert {:ok, %{options: options, option_set: set, no_match: false}, :created} =
             Discovery.run_discovery(%{
               conversation_id: g.conv,
               user_id: g.alex,
               intent_id: intent.id,
               plan_id: plan.id,
               request_type: "restaurant",
               agreed_time_window: "Saturday at 8:00 PM",
               option_limit: 3,
               include_sponsored: false,
               hard_constraints: %{
                 "require_accessible_parking" => true,
                 "require_vegetarian" => true,
                 "max_price_band" => "$$$"
               },
               geographic_envelope: %{"scope" => "neighborhood", "label" => "midtown"},
               idempotency_key: "dreq-a1"
             })

    assert length(options) == 3
    assert Enum.all?(options, &(&1.hard_constraint_pass == true))
    assert Enum.all?(options, &(&1.sponsorship_state == "organic"))
    assert Enum.all?(options, &(&1.availability_state in ~w(available limited unknown)))
    refute Enum.any?(options, &(&1.explanation =~ "Jordan"))
    refute Enum.any?(options, &String.contains?(&1.explanation || "", "$45"))

    # Taylor denied
    assert {:error, :not_a_member} = Discovery.sync_discovery(g.taylor, g.conv)
    assert {:error, :forbidden} = Discovery.get_option_set_for_user(set.id, g.taylor)

    harbor = Enum.find(options, &(&1.display_name == "Harbor Table")) || hd(options)

    assert {:ok, %{selection: sel}, :created} =
             Discovery.propose_selection(%{
               option_set_id: set.id,
               candidate_id: harbor.id,
               user_id: g.alex,
               idempotency_key: "sel-a1"
             })

    assert sel.selection_state == "awaiting_approvals"

    for uid <- [g.jordan, g.maya, g.chris] do
      assert {:ok, _} =
               Discovery.respond_selection(%{
                 selection_id: sel.id,
                 user_id: uid,
                 decision: "accept"
               })
    end

    {:ok, plan_after} = Collective.get_plan_for_user(plan.id, g.alex)
    assert plan_after.location == harbor.display_name

    {:ok, sync} = Discovery.sync_discovery(g.alex, g.conv)
    assert sync["options"] != []
  end

  test "Journey B: sponsored integrity and hide sponsored" do
    g = group_ids()
    plan = agreed_plan!(g)

    {:ok, intent, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.alex,
        plan_id: plan.id,
        objective_type: "restaurant",
        source: "explicit_request",
        idempotency_key: "intent-b1"
      })

    {:ok, %{options: options}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.alex,
        intent_id: intent.id,
        plan_id: plan.id,
        request_type: "restaurant",
        include_sponsored: true,
        hide_sponsored: false,
        hard_constraints: %{
          "require_accessible_parking" => true,
          "require_vegetarian" => true,
          "max_price_band" => "$$$"
        },
        idempotency_key: "dreq-b1"
      })

    sponsored = Enum.filter(options, &(&1.sponsorship_state == "sponsored"))
    organic = Enum.filter(options, &(&1.sponsorship_state == "organic"))

    # Ineligible sponsored (no parking) must not appear as option
    refute Enum.any?(options, &(&1.display_name =~ "Paid Stairs"))

    # If sponsored appears, it must be labeled
    for s <- sponsored do
      assert s.sponsorship_state == "sponsored"
      assert s.sponsor_label == "Sponsored"
    end

    # Organic choices remain present when hide is false
    assert organic != []

    # Hide sponsored still returns core discovery
    {:ok, intent2, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.alex,
        plan_id: plan.id,
        objective_type: "restaurant",
        source: "capability_enablement",
        idempotency_key: "intent-b2"
      })

    {:ok, %{options: hidden_opts}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.alex,
        intent_id: intent2.id,
        plan_id: plan.id,
        include_sponsored: true,
        hide_sponsored: true,
        hard_constraints: %{
          "require_accessible_parking" => true,
          "require_vegetarian" => true,
          "max_price_band" => "$$$"
        },
        idempotency_key: "dreq-b2"
      })

    assert Enum.all?(hidden_opts, &(&1.sponsorship_state == "organic"))
    assert hidden_opts != []
  end

  test "Journey C: private budget matching without leakage" do
    g = group_ids()
    plan = agreed_plan!(g)

    {:ok, intent, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.jordan,
        plan_id: plan.id,
        objective_type: "restaurant",
        source: "explicit_request",
        idempotency_key: "intent-c1"
      })

    # Budget as max_price_band only — exact $45 never disclosed
    {:ok, %{options: options}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.jordan,
        intent_id: intent.id,
        plan_id: plan.id,
        hard_constraints: %{
          "require_accessible_parking" => true,
          "require_vegetarian" => true,
          "max_price_band" => "$$"
        },
        idempotency_key: "dreq-c1"
      })

    assert Enum.all?(options, fn o ->
             o.price_band in ["$", "$$", "free"]
           end)

    refute Enum.any?(options, &(&1.display_name =~ "Velvet"))
    assert Enum.any?(options, fn o -> o.hard_constraint_pass and o.explanation =~ "budget" end)

    {:ok, sync} = Discovery.sync_discovery(g.alex, g.conv)
    blob = Jason.encode!(sync)
    refute blob =~ "$45"
    refute blob =~ "Jordan"
  end

  test "Journey D: activity discovery with refinement supersede" do
    g = group_ids()
    # Two-user style on group conv is ok for synthetic activity
    plan = agreed_plan!(g)

    {:ok, intent, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.maya,
        plan_id: plan.id,
        objective_type: "activity",
        source: "explicit_request",
        idempotency_key: "intent-d1"
      })

    {:ok, %{options: opts1, option_set: set1}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.maya,
        intent_id: intent.id,
        plan_id: plan.id,
        request_type: "activity",
        soft_preferences: %{"prefer_quiet" => true},
        hard_constraints: %{},
        option_limit: 3,
        idempotency_key: "dreq-d1"
      })

    assert length(opts1) == 3
    refute Enum.any?(opts1, &(&1.explanation =~ "relaxing date"))
    refute Enum.any?(opts1, &(&1.explanation =~ "emotional"))

    {:ok, %{options: opts2, option_set: set2}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.maya,
        intent_id: intent.id,
        plan_id: plan.id,
        request_type: "activity",
        soft_preferences: %{"prefer_outdoor" => true, "prefer_quiet" => true},
        hard_constraints: %{},
        option_limit: 3,
        idempotency_key: "dreq-d2"
      })

    assert set2.version > set1.version
    set1_re = OpalCore.Repo.get!(OpalCore.SocialFlow.DiscoveryOptionSet, set1.id)
    assert set1_re.status == "superseded"
    assert opts2 != []
  end

  test "Journey E: safe handoff after selection; reject bad URLs" do
    g = group_ids()
    plan = agreed_plan!(g)

    {:ok, intent, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.alex,
        plan_id: plan.id,
        objective_type: "restaurant",
        source: "explicit_request",
        idempotency_key: "intent-e1"
      })

    {:ok, %{options: options, option_set: set}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.alex,
        intent_id: intent.id,
        plan_id: plan.id,
        hard_constraints: %{
          "require_accessible_parking" => true,
          "require_vegetarian" => true,
          "max_price_band" => "$$$"
        },
        idempotency_key: "dreq-e1"
      })

    harbor = Enum.find(options, &(&1.display_name == "Harbor Table")) || hd(options)

    {:ok, %{selection: sel}, :created} =
      Discovery.propose_selection(%{
        option_set_id: set.id,
        candidate_id: harbor.id,
        user_id: g.alex,
        idempotency_key: "sel-e1"
      })

    for uid <- [g.jordan, g.maya, g.chris] do
      Discovery.respond_selection(%{selection_id: sel.id, user_id: uid, decision: "accept"})
    end

    assert {:ok, handoff, :created} =
             Discovery.create_handoff(%{
               candidate_id: harbor.id,
               user_id: g.alex,
               conversation_id: g.conv,
               idempotency_key: "handoff-e1"
             })

    assert handoff.leaving_opal_copy =~ "leaving Opal"
    assert handoff.validated_url =~ "https://synthetic.opal.local"
    refute handoff.validated_url =~ "utm_"

    assert {:ok, opened} = Discovery.open_handoff(%{handoff_id: handoff.id, user_id: g.alex})
    assert opened.status == "opened"

    # Return does not auto-complete
    assert opened.completed_manually_at == nil

    assert {:ok, done} =
             Discovery.mark_reservation_booked(%{handoff_id: handoff.id, user_id: g.alex})

    assert done.status == "completed_manually"

    # Malicious URLs rejected
    assert {:error, :invalid_scheme} = Discovery.reject_malicious_url("javascript:alert(1)")
    assert {:error, :invalid_scheme} = Discovery.reject_malicious_url("data:text/html,hi")
    assert {:error, :untrusted_host} = Discovery.reject_malicious_url("https://evil.example/x")

    assert {:error, :forbidden} =
             Discovery.open_handoff(%{handoff_id: handoff.id, user_id: g.taylor})
  end

  test "hard constraints cannot be overridden by sponsorship" do
    g = group_ids()
    plan = agreed_plan!(g)

    {:ok, intent, _} =
      Discovery.create_intent(%{
        conversation_id: g.conv,
        owner_user_id: g.alex,
        plan_id: plan.id,
        objective_type: "restaurant",
        source: "approved_prompt",
        idempotency_key: "intent-hard1"
      })

    {:ok, %{options: options}, :created} =
      Discovery.run_discovery(%{
        conversation_id: g.conv,
        user_id: g.alex,
        intent_id: intent.id,
        plan_id: plan.id,
        include_sponsored: true,
        hard_constraints: %{
          "require_accessible_parking" => true,
          "require_vegetarian" => true,
          "max_price_band" => "$"
        },
        idempotency_key: "dreq-hard1"
      })

    # Only $ band (and free) — no $$$ or sponsored override
    assert Enum.all?(options, &(&1.price_band in ["$", "free"]))
    refute Enum.any?(options, &(&1.display_name =~ "Paid Stairs"))
  end

  test "provider handoff validation unit" do
    assert {:ok, _} = SyntheticProviders.validate_handoff_url("https://synthetic.opal.local/x")

    assert {:error, :invalid_scheme} =
             SyntheticProviders.validate_handoff_url("http://synthetic.opal.local/x")
  end
end
