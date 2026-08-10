defmodule OpalCore.SocialFlow.RealWorld.Device.CapabilityRegistry do
  @moduledoc """
  Device capability registry.

  Capability existence ≠ permission.
  Tracks available, permission_state, authorized_scope, provider, execution_state.
  """

  @capabilities ~w(
    calendar.read_free_busy
    calendar.create_event
    reminder.create
    location.read_approximate
    location.share_eta
    navigation.start
    phone.call
    message.compose_external
    booking.inquiry
    booking.confirm
    contacts.read_selected
    notifications.schedule
    deep_link.open
    secure_local_persist
    share_sheet
  )

  def capabilities, do: @capabilities

  def register(user_id, capability, attrs \\ %{})
      when is_binary(user_id) and is_binary(capability) do
    if capability in @capabilities do
      a = stringify(attrs)

      {:ok,
       %{
         "user_id" => user_id,
         "capability" => capability,
         "available" => a["available"] != false,
         "permission_state" => a["permission_state"] || "unknown",
         "authorized_scope" => a["authorized_scope"],
         "provider" => a["provider"] || "device",
         "platform" => a["platform"] || "unknown",
         "execution_state" => a["execution_state"] || "idle"
       }}
    else
      {:error, :unknown_capability}
    end
  end

  def ready?(%{"available" => true, "permission_state" => "granted"}), do: true
  def ready?(_), do: false

  def permission_required?(%{"permission_state" => s})
      when s in ~w(unknown denied prompt),
      do: true

  def permission_required?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
