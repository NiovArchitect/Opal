defmodule OpalCore.Calls.DeepgramGrant do
  @moduledoc """
  Exchanges the server-only Deepgram key for a short-lived listen token.
  The master key never leaves this module.
  """

  @grant_url ~c"https://api.deepgram.com/v1/auth/grant"
  @ttl 60

  def issue do
    case api_key() do
      key when is_binary(key) and key != "" -> request(key)
      _ -> {:error, :not_configured}
    end
  end

  defp request(key) do
    _ = Application.ensure_all_started(:inets)
    _ = Application.ensure_all_started(:ssl)
    body = Jason.encode!(%{ttl_seconds: @ttl})

    headers = [
      {~c"authorization", String.to_charlist("Token " <> key)},
      {~c"content-type", ~c"application/json"}
    ]

    request = {@grant_url, headers, ~c"application/json", body}

    case :httpc.request(:post, request, [timeout: 8_000, connect_timeout: 4_000], []) do
      {:ok, {{_, 200, _}, _, response}} ->
        parsed = Jason.decode!(to_string(response))
        token = parsed["access_token"]

        if is_binary(token) and token != "" and token != key do
          {:ok, %{access_token: token, expires_in: parsed["expires_in"] || @ttl}}
        else
          {:error, :invalid_grant}
        end

      _ ->
        {:error, :provider_unavailable}
    end
  end

  defp api_key do
    System.get_env("DEEPGRAM_API_KEY") || launchctl_key()
  end

  defp launchctl_key do
    case System.cmd("launchctl", ["getenv", "DEEPGRAM_API_KEY"], stderr_to_stdout: true) do
      {value, 0} ->
        trimmed = String.trim(value)
        if trimmed == "" or String.starts_with?(trimmed, "Could not"), do: nil, else: trimmed

      _ ->
        nil
    end
  end
end
