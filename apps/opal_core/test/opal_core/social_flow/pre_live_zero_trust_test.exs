defmodule OpalCore.SocialFlow.PreLiveZeroTrustTest do
  @moduledoc """
  Pre-Live zero-trust regressions discovered during adversarial soak.
  HOLD. DO NOT MERGE. DO NOT START LIVE.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    JourneyAuthority,
    TemporaryStoryPublishing,
    TrustSafety
  }

  setup do
    a = insert_user!("zt_a", "Sadeil")
    b = insert_user!("zt_b", "Chanelle")
    x = insert_user!("zt_x", "Outsider")
    y = insert_user!("zt_y", "Blocked")

    uid = System.unique_integer([:positive])

    # A↔B dyad conversation grants friend_visibility via RelationshipGraph.dyad_peers?
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "zt-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    assert {:ok, _body, _origin} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: y.id,
               reason_code: "pre_live_soak"
             })

    %{a: a, b: b, x: x, y: y, conv: conv}
  end

  test "P0: friends Story is NOT visible to unauthenticated-relationship outsider", %{
    a: a,
    b: b,
    x: x
  } do
    assert {:ok, story} =
             TemporaryStoryPublishing.create(a.id, %{
               "media_ref" => "/demo/moments/portrait.jpg",
               "visibility" => "friends",
               "caption" => "private-ish story"
             })

    listed_b = TemporaryStoryPublishing.list_for_viewer(b.id)
    listed_x = TemporaryStoryPublishing.list_for_viewer(x.id)
    listed_a = TemporaryStoryPublishing.list_for_viewer(a.id)

    assert Enum.any?(listed_a, &(&1["id"] == story["id"]))
    assert Enum.any?(listed_b, &(&1["id"] == story["id"]))
    refute Enum.any?(listed_x, &(&1["id"] == story["id"]))
  end

  test "P0: deleted Story disappears from viewer eligibility", %{a: a, b: b} do
    assert {:ok, story} =
             TemporaryStoryPublishing.create(a.id, %{
               "media_ref" => "/demo/moments/portrait.jpg",
               "visibility" => "friends",
               "caption" => "gone soon"
             })

    assert :ok = TemporaryStoryPublishing.delete_own(a.id, story["id"])
    refute Enum.any?(TemporaryStoryPublishing.list_for_viewer(b.id), &(&1["id"] == story["id"]))
    refute Enum.any?(TemporaryStoryPublishing.list_for_viewer(a.id), &(&1["id"] == story["id"]))
  end

  test "P0/P1: material_change bumps revision; stale expected_revision_id denied", %{
    a: a,
    b: b,
    conv: conv
  } do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => a.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    plan_id = journey["plan_id"]
    {:ok, _} = JourneyAuthority.add_people(plan_id, a.id, [b.id])
    {:ok, _} = JourneyAuthority.reconfirm(plan_id, b.id)

    assert {:ok, first} =
             JourneyAuthority.material_change(plan_id, a.id, %{
               "time_label" => "Saturday · 8:00 PM"
             })

    rev1 = first["revision_id"]
    assert is_binary(rev1)

    assert {:ok, second} =
             JourneyAuthority.material_change(plan_id, a.id, %{
               "time_label" => "Saturday · 9:00 PM",
               "expected_revision_id" => rev1
             })

    rev2 = second["revision_id"]
    assert rev2 != rev1

    assert {:error, :stale_revision} =
             JourneyAuthority.material_change(plan_id, a.id, %{
               "time_label" => "Saturday · 10:00 PM",
               "expected_revision_id" => rev1
             })
  end

  test "P1: withdrawn participant cannot reconfirm stale invitation", %{
    a: a,
    b: b,
    conv: conv
  } do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => a.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    plan_id = journey["plan_id"]
    {:ok, _} = JourneyAuthority.add_people(plan_id, a.id, [b.id])
    {:ok, _} = JourneyAuthority.reconfirm(plan_id, b.id)
    {:ok, _} = JourneyAuthority.cant_make_it(plan_id, b.id, %{})

    assert {:error, :stale_invitation} = JourneyAuthority.reconfirm(plan_id, b.id)
  end

  test "P1: blocked peer is not added to Journey", %{a: a, y: y, conv: conv} do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => a.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    assert {:ok, body} = JourneyAuthority.add_people(journey["plan_id"], a.id, [y.id])
    refute y.id in body["added_user_ids"]
  end

  defp insert_user!(handle, name) do
    suffix = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{handle: "#{handle}_#{suffix}", display_name: name})
    |> Repo.insert!()
  end
end
