defmodule OpalCore.Search.BraveTest do
  use ExUnit.Case, async: false

  alias OpalCore.Search
  alias OpalCore.Search.Brave

  setup do
    prior_key = System.get_env("BRAVE_API_KEY")
    prior_app = Application.get_env(:opal_core, :brave_api_key)
    prior_http = Application.get_env(:opal_core, :brave_search_http_client)

    System.delete_env("BRAVE_API_KEY")
    Application.delete_env(:opal_core, :brave_api_key)

    on_exit(fn ->
      restore_env("BRAVE_API_KEY", prior_key)
      restore_app(:brave_api_key, prior_app)
      restore_app(:brave_search_http_client, prior_http)
    end)

    :ok
  end

  defp restore_env(name, nil), do: System.delete_env(name)
  defp restore_env(name, val), do: System.put_env(name, val)
  defp restore_app(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_app(key, val), do: Application.put_env(:opal_core, key, val)

  test "without BRAVE_API_KEY returns {:disabled, ...}" do
    assert {:disabled, "BRAVE_API_KEY missing"} = Brave.search("best tacos in Austin")
    assert {:disabled, "BRAVE_API_KEY missing"} = Search.search("concerts this weekend")
  end

  test "empty query rejected" do
    Application.put_env(:opal_core, :brave_api_key, "test-key")
    assert {:error, :empty_query} = Brave.search("   ")
  end

  test "mock HTTP returns normalized results — never invents" do
    Application.put_env(:opal_core, :brave_api_key, "test-key")
    Application.put_env(:opal_core, :brave_search_http_client, OpalCore.Search.BraveTest.FakeHTTP)

    assert {:ok, [hit]} = Brave.search("real query")
    assert hit.title == "Real Hit"
    assert hit.url == "https://example.com/hit"
    assert hit.source == "brave"
  end

  defmodule FakeHTTP do
    def get_json(_url, _opts) do
      {:ok,
       %{
         "web" => %{
           "results" => [
             %{
               "title" => "Real Hit",
               "url" => "https://example.com/hit",
               "description" => "A real snippet"
             }
           ]
         }
       }}
    end
  end
end
