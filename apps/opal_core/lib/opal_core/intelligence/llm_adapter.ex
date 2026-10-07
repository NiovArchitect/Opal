defmodule OpalCore.Intelligence.LlmAdapter do
  @moduledoc """
  Provider-agnostic chat LLM client for the intelligence pipeline.

  Env (never log secret values):
  - `OPAL_LLM_PROVIDER` — `deepseek` | `openai` | `anthropic` (default `deepseek`)
  - `OPAL_LLM_API_KEY` — bearer token
  - `OPAL_LLM_MODEL` — optional; defaults per provider (`deepseek-chat`, `gpt-4o-mini`)

  OpenAI-compatible providers implemented: **deepseek** and **openai**
  (`POST …/v1/chat/completions`). Anthropic uses a different request shape —
  `readiness/0` reports `{:disabled, :anthropic_not_implemented}` when selected;
  do not half-implement it here.

  Honest pattern (same spirit as TwilioSmsAdapter):
  - `configured?/0` — provider + key present and provider is implemented
  - `readiness/0` — `:ready` or `{:disabled, reason}` — never fakes ready
  - API failures return `{:error, reason}` — never synthesize model text
  """

  require Logger

  @timeout_ms 30_000
  @connect_timeout_ms 8_000

  @providers %{
    "deepseek" => %{
      base_url: "https://api.deepseek.com/v1",
      default_model: "deepseek-chat",
      compatible: true
    },
    "openai" => %{
      base_url: "https://api.openai.com/v1",
      default_model: "gpt-4o-mini",
      compatible: true
    },
    "anthropic" => %{
      base_url: "https://api.anthropic.com/v1",
      default_model: "claude-3-5-haiku-latest",
      compatible: false
    }
  }

  @doc "True when an implemented provider + non-empty API key are present."
  def configured? do
    match?({:ok, _}, config())
  end

  @doc """
  Honest readiness.

  Returns `:ready` or `{:disabled, reason}` where reason is an atom such as
  `:api_key_missing`, `:provider_unsupported`, `:anthropic_not_implemented`.
  """
  def readiness do
    provider = provider_name()
    key = api_key()
    meta = Map.get(@providers, provider)

    cond do
      blank?(key) ->
        {:disabled, :api_key_missing}

      is_nil(meta) ->
        {:disabled, :provider_unsupported}

      meta.compatible != true ->
        {:disabled, :anthropic_not_implemented}

      true ->
        :ready
    end
  end

  @doc """
  Raw chat completion.

  `messages` — list of `%{role: "system"|"user"|"assistant", content: "..."}`
  (string keys also accepted).

  Returns:
  - `{:ok, %{content: binary, usage: map, model: binary, provider: binary}}`
  - `{:error, reason}` on HTTP/API failure (includes `{:http_status, 401|429|402|…, body_excerpt}`)
  - `{:disabled, "LLM not configured"}` when not ready
  """
  def chat(messages, opts \\ [])

  def chat(messages, opts) when is_list(messages) do
    case config() do
      {:ok, cfg} ->
        do_chat(cfg, normalize_messages(messages), opts)

      {:error, :not_configured} ->
        {:disabled, "LLM not configured"}
    end
  end

  def chat(_, _), do: {:error, :invalid_messages}

  @doc "Resolved provider name (lowercased)."
  def provider_name do
    (env("OPAL_LLM_PROVIDER") || "deepseek")
    |> String.trim()
    |> String.downcase()
  end

  @doc "Default or env-overridden model for the active provider."
  def model_name do
    case Map.get(@providers, provider_name()) do
      %{default_model: default} ->
        env("OPAL_LLM_MODEL") || default

      _ ->
        env("OPAL_LLM_MODEL") || "deepseek-chat"
    end
  end

  defp config do
    case readiness() do
      :ready ->
        provider = provider_name()
        meta = Map.fetch!(@providers, provider)

        {:ok,
         %{
           provider: provider,
           api_key: api_key(),
           base_url: meta.base_url,
           model: env("OPAL_LLM_MODEL") || meta.default_model
         }}

      {:disabled, _} ->
        {:error, :not_configured}
    end
  end

  defp do_chat(cfg, messages, opts) do
    model = Keyword.get(opts, :model, cfg.model) || cfg.model
    temperature = Keyword.get(opts, :temperature, 0.3)
    response_format = Keyword.get(opts, :response_format)

    body =
      %{
        "model" => model,
        "messages" => messages,
        "temperature" => temperature
      }
      |> maybe_put_response_format(response_format)

    url = String.trim_trailing(cfg.base_url, "/") <> "/chat/completions"
    headers = [{"authorization", "Bearer " <> cfg.api_key}, {"content-type", "application/json"}]

    case http_post(url, body, headers) do
      {:ok, %{status: status, body: resp}} when status in 200..299 ->
        parse_success(resp, cfg.provider, model)

      {:ok, %{status: status, body: resp}} ->
        excerpt = body_excerpt(resp)
        Logger.warning("llm.chat_failed provider=#{cfg.provider} status=#{status} excerpt=#{excerpt}")
        {:error, {:http_status, status, excerpt}}

      {:error, :timeout} ->
        Logger.warning("llm.chat_timeout provider=#{cfg.provider}")
        {:error, :timeout}

      {:error, reason} ->
        Logger.warning("llm.chat_error provider=#{cfg.provider} reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp parse_success(resp, provider, model) when is_map(resp) do
    content =
      resp
      |> get_in(["choices", Access.at(0), "message", "content"])
      |> case do
        c when is_binary(c) -> String.trim(c)
        _ -> ""
      end

    usage = normalize_usage(resp["usage"] || %{})

    Logger.info(
      "llm.usage provider=#{provider} model=#{model} " <>
        "prompt_tokens=#{usage.prompt_tokens} completion_tokens=#{usage.completion_tokens} " <>
        "total_tokens=#{usage.total_tokens}"
    )

    {:ok, %{content: content, usage: usage, model: model, provider: provider}}
  end

  defp parse_success(_, provider, model) do
    Logger.warning("llm.chat_bad_json provider=#{provider} model=#{model}")
    {:error, :invalid_response}
  end

  defp normalize_usage(usage) when is_map(usage) do
    %{
      prompt_tokens: usage["prompt_tokens"] || usage[:prompt_tokens] || 0,
      completion_tokens: usage["completion_tokens"] || usage[:completion_tokens] || 0,
      total_tokens: usage["total_tokens"] || usage[:total_tokens] || 0
    }
  end

  defp normalize_usage(_),
    do: %{prompt_tokens: 0, completion_tokens: 0, total_tokens: 0}

  defp normalize_messages(messages) do
    Enum.map(messages, fn
      %{role: role, content: content} ->
        %{"role" => to_string(role), "content" => to_string(content)}

      %{"role" => role, "content" => content} ->
        %{"role" => to_string(role), "content" => to_string(content)}

      other when is_map(other) ->
        %{
          "role" => to_string(Map.get(other, "role") || Map.get(other, :role) || "user"),
          "content" => to_string(Map.get(other, "content") || Map.get(other, :content) || "")
        }
    end)
  end

  defp maybe_put_response_format(body, %{type: type}) when is_binary(type) do
    Map.put(body, "response_format", %{"type" => type})
  end

  defp maybe_put_response_format(body, %{"type" => type} = fmt) when is_binary(type) do
    Map.put(body, "response_format", fmt)
  end

  defp maybe_put_response_format(body, _), do: body

  defp http_post(url, body, headers) do
    client = Application.get_env(:opal_core, :llm_http_client, :req)

    case client do
      :req ->
        req_post(url, body, headers)

      fun when is_function(fun, 3) ->
        fun.(url, body, headers)

      _ ->
        req_post(url, body, headers)
    end
  end

  defp req_post(url, body, headers) do
    case Req.post(url,
           json: body,
           headers: headers,
           receive_timeout: @timeout_ms,
           connect_options: [timeout: @connect_timeout_ms],
           retry: false
         ) do
      {:ok, %Req.Response{status: status, body: resp_body}} ->
        decoded =
          cond do
            is_map(resp_body) -> resp_body
            is_binary(resp_body) -> decode_json_map(resp_body)
            true -> %{}
          end

        {:ok, %{status: status, body: decoded}}

      {:error, %Req.TransportError{reason: :timeout}} ->
        {:error, :timeout}

      {:error, %Req.TransportError{reason: reason}} ->
        {:error, reason}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp decode_json_map(bin) do
    case Jason.decode(bin) do
      {:ok, map} when is_map(map) -> map
      _ -> %{"raw" => String.slice(bin, 0, 200)}
    end
  end

  defp body_excerpt(body) when is_map(body) do
    msg = body["error"]["message"] || body["error"] || body["message"] || inspect(body)
    msg |> to_string() |> String.slice(0, 160) |> String.replace(~r/\s+/, " ")
  end

  defp body_excerpt(body) when is_binary(body), do: String.slice(body, 0, 160)
  defp body_excerpt(_), do: ""

  defp api_key, do: env("OPAL_LLM_API_KEY")

  defp env(key) do
    case System.get_env(key) do
      v when is_binary(v) ->
        trimmed = String.trim(v)
        if trimmed == "", do: nil, else: trimmed

      _ ->
        nil
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false
end
