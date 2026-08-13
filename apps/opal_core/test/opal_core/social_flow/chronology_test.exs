defmodule OpalCore.SocialFlow.ChronologyTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Chronology

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "chr-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "chr-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "chrono-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  test "moments persist across re-read (durable, not recompute-only)", %{a: a, b: b, conv: conv} do
    assert {:ok, _, :created} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: a.id,
               client_message_id: "c1-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: "We should get dinner Thursday."
             })

    assert {:ok, _, :created} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: b.id,
               client_message_id: "c2-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: "I'm free after 6:30. Thursday works for me."
             })

    first = Chronology.list_for_viewer(conv.id, a.id)
    assert is_list(first)
    assert length(first) >= 1
    assert Enum.all?(first, &(&1["durable"] == true))
    ids1 = Enum.map(first, & &1["id"])

    # Re-read without new messages — same durable rows.
    second = Chronology.list_for_viewer(conv.id, a.id)
    assert Enum.map(second, & &1["id"]) == ids1

    # Private moment only visible to viewer.
    assert {:ok, _, _} =
             Chronology.record_private(conv.id, a.id, %{
               label: "I found three places that fit both of you.",
               detail: "Only you",
               idempotency_key: "priv-test-#{conv.id}"
             })

    for_a = Chronology.list_for_viewer(conv.id, a.id)
    for_b = Chronology.list_for_viewer(conv.id, b.id)
    assert Enum.any?(for_a, &(&1["privacy_class"] == "private_viewer"))
    refute Enum.any?(for_b, &(&1["privacy_class"] == "private_viewer"))
  end

  test "chronology records dimension deltas, not still_open spam", %{a: a, b: b, conv: conv} do
    assert {:ok, _, :created} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: a.id,
               client_message_id: "d1-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: "We should get dinner Thursday after 6:30."
             })

    assert {:ok, _, :created} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: b.id,
               client_message_id: "d2-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: "Perfect, 6:30 works."
             })

    moments = Chronology.list_for_viewer(conv.id, a.id)
    labels = Enum.map(moments, & &1["label"])
    kinds = Enum.map(moments, & &1["kind"])

    # Causal language preferred over generic still_open dump
    refute Enum.all?(moments, &(&1["lifecycle_stage"] == "still_open" and &1["kind"] == "shared_reality"))

    assert Enum.any?(labels, &(&1 =~ ~r/became the (time|plan)|Dinner|Thursday|6:30/i)) or
             Enum.any?(kinds, &(&1 in ~w(time_resolved activity_resolved shared_reality open_loop plan_forming)))

    # No flood of identical still_open shared_reality snapshots
    sr_spam =
      Enum.count(moments, fn m ->
        m["kind"] == "shared_reality" and m["lifecycle_stage"] == "still_open"
      end)

    assert sr_spam <= 2
  end

  test "chronology records time replacement when day changes", %{a: a, b: b, conv: conv} do
    uid = System.unique_integer([:positive])

    for {body, who, n} <- [
          {"Dinner Thursday after 6:30?", a, 1},
          {"Thursday works.", b, 2},
          {"Actually Friday at 7 is better.", a, 3}
        ] do
      assert {:ok, _, :created} =
               Messages.accept_message(%{
                 conversation_id: conv.id,
                 sender_user_id: who.id,
                 client_message_id: "rev-#{uid}-#{n}",
                 message_type: "text",
                 body: body
               })
    end

    moments = Chronology.list_for_viewer(conv.id, a.id)
    labels = Enum.map(moments, & &1["label"]) |> Enum.join(" | ")

    assert labels =~ ~r/Friday|replaced|became the time/i
  end
end

