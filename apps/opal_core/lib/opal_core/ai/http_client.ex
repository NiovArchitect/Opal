defmodule OpalCore.AI.HTTPClient do
  @moduledoc """
  HTTP client for the Python AI worker.
  """

  require Logger

  def execute(request) when is_map(request) do
    base = Application.fetch_env!(:opal_core, :ai_service_url)
    timeout = Application.get_env(:opal_core, :ai_request_timeout_ms, 5_000)
    url = String.trim_trailing(base, "/") <> "/v1/jobs"

    case Req.post(url,
           json: request,
           receive_timeout: timeout,
           connect_options: [timeout: timeout]
         ) do
      {:ok, %Req.Response{status: 200, body: body}} when is_map(body) ->
        {:ok, body}

      {:ok, %Req.Response{status: status, body: body}} when status in 400..499 ->
        {:ok, normalize_error_body(body, request)}

      {:ok, %Req.Response{status: status}} when status >= 500 ->
        {:error, :unavailable}

      {:error, %Req.TransportError{reason: :timeout}} ->
        {:error, :timeout}

      {:error, %Req.TransportError{reason: reason}}
      when reason in [:econnrefused, :nxdomain, :closed, :ehostunreach] ->
        {:error, :unavailable}

      {:error, reason} ->
        Logger.warning("AI HTTP client error: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp normalize_error_body(body, request) when is_map(body) do
    # If Python returned a proper AiJobResponse for refusal, pass through.
    if Map.has_key?(body, "status") and Map.has_key?(body, "job_id") do
      body
    else
      %{
        "schema_version" => "0.1.0",
        "job_id" => request["job_id"],
        "idempotency_key" => request["idempotency_key"],
        "capability" => request["capability"],
        "status" => "refused",
        "output" => nil,
        "model_metadata" => %{
          "provider" => "local",
          "model" => "deterministic-echo",
          "model_version" => "0.1.0"
        },
        "safety" => %{"decision" => "refused", "reasons" => ["http_4xx"]},
        "completed_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "trace_id" => request["trace_id"]
      }
    end
  end

  defp normalize_error_body(_, request) do
    normalize_error_body(%{}, request)
  end
end
