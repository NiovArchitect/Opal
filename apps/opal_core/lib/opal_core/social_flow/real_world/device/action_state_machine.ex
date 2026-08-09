defmodule OpalCore.SocialFlow.RealWorld.Device.ActionStateMachine do
  @moduledoc """
  External device action states:

  unavailable → permission_required → ready → authorization_required →
  executing → confirmed | failed | revoked | cancelled
  """

  @states ~w(
    unavailable
    permission_required
    ready
    authorization_required
    executing
    confirmed
    failed
    revoked
    cancelled
  )

  def states, do: @states

  def new(capability, attrs \\ %{}) when is_binary(capability) do
    a = stringify(attrs)

    initial =
      cond do
        a["available"] == false -> "unavailable"
        a["permission_state"] in [nil, "unknown", "denied", "prompt"] -> "permission_required"
        a["user_authorized"] == true -> "ready"
        true -> "authorization_required"
      end

    {:ok,
     %{
       "schema_version" => "0.1.0",
       "capability" => capability,
       "state" => initial,
       "conversation_id" => a["conversation_id"],
       "actor_user_id" => a["actor_user_id"],
       "shared_safe_outcome_only" => true
     }}
  end

  def transition(action, event, opts \\ []) when is_map(action) do
    a = stringify(action)
    state = a["state"]
    event = to_string(event)

    case {state, event} do
      {"permission_required", "permission_granted"} ->
        {:ok, Map.put(a, "state", "authorization_required")}

      {"authorization_required", "user_authorized"} ->
        {:ok, Map.put(a, "state", "ready")}

      {"ready", "execute"} ->
        {:ok, Map.put(a, "state", "executing")}

      {"executing", "success"} ->
        {:ok,
         a
         |> Map.put("state", "confirmed")
         |> Map.put("shared_safe_summary", Keyword.get(opts, :summary))}

      {"executing", "failure"} ->
        {:ok,
         a
         |> Map.put("state", "failed")
         |> Map.put("failure_class", Keyword.get(opts, :reason, "unknown"))}

      {s, "revoke"} when s in ~w(ready authorization_required executing confirmed) ->
        {:ok, Map.put(a, "state", "revoked")}

      {s, "cancel"} when s in ~w(ready authorization_required executing) ->
        {:ok, Map.put(a, "state", "cancelled")}

      _ ->
        {:error, :invalid_transition}
    end
  end

  def shared_outcome(%{"state" => "confirmed"} = a) do
    %{
      "state" => "confirmed",
      "capability" => a["capability"],
      "summary" => a["shared_safe_summary"],
      "private_details" => false
    }
  end

  def shared_outcome(%{"state" => "failed"} = a) do
    %{
      "state" => "failed",
      "capability" => a["capability"],
      "summary" => "Couldn't finish that right now.",
      "private_details" => false
    }
  end

  def shared_outcome(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
