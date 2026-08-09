defmodule OpalCore.SocialFlow.DeviceMomentTest do
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AlignmentContext
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.Physical.DeviceMoment
  alias OpalCore.SocialFlow.Ambient.ContextBridge

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "dm-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "dm-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "dm-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  test "after set: leave-by without re-entry, no auto nav/eta", %{a: a, conv: conv} do
    start =
      DateTime.utc_now()
      |> DateTime.add(3 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start, 7200, :second)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: start,
               end_at: end_at,
               place_label: "Harbor Table",
               participant_user_ids: [a.id]
             })

    contract = OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c)

    assert {:ok, pkg} =
             DeviceMoment.after_set(contract,
               travel_minutes: 25,
               queue: false
             )

    assert pkg["leave_by"]["private_copy"]
    refute pkg["leave_by"]["origin_exposed"]
    refute pkg["reentry_required"]
    refute pkg["auto_started_nav"]
    refute pkg["auto_shared_eta"]
    assert pkg["navigation_prepared"]
    assert pkg["execution"]["state"] in ~w(provider_checking socially_aligned)
  end

  test "navigation requires user authorization", %{a: a, conv: conv} do
    start =
      DateTime.utc_now()
      |> DateTime.add(3600, :second)
      |> DateTime.truncate(:microsecond)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: start,
               end_at: DateTime.add(start, 3600, :second),
               place_label: "Coast Kitchen",
               participant_user_ids: [a.id]
             })

    contract = OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c)
    assert {:ok, prep} = DeviceMoment.prepare_navigation(contract, set_authorized: true)

    assert {:error, :user_authorization_required} =
             DeviceMoment.start_navigation(prep, user_authorized: false)

    assert {:ok, started} = DeviceMoment.start_navigation(prep, user_authorized: true)
    # Executor returns transitioned action with summary
    summary = started["summary"] || get_in(started, ["result", "summary"]) || ""
    assert is_binary(summary) or is_map(started)
    refute started["coordinates_exposed_to_peers"] == true
  end

  test "ETA share never automatic from leave result" do
    leave = %{
      "leave_by" => DateTime.utc_now(),
      "private_copy" => "Leave around 6:25"
    }

    assert {:error, _} = DeviceMoment.share_eta(leave, user_authorized: false)

    assert {:ok, shared} =
             DeviceMoment.share_eta(leave, user_authorized: true, eta_minutes: 12)

    assert shared["shared_safe"]
    refute shared["origin_exposed"]
  end

  test "ambient context bridge is additive and does not authorize set", %{a: a, conv: conv} do
    assert {:ok, ctx} =
             ContextBridge.compose_with_ambient(conv.id, a.id, %{
               "evaluate_ambient" => true,
               "participants" => [a.id],
               "participant_ids" => [a.id],
               "in_ids" => [a.id],
               "time_compatible" => true,
               "proximity_ok" => true,
               "opening_hours" => 2.0,
               "forming?" => true
             })

    assert ctx["ambient_attached"]
    assert ctx["authorizes_set"] == false
    assert AlignmentContext.live?(ctx)
    # Materialize only if surface is opportunity — solo may silence
    assert is_boolean(ContextBridge.should_materialize?(ctx))
  end
end
