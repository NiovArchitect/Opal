defmodule OpalCoreWeb.Plugs.ApiRateLimit do
  @moduledoc """
  Phase 3.2 — API rate limit: 1000 requests / hour per authenticated user.
  Returns 429 with Retry-After when exceeded.
  """

  import Plug.Conn

  alias OpalCore.SocialFlow.RateLimitBucket

  @max 1000
  @window_sec 3600

  def init(opts), do: opts

  def call(conn, _opts) do
    user_id = conn.assigns[:current_user_id]

    if is_binary(user_id) do
      case RateLimitBucket.hit("api:#{user_id}", "api_request", max: @max, window_sec: @window_sec) do
        :ok ->
          conn

        {:error, :rate_limited} ->
          conn
          |> put_resp_header("retry-after", Integer.to_string(@window_sec))
          |> put_resp_content_type("application/json")
          |> send_resp(
            429,
            Jason.encode!(%{
              "error_code" => "rate_limited",
              "message" => "Too many requests. Try again later.",
              "retry_after" => @window_sec
            })
          )
          |> halt()
      end
    else
      conn
    end
  end
end
