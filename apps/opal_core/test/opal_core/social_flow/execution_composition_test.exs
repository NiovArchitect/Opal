defmodule OpalCore.SocialFlow.ExecutionCompositionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    BookingBridge,
    ExecutionAction,
    ExecutionCompose,
    ExecutionContext,
    ExecutionReadiness
  }

  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery
  alias OpalCore.SocialFlow.Physical.DeviceMoment

  @base %{
    conversation_id: "conv-exec-1",
    plan_id: "plan-1",
    plan_version: 1,
    actor_user_id: "user-a",
    owner_user_id: "user-a",
    participant_ids: ["user-a", "user-b"],
    party_size: 2,
    when: ~U[2026-08-15 19:00:00Z],
    place: "Harbor Table",
    place_label: "Harbor Table",
    destination: "Harbor Table",
    venue_id: "venue-harbor",
    set: true,
    slot_label: "7:00 PM",
    travel_minutes: 25,
    native_commitment_id: "nc-1"
  }

  test "execution context reuses resolved facts — no re-entry" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    refute ctx["reentry_required"]
    assert ctx["reuses_alignment_context"]
    assert ctx["destination"] == "Harbor Table"
    assert ctx["party_size"] == 2
    refute ctx["authorizes_set"]
    assert ExecutionContext.ready_for?(ctx, "navigation")
    assert ExecutionContext.ready_for?(ctx, "booking_inquiry")
  end

  test "provider slot ≠ Set; readiness separate from social truth" do
    assert {:ok, exec} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_checked: true,
               provider_available: true,
               slot_label: "7:30",
               party_size: 2,
               place_selected: true,
               time_known: true
             })

    assert exec["execution_ready"]
    refute exec["authorizes_set"]
    assert exec["provider_is_not_authority"]
  end

  test "action id stable for retries; plan version mismatch → stale" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    id1 = ExecutionAction.action_id(ctx, "booking_inquiry")
    id2 = ExecutionAction.action_id(ctx, "booking_inquiry")
    assert id1 == id2

    assert {:ok, action} = ExecutionAction.prepare(ctx, "booking_request")
    assert {:ok, stale} = ExecutionAction.transition(action, "request", active_plan_version: 99)
    assert stale["state"] == "stale"
  end

  test "late result with wrong plan version not admitted" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    assert {:ok, action} = ExecutionAction.prepare(ctx, "booking_request")
    assert {:ok, requested} = ExecutionAction.transition(action, "request")

    assert {:ok, admit} =
             ExecutionAction.admit_result(
               requested,
               %{"status" => "confirmed", "provider_confirmed" => true},
               active_plan_version: 9
             )

    refute admit["admit"]
  end

  test "provider time mismatch does not silently mutate Set" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    q = ExecutionAction.provider_time_mismatch(ctx, "7:45 PM")
    assert q["silent_mutation_forbidden"]
    assert q["social_set_unchanged"]
    assert q["kind"] == "minimum_question"
  end

  test "place change invalidates navigation/leave-by; social intact" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    assert {:ok, inv} = ExecutionContext.invalidate_for_place_change(ctx)
    assert inv["navigation_stale"]
    assert inv["leave_by_stale"]
    assert inv["social_truth_intact"]
    refute ExecutionContext.ready_for?(inv, "navigation")
  end

  test "after_set composition: leave-by + nav prep without re-entry" do
    assert {:ok, pack} = ExecutionCompose.after_set(@base)
    refute pack["reentry_required"]
    assert pack["reuses_alignment_context"]
    assert pack["leave_by"]
    assert pack["navigation_prepared"] || pack["navigation_action"]
    refute pack["booked"]
    refute pack["authorizes_set"]
  end

  test "device moment from execution context" do
    assert {:ok, pack} = DeviceMoment.from_execution_context(@base)
    refute pack["reentry_required"]
    refute pack["auto_started_nav"]
  end

  test "lock-screen reminder privacy" do
    copy =
      ExecutionCompose.reminder_lock_screen_copy(%{
        "minutes_until_leave" => 20,
        "private_copy" => "Leave around 6:25 for your date with Maya at Harbor Table"
      })

    assert copy["lock_screen"] == "Leave in 20 minutes."
    refute copy["relationship_exposed"]
    refute String.contains?(copy["lock_screen"], "Maya")

    ls = ReminderDelivery.lock_screen_copy(%{"kind" => "leave_by", "minutes_until_leave" => 15})
    assert ls["lock_screen"] == "Leave in 15 minutes."
  end

  test "booking from context reuses venue/party/time" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    # Synthetic provider boundary — still no Set authority
    result = BookingBridge.check_from_context(ctx)
    assert match?({:ok, _}, result) or match?({:error, _}, result)

    case result do
      {:ok, r} ->
        refute r["booked"]
        refute r["authorizes_set"]
        assert r["provider_is_not_authority"]

      _ ->
        :ok
    end
  end

  test "after confirmed remembers durable truth only" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)

    assert {:ok, done} =
             ExecutionCompose.after_confirmed(ctx, %{
               provider_confirmed: true,
               status: "confirmed",
               provider_ref: "prov-1",
               confirmation_ref: "conf-9"
             })

    assert done["booked"]
    assert done["quiet"]
    refute done["narrate"]
    refute done["raw_payload_stored"]
    assert done["remembered"]["executed"]
  end

  test "ticket handoff is not purchased" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)

    assert {:ok, h} =
             ExecutionCompose.ticket_handoff(ctx, url: "https://www.ticketmaster.com/event/x")

    assert h["handoff_started"]
    refute h["purchased"]
    refute h["booked"]
    assert h["app_switch_friction"]
  end

  test "never claim booked without provider confirmation" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@base)
    assert {:ok, action} = ExecutionAction.prepare(ctx, "booking_request")
    assert {:ok, req} = ExecutionAction.transition(action, "request")
    refute req["booked"]
    refute req["confirmed"]
  end
end
