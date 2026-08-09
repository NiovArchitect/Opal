defmodule OpalCore.SocialFlow.DeviceCapabilityBoundary do
  @moduledoc """
  Handoff contract for future phone/device execution.

  Does **not** implement the whole device harness.

  Future capabilities:
  - calendar free/busy
  - calendar event
  - reminder
  - navigation
  - call
  - booking inquiry

  Flow:
  Alignment understands → user authorizes → Device Capability executes →
  result returns to originating relationship/thread.

  AVP² = payments only (out of scope here).
  """

  @capabilities ~w(
    calendar_free_busy
    calendar_event
    reminder
    navigation
    call
    booking_inquiry
  )

  @doc "Supported capability names."
  def capabilities, do: @capabilities

  @doc """
  Build an authorized handoff request. Does not execute.
  """
  def build_handoff(attrs) when is_map(attrs) do
    a = stringify(attrs)
    cap = a["capability"]

    cond do
      cap not in @capabilities ->
        {:error, :unknown_capability}

      a["user_authorized"] != true ->
        {:error, :user_authorization_required}

      not is_binary(a["conversation_id"]) ->
        {:error, :conversation_required}

      not is_binary(a["actor_user_id"]) ->
        {:error, :actor_required}

      true ->
        {:ok,
         %{
           "schema_version" => "0.1.0",
           "capability" => cap,
           "actor_user_id" => a["actor_user_id"],
           "conversation_id" => a["conversation_id"],
           "relationship_scope" => a["relationship_scope"] || a["conversation_id"],
           "purpose" => a["purpose"] || "alignment_execution",
           "user_authorized" => true,
           "status" => "pending_device",
           "result_destination" => "originating_thread",
           "avp2_payments_only" => true,
           "payload" => sanitize_payload(a["payload"] || %{})
         }}
    end
  end

  def build_handoff(_), do: {:error, :invalid}

  @doc "Admit a device result back into alignment (IDs + status only)."
  def admit_result(handoff, result) when is_map(handoff) and is_map(result) do
    h = stringify(handoff)
    r = stringify(result)

    {:ok,
     %{
       "schema_version" => "0.1.0",
       "capability" => h["capability"],
       "conversation_id" => h["conversation_id"],
       "status" => r["status"] || "completed",
       "result_code" => r["result_code"],
       "shared_safe_summary" => r["shared_safe_summary"],
       "authorizes_set" => false
     }}
  end

  def admit_result(_, _), do: {:error, :invalid}

  defp sanitize_payload(payload) when is_map(payload) do
    payload
    |> stringify()
    |> Map.drop(~w(access_token raw_calendar_events private_notes card_number))
  end

  defp sanitize_payload(_), do: %{}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
