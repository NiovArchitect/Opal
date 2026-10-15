defmodule OpalCore.SocialFlow.Repair11Test do
  @moduledoc """
  Repair #11 — Social Flow lifecycle repair: confirmation reachability,
  broadcast-after-commit, row-locked revisions, conversion guard, lazy expiry,
  cancel lifecycle, lead authority, and idempotent opportunity taps.

  Written 2026-10-15. NOT RUN on this VM (no Elixir toolchain) — run with:
    mix test apps/opal_core/test/opal_core/social_flow/repair11_test.exs
  """

  use OpalCore.DataCase

  import Ecto.Query

  alias OpalCore.{Contracts, Fixtures, FixturesHelper, Repo, SocialFlow}
  alias OpalCore.Messaging.Message
  alias OpalCore.SocialFlow.{PlanOption, PlanParticipant, PlanRevision, Proposal, SharedPlan}
  alias OpalCore.SocialFlow.{AuditEvent, PlanCommitment, PlanOptionResponse}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp conv, do: Fixtures.conv_alex_jordan_id()
  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp group_conv, do: Fixtures.conv_group_friends_id()

  defp insert_proposal!(conversation_id, creator_id, attrs \\ %{}) do
    expires_at =
      Map.get(
        attrs,
        :expires_at,
        DateTime.add(DateTime.utc_now(), 7 * 24 * 3600, :second) |> DateTime.truncate(:microsecond)
      )

    {:ok, proposal} =
      %Proposal{}
      |> Proposal.changeset(%{
        conversation_id: conversation_id,
        created_by_user_id: creator_id,
        capability: "social_flow_plan_extract",
        status: Map.get(attrs, :status, "visible"),
        activity_label: "Dinner",
        expires_at: expires_at
      })
      |> Repo.insert()

    {:ok, option} =
      %PlanOption{}
      |> PlanOption.changeset(%{
        proposal_id: proposal.id,
        label: "Thursday at 7:00 PM",
        status: "open",
        sort_order: 0
      })
      |> Repo.insert()

    {proposal, option}
  end

  # Full proposal -> coordination -> both-accept flow. Returns {proposal, option, plan}.
  # The LAST acceptor becomes created_by (and, since repair #11, the lead).
  defp drive_to_plan!(conversation_id, first_id, second_id) do
    {proposal, option} = insert_proposal!(conversation_id, first_id)

    assert {:ok, %{proposal: approved}} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: first_id,
               trace_id: "trace-r11-approve"
             })

    assert approved.status == "approved_for_coordination"

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: first_id,
               response: "accept",
               trace_id: "trace-r11-opt-1"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: second_id,
               response: "accept",
               trace_id: "trace-r11-opt-2"
             })

    {approved, option, plan}
  end

  defp participant_role!(plan_id, user_id) do
    Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_id).role
  end

  defp subscribe!(conversation_id) do
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conversation_id}")
  end

  # --- Task 3: confirm_pending_revision ---

  test "confirm_pending_revision applies the latest proposed revision" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{revision: _rev}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "trace-r11-prop"
             })

    assert {:ok, %{revision_id: rev_id, status: "accepted"}} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: conv(),
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-confirm"
             })

    assert %PlanRevision{status: "accepted"} = Repo.get!(PlanRevision, rev_id)
    assert %SharedPlan{time_label: "Friday at 8:00 PM"} = Repo.get!(SharedPlan, plan.id)
  end

  test "confirm_pending_revision rejects unauthorized / duplicate / missing" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{revision: _rev}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "trace-r11-prop"
             })

    # Proposer is not in required_approvals.
    assert {:error, :not_authorized} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: conv(),
               user_id: alex(),
               decision: "accept",
               trace_id: "trace-r11-confirm"
             })

    # Non-member.
    assert {:error, :not_a_member} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: conv(),
               user_id: Fixtures.user_taylor_id(),
               decision: "accept",
               trace_id: "trace-r11-confirm"
             })

    # Conversation with no plan at all.
    assert {:error, :no_pending_revision} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: Fixtures.conv_alex_taylor_id(),
               user_id: alex(),
               decision: "accept",
               trace_id: "trace-r11-confirm"
             })
  end

  test "confirm_pending_revision reports already_decided" do
    # Group conversation: 4 members, so one accept does not settle the revision.
    {proposal, option} = insert_proposal!(group_conv(), alex())

    assert {:ok, _} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: alex(),
               trace_id: "trace-r11-approve"
             })

    members = [alex(), jordan(), Fixtures.user_maya_id(), Fixtures.user_chris_id()]

    for uid <- members do
      SocialFlow.respond_to_option(%{
        option_id: option.id,
        user_id: uid,
        response: "accept",
        trace_id: "trace-r11-opt-#{uid}"
      })
    end

    assert {:ok, %{"plans" => plans}} = SocialFlow.sync_for_user(group_conv(), alex())
    plan_id = hd(plans)["id"]

    assert {:ok, %{revision: _}} =
             SocialFlow.propose_revision(%{
               plan_id: plan_id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Saturday at 6:00 PM"},
               trace_id: "trace-r11-prop"
             })

    assert {:ok, %{status: "proposed"}} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: group_conv(),
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-confirm-1"
             })

    assert {:error, :already_decided} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: group_conv(),
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-confirm-2"
             })
  end

  test "create_proposal_from_ai_result routes revision_confirmation to confirm_pending_revision" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{revision: _}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "trace-r11-prop"
             })

    # Chat text "I confirm" classified by the AI layer as revision_confirmation.
    assert {:ok, %{revision_id: rev_id, status: "accepted"}} =
             SocialFlow.create_proposal_from_ai_result(%{
               conversation_id: conv(),
               requester_user_id: jordan(),
               output: %{
                 "result_type" => "revision_confirmation",
                 "candidate" => %{"decision" => "accept"}
               },
               trace_id: "trace-r11-ai-confirm"
             })

    assert %PlanRevision{status: "accepted"} = Repo.get!(PlanRevision, rev_id)
  end

  test "contracts taxonomy accepts revision_confirmation AI output" do
    resp =
      Contracts.load_example("ai_job_response.valid")
      |> Map.put("output", %{
        "result_type" => "revision_confirmation",
        "candidate" => %{"decision" => "accept"}
      })

    assert :ok = Contracts.validate_ai_job_response(resp)
  end

  # --- Task 4: locked revision responses ---

  test "second response to a settled revision is rejected, plan unchanged" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{revision: rev}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "trace-r11-prop"
             })

    assert {:ok, %{revision: _}} =
             SocialFlow.respond_to_revision(%{
               revision_id: rev.id,
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-resp"
             })

    # Revision is no longer proposed: the locked re-check rejects.
    assert {:error, :forbidden} =
             SocialFlow.respond_to_revision(%{
               revision_id: rev.id,
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-resp-2"
             })

    assert %SharedPlan{time_label: "Friday at 8:00 PM"} = Repo.get!(SharedPlan, plan.id)
  end

  # --- Task 5: broadcast after commit ---

  test "failed transactions broadcast nothing; successes broadcast after commit" do
    subscribe!(conv())

    # Failure: expired proposal can never approve, and nothing is broadcast.
    past = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:microsecond)
    {expired_proposal, _} = insert_proposal!(conv(), alex(), %{expires_at: past})

    assert {:error, :expired} =
             SocialFlow.approve_coordination(%{
               proposal_id: expired_proposal.id,
               user_id: alex(),
               trace_id: "trace-r11-exp"
             })

    refute_receive {:social_flow_event, "social_flow:proposal_updated", _}, 200

    # Failure: unknown revision id broadcasts nothing.
    assert {:error, :not_found} =
             SocialFlow.respond_to_revision(%{
               revision_id: Ecto.UUID.generate(),
               user_id: alex(),
               decision: "accept",
               trace_id: "trace-r11-nf"
             })

    refute_receive {:social_flow_event, _, _}, 200

    # Success: propose_revision broadcasts after commit.
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())
    assert_receive {:social_flow_event, "social_flow:plan", _}, 500

    assert {:ok, %{revision: _}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "trace-r11-prop-ok"
             })

    assert_receive {:social_flow_event, "social_flow:revision", _}, 500
  end

  # --- Task 6: conversion guard ---

  test "one proposal cannot birth two plans; a lost race resumes the plan" do
    {proposal, option} = insert_proposal!(conv(), alex())

    assert {:ok, _} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: alex(),
               trace_id: "trace-r11-approve"
             })

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: alex(),
               response: "accept",
               trace_id: "trace-r11-opt-1"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: jordan(),
               response: "accept",
               trace_id: "trace-r11-opt-2"
             })

    # A repeated accept (double-tap / retry) hits the conversion guard and
    # resumes the already-created plan instead of inserting a duplicate.
    assert {:ok, %{plan: same_plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: jordan(),
               response: "accept",
               trace_id: "trace-r11-opt-3"
             })

    assert same_plan.id == plan.id

    count =
      from(p in SharedPlan, where: p.created_from_proposal_id == ^proposal.id, select: count(p.id))
      |> Repo.one()

    assert count == 1
  end

  # --- Task 7: lazy expiry ---

  test "expired proposals are lazily marked expired on approve and option response" do
    past = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:microsecond)
    {proposal, option} = insert_proposal!(conv(), alex(), %{expires_at: past})

    assert {:error, :expired} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: alex(),
               trace_id: "trace-r11-exp-approve"
             })

    assert %Proposal{status: "expired"} = Repo.get!(Proposal, proposal.id)

    # Re-arm as approved_for_coordination but still expired: option path also refuses.
    proposal
    |> Proposal.changeset(%{status: "approved_for_coordination"})
    |> Repo.update!()

    assert {:error, :expired} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: alex(),
               response: "accept",
               trace_id: "trace-r11-exp-opt"
             })

    assert %Proposal{status: "expired"} = Repo.get!(Proposal, proposal.id)
  end

  # --- B1: lead authority ---

  test "plan creator becomes lead; other member stays participant" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    # jordan accepted last, so jordan is created_by -> lead.
    assert participant_role!(plan.id, jordan()) == "lead"
    assert participant_role!(plan.id, alex()) == "participant"
  end

  test "sync payloads carry lead_user_id" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{"plans" => plans}} = SocialFlow.sync_for_user(conv(), alex())
    synced = Enum.find(plans, &(&1["id"] == plan.id))
    assert synced["lead_user_id"] == jordan()
  end

  # --- Task 8: propose_cancel_revision lifecycle ---

  test "cancel revision requires the lead's approval and cancels the plan" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    assert {:ok, %{revision: rev}} =
             SocialFlow.propose_cancel_revision(%{
               plan_id: plan.id,
               user_id: alex(),
               trace_id: "trace-r11-cancel-prop"
             })

    assert rev.proposed_changes == %{"kind" => "cancel"}
    assert rev.required_approvals == [jordan()]

    assert {:ok, %{revision: applied}} =
             SocialFlow.respond_to_revision(%{
               revision_id: rev.id,
               user_id: jordan(),
               decision: "accept",
               trace_id: "trace-r11-cancel-accept"
             })

    assert applied.status == "accepted"
    assert %SharedPlan{status: "cancelled"} = Repo.get!(SharedPlan, plan.id)
  end

  test "cancel revision on an already-cancelled plan is rejected" do
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

    plan |> SharedPlan.changeset(%{status: "cancelled"}) |> Repo.update!()

    assert {:error, :invalid_status} =
             SocialFlow.propose_cancel_revision(%{
               plan_id: plan.id,
               user_id: alex(),
               trace_id: "trace-r11-cancel-prop"
             })
  end

  # --- Task 9: cancel_plan ---

  test "cancel_plan is lead-only, transactional, and posts no chat messages" do
    subscribe!(conv())
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())
    assert_receive {:social_flow_event, "social_flow:plan", _}, 500

    before_count =
      from(m in Message, where: m.conversation_id == ^conv(), select: count(m.id)) |> Repo.one()

    # Non-lead cannot cancel.
    assert {:error, :not_authorized} =
             SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "trace-r11-cx"})

    assert %SharedPlan{status: "agreed"} = Repo.get!(SharedPlan, plan.id)

    # Lead cancels.
    assert {:ok, %{plan: cancelled, notify_user_ids: notify}} =
             SocialFlow.cancel_plan(%{
               plan_id: plan.id,
               user_id: jordan(),
               trace_id: "trace-r11-cancel"
             })

    assert cancelled.status == "cancelled"
    assert Enum.sort(notify) == Enum.sort([alex(), jordan()])

    # Broadcast after commit carries the cancelled plan.
    assert_receive {:social_flow_event, "social_flow:plan", envelope}, 500
    assert envelope["payload"]["cancelled"] == true
    assert envelope["payload"]["plan"]["status"] == "cancelled"

    # No chat messages were posted by cancel_plan.
    after_count =
      from(m in Message, where: m.conversation_id == ^conv(), select: count(m.id)) |> Repo.one()

    assert after_count == before_count

    # Cancelling twice is an explicit error, not a silent no-op.
    assert {:error, :already_cancelled} =
             SocialFlow.cancel_plan(%{
               plan_id: plan.id,
               user_id: jordan(),
               trace_id: "trace-r11-cancel-2"
             })

    # Unknown plan.
    assert {:error, :not_found} =
             SocialFlow.cancel_plan(%{
               plan_id: Ecto.UUID.generate(),
               user_id: jordan(),
               trace_id: "trace-r11-cancel-3"
             })
  end

  # --- B2: change_plan_time / change_plan_date ---

  test "lead can change plan time and date; non-lead gets not_authorized" do
    subscribe!(conv())
    {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())
    assert_receive {:social_flow_event, "social_flow:plan", _}, 500

    assert {:error, :not_authorized} =
             SocialFlow.change_plan_time(%{
               plan_id: plan.id,
               user_id: alex(),
               new_time_label: "Friday at 9:00 PM",
               trace_id: "trace-r11-cht"
             })

    assert {:ok, %{plan: updated}} =
             SocialFlow.change_plan_time(%{
               plan_id: plan.id,
               user_id: jordan(),
               new_time_label: "Friday at 9:00 PM",
               trace_id: "trace-r11-cht"
             })

    assert updated.time_label == "Friday at 9:00 PM"

    # Version marker: an accepted schedule_change revision linked from the plan.
    reloaded = Repo.get!(SharedPlan, plan.id)
    assert %PlanRevision{
             proposed_changes: %{"kind" => "schedule_change", "field" => "time_label"}
           } = Repo.get!(PlanRevision, reloaded.current_revision_id)

    assert_receive {:social_flow_event, "social_flow:plan", envelope}, 500
    assert envelope["payload"]["schedule_change"]["new_value"] == "Friday at 9:00 PM"

    assert {:ok, %{plan: dated}} =
             SocialFlow.change_plan_date(%{
               plan_id: plan.id,
               user_id: jordan(),
               new_date_label: "Saturday",
               trace_id: "trace-r11-chd"
             })

    assert dated.alignment["date_label"] == "Saturday"

    # Blank labels are rejected without touching the row.
    assert {:error, :invalid_label} =
             SocialFlow.change_plan_time(%{
               plan_id: plan.id,
               user_id: jordan(),
               new_time_label: "  ",
               trace_id: "trace-r11-cht-bad"
             })
  end

  # --- C-reinforce: idempotent center taps ---

  test "tapping the same center opportunity twice resumes the pending plan" do
    attrs = %{title: "Solo dinner", decision_id: "dec-1", area: "Downtown"}

    assert {:ok, plan1, _} = SocialFlow.create_tentative_plan_from_center(alex(), attrs)
    assert {:ok, plan2, _} = SocialFlow.create_tentative_plan_from_center(alex(), attrs)

    assert plan1.id == plan2.id

    count =
      from(p in SharedPlan,
        where: p.created_by_user_id == ^alex() and p.source == "center" and p.status == "tentative",
        select: count(p.id)
      )
      |> Repo.one()

    assert count == 1
  end

  test "center taps without a decision_id still create (nothing to dedupe on)" do
    assert {:ok, plan1, _} =
             SocialFlow.create_tentative_plan_from_center(alex(), %{title: "Solo dinner"})

    assert {:ok, plan2, _} =
             SocialFlow.create_tentative_plan_from_center(alex(), %{title: "Solo dinner"})

    assert plan1.id != plan2.id
  end

  # --- Phase 3 attack list: sinister-user gates ---

  describe "adversarial gates" do
    test "confirming someone else's proposal is rejected (non-member)" do
      {proposal, option} = insert_proposal!(conv(), alex())

      assert {:error, :not_a_member} =
               SocialFlow.approve_coordination(%{
                 proposal_id: proposal.id,
                 user_id: Fixtures.user_taylor_id(),
                 trace_id: "trace-r11-adv"
               })

      assert {:error, :not_a_member} =
               SocialFlow.respond_to_option(%{
                 option_id: option.id,
                 user_id: Fixtures.user_taylor_id(),
                 response: "accept",
                 trace_id: "trace-r11-adv"
               })

      # Nobody's state moved.
      assert %Proposal{status: "visible"} = Repo.get!(Proposal, proposal.id)
    end

    test "confirming your own proposal is rejected, including via the AI path" do
      {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: alex(),
                 changes: %{"time_label" => "Friday at 8:00 PM"},
                 trace_id: "trace-r11-adv"
               })

      # Direct call: the proposer is not in required_approvals.
      assert {:error, :not_authorized} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "trace-r11-adv"
               })

      # AI-routed chat text ("I confirm") from the proposer: same rejection,
      # never a free-floating self-approval.
      assert {:error, :not_authorized} =
               SocialFlow.create_proposal_from_ai_result(%{
                 conversation_id: conv(),
                 requester_user_id: alex(),
                 output: %{
                   "result_type" => "revision_confirmation",
                   "candidate" => %{"decision" => "accept"}
                 },
                 trace_id: "trace-r11-adv-ai"
               })

      assert %PlanRevision{status: "proposed"} = Repo.get!(PlanRevision, rev.id)
    end

    test "confirming an already-consumed revision is rejected: exactly-once" do
      {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: alex(),
                 changes: %{"time_label" => "Friday at 8:00 PM"},
                 trace_id: "trace-r11-adv"
               })

      assert {:ok, %{status: "accepted"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: jordan(),
                 decision: "accept",
                 trace_id: "trace-r11-adv-1"
               })

      # Second confirmation finds no pending revision: exactly-once.
      assert {:error, :no_pending_revision} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: jordan(),
                 decision: "accept",
                 trace_id: "trace-r11-adv-2"
               })

      # Direct re-response to the settled row is also refused.
      assert {:error, :forbidden} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: jordan(),
                 decision: "accept",
                 trace_id: "trace-r11-adv-3"
               })

      accepted_count =
        from(r in PlanRevision,
          where: r.plan_id == ^plan.id and r.status == "accepted",
          select: count(r.id)
        )
        |> Repo.one()

      assert accepted_count == 1
      assert Repo.get!(SharedPlan, plan.id).current_revision_id == rev.id
    end

    test "confirming against an expired proposal is rejected and the mark persists" do
      past = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:microsecond)
      {proposal, option} = insert_proposal!(conv(), alex(), %{expires_at: past})

      assert {:error, :expired} =
               SocialFlow.respond_to_option(%{
                 option_id: option.id,
                 user_id: alex(),
                 response: "accept",
                 trace_id: "trace-r11-adv"
               })

      # Lazy expiry persisted (not rolled back away).
      assert %Proposal{status: "expired"} = Repo.get!(Proposal, proposal.id)

      # A converted proposal can never be re-driven either.
      {p2, o2} = insert_proposal!(conv(), alex())
      assert {:ok, _} = SocialFlow.approve_coordination(%{proposal_id: p2.id, user_id: alex(), trace_id: "t"})
      assert {:ok, :awaiting_others} = SocialFlow.respond_to_option(%{option_id: o2.id, user_id: alex(), response: "accept", trace_id: "t"})
      assert {:ok, %{plan: _}} = SocialFlow.respond_to_option(%{option_id: o2.id, user_id: jordan(), response: "accept", trace_id: "t"})

      assert {:error, :invalid_status} =
               SocialFlow.approve_coordination(%{proposal_id: p2.id, user_id: alex(), trace_id: "t"})

      assert {:error, :invalid_status} =
               SocialFlow.respond_to_option(%{option_id: o2.id, user_id: alex(), response: "accept", trace_id: "t"})
    end

    test "canceling someone else's plan is rejected; non-participant cancel is rejected" do
      {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

      # Member but not lead.
      assert {:error, :not_authorized} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "trace-r11-adv"})

      # Not a member at all: fails closed.
      assert {:error, :not_a_member} =
               SocialFlow.cancel_plan(%{
                 plan_id: plan.id,
                 user_id: Fixtures.user_taylor_id(),
                 trace_id: "trace-r11-adv"
               })

      assert {:error, :not_a_member} =
               SocialFlow.propose_cancel_revision(%{
                 plan_id: plan.id,
                 user_id: Fixtures.user_taylor_id(),
                 trace_id: "trace-r11-adv"
               })

      assert %SharedPlan{status: "agreed"} = Repo.get!(SharedPlan, plan.id)
    end

    test "rapid double-submit on confirm applies exactly once" do
      members = [alex(), jordan(), Fixtures.user_maya_id(), Fixtures.user_chris_id()]
      {proposal, option} = insert_proposal!(group_conv(), alex())
      assert {:ok, _} = SocialFlow.approve_coordination(%{proposal_id: proposal.id, user_id: alex(), trace_id: "t"})
      for uid <- members do
        SocialFlow.respond_to_option(%{option_id: option.id, user_id: uid, response: "accept", trace_id: "t-#{uid}"})
      end

      {:ok, %{"plans" => plans}} = SocialFlow.sync_for_user(group_conv(), alex())
      plan_id = hd(plans)["id"]

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan_id,
                 proposed_by_user_id: alex(),
                 changes: %{"time_label" => "Saturday at 6:00 PM"},
                 trace_id: "t"
               })

      # Two rapid confirms from the same approver: one records, one is refused.
      assert {:ok, %{status: "proposed"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: group_conv(), user_id: jordan(), decision: "accept", trace_id: "t1"
               })

      assert {:error, :already_decided} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: group_conv(), user_id: jordan(), decision: "accept", trace_id: "t2"
               })

      reloaded = Repo.get!(PlanRevision, rev.id)
      assert reloaded.status == "proposed"
      assert reloaded.approvals == %{jordan() => "accept"}
    end

    test "double option accept is idempotent at the response row" do
      {_proposal, option, plan} = drive_to_plan!(conv(), alex(), jordan())

      assert {:ok, %{plan: same}} =
               SocialFlow.respond_to_option(%{
                 option_id: option.id, user_id: jordan(), response: "accept", trace_id: "t-dup"
               })

      assert same.id == plan.id

      response_count =
        from(r in PlanOptionResponse,
          where: r.option_id == ^option.id and r.user_id == ^jordan(),
          select: count(r.id)
        )
        |> Repo.one()

      assert response_count == 1
    end

    test "double cancel submits exactly one cancellation" do
      {_proposal, _option, plan} = drive_to_plan!(conv(), alex(), jordan())

      assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: jordan(), trace_id: "t1"})
      assert {:error, :already_cancelled} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: jordan(), trace_id: "t2"})

      cancel_events =
        from(a in AuditEvent,
          where: a.plan_id == ^plan.id and a.event_type == "plan.cancelled",
          select: count(a.id)
        )
        |> Repo.one()

      assert cancel_events == 1
    end

    test "concurrent accepts leave no duplicate plans and no stuck proposal" do
      {proposal, option} = insert_proposal!(conv(), alex())
      assert {:ok, _} = SocialFlow.approve_coordination(%{proposal_id: proposal.id, user_id: alex(), trace_id: "t"})

      # Two sessions accept "at once": the second accept goes through the
      # conversion guard and resumes the winner's plan.
      assert {:ok, :awaiting_others} =
               SocialFlow.respond_to_option(%{option_id: option.id, user_id: alex(), response: "accept", trace_id: "t1"})

      assert {:ok, %{plan: plan}} =
               SocialFlow.respond_to_option(%{option_id: option.id, user_id: jordan(), response: "accept", trace_id: "t2"})

      assert {:ok, %{plan: resumed}} =
               SocialFlow.respond_to_option(%{option_id: option.id, user_id: alex(), response: "accept", trace_id: "t3"})

      assert resumed.id == plan.id

      plan_count =
        from(p in SharedPlan, where: p.created_from_proposal_id == ^proposal.id, select: count(p.id))
        |> Repo.one()

      assert plan_count == 1
      assert %Proposal{status: "converted"} = Repo.get!(Proposal, proposal.id)
      assert %PlanOption{status: "selected"} = Repo.get!(PlanOption, option.id)

      # Nothing stuck mid-flow.
      stuck =
        from(p in Proposal,
          where: p.conversation_id == ^conv() and p.status == "approved_for_coordination",
          select: count(p.id)
        )
        |> Repo.one()

      assert stuck == 0
    end

    test "cross-thread contamination is impossible" do
      conv_b = Fixtures.conv_alex_taylor_id()
      {_p_a, _o_a, plan_a} = drive_to_plan!(conv(), alex(), jordan())
      {_p_b, _o_b, plan_b} = drive_to_plan!(conv_b, alex(), Fixtures.user_taylor_id())

      # Confirm scoped to conversation B (which has its own plan): must not
      # touch A's plan. Use B with no pending revision -> :no_pending_revision.
      # First consume B's revision-less state, then verify A untouched.
      assert {:error, :no_pending_revision} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv_b, user_id: alex(), decision: "accept", trace_id: "t"
               })

      assert %SharedPlan{time_label: t_a} = Repo.get!(SharedPlan, plan_a.id)
      assert t_a == plan_a.time_label

      revs_on_a =
        from(r in PlanRevision, where: r.plan_id == ^plan_a.id, select: count(r.id)) |> Repo.one()

      assert revs_on_a == 0

      # Cancel scoped by plan: cancelling A's plan leaves B's plan agreed.
      assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan_a.id, user_id: jordan(), trace_id: "t"})
      assert %SharedPlan{status: "cancelled"} = Repo.get!(SharedPlan, plan_a.id)
      assert %SharedPlan{status: "agreed"} = Repo.get!(SharedPlan, plan_b.id)

      # Schedule change scoped by plan: B untouched.
      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan_b.id,
                 user_id: Fixtures.user_taylor_id(),
                 new_time_label: "Sunday brunch",
                 trace_id: "t"
               })

      assert Repo.get!(SharedPlan, plan_b.id).time_label == "Sunday brunch"
      assert Repo.get!(SharedPlan, plan_a.id).time_label == t_a
    end

    test "stale superseded or dismissed proposals reject with a clear state" do
      {proposal, option} = insert_proposal!(conv(), alex())

      proposal |> Proposal.changeset(%{status: "superseded"}) |> Repo.update!()

      assert {:error, :invalid_status} =
               SocialFlow.approve_coordination(%{proposal_id: proposal.id, user_id: alex(), trace_id: "t"})

      assert {:error, :invalid_status} =
               SocialFlow.respond_to_option(%{option_id: option.id, user_id: alex(), response: "accept", trace_id: "t"})

      {p2, _} = insert_proposal!(conv(), alex())
      assert {:ok, _} = SocialFlow.dismiss_proposal(%{proposal_id: p2.id, user_id: alex(), trace_id: "t"})

      assert {:error, :invalid_status} =
               SocialFlow.approve_coordination(%{proposal_id: p2.id, user_id: alex(), trace_id: "t"})
    end

    test "change_plan_time with multiple plans mutates only the addressed plan" do
      {_p1, _o1, plan1} = drive_to_plan!(conv(), alex(), jordan())

      # A second, independent plan in the same conversation.
      {proposal2, option2} = insert_proposal!(conv(), alex())
      assert {:ok, _} = SocialFlow.approve_coordination(%{proposal_id: proposal2.id, user_id: alex(), trace_id: "t"})
      assert {:ok, :awaiting_others} = SocialFlow.respond_to_option(%{option_id: option2.id, user_id: alex(), response: "accept", trace_id: "t1"})
      assert {:ok, %{plan: plan2}} = SocialFlow.respond_to_option(%{option_id: option2.id, user_id: jordan(), response: "accept", trace_id: "t2"})
      assert plan2.id != plan1.id

      # Disambiguation is by explicit plan_id (the routing layer resolves which
      # plan "it" means); the function never guesses.
      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan2.id, user_id: jordan(), new_time_label: "Friday late", trace_id: "t"
               })

      assert Repo.get!(SharedPlan, plan2.id).time_label == "Friday late"
      assert Repo.get!(SharedPlan, plan1.id).time_label == plan1.time_label

      assert {:error, :not_found} =
               SocialFlow.change_plan_time(%{
                 plan_id: Ecto.UUID.generate(), user_id: jordan(), new_time_label: "x", trace_id: "t"
               })
    end

    test "permission boundaries fail closed everywhere, never silently" do
      taylor = Fixtures.user_taylor_id()
      {proposal, option} = insert_proposal!(conv(), alex())
      {_p, _o, plan} = drive_to_plan!(conv(), alex(), jordan())

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id, proposed_by_user_id: alex(),
                 changes: %{"time_label" => "Friday at 8:00 PM"}, trace_id: "t"
               })

      {:ok, commitment} =
        %PlanCommitment{}
        |> PlanCommitment.changeset(%{
          plan_id: plan.id, owner_user_id: alex(), description: "Book the table",
          visibility: "private", status: "proposed"
        })
        |> Repo.insert()

      attempts = [
        fn -> SocialFlow.approve_coordination(%{proposal_id: proposal.id, user_id: taylor, trace_id: "t"}) end,
        fn -> SocialFlow.respond_to_option(%{option_id: option.id, user_id: taylor, response: "accept", trace_id: "t"}) end,
        fn -> SocialFlow.propose_revision(%{plan_id: plan.id, proposed_by_user_id: taylor, changes: %{"time_label" => "x"}, trace_id: "t"}) end,
        fn -> SocialFlow.dismiss_proposal(%{proposal_id: proposal.id, user_id: taylor, trace_id: "t"}) end,
        fn -> SocialFlow.respond_to_revision(%{revision_id: rev.id, user_id: taylor, decision: "accept", trace_id: "t"}) end,
        fn -> SocialFlow.confirm_commitment(%{commitment_id: commitment.id, user_id: jordan(), trace_id: "t"}) end,
        fn -> SocialFlow.create_private_reminder(%{plan_id: plan.id, user_id: taylor, content_summary: "x", trace_id: "t"}) end,
        fn -> SocialFlow.propose_cancel_revision(%{plan_id: plan.id, user_id: taylor, trace_id: "t"}) end,
        fn -> SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: taylor, trace_id: "t"}) end,
        fn -> SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "t"}) end,
        fn -> SocialFlow.change_plan_time(%{plan_id: plan.id, user_id: taylor, new_time_label: "x", trace_id: "t"}) end,
        fn -> SocialFlow.change_plan_time(%{plan_id: plan.id, user_id: alex(), new_time_label: "x", trace_id: "t"}) end,
        fn -> SocialFlow.change_plan_date(%{plan_id: plan.id, user_id: alex(), new_date_label: "x", trace_id: "t"}) end,
        fn -> SocialFlow.confirm_pending_revision(%{conversation_id: conv(), user_id: taylor, decision: "accept", trace_id: "t"}) end
      ]

      for attempt <- attempts do
        assert match?({:error, _}, attempt.()),
               "unauthorized attempt must fail closed, got: #{inspect(attempt.())}"
      end

      # And the plan is exactly as it was: nothing moved.
      assert %SharedPlan{status: "agreed", time_label: t} = Repo.get!(SharedPlan, plan.id)
      assert t == plan.time_label
      assert %PlanRevision{status: "proposed"} = Repo.get!(PlanRevision, rev.id)
    end
  end
end
