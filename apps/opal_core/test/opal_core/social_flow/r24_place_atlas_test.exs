defmodule OpalCore.SocialFlow.R24PlaceAtlasTest do
  @moduledoc """
  Repair #24 (WS-3) - the place-atlas drift pin.

  The defect (found en route in R23 WS-23-6, carried as a founder
  item): the place catalog graph creation validates against -
  CandidateProvider, whose recommendations are the alignment
  candidates and whose recognition gate is nominate_place - had
  drifted from the seeded world. Of the seeded world's seven
  distinct places, five had no catalog row at all (nominate_place
  answered :unknown_place; they could never be a graph's place),
  and a sixth ("Herb & Wood, Little Italy") was rejected with
  :activity_not_ready even under its own activity, because the
  offered-candidate join was exact string equality against the
  catalog name ("Herb & Wood") - the D-P1 display-string join.
  Only "Juniper & Ivy" could be created as a graph's place.

  This test enumerates the seeded world's places from the seeded
  rows themselves (never a second hand-maintained list in the
  test) and asserts, for each one, that graph creation at that
  place succeeds through the real paths: the place is recognized
  by the atlas, is offered for one of its catalog activities, and
  nominate_place accepts the seeded location string verbatim,
  resolving it to the catalog's canonical name; and the durable
  graph-create (create_plan_from_graph_create) accepts it as a
  plan location. At the R23 base this test fails for six of the
  seven places (five :unknown_place, one :activity_not_ready).

  The gate stays honest: a place in neither the atlas nor the
  plan's own state is still :unknown_place, and an atlas place
  under the wrong activity is still :activity_not_ready.

  Conversation setup follows the Repair #15 canonical-venue DB
  test's pattern: a real conversation with two members and a plan
  whose alignment carries the activity lock, because nominate and
  set_activity operate on a conversation's plan state.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    CandidateProvider,
    ConversationAlignment,
    FounderGraphCommitmentSeed,
    SharedPlan
  }

  @activities ["coffee", "dinner", "drinks", "something active", "somewhere quiet"]

  @seeded_places [
    "Herb & Wood, Little Italy",
    "Juniper & Ivy",
    "Moonlight Beach, Encinitas",
    "Oceanside Farmers Market",
    "Oceanside Pier",
    "Tamarack Beach, Carlsbad",
    "The Brick Hotel, Oceanside"
  ]

  defp fresh_user(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: "Atlas #{prefix}"
    })
    |> Repo.insert!()
  end

  defp fresh_conversation(user_a, user_b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: "r24-atlas-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for user <- [user_a, user_b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
      |> Repo.insert!()
    end

    conv
  end

  defp seed_plan_with_activity(conv, creator, activity) do
    alignment = %{
      "explicit_actions" => [
        %{
          "kind" => "activity_lock",
          "actor_user_id" => creator.id,
          "value" => activity,
          "truth" => "user_stated",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      ]
    }

    %SharedPlan{}
    |> SharedPlan.changeset(%{
      conversation_id: conv.id,
      title: "Meetup",
      status: "tentative",
      timezone: "America/Los_Angeles",
      created_by_user_id: creator.id,
      alignment: alignment
    })
    |> Repo.insert!()
  end

  defp seeded_places! do
    viewer = fresh_user("atlas-seed-viewer")
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    from(p in SharedPlan, where: not is_nil(p.location), select: p.location)
    |> Repo.all()
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp offering_activity(canonical) do
    Enum.find(@activities, fn activity ->
      CandidateProvider.recommend(activity)
      |> Enum.any?(&(&1["name"] == canonical))
    end)
  end

  test "every seeded-world place can be created as a graph's place" do
    places = seeded_places!()

    # The enumeration is the seeded world's own rows; pinning the
    # set itself is the drift alarm - a renamed or dropped seeded
    # place fails here by name, not silently downstream.
    assert places == @seeded_places

    for place <- places do
      canonical = CandidateProvider.catalog_match(place)

      assert is_binary(canonical),
             "atlas does not recognize seeded place #{inspect(place)}"

      activity = offering_activity(canonical)

      assert is_binary(activity),
             "atlas never offers seeded place #{inspect(place)} for any activity"

      nominator = fresh_user("atlas-nominator")
      peer = fresh_user("atlas-peer")
      conv = fresh_conversation(nominator, peer)
      seed_plan_with_activity(conv, nominator, activity)

      assert {:ok, state} = ConversationAlignment.nominate_place(conv.id, nominator.id, place),
             "nominate_place rejected seeded place #{inspect(place)} under #{activity}"

      assert state["place"]["value"] == canonical

      assert {:ok, plan, _participants, false} =
               OpalCore.SocialFlow.create_plan_from_graph_create(nominator.id, %{
                 "title" => "Graph at #{place}",
                 "location" => place,
                 "idempotency_key" => "r24-atlas-#{:erlang.phash2(place)}"
               })

      assert plan.location == place
    end
  end

  test "the atlas gate stays honest for places it does not carry" do
    nominator = fresh_user("atlas-honest-nominator")
    peer = fresh_user("atlas-honest-peer")
    conv = fresh_conversation(nominator, peer)
    seed_plan_with_activity(conv, nominator, "dinner")

    # "Harbor Table" is a real entry of the OTHER place list
    # (RealWorld.Place.Catalog) but is not in this atlas and not in
    # this plan's state: still an honest :unknown_place.
    assert {:error, :unknown_place} =
             ConversationAlignment.nominate_place(conv.id, nominator.id, "Harbor Table")

    # An atlas place under the wrong activity is still
    # :activity_not_ready, not silently accepted.
    conv2 = fresh_conversation(nominator, peer)
    seed_plan_with_activity(conv2, nominator, "coffee")

    assert {:error, :activity_not_ready} =
             ConversationAlignment.nominate_place(conv2.id, nominator.id, "Juniper & Ivy")
  end

  test "catalog_match keeps shared first tokens from cross-matching" do
    # "oceanside" opens two catalog names, so it is distinctive of
    # neither: a bare city mention canonicalizes to nothing, while
    # each full name still resolves to its own entry.
    assert CandidateProvider.catalog_match("oceanside") == nil
    assert CandidateProvider.catalog_match("oceanside pier") == "Oceanside Pier"

    assert CandidateProvider.catalog_match("oceanside farmers market") ==
             "Oceanside Farmers Market"

    # The pre-existing distinctive-token behavior is unchanged.
    assert CandidateProvider.catalog_match("let's do juniper") == "Juniper & Ivy"
    assert CandidateProvider.catalog_match("harbor table") == nil
  end

  test "refers_to? owns the display-string join" do
    assert CandidateProvider.refers_to?("Herb & Wood, Little Italy", "Herb & Wood")
    assert CandidateProvider.refers_to?("The Brick Hotel, Oceanside", "Brick Hotel")
    assert CandidateProvider.refers_to?("Moonlight Beach, Encinitas", "Moonlight Beach")
    assert CandidateProvider.refers_to?("juniper & ivy", "Juniper & Ivy")
    refute CandidateProvider.refers_to?("Oceanside Pier", "Oceanside Farmers Market")
    refute CandidateProvider.refers_to?("Harbor Table", "Juniper & Ivy")
  end
end
