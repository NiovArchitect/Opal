defmodule OpalCore.SocialFlow.Repair15CanonicalVenueDbTest do
  @moduledoc """
  Repair #15 (Track G) — DB-backed call sites of the canonical venue
  surgery, on fresh randomized accounts (no fixture people):

  6. nominate_place/3 — the button endpoint. Old: any name outside the
     3 hardcoded restaurants returned :unknown_place, including the
     catalog's own Bird Rock Coffee under a coffee activity (the UI
     offered it; the endpoint refused it). New: offered candidates and
     in-plan places nominate; catalog places under the wrong activity
     return :activity_not_ready; anything else still :unknown_place.
  5. maybe_synth_place — a plan stored with a locked non-catalog place
     keeps that place after a resync (previously silently dropped).
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.SharedPlan

  defp fresh_user do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r15-#{suffix}",
      display_name: "R15 #{suffix}"
    })
    |> Repo.insert!()
  end

  defp fresh_conversation(user_a, user_b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "r15-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for user <- [user_a, user_b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
      |> Repo.insert!()
    end

    conv
  end

  defp seed_plan(conv, creator, alignment) do
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

  defp activity_alignment(activity) do
    %{
      "explicit_actions" => [
        %{
          "kind" => "activity_lock",
          "actor_user_id" => "seed",
          "value" => activity,
          "truth" => "user_stated",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      ]
    }
  end

  test "nominate: coffee activity can nominate its own offered candidate (Bird Rock Coffee)" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)
    # actor must be the plan creator for the synth activity lock; use a.id
    alignment =
      put_in(activity_alignment("coffee"), ["explicit_actions"], [
        %{
          "kind" => "activity_lock",
          "actor_user_id" => a.id,
          "value" => "coffee",
          "truth" => "user_stated",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      ])

    seed_plan(conv, a, alignment)

    assert {:ok, state} = ConversationAlignment.nominate_place(conv.id, a.id, "Bird Rock Coffee")
    assert state["place"]["state"] == "candidate"
    assert state["place"]["value"] == "Bird Rock Coffee"
  end

  test "nominate: catalog place under the wrong activity is :activity_not_ready, not :unknown_place" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)
    seed_plan(conv, a, activity_alignment("coffee"))

    assert {:error, :activity_not_ready} =
             ConversationAlignment.nominate_place(conv.id, a.id, "Juniper & Ivy")
  end

  test "nominate: a name no pipeline knows still errors honestly" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)
    seed_plan(conv, a, activity_alignment("dinner"))

    assert {:error, :unknown_place} =
             ConversationAlignment.nominate_place(conv.id, a.id, "Harbor Table")

    assert {:error, :unknown_place} =
             ConversationAlignment.nominate_place(conv.id, a.id, "  ")
  end

  test "nominate: an in-plan generic place can be re-nominated (conflict option path)" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)

    alignment =
      activity_alignment("dinner")
      |> put_in(["explicit_actions"], [
        %{
          "kind" => "activity_lock",
          "actor_user_id" => a.id,
          "value" => "dinner",
          "truth" => "user_stated",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        },
        %{
          "kind" => "place_propose",
          "actor_user_id" => a.id,
          "value" => "Harbor Table",
          "truth" => "proposed",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        },
        %{
          "kind" => "place_propose",
          "actor_user_id" => b.id,
          "value" => "Contramar",
          "truth" => "proposed",
          "explicit" => true,
          "schema_version" => 1,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      ])

    seed_plan(conv, a, alignment)

    # The plan is conflicted between two generic places; tapping a conflict
    # option re-nominates it — this must not :unknown_place.
    assert {:ok, state} = ConversationAlignment.nominate_place(conv.id, a.id, "Contramar")
    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Contramar"
  end

  test "nominate: non-member is refused before any place logic" do
    a = fresh_user()
    b = fresh_user()
    outsider = fresh_user()
    conv = fresh_conversation(a, b)
    seed_plan(conv, a, activity_alignment("dinner"))

    assert {:error, :not_a_member} =
             ConversationAlignment.nominate_place(conv.id, outsider.id, "Juniper & Ivy")
  end

  test "restore: a stored locked non-catalog place survives resync" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)

    seed_plan(conv, a, %{
      "place" => %{"state" => "locked", "value" => "Harbor Table"},
      "explicit_actions" => []
    })

    state = ConversationAlignment.sync_conversation(conv.id)
    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Harbor Table"
    assert state["place"]["lock_reason"] == "restored"
  end

  test "restore: a stored locked catalog place still survives resync (no regression)" do
    a = fresh_user()
    b = fresh_user()
    conv = fresh_conversation(a, b)

    seed_plan(conv, a, %{
      "place" => %{"state" => "locked", "value" => "Fort Oak"},
      "explicit_actions" => []
    })

    state = ConversationAlignment.sync_conversation(conv.id)
    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Fort Oak"
  end
end
