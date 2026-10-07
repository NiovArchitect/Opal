defmodule OpalCore.Push.NotificationIntelligenceTest do
  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo

  setup do
    user =
      %User{}
      |> User.changeset(%{
        handle: "push-#{System.unique_integer([:positive])}",
        display_name: "Push User"
      })
      |> Repo.insert!()

    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "push-conv-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{
      conversation_id: conv.id,
      user_id: user.id,
      notifications_muted: false
    })
    |> Repo.insert!()

    %{user: user, conversation: conv}
  end

  test "quiet window mapping" do
    assert NotificationIntelligence.in_quiet_range?(23, 22, 8)
    assert NotificationIntelligence.in_quiet_range?(3, 22, 8)
    refute NotificationIntelligence.in_quiet_range?(10, 22, 8)
    assert NotificationIntelligence.in_quiet_range?(0, 0, 9)
    assert NotificationIntelligence.in_quiet_range?(22, 21, 7)
  end

  test "active in-app suppresses normal push", %{user: user, conversation: conv} do
    NotificationIntelligence.touch_active(user.id)

    assert {:ok, :in_app_only} =
             NotificationIntelligence.enqueue(
               user.id,
               "Hi",
               "body",
               %{"conversation_id" => conv.id, "kind" => "message.new"},
               tier: :normal
             )

    refute_enqueued(worker: DeliverPushWorker)
  end

  test "muted thread suppresses all tiers including urgent", %{user: user, conversation: conv} do
    member = Repo.get_by!(ConversationMember, conversation_id: conv.id, user_id: user.id)

    member
    |> ConversationMember.changeset(%{notifications_muted: true})
    |> Repo.update!()

    for tier <- [:urgent, :normal, :low] do
      assert {:ok, :suppressed_mute} =
               NotificationIntelligence.enqueue(
                 user.id,
                 "X",
                 "Y",
                 %{"conversation_id" => conv.id},
                 tier: tier
               )
    end

    refute_enqueued(worker: DeliverPushWorker)
  end

  test "low tier goes to digest not immediate push", %{user: user} do
    assert {:ok, :digested} =
             NotificationIntelligence.enqueue(
               user.id,
               "Remember Mexico City?",
               "highlights",
               %{"kind" => "memory"},
               tier: :low
             )

    refute_enqueued(worker: DeliverPushWorker)

    result = NotificationIntelligence.flush_held(user.id)

    assert match?({:ok, %Oban.Job{}}, result) or match?({:ok, _}, result)
  end

  test "urgent still enqueues when not muted", %{user: user, conversation: conv} do
    result =
      NotificationIntelligence.enqueue(
        user.id,
        "Missed call",
        "Chanelle called",
        %{"conversation_id" => conv.id, "kind" => "call.missed"},
        tier: :urgent
      )

    assert match?({:ok, %Oban.Job{}}, result)
  end
end
