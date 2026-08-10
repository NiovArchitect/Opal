defmodule OpalCore.SocialFlow.Execution.DeliveryCompose do
  @moduledoc """
  Device-reality composition for just-in-time execution.

  PlanLifecycle / JustInTimeAction decide WHAT/WHEN.
  This module proves the action can REACH the user correctly:

  capability truth → device target → permission → delivery revalidation →
  transport schedule/present → proof level (never overclaim)

  No device dashboard. No notification center. No settings hub.
  """

  alias OpalCore.SocialFlow.Ambient.{ExecutionAction, InterruptionDebt}

  alias OpalCore.SocialFlow.Execution.{
    ActionClaim,
    DeviceCapabilityTruth,
    DeviceInstance,
    DeliveryRevalidation,
    NavigationTransport,
    NotificationContent,
    PermissionMoment,
    PlanMoment,
    ReminderTransport
  }

  @doc """
  Full delivery decision for a plan moment on real devices.

  attrs include plan context + devices list + permission states.
  """
  def deliver(attrs, opts \\ [])

  def deliver(attrs, opts) when is_map(attrs) do
    a = stringify(attrs)
    surface = a["surface"] || a["delivery_surface"] || Keyword.get(opts, :surface, "push")
    devices = a["devices"] || Keyword.get(opts, :devices) || default_devices(a)
    now = a["now"] || Keyword.get(opts, :now) || DateTime.utc_now()

    with {:ok, moment} <- PlanMoment.evaluate(Map.put(a, "now", now)),
         surface_kind <- get_in(moment, ["surface", "kind"]) || moment["surface"]["kind"],
         capability <- moment_capability(moment),
         {:ok, targets} <- DeviceInstance.select_targets(devices, capability || "reminder"),
         primary <- targets["primary"] || List.first(targets["targets"]),
         {:ok, truth} <- capability_truth(a, capability, primary),
         debt <- surface_debt(a, moment, surface),
         :ok <- maybe_debt_gate(debt, a, surface) do
      cond do
        surface_kind == "nothing" ->
          {:ok, quiet(moment, "jit_nothing", truth, targets)}

        not DeviceCapabilityTruth.can_attempt?(truth) and
            needs_permission?(capability, truth) ->
          perm = permission_path(capability, a, truth)
          {:ok, Map.merge(perm, %{"moment" => moment, "capability_truth" => truth})}

        capability in ~w(navigation) ->
          nav_delivery(a, moment, primary, truth, debt, now)

        capability in ~w(reminder leave_reminder) or
          hidden_reminder?(moment) or
            a["schedule_reminder"] == true ->
          reminder_delivery(a, moment, primary, truth, debt, now, surface)

        true ->
          present_in_app(a, moment, primary, truth, debt, capability)
      end
    else
      {:error, reason} ->
        {:ok,
         %{
           "kind" => "nothing",
           "reason" => to_string(reason),
           "then_get_quiet" => true
         }}

      {:quiet, reason, meta} ->
        {:ok,
         Map.merge(%{"kind" => "nothing", "reason" => reason, "then_get_quiet" => true}, meta)}
    end
  end

  def deliver(_, _), do: {:error, :invalid}

  @doc """
  Fire-time path: scheduled notification about to present.
  Revalidate then suppress or show.
  """
  def present_scheduled(delivery, plan_now, opts \\ [])

  def present_scheduled(delivery, plan_now, opts)
      when is_map(delivery) and is_map(plan_now) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    surface = Keyword.get(opts, :surface, "lock_screen")

    with {:ok, decision} <-
           DeliveryRevalidation.revalidate(delivery, plan_now, now: now) do
      if decision["present"] do
        content =
          NotificationContent.build(Map.merge(stringify(delivery), plan_now), surface: surface)

        if content["surface_ok"] or Keyword.get(opts, :force) == true do
          {:ok,
           %{
             "kind" => "notification",
             "present" => true,
             "content" => content,
             "revalidation" => decision,
             "delivery_proof" => "scheduled_by_device",
             "claim_level" => "scheduled_revalidated_present",
             "overclaim" => false
           }}
        else
          {:ok,
           %{
             "kind" => "nothing",
             "present" => false,
             "reason" => "push_debt_not_repaid",
             "revalidation" => decision,
             "then_get_quiet" => true
           }}
        end
      else
        # Cancel on transport if we can
        _ = maybe_cancel_delivery(delivery)

        {:ok,
         %{
           "kind" => "nothing",
           "present" => false,
           "suppressed" => true,
           "reason" => decision["reason"],
           "revalidation" => decision,
           "stale_notification_suppressed" => true,
           "then_get_quiet" => true
         }}
      end
    end
  end

  def present_scheduled(_, _, _), do: {:error, :invalid}

  @doc """
  Multi-device: claim action so only one device presents Directions?
  """
  def claim_and_present(action_id, device_id, present_fn, opts \\ [])
      when is_binary(action_id) and is_binary(device_id) and is_function(present_fn, 0) do
    case ActionClaim.claim(action_id, device_id, opts) do
      {:ok, claim} ->
        result = present_fn.()
        {:ok, %{"claim" => claim, "result" => result, "presented" => true}}

      {:error, :claimed_elsewhere, other} ->
        {:ok,
         %{
           "presented" => false,
           "reason" => "claimed_elsewhere",
           "other_device" => other["device_id"],
           "then_get_quiet" => true
         }}

      other ->
        other
    end
  end

  @doc """
  Plan cancelled → cancel future reminders / nav prompts.
  Confirmed external reservations still need SideEffectReconcile.
  """
  def on_plan_cancelled(commitment_id, opts \\ [])

  def on_plan_cancelled(commitment_id, _opts) when is_binary(commitment_id) do
    {:ok, cancelled} = ReminderTransport.cancel_for_commitment(commitment_id)

    {:ok,
     %{
       "reminders_cancelled" => cancelled,
       "navigation_prompts_suppressed" => true,
       "eta_context_cleared" => true,
       "external_reservations_require_reconcile" => true,
       "erases_external_reality" => false
     }}
  end

  def on_plan_cancelled(_, _), do: {:error, :invalid}

  @doc """
  Plan time/place change: reschedule reminders, invalidate old nav.
  """
  def on_plan_changed(commitment_id, new_intents, plan_ctx, opts \\ [])

  def on_plan_changed(commitment_id, new_intents, plan_ctx, opts)
      when is_binary(commitment_id) and is_list(new_intents) do
    p = stringify(plan_ctx)

    intents =
      Enum.map(new_intents, fn i ->
        Map.merge(stringify(i), %{
          "commitment_id" => commitment_id,
          "plan_version" => p["plan_version"],
          "destination" => p["destination"] || p["place"],
          "venue_id" => p["venue_id"],
          "when" => p["when"] || p["plan_start"]
        })
      end)

    transport = Keyword.get(opts, :transport, preferred_reminder_transport(opts))

    {:ok, result} =
      ReminderTransport.reschedule_for_commitment(commitment_id, intents, transport: transport)

    {:ok,
     Map.merge(result, %{
       "only_current_reminder_can_fire" => true,
       "old_destination_invalidated" => p["destination_changed"] == true,
       "plan_version" => p["plan_version"]
     })}
  end

  def on_plan_changed(_, _, _, _), do: {:error, :invalid}

  @doc "Reconnect reconciliation — do not replay stale prompts."
  def on_reconnect(attrs) when is_map(attrs) do
    a = stringify(attrs)

    {:ok, moment} = PlanMoment.evaluate(a)

    {:ok,
     %{
       "plan_version" => a["plan_version"],
       "moment" => moment["surface"],
       "replay_stale_prompts" => false,
       "reconcile" => %{
         "executed_actions" => a["executed_actions"] || [],
         "reminder_status" => a["reminder_status"],
         "human_reported" => a["human_reports_booked"] == true,
         "provider_state" => a["provider_confirmed"]
       },
       "then_get_quiet" => moment["surface"]["kind"] == "nothing"
     }}
  end

  def on_reconnect(_), do: {:error, :invalid}

  # --- internals ---

  defp nav_delivery(a, moment, primary, truth, debt, _now) do
    platform = (primary && primary["platform"]) || a["platform"] || "universal"
    device_id = primary && primary["device_id"]

    with {:ok, prep} <-
           NavigationTransport.prepare(
             Map.merge(a, %{
               "platform" => platform,
               "destination" => a["destination"] || a["place"]
             }),
             platform: platform
           ) do
      action_id = prep["action_id"] || ExecutionAction.action_id(a, "navigation")

      claim_result =
        if is_binary(device_id) do
          ActionClaim.claim(action_id, device_id, plan_version: a["plan_version"])
        else
          {:ok, %{"device_id" => nil}}
        end

      case claim_result do
        {:ok, claim} ->
          continuation = continuation_context(a)

          {:ok,
           %{
             "kind" => "action",
             "capability" => "navigation",
             "surface" => moment["surface"],
             "prepared" => prep,
             "claim" => claim,
             "capability_truth" => truth,
             "interruption_debt" => debt,
             "continuation" => continuation,
             "offline_ok" =>
               DeviceCapabilityTruth.network_requirement("navigation.start") ==
                 "optional_after_destination_resolved",
             "reentry_required" => false,
             "delivery_proof" => "prepared_not_started",
             "claim_level" => "navigation_prepared",
             "overclaim" => false,
             "then_get_quiet" => true
           }}

        {:error, :claimed_elsewhere, other} ->
          {:ok,
           %{
             "kind" => "nothing",
             "reason" => "other_device_claimed",
             "other_device" => other["device_id"],
             "then_get_quiet" => true
           }}
      end
    else
      {:error, reason} ->
        {:ok, %{"kind" => "nothing", "reason" => to_string(reason), "then_get_quiet" => true}}
    end
  end

  defp reminder_delivery(a, moment, primary, truth, debt, now, surface) do
    leave_by = a["leave_by"] || compute_leave_hint(a)
    commitment_id = a["commitment_id"] || a["plan_id"] || "plan"

    if is_nil(leave_by) and a["schedule_reminder"] != true do
      # Hidden preparation may not need surface
      {:ok, quiet(moment, "no_leave_by_yet", truth, %{"primary" => primary})}
    else
      # Permission denied → conversation fallback, no nag
      if truth["permission_state"] in ~w(denied revoked) do
        {:ok,
         %{
           "kind" => "nothing",
           "reason" => "notification_permission_denied",
           "plan_still_works" => true,
           "fallback" => "conversation_native_commitment",
           "nag" => false,
           "capability_truth" => truth,
           "then_get_quiet" => true
         }}
      else
        transport = preferred_reminder_transport(platform: primary && primary["platform"])

        intent = %{
          "kind" => "leave_by",
          "status" => "active",
          "commitment_id" => commitment_id,
          "scheduled_for" => leave_by || DateTime.add(now, 3600, :second),
          "minutes_until_leave" => a["minutes_until_leave"] || 20,
          "plan_version" => a["plan_version"],
          "destination" => a["destination"] || a["place"],
          "venue_id" => a["venue_id"],
          "when" => a["when"] || a["plan_start"],
          "device_id" => primary && primary["device_id"]
        }

        [rec] = ReminderTransport.schedule([intent], transport: transport, now: now)
        content = NotificationContent.build(intent, surface: surface, mode: "minimal")

        {:ok,
         %{
           "kind" => "hidden_preparation",
           "capability" => "reminder",
           "scheduled" => rec,
           "transport" => transport,
           "content" => content,
           "capability_truth" => truth,
           "interruption_debt" => debt,
           "surface_moment" => moment["surface"],
           "delivery_proof" => proof_for_transport(transport, rec),
           "delivered" => rec["delivered"] == true,
           "queued_ne_delivered" => true,
           "overclaim" => false,
           "claim_level" => "scheduled_not_delivered",
           "then_get_quiet" => true,
           "settings_hub" => false
         }}
      end
    end
  end

  defp present_in_app(a, moment, primary, truth, debt, capability) do
    action_id =
      ExecutionAction.action_id(
        Map.merge(a, %{"capability" => capability || "action"}),
        capability || "action"
      )

    device_id = (primary && primary["device_id"]) || a["device_id"] || "local"

    case ActionClaim.claim(action_id, device_id, plan_version: a["plan_version"]) do
      {:ok, claim} ->
        {:ok,
         %{
           "kind" => moment["surface"]["kind"] || "action",
           "capability" => capability,
           "surface" => moment["surface"],
           "claim" => claim,
           "capability_truth" => truth,
           "interruption_debt" => debt,
           "continuation" => continuation_context(a),
           "delivery_proof" => "in_app_present",
           "overclaim" => false,
           "then_get_quiet" => true
         }}

      {:error, :claimed_elsewhere, other} ->
        {:ok,
         %{
           "kind" => "nothing",
           "reason" => "other_device_claimed",
           "other_device" => other["device_id"],
           "then_get_quiet" => true
         }}
    end
  end

  defp capability_truth(a, capability, primary) do
    cap = capability || "notifications.schedule"
    perms = (primary && primary["permissions"]) || a["permissions"] || %{}

    permission_state =
      cond do
        is_map(perms) and is_binary(perms[cap]) -> perms[cap]
        is_map(perms) and is_binary(perms["notifications"]) -> perms["notifications"]
        a["notification_permission"] -> a["notification_permission"]
        a["permission_state"] -> a["permission_state"]
        true -> "unknown"
      end

    DeviceCapabilityTruth.assess(%{
      "user_id" => a["actor_user_id"] || a["user_id"] || "u",
      "capability" => cap_for_truth(cap),
      "permission_state" => permission_state,
      "available" => true,
      "platform" => (primary && primary["platform"]) || a["platform"],
      "device_id" => primary && primary["device_id"],
      "app_state" => a["app_state"] || (primary && primary["app_state"]),
      "online" => a["online"] != false
    })
  end

  defp cap_for_truth("navigation"), do: "navigation.start"
  defp cap_for_truth("reminder"), do: "notifications.schedule"
  defp cap_for_truth("leave_reminder"), do: "notifications.schedule"
  defp cap_for_truth("booking_handoff"), do: "booking.inquiry"
  defp cap_for_truth("eta_share"), do: "location.share_eta"
  defp cap_for_truth(other), do: other

  defp needs_permission?(cap, truth) do
    cap in ~w(reminder leave_reminder notifications) and
      truth["permission_state"] in ~w(unknown prompt denied)
  end

  defp permission_path(capability, a, truth) do
    kind =
      case capability do
        c when c in ~w(reminder leave_reminder) -> "notifications"
        "navigation" -> "location_foreground"
        "eta_share" -> "location_foreground"
        _ -> "notifications"
      end

    value =
      case capability do
        c when c in ~w(reminder leave_reminder) -> "leave_reminder"
        "eta_share" -> "eta"
        "navigation" -> "navigation_origin"
        _ -> "plan_upcoming"
      end

    PermissionMoment.evaluate(%{
      "permission" => kind,
      "permission_state" => truth["permission_state"],
      "value_context" => value,
      "set" => a["set"],
      "reminder_useful" => true,
      "surface" => "active_conversation"
    })
  end

  defp surface_debt(a, moment, surface) do
    InterruptionDebt.evaluate(%{
      "effort_removed" => 0.75,
      "uncertainty_removed" => 0.55,
      "this_got_easy" => true,
      "actionable" => true,
      "confidence" => 0.9,
      "surface" => surface,
      "quality_band" =>
        if(moment["priority"] && moment["priority"] >= 0.75, do: "strong", else: "solid"),
      "option_count" => 1,
      "human_asked" => a["human_asked"] == true,
      "time_sensitive" => true
    })
  end

  defp maybe_debt_gate(debt, a, surface) do
    # Push/lock requires stronger repayment; conversation is cheaper
    if surface in ~w(push lock_screen os_notification local_notification) and
         debt["repays_debt"] != true and a["human_asked"] != true and
         a["force_delivery"] != true do
      {:quiet, "push_surface_debt_not_repaid",
       %{"interruption_debt" => debt, "surface" => surface}}
    else
      :ok
    end
  end

  defp moment_capability(moment) do
    get_in(moment, ["surface", "capability"])
  end

  defp hidden_reminder?(moment) do
    prep = moment["hidden_preparation"] || %{}
    items = prep["items"] || []
    "schedule_leave_reminder" in items or prep["reminder_scheduled"] == true
  end

  defp quiet(moment, reason, truth, targets) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "moment" => moment["surface"],
      "capability_truth" => truth,
      "targets" => targets,
      "then_get_quiet" => true,
      "workflow_ui" => false
    }
  end

  defp continuation_context(a) do
    %{
      "conversation_id" => a["conversation_id"],
      "plan_id" => a["plan_id"],
      "return_to" => "same_conversation_plan",
      "not_generic_home" => true
    }
  end

  defp preferred_reminder_transport(opts) do
    platform = Keyword.get(opts, :platform) || "unknown"

    case to_string(platform) do
      p when p in ~w(ios android phone tablet) -> "local_notification"
      "web" -> "web_notification"
      _ -> "local_notification"
    end
  end

  defp proof_for_transport("local_notification", rec) do
    if rec["state"] in ~w(scheduled delivery_requested),
      do: "scheduled_by_device",
      else: "intent_created"
  end

  defp proof_for_transport("web_notification", _), do: "client_schedule_required"
  defp proof_for_transport("in_app", _), do: "in_app_queue"
  defp proof_for_transport(_, _), do: "none"

  defp maybe_cancel_delivery(delivery) do
    d = stringify(delivery)
    id = d["commitment_id"]
    if is_binary(id), do: ReminderTransport.cancel_for_commitment(id), else: :ok
  end

  defp compute_leave_hint(a) do
    case a["when"] || a["plan_start"] do
      %DateTime{} = start ->
        travel = a["travel_minutes"] || 30
        DateTime.add(start, -trunc(travel) * 60, :second)

      _ ->
        nil
    end
  end

  defp default_devices(a) do
    [
      %{
        "device_id" => a["device_id"] || "dev_primary",
        "user_id" => a["actor_user_id"] || a["user_id"],
        "platform" => a["platform"] || "ios",
        "status" => "active",
        "local_notification_capable" => true,
        "navigation_capable" => true,
        "foreground" => a["app_state"] != "background",
        "app_state" => a["app_state"] || "foreground",
        "permissions" =>
          a["permissions"] || %{"notifications" => a["notification_permission"] || "granted"}
      }
    ]
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
