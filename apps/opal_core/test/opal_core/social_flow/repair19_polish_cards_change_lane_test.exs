defmodule OpalCore.SocialFlow.Repair19PolishCardsChangeLaneTest do
  @moduledoc """
  Repair #19 polish, Cluster A (P1) - the request-a-change lane on
  P1 reveal items, derived in the ONE door (SocialFlow.Reveal).

  Presence rule (permission x alternatives), pinned as a matrix:

    permission = the plan carries a conversation AND the viewer is
                 a member of it AND another party exists to propose
                 to AND no change is already on the table (no
                 PlanRevision in "proposed" state);
    alternatives = another party's availability window shared into
                 that conversation, still usable now, not starting
                 at the plan's current start
                 (Availability.alternative_windows_for/3).

  Both true -> the P1 item carries the finished change_request
  object. Anything else -> change_request is nil (honest absence):
  conversation-less (sender-fixed) plans never carry it, and when
  the last alternative window closes the lane disappears on the
  next read.
  """
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    Availability,
    AvailabilityWindow,
    PlanParticipant,
    Reveal,
    SharedPlan
  }

  defp user!(name) do
    uid = System.unique_integer([:positive])

    {:ok, u} =
      %User{}
      |> User.changeset(%{display_name: name, handle: "lane-#{name}-#{uid}"})
      |> Repo.insert()

    u
  end

  defp conversation!(member_ids) do
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "lane-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  defp plan!(creator, attrs, participants) do
    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(
        Map.merge(
          %{
            title: "Lane dinner",
            status: "tentative",
            created_by_user_id: creator.id,
            timezone: "UTC",
            location: "Juniper",
            start_at: DateTime.add(DateTime.utc_now(), 3 * 24 * 3600, :second),
            time_label: "In three days"
          },
          attrs
        )
      )
      |> Repo.insert()

    for {user_id, response} <- participants do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: user_id,
        response_state: response,
        role: "participant"
      })
      |> Repo.insert!()
    end

    plan
  end

  defp share_window!(owner, conversation_id, start_at, hours \\ 3) do
    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: owner.id,
        start_at: start_at,
        end_at: DateTime.add(start_at, hours * 3600, :second),
        timezone: "UTC",
        source: "manual"
      })

    {:ok, shares, _} =
      Availability.share_windows(%{
        owner_user_id: owner.id,
        conversation_id: conversation_id,
        window_ids: [w.id]
      })

    {w, hd(shares)}
  end

  defp p1_item(viewer_id, plan_id) do
    feed = Reveal.for_viewer(viewer_id)
    Enum.find(feed["items"], &(&1["plan_id"] == plan_id and &1["category"] == "P1"))
  end

  setup do
    a = user!("Creator")
    b = user!("Viewer")
    conv = conversation!([a.id, b.id])

    plan =
      plan!(a, %{conversation_id: conv.id, source: "conversation"}, [
        {a.id, "accepted"},
        {b.id, "pending"}
      ])

    %{a: a, b: b, conv: conv, plan: plan}
  end

  test "permission x alternatives: both true - the lane is present with finished truth", %{
    a: a,
    b: b,
    conv: conv,
    plan: plan
  } do
    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, _share} = share_window!(a, conv.id, alt_start)

    item = p1_item(b.id, plan.id)
    assert item, "expected a P1 item for the pending viewer"
    lane = item["change_request"]
    assert lane["label"] == "Request a change"
    assert lane["conversation_id"] == conv.id
    assert lane["scope_person_id"] == a.id
    assert lane["scope_person_name"] == "Creator"
    assert [alt] = lane["alternatives"]
    assert alt["owner_user_id"] == a.id

    assert alt["display_start"] ==
             DateTime.to_iso8601(alt_start |> DateTime.truncate(:microsecond))
  end

  test "alternatives false: nobody shared a window - no lane", %{b: b, plan: plan} do
    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "alternatives false: only the viewer's own window is shared - no lane", %{
    b: b,
    conv: conv,
    plan: plan
  } do
    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, _share} = share_window!(b, conv.id, alt_start)

    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "alternatives false: the other party's window starts at the plan's current start - no lane",
       %{a: a, b: b, conv: conv, plan: plan} do
    {_w, _share} = share_window!(a, conv.id, plan.start_at)

    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "disappearance: when the alternative window closes (share revoked), the lane is gone on the next read",
       %{a: a, b: b, conv: conv, plan: plan} do
    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, share} = share_window!(a, conv.id, alt_start)
    assert p1_item(b.id, plan.id)["change_request"]

    assert {:ok, _} = Availability.revoke_share(a.id, share.id)
    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "disappearance: when the alternative window expires, the lane is gone on the next read",
       %{a: a, b: b, conv: conv, plan: plan} do
    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {w, _share} = share_window!(a, conv.id, alt_start)
    assert p1_item(b.id, plan.id)["change_request"]

    {:ok, _} =
      w
      |> AvailabilityWindow.changeset(%{
        expires_at: DateTime.add(DateTime.utc_now(), -3600, :second)
      })
      |> Repo.update()

    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "permission false: viewer is a plan participant but NOT a conversation member - no lane",
       %{a: a, b: b} do
    # A second conversation the viewer was never made a member of.
    conv2 = conversation!([a.id])

    plan2 =
      plan!(a, %{conversation_id: conv2.id, source: "conversation", title: "Lane other dinner"}, [
        {a.id, "accepted"},
        {b.id, "pending"}
      ])

    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, _share} = share_window!(a, conv2.id, alt_start)

    item = p1_item(b.id, plan2.id)
    assert item, "the reveal still surfaces to the participant"
    assert item["change_request"] == nil

    # And the alternatives source itself refuses a non-member.
    assert {:error, :not_a_member} = Availability.alternative_windows_for(conv2.id, b.id, nil)
  end

  test "sender-fixed class: a conversation-less plan never carries the lane", %{a: a, b: b} do
    plan3 =
      plan!(a, %{conversation_id: nil, source: "center", title: "Lane center plan"}, [
        {a.id, "accepted"},
        {b.id, "pending"}
      ])

    item = p1_item(b.id, plan3.id)
    assert item
    assert item["change_request"] == nil
  end

  test "a change already on the table owns the respond lane - no second request lane", %{
    a: a,
    b: b,
    conv: conv,
    plan: plan
  } do
    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, _share} = share_window!(a, conv.id, alt_start)
    assert p1_item(b.id, plan.id)["change_request"]

    assert {:ok, _} =
             OpalCore.SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: a.id,
               changes: %{"time_label" => "8 PM"},
               trace_id: "polish-cards-test"
             })

    item = p1_item(b.id, plan.id)
    assert item
    assert item["change_request"] == nil
  end

  test "plan state gate: a ready (P2) plan does not carry the lane even with alternatives", %{
    a: a,
    b: b,
    conv: conv
  } do
    ready =
      plan!(
        a,
        %{
          conversation_id: conv.id,
          source: "conversation",
          status: "agreed",
          title: "Lane ready brunch"
        },
        [{a.id, "accepted"}, {b.id, "accepted"}]
      )

    alt_start = DateTime.add(DateTime.utc_now(), 4 * 24 * 3600, :second)
    {_w, _share} = share_window!(a, conv.id, alt_start)

    feed = Reveal.for_viewer(b.id)
    item = Enum.find(feed["items"], &(&1["plan_id"] == ready.id))
    assert item["category"] == "P2"
    assert item["change_request"] == nil
  end
end
