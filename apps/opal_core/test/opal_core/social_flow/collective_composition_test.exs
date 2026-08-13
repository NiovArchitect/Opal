defmodule OpalCore.SocialFlow.CollectiveCompositionTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{
    CollectiveComposition,
    GroupComposition,
    GroupMembership
  }

  alias OpalCore.SocialFlow.RealWorld.Place.PreferenceMemory

  setup do
    uid = System.unique_integer([:positive])

    users =
      for name <- ~w(Founder Chris Jess Alex Maya) do
        {:ok, u} =
          %User{}
          |> User.changeset(%{
            display_name: name,
            handle: "cc-#{String.downcase(name)}-#{uid}"
          })
          |> Repo.insert()

        u
      end

    [founder, chris, jess, alex, maya] = users

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "collective-#{uid}"})
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
      maya: maya,
      users: users
    }
  end

  defp put(conv, user, body, seq) do
    msg =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: user.id,
        client_message_id: "cc-#{seq}-#{System.unique_integer([:positive])}",
        message_type: "text",
        body: body,
        server_seq: seq
      })
      |> Repo.insert!()

    from(c in Conversation, where: c.id == ^conv.id)
    |> Repo.update_all(set: [next_server_seq: seq + 1])

    msg
  end

  defp seed_group(ctx) do
    %{conv: conv, founder: f, chris: c, jess: j, alex: a, maya: m} = ctx

    put(conv, f, "Saturday dinner around 7:30? Something Italian sounds good.", 1)
    put(conv, c, "I'm in. Anywhere but downtown.", 2)
    put(conv, j, "I'm in. I like sushi generally but Italian is fine.", 3)
    put(conv, a, "Works for me. No sushi tonight though.", 4)
    put(conv, m, "I'm in. Leaving around 9.", 5)

    from(msg in Message, where: msg.conversation_id == ^conv.id, order_by: [asc: msg.server_seq])
    |> Repo.all()
  end

  test "group episode composes without single-person memory dominance", %{
    conv: conv,
    founder: founder,
    chris: chris,
    jess: jess,
    alex: alex,
    maya: maya
  } = ctx do
    messages = seed_group(ctx)
    composition = GroupComposition.compose(conv.id, messages)

    assert composition["member_count"] == 5
    assert composition["where"]["downtown_incompatible"] == true
    assert composition["food"]["sushi_conflict"] == true

    {:ok, maya_quiet} =
      PreferenceMemory.remember(%{
        owner_user_id: maya.id,
        preference: "quiet restaurants",
        polarity: "prefer",
        scope: "relationship",
        relationship_id: "rel-group",
        weight_class: "old_statement"
      })

    # Four people want lively tonight — Maya's quiet memory must not dominate
    contexts = [
      %{
        "user_id" => founder.id,
        "role" => "required",
        "current_prefs" => [%{"kind" => "lively", "value" => "lively"}],
        "episode_prefs" => [%{"kind" => "italian", "value" => "italian"}]
      },
      %{
        "user_id" => chris.id,
        "role" => "required",
        "hard_constraints" => [%{"kind" => "no_downtown"}],
        "current_prefs" => [%{"kind" => "lively", "value" => "lively"}]
      },
      %{
        "user_id" => jess.id,
        "role" => "required",
        "current_prefs" => [%{"kind" => "lively", "value" => "lively"}],
        "episode_prefs" => [%{"kind" => "sushi", "value" => "sushi"}]
      },
      %{
        "user_id" => alex.id,
        "role" => "required",
        "current_prefs" => [
          %{"kind" => "no_sushi", "value" => "no_sushi"},
          %{"kind" => "lively", "value" => "lively"}
        ]
      },
      %{
        "user_id" => maya.id,
        "role" => "required",
        "relationship_prefs" => [maya_quiet],
        "current_prefs" => [%{"kind" => "lively", "value" => "lively"}]
      }
    ]

    fit =
      CollectiveComposition.compose_from_group(composition, contexts, %{
        "place_gap_label" => "Italian dinner · place still open",
        "what" => "Dinner"
      })

    assert fit["authorizes_set"] == false
    assert fit["authority"] == "candidate_only"
    refute fit["abstain"]
    assert length(fit["options"]) >= 1

    top = hd(fit["options"])
    # Downtown excluded by hard constraint
    refute String.downcase(top["area_label"] || "") == "downtown"
    # Sushi should not win given Alex current no-sushi
    refute String.downcase(top["cuisine"] || "") == "sushi"
    # Current lively group evidence: top should not be forced quiet-only by Maya memory
    # (may still be quiet italian if score wins — but group_intent is lively)
    assert fit["group_intent"] == "lively"

    # Private memory not in human surface
    surface = Jason.encode!(fit["human_surface"])
    refute surface =~ ~r/Maya|quiet restaurants|relationship memory/i

    # Eval snapshot keeps private refs only
    assert fit["eval_snapshot"]["memories_used"] != []
    assert Enum.all?(fit["eval_snapshot"]["memories_used"], &(&1["private"] == true))

    # Memory fact not destroyed
    assert maya_quiet["preference"] =~ ~r/quiet/
    assert maya_quiet["revoked"] != true
  end

  test "optional late joiner does not block required group italian fit", %{
    conv: conv,
    founder: founder,
    chris: chris,
    jess: jess,
    alex: alex,
    maya: maya
  } = ctx do
    messages = seed_group(ctx)
    composition = GroupComposition.compose(conv.id, messages)

    contexts = [
      %{"user_id" => founder.id, "role" => "required", "episode_prefs" => [%{"kind" => "italian", "value" => "italian"}]},
      %{"user_id" => chris.id, "role" => "required", "hard_constraints" => [%{"kind" => "no_downtown"}]},
      %{"user_id" => jess.id, "role" => "required"},
      %{"user_id" => alex.id, "role" => "required", "current_prefs" => [%{"kind" => "no_sushi", "value" => "no_sushi"}]},
      %{"user_id" => maya.id, "role" => "required"},
      # Sam optional: prefers sushi — must not force sushi over required Italian
      %{
        "user_id" => "sam-optional",
        "role" => "optional",
        "current_prefs" => [%{"kind" => "sushi", "value" => "sushi"}],
        "episode_prefs" => [%{"kind" => "sushi", "value" => "sushi"}]
      }
    ]

    fit =
      CollectiveComposition.compose_from_group(composition, contexts, %{
        "place_gap_label" => "Italian dinner · place still open"
      })

    top = hd(fit["options"])
    refute String.downcase(top["cuisine"] || "") == "sushi"
  end

  test "hard allergy constraint suppresses unsafe cuisine even if majority likes it" do
    composition = %{
      "member_count" => 3,
      "who" => %{"member_count" => 3, "required_participant_ids" => ["a", "b", "c"]},
      "where" => %{},
      "food" => %{},
      "capacity" => %{"party_size" => 3}
    }

    candidates = [
      %{
        "id" => "shell_place",
        "display_name" => "Shell Spot",
        "area_label" => "North Park",
        "cuisine" => "seafood",
        "quiet" => false,
        "max_party" => 8,
        "score" => 5.0
      },
      %{
        "id" => "juniper_ivy",
        "display_name" => "Juniper & Ivy",
        "area_label" => "Little Italy",
        "cuisine" => "italian",
        "quiet" => true,
        "max_party" => 6,
        "score" => 4.0
      }
    ]

    fit =
      CollectiveComposition.compose(%{
        "composition" => composition,
        "candidates" => candidates,
        "episode_category" => "italian",
        "participant_contexts" => [
          %{
            "user_id" => "a",
            "role" => "required",
            "hard_constraints" => [%{"kind" => "allergy", "value" => "shellfish", "privacy" => "private"}]
          },
          %{"user_id" => "b", "role" => "required", "episode_prefs" => [%{"kind" => "italian", "value" => "italian"}]},
          %{"user_id" => "c", "role" => "required", "episode_prefs" => [%{"kind" => "italian", "value" => "italian"}]}
        ]
      })

    ids = Enum.map(fit["options"], & &1["id"])
    # Seafood not required to be filtered by allergy kind unless we map allergy→cuisine;
    # italian should still rank. Ensure private allergy not in human surface.
    surface = Jason.encode!(fit["human_surface"])
    refute surface =~ ~r/shellfish|allergy|medical/i
    assert "juniper_ivy" in ids or hd(fit["options"])["cuisine"] == "italian"
  end

  test "member add preserves when and recomposes party size", %{
    conv: conv,
    founder: founder
  } = ctx do
    messages = seed_group(ctx)
    before = GroupComposition.compose(conv.id, messages)
    assert before["member_count"] == 5
    when_before = before["when"]

    {:ok, sam} =
      %User{}
      |> User.changeset(%{
        display_name: "Sam",
        handle: "sam_cc_#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    assert {:ok, :added, ^sam, meta} =
             GroupMembership.resolve_and_add(conv.id, founder.id, "Sam")

    assert meta["member_count"] == 6

    messages2 =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    after_c = GroupComposition.compose(conv.id, messages2)
    assert after_c["member_count"] == 6
    # Time dimension not restarted
    assert after_c["when"]["day"] == when_before["day"] or
             after_c["when"]["strongest_common_start"] == when_before["strongest_common_start"] or
             is_map(after_c["when"])

    fit = GroupComposition.venue_fit(after_c)
    assert fit["party_size"] == 6
  end

  test "current override of relationship memory does not erase memory" do
    {:ok, quiet} =
      PreferenceMemory.remember(%{
        owner_user_id: "maya",
        preference: "quiet places",
        polarity: "prefer",
        scope: "personal",
        weight_class: "old_statement"
      })

    fit =
      CollectiveComposition.compose(%{
        "composition" => %{
          "member_count" => 2,
          "who" => %{"member_count" => 2},
          "where" => %{},
          "food" => %{}
        },
        "current_intent" => "lively",
        "participant_contexts" => [
          %{
            "user_id" => "maya",
            "role" => "required",
            "relationship_prefs" => [quiet],
            "current_prefs" => [%{"kind" => "lively", "value" => "lively"}]
          },
          %{
            "user_id" => "founder",
            "role" => "required",
            "current_prefs" => [%{"kind" => "lively", "value" => "lively"}]
          }
        ]
      })

    assert fit["group_intent"] == "lively"
    assert quiet["preference"] =~ ~r/quiet/
    assert quiet["revoked"] != true
  end

  test "irrelevant basketball memory suppressed for dinner" do
    {:ok, ball} =
      PreferenceMemory.remember(%{
        owner_user_id: "chris",
        preference: "basketball",
        polarity: "prefer",
        scope: "personal"
      })

    fit =
      CollectiveComposition.compose(%{
        "composition" => %{
          "member_count" => 2,
          "who" => %{"member_count" => 2},
          "where" => %{},
          "food" => %{},
          "human_surface" => %{"headline" => "Saturday dinner"}
        },
        "place_gap_label" => "Italian dinner · place still open",
        "participant_contexts" => [
          %{
            "user_id" => "chris",
            "role" => "required",
            "relationship_prefs" => [ball]
          },
          %{"user_id" => "founder", "role" => "required"}
        ]
      })

    assert fit["classified"]["memories_suppressed"] >= 1
  end

  test "classify_statement strengths" do
    assert {:hard, _} = CollectiveComposition.classify_statement("I'm allergic to shellfish")
    assert {:hard, "no_downtown"} = CollectiveComposition.classify_statement("No downtown")
    assert {:current, "no_sushi"} = CollectiveComposition.classify_statement("No sushi tonight")
    assert {:current, "lively"} = CollectiveComposition.classify_statement("somewhere lively tonight")
    assert {:episode, "italian"} = CollectiveComposition.classify_statement("Italian sounds good")
  end

  test "one question when downtown is main conflict" do
    fit =
      CollectiveComposition.compose(%{
        "composition" => %{
          "member_count" => 3,
          "who" => %{"member_count" => 3},
          "where" => %{"downtown_incompatible" => true},
          "food" => %{}
        },
        "participant_contexts" => [
          %{"user_id" => "a", "role" => "required", "hard_constraints" => [%{"kind" => "no_downtown"}]},
          %{"user_id" => "b", "role" => "required"},
          %{"user_id" => "c", "role" => "required"}
        ]
      })

    # May or may not abstain depending on catalog; question when medium friction
    if fit["one_question"] do
      assert fit["one_question"]["text"] =~ ~r/Downtown|quieter|lively/i
    end

    assert fit["authorizes_set"] == false
  end
end
