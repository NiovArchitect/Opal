defmodule OpalCore.Search do
  @moduledoc """
  Web search behaviour (Paste G Phase 2).

  Implementations must gate on a real API key and return `{:disabled, reason}`
  when missing. Never invent search hits.
  """

  @type result :: %{
          required(:title) => String.t(),
          required(:url) => String.t(),
          required(:snippet) => String.t(),
          optional(:source) => String.t()
        }

  @callback search(query :: String.t(), opts :: keyword()) ::
              {:ok, [result()]} | {:disabled, String.t()} | {:error, term()}

  @doc "Resolve the configured search adapter (Brave by default)."
  def adapter do
    Application.get_env(:opal_core, :search_adapter, OpalCore.Search.Brave)
  end

  @doc "Search via the configured adapter. Never invents results."
  def search(query, opts \\ [])

  def search(query, opts) when is_binary(query) do
    adapter().search(query, opts)
  end

  def search(_, _), do: {:error, :invalid_query}
end
