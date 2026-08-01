defmodule OpalCore.SocialFlow.FollowThroughTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, SocialFlow}
  alias OpalCore.SocialFlow.FollowThrough
  alias OpalCore.SocialFlow.{PlanCommitment, SharedPlan}
  alias OpalCore.Repo

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp seed_dinner_with_commitment! do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    assert {:ok, %{proposal: proposal, options: options}} =
             SocialFlow.create_proposal_from_ai_result(%{
               conversation_id: conv,
               requester_user_id: alex,
               output: %{
                 "result_type" => "plan_candidate",
                 "candidate" => %{
                   "activity" => "dinner",
                   "normalized_time_candidates" => [
                     %{"label" => "Thursday at 7:30 PM", "confidence" => 0.8}
                   ],
                   "recommended_signal_copy" => "Dinner may be a plan.",
                   "confidence" => 0.8,
                   "participant_mentions" => [],
                   "possible_commitments" => [],
                   "missing_information" => []
                 },
                 "uncertainty" => []
               },
               source_message_ids: [],
               trace_id: "trace-sf2-seed-plan"
             })

    assert {:ok, _} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: alex,
               trace_id: "t-coord"
             })

    option = hd(options)

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: alex,
               response: "accept",
               trace_id: "t-a"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: jordan,
               response: "accept",
               trace_id: "t-j"
             })

    {:ok, commitment} =
      %PlanCommitment{}
      |> PlanCommitment.changeset(%{
        plan_id: plan.id,
        owner_user_id: alex,
        description: "Make the restaurant reservation",
        visibility: "private",
        status: "confirmed",
        confirmed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()

    {:ok, %{reminder: reminder}} =
      SocialFlow.create_private_reminder(%{
        plan_id: plan.id,
        user_id: alex,
        content_summary: "Book the restaurant",
        commitment_id: commitment.id,
        trace_id: "t-rem"
      })

    %{
      alex: alex,
      jordan: jordan,
      taylor: Fixtures.user_taylor_id(),
      conv: conv,
      plan: plan,
      commitment: commitment,
      reminder: reminder
    }
  end

  test "Journey A: follow-through, private completion, optional share, isolation" do
    ctx = seed_dinner_with_commitment!()
    alex = ctx.alex
    jordan = ctx.jordan
    taylor = ctx.taylor
    conv = ctx.conv
    commitment = ctx.commitment

    # Disable quiet hours for due/not-due assertions (UTC-safe window away from midnight)
    FollowThrough.update_preferences(alex, %{
      quiet_hours_start: "12:00",
      quiet_hours_end: "13:00"
    })

    assert {:ok, suppressed, :suppressed} =
             FollowThrough.evaluate_follow_through(%{
               owner_user_id: alex,
               commitment_id: commitment.id,
               force_due: false,
               idempotency_key: "eval-early-1",
               trace_id: "trace-eval-early"
             })

    assert suppressed.status == "suppressed"
    assert suppressed.suppression_reason == "not_due"

    assert {:ok, signal, :surfaced} =
             FollowThrough.evaluate_follow_through(%{
               owner_user_id: alex,
               commitment_id: commitment.id,
               force_due: true,
               idempotency_key: "eval-due-1",
               trace_id: "trace-eval-due"
             })

    assert signal.status == "visible"
    assert signal.privacy_class == "private"
    assert signal.owner_user_id == alex

    needs = FollowThrough.needs_you(alex)
    assert Enum.any?(needs, &(&1["id"] == signal.id))

    jordan_needs = FollowThrough.needs_you(jordan)
    refute Enum.any?(jordan_needs, &(&1["id"] == signal.id))

    assert {:ok, result, :created} =
             FollowThrough.complete_commitment(%{
               commitment_id: commitment.id,
               user_id: alex,
               share: false,
               idempotency_key: "complete-private-1",
               attention_signal_id: signal.id,
               trace_id: "trace-complete-1"
             })

    assert result.completion.visibility == "private"
    assert result.completion.gratification_copy == "Reservation handled."
    assert result.commitment.status == "completed"
    assert result.gratification.copy == "Reservation handled."

    assert {:ok, _again, :idempotent} =
             FollowThrough.complete_commitment(%{
               commitment_id: commitment.id,
               user_id: alex,
               share: false,
               idempotency_key: "complete-private-1",
               trace_id: "trace-complete-dup"
             })

    {:ok, jsync} = FollowThrough.sync_follow_through(jordan, conv)
    refute Enum.any?(jsync["completions"], &(&1["id"] == result.completion.id))

    {:ok, c2} =
      %PlanCommitment{}
      |> PlanCommitment.changeset(%{
        plan_id: ctx.plan.id,
        owner_user_id: alex,
        description: "Confirm table",
        visibility: "private",
        status: "confirmed"
      })
      |> Repo.insert()

    assert {:ok, shared_result, :created} =
             FollowThrough.complete_commitment(%{
               commitment_id: c2.id,
               user_id: alex,
               share: true,
               shared_message: "Reservation is booked.",
               idempotency_key: "complete-share-1",
               trace_id: "trace-share"
             })

    assert shared_result.completion.visibility == "shared"
    assert shared_result.completion.shared_message == "Reservation is booked."

    assert {:error, :not_a_member} = FollowThrough.sync_follow_through(taylor, conv)

    assert {:error, :forbidden} =
             FollowThrough.complete_commitment(%{
               commitment_id: c2.id,
               user_id: taylor,
               share: false,
               idempotency_key: "taylor-spoof",
               trace_id: "trace-taylor"
             })

    {:ok, c3} =
      %PlanCommitment{}
      |> PlanCommitment.changeset(%{
        plan_id: ctx.plan.id,
        owner_user_id: alex,
        description: "Bring gift",
        visibility: "private",
        status: "confirmed"
      })
      |> Repo.insert()

    assert {:ok, shadow_sig, :shadow} =
             FollowThrough.evaluate_follow_through(%{
               owner_user_id: alex,
               commitment_id: c3.id,
               force_due: true,
               idempotency_key: "shadow-1",
               shadow: true,
               trace_id: "trace-shadow"
             })

    assert shadow_sig.shadow_only or shadow_sig.status == "suppressed"
  end

  test "Journey B: memory candidate private approval and handle" do
    chris = Fixtures.user_chris_id()
    maya = Fixtures.user_maya_id()
    conv = Fixtures.conv_maya_chris_id()

    assert {:ok, %{candidate: cand, signal: sig}} =
             FollowThrough.create_memory_candidate(%{
               owner_user_id: chris,
               conversation_id: conv,
               counterpart_user_id: maya,
               candidate_summary: "You asked to remember the necklace Maya mentioned.",
               candidate_type: "gift_preference",
               source_message_ids: [],
               confidence: 0.78,
               uncertainty: ["Does not assume she still wants it"],
               proposed_purpose: "private personal follow-through reminder",
               trace_id: "trace-mem-1"
             })

    assert cand.owner_user_id == chris
    assert sig.privacy_class == "private"
    assert FollowThrough.list_memories(maya) == []

    assert {:ok, %{memory: mem}} =
             FollowThrough.approve_memory_candidate(%{
               candidate_id: cand.id,
               user_id: chris,
               trace_id: "trace-mem-appr"
             })

    assert mem.visibility == "private"
    assert mem.owner_user_id == chris
    assert {:error, :forbidden} = FollowThrough.get_memory_for_user(mem.id, maya)
    assert {:ok, _} = FollowThrough.get_memory_for_user(mem.id, chris)

    assert {:ok, handled} =
             FollowThrough.handle_memory(%{
               memory_id: mem.id,
               user_id: chris,
               action: "handled"
             })

    assert handled.gratification_copy == "You closed the loop."
    assert handled.memory.deletion_state == "handled"
    assert FollowThrough.list_memories(chris) == []
    assert {:error, :forbidden} = FollowThrough.get_memory_for_user(mem.id, chris)
  end

  test "quiet hours suppress even when force_due" do
    ctx = seed_dinner_with_commitment!()
    alex = ctx.alex
    commitment = ctx.commitment

    FollowThrough.update_preferences(alex, %{
      quiet_hours_start: "00:00",
      quiet_hours_end: "23:59",
      max_proactive_signals_per_day: 3
    })

    assert {:ok, s, :suppressed} =
             FollowThrough.evaluate_follow_through(%{
               owner_user_id: alex,
               commitment_id: commitment.id,
               force_due: true,
               idempotency_key: "quiet-1",
               trace_id: "trace-quiet"
             })

    assert s.suppression_reason == "quiet_hours"
  end

  test "attention snapshot is operational not a score" do
    ctx = seed_dinner_with_commitment!()

    assert {:ok, snap} = FollowThrough.attention_snapshot(ctx.alex, ctx.conv)
    assert snap["note"] =~ "not a relationship score"
    assert is_integer(snap["open_commitment_count"])
    refute Map.has_key?(snap, "health")
    refute Map.has_key?(snap, "score")
  end

  test "SF1 plan still loads after SF2 migration" do
    ctx = seed_dinner_with_commitment!()
    assert %SharedPlan{} = Repo.get!(SharedPlan, ctx.plan.id)
  end
end
