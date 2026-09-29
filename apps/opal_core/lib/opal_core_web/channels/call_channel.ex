defmodule OpalCoreWeb.CallChannel do
  @moduledoc """
  Ephemeral WebRTC signaling for a call session.
  SDP/ICE payloads stay on the channel — never Outbox/Kafka.
  """

  use Phoenix.Channel

  alias OpalCore.Calls
  alias OpalCore.Calls.ChannelPresence

  @impl true
  def join("call:" <> call_id, _payload, socket) do
    user_id = socket.assigns.user_id

    case Calls.get(call_id, user_id) do
      {:ok, session} ->
        ChannelPresence.track(session.id, self())
        {:ok, assign(socket, :call_id, session.id)}

      {:error, :forbidden} ->
        {:error, %{reason: "forbidden"}}

      {:error, :not_found} ->
        {:error, %{reason: "not_found"}}
    end
  end

  @impl true
  def terminate(_reason, socket) do
    if call_id = socket.assigns[:call_id], do: ChannelPresence.untrack(call_id, self())
    :ok
  end

  @impl true
  def handle_in("signal", %{"type" => type, "payload" => payload}, socket)
      when type in ["offer", "answer", "ice", "ready"] and is_map(payload) do
    # Relay to other peer(s) on the same call topic — no persistence.
    # "ready" = peer joined media path; offerer should (re)send SDP if needed.
    broadcast_from!(socket, "signal", %{
      "type" => type,
      "payload" => payload,
      "from_user_id" => socket.assigns.user_id
    })

    {:reply, :ok, socket}
  end

  def handle_in("signal", _, socket), do: {:reply, {:error, %{reason: "invalid_signal"}}, socket}

  def handle_in("needs_turn", _payload, socket) do
    broadcast_from!(socket, "needs_turn", %{"from_user_id" => socket.assigns.user_id})
    {:reply, :ok, socket}
  end

  def handle_in(_, _, socket), do: {:noreply, socket}
end
