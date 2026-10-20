defmodule OpalCoreWeb.Repair16ChatLockDriveTest do
  @moduledoc """
  Repair #16 (W4, P2) — chat-born plans run PlanCompletion.

  The hook sits at the two chat plan-lock action endpoints (place
  confirm, exact-time lock) in ConversationController and drives the
  plan AFTER the lock's sync transaction commits. Exercised through the
  real controller actions on fresh randomized accounts, across
  relationship types and lock roles:

  - a plan locked entirely in chat gets calendar projection + TFT loop
    + coming-up rows for its participants;
  - replays (duplicate lock taps, direct re-syncs, re-drives) never
    double the effects;
  - outsiders receive nothing.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query
  import Phoenix.ConnTest, only: [build_conn: 0]

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.OpalCalendar.Commitment
  alias OpalCore.SocialFlow.ProductShell
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.ShellComingUpItem
  alias OpalCore.SocialFlow.TemporalFollowThroughLoop
  alias OpalCoreWeb.ConversationController

  defp fresh_user do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r16p2-#{suffix}",
      display_name: "R16P2 #{suffix}"
    })
    |> Repo.insert!()
  end

  defp fresh_conversation(users) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: "r16p2-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for user <- users do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
      |> Repo.insert!()
    end

    conv
  end

  defp insert_message(conv, sender, body, seq) do
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

  defp action(kind, actor, value, truth, at_offset) do
    %{
      "kind" => kind,
      "actor_user_id" => actor.id,
      "value" => value,
      "truth" => truth,
      "explicit" => true,
      "schema_version" => 1,
      "at" =>
        DateTime.utc_now()
        |> DateTime.add(at_offset, :second)
        |> DateTime.truncate(:microsecond)
        |> DateTime.to_iso8601()
    }
  end

  # A chat plan with a full fold on the table: date (tomorrow, from
  # messages), an exact-time candidate (from messages), and a place
  # candidate proposed by the creator via the fold's explicit actions.
  defp chat_plan_scenario(creator, peer) do
    conv = fresh_conversation([creator, peer])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, creator.id, %{
        "title" => "Coffee meetup",
        "place" => "Bird Rock Coffee",
        "location" => "Bird Rock Coffee",
        "time_label" => "tomorrow"
      })

    insert_message(conv, creator, "Can you meet tomorrow?", 1)
    insert_message(conv, peer, "Any time after 6 works.", 2)
    insert_message(conv, creator, "Let's do 6:30 PM.", 3)

    alignment =
      Map.put(plan.alignment || %{}, "explicit_actions", [
        action("activity_lock", creator, "coffee", "user_stated", -30),
        action("place_propose", creator, "Bird Rock Coffee", "proposed", -20)
      ])

    # The plan's canonical start lives on the row (the fold's relative
    # "tomorrow" carries no resolved_on of its own — the arbitration
    # authority falls back to start_at, exactly as for Center plans).
    start_at =
      DateTime.utc_now()
      |> DateTime.add(26 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    plan =
      plan
      |> SharedPlan.changeset(%{alignment: alignment, start_at: start_at})
      |> Repo.update!()

    {conv, plan}
  end

  defp call_action(fun, conn_user, conv_id) do
    conn =
      build_conn()
      |> Plug.Conn.assign(:current_user_id, conn_user.id)

    apply(ConversationController, fun, [conn, %{"id" => conv_id}])
  end

  defp assert_driven(plan, participants) do
    plan = Repo.get!(SharedPlan, plan.id)

    steps = get_in(plan.alignment || %{}, ["completion", "steps"]) || []
    by_id = Map.new(steps, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "registered"
    assert by_id["coming_up"]["status"] == "projected"

    # TFT loop for the plan, participants complete. (I2: the plan
    # also carries the etiquette invitation_response loop its
    # creation opened for the pending peer - a different lifecycle,
    # scoped out here by kind; the drive claim is unchanged.)
    assert [loop] =
             Repo.all(
               from l in TemporalFollowThroughLoop,
                 where: l.plan_id == ^plan.id and l.kind == "plan_approach"
             )

    assert loop.kind == "plan_approach"
    assert Enum.sort(loop.participant_ids) == Enum.sort(Enum.map(participants, & &1.id))

    for user <- participants do
      # Coming-up row on the participant's own shell.
      home = ProductShell.home_snapshot(%{user_id: user.id})
      assert Enum.any?(home["coming_up"], &(&1["plan_id"] == plan.id))

      # Calendar projection: exactly one ACTIVE commitment per participant.
      active =
        Repo.all(
          from cm in Commitment,
            where:
              cm.shared_plan_id == ^plan.id and cm.owner_user_id == ^user.id and
                cm.status == "active"
        )

      assert length(active) == 1
    end

    plan
  end

  defp effect_counts(plan) do
    %{
      # Drive effects only: the lock drive's plan_approach loops.
      # (I2: plan creation separately opens the etiquette
      # invitation_response lifecycle - not a drive effect.)
      loops:
        Repo.aggregate(
          from(l in TemporalFollowThroughLoop,
            where: l.plan_id == ^plan.id and l.kind == "plan_approach"
          ),
          :count
        ),
      coming_up:
        Repo.aggregate(from(i in ShellComingUpItem, where: i.plan_id == ^plan.id), :count),
      commitments:
        Repo.aggregate(from(cm in Commitment, where: cm.shared_plan_id == ^plan.id), :count)
    }
  end

  test "place confirm by the non-creator participant drives the chat-born plan" do
    creator = fresh_user()
    peer = fresh_user()
    outsider = fresh_user()
    {conv, plan} = chat_plan_scenario(creator, peer)

    # Before the lock: nothing driven (sync alone never drives).
    _ = ConversationAlignment.sync_conversation(conv.id)
    assert effect_counts(plan) == %{loops: 0, coming_up: 0, commitments: 0}

    conn = call_action(:confirm_alignment_place, peer, conv.id)
    assert conn.status == 200

    plan = assert_driven(plan, [creator, peer])
    driven_counts = effect_counts(plan)

    # Outsider receives nothing.
    outsider_home = ProductShell.home_snapshot(%{user_id: outsider.id})
    refute Enum.any?(outsider_home["coming_up"], &(&1["plan_id"] == plan.id))

    assert Repo.aggregate(from(cm in Commitment, where: cm.owner_user_id == ^outsider.id), :count) ==
             0

    # Replay attacks: duplicate lock tap (now an honest error — place
    # already locked), direct re-syncs, and a second lock action on the
    # same plan must not double any effect.
    conn2 = call_action(:confirm_alignment_place, peer, conv.id)
    assert conn2.status == 422

    for _ <- 1..3, do: ConversationAlignment.sync_conversation(conv.id)

    # Re-syncs are pure folds: they drive nothing.
    assert effect_counts(plan) == driven_counts

    conn3 = call_action(:confirm_alignment, creator, conv.id)
    assert conn3.status == 200

    # The second lock re-drives: coming-up stays keyed per owner (2),
    # and exactly one OPEN plan_approach loop exists for the plan
    # (a version bump may supersede the first loop — never duplicate
    # it). The etiquette invitation_response loop is separate
    # machinery (I2) and is scoped out by kind below.
    assert effect_counts(plan).coming_up == 2

    open_loops =
      Repo.aggregate(
        from(l in TemporalFollowThroughLoop,
          where:
            l.plan_id == ^plan.id and l.status == "open" and
              l.kind == "plan_approach"
        ),
        :count
      )

    assert open_loops == 1

    # Calendar stays at exactly one ACTIVE commitment per participant
    # even though the second lock re-drove the plan.
    for user <- [creator, peer] do
      active =
        Repo.aggregate(
          from(cm in Commitment,
            where:
              cm.shared_plan_id == ^plan.id and cm.owner_user_id == ^user.id and
                cm.status == "active"
          ),
          :count
        )

      assert active == 1
    end
  end

  test "exact-time lock by the creator drives the chat-born plan" do
    creator = fresh_user()
    peer = fresh_user()
    {conv, plan} = chat_plan_scenario(creator, peer)

    conn = call_action(:confirm_alignment, creator, conv.id)
    assert conn.status == 200

    _plan = assert_driven(plan, [creator, peer])
  end

  test "identical drive effects across relationship types and lock roles" do
    # Place confirm is always the PEER's tap (the fold refuses
    # confirming your own proposal — :cannot_confirm_own_proposal);
    # exact-time lock is exercised from both roles.
    scenarios = [
      {"family", "sibling", :confirm_alignment_place, :peer},
      {"family", "parent", :confirm_alignment, :creator},
      {"close_friend", nil, :confirm_alignment_place, :peer},
      {"business", nil, :confirm_alignment, :peer},
      {"business", nil, :confirm_alignment, :creator},
      {"acquaintance", nil, :confirm_alignment_place, :peer}
    ]

    for {type, subtype, action_fun, locker} <- scenarios do
      creator = fresh_user()
      peer = fresh_user()
      assert {:ok, _} = Relationships.set_type(creator.id, peer.id, type)

      if subtype,
        do: assert({:ok, _} = Relationships.set_family_subtype(creator.id, peer.id, subtype))

      {conv, plan} = chat_plan_scenario(creator, peer)
      actor = if locker == :peer, do: peer, else: creator

      conn = call_action(action_fun, actor, conv.id)

      assert conn.status == 200,
             "lock failed for #{type}/#{subtype} via #{action_fun} by #{locker}: #{conn.status}"

      _plan = assert_driven(plan, [creator, peer])
    end
  end

  test "a failed lock (non-member) drives nothing" do
    creator = fresh_user()
    peer = fresh_user()
    stranger = fresh_user()
    {conv, plan} = chat_plan_scenario(creator, peer)

    conn = call_action(:confirm_alignment_place, stranger, conv.id)
    assert conn.status == 403
    assert effect_counts(plan) == %{loops: 0, coming_up: 0, commitments: 0}
  end
end
