defmodule OpalCore.SocialFlow.Repair16ProactivityTest do
  @moduledoc """
  Repair #16 (W4) — proactivity P1 / P3 / P4 / P5, on fresh randomized
  accounts throughout (no fixture people).

  - P3: PlanRecentChanges producer wired into every material mutation
    (revision accept, direct schedule edit, journey material change,
    cancel via revision, direct cancel) — and ONLY those: rejects,
    partial approvals, and refused mutations record nothing.
  - P4: TFT waiting_on / open_question / execution producers wired only
    from explicit structured actions (commitment confirm, revision
    proposal naming required approvers, reservation execution states),
    with asserted refusals for weak/absent signals.
  - P5: celebration preparation inside the curation READ path only.
  - P1: temporal-anchor proactive initiation behind the additive
    opt-in setting (default OFF), with opt-out / quiet-hours / cap /
    per-plan dedup attacks.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.Intelligence.ProactiveConversation
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.OpalConversations
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.BookingAuthorization
  alias OpalCore.SocialFlow.FollowThrough
  alias OpalCore.SocialFlow.FollowThroughProducers
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlanCommitment
  alias OpalCore.SocialFlow.PlanCompletion
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.ProductShell
  alias OpalCore.SocialFlow.ReservationExecution
  alias OpalCore.SocialFlow.ShellRecentChange
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.TemporalFollowThroughLoop
  alias OpalCore.SocialMemory.ConversationIndex
  alias OpalCore.SocialMemory.ProactiveThreadLog
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.TrustTiers

  # --- helpers ---------------------------------------------------------------

  defp fresh_user(name \\ "R16") do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r16-#{suffix}",
      display_name: "#{name} #{suffix}"
    })
    |> Repo.insert!()
  end

  defp fresh_conversation(users) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "r16-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for user <- users do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
      |> Repo.insert!()
    end

    conv
  end

  defp make_plan(conv, creator, attrs \\ %{}) do
    {:ok, plan, _participants} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv.id,
        creator.id,
        Map.merge(
          %{
            "title" => "Dinner with crew",
            "place" => "Juniper & Ivy",
            "location" => "Juniper & Ivy",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp recent_changes(owner_id, plan_id) do
    from(c in ShellRecentChange,
      where: c.owner_user_id == ^owner_id and c.plan_id == ^plan_id,
      order_by: [asc: c.inserted_at]
    )
    |> Repo.all()
  end

  defp loops(where) do
    from(l in TemporalFollowThroughLoop, where: ^where) |> Repo.all()
  end

  defp set_relationship(owner, other, type, subtype \\ nil) do
    assert {:ok, _} = Relationships.set_type(owner.id, other.id, type)

    if subtype do
      assert {:ok, _} = Relationships.set_family_subtype(owner.id, other.id, subtype)
    end
  end

  # ===========================================================================
  # P3 — recent changes producer
  # ===========================================================================

  describe "P3 recent changes" do
    test "direct schedule edit records truthful entries for participants only" do
      a = fresh_user()
      b = fresh_user()
      c = fresh_user()
      outsider = fresh_user()
      conv = fresh_conversation([a, b, c])
      plan = make_plan(conv, a)

      assert {:ok, %{plan: _changed}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "r16-p3"
               })

      for owner <- [a, b, c] do
        entries = recent_changes(owner.id, plan.id)
        assert length(entries) == 1
        assert hd(entries).explanation == "Dinner with crew moved to Sat 8:00 PM."
        assert hd(entries).title == "Dinner with crew"
      end

      # The change is visible on the owner's Home surface…
      # (ShellRecentChange.to_contract carries title/explanation, not plan_id.)
      home = ProductShell.home_snapshot(%{user_id: b.id})

      assert Enum.any?(
               home["recent_changes"],
               &(&1["explanation"] == "Dinner with crew moved to Sat 8:00 PM.")
             )

      # …and the outsider has nothing, in rows or on the surface.
      assert recent_changes(outsider.id, plan.id) == []
      outsider_home = ProductShell.home_snapshot(%{user_id: outsider.id})

      refute Enum.any?(
               outsider_home["recent_changes"],
               &(&1["explanation"] =~ "Dinner with crew")
             )
    end

    test "sequence change → change → cancel records exactly one entry per mutation, in order" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a)

      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "r16-p3-seq"
               })

      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 9:15 PM",
                 trace_id: "r16-p3-seq"
               })

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 trace_id: "r16-p3-seq"
               })

      assert cancelled.status == "cancelled"

      for owner <- [a, b] do
        explanations = Enum.map(recent_changes(owner.id, plan.id), & &1.explanation)

        assert explanations == [
                 "Dinner with crew moved to Sat 8:00 PM.",
                 "Dinner with crew moved to Sat 9:15 PM.",
                 "Dinner with crew was cancelled."
               ]
      end
    end

    test "revision accept records the change; reject and partial approval record nothing" do
      a = fresh_user()
      b = fresh_user()
      c = fresh_user()
      conv = fresh_conversation([a, b, c])
      plan = make_plan(conv, a)

      # b proposes; a approves (partial — nothing mutated, nothing recorded);
      # c approves (applied — exactly one entry per owner).
      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 9:00 PM"},
                 trace_id: "r16-p3-rev"
               })

      assert {:ok, %OpalCore.SocialFlow.PlanRevision{}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "r16-p3-rev"
               })

      for owner <- [a, b, c], do: assert(recent_changes(owner.id, plan.id) == [])

      assert {:ok, %{plan: applied}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: c.id,
                 decision: "accept",
                 trace_id: "r16-p3-rev"
               })

      assert applied.time_label == "Sat 9:00 PM"

      for owner <- [a, b, c] do
        entries = recent_changes(owner.id, plan.id)
        assert length(entries) == 1
        assert hd(entries).explanation == "Dinner with crew moved to Sat 9:00 PM."
      end

      # A second proposal that gets REJECTED records nothing new.
      assert {:ok, %{revision: rev2}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 10:00 PM"},
                 trace_id: "r16-p3-rev2"
               })

      assert {:ok, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev2.id,
                 user_id: a.id,
                 decision: "reject",
                 trace_id: "r16-p3-rev2"
               })

      for owner <- [a, b, c], do: assert(length(recent_changes(owner.id, plan.id)) == 1)
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 9:00 PM"
    end

    test "cancel via revision records a cancellation (and only a cancellation)" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a)

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_cancel_revision(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 trace_id: "r16-p3-cancelrev"
               })

      # Required approver is the other member (lead already proposed).
      assert {:ok, %{plan: applied}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: b.id,
                 decision: "accept",
                 trace_id: "r16-p3-cancelrev"
               })

      assert applied.status == "cancelled"

      for owner <- [a, b] do
        entries = recent_changes(owner.id, plan.id)
        assert length(entries) == 1
        assert hd(entries).explanation == "Dinner with crew was cancelled."
        # Truth law: no "moved/rescheduled" claim for a plan that only cancelled.
        refute hd(entries).explanation =~ "moved"
      end
    end

    test "journey material change records an entry; non-material change records none" do
      lead = fresh_user()
      peer = fresh_user()
      conv = fresh_conversation([lead, peer])

      {:ok, journey} =
        JourneyAuthority.activate(%{
          "user_id" => lead.id,
          "conversation_id" => conv.id,
          "title" => "Dinner",
          "location" => "Juniper & Ivy",
          "time_label" => "Saturday · 7:30 PM",
          "travel_minutes" => 15
        })

      plan_id = journey["plan_id"]
      {:ok, _} = JourneyAuthority.add_people(plan_id, lead.id, [peer.id])

      assert {:ok, changed} =
               JourneyAuthority.material_change(plan_id, lead.id, %{
                 "time_label" => "Saturday · 9:00 PM"
               })

      assert changed["material"] == true

      for owner <- [lead, peer] do
        entries = recent_changes(owner.id, plan_id)
        assert length(entries) == 1
        assert hd(entries).explanation == "Dinner moved to Saturday · 9:00 PM."
      end

      # Non-material write (no material fields) → no new entry.
      assert {:ok, noop} = JourneyAuthority.material_change(plan_id, lead.id, %{})
      assert noop["material"] == false
      for owner <- [lead, peer], do: assert(length(recent_changes(owner.id, plan_id)) == 1)
    end

    test "forgery: a non-participant cannot cause entries on another plan" do
      a = fresh_user()
      b = fresh_user()
      attacker = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a)

      # Attacker is not a member / not lead: every mutation path refuses.
      assert {:error, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: attacker.id,
                 new_time_label: "Sat 11:00 PM",
                 trace_id: "r16-p3-forge"
               })

      assert {:error, _} =
               SocialFlow.cancel_plan(%{
                 plan_id: plan.id,
                 user_id: attacker.id,
                 trace_id: "r16-p3-forge"
               })

      assert {:error, _} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: attacker.id,
                 changes: %{"time_label" => "Sat 11:00 PM"},
                 trace_id: "r16-p3-forge"
               })

      # Nothing recorded for anyone; plan untouched.
      assert Repo.aggregate(ShellRecentChange, :count) == 0
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
    end

    test "identical entries across relationship types (family subtype, close_friend, business, acquaintance)" do
      for {type, subtype} <- [
            {"family", "sibling"},
            {"family", "parent"},
            {"close_friend", nil},
            {"business", nil},
            {"acquaintance", nil}
          ] do
        a = fresh_user()
        b = fresh_user()
        set_relationship(a, b, type, subtype)
        conv = fresh_conversation([a, b])
        plan = make_plan(conv, a)

        assert {:ok, _} =
                 SocialFlow.change_plan_time(%{
                   plan_id: plan.id,
                   user_id: a.id,
                   new_time_label: "Sat 8:00 PM",
                   trace_id: "r16-p3-types"
                 })

        for owner <- [a, b] do
          entries = recent_changes(owner.id, plan.id)
          assert length(entries) == 1, "type #{type}/#{subtype} diverged"
          assert hd(entries).explanation == "Dinner with crew moved to Sat 8:00 PM."
        end
      end
    end
  end

  # ===========================================================================
  # P4 — TFT kinds from explicit signals only
  # ===========================================================================

  describe "P4 waiting_on" do
    defp make_commitment(plan, owner, attrs \\ %{}) do
      %PlanCommitment{}
      |> PlanCommitment.changeset(
        Map.merge(
          %{
            plan_id: plan.id,
            owner_user_id: owner.id,
            description: "Book the restaurant",
            visibility: "private",
            status: "proposed"
          },
          attrs
        )
      )
      |> Repo.insert!()
    end

    defp with_future_start(plan, days \\ 3) do
      start =
        DateTime.utc_now()
        |> DateTime.add(days * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)

      plan
      |> SharedPlan.changeset(%{start_at: start})
      |> Repo.update!()
    end

    test "confirming a commitment registers waiting_on with the plan-start deadline; completing closes it" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a) |> with_future_start()
      commitment = make_commitment(plan, b)

      # Proposed (extraction-shaped) is NOT a commitment yet: no loop.
      assert loops(plan_id: plan.id) == []

      assert {:ok, confirmed} =
               SocialFlow.confirm_commitment(%{
                 commitment_id: commitment.id,
                 user_id: b.id,
                 trace_id: "r16-p4-wait"
               })

      assert confirmed.status == "confirmed"

      assert [loop] = loops(plan_id: plan.id)
      assert loop.kind == "waiting_on"
      assert loop.status == "open"
      assert loop.responsibility_user_id == b.id
      assert loop.semantic_deadline_at == plan.start_at
      assert loop.metadata["deadline_source"] == "plan_start"
      assert Enum.sort(loop.participant_ids) == Enum.sort([a.id, b.id])

      assert {:ok, _result, :created} =
               FollowThrough.complete_commitment(%{
                 commitment_id: commitment.id,
                 user_id: b.id,
                 share: false,
                 idempotency_key: "r16-p4-complete-#{commitment.id}"
               })

      assert [%{status: "completed"}] = loops(plan_id: plan.id)
    end

    test "a commitment's own due_at wins over the plan start" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a) |> with_future_start(5)

      due =
        DateTime.utc_now()
        |> DateTime.add(2 * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)

      commitment = make_commitment(plan, b, %{due_at: due})

      assert {:ok, _} =
               SocialFlow.confirm_commitment(%{
                 commitment_id: commitment.id,
                 user_id: b.id,
                 trace_id: "r16-p4-due"
               })

      assert [loop] = loops(plan_id: plan.id)
      assert loop.semantic_deadline_at == due
      assert loop.metadata["deadline_source"] == "commitment_due_at"
    end

    test "refusal: no deadline anywhere → no loop, honestly skipped" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a)
      commitment = make_commitment(plan, b)

      # Direct producer refusal is explicit…
      assert {:skipped, :no_deadline} =
               FollowThroughProducers.register_waiting_on_commitment(commitment, plan)

      # …and the real confirm path creates no loop either.
      assert {:ok, _} =
               SocialFlow.confirm_commitment(%{
                 commitment_id: commitment.id,
                 user_id: b.id,
                 trace_id: "r16-p4-nodeadline"
               })

      assert loops(plan_id: plan.id) == []
    end

    test "chat text never registers loops (weak intent is not a commitment)" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      _plan = make_plan(conv, a)

      for {seq, {sender, body}} <-
            Enum.with_index(
              [
                {a, "I'll know Friday whether I can book it"},
                {b, "I will confirm by Friday, remind me"},
                {a, "Can you book the restaurant for Saturday?"}
              ],
              1
            ) do
        %Message{}
        |> Message.create_changeset(%{
          id: Ecto.UUID.generate(),
          conversation_id: conv.id,
          sender_user_id: sender.id,
          client_message_id: Ecto.UUID.generate(),
          body: body,
          server_seq: seq,
          message_type: "text"
        })
        |> Repo.insert!()
      end

      _ = OpalCore.SocialFlow.ConversationAlignment.sync_conversation(conv.id)

      assert Repo.aggregate(TemporalFollowThroughLoop, :count) == 0
    end
  end

  describe "P4 open_question" do
    test "proposing a revision registers one loop per required approver; answers complete them" do
      a = fresh_user()
      b = fresh_user()
      c = fresh_user()
      conv = fresh_conversation([a, b, c])
      plan = make_plan(conv, a)

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 9:00 PM"},
                 trace_id: "r16-p4-oq"
               })

      questions = loops(kind: "open_question")

      assert Enum.sort(Enum.map(questions, & &1.responsibility_user_id)) ==
               Enum.sort([a.id, c.id])

      assert Enum.all?(questions, &(&1.source_id == rev.id and &1.metadata["blocking"] == true))

      # a answers (partial approval): only a's loop completes.
      assert {:ok, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "r16-p4-oq"
               })

      by_resp = Map.new(loops(kind: "open_question"), &{&1.responsibility_user_id, &1.status})
      assert by_resp[a.id] == "completed"
      assert by_resp[c.id] == "open"

      # c answers (applied): all loops for the revision complete.
      assert {:ok, %{plan: _}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: c.id,
                 decision: "accept",
                 trace_id: "r16-p4-oq"
               })

      assert Enum.all?(loops(kind: "open_question"), &(&1.status == "completed"))
    end

    test "reject settles every open_question loop for the revision" do
      a = fresh_user()
      b = fresh_user()
      conv = fresh_conversation([a, b])
      plan = make_plan(conv, a)

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 9:00 PM"},
                 trace_id: "r16-p4-oq-reject"
               })

      assert [%{responsibility_user_id: resp}] = loops(kind: "open_question")
      assert resp == a.id

      assert {:ok, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "reject",
                 trace_id: "r16-p4-oq-reject"
               })

      assert [%{status: "completed"}] = loops(kind: "open_question")
    end

    test "refusal: a revision with no required approvers registers nothing" do
      a = fresh_user()
      conv = fresh_conversation([a])
      plan = make_plan(conv, a)

      # Direct producer refusal.
      revision = %OpalCore.SocialFlow.PlanRevision{
        id: Ecto.UUID.generate(),
        plan_id: plan.id,
        required_approvals: []
      }

      assert {:skipped, :no_required_approvers} =
               FollowThroughProducers.register_open_questions(revision, plan)

      # Real path: solo conversation proposal has nobody to answer.
      assert {:ok, %{revision: _rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: a.id,
                 changes: %{"time_label" => "Sat 9:00 PM"},
                 trace_id: "r16-p4-oq-solo"
               })

      assert loops(kind: "open_question") == []
    end
  end

  describe "P4 execution" do
    defp issue_auth!(actor_id, reality_id, overrides \\ %{}) do
      base = %{
        "actor_user_id" => actor_id,
        "provider_place_id" => "rest-juniper-ivy",
        "place_display_name" => "Juniper & Ivy",
        "party_size" => 2,
        "slot_label" => "Thursday · 7:30 PM",
        "slot_id" => "slot-730",
        "reality_id" => reality_id,
        "explicit_confirm" => true
      }

      {:ok, auth} = BookingAuthorization.issue(Map.merge(base, overrides))
      auth
    end

    defp book!(actor, reality_id, overrides \\ %{}, auth_overrides \\ %{}) do
      auth = issue_auth!(actor.id, reality_id, auth_overrides)

      attrs =
        Map.merge(
          %{
            "authorization" => auth,
            "provider_place_id" => "rest-juniper-ivy",
            "place_display_name" => "Juniper & Ivy",
            "party_size" => 2,
            "slot_id" => "slot-730",
            "slot_label" => "Thursday · 7:30 PM",
            "reality_id" => reality_id,
            "idempotency_key" => "r16-exec-#{Ecto.UUID.generate()}"
          },
          overrides
        )

      {:ok, result} = ReservationExecution.request_booking(attrs)
      result
    end

    test "confirmed execution registers and resolves an execution loop; double-book stays one loop" do
      actor = fresh_user()
      reality = Ecto.UUID.generate()

      result = book!(actor, reality)
      exec_id = result["execution"]["execution_id"]
      assert result["execution"]["status"] == "confirmed"

      assert [loop] = loops(kind: "execution")
      assert loop.source_id == exec_id
      assert loop.execution_status == "confirmed"
      assert loop.status == "completed"
      assert loop.responsibility_user_id == actor.id

      # Idempotent re-request (same key path) does not duplicate the loop.
      auth = issue_auth!(actor.id, reality)

      assert {:ok, again} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "slot_label" => "Thursday · 7:30 PM",
                 "reality_id" => reality,
                 "idempotency_key" => "r16-exec-fixed-key"
               })

      assert {:ok, _} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "slot_label" => "Thursday · 7:30 PM",
                 "reality_id" => reality,
                 "idempotency_key" => "r16-exec-fixed-key"
               })

      assert again["execution"]["execution_id"] != exec_id
      assert length(loops(kind: "execution")) == 2
    end

    test "failed execution leaves an open, due execution loop" do
      actor = fresh_user()
      reality = Ecto.UUID.generate()

      result =
        book!(
          actor,
          reality,
          %{"scenario" => "fail", "provider_place_id" => "rest-fail-slot"},
          %{"provider_place_id" => "rest-fail-slot"}
        )

      assert result["execution"]["status"] == "failed"

      assert [loop] = loops(kind: "execution")
      assert loop.execution_status == "failed"
      assert loop.status == "open"

      evaluated = OpalCore.SocialFlow.TemporalFollowThrough.evaluate(loop)
      assert evaluated["maturity"] == "due"
      assert evaluated["reason"] == "execution_failed"
    end

    test "cancelling a confirmed execution cancels its loop" do
      actor = fresh_user()
      reality = Ecto.UUID.generate()
      result = book!(actor, reality)
      exec_id = result["execution"]["execution_id"]

      assert {:ok, _} = ReservationExecution.cancel(exec_id, actor.id)
      assert [%{status: "cancelled"}] = loops(kind: "execution")
    end

    test "refusal: pre-execution states register nothing" do
      actor = fresh_user()

      row =
        %OpalCore.SocialFlow.ReservationExecutionRecord{}
        |> OpalCore.SocialFlow.ReservationExecutionRecord.changeset(%{
          reality_id: Ecto.UUID.generate(),
          actor_user_id: actor.id,
          provider_place_id: "rest-juniper-ivy",
          status: "available",
          idempotency_key: "r16-exec-pre-#{Ecto.UUID.generate()}"
        })
        |> Repo.insert!()

      assert {:skipped, :not_execution_status} = FollowThroughProducers.sync_execution_loop(row)
      assert loops(kind: "execution") == []
    end
  end

  # ===========================================================================
  # P5 — celebration preparation (pull-side only)
  # ===========================================================================

  describe "P5 celebration preparation" do
    defp celebration_in(owner, person, days) do
      date = Date.add(Date.utc_today(), days)

      {:ok, c} =
        Celebrations.create(owner.id, %{
          "person_name" => person,
          "kind" => "birthday",
          "month" => date.month,
          "day" => date.day
        })

      c
    end

    test "owner reading a celebration gets deterministic preparation; bands follow days-until" do
      owner = fresh_user()

      for {days, band} <- [
            {0, "today"},
            {1, "tomorrow"},
            {5, "this_week"},
            {12, "soon"},
            {40, "plenty"}
          ] do
        c = celebration_in(owner, "Maya#{days}", days)
        assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
        prep = curation.preparation
        assert prep.days_until == days
        assert prep.lead_time == band
        assert prep.person_name == "Maya#{days}"
        assert prep.actions != []
        assert Enum.all?(prep.actions, &is_binary/1)
      end

      # The contract (API shape) carries the preparation too.
      c = celebration_in(owner, "Contract", 5)
      {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
      contract = CelebrationCuration.to_contract(curation)
      assert contract["preparation"]["lead_time"] == "this_week"
      assert contract["preparation"]["days_until"] == 5
    end

    test "full mode grounds preparation in real shared history with the person" do
      owner = fresh_user()
      maya = fresh_user("Maya")
      # resolve_recipient matches on display_name == person_name exactly.
      maya = Repo.get!(User, maya.id)

      {:ok, _} = TrustTiers.grant_tier(owner.id, "known", "system")
      {:ok, _} = TrustTiers.grant_tier(owner.id, "trusted", "system")

      conv = fresh_conversation([owner, maya])
      plan = make_plan(conv, owner, %{"title" => "Beach picnic"})
      _ = plan

      c = celebration_in(owner, maya.display_name, 5)

      assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
      assert curation.mode == :full
      prep = curation.preparation
      assert prep.based_on["past_plans_together"] >= 1
      assert prep.based_on["last_plan_title"] == "Beach picnic"
      assert Enum.any?(prep.actions, &String.contains?(&1, "Beach picnic"))
    end

    test "non-owner never receives preparation" do
      owner = fresh_user()
      stranger = fresh_user()
      c = celebration_in(owner, "Maya", 5)

      assert {:error, :not_found} = CelebrationCuration.curate_for(stranger.id, c.id)
    end

    test "reading preparations writes nothing anywhere (no push, no loop, no feed item)" do
      owner = fresh_user()
      c = celebration_in(owner, "Maya", 5)

      feed_before = AttentionCenter.feed(owner.id)

      items_before =
        length(feed_before["needs_you"]) + length(feed_before["waiting"]) +
          length(feed_before["updated"])

      for _ <- 1..3 do
        assert {:ok, _} = CelebrationCuration.curate_for(owner.id, c.id)
      end

      feed_after = AttentionCenter.feed(owner.id)

      items_after =
        length(feed_after["needs_you"]) + length(feed_after["waiting"]) +
          length(feed_after["updated"])

      assert items_after == items_before
      assert Repo.aggregate(TemporalFollowThroughLoop, :count) == 0
      assert Repo.aggregate(ProactiveThreadLog, :count) == 0
      assert Repo.aggregate(OpalCore.SocialFlow.ShellNeedsYouItem, :count) == 0
    end
  end

  # ===========================================================================
  # P1 — proactive initiation, consent-gated
  # ===========================================================================

  describe "P1 temporal anchor" do
    defp proactive_ready_user do
      user = fresh_user()

      # AttentionBudget enforces the OWNER's quiet window (default
      # 22:00–08:00) with no bypass for proactive_thread. Pin the
      # preference to UTC with a one-hour quiet window two hours from
      # now, so initiation tests are deterministic at any wall-clock
      # run time. (The quiet-hours ATTACKS below are exercised through
      # ProactiveConversation's own gate via the local_hour seam.)
      now_h = DateTime.utc_now().hour
      qs = rem(now_h + 2, 24)
      qe = rem(now_h + 3, 24)
      pad = fn h -> String.pad_leading(Integer.to_string(h), 2, "0") end

      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: user.id,
        timezone: "UTC",
        intelligence_maturity: "established",
        quiet_hours_start: "#{pad.(qs)}:00",
        quiet_hours_end: "#{pad.(qe)}:00"
      })
      |> Repo.insert!()

      %ConversationIndex{}
      |> ConversationIndex.changeset(%{
        account_id: user.id,
        conversation_id: Ecto.UUID.generate(),
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        rolling_summary: "active"
      })
      |> Repo.insert!()

      user
    end

    defp anchor_plan(owner, hours_from_now) do
      start =
        DateTime.utc_now()
        |> DateTime.add(trunc(hours_from_now * 3600), :second)
        |> DateTime.truncate(:microsecond)

      %SharedPlan{}
      |> SharedPlan.changeset(%{
        title: "Dinner plans",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: owner.id,
        source: "center",
        conversation_id: nil,
        start_at: start,
        time_label: "in 3 days",
        alignment: %{}
      })
      |> Repo.insert!()
    end

    defp anchor_step(steps), do: Enum.find(steps, &(&1["id"] == "proactive_anchor"))

    test "default OFF: drive never initiates, for any account" do
      owner = proactive_ready_user()
      plan = anchor_plan(owner, 72)

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, owner.id)
      step = anchor_step(steps)
      assert step["status"] == "suppressed"
      assert step["reason"] == "proactive_threads_not_enabled"

      assert Repo.aggregate(ProactiveThreadLog, :count) == 0
      {:ok, oc} = OpalConversations.get_or_create_conversation(owner.id)
      assert OpalConversations.list_messages(oc.id) == []
    end

    test "opted in: exactly one initiation per plan; re-drive is per-plan suppressed" do
      owner = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      plan = anchor_plan(owner, 72)

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, owner.id)
      assert anchor_step(steps)["status"] == "initiated"

      assert [log] = Repo.all(ProactiveThreadLog)
      assert log.account_id == owner.id
      assert log.trigger_type == "temporal_anchor_3d"
      assert log.trigger_ref_id == plan.id

      {:ok, oc} = OpalConversations.get_or_create_conversation(owner.id)
      messages = OpalConversations.list_messages(oc.id)
      assert Enum.any?(messages, fn m -> m.role == "opal" and m.body =~ "Dinner plans" end)

      # Re-drive (replay): no second thread, ever, for this plan.
      assert {:ok, %{steps: steps2}} = PlanCompletion.drive(plan.id, owner.id)
      step2 = anchor_step(steps2)
      assert step2["status"] == "suppressed"
      assert step2["reason"] == "already_initiated_for_plan"
      assert Repo.aggregate(ProactiveThreadLog, :count) == 1
    end

    test "cap attack: a second in-window plan the same day hits the daily cap" do
      owner = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      plan1 = anchor_plan(owner, 72)
      plan2 = anchor_plan(owner, 80)

      assert {:ok, %{steps: s1}} = PlanCompletion.drive(plan1.id, owner.id)
      assert anchor_step(s1)["status"] == "initiated"

      assert {:ok, %{steps: s2}} = PlanCompletion.drive(plan2.id, owner.id)
      step2 = anchor_step(s2)
      assert step2["status"] == "suppressed"
      assert step2["reason"] == "daily_cap"
      assert Repo.aggregate(ProactiveThreadLog, :count) == 1
    end

    test "opt-out attack: opt-out set after opt-in still suppresses everything" do
      owner = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      :ok = ProactiveConversation.set_opt_out(owner.id, true)
      plan = anchor_plan(owner, 72)

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, owner.id)
      step = anchor_step(steps)
      assert step["status"] == "suppressed"
      assert step["reason"] == "opt_out"
      assert Repo.aggregate(ProactiveThreadLog, :count) == 0
    end

    test "opt-in revoked mid-window: driving after disabling initiates nothing" do
      owner = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      :ok = ProactiveConversation.set_threads_enabled(owner.id, false)
      plan = anchor_plan(owner, 72)

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, owner.id)
      assert anchor_step(steps)["reason"] == "proactive_threads_not_enabled"
      assert Repo.aggregate(ProactiveThreadLog, :count) == 0
    end

    test "quiet hours attack: consent on but quiet hours → no initiation; midday → initiation" do
      owner = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      plan = anchor_plan(owner, 72)

      assert {:suppressed, :quiet_hours} =
               ProactiveConversation.maybe_initiate_temporal_anchor(owner.id, plan,
                 local_hour: 23
               )

      assert {:suppressed, :quiet_hours} =
               ProactiveConversation.maybe_initiate_temporal_anchor(owner.id, plan, local_hour: 7)

      assert Repo.aggregate(ProactiveThreadLog, :count) == 0

      assert {:ok, _} =
               ProactiveConversation.maybe_initiate_temporal_anchor(owner.id, plan,
                 local_hour: 12
               )

      assert Repo.aggregate(ProactiveThreadLog, :count) == 1
    end

    test "window + ownership gates: outside the 3-day band or not the owner → suppressed" do
      owner = proactive_ready_user()
      other = proactive_ready_user()
      :ok = ProactiveConversation.set_threads_enabled(owner.id, true)
      :ok = ProactiveConversation.set_threads_enabled(other.id, true)

      soon = anchor_plan(owner, 24)
      far = anchor_plan(owner, 120)
      in_window = anchor_plan(owner, 72)

      assert {:suppressed, :outside_anchor_window} =
               ProactiveConversation.maybe_initiate_temporal_anchor(owner.id, soon)

      assert {:suppressed, :outside_anchor_window} =
               ProactiveConversation.maybe_initiate_temporal_anchor(owner.id, far)

      assert {:suppressed, :not_plan_owner} =
               ProactiveConversation.maybe_initiate_temporal_anchor(other.id, in_window)

      assert Repo.aggregate(ProactiveThreadLog, :count) == 0
    end
  end
end
