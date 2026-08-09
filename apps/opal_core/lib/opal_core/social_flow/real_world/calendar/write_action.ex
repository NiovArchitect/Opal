defmodule OpalCore.SocialFlow.RealWorld.Calendar.WriteAction do
  @moduledoc """
  Calendar write (create event) state machine.

  After authoritative Set, Opal may prepare "Add to calendar" —
  never silently create without authorization policy.

  States: prepared | authorized | created | failed | revoked | cancelled

  Step eliminated (when authorized): manually creating the calendar event.
  """

  @states ~w(prepared authorized created failed revoked cancelled)

  def states, do: @states

  @doc "Prepare an event from Set context — no external write yet."
  def prepare(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["set_authorized"] != true ->
        {:error, :set_required}

      not is_binary(a["actor_user_id"]) ->
        {:error, :actor_required}

      not is_binary(a["conversation_id"]) ->
        {:error, :conversation_required}

      true ->
        {:ok,
         %{
           "schema_version" => "0.1.0",
           "action" => "calendar.create_event",
           "state" => "prepared",
           "actor_user_id" => a["actor_user_id"],
           "conversation_id" => a["conversation_id"],
           "start_at" => a["start_at"],
           "end_at" => a["end_at"],
           "timezone" => a["timezone"] || "UTC",
           "title_class" => a["title_class"] || "plan",
           # Never auto-include private peer details
           "shared_safe_summary" => a["shared_safe_summary"] || "Plan",
           "auto_created" => false,
           "result_destination" => "originating_thread"
         }}
    end
  end

  def prepare(_), do: {:error, :invalid}

  @doc "User authorizes the prepared write."
  def authorize(action, opts \\ []) when is_map(action) do
    a = stringify(action)

    cond do
      a["state"] != "prepared" ->
        {:error, :invalid_state}

      Keyword.get(opts, :user_authorized) != true and a["default_authorized"] != true ->
        {:error, :user_authorization_required}

      true ->
        {:ok, Map.put(a, "state", "authorized")}
    end
  end

  @doc "Execute after authorization. Adapter returns created|failed."
  def execute(action, executor \\ &default_executor/1) when is_map(action) do
    a = stringify(action)

    if a["state"] != "authorized" do
      {:error, :not_authorized}
    else
      case executor.(a) do
        {:ok, result} ->
          {:ok,
           a
           |> Map.put("state", "created")
           |> Map.put("provider_ref", result["provider_ref"])
           |> Map.put("confirmed_at", DateTime.utc_now() |> DateTime.to_iso8601())}

        {:error, reason} ->
          {:ok,
           a
           |> Map.put("state", "failed")
           |> Map.put("failure_class", to_string(reason))}
      end
    end
  end

  def revoke(action) when is_map(action) do
    a = stringify(action)

    if a["state"] in ~w(prepared authorized created) do
      {:ok, Map.put(a, "state", "revoked")}
    else
      {:error, :invalid_state}
    end
  end

  defp default_executor(_action), do: {:ok, %{"provider_ref" => "local-stub"}}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
