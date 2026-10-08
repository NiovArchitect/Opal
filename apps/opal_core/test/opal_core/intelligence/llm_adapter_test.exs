defmodule OpalCore.Intelligence.LlmAdapterTest do
  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.{LlmAdapter, LlmExtract, LlmRespond}

  setup do
    prior = %{
      key: System.get_env("OPAL_LLM_API_KEY"),
      provider: System.get_env("OPAL_LLM_PROVIDER"),
      model: System.get_env("OPAL_LLM_MODEL"),
      http: Application.get_env(:opal_core, :llm_http_client)
    }

    on_exit(fn ->
      restore_env("OPAL_LLM_API_KEY", prior.key)
      restore_env("OPAL_LLM_PROVIDER", prior.provider)
      restore_env("OPAL_LLM_MODEL", prior.model)

      if prior.http do
        Application.put_env(:opal_core, :llm_http_client, prior.http)
      else
        Application.delete_env(:opal_core, :llm_http_client)
      end
    end)

    :ok
  end

  test "readiness disabled when key absent" do
    System.delete_env("OPAL_LLM_API_KEY")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    assert LlmAdapter.configured?() == false
    assert LlmAdapter.readiness() == {:disabled, :api_key_missing}
    assert {:disabled, "LLM not configured"} = LlmAdapter.chat([%{role: "user", content: "hi"}])
  end

  test "anthropic selected → anthropic_not_implemented (no half client)" do
    System.put_env("OPAL_LLM_API_KEY", "sk-test-not-real")
    System.put_env("OPAL_LLM_PROVIDER", "anthropic")

    assert LlmAdapter.readiness() == {:disabled, :anthropic_not_implemented}
    assert LlmAdapter.configured?() == false
  end

  test "configured deepseek + mock HTTP → chat returns content + usage" do
    System.put_env("OPAL_LLM_API_KEY", "sk-test-not-real")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    Application.put_env(:opal_core, :llm_http_client, fn _url, _body, _headers ->
      {:ok,
       %{
         status: 200,
         body: %{
           "choices" => [%{"message" => %{"content" => "hello from mock"}}],
           "usage" => %{
             "prompt_tokens" => 11,
             "completion_tokens" => 4,
             "total_tokens" => 15
           }
         }
       }}
    end)

    assert LlmAdapter.readiness() == :ready
    assert LlmAdapter.configured?()

    assert {:ok, %{content: "hello from mock", usage: usage, provider: "deepseek"}} =
             LlmAdapter.chat([%{role: "user", content: "ping"}])

    assert usage.prompt_tokens == 11
    assert usage.completion_tokens == 4
  end

  test "HTTP 401 returns exact provider error — never synthesizes content" do
    System.put_env("OPAL_LLM_API_KEY", "sk-bad")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    Application.put_env(:opal_core, :llm_http_client, fn _url, _body, _headers ->
      {:ok, %{status: 401, body: %{"error" => %{"message" => "Invalid API key"}}}}
    end)

    assert {:error, {:http_status, 401, excerpt}} =
             LlmAdapter.chat([%{role: "user", content: "ping"}])

    assert excerpt =~ "Invalid API key"
  end

  test "extract_with_llm disabled → {:disabled}; mock JSON → structured ok" do
    System.delete_env("OPAL_LLM_API_KEY")
    assert {:disabled, _} = LlmExtract.extract_with_llm("yes", %{})

    System.put_env("OPAL_LLM_API_KEY", "sk-test")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    Application.put_env(:opal_core, :llm_http_client, fn _url, _body, _headers ->
      {:ok,
       %{
         status: 200,
         body: %{
           "choices" => [
             %{
               "message" => %{
                 "content" =>
                   ~s({"intent":"plan.confirm","entities":{"people":["Maya"],"places":[],"times":[],"activities":[]},"vibe":"positive","confidence":0.91})
               }
             }
           ],
           "usage" => %{"prompt_tokens" => 40, "completion_tokens" => 20, "total_tokens" => 60}
         }
       }}
    end)

    assert {:ok, %{intent: "plan.confirm", source: "llm", confidence: conf}} =
             LlmExtract.extract_with_llm("yes that works for Saturday market", %{
               plan_label: "market"
             })

    assert conf >= 0.6
  end

  test "generate_response falls back disabled without key" do
    System.delete_env("OPAL_LLM_API_KEY")

    assert {:disabled, "LLM not configured"} =
             LlmRespond.generate_response(%{
               action: "plan.confirm",
               template_message: "Locked in!",
               recent_messages: ["yes"]
             })
  end

  test "simple messages skip LLM extract entirely" do
    System.put_env("OPAL_LLM_API_KEY", "sk-test")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")

    assert {:disabled, _} = LlmExtract.extract_with_llm("yes", %{})
    assert {:disabled, _} = LlmExtract.extract_with_llm("ok", %{})
  end

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, val), do: System.put_env(key, val)
end
