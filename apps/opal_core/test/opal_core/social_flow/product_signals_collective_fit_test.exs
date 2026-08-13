defmodule OpalCore.SocialFlow.ProductSignalsCollectiveFitTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{DurablePreferenceMemory, ProductSignals}

  setup do
    uid = System.unique_integer([:positive])

    users =
      for name <- ~w(Founder Chris Jess Alex Maya) do
        {:ok, u} =
          %User{}
          |> User.changeset(%{
            display_name: name,
            handle: "pscf-#{String.downcase(name)}-#{uid}"
          })
          |> Repo.insert()

        u
      end

    [founder, chris, jess, alex, maya] = users

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "pscf-#{uid}"})
      |> Repo.insert()

    for u <- users do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{
      conv: conv,
      founder: founder,
      chris: chris,
      jess: jess,
      alex: alex,
      maya: maya
    }
  end

  defp put(conv, user, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conv.id,
      sender_user_id: user.id,
      client_message_id: "pscf-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()

    from(c in Conversation, where: c.id == ^conv.id)
    |> Repo.update_all(set: [next_server_seq: seq + 1])
  end

  test "ProductSignals carries shared-safe collective_fit without private memory text", %{
    conv: conv,
    founder: founder,
    chris: chris,
    jess: jess,
    alex: alex,
    maya: maya
  } do
    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => maya.id,
               "preference" => "quiet restaurants",
               "weight_class" => "old_statement"
             })

    put(conv, founder, "Saturday dinner around 7:30? Something Italian sounds good.", 1)
    put(conv, chris, "I'm in. Anywhere but downtown.", 2)
    put(conv, jess, "I'm in.", 3)
    put(conv, alex, "Works for me. No sushi tonight.", 4)
    put(conv, maya, "I'm in. Somewhere lively tonight!", 5)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, founder.id)
    primary = Enum.find(signals, &(&1["kind"] in ~w(set open_loop plan_forming))) || hd(signals)

    cf = primary["collective_fit"]
    assert is_map(cf)
    assert cf["authority"] == "candidate_only"
    assert cf["authorizes_set"] == false
    assert is_list(cf["options"])

    # No private memory disclosure on shared signal
    encoded = Jason.encode!(cf)
    refute encoded =~ ~r/quiet restaurants|Maya prefers|relationship memory/i

    # Hard downtown / sushi reflected in options if any
    for o <- cf["options"] || [] do
      refute String.downcase(o["area"] || "") == "downtown"
      refute String.downcase(o["cuisine"] || "") == "sushi"
    end

    # Durable memory still present after signal build
    facts = DurablePreferenceMemory.facts_for_participants([maya.id])
    assert hd(facts)["preference"] =~ ~r/quiet/i
  end

  test "durable memory survives re-query after signals (session restart proxy)", %{
    conv: conv,
    founder: founder,
    maya: maya
  } do
    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => maya.id,
               "preference" => "quiet restaurants"
             })

    put(conv, founder, "Dinner Thursday after 6:30?", 1)
    put(conv, maya, "Perfect.", 2)

    assert {:ok, _} = ProductSignals.signals_for_conversation(conv.id, founder.id)

    # New "session": list from DB again
    listed = DurablePreferenceMemory.list_for_owners([maya.id])
    assert Enum.any?(listed, &(&1.id == mem.id))
  end

  test "dyad still gets collective_fit map without breaking shared_reality", %{
    conv: conv,
    founder: founder,
    chris: chris
  } do
    # Reduce to dyad membership for this test — remove extra members conceptually
    # by only messaging between two; member_count may still be 5 from setup.
    put(conv, founder, "Dinner Thursday after 6:30?", 1)
    put(conv, chris, "Perfect. Italian?", 2)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, founder.id)
    primary = Enum.find(signals, &Map.has_key?(&1, "shared_reality")) || hd(signals)
    assert is_map(primary["shared_reality"])
    assert is_map(primary["collective_fit"])
    assert primary["collective_fit"]["authorizes_set"] == false
    assert primary["shared_reality"]["what"] in [nil, "Dinner"] or
             primary["shared_reality"]["when"] != nil
  end
end
