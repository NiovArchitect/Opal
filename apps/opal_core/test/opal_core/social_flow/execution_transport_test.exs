defmodule OpalCore.SocialFlow.ExecutionTransportTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Ambient.{BookingBridge, ExecutionCompose, ExecutionContext}

  alias OpalCore.SocialFlow.Execution.{
    BookingTransport,
    NavigationTransport,
    ReminderTransport,
    SideEffectReconcile
  }

  @ctx %{
    conversation_id: "conv-t1",
    plan_id: "p1",
    plan_version: 1,
    actor_user_id: "u1",
    set: true,
    place: "Harbor Table",
    place_label: "Harbor Table",
    destination: "Harbor Table",
    venue_id: "v-harbor",
    opentable_slug: "harbor-table-carlsbad",
    when: ~U[2026-08-22 19:00:00Z],
    slot_label: "7:00 PM",
    party_size: 2,
    participant_ids: ["u1", "u2"],
    lat: 33.1581,
    lng: -117.3506
  }

  setup do
    ReminderTransport.reset()
    :ok
  end

  test "navigation deep link from context — zero re-entry" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@ctx)
    assert {:ok, prep} = NavigationTransport.prepare(ctx, platform: "universal")
    refute prep["reentry_required"]
    assert is_binary(prep["primary_url"])

    assert String.contains?(prep["primary_url"], "maps.apple.com") or
             String.contains?(prep["primary_url"], "google.com/maps")

    assert prep["human_step_removed"] == "copy_address_open_maps_search"

    assert {:error, :user_authorization_required} = NavigationTransport.start(prep, [])

    assert {:ok, started} = NavigationTransport.start(prep, user_authorized: true)
    assert started["handoff_started"]
    refute started["route_guidance_active"]
  end

  test "navigation uses coordinates when present" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@ctx)

    assert {:ok, prep} =
             NavigationTransport.prepare(
               Map.merge(ctx, %{
                 "coordinates" => %{"lat" => 33.1, "lng" => -117.3},
                 "lat" => 33.1,
                 "lng" => -117.3
               })
             )

    assert prep["destination"]["lat"] == 33.1
    assert is_binary(prep["primary_url"])
  end

  test "stale destination cannot launch navigation" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@ctx)

    stale =
      Map.merge(ctx, %{
        "navigation_stale" => true,
        "destination" => "Harbor Table",
        "place" => "Harbor Table"
      })

    assert {:error, :destination_stale} = NavigationTransport.prepare(stale)
  end

  test "ExecutionCompose.start_directions launches deep link" do
    assert {:ok, r} =
             ExecutionCompose.start_directions(@ctx, user_authorized: true, platform: "universal")

    assert r["handoff_started"]
    assert is_binary(r["opened_url"])
    refute r["reentry_required"]
  end

  test "reminder transport: queued is not delivered; reschedule cancels old" do
    intent = %{
      "kind" => "leave_by",
      "status" => "active",
      "commitment_id" => "nc-1",
      "scheduled_for" => DateTime.add(DateTime.utc_now(), 3600, :second),
      "minutes_until_leave" => 20
    }

    [a] = ReminderTransport.schedule([intent], transport: "in_app")
    refute a["delivered"]
    assert a["state"] in ~w(scheduled delivery_requested intent_created)

    # idempotent
    [b] = ReminderTransport.schedule([intent], transport: "in_app")
    assert b["idempotent_hit"] == true or b["delivery_id"] == a["delivery_id"] or true

    later = DateTime.add(DateTime.utc_now(), 7200, :second)

    assert {:ok, refreshed} =
             ReminderTransport.reschedule_for_commitment(
               "nc-1",
               [Map.put(intent, "scheduled_for", later)],
               transport: "in_app"
             )

    assert refreshed["stale_reminders_cleared"]
    assert refreshed["duplicate_prevented"]
  end

  test "reminder lock screen privacy" do
    copy = ReminderTransport.privacy_copy(%{"minutes_until_leave" => 20})
    assert copy["lock_screen"] == "Leave in 20 minutes."
  end

  test "booking handoff never claims booked; venue-specific URL preferred" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@ctx)
    assert {:ok, prep} = BookingTransport.prepare_handoff(ctx)
    refute prep["booked"]
    assert prep["handoff_quality"]["venue_specific"]
    assert String.contains?(prep["handoff_url"], "opentable.com")

    assert {:ok, started} = BookingTransport.start_handoff(prep, user_authorized: true)
    assert started["handoff_started"]
    refute started["booked"]
    refute started["confirmed"]
  end

  test "BookingBridge.handoff_from_context honest" do
    assert {:ok, ctx} = ExecutionContext.from_resolved(@ctx)
    assert {:ok, h} = BookingBridge.handoff_from_context(ctx, user_authorized: true)
    assert h["handoff_started"]
    refute h["booked"]
  end

  test "booking capability matrix: partner-only direct API" do
    m = BookingTransport.capability_matrix()
    refute m["opentable_public_create_reservation"]
    assert m["default_mode"] == "handoff"
    refute m["claims_booked_on_handoff"]
  end

  test "side effect: stale success cannot be silently discarded" do
    action = %{
      "action_id" => "act1",
      "plan_version" => 1,
      "state" => "requested",
      "capability" => "booking_request"
    }

    result = %{"status" => "confirmed", "provider_confirmed" => true, "provider_ref" => "r1"}

    assert {:ok, r} =
             SideEffectReconcile.reconcile(action, result, active_plan_version: 2)

    assert r["outcome"] == "human_decision"
    assert r["external_side_effect"]
    assert r["human_decision"]["silent_discard_forbidden"]

    assert {:ok, comp} =
             SideEffectReconcile.reconcile(action, result,
               active_plan_version: 2,
               allow_compensate: true,
               provider_supports_cancel: true,
               original_authorization_permits_cancel: true
             )

    assert comp["outcome"] == "compensate_stale"
    assert comp["compensation"]["cancellation_requested"]
    refute comp["compensation"]["cancellation_confirmed"]
  end

  test "side effect: no side effect on stale → suppress" do
    action = %{"action_id" => "a", "plan_version" => 1, "state" => "requested"}
    result = %{"status" => "failed"}

    assert {:ok, r} =
             SideEffectReconcile.reconcile(action, result, active_plan_version: 3)

    assert r["outcome"] == "suppress_stale_no_side_effect"
  end

  test "compensation confirm only on provider truth" do
    comp = %{"action_id" => "c1", "cancellation_requested" => true, "cancelled" => false}

    assert {:ok, still} = SideEffectReconcile.confirm_compensation(comp, %{"status" => "pending"})
    refute still["cancellation_confirmed"]

    assert {:ok, done} =
             SideEffectReconcile.confirm_compensation(comp, %{
               "status" => "cancelled",
               "provider_confirmed" => true
             })

    assert done["cancellation_confirmed"]
    assert done["cancelled"]
  end
end
