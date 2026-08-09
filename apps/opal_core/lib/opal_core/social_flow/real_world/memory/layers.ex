defmodule OpalCore.SocialFlow.RealWorld.Memory.Layers do
  @moduledoc """
  Separated memory layers — not one giant memory bag.

  PERSONAL_PRIVATE | RELATIONSHIP | CONVERSATION | PLAN | SHARED_FACTS |
  PROVIDER_OUTCOMES | DEVICE_CONTEXT
  """

  @layers ~w(
    personal_private
    relationship
    conversation
    plan
    shared_facts
    provider_outcomes
    device_context
  )

  def layers, do: @layers

  def put(layer, attrs) when layer in @layers and is_map(attrs) do
    a = stringify(attrs)

    {:ok,
     %{
       "layer" => layer,
       "owner_user_id" => a["owner_user_id"],
       "scope_id" => a["scope_id"],
       "key" => a["key"],
       "value_class" => a["value_class"] || "generic",
       "payload" => a["payload"] || %{},
       "permission_class" => default_permission(layer, a),
       "retention_class" => default_retention(layer),
       "sensitive" => a["sensitive"] == true or sensitive_key?(a["key"]),
       "observed_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
       "revoked" => false
     }}
  end

  def put(_, _), do: {:error, :invalid_layer}

  def may_use_in_context?(entry, context) when is_map(entry) and is_map(context) do
    e = stringify(entry)
    c = stringify(context)

    cond do
      e["revoked"] == true -> false
      e["sensitive"] == true and c["allow_sensitive"] != true -> false
      e["layer"] == "relationship" and e["scope_id"] != c["relationship_id"] -> false
      e["layer"] == "conversation" and e["scope_id"] != c["conversation_id"] -> false
      e["layer"] == "plan" and e["scope_id"] != c["plan_id"] -> false
      true -> true
    end
  end

  def may_use_in_context?(_, _), do: false

  def correct(entry, reason \\ "user_correction") when is_map(entry) do
    entry
    |> stringify()
    |> Map.put("revoked", true)
    |> Map.put("correction_reason", reason)
    |> Map.put("revoked_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  defp default_permission("shared_facts", _), do: "conversation_shared_safe"
  defp default_permission("provider_outcomes", _), do: "owner_private"
  defp default_permission(_, a), do: a["permission_class"] || "owner_private"

  defp default_retention("conversation"), do: "short"
  defp default_retention("plan"), do: "plan_scoped"
  defp default_retention("device_context"), do: "short"
  defp default_retention("personal_private"), do: "long_with_correction"
  defp default_retention(_), do: "medium"

  defp sensitive_key?(k) when is_binary(k) do
    t = String.downcase(k)

    String.contains?(t, "health") or String.contains?(t, "therapy") or
      String.contains?(t, "religion") or String.contains?(t, "address") or
      String.contains?(t, "financial") or String.contains?(t, "sexual")
  end

  defp sensitive_key?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
