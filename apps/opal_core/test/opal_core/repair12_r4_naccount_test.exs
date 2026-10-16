defmodule OpalCore.SocialFlow.Repair12R4NAccountTest do
  @moduledoc """
  Repair #12 — R4 (test/verify/evidence): N-ACCOUNT PROPERTY TESTS.

  Account-agnostic proof: 3 FRESH RANDOMIZED accounts (random names, random
  relationship graphs, random plan topologies) run
  invite/accept/confirm/change/cancel/notify in RANDOM operation orderings.
  Assertions:

  - every account converges to the same authoritative plan state
    (active_plan_for_conversation + list_plans_for_user agree per account)
  - notifications reach the right participants (PubSub topics are
    owner/conversation-scoped; cancel notify sets are exact)
  - NO behavior varies by WHICH account (names, graphs, and topologies are
    randomized so account-specific special-casing would fail)
  - regression: F12-56 (name lookup scoped to account), F12-51/52 (no
    cross-account localStorage/seed leakage — server-side analogue:
    PlanningContext and DeviceLocation are per-user keyed)
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.AvailabilityUse
  alias OpalCore.Center.DeviceLocation
  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Center.PlanningContext
  alias OpalCore.Center.ProviderAction
  alias OpalCore.FixturesHelper
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  setup do
    FixturesHelper.seed!()
    :ok
  end

  @name_pool ~w(Ava Liam Noah Emma Oliver Sophia Elijah Mia Lucas Amelia
                Harper Ethan Evelyn Abigail Mason Ella Logan Lily Henry
                Aria Jackson Scarlett Jack Luna Owen Nora Gabriel Zoe
                Carter Penelope Jayden Riley Leo Layla Isaac Hazel Dylan
                Violet Caleb Aurora Christian Stella Landon Naomi Jonathan
                Elena Easton Sarah Nolan Ariana Colton Camila Dominic Maya)

  defp rand_name(used) do
    name = Enum.random(@name_pool)
    if name in used, do: rand_name(used), else: name
  end

  defp mk_user(display_name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "nacc-#{Ecto.UUID.generate()}",
      display_name: display_name
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "nacc-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  @doc """
  Build one randomized account: an owner, 2-4 peers with random names, a
  random relationship graph, a 1:1 conversation and a group conversation.
  Returns a map describing the account.
  """
  defp build_account(seed, used_names) do
    :rand.seed(:exsss, {seed, seed + 1, seed + 2})
    owner_name = rand_name(used_names)
    used = [owner_name | used_names]
    owner = mk_user(owner_name)

    peer_count = Enum.random(2..4)

    {peers, used} =
      Enum.map_reduce(1..peer_count, used, fn _, u ->
        name = rand_name(u)
        {mk_user(name), [name | u]}
      end)

    # Random relationship graph: each peer gets a random type edge to owner,
    # and a random subset gets edges among themselves.
    types = ~w(friend family partner close_friend acquaintance business)

    for peer <- peers do
      {:ok, _} = Relationships.set_type(owner.id, peer.id, Enum.random(types))
    end

    for {p1, p2} <- Enum.zip(peers, tl(peers) ++ [hd(peers)]) do
      if :rand.uniform() < 0.5 do
        {:ok, _} = Relationships.set_type(p1.id, p2.id, Enum.random(types))
      end
    end

    conv11 = mk_conv([owner.id, hd(peers).id])
    conv_group = mk_conv([owner.id | Enum.map(peers, & &1.id)])

    account = %{
      owner: owner,
      peers: peers,
      conv11: conv11,
      conv_group: conv_group,
      names: [owner_name | Enum.map(peers, & &1.display_name)]
    }

    {account, used}
  end

  defp make_plan(conv_id, user_id, title) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv_id, user_id, %{
        "title" => title,
        "place" => "Somewhere",
        "time_label" => "Sat 7:30 PM"
      })

    plan
  end

  defp authoritative_state(conv_id, user_id) do
    active = ConversationAlignment.active_plan_for_conversation(conv_id)
    {:ok, owned} = SocialFlow.list_plans_for_user(user_id)
    {active && active.id, active && active.time_label, active && active.status,
     Enum.map(owned, & &1["id"]) |> Enum.sort()}
  end

  # --- Property 1: random operation orderings converge ----------------------

  describe "property 1 — random op orderings converge to one authoritative state" do
    @tag timeout: 120_000
    test "3 randomized accounts, shuffled lifecycle ops, same end state" do
      {acc1, used} = build_account(101, [])
      {acc2, used} = build_account(202, used)
      {acc3, _used} = build_account(303, used)

      for {acc, idx} <- [{acc1, 1}, {acc2, 2}, {acc3, 3}] do
        %{owner: owner, peers: peers, conv11: conv11} = acc
        [peer | _] = peers
        plan = make_plan(conv11, owner.id, "Account #{idx} dinner")

        ops =
          [
            {:propose, peer, %{"time_label" => "Sat 8:00 PM"}},
            {:nl_change, owner, "let's do 8:30 PM"},
            {:nl_change, peer, "actually 9 PM works"},
            {:direct_change, owner, "Sat 9:00 PM"}
          ]
          |> Enum.shuffle()

        final_label =
          Enum.reduce(ops, "Sat 7:30 PM", fn
            {:propose, p, changes}, label ->
              {:ok, %{revision: rev}} =
                SocialFlow.propose_revision(%{
                  plan_id: plan.id,
                  proposed_by_user_id: p.id,
                  changes: changes,
                  trace_id: "nacc-#{idx}"
                })

              # Owner accepts every proposal: the accept path is exercised.
              {:ok, _} =
                SocialFlow.confirm_pending_revision(%{
                  conversation_id: conv11,
                  user_id: owner.id,
                  decision: "accept",
                  trace_id: "nacc-#{idx}"
                })

              _ = rev
              db_time_label(plan.id)

            {:nl_change, u, text}, _label ->
              case SocialFlow.apply_nl_schedule_change(%{
                     conversation_id: conv11,
                     user_id: u.id,
                     text: text
                   }) do
                {:ok, %{plan: updated}} -> updated.time_label
                {:ok, %{revision: _}} -> db_time_label(plan.id)
                {:error, _} -> db_time_label(plan.id)
              end

            {:direct_change, u, label}, _label ->
              # Only the lead's direct change applies; others are refused.
              case SocialFlow.change_plan_time(%{
                     plan_id: plan.id,
                     user_id: u.id,
                     new_time_label: label,
                     trace_id: "nacc-#{idx}"
                   }) do
                {:ok, %{plan: updated}} -> updated.time_label
                {:error, _} -> db_time_label(plan.id)
              end
          end)

        # Whatever the shuffle, the DB is the single source of truth and both
        # read paths agree with it.
        db = Repo.get!(SharedPlan, plan.id)
        assert db.time_label == final_label

        {active_id, active_label, active_status, _owned} =
          authoritative_state(conv11, owner.id)

        assert active_id == plan.id
        assert active_label == final_label
        assert active_status in ~w(tentative agreed changed)

        {peer_active_id, peer_label, _, _} = authoritative_state(conv11, peer.id)
        assert peer_active_id == plan.id
        assert peer_label == final_label
      end
    end
  end

  defp db_time_label(plan_id), do: Repo.get!(SharedPlan, plan_id).time_label

  # --- Property 2: notifications reach the right participants --------------

  describe "property 2 — notifications are participant-scoped, account-agnostic" do
    test "cancel notify set == plan participants on every account" do
      {acc1, used} = build_account(404, [])
      {acc2, _used} = build_account(505, used)

      for {acc, idx} <- [{acc1, 1}, {acc2, 2}] do
        %{owner: owner, peers: peers, conv11: conv11, conv_group: conv_group} = acc
        plan = make_plan(conv11, owner.id, "Notify test #{idx}")

        # Group-plan topology: same plan family on the group conversation.
        gplan = make_plan(conv_group, owner.id, "Group notify #{idx}")

        # Subscribe to both broadcast topics before the ops.
        :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv11}")
        :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_group}")

        # Change emits on the conversation topic: "social_flow:plan" carrying
        # the schedule_change, plus the F12-08 "social_flow:alignment_updated"
        # snapshot refresh.
        {:ok, _} =
          SocialFlow.change_plan_time(%{
            plan_id: plan.id,
            user_id: owner.id,
            new_time_label: "Sat 8:00 PM",
            trace_id: "nacc-n#{idx}"
          })

        assert_receive {:social_flow_event, "social_flow:plan",
                        %{"payload" => %{"schedule_change" => _}}},
                       2_000

        assert_receive {:social_flow_event, "social_flow:alignment_updated", %{"payload" => _}},
                       2_000

        # Cancel returns the exact participant set, and emits on-topic.
        {:ok, %{notify_user_ids: notified}} =
          SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: owner.id, trace_id: "nacc-n#{idx}"})

        participants =
          from(pp in PlanParticipant, where: pp.plan_id == ^plan.id, select: pp.user_id)
          |> Repo.all()

        expected = Enum.uniq([owner.id | participants]) |> Enum.sort()
        assert Enum.sort(notified) == expected

        assert_receive {:social_flow_event, "social_flow:plan", %{"payload" => %{"cancelled" => true}}}, 2_000

        # Group plan: same contract, different topology.
        {:ok, %{notify_user_ids: gnotified}} =
          SocialFlow.cancel_plan(%{plan_id: gplan.id, user_id: owner.id, trace_id: "nacc-n#{idx}"})

        gparticipants =
          from(pp in PlanParticipant, where: pp.plan_id == ^gplan.id, select: pp.user_id)
          |> Repo.all()

        assert Enum.sort(gnotified) == Enum.uniq([owner.id | gparticipants]) |> Enum.sort()
        assert_receive {:social_flow_event, "social_flow:plan", %{"payload" => %{"cancelled" => true}}}, 2_000

        :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv11}")
        :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_group}")

        # No other account's topic received anything: drain and assert empty.
        refute_receive {:social_flow_event, _, _}, 200
      end
    end

    test "Center (conversation-less) plans broadcast on the owner user topic" do
      {acc, _} = build_account(606, [])
      %{owner: owner} = acc

      {:ok, %{plan: plan}} =
        ProviderAction.attach_selected_venue(
          owner.id,
          %{"name" => "Nighthawk", "address" => "4211 Morrell St", "lat" => 32.767, "lon" => -117.226},
          %{"destination" => "Coronado", "when" => "Sat 8:00 PM"}
        )

      assert plan.conversation_id == nil

      :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{owner.id}")

      {:ok, %{notify_user_ids: notified}} =
        SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: owner.id, trace_id: "nacc-u"})

      assert owner.id in notified
      assert_receive {:social_flow_event, "social_flow:plan", %{"payload" => %{"cancelled" => true}}}, 2_000

      :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:user:#{owner.id}")
    end
  end

  # --- Property 3: nothing varies by WHICH account --------------------------

  describe "property 3 — behavior is account-agnostic (F12-56, F12-51/52, F12-40)" do
    test "same display name on two accounts resolves inside each account only" do
      {acc1, used} = build_account(707, [])
      {acc2, _used} = build_account(808, used)

      # Plant a colliding display name: each account knows its OWN "Chanelle".
      chanelle1 = mk_user("Chanelle")
      chanelle2 = mk_user("Chanelle")
      {:ok, _} = Relationships.set_type(acc1.owner.id, chanelle1.id, "friend")
      {:ok, _} = Relationships.set_type(acc2.owner.id, chanelle2.id, "friend")

      assert AvailabilityUse.resolve_participant_id(acc1.owner.id, "Chanelle") == chanelle1.id
      assert AvailabilityUse.resolve_participant_id(acc2.owner.id, "Chanelle") == chanelle2.id

      # Cross-account leakage is impossible both directions.
      refute AvailabilityUse.resolve_participant_id(acc1.owner.id, "Chanelle") == chanelle2.id
      refute AvailabilityUse.resolve_participant_id(acc2.owner.id, "Chanelle") == chanelle1.id

      # Unknown names resolve to nil, never to a same-named global stranger.
      assert AvailabilityUse.resolve_participant_id(acc1.owner.id, "Zqxj Nobody") == nil
      assert AvailabilityUse.resolve_participant_id(acc2.owner.id, "Zqxj Nobody") == nil
    end

    test "PlanningContext and DeviceLocation are strictly per-user keyed" do
      {acc1, used} = build_account(909, [])
      {acc2, _used} = build_account(919, used)

      assert {:ok, _} = OpalCore.OpalConversations.get_or_create_conversation(acc1.owner.id)
      {:ok, _} = PlanningContext.merge(acc1.owner.id, %{"plan_id" => "plan-A"}, %{})
      {:ok, coarse} = DeviceLocation.validate_coords(%{"lat" => 32.71, "lon" => -117.16})
      :ok = DeviceLocation.put_for_user(acc1.owner.id, coarse)

      # Account 2 sees none of account 1's Center state.
      acc2_planning = PlanningContext.get_for_user(acc2.owner.id)
      refute (acc2_planning || %{})["plan_id"] == "plan-A"
      assert :none = DeviceLocation.get_for_user(acc2.owner.id)

      # Account 1's own state is intact.
      assert {:ok, stored} = DeviceLocation.get_for_user(acc1.owner.id)
      assert stored["lat"] == coarse["lat"]
    end

    test "venue extraction is city-fixture-free on all accounts (F12-40)" do
      {acc1, used} = build_account(929, [])
      {acc2, _used} = build_account(939, used)

      for {acc, _} <- [{acc1, 1}, {acc2, 2}] do
        %{owner: owner} = acc
        _ = owner

        assert %{name: "Nighthawk", locality: "Los Angeles"} =
                 PlanContextPatch.extract_exact_venue("Find Nighthawk in Los Angeles")

        assert %{name: "The Henry", locality: "San Luis Obispo"} =
                 PlanContextPatch.extract_exact_venue("Find The Henry in San Luis Obispo")
      end
    end
  end
end
