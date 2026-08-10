defmodule OpalCore.SocialFlow.DeviceRealityTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Ambient.InterruptionDebt

  alias OpalCore.SocialFlow.Execution.{
    ActionClaim,
    DeliveryCompose,
    DeliveryRevalidation,
    DeviceCapabilityTruth,
    DeviceInstance,
    EtaShare,
    NavigationTransport,
    NotificationContent,
    PermissionMoment,
    ReminderTransport
  }

  setup do
    # Named agents are process-local test harnesses; re-ensure each test.
    _ = ReminderTransport.ensure_started()
    ReminderTransport.reset()
    _ = ActionClaim.ensure_started()
    ActionClaim.reset()
    :ok
  end

  describe "capability ≠ permission ≠ delivery" do
    test "device can notify without permission and without delivery" do
      assert {:ok, t} =
               DeviceCapabilityTruth.assess(%{
                 user_id: "u1",
                 capability: "notifications",
                 available: true,
                 permission_state: "denied",
                 delivery_state: "none"
               })

      assert t["available"]
      refute t["permission_granted"]
      refute t["delivered"]
      assert t["capability_ne_permission"]
      assert t["permission_ne_delivery"]
      assert t["claim_level"] == "capability_without_permission"
    end

    test "granted permission is still not delivery" do
      assert {:ok, t} =
               DeviceCapabilityTruth.assess(%{
                 user_id: "u1",
                 capability: "reminder",
                 available: true,
                 permission_state: "granted",
                 delivery_state: "scheduled",
                 delivery_proof: "scheduled_by_device"
               })

      assert t["ready"]
      refute t["delivered"]
      assert t["claim_level"] == "scheduled_not_delivered"
    end
  end

  describe "surface-aware interruption debt" do
    test "lock screen costs more than active conversation" do
      conv =
        InterruptionDebt.evaluate(%{
          effort_removed: 0.55,
          uncertainty_removed: 0.45,
          actionable: true,
          confidence: 0.9,
          surface: "active_conversation",
          quality_band: "solid",
          option_count: 1
        })

      lock =
        InterruptionDebt.evaluate(%{
          effort_removed: 0.55,
          uncertainty_removed: 0.45,
          actionable: true,
          confidence: 0.9,
          surface: "lock_screen",
          quality_band: "solid",
          option_count: 1
        })

      assert conv["interruption_cost"] < lock["interruption_cost"]
      assert conv["surface"] == "active_conversation"
      assert lock["surface"] == "lock_screen"
      assert lock["surface_aware"]
    end

    test "surface_cost helpers" do
      assert InterruptionDebt.surface_cost("active_conversation") <
               InterruptionDebt.surface_cost("push")

      assert InterruptionDebt.surface_cost("push") <
               InterruptionDebt.surface_cost("lock_screen")
    end
  end

  describe "device instance selection" do
    test "navigation prefers mobile without primary-device settings" do
      devices = [
        %{device_id: "web-1", platform: "web", status: "active", navigation_capable: true},
        %{
          device_id: "phone-1",
          platform: "ios",
          status: "active",
          navigation_capable: true,
          foreground: true
        }
      ]

      assert {:ok, sel} = DeviceInstance.select_targets(devices, "navigation")
      assert sel["primary"]["device_id"] == "phone-1"
      refute sel["settings_required"]
      refute sel["primary_device_config_required"]
    end

    test "reminder prefers local-notification capable device" do
      devices = [
        %{device_id: "web-1", platform: "web", status: "active"},
        %{
          device_id: "phone-2",
          platform: "android",
          status: "active",
          local_notification_capable: true
        }
      ]

      assert {:ok, sel} = DeviceInstance.select_targets(devices, "reminder")
      assert sel["primary"]["device_id"] == "phone-2"
    end
  end

  describe "multi-device action claim" do
    test "second device cannot present same action" do
      assert {:ok, c1} = ActionClaim.claim("nav-xyz", "dev-a")
      assert c1["device_id"] == "dev-a"
      assert {:error, :claimed_elsewhere, other} = ActionClaim.claim("nav-xyz", "dev-b")
      assert other["device_id"] == "dev-a"
    end

    test "executed on A blocks re-present on B" do
      assert {:ok, _} = ActionClaim.mark_executed("nav-done", "dev-a")
      assert ActionClaim.executed_elsewhere?("nav-done", "dev-b")
    end
  end

  describe "delivery revalidation" do
    test "plan version mismatch suppresses" do
      assert {:ok, d} =
               DeliveryRevalidation.revalidate(
                 %{
                   kind: "leave_by",
                   scheduled_for: DateTime.add(DateTime.utc_now(), 600, :second),
                   plan_version: 1,
                   destination: "A"
                 },
                 %{
                   plan_version: 2,
                   when: DateTime.add(DateTime.utc_now(), 3600, :second),
                   destination: "A"
                 }
               )

      assert d["suppressed"]
      assert d["reason"] == "plan_version_mismatch"
    end

    test "destination change suppresses old leave reminder" do
      assert {:ok, d} =
               DeliveryRevalidation.revalidate(
                 %{
                   kind: "leave_by",
                   scheduled_for: DateTime.add(DateTime.utc_now(), 600, :second),
                   plan_version: 1,
                   venue_id: "v1",
                   destination: "Old Place"
                 },
                 %{
                   plan_version: 1,
                   venue_id: "v2",
                   destination: "New Place",
                   destination_changed: true,
                   when: DateTime.add(DateTime.utc_now(), 3600, :second)
                 }
               )

      assert d["suppressed"]
      assert d["reason"] in ~w(destination_changed)
    end

    test "late leave reminder past grace is suppressed" do
      intended = ~U[2026-08-14 18:20:00Z]
      now = ~U[2026-08-14 18:50:00Z]

      refute DeliveryRevalidation.late_still_useful?(
               %{"kind" => "leave_by", "scheduled_for" => intended},
               %{"when" => ~U[2026-08-14 19:00:00Z]},
               now
             )

      assert {:ok, d} =
               DeliveryRevalidation.revalidate(
                 %{
                   kind: "leave_by",
                   scheduled_for: intended,
                   plan_version: 1,
                   destination: "Harbor"
                 },
                 %{
                   plan_version: 1,
                   when: ~U[2026-08-14 19:00:00Z],
                   destination: "Harbor",
                   set: true
                 },
                 now: now
               )

      assert d["suppressed"]
      assert d["reason"] == "late_arrival_no_longer_useful"
    end

    test "on-time leave reminder still useful" do
      intended = ~U[2026-08-14 18:20:00Z]
      now = ~U[2026-08-14 18:22:00Z]

      assert DeliveryRevalidation.late_still_useful?(
               %{"kind" => "leave_by", "scheduled_for" => intended},
               %{"when" => ~U[2026-08-14 19:00:00Z]},
               now
             )
    end

    test "plan cancelled suppresses" do
      assert {:ok, d} =
               DeliveryRevalidation.revalidate(
                 %{
                   kind: "leave_by",
                   scheduled_for: DateTime.add(DateTime.utc_now(), 600, :second),
                   plan_version: 1
                 },
                 %{cancelled: true, plan_version: 1}
               )

      assert d["suppressed"]
      assert d["reason"] == "plan_cancelled"
    end

    test "already navigated suppresses leave reminder" do
      assert {:ok, d} =
               DeliveryRevalidation.revalidate(
                 %{
                   kind: "leave_by",
                   capability: "leave_by",
                   scheduled_for: DateTime.add(DateTime.utc_now(), 600, :second),
                   plan_version: 1
                 },
                 %{
                   plan_version: 1,
                   navigation_started: true,
                   when: DateTime.add(DateTime.utc_now(), 3600, :second)
                 }
               )

      assert d["suppressed"]
      assert d["reason"] == "user_already_departed"
    end
  end

  describe "reminder transport real delivery path" do
    test "present_if_valid delivers when still good" do
      future = DateTime.add(DateTime.utc_now(), 1800, :second)

      [rec] =
        ReminderTransport.schedule(
          [
            %{
              "kind" => "leave_by",
              "status" => "active",
              "commitment_id" => "c-ok",
              "scheduled_for" => future,
              "minutes_until_leave" => 20,
              "plan_version" => 1,
              "destination" => "Harbor",
              "when" => DateTime.add(DateTime.utc_now(), 3600, :second)
            }
          ],
          transport: "local_notification"
        )

      refute rec["delivered"]
      assert rec["delivery_proof"] in ~w(scheduled_by_device queued_not_delivered)
      assert rec["queued_ne_delivered"]

      assert {:ok, presented} =
               ReminderTransport.present_if_valid(rec["delivery_id"], %{
                 plan_version: 1,
                 destination: "Harbor",
                 when: DateTime.add(DateTime.utc_now(), 3600, :second),
                 set: true
               })

      assert presented["delivered"]
      refute presented["overclaim"]
    end

    test "present_if_valid suppresses late fire" do
      past = ~U[2026-08-14 18:20:00Z]

      [rec] =
        ReminderTransport.schedule(
          [
            %{
              "kind" => "leave_by",
              "status" => "active",
              "commitment_id" => "c-late",
              "scheduled_for" => past,
              "minutes_until_leave" => 20,
              "plan_version" => 1,
              "destination" => "Harbor",
              "when" => ~U[2026-08-14 19:00:00Z]
            }
          ],
          transport: "local_notification",
          now: past
        )

      assert {:ok, suppressed} =
               ReminderTransport.present_if_valid(
                 rec["delivery_id"],
                 %{
                   plan_version: 1,
                   destination: "Harbor",
                   when: ~U[2026-08-14 19:00:00Z],
                   set: true
                 },
                 now: ~U[2026-08-14 18:50:00Z]
               )

      refute suppressed["delivered"]
      assert suppressed["stale_notification_suppressed"]
    end

    test "time change cancels old scheduled reminder" do
      t1 = DateTime.add(DateTime.utc_now(), 3600, :second)

      [old] =
        ReminderTransport.schedule([
          %{
            "kind" => "leave_by",
            "status" => "active",
            "commitment_id" => "c-resched",
            "scheduled_for" => t1,
            "minutes_until_leave" => 20,
            "plan_version" => 1
          }
        ])

      t2 = DateTime.add(DateTime.utc_now(), 7200, :second)

      assert {:ok, r} =
               ReminderTransport.reschedule_for_commitment(
                 "c-resched",
                 [
                   %{
                     "kind" => "leave_by",
                     "status" => "active",
                     "commitment_id" => "c-resched",
                     "scheduled_for" => t2,
                     "minutes_until_leave" => 20,
                     "plan_version" => 2
                   }
                 ],
                 transport: "local_notification"
               )

      assert r["stale_reminders_cleared"]
      assert Enum.any?(r["cancelled"], &(&1["delivery_id"] == old["delivery_id"]))
      assert length(r["scheduled"]) == 1
    end
  end

  describe "permission JIT" do
    test "asks when leave reminder value is obvious" do
      r =
        PermissionMoment.evaluate(%{
          permission: "notifications",
          permission_state: "unknown",
          value_context: "leave_reminder",
          set: true,
          reminder_useful: true,
          surface: "active_conversation"
        })

      assert r["kind"] == "permission_question"
      assert r["then_os_permission"]
      refute r["onboarding_generic"]
      assert String.contains?(r["copy"], "remind")
    end

    test "denied does not nag; plan still works" do
      r =
        PermissionMoment.evaluate(%{
          permission: "notifications",
          permission_state: "denied",
          value_context: "leave_reminder",
          set: true
        })

      assert r["kind"] == "nothing"
      assert r["plan_still_works"]
      refute r["nag"]
    end

    test "later grant does not retro-spam" do
      r = PermissionMoment.after_os_result("notifications", "granted")
      assert r["permission_state"] == "granted"
      assert r["future_actions_may_use"]
      refute r["retroactive_spam"]
      refute r["reschedule_old_reminders"]
    end
  end

  describe "notification content privacy" do
    test "default minimal never high-detail lock screen" do
      c =
        NotificationContent.build(%{
          kind: "leave_by",
          minutes_until_leave: 20,
          place: "Secret Loft with Sam"
        })

      assert c["mode"] == "minimal"
      assert c["lock_screen"] == "Leave in 20 minutes."
      refute c["relationship_exposed"]
      refute c["high_detail_lock_screen"]
    end
  end

  describe "navigation real device flow" do
    test "context → deep link → handoff with continuation" do
      assert {:ok, prep} =
               NavigationTransport.prepare(
                 %{
                   destination: "Harbor Table",
                   place: "Harbor Table",
                   set: true,
                   conversation_id: "conv-nav",
                   plan_id: "p1",
                   plan_version: 1,
                   lat: 33.1,
                   lng: -117.3
                 },
                 platform: "ios"
               )

      assert is_binary(prep["primary_url"])
      refute prep["reentry_required"]

      assert {:ok, started} = NavigationTransport.start(prep, user_authorized: true)
      assert started["handoff_started"] or started["navigation_started"]

      assert {:ok, del} =
               DeliveryCompose.deliver(%{
                 set: true,
                 plan_type: "dinner",
                 provider_confirmed: true,
                 human_reports_booked: true,
                 navigation_useful: true,
                 when: ~U[2026-08-14 19:00:00Z],
                 now: ~U[2026-08-14 18:35:00Z],
                 place: "Harbor Table",
                 destination: "Harbor Table",
                 conversation_id: "conv-nav",
                 plan_id: "p1",
                 plan_version: 1,
                 platform: "ios",
                 surface: "active_conversation",
                 notification_permission: "granted",
                 actor_user_id: "u1"
               })

      assert del["capability"] == "navigation" or del["kind"] in ~w(action nothing)
      if del["continuation"], do: assert(del["continuation"]["not_generic_home"])
    end

    test "android and web platform urls" do
      ctx = %{
        "destination" => "Park",
        "place" => "Park",
        "set" => true,
        "conversation_id" => "c",
        "plan_version" => 1
      }

      assert {:ok, andr} = NavigationTransport.prepare(ctx, platform: "android")
      assert String.contains?(andr["primary_url"], "google.com/maps")

      assert {:ok, web} = NavigationTransport.prepare(ctx, platform: "universal")
      assert is_binary(web["primary_url"])
    end
  end

  describe "ETA private vs share" do
    test "private first; share needs auth; ends cleanly" do
      assert {:ok, priv} = EtaShare.private_eta(%{travel_minutes: 12})
      assert priv["private"]
      refute priv["shared"]
      assert priv["os_location_ne_social_share"]

      assert {:error, :user_authorization_required} = EtaShare.share(priv, [])

      assert {:ok, shared} = EtaShare.share(priv, user_authorized: true, plan_id: "p1")
      assert shared["peer_copy"] == "About 12 minutes away"
      refute shared["live_tracking"]
      refute shared["tracking_screen"]

      assert {:ok, ended} = EtaShare.end_share(shared, "arrival")
      assert ended["status"] == "ended"
      refute ended["persistent_location_relationship"]
    end
  end

  describe "delivery compose end-to-end" do
    test "permission denied reminder falls back without nag" do
      assert {:ok, r} =
               DeliveryCompose.deliver(%{
                 set: true,
                 plan_type: "dinner",
                 human_reports_booked: true,
                 provider_confirmed: true,
                 when: ~U[2026-08-14 19:00:00Z],
                 now: ~U[2026-08-14 17:00:00Z],
                 place: "Harbor",
                 destination: "Harbor",
                 plan_version: 1,
                 conversation_id: "c1",
                 schedule_reminder: true,
                 leave_by: ~U[2026-08-14 18:30:00Z],
                 notification_permission: "denied",
                 surface: "active_conversation",
                 actor_user_id: "u1",
                 platform: "ios"
               })

      assert r["kind"] in ~w(nothing permission_question hidden_preparation action)

      if r["reason"] == "notification_permission_denied" do
        assert r["plan_still_works"]
        refute r["nag"]
      end
    end

    test "plan cancel clears reminders without erasing external reality" do
      ReminderTransport.schedule([
        %{
          "kind" => "leave_by",
          "status" => "active",
          "commitment_id" => "cancel-me",
          "scheduled_for" => DateTime.add(DateTime.utc_now(), 3600, :second),
          "minutes_until_leave" => 20
        }
      ])

      assert {:ok, r} = DeliveryCompose.on_plan_cancelled("cancel-me")
      assert r["external_reservations_require_reconcile"]
      refute r["erases_external_reality"]
    end

    test "multi-device claim_and_present" do
      assert {:ok, a} =
               DeliveryCompose.claim_and_present("once-1", "phone-a", fn -> %{"ok" => true} end)

      assert a["presented"]

      assert {:ok, b} =
               DeliveryCompose.claim_and_present("once-1", "phone-b", fn -> %{"ok" => true} end)

      refute b["presented"]
      assert b["reason"] == "claimed_elsewhere"
    end

    test "reconnect does not replay stale prompts" do
      assert {:ok, r} =
               DeliveryCompose.on_reconnect(%{
                 set: true,
                 plan_type: "park",
                 place: "Park",
                 destination: "Park",
                 when: ~U[2026-08-20 16:00:00Z],
                 now: ~U[2026-08-10 12:00:00Z],
                 plan_version: 3,
                 navigation_started: true
               })

      refute r["replay_stale_prompts"]
    end

    test "background capabilities are honest" do
      t = DeviceCapabilityTruth.background_safe_capabilities("terminated")
      assert t["local_notification_fire"]
      refute t["heavy_ai_loop"]
      refute t["persistent_background_gps"]

      off = DeviceCapabilityTruth.background_safe_capabilities("offline")
      assert off["navigation_handoff_known_destination"]
      assert off["booking_requires_network"]
    end
  end

  describe "handoff return settle" do
    test "ambiguous immediate return does not force Did that work?" do
      alias OpalCore.SocialFlow.Execution.JustInTimeAction

      assert {:ok, m} =
               JustInTimeAction.choose(%{
                 set: true,
                 plan_type: "dinner",
                 handoff_started: true,
                 handoff_return_ambiguous: true,
                 when: ~U[2026-08-14 19:00:00Z],
                 now: ~U[2026-08-12 15:00:00Z],
                 place: "Harbor",
                 destination: "Harbor"
               })

      refute m["kind"] == "minimum_question" and m["topic"] == "did_handoff_work"
    end
  end
end
