defmodule OpalCore.Push.Adapters.Synthetic do
  @moduledoc """
  Default push adapter when credentials are absent.

  HONEST: logs the intended push and returns `{:ok, :synthetic}`.
  Never claims delivery to a device.
  """

  @behaviour OpalCore.Push.Sender

  require Logger

  @impl OpalCore.Push.Sender
  def send(token, payload, opts \\ [])

  def send(token, payload, opts) when is_binary(token) and is_map(payload) do
    user_id = opts[:user_id] || opts["user_id"] || "unknown"
    platform = opts[:platform] || opts["platform"] || "unknown"
    title = payload[:title] || payload["title"] || ""

    Logger.info(
      "push.synthetic user_id=#{user_id} platform=#{platform} title=#{inspect(title)} token_suffix=#{suffix(token)}"
    )

    {:ok, :synthetic}
  end

  def send(_, _, _), do: {:error, :invalid_payload}

  defp suffix(token) when is_binary(token) and byte_size(token) > 8 do
    String.slice(token, -8, 8)
  end

  defp suffix(token) when is_binary(token), do: token
  defp suffix(_), do: ""
end
