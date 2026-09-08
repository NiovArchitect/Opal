defmodule OpalCoreWeb.UserChannel do
  @moduledoc """
  Per-user inbox for material realtime nudges (incoming calls, leave-by moments).

  Join is self-only: `user:<authenticated_user_id>`.
  Never dumps calendars or private coordinates — IDs + shared-safe payloads only.
  """

  use Phoenix.Channel

  @impl true
  def join("user:" <> user_id, _payload, socket) do
    if socket.assigns.user_id == user_id do
      {:ok, assign(socket, :user_topic_id, user_id)}
    else
      {:error, %{reason: "forbidden"}}
    end
  end

  @impl true
  def handle_in(_, _, socket), do: {:noreply, socket}
end
