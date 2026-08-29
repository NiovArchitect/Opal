defmodule OpalCore.SocialFlow.JourneyAuthorityTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  setup do
    lead = insert_user!("journey_lead", "Journey Lead")
    peer = insert_user!("journey_peer", "Journey Peer")
    stranger = insert_user!("journey_stranger", "Journey Stranger")

    uid = System.unique_integer([:positive])

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "journey-#{uid}"})
      |> Repo.insert()

    for uid <- [lead.id, peer.id] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    %{lead: lead, peer: peer, stranger: stranger, conv: conv}
  end

  test "activate creates agreed Journey with lead and leave honesty", %{
    lead: lead,
    conv: conv
  } do
    assert {:ok, journey} =
             JourneyAuthority.activate(%{
               "user_id" => lead.id,
               "conversation_id" => conv.id,
               "title" => "Juniper & Ivy",
               "location" => "Juniper & Ivy",
               "time_label" => "Saturday · 7:30 PM",
               "travel_minutes" => 18
             })

    assert journey["object_type"] == "journey"
    assert journey["lineage"]["same_reality"] == true
    assert journey["viewer"]["is_lead"] == true
    assert journey["place"] == "Juniper & Ivy"
    assert journey["when_label"] =~ "7:30"
    assert journey["leave"]["fabricated"] == false
    assert journey["leave"]["traffic_aware"] == false
    assert journey["reservation"]["live_execution"] == "NOT_CLAIMED"
    assert journey["navigation"]["available"] == true
  end

  test "cant_make_it withdraws only that participant", %{lead: lead, peer: peer, conv: conv} do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM",
        "travel_minutes" => 20
      })

    plan_id = journey["plan_id"]
    {:ok, _} = JourneyAuthority.add_people(plan_id, lead.id, [peer.id])
    {:ok, _} = JourneyAuthority.reconfirm(plan_id, peer.id)

    assert {:ok, body} = JourneyAuthority.cant_make_it(plan_id, peer.id, %{"note" => "sick"})
    assert body["cancels_everyone"] == false
    assert body["cancels_reservation_automatically"] == false

    peer_row =
      Enum.find(body["journey"]["participants"], &(&1["user_id"] == peer.id))

    assert peer_row["response_state"] == "withdrawn"
    assert body["journey"]["status"] in ~w(agreed changed)
  end

  test "non-lead material change denied; lead change requires reconfirm", %{
    lead: lead,
    peer: peer,
    conv: conv
  } do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM",
        "travel_minutes" => 15
      })

    plan_id = journey["plan_id"]
    {:ok, _} = JourneyAuthority.add_people(plan_id, lead.id, [peer.id])
    {:ok, _} = JourneyAuthority.reconfirm(plan_id, peer.id)

    assert {:error, :forbidden} =
             JourneyAuthority.material_change(plan_id, peer.id, %{
               "time_label" => "Saturday · 9:00 PM"
             })

    assert {:ok, changed} =
             JourneyAuthority.material_change(plan_id, lead.id, %{
               "time_label" => "Saturday · 9:00 PM"
             })

    assert changed["material"] == true
    assert changed["requires_reconfirmation"] == true
    assert changed["journey"]["status"] == "changed"

    peer_state =
      Enum.find(changed["journey"]["participants"], &(&1["user_id"] == peer.id))

    assert peer_state["response_state"] == "tentative"
  end

  test "stranger denied journey get", %{lead: lead, stranger: stranger, conv: conv} do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Private dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    assert {:error, :forbidden} = JourneyAuthority.get(journey["plan_id"], stranger.id)
  end

  test "add people does not imply chat widen flag", %{lead: lead, peer: peer, conv: conv} do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    assert {:ok, body} = JourneyAuthority.add_people(journey["plan_id"], lead.id, [peer.id])
    assert body["widens_chat_automatically"] == false
    assert body["marks_going_automatically"] == false
  end

  test "accept_going accepts current user only — others unchanged, no plan fabricate, no force nav",
       %{lead: lead, peer: peer, conv: conv} do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Saturday opens like this",
        "location" => "Oceanside Farmers Market",
        "time_label" => "Saturday · Oceanside"
      })

    plan_id = journey["plan_id"]
    {:ok, _} = JourneyAuthority.add_people(plan_id, lead.id, [peer.id])

    peer_before = Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: peer.id)
    assert peer_before.response_state == "proposed"

    assert {:ok, body} = JourneyAuthority.accept_going(plan_id, peer.id)
    assert body["current_user_accepted"] == true
    assert body["other_participants_unchanged"] == true
    assert body["shared_plan_duplicated"] == false
    assert body["reality_duplicated"] == false
    assert body["forced_navigation"] == false
    assert body["response_state"] == "accepted"
    assert body["journey_available"] == true

    peer_after = Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: peer.id)
    lead_after = Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: lead.id)

    assert peer_after.response_state == "accepted"
    assert lead_after.response_state == "accepted"
    assert lead_after.role == "lead"

    # Accept-going must not create a second SharedPlan for the conversation
    plans = Repo.all(from(p in SharedPlan, where: p.conversation_id == ^conv.id))
    assert length(plans) == 1
  end

  test "accept_going does not invent SharedPlan", %{peer: peer} do
    fake_id = Ecto.UUID.generate()
    assert {:error, :not_found} = JourneyAuthority.accept_going(fake_id, peer.id)
  end

  test "accept_going denies stranger without membership", %{
    lead: lead,
    stranger: stranger,
    conv: conv
  } do
    {:ok, journey} =
      JourneyAuthority.activate(%{
        "user_id" => lead.id,
        "conversation_id" => conv.id,
        "title" => "Dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday · 7:30 PM"
      })

    assert {:error, :forbidden} =
             JourneyAuthority.accept_going(journey["plan_id"], stranger.id)
  end

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end
end
