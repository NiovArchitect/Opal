defmodule OpalCore.SocialFlow.Repair20RepeatPlanTest do
  @moduledoc """
  Repair #20 (F-15) - REPEAT A PLAN, backend pin.

  The web repeat flow ("Do that again" on a settled plan) creates the
  new plan through the ONE durable graph-create path
  (SocialFlow.create_plan_from_graph_create/2, POST
  /opal/plans/graph-create) carrying, explicitly:
  - source_plan_id (provenance -> alignment["repeated_from_plan_id"])
  - participant_user_ids = the settled plan's parties
  - location + place_lat/place_lon = the settled plan's place
  - time_label = a NEW time chosen in the flow

  This case drives exactly that payload and pins the contract:
  the repeat is a NEW forming (tentative) plan carrying the parties
  and the place; no link corruption - the source's conversation and
  meeting link are NOT carried onto the repeat; the original plan
  (row + participants) is byte-identical afterwards. The R16 rule
  stands beside it: a repeat that does NOT name the parties carries
  none (no silent copying) - the flow names them, the path never
  invents them.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  defp insert_user!(tag) do
    uniq = "#{System.unique_integer([:positive])}-#{:rand.uniform(1_000_000)}"

    %User{}
    |> User.changeset(%{handle: "r20#{tag}#{uniq}", display_name: "R20 #{tag} #{uniq}"})
    |> Repo.insert!()
  end

  defp participants_of(plan_id) do
    Repo.all(
      Ecto.Query.from(pp in PlanParticipant,
        where: pp.plan_id == ^plan_id,
        order_by: pp.user_id
      )
    )
  end

  test "repeat carries parties + place into a NEW forming plan; links not carried; original unchanged" do
    owner = insert_user!("owner")
    maya = insert_user!("maya")
    jordan = insert_user!("jordan")

    # The settled source: created through the same path, with a
    # conversation and a meeting link on the record (the corruption
    # risks), a real place with coordinates, and two other parties.
    assert {:ok, source, _, false} =
             SocialFlow.create_plan_from_graph_create(
               owner.id,
               %{
                 "title" => "Dinner at Juniper",
                 "location" => "Juniper & Ivy",
                 "place_lat" => 32.72,
                 "place_lon" => -117.16,
                 "time_label" => "Last Saturday - around 7:00 PM",
                 "participant_user_ids" => [maya.id, jordan.id],
                 "entry" => "graphs_plus"
               }
             )

    # Fixture setup only: settle the source and give it the two link
    # facts (a real conversation row, a meeting link) a repeat must
    # NOT inherit. change/2, not the product changeset - the writer
    # validations govern product writes, not this record's past.
    {:ok, conversation} =
      %OpalCore.Messaging.Conversation{}
      |> OpalCore.Messaging.Conversation.changeset(%{
        label: "r20-repeat-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    # A conversation plan's people are its conversation members
    # (ensure_plan_access gates conversation plans on membership).
    for user <- [owner, maya, jordan] do
      %OpalCore.Messaging.ConversationMember{}
      |> OpalCore.Messaging.ConversationMember.changeset(%{
        conversation_id: conversation.id,
        user_id: user.id
      })
      |> Repo.insert!()
    end

    source =
      source
      |> Ecto.Changeset.change(%{
        status: "completed",
        conversation_id: conversation.id,
        meeting_link: "https://meet.example/old-link",
        meeting_provider: "other"
      })
      |> Repo.update!()

    source_before = Repo.get!(SharedPlan, source.id)
    source_participants_before = participants_of(source.id)
    assert length(source_participants_before) == 3

    # The exact payload the web repeat flow sends: parties and place
    # carried, the NEW time chosen in the flow, provenance named.
    assert {:ok, repeated, repeated_participants, false} =
             SocialFlow.create_plan_from_graph_create(
               owner.id,
               %{
                 "title" => "Dinner at Juniper",
                 "location" => "Juniper & Ivy",
                 "place_lat" => 32.72,
                 "place_lon" => -117.16,
                 "time_label" => "Next Saturday - around 7:00 PM",
                 "participant_user_ids" => [maya.id, jordan.id],
                 "source_plan_id" => source.id,
                 "entry" => "repeat"
               }
             )

    # A NEW forming plan, not the source and not a mutation of it.
    refute repeated.id == source.id
    assert repeated.status == "tentative"
    assert repeated.created_by_user_id == owner.id
    assert repeated.alignment["repeated_from_plan_id"] == source.id

    # Parties carried: creator + both named parties, as pending
    # invitees on the new plan (nobody is auto-confirmed by a repeat).
    assert Enum.map(repeated_participants, & &1.user_id) |> Enum.sort() ==
             Enum.sort([owner.id, maya.id, jordan.id])

    invitees =
      Enum.filter(repeated_participants, &(&1.user_id != owner.id))

    assert Enum.all?(invitees, &(&1.response_state == "pending"))

    # Place carried, with its coordinates (re-read from the row -
    # the stored truth, float columns on the plan record).
    assert repeated.location == "Juniper & Ivy"
    stored = Repo.get!(SharedPlan, repeated.id)
    assert stored.place_lat == 32.72
    assert stored.place_lon == -117.16

    # The new time is the flow's chosen time - NOT the settled
    # plan's time copied silently.
    assert repeated.time_label == "Next Saturday - around 7:00 PM"

    # No link corruption: neither the source's conversation nor its
    # meeting link rides onto the repeat.
    assert repeated.conversation_id == nil
    assert repeated.meeting_link == nil

    # The original is untouched - row and participants byte-identical.
    assert Repo.get!(SharedPlan, source.id) == source_before
    assert participants_of(source.id) == source_participants_before
  end

  test "a repeat that names no parties carries none (the R16 no-silent-copy rule still holds)" do
    owner = insert_user!("owner2")
    maya = insert_user!("maya2")

    assert {:ok, source, _, false} =
             SocialFlow.create_plan_from_graph_create(
               owner.id,
               %{
                 "title" => "Moonlight paddle",
                 "location" => "Moonlight Beach",
                 "time_label" => "Saturday - around 6:00 PM",
                 "participant_user_ids" => [maya.id],
                 "entry" => "graphs_plus"
               }
             )

    assert {:ok, repeated, repeated_participants, false} =
             SocialFlow.create_plan_from_graph_create(
               owner.id,
               %{
                 "title" => "Moonlight paddle",
                 "time_label" => "Next Saturday - around 6:00 PM",
                 "source_plan_id" => source.id,
                 "entry" => "repeat"
               }
             )

    assert Enum.map(repeated_participants, & &1.user_id) == [owner.id]
  end
end
