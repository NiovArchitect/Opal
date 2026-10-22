defmodule OpalCore.PeopleTest do
  @moduledoc """
  Repair #20 F-6 / F-8a pins — identity resolution and ordering in
  the one people projection (`OpalCore.People`).

    (a) the same identity arriving from two sources projects as
        exactly ONE row, with the account-backed record winning;
    (b) two distinct identities sharing one display name project
        as TWO rows, data unmixed (isolation applied to identity);
    (c) ordering is most-talked-to first (recency, then volume),
        never alphabetical, never seed order.
  """

  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.People
  alias OpalCore.SocialFlow.RelationshipEstablishment

  defp user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end

  describe "resolve/1 identity resolution" do
    test "(a) same identity from two sources -> one row, account-backed record wins" do
      id = Ecto.UUID.generate()

      entries = [
        %{
          identity_id: id,
          display_name: "Maya Torres",
          account_backed: false,
          source: :establishment,
          conversation_id: nil,
          last_talked_at: nil,
          talk_count: 0,
          relationship_type: nil
        },
        %{
          identity_id: id,
          display_name: "Maya Torres",
          account_backed: true,
          source: :conversation,
          conversation_id: "conv-1",
          last_talked_at: ~U[2026-10-19 18:00:00Z],
          talk_count: 4,
          relationship_type: nil
        }
      ]

      assert [person] = People.resolve(entries)
      assert person.identity_id == id
      assert person.account_backed == true
      assert person.conversation_id == "conv-1"
      assert person.talk_count == 4
      assert person.display_name == "Maya Torres"
    end

    test "(a2) entries with no identity key are dropped, never rendered as a nameless duplicate" do
      entries = [
        %{
          identity_id: nil,
          display_name: "Maya Torres",
          account_backed: false,
          source: :establishment,
          conversation_id: nil,
          last_talked_at: nil,
          talk_count: 0,
          relationship_type: nil
        }
      ]

      assert People.resolve(entries) == []
    end

    test "(b) two distinct identities, same display name -> two rows, data unmixed" do
      id_a = Ecto.UUID.generate()
      id_b = Ecto.UUID.generate()
      talked_a = ~U[2026-10-19 18:00:00Z]
      talked_b = ~U[2026-10-18 18:00:00Z]

      entries = [
        %{
          identity_id: id_a,
          display_name: "Maya Torres",
          account_backed: true,
          source: :conversation,
          conversation_id: "conv-a",
          last_talked_at: talked_a,
          talk_count: 7,
          relationship_type: nil
        },
        %{
          identity_id: id_b,
          display_name: "Maya Torres",
          account_backed: true,
          source: :conversation,
          conversation_id: "conv-b",
          last_talked_at: talked_b,
          talk_count: 2,
          relationship_type: nil
        }
      ]

      people = People.resolve(entries)
      assert length(people) == 2

      by_id = Map.new(people, fn p -> {p.identity_id, p} end)
      assert by_id[id_a].conversation_id == "conv-a"
      assert by_id[id_a].talk_count == 7
      assert by_id[id_b].conversation_id == "conv-b"
      assert by_id[id_b].talk_count == 2
    end

    test "(c) ordering: most recent conversation first, then volume; no-talk people last" do
      older = ~U[2026-10-10 10:00:00Z]
      newer = ~U[2026-10-19 10:00:00Z]

      entry = fn id, name, talked, count ->
        %{
          identity_id: id,
          display_name: name,
          account_backed: true,
          source: :conversation,
          conversation_id: "conv-#{id}",
          last_talked_at: talked,
          talk_count: count,
          relationship_type: nil
        }
      end

      entries = [
        entry.(Ecto.UUID.generate(), "Aaron Aardvark", older, 50),
        entry.(Ecto.UUID.generate(), "Zoe Zephyr", newer, 1),
        %{
          identity_id: Ecto.UUID.generate(),
          display_name: "Betty NoTalk",
          account_backed: false,
          source: :contact,
          conversation_id: nil,
          last_talked_at: nil,
          talk_count: 0,
          relationship_type: nil
        }
      ]

      names = Enum.map(People.resolve(entries), fn p -> p.display_name end)
      # Alphabetical would put Aaron first; recency puts Zoe first.
      assert names == ["Zoe Zephyr", "Aaron Aardvark", "Betty NoTalk"]
    end
  end

  describe "for_viewer/1 against the real stores" do
    test "a peer reached via conversation AND establishment AND contact appears exactly once" do
      viewer = user!("viewer-f6", "Viewer One")
      maya = user!("user-maya-f6", "Maya Torres")

      {:ok, conv} =
        %Conversation{}
        |> Conversation.changeset(%{label: "f6-conv"})
        |> Repo.insert()

      for u <- [viewer, maya] do
        %ConversationMember{}
        |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
        |> Repo.insert!()
      end

      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: maya.id,
        client_message_id: "f6-msg-1",
        message_type: "text",
        body: "Farmers market Saturday?",
        server_seq: 1
      })
      |> Repo.insert!()

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      n = System.unique_integer([:positive])

      inv =
        %OpalCore.SocialFlow.RelationshipInvitation{}
        |> OpalCore.SocialFlow.RelationshipInvitation.changeset(%{
          inviter_user_id: viewer.id,
          intended_recipient_user_id: maya.id,
          status: "accepted",
          purpose: "connect",
          invite_source: "manual",
          expires_at: DateTime.add(now, 7 * 86_400, :second),
          accepted_at: now,
          idempotency_key: "inv-f6-#{n}"
        })
        |> Repo.insert!()

      %RelationshipEstablishment{}
      |> RelationshipEstablishment.changeset(%{
        invitation_id: inv.id,
        relationship_context_id: Ecto.UUID.generate(),
        participant_ids: [viewer.id, maya.id],
        conversation_id: conv.id,
        status: "active",
        established_at: now,
        idempotency_key: "f6-est-#{n}"
      })
      |> Repo.insert!()

      {:ok, _} = OpalCore.Relationships.set_type(viewer.id, maya.id, "close_friend")

      people = People.for_viewer(viewer.id)
      mayas = Enum.filter(people, fn p -> p.display_name == "Maya Torres" end)
      assert length(mayas) == 1
      assert hd(mayas).identity_id == maya.id
      assert hd(mayas).conversation_id == conv.id
      assert hd(mayas).account_backed == true
      assert hd(mayas).relationship_type == "close_friend"
      # Repair #23 (F-1): the account user id is stamped from the
      # accounts store - the key the membership machinery speaks.
      assert hd(mayas).account_user_id == maya.id
      assert People.to_contract(hd(mayas))["account_user_id"] == maya.id
    end

    test "to_contract emits the account user id distinctly from the assembled identity key" do
      # An identity assembled from a non-account source can carry
      # an identity key that is NOT the membership key space; the
      # contract must keep the two keys separate so membership
      # surfaces can key on the account id alone (Repair #23 F-1).
      person = %{
        identity_id: "src-contact-identity",
        account_user_id: "u-account-behind-it",
        display_name: "Maya Torres",
        account_backed: true,
        conversation_id: nil,
        last_talked_at: nil,
        talk_count: 0,
        relationship_type: nil
      }

      contract = People.to_contract(person)
      assert contract["id"] == "src-contact-identity"
      assert contract["person_id"] == "src-contact-identity"
      assert contract["account_user_id"] == "u-account-behind-it"

      # No account behind the identity: the field is honestly nil,
      # never a fallback to the identity key.
      accountless = People.to_contract(%{person | account_user_id: nil})
      assert accountless["account_user_id"] == nil

      missing = Map.delete(person, :account_user_id)
      assert People.to_contract(missing)["account_user_id"] == nil
    end

    test "two distinct accounts with the same display name both appear, unmixed" do
      viewer = user!("viewer-f6b", "Viewer One")
      maya_seed = user!("seed-maya-f6b", "Maya Torres")
      maya_real = user!("real-maya-f6b", "Maya Torres")

      convs =
        for peer <- [maya_seed, maya_real] do
          {:ok, conv} =
            %Conversation{}
            |> Conversation.changeset(%{label: "f6b-#{peer.handle}"})
            |> Repo.insert()

          for u <- [viewer, peer] do
            %ConversationMember{}
            |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
            |> Repo.insert!()
          end

          conv
        end

      people = People.for_viewer(viewer.id)
      mayas = Enum.filter(people, fn p -> p.display_name == "Maya Torres" end)
      assert length(mayas) == 2

      assert Enum.sort(Enum.map(mayas, fn p -> p.identity_id end)) ==
               Enum.sort([maya_seed.id, maya_real.id])

      conv_by_identity = Map.new(mayas, fn p -> {p.identity_id, p.conversation_id} end)
      assert conv_by_identity[maya_seed.id] == Enum.at(convs, 0).id
      assert conv_by_identity[maya_real.id] == Enum.at(convs, 1).id
    end

    test "ordering follows real conversation recency, not name or seed order" do
      viewer = user!("viewer-f8", "Viewer One")
      zoe = user!("zoe-f8", "Zoe Zephyr")
      aaron = user!("aaron-f8", "Aaron Aardvark")

      insert_conversation_with_message = fn peer, label, body, at ->
        {:ok, conv} =
          %Conversation{}
          |> Conversation.changeset(%{label: label})
          |> Repo.insert()

        for u <- [viewer, peer] do
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
          |> Repo.insert!()
        end

        %Message{}
        |> Message.create_changeset(%{
          conversation_id: conv.id,
          sender_user_id: peer.id,
          client_message_id: "f8-#{label}",
          message_type: "text",
          body: body,
          server_seq: 1
        })
        |> Ecto.Changeset.put_change(:inserted_at, at)
        |> Repo.insert!()

        conv
      end

      old = DateTime.utc_now() |> DateTime.add(-5, :day) |> DateTime.truncate(:microsecond)
      recent = DateTime.utc_now() |> DateTime.add(-1, :hour) |> DateTime.truncate(:microsecond)

      # Aaron is seeded first AND sorts first alphabetically; Zoe was
      # talked to most recently, so Zoe must lead.
      insert_conversation_with_message.(aaron, "f8-aaron", "older thread", old)
      insert_conversation_with_message.(zoe, "f8-zoe", "recent thread", recent)

      names = Enum.map(People.for_viewer(viewer.id), fn p -> p.display_name end)
      assert names == ["Zoe Zephyr", "Aaron Aardvark"]
    end
  end
end
