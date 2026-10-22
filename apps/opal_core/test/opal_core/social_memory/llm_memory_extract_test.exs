defmodule OpalCore.SocialMemory.LlmMemoryExtractTest do
  @moduledoc """
  Repair #26 (F-4) — the language-aware LLM memory leg in ingest.

  The LLM HTTP seam (`:llm_http_client`) is faked exactly the way the
  existing LlmExtract tests fake it: a 3-arity function returning the
  OpenAI-shaped response map. Spanish utterances are real input text
  run through the real ingest; only the provider call is stubbed.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{Commitment, PersonMemory, PlanMemory}

  setup do
    prior = %{
      key: System.get_env("OPAL_LLM_API_KEY"),
      provider: System.get_env("OPAL_LLM_PROVIDER"),
      model: System.get_env("OPAL_LLM_MODEL"),
      memory: System.get_env("OPAL_MEMORY_ENABLED"),
      http: Application.get_env(:opal_core, :llm_http_client)
    }

    System.put_env("OPAL_MEMORY_ENABLED", "true")
    System.put_env("OPAL_LLM_API_KEY", "sk-test-not-real")
    System.put_env("OPAL_LLM_PROVIDER", "deepseek")
    System.delete_env("OPAL_LLM_MODEL")

    calls = start_supervised!({Agent, fn -> [] end})

    on_exit(fn ->
      restore_env("OPAL_LLM_API_KEY", prior.key)
      restore_env("OPAL_LLM_PROVIDER", prior.provider)
      restore_env("OPAL_LLM_MODEL", prior.model)
      restore_env("OPAL_MEMORY_ENABLED", prior.memory)

      if prior.http do
        Application.put_env(:opal_core, :llm_http_client, prior.http)
      else
        Application.delete_env(:opal_core, :llm_http_client)
      end
    end)

    {:ok, calls: calls}
  end

  # Install a fake :llm_http_client that records every request body in
  # the `calls` agent and answers with `handler.(message_text)` encoded
  # as the model's JSON content.
  defp install_fake(calls, handler) do
    Application.put_env(:opal_core, :llm_http_client, fn _url, body, _headers ->
      Agent.update(calls, fn acc -> [body | acc] end)

      %{"content" => user_content} =
        Enum.find(body["messages"], fn m -> m["role"] == "user" end)

      %{"message" => message} = Jason.decode!(user_content)

      {:ok,
       %{
         status: 200,
         body: %{
           "choices" => [%{"message" => %{"content" => handler.(message)}}],
           "usage" => %{"prompt_tokens" => 10, "completion_tokens" => 5, "total_tokens" => 15}
         }
       }}
    end)
  end

  defp call_count(calls), do: Agent.get(calls, &length/1)

  defp captured_prompt(calls) do
    calls
    |> Agent.get(& &1)
    |> Enum.flat_map(fn body -> body["messages"] end)
    |> Enum.map_join("\n", fn m -> m["content"] end)
  end

  defp ingest_spanish(account, conv, msg, sender, body, language \\ "es") do
    SocialMemory.ingest(
      account,
      conv,
      msg,
      %{intent: "chitchat", entities: %{}, vibe: %{}},
      %{sender_id: sender, body: body, timestamp: DateTime.utc_now(), language: language}
    )
  end

  test "Spanish commitment lands for the speaker-account only, not the other party", %{
    calls: calls
  } do
    install_fake(calls, fn _message ->
      Jason.encode!(%{
        "facts" => [],
        "commitments" => [%{"text" => "yo llevo el café para los dos"}],
        "plans" => []
      })
    end)

    speaker = Ecto.UUID.generate()
    other = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    msg = Ecto.UUID.generate()
    body = "Perfecto, yo llevo el café para los dos."

    assert {:ok, _} = ingest_spanish(speaker, conv, msg, speaker, body)

    row = Repo.get_by(Commitment, account_id: speaker, source_message_id: msg)
    assert row
    assert row.status == "open"
    assert row.description =~ "café"

    # The same segment fans out to the other party's store; the
    # speaker's commitment must NOT land there.
    assert {:ok, _} = ingest_spanish(other, conv, msg, speaker, body)
    assert Repo.get_by(Commitment, account_id: other, source_message_id: msg) == nil
  end

  test "Spanish plan lands in BOTH parties' stores with normalized day+time and verbatim place",
       %{calls: calls} do
    install_fake(calls, fn _message ->
      Jason.encode!(%{
        "facts" => [],
        "commitments" => [],
        "plans" => [
          %{
            "activity" => nil,
            "day" => "tomorrow",
            "time_24h" => "18:00",
            "place" => "la biblioteca"
          }
        ]
      })
    end)

    speaker = Ecto.UUID.generate()
    other = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    body = "¿nos vemos mañana a las seis en la biblioteca?"

    assert {:ok, _} = ingest_spanish(speaker, conv, Ecto.UUID.generate(), speaker, body)
    assert {:ok, _} = ingest_spanish(other, conv, Ecto.UUID.generate(), speaker, body)

    for account <- [speaker, other] do
      plans = Repo.all(PlanMemory) |> Enum.filter(&(&1.account_id == account))
      assert length(plans) == 1
      plan = hd(plans)
      assert plan.time_label =~ "tomorrow"
      assert plan.time_label =~ "18:00"
      assert plan.place_label == "la biblioteca"
    end
  end

  test "Spanish dislike lands as known_facts with stated_llm provenance", %{calls: calls} do
    install_fake(calls, fn _message ->
      Jason.encode!(%{
        "facts" => [%{"object" => "el cilantro", "kind" => "dislike"}],
        "commitments" => [],
        "plans" => []
      })
    end)

    speaker = Ecto.UUID.generate()
    other = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    body = "No soporto el cilantro, de verdad."

    assert {:ok, _} = ingest_spanish(speaker, conv, Ecto.UUID.generate(), speaker, body)
    assert {:ok, _} = ingest_spanish(other, conv, Ecto.UUID.generate(), speaker, body)

    # Speaker's own store: self-mirror row. Other party's store: the
    # fact about the speaker lives on the speaker's person row there.
    for account <- [speaker, other] do
      row = Repo.get_by(PersonMemory, account_id: account, person_id: speaker)
      assert row, "expected a person row for the speaker in #{account}'s store"
      entry = row.known_facts["dislike:el cilantro"]

      assert entry,
             "expected dislike:el cilantro in known_facts, got: #{inspect(row.known_facts)}"

      assert entry["provenance"] == "stated_llm"
    end
  end

  test "English and nil language never invoke the LLM leg", %{calls: calls} do
    install_fake(calls, fn _message ->
      Jason.encode!(%{"facts" => [], "commitments" => [], "plans" => []})
    end)

    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    body = "Perfecto, yo llevo el café para los dos."

    assert {:ok, _} = ingest_spanish(account, conv, Ecto.UUID.generate(), account, body, "en-US")
    assert {:ok, _} = ingest_spanish(account, conv, Ecto.UUID.generate(), account, body, nil)
    assert call_count(calls) == 0
  end

  test "prompt is the scoped assembly, carries the role word, and never the other party's id",
       %{calls: calls} do
    install_fake(calls, fn _message ->
      Jason.encode!(%{"facts" => [], "commitments" => [], "plans" => []})
    end)

    speaker = Ecto.UUID.generate()
    other = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    body = "¿nos vemos mañana a las seis en la biblioteca?"

    assert {:ok, _} = ingest_spanish(speaker, conv, Ecto.UUID.generate(), speaker, body)
    assert call_count(calls) == 1

    prompt = captured_prompt(calls)
    # The scoped-context marker from PromptBuilder's assembly.
    assert prompt =~ "What you know (account-scoped"
    # Speaker identity enters only as the account-relative role word.
    assert prompt =~ ~s("speaker_role":"self")
    # The other party's raw account id is nowhere in the prompt.
    refute prompt =~ other
  end

  test "LLM disabled: ingest completes, nothing extracted, no crash", %{calls: _calls} do
    System.delete_env("OPAL_LLM_API_KEY")

    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    msg = Ecto.UUID.generate()
    body = "¿nos vemos mañana a las seis en la biblioteca?"

    assert {:ok, _} = ingest_spanish(account, conv, msg, account, body)
    assert Repo.all(PlanMemory) |> Enum.filter(&(&1.account_id == account)) == []
    assert Repo.get_by(Commitment, account_id: account, source_message_id: msg) == nil
  end

  test "LLM HTTP error: ingest completes, nothing extracted, no crash", %{calls: calls} do
    Application.put_env(:opal_core, :llm_http_client, fn _url, body, _headers ->
      Agent.update(calls, fn acc -> [body | acc] end)
      {:ok, %{status: 500, body: %{"error" => %{"message" => "provider down"}}}}
    end)

    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    body = "No soporto el cilantro, de verdad."

    assert {:ok, _} = ingest_spanish(account, conv, Ecto.UUID.generate(), account, body)
    assert call_count(calls) == 1

    assert Repo.get_by(PersonMemory, account_id: account, person_id: account) == nil or
             Repo.get_by(PersonMemory, account_id: account, person_id: account).known_facts ==
               %{}
  end

  test "LLM unparseable reply: ingest completes, nothing extracted, no crash", %{
    calls: calls
  } do
    Application.put_env(:opal_core, :llm_http_client, fn _url, _body, _headers ->
      {:ok,
       %{
         status: 200,
         body: %{
           "choices" => [%{"message" => %{"content" => "esto no es json"}}],
           "usage" => %{}
         }
       }}
    end)

    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    msg = Ecto.UUID.generate()

    assert {:ok, _} =
             ingest_spanish(
               account,
               conv,
               msg,
               account,
               "Perfecto, yo llevo el café para los dos."
             )

    assert Repo.get_by(Commitment, account_id: account, source_message_id: msg) == nil
    _ = calls
  end

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, val), do: System.put_env(key, val)
end
