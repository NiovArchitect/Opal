defmodule OpalCore.SocialFlow.PlanTruthAttendanceTest do
  @moduledoc """
  Repair #18 (Division A, plan truth) - the ONE counter.

  Walk failure (F18-01): the Juniper crew read "4 of 4 going" on the graph
  and "3 of 4 going" in the chat log because there was no backend number at
  all - the seed wrote attendance talk with ZERO PlanParticipant rows
  (Mac evidence: zero rsvp/participant rows DB-wide), so every surface
  invented its own fixture.

  These tests pin the fix end to end:
  seed -> participant rows -> the one counter -> every projection agrees.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    ConversationAlignment,
    FounderCommunicationSeed,
    HomeProjection,
    JourneyAuthority,
    PlanParticipant,
    SharedPlan
  }

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r18a-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp participants(plan_id) do
    from(pp in PlanParticipant, where: pp.plan_id == ^plan_id) |> Repo.all()
  end

  defp crew_row(viewer_id) do
    viewer_id
    |> Messages.list_conversations()
    |> Enum.find(&(&1["title"] == "Saturday Crew"))
  end

  describe "Juniper crew seed materialization" do
    test "seed writes plan + participant rows; counter and projections agree 4/4, then 3/4 after a decline" do
      viewer = mk_user("Founder")

      assert {:ok, payload} =
               FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

      peers = FounderCommunicationSeed.peer_ids()
      crew_ids = [viewer.id, peers.chanelle, peers.maya, peers.jordan]
      plan_id = payload["group_plan"]["shared_plan_id"]
      assert is_binary(plan_id)
      assert payload["group_plan"]["going_count"] == 4
      assert payload["group_plan"]["total_count"] == 4

      # Rows: exactly the 4 crew members, all accepted (the 3 seeded
      # attendance messages are the RSVP evidence; the viewer convened).
      rows = participants(plan_id)
      assert length(rows) == 4
      assert MapSet.new(Enum.map(rows, & &1.user_id)) == MapSet.new(crew_ids)
      assert Enum.all?(rows, &(&1.response_state == "accepted"))
      lead = Enum.find(rows, &(&1.user_id == viewer.id))
      assert lead.role == "lead"

      # The ONE counter.
      assert JourneyAuthority.participation_counts(plan_id) ==
               %{going: 4, interested: 0, total: 4}

      assert JourneyAuthority.participation_counts(plan_id, viewer.id).viewer_state ==
               "accepted"

      # Projection agreement: chats list (HomeProjection via
      # list_conversations) carries the same numbers + viewer_state.
      row = crew_row(viewer.id)
      assert row["plan_projection"]["going_count"] == 4
      assert row["plan_projection"]["total_count"] == 4
      assert row["plan_projection"]["viewer_state"] == "accepted"

      # Center/Graphs list path (list_plans_for_user -> plan_payload).
      assert {:ok, listed} =
               OpalCore.SocialFlow.list_plans_for_user(viewer.id)

      listed_plan = Enum.find(listed, &(&1["id"] == plan_id))
      assert listed_plan["going_count"] == 4
      assert listed_plan["total_count"] == 4
      assert listed_plan["viewer_state"] == "accepted"

      # Journey/graph projection path (JourneyAuthority.project).
      plan = Repo.get!(SharedPlan, plan_id)
      journey = JourneyAuthority.project(plan, viewer.id, %{})
      assert journey["going_count"] == 4
      assert journey["total_count"] == 4
      assert journey["viewer_state"] == "accepted"

      # A peer's view of the same plan: same numbers, their own state.
      maya_view = JourneyAuthority.project(plan, peers.maya, %{})
      assert maya_view["going_count"] == 4
      assert maya_view["total_count"] == 4
      assert maya_view["viewer_state"] == "accepted"

      # One decline (Maya can't make it): 3/4 EVERYWHERE, total stays 4.
      assert {:ok, _} = JourneyAuthority.cant_make_it(plan_id, peers.maya)

      assert JourneyAuthority.participation_counts(plan_id) ==
               %{going: 3, interested: 0, total: 4}

      row_after = crew_row(viewer.id)
      assert row_after["plan_projection"]["going_count"] == 3
      assert row_after["plan_projection"]["total_count"] == 4

      assert {:ok, listed_after} =
               OpalCore.SocialFlow.list_plans_for_user(viewer.id)

      assert Enum.find(listed_after, &(&1["id"] == plan_id))["going_count"] == 3

      journey_after = JourneyAuthority.project(Repo.get!(SharedPlan, plan_id), viewer.id, %{})
      assert journey_after["going_count"] == 3
      assert journey_after["total_count"] == 4

      # Maya's own state reads canonically as declined on her projection.
      maya_after = JourneyAuthority.project(Repo.get!(SharedPlan, plan_id), peers.maya, %{})
      assert maya_after["viewer_state"] == "declined"
      assert maya_after["viewer"]["response_state"] == "declined"
    end

    test "seed is idempotent for plan + participants" do
      viewer = mk_user("Founder")

      assert {:ok, first} = FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)
      assert {:ok, second} = FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

      assert first["group_plan"]["shared_plan_id"] == second["group_plan"]["shared_plan_id"]
      assert length(participants(first["group_plan"]["shared_plan_id"])) == 4
    end
  end

  describe "attendance contract honesty" do
    test "a plan with no participant rows carries NO count fields" do
      a = mk_user("A")
      b = mk_user("B")

      {:ok, conv} =
        Messages.create_group_conversation(a.id, [b.id, mk_user("C").id], label: "NoPlan Crew")

      # An eligible-looking alignment with no plan behind it at all.
      alignment = %{
        "commitment" => "aligned",
        "date" => %{"value" => "Saturday"},
        "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
        "place" => %{"state" => "locked", "value" => "Juniper"}
      }

      card = HomeProjection.from_alignment(alignment, conv.conversation_id, 3, viewer_id: a.id)
      assert is_map(card)
      refute Map.has_key?(card, "going_count")
      refute Map.has_key?(card, "total_count")
      refute Map.has_key?(card, "viewer_state")

      # A real plan row with zero participants: still no counts.
      {:ok, plan} =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          conversation_id: conv.conversation_id,
          title: "Empty",
          status: "agreed",
          location: "Juniper",
          time_label: "Saturday",
          created_by_user_id: a.id,
          alignment: Map.put(alignment, "lineage_id", Ecto.UUID.generate())
        })
        |> Repo.insert()

      card2 =
        HomeProjection.from_alignment(
          Map.put(alignment, "lineage_id", plan.id),
          conv.conversation_id,
          3,
          viewer_id: a.id
        )

      assert is_map(card2)
      refute Map.has_key?(card2, "going_count")
      refute Map.has_key?(card2, "total_count")
      refute Map.has_key?(card2, "viewer_state")

      assert JourneyAuthority.attendance_contract(plan.id, a.id) == %{}
    end

    test "absent plan projection is nil, never a fabricated count" do
      assert HomeProjection.from_alignment(%{"prompt" => "hi"}, Ecto.UUID.generate(), 2) == nil
      assert HomeProjection.from_alignment(nil, Ecto.UUID.generate(), 2) == nil
    end
  end

  describe "canonical vocabulary" do
    test "participation_counts reads legacy spellings through the one vocabulary" do
      a = mk_user("A")

      {:ok, plan} =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          title: "Vocab",
          status: "agreed",
          location: "Juniper",
          source: "center",
          created_by_user_id: a.id
        })
        |> Repo.insert()

      states = %{
        "accepted" => "accepted",
        "proposed" => "pending",
        "tentative" => "pending",
        "pending" => "pending",
        "withdrawn" => "declined",
        "declined" => "declined"
      }

      for {stored, _canonical} <- states do
        u = mk_user("U")

        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan.id,
          user_id: u.id,
          role: "participant",
          response_state: stored,
          authority_source: "test"
        })
        |> Repo.insert!()
      end

      counts = JourneyAuthority.participation_counts(plan.id)
      # 1 accepted going; proposed + tentative + pending = 3 interested;
      # total counts every row including both declined spellings.
      assert counts == %{going: 1, interested: 3, total: 6}

      # Viewer semantics: own pending is the viewer's action state - it is
      # reported as viewer_state "pending" and never inflates going.
      pending_user =
        from(pp in PlanParticipant,
          where: pp.plan_id == ^plan.id and pp.response_state == "proposed",
          select: pp.user_id
        )
        |> Repo.one!()

      scoped = JourneyAuthority.participation_counts(plan.id, pending_user)
      assert scoped.going == 1
      assert scoped.viewer_state == "pending"

      for {stored, canonical} <- states do
        assert PlanParticipant.canonical_response_state(stored) == canonical
      end

      assert PlanParticipant.canonical_response_states() == ~w(accepted pending declined)
    end
  end

  describe "fold-born plans" do
    test "the alignment fold writes participant rows for ALL conversation members" do
      founder = mk_user("Founder")
      peer1 = mk_user("Peer One")
      peer2 = mk_user("Peer Two")

      {:ok, conv} =
        Messages.create_group_conversation(founder.id, [peer1.id, peer2.id], label: "Fold Crew")

      cid = conv.conversation_id

      say = fn sender, body, client_id ->
        assert {:ok, _msg, :created} =
                 Messages.accept_message(%{
                   conversation_id: cid,
                   sender_user_id: sender,
                   client_message_id: client_id,
                   message_type: "text",
                   body: body
                 })
      end

      say.(founder.id, "Can you meet tomorrow?", "r18a-fold-1")
      say.(peer1.id, "Any time after 6 works.", "r18a-fold-2")
      say.(peer2.id, "Let's do 6:30.", "r18a-fold-3")

      _state = ConversationAlignment.sync_conversation(cid)

      plan = ConversationAlignment.active_plan_for_conversation(cid)
      assert %SharedPlan{} = plan

      rows = participants(plan.id)
      member_ids = [founder.id, peer1.id, peer2.id]
      assert MapSet.new(Enum.map(rows, & &1.user_id)) == MapSet.new(member_ids)

      # Door semantics match create_tentative_plan_from_conversation: the
      # creating member is lead + accepted, everyone else pending, all in
      # the canonical vocabulary (no proposed/tentative spellings).
      assert Enum.count(rows, &(&1.response_state == "accepted" and &1.role == "lead")) == 1
      assert Enum.count(rows, &(&1.response_state == "pending")) == 2
      assert Enum.all?(rows, &(&1.response_state in ~w(accepted pending declined)))

      counts = JourneyAuthority.participation_counts(plan.id)
      assert counts.total == 3
      assert counts.going == 1
      assert counts.interested == 2
    end
  end
end
