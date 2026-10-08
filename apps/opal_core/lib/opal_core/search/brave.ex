defmodule OpalCore.Search.Brave do
  @moduledoc """
  Brave Search API adapter.

  Gates on `BRAVE_API_KEY`. Without the key every call returns
  `{:disabled, "BRAVE_API_KEY missing"}`. Never invents results.

  Chosen over Serper: Brave has a direct web-search REST surface with a
  single subscription header and no Google CSE middleman — simpler for
  product gating. Set `SERPER_API_KEY` only if migrating; this module
  does not read Serper.
  """

  @behaviour OpalCore.Search

  require Logger

  @api_url "https://api.search.brave.com/res/v1/web/search"

  @impl true
  def search(query, opts \\ [])

  def search(query, opts) when is_binary(query) and is_list(opts) do
    q = String.trim(query)

    cond do
      q == "" ->
        {:error, :empty_query}

      true ->
        with {:ok, key} <- api_key(opts) do
          do_search(q, key, opts)
        end
    end
  end

  def search(_, _), do: {:error, :invalid_query}

  defp api_key(opts) do
    key =
      Keyword.get(opts, :api_key) ||
        Application.get_env(:opal_core, :brave_api_key) ||
        System.get_env("BRAVE_API_KEY")

    if is_binary(key) and String.trim(key) != "" do
      {:ok, String.trim(key)}
    else
      {:disabled, "BRAVE_API_KEY missing"}
    end
  end

  defp do_search(query, key, opts) do
    count = min(Keyword.get(opts, :count, 5), 10)
    url = @api_url <> "?" <> URI.encode_query(%{"q" => query, "count" => count})

    case http_client().get_json(url, headers: [{"x-subscription-token", key}, {"accept", "application/json"}]) do
      {:ok, body} when is_map(body) ->
        results =
          body
          |> get_in(["web", "results"])
          |> List.wrap()
          |> Enum.map(&normalize/1)
          |> Enum.reject(&is_nil/1)

        Logger.info("search.brave completed query_len=#{String.length(query)} hits=#{length(results)}")
        {:ok, results}

      {:error, reason} ->
        Logger.warning("search.brave error=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp normalize(%{"title" => title, "url" => url} = row) when is_binary(title) and is_binary(url) do
    %{
      title: title,
      url: url,
      snippet: row["description"] || row["snippet"] || "",
      source: "brave"
    }
  end

  defp normalize(_), do: nil

  def http_client do
    Application.get_env(:opal_core, :brave_search_http_client, __MODULE__.HTTP)
  end

  defmodule HTTP do
    @moduledoc false

    def get_json(url, opts) do
      headers = Keyword.get(opts, :headers, [])

      case Req.get(url, headers: headers, receive_timeout: 10_000) do
        {:ok, %{status: status, body: body}} when status in 200..299 ->
          {:ok, decode(body)}

        {:ok, %{status: status, body: body}} ->
          {:error, {:http, status, truncate(body)}}

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

    defp truncate(body) when is_binary(body), do: String.slice(body, 0, 200)
    defp truncate(body), do: inspect(body) |> String.slice(0, 200)
  end
end
