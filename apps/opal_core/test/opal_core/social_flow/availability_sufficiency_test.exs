defmodule OpalCore.SocialFlow.AvailabilitySufficiencyTest do
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Availability, AvailabilitySufficiency, TrustSafety}

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "suf-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "suf-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "suf-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  defp window!(user, start_hours_from_now, duration_hours, opts \\ []) do
    start_at =
      DateTime.utc_now()
      |> DateTime.add(start_hours_from_now * 3600, :second)
      |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, duration_hours * 3600, :second)

    expires_at = Keyword.get(opts, :expires_at)

    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: user.id,
        start_at: start_at,
        end_at: end_at,
        timezone: "America/Los_Angeles",
        source: "manual",
        expires_at: expires_at
      })

    w
  end

  test "pure cascade: no data → needs_input" do
    assert AvailabilitySufficiency.resolve(%{
             has_fresh_windows: false,
             shared_overlap_found: false
           }) == :needs_input
  end

  test "pure cascade: shared overlap → enough_to_compute" do
    assert AvailabilitySufficiency.resolve(%{
             shared_overlap_found: true,
             has_fresh_windows: true
           }) == :enough_to_compute
  end

  test "pure cascade: private preview → needs_permission" do
    assert AvailabilitySufficiency.resolve(%{
             has_fresh_windows: true,
             private_preview_overlap: true,
             peer_has_shares: true
           }) == :needs_permission
  end

  test "pure cascade: stale only → needs_confirmation" do
    assert AvailabilitySufficiency.resolve(%{
             stale_only_windows: true,
             has_fresh_windows: false
           }) == :needs_confirmation
  end

  test "pure cascade: blocked → no useful intervention" do
    assert AvailabilitySufficiency.resolve(%{blocked: true}) == :no_useful_intervention
  end

  test "no data → needs_input intervention", %{a: a, conv: conv} do
    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_input"
    assert i["authorizes_set"] == false
    assert i["private"] == true
    assert i["action_label"] == "Find a time"
  end

  test "fresh windows + peer share intersect → needs_permission with private copy", %{
    a: a,
    b: b,
    conv: conv
  } do
    wa = window!(a, 24, 4)
    wb = window!(b, 25, 4)

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_permission"
    assert i["private_copy"] =~ "lines up"
    assert i["action_label"] == "Share it"
    assert wa.id in i["suggested_window_ids"]
    # Preview is owner-private; public overlap not yet from shares of both
    assert i["overlap"] == nil
    assert i["preview_overlaps"] != []
    refute Map.has_key?(hd(i["preview_overlaps"]), "private_reason")
  end

  test "both shared with overlap → enough_to_compute", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 4)
    wb = window!(b, 25, 4)

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [wa.id]
             })

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "enough_to_compute"
    assert i["overlap"]["overlap_status"] == "overlap_found"
    assert i["authorizes_set"] == false
  end

  test "expired window → needs_confirmation", %{a: a, conv: conv} do
    past_start =
      DateTime.utc_now()
      |> DateTime.add(-10 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    past_end = DateTime.add(past_start, 2 * 3600, :second)

    {:ok, _w} =
      Availability.create_window(%{
        owner_user_id: a.id,
        start_at: past_start,
        end_at: past_end,
        timezone: "UTC",
        source: "manual"
      })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_confirmation"
    assert i["private_copy"] =~ "Still free"
  end

  test "revoked peer share cannot be used for preview", %{a: a, b: b, conv: conv} do
    _wa = window!(a, 24, 4)
    wb = window!(b, 25, 4)

    assert {:ok, shared, _projections} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    share_id = hd(shared).id
    assert {:ok, _} = Availability.revoke_share(b.id, share_id)

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    # No peer shares left → no private preview "lines up"
    assert i["preview_overlaps"] == []
    refute i["private_copy"] && String.contains?(i["private_copy"] || "", "lines up")
  end

  test "blocked relationship → no useful intervention", %{a: a, b: b, conv: conv} do
    _wa = window!(a, 24, 4)
    _wb = window!(b, 25, 4)

    assert {:ok, _, _} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: b.id
             })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "no_useful_intervention"
  end

  test "authorizes_set always false on intervention", %{a: a, conv: conv} do
    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["authorizes_set"] == false
    assert Availability.authorizes_set?(i) == false
  end
end
