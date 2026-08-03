defmodule OpalCoreWeb.UserSocket do
  use Phoenix.Socket

  alias OpalCore.Auth.ProductSession

  @allowed_app_states ~w(foreground background)
  @max_device_id 128
  @max_client_version 64

  channel "conversation:*", OpalCoreWeb.ConversationChannel

  @impl true
  def connect(params, socket, _connect_info) do
    device_id = params["device_id"]
    app_state = params["app_state"] || "foreground"
    client_version = params["client_version"] || "sf15-0.1.0"

    cond do
      not is_binary(device_id) or byte_size(device_id) == 0 or
          byte_size(device_id) > @max_device_id ->
        :error

      app_state not in @allowed_app_states ->
        :error

      not is_binary(client_version) or byte_size(client_version) > @max_client_version ->
        :error

      not allowed_params?(params) ->
        :error

      true ->
        authenticate_connect(params, socket, device_id, app_state, client_version)
    end
  end

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}:#{socket.assigns.device_id}"

  defp authenticate_connect(params, socket, device_id, app_state, client_version) do
    cond do
      is_binary(params["session_token"]) and byte_size(params["session_token"]) > 0 ->
        case ProductSession.authenticate(params["session_token"]) do
          {:ok, %{user_id: user_id}} ->
            {:ok,
             socket
             |> assign(:user_id, user_id)
             |> assign(:device_id, device_id)
             |> assign(:app_state, app_state)
             |> assign(:client_version, client_version)
             |> assign(:auth_mode, :product_session)}

          {:error, _} ->
            :error
        end

      Application.get_env(:opal_core, :dev_auth_enabled, false) ->
        user_id = params["user_id"] || params["dev_user_id"]

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
             |> assign(:client_version, client_version)
             |> assign(:auth_mode, :dev_auth)}
        end

      true ->
        :error
    end
  end

  defp allowed_params?(params) when is_map(params) do
    allowed =
      MapSet.new(~w(user_id dev_user_id device_id app_state client_version vsn session_token))

    Enum.all?(Map.keys(params), &MapSet.member?(allowed, to_string(&1)))
  end
end
