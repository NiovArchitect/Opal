defmodule OpalCoreWeb.UserSocket do
  use Phoenix.Socket

  channel "conversation:*", OpalCoreWeb.ConversationChannel

  @impl true
  def connect(params, socket, _connect_info) do
    if Application.get_env(:opal_core, :dev_auth_enabled, false) do
      user_id = params["user_id"] || params["dev_user_id"]
      device_id = params["device_id"] || "device-unknown"
      app_state = params["app_state"] || "foreground"
      client_version = params["client_version"] || "slice2-0.1.0"

      cond do
        not is_binary(user_id) or byte_size(user_id) == 0 ->
          :error

        is_nil(OpalCore.Repo.get(OpalCore.Accounts.User, user_id)) ->
          :error

        true ->
          {:ok,
           socket
           |> assign(:user_id, user_id)
           |> assign(:device_id, device_id)
           |> assign(:app_state, app_state)
           |> assign(:client_version, client_version)}
      end
    else
      :error
    end
  end

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}:#{socket.assigns.device_id}"
end
