defmodule OpalCoreWeb.UserChannel do
  @moduledoc """
  Per-user inbox for material realtime nudges (incoming calls, leave-by moments).

  Join is self-only: `user:<authenticated_user_id>`.
  Never dumps calendars or private coordinates — IDs + shared-safe payloads only.

  R19 W27 (AT-03): the channel also forwards the owner-scoped plan
  event topic (`social_flow:user:<id>`, where SocialFlow's
  broadcast_plan/4 publishes conversation-less plan mutations) to
  the socket as `inbox:plan_state`. Before this, those events had
  PubSub subscribers only in tests - a remote plan state crossing
  never reached a connected client, so the C2 shell's plan/Home
  projections repainted only on navigation. The payload is the
  Contracts event envelope's own payload (contract maps, the same
  shapes the HTTP plan endpoints serve).
  """

  use Phoenix.Channel

  @impl true
  def join("user:" <> user_id, _payload, socket) do
    if socket.assigns.user_id == user_id do
      :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{user_id}")
      {:ok, assign(socket, :user_topic_id, user_id)}
    else
      {:error, %{reason: "forbidden"}}
    end
  end

  @impl true
  def handle_info({:social_flow_event, event, envelope}, socket)
      when is_binary(event) and is_map(envelope) do
    push(socket, "inbox:plan_state", %{
      "event" => event,
      "event_id" => envelope["event_id"],
      "occurred_at" => envelope["occurred_at"],
      "payload" => envelope["payload"] || %{}
    })

    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def handle_in(_, _, socket), do: {:noreply, socket}
end
