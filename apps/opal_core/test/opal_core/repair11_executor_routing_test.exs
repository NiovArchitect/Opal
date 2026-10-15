defmodule OpalCore.Intelligence.Repair11ExecutorRoutingTest do
  @moduledoc """
  Repair #11 — NL cancel/confirm route through real authorities:

  - withdrawal phrasing ("I can't make it") → JourneyAuthority.cant_make_it
    (self only, response_state "withdrawn", plan untouched)
  - bare "cancel" → one clarifying question, no state change
  - no active plan → honest "nothing to cancel"
  - proposal phrasing ("we should cancel") → SocialFlow.propose_cancel_revision
  - organizer "cancel the whole plan" → SocialFlow.cancel_plan
  - non-organizer "cancel the whole plan" → proposal, never direct cancel
  - plan.confirm with nothing pending → "There's nothing pending to confirm."

  NOTE: the propose/organizer/confirm tests call SocialFlow.confirm_pending_revision,
  SocialFlow.propose_cancel_revision and SocialFlow.cancel_plan, which are
  implemented by the second (SocialFlow) agent and do NOT exist on this branch
  yet. Those tests raise UndefinedFunctionError until the merge; the withdrawal,
  clarify and no-active-plan paths are fully testable on this branch.

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run (after the SocialFlow merge):
  `mix test apps/opal_core/test/opal_core/repair11_executor_routing_test.exs`
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Intelligence.{Decision, Executor}
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  @env "OPAL_INTELLIGENCE_SENDER_USER_ID"
  @bot_id "bot-repair11"

  setup do
    FixturesHelper.seed!()

    prev = System.get_env(@env)
    System.put_env(@env, @bot_id)

    %User{}
    |> User.changeset(%{id: @bot_id, handle: "opal-bot", display_name: "Opal"})
    |> Repo.insert!()

    on_exit(fn ->
      case prev do
        nil -> System.delete_env(@env)
        v -> System.put_env(@env, v)
      end
    end)

    :ok
  end

  defp insert_conversation!(member_ids) do
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "repair11"})
      |> Repo.insert()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  defp insert_plan!(conv_id, creator_id, status \\ "agreed") do
    %SharedPlan{}
    |> SharedPlan.changeset(%{
      conversation_id: conv_id,
      title: "Dinner Friday",
      status: status,
      created_by_user_id: creator_id,
      timezone: "America/Los_Angeles"
    })
    |> Repo.insert!()
  end

  defp insert_participant!(plan_id, user_id, role, response_state \\ "accepted") do
    %PlanParticipant{}
    |> PlanParticipant.changeset(%{
      plan_id: plan_id,
      user_id: user_id,
      role: role,
      response_state: response_state
    })
    |> Repo.insert!()
  end

  defp decision!(id, action, body, conv_id, user_id) do
    %Decision{
      id: id,
      action: action,
      reason: "repair11 test",
      confidence: 0.9,
      payload: %{"body" => body},
      context_snapshot: %{"conversation_id" => conv_id, "account_id" => user_id}
    }
  end

  defp execute_result!(decision) do
    assert {:ok, log} = Executor.execute(decision)
    log.result
  end

  test "withdrawal phrasing records cant_make_it for self only" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = insert_conversation!([alex, jordan, @bot_id])
    plan = insert_plan!(conv.id, alex)
    insert_participant!(plan.id, alex, "lead")
    insert_participant!(plan.id, jordan, "participant")

    result = execute_result!(decision!("d-wd-1", "plan.cancel", "I can't make it", conv.id, alex))

    assert result["kind"] == "withdrawal"
    assert result["plan_id"] == plan.id

    assert Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: alex).response_state ==
             "withdrawn"

    # The plan itself is untouched.
    assert Repo.get(SharedPlan, plan.id).status == "agreed"
  end

  test "bare cancel asks one clarifying question and changes nothing" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = insert_conversation!([alex, jordan, @bot_id])
    plan = insert_plan!(conv.id, alex)
    insert_participant!(plan.id, alex, "lead")
    insert_participant!(plan.id, jordan, "participant")

    result = execute_result!(decision!("d-cl-1", "plan.cancel", "cancel", conv.id, alex))

    assert result["kind"] == "clarify"
    assert result["no_state_change"] == true
    assert Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: alex).response_state == "accepted"
  end

  test "no active plan posts an honest message" do
    alex = Fixtures.user_alex_id()
    conv = insert_conversation!([alex, @bot_id])

    result = execute_result!(decision!("d-np-1", "plan.cancel", "cancel the whole plan", conv.id, alex))

    assert result["no_active_plan"] == true
  end

  @tag :requires_socialflow_merge
  test "proposal phrasing routes to propose_cancel_revision" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = insert_conversation!([alex, jordan, @bot_id])
    plan = insert_plan!(conv.id, alex)
    insert_participant!(plan.id, alex, "participant")
    insert_participant!(plan.id, jordan, "lead")

    result =
      execute_result!(decision!("d-pc-1", "plan.cancel", "we should cancel the plan", conv.id, alex))

    assert result["kind"] == "propose_cancel"
    assert result["plan_id"] == plan.id
    # Nothing cancelled outright.
    assert Repo.get(SharedPlan, plan.id).status == "agreed"
  end

  @tag :requires_socialflow_merge
  test "organizer whole-plan cancel routes to cancel_plan" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = insert_conversation!([alex, jordan, @bot_id])
    plan = insert_plan!(conv.id, alex)
    insert_participant!(plan.id, alex, "lead")
    insert_participant!(plan.id, jordan, "participant")

    result =
      execute_result!(decision!("d-oc-1", "plan.cancel", "cancel the whole plan", conv.id, alex))

    assert result["kind"] == "organizer_cancel"
    assert result["plan_id"] == plan.id
  end

  @tag :requires_socialflow_merge
  test "non-organizer whole-plan phrasing falls back to a proposal, never direct cancel" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = insert_conversation!([alex, jordan, @bot_id])
    # Jordan created the plan and leads it; Alex is a plain participant.
    plan = insert_plan!(conv.id, jordan)
    insert_participant!(plan.id, jordan, "lead")
    insert_participant!(plan.id, alex, "participant")

    result =
      execute_result!(decision!("d-noc-1", "plan.cancel", "cancel the whole plan", conv.id, alex))

    assert result["kind"] == "propose_cancel"
  end

  @tag :requires_socialflow_merge
  test "plan.confirm with nothing pending is honest" do
    alex = Fixtures.user_alex_id()
    conv = insert_conversation!([alex, @bot_id])

    result = execute_result!(decision!("d-cf-1", "plan.confirm", "yes", conv.id, alex))

    # Never a false "Locked in!": with nothing pending, the authority reports
    # :no_pending_revision and the user hears the truth.
    assert result["action"] == "plan.confirm"
    assert result["decision"] == "accept"
    assert result["confirmed"] != true
  end
end
