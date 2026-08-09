defmodule OpalCore.SocialFlow.AlignmentIntelligenceCampaignTest do
  @moduledoc """
  Campaign packages 4–19: pure contracts + runtime behavior under frozen UX.
  """
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AlignmentContext,
    AlignmentEvents,
    AsymmetricParticipation,
    Availability,
    AvailabilityCorrection,
    AvailabilitySourceFact,
    CalendarFreeBusyContract,
    ConversationTimeEvidence,
    DeviceCapabilityBoundary,
    InterventionResolution,
    InterventionTelemetry,
    LocationFitContract,
    PlaceGap,
    PurposeBoundShare,
    PythonIntelligenceBoundary
  }

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "camp-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "camp-b-#{uid}"})
      |> Repo.insert()

    {:ok, c} =
      %User{}
      |> User.changeset(%{display_name: "C", handle: "camp-c-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "camp-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, c: c, conv: conv, uid: uid}
  end

  defp window!(user, start_h, dur_h, opts \\ []) do
    start_at =
      DateTime.utc_now()
      |> DateTime.add(start_h * 3600, :second)
      |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, dur_h * 3600, :second)

    {:ok, w} =
      Availability.create_window(%{
        owner_user_id: user.id,
        start_at: start_at,
        end_at: end_at,
        timezone: "America/Los_Angeles",
        source: "manual",
        expires_at: Keyword.get(opts, :expires_at)
      })

    w
  end

  # ---------------------------------------------------------------------------
  # 4. Correction loop
  # ---------------------------------------------------------------------------

  test "correction supersedes prior window and recomputes intervention", %{a: a, b: b, conv: conv} do
    old = window!(a, 24, 3)
    w_b = window!(b, 24, 3)

    assert {:ok, _, _} =
             Availability.share_windows(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               window_ids: [w_b.id]
             })

    new_start =
      DateTime.add(DateTime.utc_now(), 48 * 3600, :second) |> DateTime.truncate(:microsecond)

    new_end = DateTime.add(new_start, 3 * 3600, :second)

    assert {:ok, result} =
             Availability.apply_correction(%{
               owner_user_id: a.id,
               start_at: new_start,
               end_at: new_end,
               timezone: "America/Los_Angeles",
               supersedes_window_id: old.id,
               conversation_id: conv.id,
               reason: "Actually Friday is better."
             })

    assert old.id in result["superseded_window_ids"]
    assert result["auto_shared"] == false
    assert result["authorizes_set"] == false
    assert {:error, :not_found} = Availability.get_my_window(a.id, old.id)
    assert is_map(result["intervention"])
  end

  test "correction classify_text maps natural phrases" do
    assert AvailabilityCorrection.classify_text("Actually Friday is better.") ==
             :replace_preferred

    assert AvailabilityCorrection.classify_text("Not Thursday anymore.") == :revoke_or_replace
    assert AvailabilityCorrection.classify_text("I get off earlier this week.") == :adjust_window
    assert AvailabilityCorrection.classify_text("Still free Thursday?") == :confirm_stale
    assert AvailabilityCorrection.classify_text("hey") == :none
  end

  # ---------------------------------------------------------------------------
  # 5. Conversation-derived time evidence
  # ---------------------------------------------------------------------------

  test "high-confidence conversation evidence is usable but not shared" do
    start_at =
      DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, 7200, :second)

    assert {:usable, fact} =
             ConversationTimeEvidence.admit(%{
               owner_user_id: "user-1",
               candidate_start: start_at,
               candidate_end: end_at,
               confidence: 0.9,
               provenance: "python"
             })

    assert fact["permission_scope"] == "owner_private"
    assert fact["authorizes_set"] == false
    assert fact["auto_share"] == false
  end

  test "ambiguous might-work requires confirmation; weak rejects" do
    start_at =
      DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, 7200, :second)

    assert {:needs_confirmation, _} =
             ConversationTimeEvidence.admit(%{
               owner_user_id: "user-1",
               candidate_start: start_at,
               candidate_end: end_at,
               confidence: 0.55
             })

    assert {:reject, :confidence_too_low} =
             ConversationTimeEvidence.admit(%{
               owner_user_id: "user-1",
               candidate_start: start_at,
               candidate_end: end_at,
               confidence: 0.2
             })
  end

  test "heuristic proposes then Elixir admits" do
    proposal = ConversationTimeEvidence.heuristic_propose("Thursday might work.", "user-1")
    assert is_map(proposal)

    assert match?(
             {status, _} when status in [:usable, :needs_confirmation, :reject],
             ConversationTimeEvidence.admit(proposal)
           )
  end

  # ---------------------------------------------------------------------------
  # 6. Asymmetric participation
  # ---------------------------------------------------------------------------

  test "asymmetric: organizer + silent peer can proceed without shame" do
    parts = [
      %{"engagement" => "organizer"},
      %{"engagement" => "silent"}
    ]

    assert AsymmetricParticipation.can_proceed?(parts)
    summary = AsymmetricParticipation.shared_summary(parts)
    assert summary["requires_symmetric_labor"] == false
    assert summary["shame_holdout"] == false

    bias = AsymmetricParticipation.intervention_bias("organizer", ["silent"])
    assert bias.shame_holdout == false
    assert bias.surface_policy == :organizer_carries
  end

  test "yes/no-only participant does not force symmetric editor labor" do
    level =
      AsymmetricParticipation.classify(%{
        message_count: 2,
        messages: ["yes", "not sure"],
        private_windows: 0,
        never_opened_editor: true
      })

    assert level in ~w(yes_no silent never_editor low_effort)

    refute AsymmetricParticipation.can_proceed?([
             %{"engagement" => "silent"},
             %{"engagement" => "never_editor"}
           ])

    assert AsymmetricParticipation.can_proceed?([
             %{"engagement" => "organizer"},
             %{"engagement" => "yes_no"}
           ])
  end

  # ---------------------------------------------------------------------------
  # 7. Purpose-bound sharing
  # ---------------------------------------------------------------------------

  test "purpose-bound share never implies derived conclusion reveal" do
    assert {:ok, req} =
             PurposeBoundShare.build_request(%{
               owner_user_id: "a",
               conversation_id: "c",
               window_ids: ["w1"],
               purpose: "this_conversation"
             })

    refute PurposeBoundShare.may_reveal_derived_conclusion?(req)
    assert req["shared_safe_only"] == true
    assert PurposeBoundShare.active?(req)

    revoked = PurposeBoundShare.revoke(req)
    refute PurposeBoundShare.active?(revoked)
  end

  test "until_expiry requires expires_at" do
    assert {:error, :expires_at_required} =
             PurposeBoundShare.build_request(%{
               owner_user_id: "a",
               conversation_id: "c",
               purpose: "until_expiry"
             })
  end

  # ---------------------------------------------------------------------------
  # 8. Alignment context
  # ---------------------------------------------------------------------------

  test "compose temporary alignment context", %{a: a, conv: conv} do
    assert {:ok, ctx} = AlignmentContext.compose(conv.id, a.id, %{"intent" => "hangout"})
    assert ctx["temporary"] == true
    assert ctx["revisable"] == true
    assert ctx["authorizes_set"] == false

    assert ctx["current_intervention_class"] in [
             "needs_input",
             "needs_permission",
             "needs_confirmation",
             "enough_to_compute",
             "no_useful_intervention"
           ]

    assert AlignmentContext.live?(ctx)
  end

  # ---------------------------------------------------------------------------
  # 9–10. General intervention + restraint
  # ---------------------------------------------------------------------------

  test "general intervention: enough → surface_result; casual → silence" do
    surface =
      InterventionResolution.resolve(%{
        shared_overlap_found: true,
        forming?: true,
        context_confidence: 0.9,
        participant_count: 2,
        overlap_count: 1
      })

    assert surface.outcome == :surface_result
    assert surface.authorizes_set == false

    quiet =
      InterventionResolution.resolve(%{
        shared_overlap_found: true,
        casual_chat: true,
        forming?: false
      })

    assert quiet.outcome == :silence

    ignored =
      InterventionResolution.resolve(%{
        needs_permission: true,
        private_preview_overlap: true,
        has_fresh_windows: true,
        forming?: true,
        ignored_suggestion: true
      })

    assert ignored.outcome == :silence
  end

  test "topic change and humans solving force silence" do
    assert InterventionResolution.resolve(%{
             shared_overlap_found: true,
             forming?: true,
             topic_changed: true
           }).outcome == :silence

    assert InterventionResolution.resolve(%{
             shared_overlap_found: true,
             forming?: true,
             humans_solving: true
           }).outcome == :silence
  end

  # ---------------------------------------------------------------------------
  # 11–12. Location + place gap
  # ---------------------------------------------------------------------------

  test "location fit shared benefit never leaks habitual language" do
    assert {:ok, f1} =
             LocationFitContract.private_fact(%{
               kind: "selected_meetup_area",
               owner_user_id: "a",
               area_label: "Mission"
             })

    assert {:ok, f2} =
             LocationFitContract.private_fact(%{
               kind: "selected_meetup_area",
               owner_user_id: "b",
               area_label: "Mission"
             })

    assert {:ok, benefit} = LocationFitContract.shared_safe_benefit([f1, f2])
    assert benefit["benefit_copy"] == "This area is easy for both of you."
    assert benefit["no_habitual_inference"] == true
    assert :ok = LocationFitContract.assert_shared_safe!(benefit)
  end

  test "place gap follows time alignment" do
    assert {:gap, :time_availability} = PlaceGap.next_gap(%{time_aligned: false})
    assert {:gap, :place} = PlaceGap.next_gap(%{time_aligned: true, place_known: false})
    assert :none = PlaceGap.next_gap(%{time_aligned: true, place_known: true})
  end

  # ---------------------------------------------------------------------------
  # 13. Group asymmetric (via participation)
  # ---------------------------------------------------------------------------

  test "group partial engagement does not freeze without unanimity" do
    group = [
      %{"engagement" => "organizer"},
      %{"engagement" => "active"},
      %{"engagement" => "silent"},
      %{"engagement" => "yes_no"}
    ]

    assert AsymmetricParticipation.can_proceed?(group)
    refute AsymmetricParticipation.can_proceed?(group, agreement_policy: "unanimity")
  end

  # ---------------------------------------------------------------------------
  # 14. Observability
  # ---------------------------------------------------------------------------

  test "telemetry event names are privacy-safe" do
    assert InterventionTelemetry.event_for_decision("needs_permission") ==
             "intervention.permission_requested"

    assert InterventionTelemetry.event_for_decision(:no_useful_intervention) ==
             "intervention.silent"

    assert :ok =
             InterventionTelemetry.assert_safe!(%{
               "decision" => "needs_input",
               "conversation_id" => "c1"
             })

    assert_raise ArgumentError, fn ->
      InterventionTelemetry.assert_safe!(%{"private_schedule" => %{}})
    end
  end

  # ---------------------------------------------------------------------------
  # 15. Python intelligence boundaries
  # ---------------------------------------------------------------------------

  test "python cannot authorize share/set/book/pay" do
    assert {:error, :forbidden_model_action} =
             PythonIntelligenceBoundary.admit(%{
               "result_type" => "time_evidence",
               "auto_share" => true,
               "candidate" => %{}
             })

    assert {:error, :forbidden_model_action} =
             PythonIntelligenceBoundary.admit(%{
               "result_type" => "plan_intent",
               "intent" => "dinner",
               "authorizes_set" => true,
               "confidence" => 0.9
             })
  end

  test "python time evidence admitted only via elixir" do
    start_at =
      DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)

    end_at = DateTime.add(start_at, 3600, :second)

    assert {:ok, %{type: :time_evidence, status: :usable}} =
             PythonIntelligenceBoundary.admit(%{
               "result_type" => "time_evidence",
               "candidate" => %{
                 "owner_user_id" => "u1",
                 "candidate_start" => start_at,
                 "candidate_end" => end_at,
                 "confidence" => 0.9
               }
             })
  end

  # ---------------------------------------------------------------------------
  # 16. Event/outbox readiness
  # ---------------------------------------------------------------------------

  test "alignment events ready and set blocked from availability path", %{conv: conv} do
    assert AlignmentEvents.allowed_from_availability?("availability.overlap_found")
    assert AlignmentEvents.allowed_from_availability?("alignment.gap_changed")
    refute AlignmentEvents.allowed_from_availability?("alignment.set")

    assert {:ok, _row} =
             AlignmentEvents.record("availability.overlap_found", conv.id, %{
               "decision" => "enough_to_compute"
             })
  end

  # ---------------------------------------------------------------------------
  # 17–18. Device + calendar contracts
  # ---------------------------------------------------------------------------

  test "device capability requires user authorization and does not execute" do
    assert {:error, :user_authorization_required} =
             DeviceCapabilityBoundary.build_handoff(%{
               capability: "calendar_free_busy",
               actor_user_id: "a",
               conversation_id: "c"
             })

    assert {:ok, handoff} =
             DeviceCapabilityBoundary.build_handoff(%{
               capability: "reminder",
               actor_user_id: "a",
               conversation_id: "c",
               user_authorized: true
             })

    assert handoff["status"] == "pending_device"
    assert handoff["avp2_payments_only"] == true
  end

  test "calendar free/busy inverts busy to free without titles" do
    hs = ~U[2026-08-10 09:00:00.000000Z]
    he = ~U[2026-08-10 17:00:00.000000Z]

    assert {:ok, busy} =
             CalendarFreeBusyContract.private_busy_block(%{
               owner_user_id: "a",
               start_at: ~U[2026-08-10 12:00:00.000000Z],
               end_at: ~U[2026-08-10 13:00:00.000000Z]
             })

    assert busy["no_event_titles"] == true
    assert {:ok, free} = CalendarFreeBusyContract.free_windows([busy], hs, he)
    assert length(free) == 2
    assert CalendarFreeBusyContract.readiness()["live_sync"] == false
    assert CalendarFreeBusyContract.readiness()["exposes_event_titles"] == false
  end

  # ---------------------------------------------------------------------------
  # Source fact contract
  # ---------------------------------------------------------------------------

  test "source fact from window + revoke", %{a: a} do
    w = window!(a, 24, 2)
    fact = AvailabilitySourceFact.from_window(w)
    assert fact["permission_scope"] == "owner_private"
    assert AvailabilitySourceFact.usable?(fact)
    revoked = AvailabilitySourceFact.revoke(fact)
    assert AvailabilitySourceFact.freshness_bucket(revoked) == "revoked"
    refute AvailabilitySourceFact.usable?(revoked)
  end
end
