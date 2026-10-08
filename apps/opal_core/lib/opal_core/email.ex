defmodule OpalCore.Email do
  @moduledoc """
  Targeted Gmail search facade (Paste G Phase 4).

  Privacy:
  - Every search REQUIRES a non-empty query — never full-inbox scan.
  - Message bodies are processed then discarded; no `email_body` column anywhere.
  - Uses the same Google OAuth connection (`provider_connections` / TokenVault)
    with `gmail.readonly` on the consent screen alongside calendar.readonly.
  """

  require Logger

  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  @messages_url "https://gmail.googleapis.com/gmail/v1/users/me/messages"

  @doc "Search Gmail with a required non-empty query. Never scans the full inbox."
  def search(user_id, query, opts \\ [])

  def search(user_id, query, opts) when is_binary(user_id) and is_binary(query) do
    q = String.trim(query)

    cond do
      q == "" ->
        {:error, :empty_query}

      true ->
        with {:ok, conn} <- require_gmail(user_id),
             {:ok, token} <- ensure_token(conn) do
          max = min(Keyword.get(opts, :max_results, 10), 25)

          url =
            @messages_url <>
              "?" <>
              URI.encode_query(%{"q" => q, "maxResults" => max})

          case http_client().get_json(url, bearer: token) do
            {:ok, body} when is_map(body) ->
              ids =
                body
                |> Map.get("messages", [])
                |> List.wrap()
                |> Enum.map(& &1["id"])
                |> Enum.filter(&is_binary/1)

              Logger.info("email.search user=#{user_id} hits=#{length(ids)} query_len=#{String.length(q)}")
              {:ok, %{"message_ids" => ids, "result_size_estimate" => body["resultSizeEstimate"]}}

            {:ok, %{"error" => %{"code" => 401}}} ->
              refresh_and_search(user_id, conn, q, opts)

            {:error, _} = err ->
              err

            _ ->
              {:error, :unavailable}
          end
        end
    end
  end

  def search(_, "", _), do: {:error, :empty_query}
  def search(_, nil, _), do: {:error, :empty_query}
  def search(_, _, _), do: {:error, :invalid}

  @doc """
  Fetch one message. Returns extracted facts; raw body is NOT persisted.

  Privacy: body bytes are parsed in-process then dropped — callers receive
  subject/from/snippet/confirmation-shaped facts only.
  """
  def get_message(user_id, message_id, opts \\ [])

  def get_message(user_id, message_id, _opts)
      when is_binary(user_id) and is_binary(message_id) do
    with {:ok, conn} <- require_gmail(user_id),
         {:ok, token} <- ensure_token(conn) do
      url = "#{@messages_url}/#{URI.encode(message_id)}?format=full"

      case http_client().get_json(url, bearer: token) do
        {:ok, body} when is_map(body) ->
          facts = extract_facts(body)
          # Explicit discard — do not return raw payload / body data.
          {:ok, facts}

        {:ok, %{"error" => %{"code" => 401}}} ->
          case refresh_token!(user_id, conn) do
            {:ok, _} -> get_message(user_id, message_id)
            {:error, _} = err -> err
          end

        {:error, _} = err ->
          err

        _ ->
          {:error, :unavailable}
      end
    end
  end

  def get_message(_, _, _), do: {:error, :invalid}

  @doc "Audit helper — empty query always rejected."
  def requires_non_empty_query?, do: true

  # --- internals ---

  defp require_gmail(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      %{status: "connected"} = c ->
        scopes = List.wrap(c.scopes)

        if Enum.any?(scopes, &String.contains?(to_string(&1), "gmail")) or
             Keyword.get(Application.get_env(:opal_core, :email, []), :allow_without_gmail_scope_in_test, false) do
          {:ok, c}
        else
          # Connection exists but gmail scope may be pending re-consent; still try —
          # API will 403 if missing. Prefer honest disconnect messaging for revoked.
          {:ok, c}
        end

      %{status: "revoked"} ->
        {:error, :disconnected}

      nil ->
        {:error, :disconnected}

      _ ->
        {:error, :disconnected}
    end
  end

  defp ensure_token(conn) do
    now = DateTime.utc_now()

    expired? =
      match?(%DateTime{}, conn.token_expires_at) and
        DateTime.compare(conn.token_expires_at, now) != :gt

    if expired? do
      refresh_access(conn)
    else
      case ProviderConnections.access_token(conn) do
        {:ok, t} -> {:ok, t}
        _ -> {:error, :disconnected}
      end
    end
  end

  defp refresh_and_search(user_id, conn, q, opts) do
    case refresh_token!(user_id, conn) do
      {:ok, _} -> search(user_id, q, opts)
      {:error, :refresh_revoked} -> {:error, :disconnected}
      other -> other
    end
  end

  defp refresh_token!(user_id, conn) do
    with {:ok, refresh} <- ProviderConnections.refresh_token(conn),
         true <- is_binary(refresh) and refresh != "",
         {:ok, tokens} <- GoogleAdapter.refresh_access_token(refresh),
         next_refresh <- tokens[:refresh_token] || refresh,
         {:ok, _} <-
           ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
             access_token: tokens.access_token,
             refresh_token: next_refresh,
             token_expires_at: tokens.token_expires_at,
             scopes: conn.scopes,
             metadata: conn.metadata
           }) do
      {:ok, tokens.access_token}
    else
      {:error, :refresh_revoked} -> {:error, :refresh_revoked}
      false -> {:error, :disconnected}
      _ -> {:error, :disconnected}
    end
  end

  defp refresh_access(conn) do
    refresh_token!(conn.user_id, conn)
  end

  defp extract_facts(body) when is_map(body) do
    headers =
      get_in(body, ["payload", "headers"])
      |> List.wrap()
      |> Map.new(fn
        %{"name" => n, "value" => v} -> {String.downcase(n), v}
        _ -> {nil, nil}
      end)
      |> Map.delete(nil)

    snippet = body["snippet"] || ""
    # Pull a short text sample for confirmation parsing, then drop.
    text_sample = payload_text(body["payload"]) |> String.slice(0, 4000)

    confirmation =
      detect_confirmation(headers["subject"] || "", snippet <> " " <> text_sample)

    # text_sample goes out of scope — not returned, not stored.
    %{
      "id" => body["id"],
      "thread_id" => body["threadId"],
      "subject" => headers["subject"],
      "from" => headers["from"],
      "date" => headers["date"],
      "snippet" => String.slice(snippet, 0, 280),
      "confirmation_number" => confirmation,
      "provider" => "gmail"
      # NOTE: no email_body key — bodies processed then discarded (privacy).
    }
  end

  defp payload_text(%{"body" => %{"data" => data}}) when is_binary(data) do
    decode_b64(data)
  end

  defp payload_text(%{"parts" => parts}) when is_list(parts) do
    parts
    |> Enum.map(&payload_text/1)
    |> Enum.join("\n")
  end

  defp payload_text(_), do: ""

  defp decode_b64(data) do
    data
    |> String.replace("-", "+")
    |> String.replace("_", "/")
    |> Base.decode64(padding: false)
    |> case do
      {:ok, bin} -> bin
      _ ->
        case Base.decode64(data) do
          {:ok, bin} -> bin
          _ -> ""
        end
    end
  rescue
    _ -> ""
  end

  defp detect_confirmation(subject, text) do
    blob = subject <> " " <> text

    cond do
      m = Regex.run(~r/\b(?:confirmation|confirmation\s*(?:#|number|code)|conf(?:irmation)?\.?\s*(?:#|no\.?))\s*[:#]?\s*([A-Z0-9-]{5,20})\b/i, blob) ->
        Enum.at(m, 1)

      m = Regex.run(~r/\b([A-Z]{2,3}\d{4,8})\b/, blob) ->
        Enum.at(m, 1)

      true ->
        nil
    end
  end

  def http_client do
    Application.get_env(:opal_core, :gmail_http_client, __MODULE__.HTTP)
  end

  defmodule HTTP do
    @moduledoc false

    def get_json(url, opts) do
      headers =
        case Keyword.get(opts, :bearer) do
          nil -> [{"accept", "application/json"}]
          t -> [{"authorization", "Bearer #{t}"}, {"accept", "application/json"}]
        end

      case Req.get(url, headers: headers, receive_timeout: 12_000) do
        {:ok, %{status: status, body: body}} when status in 200..299 ->
          {:ok, decode(body)}

        {:ok, %{status: status, body: body}} when status in [401, 403] ->
          {:ok, Map.put(decode(body), "error", %{"code" => status})}

        {:ok, %{status: status, body: body}} ->
          {:error, {:http, status, body}}

        {:error, reason} ->
          {:error, {:request, reason}}
      end
    end

    defp decode(body) when is_map(body), do: body

    defp decode(body) when is_binary(body) do
      case Jason.decode(body) do
        {:ok, map} -> map
        _ -> %{}
      end
    end

    defp decode(_), do: %{}
  end
end
