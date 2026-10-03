defmodule OpalCore.SocialFlow.ContinuityTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.Continuity

  setup do
    FixturesHelper.seed!()
    :ok
  end

  test "Journey A: private personal memory; counterpart and Taylor denied; forget works" do
    chris = Fixtures.user_chris_id()
    maya = Fixtures.user_maya_id()
    jordan = Fixtures.user_jordan_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_maya_chris_id()
    conv_aj = Fixtures.conv_alex_jordan_id()

    assert {:ok, %{candidate: cand, sf2_candidate: sf2}, :created} =
             Continuity.propose_private_memory(%{
               owner_user_id: chris,
               conversation_id: conv,
               counterpart_user_id: maya,
               summary: "Maya said she preferred the quiet, less-crowded setting.",
               purpose: "private personal continuity",
               private_prompt: "Remember that Maya liked the quieter setting?",
               source_message_ids: [Ecto.UUID.generate()],
               uncertainty: ["not a permanent trait", "not a diagnosis"],
               idempotency_key: "priv-a1"
             })

    assert cand.memory_class == "private"
    assert cand.raw_candidate["actions"] |> Enum.member?("Save privately")
    refute cand.summary =~ "social anxiety"
    refute cand.summary =~ "always"

    assert {:ok, mem} =
             Continuity.save_private_memory(%{
               candidate_id: cand.id,
               sf2_candidate_id: sf2.id,
               user_id: chris
             })

    assert mem.deletion_state == "active"
    assert mem.owner_user_id == chris

    # Maya cannot see Chris private memory
    assert {:error, :forbidden} = Continuity.get_private_memory(mem.id, maya)
    assert {:error, :forbidden} = Continuity.get_private_memory(mem.id, taylor)

    # Chris is not a member of Alex–Jordan conversation — isolation
    assert {:error, :not_a_member} =
             Continuity.retrieve_for_context(chris, conv_aj, counterpart_user_id: jordan)

    # Same owner, wrong counterpart in Maya–Chris conversation
    assert {:ok, []} =
             Continuity.retrieve_for_context(chris, conv, counterpart_user_id: jordan)

    assert {:ok, [only]} =
             Continuity.retrieve_for_context(chris, conv, counterpart_user_id: maya)

    assert only["id"] == mem.id

    assert {:ok, _} = Continuity.forget_private_memory(%{memory_id: mem.id, user_id: chris})
    assert {:error, :forbidden} = Continuity.get_private_memory(mem.id, chris)
  end

  test "Journey B: shared memory requires all consents; silence not consent" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_alex_jordan_id()

    assert {:ok, mem, :created} =
             Continuity.propose_shared_memory(%{
               conversation_id: conv,
               proposed_by_user_id: alex,
               summary: "Save Harbor Table as an anniversary tradition?",
               required_participant_ids: [alex, jordan],
               source_message_ids: [Ecto.UUID.generate()],
               idempotency_key: "shared-b1"
             })

    assert mem.status == "pending_consent"

    assert {:ok, %{active: false, awaiting: true}} =
             Continuity.respond_shared_memory(%{
               shared_memory_id: mem.id,
               user_id: alex,
               decision: "accept"
             })

    # still pending until Jordan accepts
    assert {:ok, still} = Continuity.get_shared_memory(mem.id, alex)
    assert still.status == "pending_consent"

    assert {:ok, %{active: true, memory: active}} =
             Continuity.respond_shared_memory(%{
               shared_memory_id: mem.id,
               user_id: jordan,
               decision: "accept"
             })

    assert active.status == "active"
    assert OpalCore.SocialFlow.SharedMemory.to_contract(active)["not_auto_recurrence"]

    assert {:error, :forbidden} = Continuity.get_shared_memory(mem.id, taylor)

    assert {:ok, dissolved} =
             Continuity.delete_shared_memory(%{
               shared_memory_id: mem.id,
               user_id: alex,
               mode: "dissolve"
             })

    assert dissolved.status == "dissolved"
  end

  test "B_SHARED_FACT_VISIBLE_TO_A_WHEN_AUTHORIZED — agreed Interstellar" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_alex_jordan_id()

    assert {:ok, mem, :created} =
             Continuity.propose_shared_memory(%{
               conversation_id: conv,
               proposed_by_user_id: alex,
               summary: "We agreed to watch Interstellar together",
               purpose: "shared continuity",
               required_participant_ids: [alex, jordan],
               idempotency_key: "shared-interstellar-pass2"
             })

    Continuity.respond_shared_memory(%{
      shared_memory_id: mem.id,
      user_id: alex,
      decision: "accept"
    })

    assert {:ok, %{active: true, memory: active}} =
             Continuity.respond_shared_memory(%{
               shared_memory_id: mem.id,
               user_id: jordan,
               decision: "accept"
             })

    assert active.status == "active"
    assert {:ok, _} = Continuity.get_shared_memory(active.id, alex)
    assert {:ok, _} = Continuity.get_shared_memory(active.id, jordan)
    assert {:error, :forbidden} = Continuity.get_shared_memory(active.id, taylor)

    assert {:ok, sync_a} = Continuity.sync_continuity(alex, conv)
    assert Enum.any?(sync_a["shared_memories"], fn m ->
             m["id"] == active.id and m["status"] == "active" and
               String.contains?(m["summary"], "Interstellar")
           end)
  end

  test "Journey C: recurrence needs full agreement; no mandatory attendance flags" do
    g = group()

    assert {:ok, t, :created} =
             Continuity.propose_recurrence(%{
               conversation_id: g.conv,
               proposed_by_user_id: g.alex,
               title: "Game night",
               summary:
                 "This group has held game night on the first Friday for three months. Make it a recurring tradition?",
               observed_occurrences: 3,
               recurrence_rule: %{"cadence" => "first_friday", "time" => "evening"},
               required_participant_ids: [g.alex, g.jordan, g.maya, g.chris],
               idempotency_key: "rec-c1"
             })

    assert t.status == "proposed"
    contract = OpalCore.SocialFlow.SocialTradition.to_contract(t)
    assert contract["no_mandatory_attendance"]
    assert contract["no_streak"]
    assert contract["no_guilt_copy"]

    assert {:ok, %{awaiting: true}} =
             Continuity.respond_recurrence(%{
               tradition_id: t.id,
               user_id: g.alex,
               decision: "accept",
               occurrence_key: "activation"
             })

    for uid <- [g.jordan, g.maya] do
      Continuity.respond_recurrence(%{
        tradition_id: t.id,
        user_id: uid,
        decision: "accept",
        occurrence_key: "activation"
      })
    end

    assert {:ok, %{active: true, tradition: active}} =
             Continuity.respond_recurrence(%{
               tradition_id: t.id,
               user_id: g.chris,
               decision: "accept",
               occurrence_key: "activation"
             })

    assert active.status == "active"

    # individual skip without ending
    assert {:ok, %{active: true}} =
             Continuity.respond_recurrence(%{
               tradition_id: t.id,
               user_id: g.maya,
               decision: "decline",
               occurrence_key: "2026-04-first-friday"
             })

    assert {:ok, paused} = Continuity.pause_tradition(%{tradition_id: t.id, user_id: g.alex})
    assert paused.status == "paused"
  end

  test "Journey D: future invitation does not auto-plan; skip and pause work" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    {:ok, t, _} =
      Continuity.propose_recurrence(%{
        conversation_id: conv,
        proposed_by_user_id: alex,
        title: "Annual October trip",
        summary: "Annual weekend trip in October",
        required_participant_ids: [alex, jordan],
        idempotency_key: "trad-d1"
      })

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: alex,
      decision: "accept",
      occurrence_key: "activation"
    })

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: jordan,
      decision: "accept",
      occurrence_key: "activation"
    })

    assert {:ok, prompt, :created} =
             Continuity.evaluate_future_invitation(%{
               tradition_id: t.id,
               user_id: alex,
               copy:
                 "You saved an annual October trip. Would you like to start planning this year’s?",
               idempotency_key: "inv-d1"
             })

    assert prompt.status == "proposed"
    assert OpalCore.SocialFlow.FutureInvitationPrompt.to_contract(prompt)["not_auto_plan"]

    assert {:ok, %{prompt: skipped}} =
             Continuity.respond_future_invitation(%{
               prompt_id: prompt.id,
               user_id: alex,
               decision: "skip"
             })

    assert skipped.status == "skipped"

    # pause tradition via invitation
    {:ok, prompt2, _} =
      Continuity.evaluate_future_invitation(%{
        tradition_id: t.id,
        user_id: alex,
        idempotency_key: "inv-d2"
      })

    assert {:ok, %{tradition_status: "paused"}} =
             Continuity.respond_future_invitation(%{
               prompt_id: prompt2.id,
               user_id: alex,
               decision: "pause"
             })

    assert {:error, :tradition_not_active} =
             Continuity.evaluate_future_invitation(%{
               tradition_id: t.id,
               user_id: alex,
               idempotency_key: "inv-d3"
             })
  end

  test "Journey E: pause relationship context stops suggestions without breakup language" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    {:ok, t, _} =
      Continuity.propose_recurrence(%{
        conversation_id: conv,
        proposed_by_user_id: alex,
        title: "Monthly dinner",
        summary: "Monthly dinner tradition",
        required_participant_ids: [alex, jordan],
        idempotency_key: "trad-e1"
      })

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: alex,
      decision: "accept",
      occurrence_key: "activation"
    })

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: jordan,
      decision: "accept",
      occurrence_key: "activation"
    })

    assert {:ok, ctx} =
             Continuity.pause_relationship_context(%{
               conversation_id: conv,
               owner_user_id: alex,
               stop_suggestions: true,
               archive_shared: true,
               idempotency_key: "ctx-e1"
             })

    assert ctx.status == "paused"
    assert ctx.stop_suggestions
    contract = OpalCore.SocialFlow.RelationshipContext.to_contract(ctx)
    assert contract["no_breakup_inference"]
    assert contract["no_guilt_prompt"]

    assert {:error, :context_paused} =
             Continuity.evaluate_future_invitation(%{
               tradition_id: t.id,
               user_id: alex,
               idempotency_key: "inv-e1"
             })
  end

  test "Journey F: adult family tradition proposal without youth data" do
    maya = Fixtures.user_maya_id()
    chris = Fixtures.user_chris_id()
    jordan = Fixtures.user_jordan_id()
    # use group friends as adult family stand-in with three members + alex not required
    conv = Fixtures.conv_group_friends_id()
    alex = Fixtures.user_alex_id()

    assert {:ok, t, :created} =
             Continuity.propose_family_tradition(%{
               conversation_id: conv,
               proposed_by_user_id: maya,
               title: "Thanksgiving dinner",
               summary: "Save this as a family tradition?",
               required_participant_ids: [maya, chris, jordan],
               recurrence_rule: %{"cadence" => "annual_thanksgiving", "host_class" => "home"},
               observed_occurrences: 2,
               idempotency_key: "fam-f1"
             })

    adult_family? =
      t.tradition_type == "adult_family" or t.metadata["adult"] in [true, "true"]

    assert adult_family?
    refute inspect(t) =~ "child"
    refute inspect(t) =~ "minor"

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: maya,
      decision: "accept",
      occurrence_key: "activation"
    })

    Continuity.respond_recurrence(%{
      tradition_id: t.id,
      user_id: chris,
      decision: "accept",
      occurrence_key: "activation"
    })

    assert {:ok, %{active: true}} =
             Continuity.respond_recurrence(%{
               tradition_id: t.id,
               user_id: jordan,
               decision: "accept",
               occurrence_key: "activation"
             })

    # alex not required — can still be group member but tradition is adults listed
    _ = alex

    assert {:error, :not_a_member} =
             Continuity.sync_continuity(Fixtures.user_taylor_id(), conv)
  end

  defp group do
    %{
      alex: Fixtures.user_alex_id(),
      jordan: Fixtures.user_jordan_id(),
      maya: Fixtures.user_maya_id(),
      chris: Fixtures.user_chris_id(),
      conv: Fixtures.conv_group_friends_id()
    }
  end
end
