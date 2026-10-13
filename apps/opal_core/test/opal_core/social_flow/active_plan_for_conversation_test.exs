defmodule OpalCore.SocialFlow.ActivePlanForConversationTest do
  @moduledoc """
  Pass 1 coherence: multiple SharedPlans per conversation are lawful;
  Repo.get_by/2 must never be used — MultipleResultsError crashes propose.
  """

  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{ConversationAlignment, SharedPlan}

  test "active_plan_for_conversation prefers newest active when duplicates exist" do
    uid = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "Dup", handle: "dup-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "dup-plan-#{uid}"})
      |> Repo.insert()

    older =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Older",
        status: "agreed",
        created_by_user_id: user.id,
        timezone: "America/Los_Angeles"
      })
      |> Repo.insert!()

    Process.sleep(5)

    newer =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Newer",
        status: "tentative",
        created_by_user_id: user.id,
        timezone: "America/Los_Angeles"
      })
      |> Repo.insert!()

    chosen = ConversationAlignment.active_plan_for_conversation(conv.id)
    assert chosen.id == newer.id
    refute chosen.id == older.id
  end
end
