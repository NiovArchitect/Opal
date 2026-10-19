defmodule OpalCore.Repair18ApifixTest do
  @moduledoc """
  Repair #18 (apifix wave) - backend pins for the API-suite fixes:

  - FR-17-05: the founder's exact Center flow - "Schedule a date
    night with Chanelle tonight 5 PM" asks, "yes, set it up" creates
    a NEW plan row (article-led what extraction + confirm binding).

  - FR-11-08: junk (non-UUID) ids answer :not_found / empty, never an
    Ecto.Query.CastError raise, at every id-addressed authority entry.
  - FR-12-04 / FR-13-01 / FR-11-04: a spoken time change against an
    API-born plan (time lives on the row; the thread never restated
    it) becomes a change proposal instead of a silent overwrite, and
    a chat confirmation settles it exactly once.
  - FR-12-05: a meridiem-less utterance never moves a plan row's time
    (no invented AM/PM through the fold - neither through interpreted
    datetime changes nor through the "make it X" retarget, which
    hardcoded PM).
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Messages
  alias OpalCore.MultiuserHarness
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{ConversationAlignment, JourneyAuthority, SharedPlan}
  alias OpalCore.SocialFlow.{SocialMomentPublishing, TemporaryStoryPublishing}
  alias OpalCore.Trips

  @junk_ids ["nil", "not-a-uuid", "12345", "journey-nil", "undefined"]

  describe "FR-11-08 junk ids never raise" do
    setup do
      a = MultiuserHarness.account!(%{display_name: "Junk A"})
      %{a: a}
    end

    test "JourneyAuthority entries answer :not_found", %{a: a} do
      for junk <- @junk_ids do
        assert {:error, :not_found} = JourneyAuthority.get(junk, a.id)

        assert {:error, :not_found} =
                 JourneyAuthority.cant_make_it(junk, a.id, %{"note" => "sick"})

        assert {:error, :not_found} = JourneyAuthority.accept_going(junk, a.id)
        assert {:error, :not_found} = JourneyAuthority.reconfirm(junk, a.id)
        assert {:error, :not_found} = JourneyAuthority.add_people(junk, a.id, [a.id])
        assert {:error, :not_found} = JourneyAuthority.assign_co_lead(junk, a.id, a.id)
        assert {:error, :not_found} = JourneyAuthority.handoff_lead(junk, a.id, a.id)

        assert {:error, :not_found} =
                 JourneyAuthority.material_change(junk, a.id, %{"time_label" => "8:00 PM"})
      end
    end

    test "social moment + story + trip reads answer :not_found", %{a: a} do
      for junk <- @junk_ids do
        assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(junk, a.id)
        assert {:error, :not_found} = Trips.get_trip(junk)
        assert {:error, :not_found} = Trips.get_trip_for_user(junk, a.id)
        assert {:error, :not_found} = TemporaryStoryPublishing.delete_own(a.id, junk)
      end
    end

    test "conversation membership + fold sync treat junk as empty", %{a: a} do
      for junk <- @junk_ids do
        assert Messages.member_user_ids(junk) == []
        assert %{} = ConversationAlignment.sync_conversation(junk)
      end

      assert {:error, :not_a_member} =
               Messages.accept_message(%{
                 conversation_id: "nil",
                 sender_user_id: a.id,
                 client_message_id: "junk-1",
                 message_type: "text",
                 body: "hello"
               })
    end

    test "SocialFlow plan/revision entries answer :not_found", %{a: a} do
      for junk <- @junk_ids do
        assert {:error, :not_found} =
                 SocialFlow.convert_plan_place_type(%{
                   plan_id: junk,
                   user_id: a.id,
                   to_plan_type: "virtual"
                 })

        assert {:error, :not_found} =
                 SocialFlow.respond_to_revision(%{
                   revision_id: junk,
                   user_id: a.id,
                   decision: "accept",
                   trace_id: "apifix"
                 })
      end
    end
  end

  describe "FR-06-01 journey activation enrolls every conversation member" do
    test "peers get pending participant rows and can receive a lead handoff" do
      a = MultiuserHarness.account!(%{display_name: "Act A"})
      b = MultiuserHarness.account!(%{display_name: "Act B"})
      {:ok, conv} = Messages.ensure_direct_conversation(a.id, b.id)

      {:ok, journey} =
        JourneyAuthority.activate(%{
          "user_id" => a.id,
          "conversation_id" => conv.conversation_id,
          "title" => "Dinner",
          "location" => "Dinner",
          "time_label" => "Thursday 7:30 PM"
        })

      plan_id = journey["plan_id"] || journey[:plan_id] || journey["id"]

      participants =
        OpalCore.Repo.all(
          Ecto.Query.from(p in OpalCore.SocialFlow.PlanParticipant,
            where: p.plan_id == ^plan_id
          )
        )

      by_user = Map.new(participants, &{&1.user_id, &1})
      assert by_user[a.id].role == "lead"
      assert by_user[b.id].role == "participant"
      assert by_user[b.id].response_state == "pending"

      assert {:ok, _} = JourneyAuthority.handoff_lead(plan_id, a.id, b.id)
      assert {:ok, view} = JourneyAuthority.get(plan_id, b.id)
      assert view["lead_user_id"] == b.id
    end
  end

  describe "fold gate for API-born plans (FR-12-04 / FR-13-01 / FR-11-04)" do
    setup do
      a = MultiuserHarness.account!(%{display_name: "Gate A"})
      b = MultiuserHarness.account!(%{display_name: "Gate B"})
      {:ok, conv} = Messages.ensure_direct_conversation(a.id, b.id)

      {:ok, plan, _participants} =
        SocialFlow.create_tentative_plan_from_conversation(conv.conversation_id, a.id, %{
          "title" => "Dinner",
          "option_label" => "Dinner",
          "place" => "Dinner",
          "time_label" => "Thursday 7:30 PM"
        })

      %{a: a, b: b, conv_id: conv.conversation_id, plan: plan}
    end

    defp post!(conv_id, sender_id, body) do
      assert {:ok, _msg, :created} =
               Messages.accept_message(%{
                 conversation_id: conv_id,
                 sender_user_id: sender_id,
                 client_message_id: "apifix-#{System.unique_integer([:positive])}",
                 message_type: "text",
                 body: body
               })
    end

    test "a spoken change PENDS as a proposal; the row does not move until confirmed",
         %{a: a, b: b, conv_id: conv_id, plan: plan} do
      post!(conv_id, b.id, "let's change dinner to 8 PM")

      state = ConversationAlignment.sync_conversation(conv_id)
      proposal = state["change_proposal"]
      assert is_map(proposal), "a live change proposal must exist after the spoken change"
      assert proposal["value"] =~ "8:00"
      assert is_binary(proposal["expires_at"])

      # The row itself is untouched while the proposal pends.
      assert Repo.get!(SharedPlan, plan.id).time_label == "Thursday 7:30 PM"

      # Another party confirms in chat: settles exactly once.
      post!(conv_id, a.id, "confirm 8 PM")
      state = ConversationAlignment.sync_conversation(conv_id)
      refute is_map(state["change_proposal"])
      assert Repo.get!(SharedPlan, plan.id).time_label =~ "8:00"
    end

    test "an endpoint accept retires the proposal into proposal_history (FR-12-04)",
         %{a: a, b: b, conv_id: conv_id, plan: plan} do
      post!(conv_id, b.id, "let's change dinner to 8 PM")
      state = ConversationAlignment.sync_conversation(conv_id)
      assert is_map(state["change_proposal"])

      assert {:ok, _} = ConversationAlignment.accept_committed_change(conv_id, a.id)

      state = ConversationAlignment.sync_conversation(conv_id)
      refute is_map(state["change_proposal"])
      assert Repo.get!(SharedPlan, plan.id).time_label =~ "8:00"

      # The settled proposal retired into proposal_history with a
      # terminal status - not just deleted from the live slot.
      history = state["proposal_history"] || []
      assert Enum.any?(history, &(&1["status"] == "accepted"))

      # A stale re-accept is refused.
      assert {:error, _} = ConversationAlignment.accept_committed_change(conv_id, a.id)
    end

    test "a chat confirmation settles the change as ONE accepted revision (no superseded mirror)",
         %{a: a, b: b, conv_id: conv_id, plan: plan} do
      # The fold gate and the executor can both represent the same
      # spoken change (a fold proposal; a System A revision). When the
      # other party confirms in chat, the settlement must land as a
      # single accepted revision that the plan points at - never a
      # superseded mirror plus a duplicate (the W4 two-party pin).
      post!(conv_id, b.id, "let's change dinner to 8 PM")
      post!(conv_id, a.id, "confirm 8 PM")
      _state = ConversationAlignment.sync_conversation(conv_id)

      settled = Repo.get!(SharedPlan, plan.id)
      assert settled.time_label =~ "8:00"
      assert is_binary(settled.current_revision_id)

      current =
        OpalCore.Repo.get!(OpalCore.SocialFlow.PlanRevision, settled.current_revision_id)

      assert current.status == "accepted"

      open =
        OpalCore.Repo.all(
          Ecto.Query.from(r in OpalCore.SocialFlow.PlanRevision,
            where: r.plan_id == ^plan.id and r.status == "proposed"
          )
        )

      assert open == []
    end

    test "a window-only change pends instead of relabeling the row (FR-12-05)",
         %{b: b, conv_id: conv_id, plan: plan} do
      post!(conv_id, b.id, "move dinner to Saturday after 10")
      state = ConversationAlignment.sync_conversation(conv_id)

      assert is_map(state["change_proposal"]),
             "a window change against the row's committed time must pend"

      assert Repo.get!(SharedPlan, plan.id).time_label == "Thursday 7:30 PM"
    end

    test "a meridiem-less utterance never moves the row (FR-12-05)",
         %{b: b, conv_id: conv_id, plan: plan} do
      # The law (FR-12-05 + the voice-assist pins): the plan's CURRENT
      # time never gains an invented meridiem. A proposal may carry
      # the system's reading - the row moves only on confirmation.
      post!(conv_id, b.id, "around 8 works")
      _state = ConversationAlignment.sync_conversation(conv_id)
      assert Repo.get!(SharedPlan, plan.id).time_label == "Thursday 7:30 PM"

      post!(conv_id, b.id, "make it 8")
      _state = ConversationAlignment.sync_conversation(conv_id)
      assert Repo.get!(SharedPlan, plan.id).time_label == "Thursday 7:30 PM"

      # An explicit meridiem pends as a proposal through the gate.
      post!(conv_id, b.id, "let's change dinner to 9 PM")
      state = ConversationAlignment.sync_conversation(conv_id)
      assert is_map(state["change_proposal"])
      assert state["change_proposal"]["value"] =~ "9:00"
      assert Repo.get!(SharedPlan, plan.id).time_label == "Thursday 7:30 PM"
    end
  end

  describe "FR-12-02 in-suite: historical settlements stay with their own plan" do
    test "a settled change for an earlier plan never lands on a newer plan row" do
      a = MultiuserHarness.account!(%{display_name: "Succ A"})
      b = MultiuserHarness.account!(%{display_name: "Succ B"})
      {:ok, conv} = Messages.ensure_direct_conversation(a.id, b.id)
      conv_id = conv.conversation_id

      # The earlier plan and its fully settled change to 8 PM.
      {:ok, old_plan, _} =
        SocialFlow.create_tentative_plan_from_conversation(conv_id, a.id, %{
          "title" => "Old dinner",
          "option_label" => "Dinner",
          "place" => "Dinner",
          "time_label" => "Thursday 7:30 PM"
        })

      post!(conv_id, b.id, "let's change dinner to 8 PM")
      post!(conv_id, a.id, "confirm 8 PM")
      _ = ConversationAlignment.sync_conversation(conv_id)
      assert Repo.get!(SharedPlan, old_plan.id).time_label =~ "8:00"

      # A NEW plan row is born in the same thread afterwards.
      {:ok, new_plan, _} =
        SocialFlow.create_tentative_plan_from_conversation(conv_id, a.id, %{
          "title" => "Juniper and Ivy",
          "option_label" => "Juniper and Ivy",
          "place" => "Juniper and Ivy",
          "time_label" => "Thursday 7:30 PM"
        })

      # Any later sync replays the thread's history. The fold's
      # schedule authority over the conversation's one lineage is the
      # documented model; the REVISION CHAIN is what must stay clean:
      # the old settlement must not be re-recorded as a revision of
      # the new row (before the guard, exactly that revision was
      # minted - source "alignment_fold", proposer as sole approver -
      # and it dragged the row to the old plan's settled time through
      # the revision path as well).
      _ = ConversationAlignment.sync_conversation(conv_id)
      _ = ConversationAlignment.sync_conversation(conv_id)

      assert Repo.aggregate(
               Ecto.Query.from(r in OpalCore.SocialFlow.PlanRevision,
                 where: r.plan_id == ^new_plan.id
               ),
               :count
             ) == 0

      # And a change + confirm addressed to the NEW plan still
      # settles on it (the guard is not a settlement shutdown).
      post!(conv_id, b.id, "let's change the time for Juniper and Ivy at 9pm")
      _ = ConversationAlignment.sync_conversation(conv_id)
      post!(conv_id, a.id, "confirm 9 PM")
      _ = ConversationAlignment.sync_conversation(conv_id)
      assert Repo.get!(SharedPlan, new_plan.id).time_label =~ "9:00"
    end
  end

  describe "FR-17-05 Center new-request flow" do
    test "\"yes, set it up\" creates the date-night plan as a NEW row" do
      user = MultiuserHarness.account!(%{display_name: "Dater Apifix"})

      count = fn ->
        Repo.aggregate(
          Ecto.Query.from(p in SharedPlan,
            join: pp in OpalCore.SocialFlow.PlanParticipant,
            on: pp.plan_id == p.id and pp.user_id == ^user.id
          ),
          :count
        )
      end

      before = count.()

      {:ok, {_c, _u, ask}} =
        OpalCore.OpalConversations.create_user_message(
          user.id,
          "Schedule a date night with Chanelle tonight 5 PM"
        )

      assert ask.body =~ "set this up"

      {:ok, {_c, _u, _confirm}} =
        OpalCore.OpalConversations.create_user_message(user.id, "yes, set it up")

      assert count.() == before + 1
    end
  end
end

defmodule OpalCore.Repair18ApifixIntentTest do
  @moduledoc """
  Repair #18 (apifix) - Center confirm recognition:

  - FR-17-05 / FR-18-B2: "yes, set it up" and a bare "set it up"
    confirm a pending plan_create ask (plan_confirm), and the
    food-at-home signal parsed at proposal time rides the pending ask
    into the confirm instead of being dropped at the seam.
  - Without a pending ask the same words stay inert (FR-17-04's law:
    a bare affirmation never resurrects a dead flow).
  """

  use ExUnit.Case, async: true

  alias OpalCore.OpalIntent

  @empty_context %{
    user_id: nil,
    user_name: nil,
    contacts: [],
    conversation_history: [],
    current_time: nil,
    timezone: "America/New_York",
    location: nil
  }

  defp ask_context(extra_entities \\ %{}) do
    entities =
      Map.merge(
        %{"what" => "dinner", "when" => "Friday", "who" => ["Maya"]},
        extra_entities
      )

    Map.put(@empty_context, :conversation_history, [
      %{
        role: "user",
        body: "Plan dinner with Maya Friday",
        intent: %{"intent" => "plan_create", "entities" => entities}
      },
      %{
        role: "opal",
        body: "Got it — dinner Friday with Maya. Want me to set this up?",
        intent: %{"intent" => "plan_create", "entities" => entities}
      }
    ])
  end

  test "\"yes, set it up\" confirms the pending plan_create ask" do
    assert {:ok, %{intent: :plan_confirm}} = OpalIntent.classify("yes, set it up", ask_context())
    assert {:ok, %{intent: :plan_confirm}} = OpalIntent.classify("Yes, set it up!", ask_context())
    assert {:ok, %{intent: :plan_confirm}} = OpalIntent.classify("set it up", ask_context())
    assert {:ok, %{intent: :plan_confirm}} = OpalIntent.classify("yes", ask_context())
  end

  test "the same words without a pending ask stay inert" do
    assert {:ok, %{intent: intent}} = OpalIntent.classify("yes, set it up", @empty_context)
    refute intent == :plan_confirm
    assert {:ok, %{intent: intent2}} = OpalIntent.classify("set it up", @empty_context)
    refute intent2 == :plan_confirm
  end

  test "\"Schedule a date night\" extracts what=date night (FR-17-05)" do
    assert {:ok, %{intent: :plan_create, entities: entities}} =
             OpalIntent.classify("Schedule a date night with Chanelle tonight 5 PM", %{})

    assert entities.what == "date night"
    assert entities.when_time == "5 PM" or entities.when == "tonight"
  end

  test "the food-at-home signal rides the pending ask into the confirm" do
    ctx = ask_context(%{"food_at_home" => true, "food_question" => false})

    assert {:ok, %{intent: :plan_confirm, entities: entities}} =
             OpalIntent.classify("yes, set it up", ctx)

    assert entities.food_at_home == true
    assert entities.food_question == false
  end

  test "handoff with no restaurant chosen is the honest no-rail fact (FR-18-B2-01)" do
    alias OpalCore.SocialFlow.Execution.FoodHandoff

    assert {:ok, prepared} =
             FoodHandoff.prepare_handoff(%{
               "restaurant_name" => nil,
               "restaurant_website" => nil,
               "restaurant_phone" => nil,
               "provider_choice" => nil,
               "items" => []
             })

    assert prepared["state"] == "no_rail"
    assert prepared["ordered"] == false
    assert prepared["provider_confirmed"] == false

    assert {:ok, started} = FoodHandoff.start_handoff(prepared, user_authorized: true)
    assert started["handoff_started"] == false
    assert started["ordered"] == false
    assert started["provider_confirmed"] == false
  end

  test "presentation dedupe keeps the pending change's expiry (FR-12-04)" do
    alias OpalCore.SocialFlow.ConversationAlignment

    state = %{
      "pending_revision" => %{
        "revision_id" => "rev-1",
        "proposed_time_label" => "8:00 PM",
        "status" => "awaiting_confirmation"
      },
      "change_proposal" => %{
        "field" => "datetime",
        "value" => "8:00 PM",
        "expires_at" => "2026-10-19T14:37:33Z"
      }
    }

    presented = ConversationAlignment.dedupe_pending_presentation(state)
    refute Map.has_key?(presented, "change_proposal")
    assert presented["pending_revision"]["expires_at"] == "2026-10-19T14:37:33Z"
  end
end
