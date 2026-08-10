defmodule OpalCore.SocialFlow.Execution.DeviceCapabilityTruth do
  @moduledoc """
  Capability ≠ permission ≠ delivery.

  Hard separation for device-native execution:

  - CAPABILITY: device/OS can technically do it
  - PERMISSION: user allowed it
  - DELIVERY: action actually reached/started on the device

  Composes RealWorld.Device.CapabilityRegistry (capability only).
  Does not authorize. Does not invent OS receipts.
  """

  alias OpalCore.SocialFlow.RealWorld.Device.CapabilityRegistry

  @capability_aliases %{
    "notifications" => "notifications.schedule",
    "local_notification" => "notifications.schedule",
    "local_notification_scheduling" => "notifications.schedule",
    "reminder" => "reminder.create",
    "navigation" => "navigation.start",
    "navigation_handoff" => "navigation.start",
    "foreground_location" => "location.read_approximate",
    "location" => "location.read_approximate",
    "background_location" => "location.read_approximate",
    "eta_share" => "location.share_eta",
    "share_eta" => "location.share_eta",
    "contacts" => "contacts.read_selected",
    "deep_linking" => "navigation.start",
    "booking" => "booking.inquiry",
    "booking_handoff" => "booking.inquiry"
  }

  @doc "Canonical capability names known to the registry (+ aliases)."
  def known_capabilities do
    CapabilityRegistry.capabilities()
  end

  @doc """
  Report truthful triple for a capability on a device snapshot.

  attrs:
  - capability / capabilities
  - available (bool) — OS support
  - permission_state: unknown | prompt | granted | denied | revoked
  - delivery_state: none | scheduled | accepted | delivered | failed | suppressed
  - delivery_proof: scheduled_by_device | accepted_by_provider | receipt | none
  - platform, device_id, app_state: foreground | background | terminated
  - online: bool
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    cap = canonicalize(a["capability"] || a["cap"])

    case CapabilityRegistry.register(a["user_id"] || "anonymous", cap, a) do
      {:ok, reg} ->
        permission = normalize_permission(a["permission_state"] || reg["permission_state"])
        available = a["available"] != false and reg["available"] != false
        delivery = normalize_delivery(a["delivery_state"] || a["delivery_status"])
        proof = normalize_proof(a["delivery_proof"] || a["proof_level"] || infer_proof(delivery))

        ready? = available and permission == "granted"
        delivered? = delivery in ~w(delivered accepted)

        {:ok,
         %{
           "capability" => cap,
           "available" => available,
           "permission_state" => permission,
           "permission_granted" => permission == "granted",
           "delivery_state" => delivery,
           "delivery_proof" => proof,
           "ready" => ready?,
           "delivered" => delivered?,
           # Explicit inequalities — never collapse these
           "capability_ne_permission" => true,
           "permission_ne_delivery" => true,
           "capability_ne_delivery" => true,
           "platform" => a["platform"] || reg["platform"] || "unknown",
           "device_id" => a["device_id"] || a["session_ref"],
           "app_state" => a["app_state"] || "unknown",
           "online" => a["online"] != false,
           "authorizes_set" => false,
           "claim_level" => claim_level(available, permission, delivery, proof)
         }}

      {:error, :unknown_capability} ->
        {:error, :unknown_capability}
    end
  end

  def assess(_), do: {:error, :invalid}

  @doc "Whether delivery can be attempted (capability + permission)."
  def can_attempt?(truth) when is_map(truth) do
    t = stringify(truth)
    t["available"] == true and t["permission_state"] == "granted"
  end

  def can_attempt?(_), do: false

  @doc """
  What continues safely when the app is not in foreground.

  Honest about platform limits — never pretends background AI loops exist.
  """
  def background_safe_capabilities(app_state \\ "background") do
    state = to_string(app_state)

    base = %{
      "local_notification_fire" => true,
      "push_receive" => true,
      "native_commitment_read" => true,
      "navigation_uri_prepared" => true,
      "heavy_ai_loop" => false,
      "persistent_background_gps" => false,
      "live_server_recompute" => false
    }

    case state do
      "foreground" ->
        Map.merge(base, %{
          "live_server_recompute" => true,
          "foreground_location" => true
        })

      "background" ->
        Map.merge(base, %{
          "foreground_location" => false,
          "scheduled_local_fire" => true
        })

      "terminated" ->
        %{
          "local_notification_fire" => true,
          "push_receive" => true,
          "native_commitment_read" => false,
          "navigation_uri_prepared" => false,
          "heavy_ai_loop" => false,
          "persistent_background_gps" => false,
          "live_server_recompute" => false,
          "scheduled_local_fire" => true,
          "truth" => "os_transport_only_if_already_scheduled"
        }

      "offline" ->
        %{
          "local_notification_fire" => true,
          "push_receive" => false,
          "native_commitment_read" => true,
          "navigation_handoff_known_destination" => true,
          "booking_requires_network" => true,
          "live_server_recompute" => false,
          "heavy_ai_loop" => false,
          "persistent_background_gps" => false
        }

      _ ->
        base
    end
  end

  @doc "Per-capability network dependence truth."
  def network_requirement(capability) do
    case canonicalize(capability) do
      "navigation.start" -> "optional_after_destination_resolved"
      "reminder.create" -> "local_ok"
      "notifications.schedule" -> "local_ok"
      "booking.inquiry" -> "required"
      "booking.confirm" -> "required"
      "location.share_eta" -> "required_for_share"
      "location.read_approximate" -> "device_local"
      _ -> "unknown"
    end
  end

  defp canonicalize(nil), do: "notifications.schedule"

  defp canonicalize(cap) when is_binary(cap) do
    Map.get(@capability_aliases, cap, cap)
  end

  defp canonicalize(cap), do: canonicalize(to_string(cap))

  defp normalize_permission(s) when s in ~w(unknown prompt granted denied revoked), do: s
  defp normalize_permission("allowed"), do: "granted"
  defp normalize_permission("blocked"), do: "denied"
  defp normalize_permission(_), do: "unknown"

  defp normalize_delivery(s)
       when s in ~w(none scheduled accepted delivered failed suppressed cancelled),
       do: s

  defp normalize_delivery("pending"), do: "scheduled"
  defp normalize_delivery("delivery_requested"), do: "accepted"
  defp normalize_delivery(nil), do: "none"
  defp normalize_delivery(_), do: "none"

  defp normalize_proof(s)
       when s in ~w(none scheduled_by_device accepted_by_provider receipt claimed),
       do: s

  defp normalize_proof(_), do: "none"

  defp infer_proof("delivered"), do: "receipt"
  defp infer_proof("accepted"), do: "accepted_by_provider"
  defp infer_proof("scheduled"), do: "scheduled_by_device"
  defp infer_proof(_), do: "none"

  defp claim_level(false, _, _, _), do: "unavailable"
  defp claim_level(true, "denied", _, _), do: "capability_without_permission"
  defp claim_level(true, "granted", "delivered", "receipt"), do: "delivered_proven"
  defp claim_level(true, "granted", "accepted", _), do: "provider_accepted"
  defp claim_level(true, "granted", "scheduled", _), do: "scheduled_not_delivered"
  defp claim_level(true, "granted", _, _), do: "permission_ready_not_delivered"
  defp claim_level(_, _, _, _), do: "incomplete"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
