defmodule OpalCore.SocialFlow.AlignmentFallbackMatrixTest do
  @moduledoc """
  Real-world fallback matrix — rows become tests/behavior.

  Packages 19–20 deep social reality journeys with natural messages.
  """
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AlignmentContext,
    AsymmetricParticipation,
    Availability,
    AvailabilitySufficiency,
    ConversationTimeEvidence,
    InterventionResolution,
    PlaceGap,
    PurposeBoundShare,
    TrustSafety
  }

  setup do
    uid = System.unique_integer([:positive])

    users =
      for label <- ~w(a b c d) do
        {:ok, u} =
          %User{}
          |> User.changeset(%{display_name: label, handle: "fb-#{label}-#{uid}"})
          |> Repo.insert()

        {String.to_atom(label), u}
      end
      |> Map.new()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "fb-#{uid}"})
      |> Repo.insert()

    for u <- [users.a, users.b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    {:ok, group} =
      %Conversation{}
      |> Conversation.changeset(%{label: "fb-g-#{uid}"})
      |> Repo.insert()

    for u <- [users.a, users.b, users.c] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: group.id, user_id: u.id})
      |> Repo.insert!()
    end

    Map.merge(users, %{conv: conv, group: group})
  end

  defp future(hours_from_now, duration_hours) do
    s =
      DateTime.utc_now()
      |> DateTime.add(hours_from_now * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {s, DateTime.add(s, duration_hours * 3600, :second)}
  end

  defp win!(user, hours_from_now, duration \\ 2, opts \\ []) do
    {s, e} = future(hours_from_now, duration)

    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: user.id,
        start_at: s,
        end_at: e,
        timezone: "America/Los_Angeles",
        source: "manual",
        expires_at: Keyword.get(opts, :expires_at)
      })

    w
  end

  # A. ideal 1:1 — Opal already knows enough
  test "A ideal 1:1 enough_to_compute", %{a: a, b: b, conv: conv} do
    wa = win!(a, 24)
    wb = win!(b, 24)

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
    assert i["authorizes_set"] == false
  end

  # B. stale context — one confirmation
  test "B stale → needs_confirmation", %{a: a, conv: conv} do
    expired = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:microsecond)
    _ = win!(a, 24, 2, expires_at: expired)

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_confirmation"
  end

  # C. no context — manual fallback
  test "C no context → needs_input", %{a: a, conv: conv} do
    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_input"
    assert i["action_label"] == "Find a time"
  end

  # D. asymmetric courtship — one barely participates
  test "D asymmetric: organizer carries silent peer", %{a: a, b: b, conv: conv} do
    wa = win!(a, 30)
    wb = win!(b, 30)

    # only B shared; A has private match → permission
    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [wb.id]
             })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "needs_permission"
    # A has private window — low-effort B never opened editor
    assert AsymmetricParticipation.can_proceed?([
             %{"engagement" => "organizer"},
             %{"engagement" => "never_editor"}
           ])

    _ = wa
  end

  # E. group partial participation
  test "E group partial shares still progress for active member", %{
    a: a,
    b: b,
    c: c,
    group: group
  } do
    wa = win!(a, 40)
    wb = win!(b, 40)
    # c contributes nothing

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: a.id,
               conversation_id: group.id,
               window_ids: [wa.id]
             })

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: group.id,
               window_ids: [wb.id]
             })

    assert {:ok, i} = Availability.resolve_intervention(group.id, a.id)
    assert i["decision"] == "enough_to_compute"

    assert AsymmetricParticipation.can_proceed?([
             "organizer",
             "active",
             "silent"
           ])

    _ = c
  end

  # F. private correction
  test "F private correction supersedes without restarting", %{a: a, conv: conv} do
    old = win!(a, 24)
    {s, e} = future(72, 3)

    assert {:ok, r} =
             Availability.apply_correction(%{
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               supersedes_window_id: old.id,
               conversation_id: conv.id,
               reason: "Actually Friday is better."
             })

    assert old.id in r["superseded_window_ids"]

    assert r["intervention"]["decision"] in ~w(needs_input needs_permission no_useful_intervention needs_confirmation)
  end

  # G. revoked share
  test "G revoke share removes from overlap", %{a: a, b: b, conv: conv} do
    wa = win!(a, 24)
    wb = win!(b, 24)

    assert {:ok, shares_a, _} =
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

    share_id = hd(shares_a).id
    assert {:ok, _} = Availability.revoke_share(a.id, share_id)
    assert {:ok, o} = Availability.compute_overlap(conv.id, a.id)
    assert o["overlap_status"] == "need_more_shares"
  end

  # H. blocked relationship
  test "H blocked → no_useful_intervention", %{a: a, b: b, conv: conv} do
    assert {:ok, _block_info, _} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: b.id
             })

    assert {:ok, i} = Availability.resolve_intervention(conv.id, a.id)
    assert i["decision"] == "no_useful_intervention"
  end

  # I. dynamic topic/time change → silence via general resolution
  test "I topic change forces silence even when overlap exists" do
    r =
      InterventionResolution.resolve(%{
        shared_overlap_found: true,
        forming?: true,
        context_confidence: 0.9,
        topic_changed: true
      })

    assert r.outcome == :silence
  end

  # J. time aligns → place becomes next gap
  test "J time resolved then place gap" do
    assert {:gap, :place} =
             PlaceGap.next_gap(%{
               time_aligned: true,
               place_known: false
             })
  end

  # Additional matrix rows
  test "fresh known availability pure cascade" do
    assert AvailabilitySufficiency.resolve(%{
             shared_overlap_found: true
           }) == :enough_to_compute
  end

  test "conflicting / no overlap with peer shares → needs_input", %{a: a, b: b, conv: conv} do
    wa = win!(a, 24)
    wb = win!(b, 96)

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
  end

  test "conversation-derived ambiguous stays non-authoritative" do
    p = ConversationTimeEvidence.heuristic_propose("Thursday might work.", "u")
    assert {:needs_confirmation, fact} = ConversationTimeEvidence.admit(p)
    assert fact["requires_confirmation"] == true
  end

  test "purpose revoke deactivates grant" do
    {:ok, req} =
      PurposeBoundShare.build_request(%{
        owner_user_id: "a",
        conversation_id: "c",
        purpose: "this_plan",
        plan_id: "p1",
        window_ids: ["w"]
      })

    refute PurposeBoundShare.active?(PurposeBoundShare.revoke(req))
  end

  test "alignment context composes after ideal share", %{a: a, b: b, conv: conv} do
    wa = win!(a, 24)
    wb = win!(b, 24)

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

    assert {:ok, ctx} = AlignmentContext.compose(conv.id, a.id)
    assert ctx["current_intervention_class"] == "enough_to_compute"
    assert ctx["current_gap"]["status"] == "resolved"
  end

  test "restraint: weak planning signal silent" do
    r =
      InterventionResolution.resolve(%{
        has_fresh_windows: true,
        forming?: false,
        casual_chat: true,
        context_confidence: 0.1
      })

    assert r.outcome == :silence
  end
end
