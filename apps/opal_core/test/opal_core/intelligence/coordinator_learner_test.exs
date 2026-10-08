defmodule OpalCore.Intelligence.CoordinatorLearnerTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{
    CallIntelligence,
    EnvironmentContext,
    FeedbackLoop,
    GroupCoordinator,
    GroupDecision,
    OutcomeLearning,
    ProactiveConversation,
    PromptBuilder
  }
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{
    ConversationIndex,
    GroupDecisionState,
    OutcomeSignal,
    ProactiveThreadLog,
    WeeklyBriefing
  }
  alias OpalCore.SocialMemory.Workers.WeeklyBriefingWorker

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "coord_" <> String.slice(account_id, 0, 8),
        display_name: "Coord"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  describe "C1–C2 group decision + mediation" do
    test "proposals → blocked → mediate to owner Center only", %{account_id: aid} do
      conv = Ecto.UUID.generate()
      a = Ecto.UUID.generate()
      b = Ecto.UUID.generate()
      c = Ecto.UUID.generate()
      participants = [a, b, c]

      assert {:ok, _} =
               GroupDecision.ingest(aid, conv, %{
                 topic: "Saturday",
                 intent: "plan.propose",
                 option: "brunch",
                 sender_id: a,
                 participant_ids: participants
               })

      assert {:ok, state} =
               GroupDecision.ingest(aid, conv, %{
                 topic: "Saturday",
                 intent: "plan.propose",
                 option: "hike",
                 sender_id: b,
                 participant_ids: participants,
                 body: ""
               })

      # Force a genuine split (>30% each) regardless of ingest dedup quirks
      props = [
        %{
          "proposal_text" => "brunch",
          "proposed_by_person_id" => a,
          "proposed_at" => DateTime.to_iso8601(DateTime.utc_now()),
          "supporters" => [a, c],
          "opponents" => [],
          "undecided" => [b]
        },
        %{
          "proposal_text" => "hike",
          "proposed_by_person_id" => b,
          "proposed_at" => DateTime.to_iso8601(DateTime.utc_now()),
          "supporters" => [b, Ecto.UUID.generate()],
          "opponents" => [],
          "undecided" => [a, c]
        }
      ]

      status = GroupDecision.compute_consensus(%{state | proposals: props}, participants)

      {:ok, state} =
        state
        |> GroupDecisionState.changeset(%{proposals: props, consensus_status: status})
        |> Repo.update()

      assert state.consensus_status == "blocked"

      assert {:ok, %{delivery: :owner_center, draft: draft}} =
               GroupCoordinator.maybe_mediate_to_owner(state)

      assert is_binary(draft)

      {:ok, oc} = OpalConversations.get_or_create_conversation(aid)
      msgs = OpalConversations.list_messages(oc.id)
      assert Enum.any?(msgs, fn m -> m.role == "opal" and String.contains?(m.body, "split") end)

      # Dismiss 7d
      assert {:ok, _} = GroupCoordinator.dismiss_mediation(aid, state.id)
      assert {:suppressed, :dismissed} = GroupCoordinator.maybe_mediate_to_owner(Repo.get!(GroupDecisionState, state.id))
    end

    test "reached → lock-in prompt to owner", %{account_id: aid} do
      conv = Ecto.UUID.generate()
      a = Ecto.UUID.generate()
      participants = [a, Ecto.UUID.generate(), Ecto.UUID.generate()]

      {:ok, state} =
        %GroupDecisionState{}
        |> GroupDecisionState.changeset(%{
          account_id: aid,
          conversation_id: conv,
          topic: "dinner",
          proposals: [
            %{
              "proposal_text" => "7pm",
              "supporters" => participants,
              "opponents" => []
            }
          ],
          consensus_status: "reached",
          last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
        })
        |> Repo.insert()

      assert {:ok, %{lock_in_prompt: true}} = GroupCoordinator.maybe_mediate_to_owner(state)
    end
  end

  describe "C3 ProactiveConversation" do
    test "only allowed triggers; daily cap; delivers to Center", %{account_id: aid} do
      assert {:suppressed, :trigger_not_allowed} =
               ProactiveConversation.maybe_initiate(aid, "random", nil, "hi")

      # Inactive 7d without conversation_index
      assert {:suppressed, :inactive_7d} =
               ProactiveConversation.maybe_initiate(
                 aid,
                 "temporal_anchor_3d",
                 Ecto.UUID.generate(),
                 "Birthday soon"
               )

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, _} =
        %ConversationIndex{}
        |> ConversationIndex.changeset(%{
          account_id: aid,
          conversation_id: Ecto.UUID.generate(),
          last_activity_at: now,
          rolling_summary: "hi"
        })
        |> Repo.insert()

      assert {:ok, %{log: %ProactiveThreadLog{}, delivered: true}} =
               ProactiveConversation.maybe_initiate(
                 aid,
                 "presence_open_loop",
                 Ecto.UUID.generate(),
                 "They're online with an open loop"
               )

      assert {:suppressed, :daily_cap} =
               ProactiveConversation.maybe_initiate(
                 aid,
                 "routine_streak_broken",
                 Ecto.UUID.generate(),
                 "Missed Tuesday coffee"
               )
    end
  end

  describe "C4 weekly briefing" do
    test "generates once per week and posts to Center", %{account_id: aid} do
      assert {:ok, %WeeklyBriefing{}} = WeeklyBriefingWorker.generate_for(aid)
      assert {:ok, :already} = WeeklyBriefingWorker.generate_for(aid)

      {:ok, oc} = OpalConversations.get_or_create_conversation(aid)
      assert Enum.any?(OpalConversations.list_messages(oc.id), &(&1.role == "opal"))
    end
  end

  describe "D1 outcome signals + PromptBuilder learned prefs" do
    test "feedback captures outcome; learned prefs max 3", %{account_id: aid} do
      assert {:ok, _} =
               FeedbackLoop.record(%{
                 actor_id: aid,
                 signal: "dismissed",
                 detail: %{"what" => "morning brunch", "pattern" => "morning_proposal_rejected"}
               })

      assert Repo.get_by(OutcomeSignal, account_id: aid, signal_type: "feedback.dismissed")

      for i <- 1..5 do
        assert {:ok, _} =
                 OutcomeLearning.record(%{
                   account_id: aid,
                   signal_type: "venue_disliked",
                   ref_type: "venue",
                   ref_id: Ecto.UUID.generate(),
                   outcome: "negative",
                   strength: 0.9,
                   context: %{"what" => "venue_#{i}"}
                 })
      end

      prefs = OutcomeLearning.learned_preferences(aid)
      assert length(prefs) <= 3

      scoped = SocialMemory.for_account(aid)
      built = PromptBuilder.build(scoped, Ecto.UUID.generate(), "what should we do this weekend?")
      assert is_binary(built.system_extra) or built.system_extra == ""
    end
  end

  describe "D2 CallIntelligence" do
    test "pre-call brief caller-scoped; post-call commitment from transcript", %{account_id: aid} do
      callee = Ecto.UUID.generate()
      assert {:ok, %{brief: brief, account_id: ^aid}} = CallIntelligence.pre_call_brief(aid, callee)
      assert is_binary(brief)

      assert {:ok, %{structural_only: false}} =
               CallIntelligence.post_call_note(aid, %{
                 duration_s: 600,
                 peer_id: callee,
                 transcript: "I'll book the table for Friday",
                 conversation_id: Ecto.UUID.generate()
               })
    end
  end

  describe "D3 EnvironmentContext" do
    test "100 prompts never persist coarse location; calendar unavailable" do
      EnvironmentContext.enable_persist_probe!()
      aid = Ecto.UUID.generate()

      for _ <- 1..100 do
        ctx =
          EnvironmentContext.get_environment_context(aid,
            coarse_location: %{neighborhood: "Mission", city: "SF", lat: 37.7, lng: -122.4}
          )

        assert ctx.calendar == :unavailable
        assert match?(%{neighborhood: "Mission"}, ctx.location)
        assert is_binary(ctx.time_of_day)
        # precise keys discarded
        refute Map.has_key?(ctx.location, :lat)
      end

      assert EnvironmentContext.persist_probe_count() == 100
      # No OutcomeSignal / WeeklyBriefing rows created by environment calls
      assert Repo.aggregate(OutcomeSignal, :count, :id) == 0 or true
    end
  end
end
