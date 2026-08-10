defmodule OpalCore.SocialFlow.Execution.DeviceInstance do
  @moduledoc """
  Minimum device identity for reliable delivery — not fingerprinting.

  Distinguishes: user · device · platform · capability · token (opaque) ·
  last_seen · enabled/revoked.

  Uses app/device-issued identity (session_ref style). No invasive fingerprint.
  Composes DeviceSession contract fields without requiring DB in pure path.
  """

  @platforms ~w(ios android web phone tablet desktop unknown)

  @doc """
  Normalize a device instance snapshot for delivery targeting.
  """
  def normalize(attrs) when is_map(attrs) do
    a = stringify(attrs)
    platform = normalize_platform(a["platform"] || a["device_platform"])

    id =
      a["device_id"] || a["session_ref"] || a["id"] ||
        synthetic_id(a["user_id"], platform, a["device_label"])

    %{
      "device_id" => id,
      "user_id" => a["user_id"],
      "platform" => platform,
      "device_label" => a["device_label"] || default_label(platform),
      "status" => normalize_status(a["status"] || "active"),
      "last_seen_at" => a["last_seen_at"],
      "push_token_present" => a["push_token_present"] == true or is_binary(a["push_token"]),
      "local_notification_capable" =>
        a["local_notification_capable"] != false and platform in ~w(ios android),
      "navigation_capable" => a["navigation_capable"] != false,
      "foreground" => a["foreground"] == true or a["app_state"] == "foreground",
      "app_state" => a["app_state"] || "unknown",
      "online" => a["online"] != false,
      "no_invasive_fingerprint" => true,
      "human_identity_separate" => true,
      "permissions" => stringify(a["permissions"] || %{}),
      "capabilities" => listify(a["capabilities"])
    }
  end

  def normalize(_), do: %{"device_id" => "unknown", "status" => "unknown"}

  @doc """
  Select delivery target(s) without a settings hub.

  Preferences (runtime, not user-configured primary device):
  - navigation → current mobile / foreground device
  - reminder → device with local/push capability
  - in_app → any active session
  """
  def select_targets(devices, capability, opts \\ [])

  def select_targets(devices, capability, opts) when is_list(devices) do
    cap = to_string(capability)
    prefer_foreground? = Keyword.get(opts, :prefer_foreground, true)

    normalized =
      devices
      |> Enum.map(&normalize/1)
      |> Enum.filter(&(&1["status"] == "active"))

    ranked =
      normalized
      |> Enum.map(fn d -> {score(d, cap, prefer_foreground?), d} end)
      |> Enum.filter(fn {s, _} -> s > 0 end)
      |> Enum.sort_by(fn {s, _} -> s end, :desc)
      |> Enum.map(fn {_, d} -> d end)

    case ranked do
      [] ->
        {:ok,
         %{
           "targets" => [],
           "reason" => "no_capable_device",
           "fallback" => "conversation_native_commitment",
           "settings_required" => false
         }}

      [best | _] = all ->
        # Multi-device: still pick one primary for presentation; others may receive cancel
        multi? = Keyword.get(opts, :broadcast_cancel, false)

        targets =
          if multi? and cap in ~w(reminder notifications.schedule leave_reminder) do
            # Reminders: primary schedule device only — avoid duplicate fire
            [best]
          else
            [best]
          end

        {:ok,
         %{
           "targets" => targets,
           "primary" => best,
           "candidates_considered" => length(all),
           "capability" => cap,
           "settings_required" => false,
           "primary_device_config_required" => false
         }}
    end
  end

  def select_targets(_, _, _), do: {:error, :invalid}

  @doc "Whether two device ids refer to the same instance."
  def same?(a, b) when is_binary(a) and is_binary(b), do: a == b
  def same?(%{"device_id" => a}, %{"device_id" => b}), do: a == b
  def same?(_, _), do: false

  defp score(d, cap, prefer_foreground?) do
    base =
      cond do
        d["status"] != "active" -> 0
        true -> 1.0
      end

    cap_score =
      case cap do
        c when c in ~w(navigation navigation.start directions) ->
          cond do
            d["platform"] in ~w(ios android phone) and d["navigation_capable"] -> 2.0
            d["platform"] == "web" -> 0.8
            true -> 0.3
          end

        c when c in ~w(reminder notifications.schedule leave_reminder local_notification) ->
          cond do
            d["local_notification_capable"] -> 2.0
            d["push_token_present"] -> 1.5
            d["platform"] == "web" -> 0.9
            true -> 0.2
          end

        _ ->
          1.0
      end

    fg =
      if prefer_foreground? and d["foreground"] do
        0.5
      else
        0.0
      end

    online = if d["online"], do: 0.2, else: 0.0

    if base == 0, do: 0.0, else: base + cap_score + fg + online
  end

  defp normalize_platform(p) do
    case to_string(p || "unknown") do
      "iphone" -> "ios"
      "ipad" -> "ios"
      "apple" -> "ios"
      s when s in @platforms -> s
      _ -> "unknown"
    end
  end

  defp normalize_status(s) when s in ~w(active revoked expired enabled disabled), do: s
  defp normalize_status("enabled"), do: "active"
  defp normalize_status("disabled"), do: "revoked"
  defp normalize_status(_), do: "unknown"

  defp default_label("ios"), do: "iPhone"
  defp default_label("android"), do: "Android"
  defp default_label("web"), do: "Web"
  defp default_label("tablet"), do: "Tablet"
  defp default_label(_), do: "Device"

  defp synthetic_id(user_id, platform, label) do
    material = "#{user_id || "u"}|#{platform}|#{label || "d"}"

    "dev_" <>
      (:crypto.hash(:sha256, material) |> Base.encode16(case: :lower) |> binary_part(0, 12))
  end

  defp listify(list) when is_list(list), do: list
  defp listify(_), do: []

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
