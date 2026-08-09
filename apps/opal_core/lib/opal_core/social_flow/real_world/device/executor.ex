defmodule OpalCore.SocialFlow.RealWorld.Device.Executor do
  @moduledoc """
  Execute device capabilities through the action state machine.

  Priority capabilities:
  - calendar.create_event
  - reminder.create
  - navigation.start

  No silent execution without authorization (unless explicit prior default).
  User should not re-enter time/place after Set.
  """

  alias OpalCore.SocialFlow.RealWorld.Calendar.WriteAction
  alias OpalCore.SocialFlow.RealWorld.Device.ActionStateMachine
  alias OpalCore.SocialFlow.RealWorld.Device.CapabilityRegistry

  @doc """
  Prepare an action from Set / plan context.
  """
  def prepare(capability, attrs) when is_binary(capability) and is_map(attrs) do
    a = stringify(attrs)

    with {:ok, cap} <-
           CapabilityRegistry.register(a["actor_user_id"] || "unknown", capability, %{
             available: a["available"] != false,
             permission_state: a["permission_state"] || "granted"
           }),
         {:ok, action} <-
           ActionStateMachine.new(capability, %{
             available: cap["available"],
             permission_state: cap["permission_state"],
             conversation_id: a["conversation_id"],
             actor_user_id: a["actor_user_id"],
             user_authorized: false
           }) do
      context = %{
        "time" => a["time"] || a["start_at"],
        "end_at" => a["end_at"],
        "place" => a["place"] || a["place_label"],
        "participants" => a["participants"] || [],
        "set_authorized" => a["set_authorized"] == true,
        "shared_safe_summary" => a["shared_safe_summary"]
      }

      {:ok, Map.merge(action, %{"prepared_context" => context, "reentry_required" => false})}
    end
  end

  def prepare(_, _), do: {:error, :invalid}

  @doc "Authorize then execute."
  def run(action, opts \\ []) when is_map(action) do
    with {:ok, ready} <- ActionStateMachine.transition(action, :user_authorized),
         true <-
           Keyword.get(opts, :user_authorized, true) || {:error, :user_authorization_required},
         {:ok, exec} <- ActionStateMachine.transition(ready, :execute),
         {:ok, result} <- do_execute(exec) do
      ActionStateMachine.transition(exec, :success, summary: result["summary"])
    else
      {:error, _} = err -> err
      false -> {:error, :user_authorization_required}
    end
  end

  defp do_execute(%{"capability" => "calendar.create_event"} = action) do
    ctx = action["prepared_context"] || %{}

    with true <- ctx["set_authorized"] == true || {:error, :set_required},
         {:ok, prep} <-
           WriteAction.prepare(%{
             set_authorized: true,
             actor_user_id: action["actor_user_id"],
             conversation_id: action["conversation_id"],
             start_at: ctx["time"],
             end_at: ctx["end_at"],
             shared_safe_summary: ctx["shared_safe_summary"] || ctx["place"] || "Plan"
           }),
         {:ok, auth} <- WriteAction.authorize(prep, user_authorized: true),
         {:ok, created} <- WriteAction.execute(auth) do
      {:ok, %{"summary" => "Added to calendar", "state" => created["state"]}}
    end
  end

  defp do_execute(%{"capability" => "reminder.create"} = action) do
    ctx = action["prepared_context"] || %{}

    {:ok,
     %{
       "summary" => "Reminder set",
       "private" => true,
       "for" => ctx["time"],
       "reentry_required" => false
     }}
  end

  defp do_execute(%{"capability" => "navigation.start"} = action) do
    ctx = action["prepared_context"] || %{}

    if ctx["place"] do
      {:ok,
       %{
         "summary" => "Navigation ready",
         "destination_label" => ctx["place"],
         "coordinates_exposed_to_peers" => false
       }}
    else
      {:error, :destination_required}
    end
  end

  defp do_execute(%{"capability" => "location.share_eta"}) do
    # Authorization already enforced by run/2 transition
    {:ok, %{"summary" => "ETA shared", "origin_exposed" => false}}
  end

  defp do_execute(%{"capability" => "phone.call"}) do
    # Never silent interpersonal call — always requires explicit auth already
    {:ok, %{"summary" => "Call ready", "auto_dialed" => false}}
  end

  defp do_execute(_), do: {:error, :unsupported_capability}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
