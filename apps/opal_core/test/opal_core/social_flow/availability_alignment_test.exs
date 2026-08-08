defmodule OpalCore.SocialFlow.AvailabilityAlignmentTest do
  @moduledoc """
  Phase 1 privacy + overlap matrix for additive availability alignment.
  Does not alter Set authority; no conversation requires availability rows.
  """

  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Availability, TrustSafety}

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "av-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "av-b-#{uid}"})
      |> Repo.insert()

    {:ok, c} =
      %User{}
      |> User.changeset(%{display_name: "C", handle: "av-c-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "av-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, c: c, conv: conv}
  end

  defp window!(user, start_hours_from_now, duration_hours, tz \\ "America/Los_Angeles") do
    start_at =
      DateTime.utc_now()
      |> DateTime.add(start_hours_from_now * 3600, :second)
      |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, duration_hours * 3600, :second)

    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: user.id,
        start_at: start_at,
        end_at: end_at,
        timezone: tz,
        source: "manual"
      })

    w
  end

  test "conversation works with zero availability rows", %{a: a, conv: conv} do
    assert {:ok, []} = Availability.list_shared_safe(conv.id, a.id)
    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "need_more_shares"
    assert o["overlaps"] == []
  end

  test "A creates private availability; B cannot see unshared", %{a: a, b: b, conv: conv} do
    w = window!(a, 24, 3)
    mine = Availability.list_my_windows(a.id)
    assert Enum.any?(mine, &(&1.id == w.id))

    assert {:ok, shared} = Availability.list_shared_safe(conv.id, b.id)
    assert shared == []

    # B must not read A's window via ownership path
    assert {:error, :forbidden} = Availability.get_my_window(b.id, w.id)
  end

  test "A shares one selected window; B sees only shared-safe form", %{a: a, b: b, conv: conv} do
    w = window!(a, 24, 3)

    assert {:ok, _shares, projections} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    assert length(projections) == 1
    proj = hd(projections)
    assert proj["shared_safe"] == true
    assert proj["display_start"]
    assert proj["display_end"]
    refute Map.has_key?(proj, "private_reason")
    refute Map.has_key?(proj, "calendar_title")
    Availability.assert_shared_safe!(proj)

    assert {:ok, shared_b} = Availability.list_shared_safe(conv.id, b.id)
    assert length(shared_b) == 1
    assert hd(shared_b)["share_id"] == proj["share_id"]
  end

  test "both share → intersection computed; partial overlap works", %{a: a, b: b, conv: conv} do
    # A: +24h for 4 hours
    # B: +25h for 4 hours → 3h overlap
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

    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "overlap_found"
    assert length(o["overlaps"]) == 1
    assert o["no_private_schedule"] == true
    Availability.assert_shared_safe!(o)
  end

  test "no overlap returns empty with shared-safe label", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 2)
    wb = window!(b, 48, 2)

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

    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "no_overlap"
    assert o["overlaps"] == []
  end

  test "timezone-tagged windows still intersect on UTC instants", %{a: a, b: b, conv: conv} do
    start =
      DateTime.utc_now()
      |> DateTime.add(36 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {:ok, wa} =
      Availability.create_window(%{
        owner_user_id: a.id,
        start_at: start,
        end_at: DateTime.add(start, 3 * 3600, :second),
        timezone: "America/New_York",
        source: "manual"
      })

    {:ok, wb} =
      Availability.create_window(%{
        owner_user_id: b.id,
        start_at: DateTime.add(start, 1800, :second),
        end_at: DateTime.add(start, 4 * 3600, :second),
        timezone: "America/Los_Angeles",
        source: "manual"
      })

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

    assert {:ok, o} = Availability.compute_overlap(conv.id, b.id)
    assert o["overlap_status"] == "overlap_found"
    assert length(o["overlaps"]) == 1
  end

  test "expired window excluded from share and overlap", %{a: a, b: b, conv: conv} do
    start =
      DateTime.utc_now()
      |> DateTime.add(24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {:ok, expired} =
      Availability.create_window(%{
        owner_user_id: a.id,
        start_at: start,
        end_at: DateTime.add(start, 2 * 3600, :second),
        timezone: "UTC",
        source: "manual",
        expires_at:
          DateTime.add(DateTime.utc_now(), -60, :second) |> DateTime.truncate(:microsecond)
      })

    wb = window!(b, 24, 2)

    assert {:error, :window_expired} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [expired.id]
             })

    # share valid B only → need_more
    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "need_more_shares"
  end

  test "revoked share excluded from overlap", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 3)
    wb = window!(b, 24, 3)

    assert {:ok, [share_a], _} =
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

    assert {:ok, o1} = Availability.compute_overlap(conv.id, a.id)
    assert o1["overlap_status"] == "overlap_found"

    assert {:ok, _} = Availability.revoke_share(a.id, share_a.id)
    assert {:ok, o2} = Availability.compute_overlap(conv.id, a.id)
    assert o2["overlap_status"] == "need_more_shares"
  end

  test "changed window recomputes overlap", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 2)
    wb = window!(b, 24, 2)

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

    assert {:ok, o1} = Availability.compute_overlap(conv.id, a.id)
    assert o1["overlap_status"] == "overlap_found"

    # Move A's window far away
    far =
      DateTime.utc_now()
      |> DateTime.add(10 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    assert {:ok, _} =
             Availability.update_window(a.id, wa.id, %{
               start_at: far,
               end_at: DateTime.add(far, 2 * 3600, :second)
             })

    assert {:ok, o2} = Availability.compute_overlap(conv.id, a.id)
    assert o2["overlap_status"] == "no_overlap"
  end

  test "deleted window removes share from overlap", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 2)
    wb = window!(b, 24, 2)

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

    assert {:ok, _} = Availability.delete_window(a.id, wa.id)
    assert {:ok, o} = Availability.compute_overlap(conv.id, b.id)
    assert o["overlap_status"] == "need_more_shares"
  end

  test "outsider C denied shared and overlap", %{a: a, c: c, conv: conv} do
    w = window!(a, 24, 2)

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    assert {:error, :not_a_member} = Availability.list_shared_safe(conv.id, c.id)
    assert {:error, :not_a_member} = Availability.compute_overlap(conv.id, c.id)
  end

  test "block prevents continued sharing and empties overlap", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 2)
    wb = window!(b, 24, 2)

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

    assert {:ok, _, _} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: b.id,
               conversation_id: conv.id,
               scope: "relationship",
               idempotency_key: "blk-av-#{System.unique_integer([:positive])}"
             })

    # New share blocked
    wa2 = window!(a, 48, 2)

    assert {:error, :blocked} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [wa2.id]
             })

    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "blocked"
    assert o["overlaps"] == []
  end

  test "private schedule reason never appears in shared payloads", %{a: a, b: b, conv: conv} do
    w = window!(a, 24, 2)

    assert {:ok, _, projections} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    blob = Jason.encode!(projections)
    refute blob =~ "not_this_time"
    refute blob =~ "calendar_title"
    refute blob =~ "private_reason"
    refute blob =~ "doctor"
    Availability.assert_shared_safe!(hd(projections))

    # B also shares so overlap path is exercised
    wb = window!(b, 24, 2)

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    assert {:ok, o} = Availability.compute_overlap(conv.id, b.id)
    Availability.assert_shared_safe!(o)
  end

  test "non-manual source rejected in Phase 1", %{a: a} do
    start =
      DateTime.utc_now()
      |> DateTime.add(3600, :second)
      |> DateTime.truncate(:microsecond)

    assert {:error, :source_not_enabled} =
             Availability.create_window(%{
               owner_user_id: a.id,
               start_at: start,
               end_at: DateTime.add(start, 3600, :second),
               timezone: "UTC",
               source: "calendar_free_busy"
             })
  end
end
