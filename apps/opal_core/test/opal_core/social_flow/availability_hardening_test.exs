defmodule OpalCore.SocialFlow.AvailabilityHardeningTest do
  @moduledoc """
  Hardening: lifecycle, block, realtime, Set isolation, DST intervals, privacy.
  Availability is evidence only — never Set authority.
  """

  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Availability, ProductSignals}

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "h-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "h-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "h-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  defp window!(user, start_offset_h, duration_h) do
    start =
      DateTime.utc_now()
      |> DateTime.add(start_offset_h * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: user.id,
        start_at: start,
        end_at: DateTime.add(start, duration_h * 3600, :second),
        timezone: "America/Los_Angeles",
        source: "manual"
      })

    w
  end

  test "authorizes_set? is always false — overlap is not Set authority" do
    refute Availability.authorizes_set?(%{"overlap_status" => "overlap_found"})
    refute Availability.authorizes_set?(:any)
  end

  test "share + overlap alone never elevates ProductSignals to Set", %{a: a, b: b, conv: conv} do
    wa = window!(a, 24, 3)
    wb = window!(b, 24, 3)

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
    refute Availability.authorizes_set?(o)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    refute Enum.any?(signals, &(&1["label"] == "Set"))
  end

  test "share re-share is idempotent for same window", %{a: a, conv: conv} do
    w = window!(a, 24, 2)

    assert {:ok, [s1], _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    assert {:ok, [s2], _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    assert s1.id == s2.id
  end

  test "update then delete lifecycle recomputes and revokes shares", %{a: a, b: b, conv: conv} do
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

    far =
      DateTime.utc_now()
      |> DateTime.add(14 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    assert {:ok, _} =
             Availability.update_window(a.id, wa.id, %{
               start_at: far,
               end_at: DateTime.add(far, 3600, :second)
             })

    assert {:ok, o1} = Availability.compute_overlap(conv.id, a.id)
    assert o1["overlap_status"] == "no_overlap"

    assert {:ok, _} = Availability.delete_window(a.id, wa.id)
    assert {:error, :not_found} = Availability.get_my_window(a.id, wa.id)
    assert {:ok, shared} = Availability.list_shared_safe(conv.id, b.id)
    refute Enum.any?(shared, &(&1["owner_user_id"] == a.id))
  end

  test "revoke wrong conversation is forbidden", %{a: a, b: b, conv: conv} do
    {:ok, conv2} =
      %Conversation{}
      |> Conversation.changeset(%{label: "other-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv2.id, user_id: u.id})
      |> Repo.insert!()
    end

    w = window!(a, 24, 2)

    assert {:ok, [share], _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    assert {:error, :forbidden} = Availability.revoke_share(a.id, share.id, conv2.id)
    assert {:ok, _} = Availability.revoke_share(a.id, share.id, conv.id)
  end

  test "realtime shared projection is shared-safe", %{a: a, conv: conv} do
    w = window!(a, 24, 2)
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "conversation:#{conv.id}")

    assert {:ok, _shares, projections} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               window_ids: [w.id]
             })

    proj = hd(projections)
    Availability.assert_shared_safe!(proj)

    # Controller broadcasts on HTTP share; domain returns projection for callers to broadcast.
    # Emulate production broadcast path used by AvailabilityController.
    OpalCoreWeb.Endpoint.broadcast("conversation:#{conv.id}", "availability:shared", proj)

    assert_receive %Phoenix.Socket.Broadcast{
                     event: "availability:shared",
                     payload: payload
                   },
                   500

    Availability.assert_shared_safe!(payload)
    assert payload["shared_safe"] == true
    refute Map.has_key?(payload, "private_reason")
    refute Map.has_key?(payload, "calendar_title")
  end

  test "DST-boundary UTC instants intersect deterministically" do
    # 2026-03-08 US spring forward: 02:00 local becomes 03:00 in America/Los_Angeles.
    # We store UTC only — intersection must ignore local wall-clock ambiguity.
    # 09:00–12:00 UTC and 11:00–14:00 UTC → overlap 11:00–12:00 UTC.
    s1 = ~U[2026-03-08 09:00:00.000000Z]
    e1 = ~U[2026-03-08 12:00:00.000000Z]
    s2 = ~U[2026-03-08 11:00:00.000000Z]
    e2 = ~U[2026-03-08 14:00:00.000000Z]

    assert {~U[2026-03-08 11:00:00.000000Z], ~U[2026-03-08 12:00:00.000000Z]} =
             Availability.interval_intersect_utc(s1, e1, s2, e2)

    # No overlap across gap
    assert is_nil(
             Availability.interval_intersect_utc(
               ~U[2026-11-01 08:00:00.000000Z],
               ~U[2026-11-01 09:00:00.000000Z],
               ~U[2026-11-01 10:00:00.000000Z],
               ~U[2026-11-01 11:00:00.000000Z]
             )
           )

    # Touching endpoints (half-open style: end == start → no interior overlap)
    assert is_nil(
             Availability.interval_intersect_utc(
               ~U[2026-11-01 08:00:00.000000Z],
               ~U[2026-11-01 10:00:00.000000Z],
               ~U[2026-11-01 10:00:00.000000Z],
               ~U[2026-11-01 12:00:00.000000Z]
             )
           )
  end

  test "mutual message agreement can still reach Set after availability help", %{
    a: a,
    b: b,
    conv: conv
  } do
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

    # Availability alone is not Set
    assert {:ok, s0} = ProductSignals.signals_for_conversation(conv.id, a.id)
    refute Enum.any?(s0, &(&1["label"] == "Set"))

    # Existing conversation agreement path still works
    put_msg(conv, a, "We should study together.", 1)
    put_msg(conv, b, "I can do 5:30, not too late.", 2)
    put_msg(conv, a, "I'm in", 3)
    put_msg(conv, b, "Works for me", 4)

    assert {:ok, s1} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert Enum.any?(s1, &(&1["label"] == "Set"))
  end

  defp put_msg(conv, user, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conv.id,
      sender_user_id: user.id,
      client_message_id: "h-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()
  end
end
