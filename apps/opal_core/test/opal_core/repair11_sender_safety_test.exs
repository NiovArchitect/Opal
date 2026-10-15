defmodule OpalCore.Intelligence.Repair11SenderSafetyTest do
  @moduledoc """
  Repair #11 — attribution honesty: the intelligence layer may only post as the
  configured Opal/bot sender id. Any other sender id is :unsafe_sender, so LLM
  text can never render as a human (the call_transcription bug shape).

  Also documents the env contract: OPAL_INTELLIGENCE_SENDER_USER_ID has NO
  default in code — unset/empty refuses to post (log-only), never impersonates.

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/repair11_sender_safety_test.exs`
  """

  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.Executor

  @env "OPAL_INTELLIGENCE_SENDER_USER_ID"

  setup do
    prev = System.get_env(@env)

    on_exit(fn ->
      case prev do
        nil -> System.delete_env(@env)
        v -> System.put_env(@env, v)
      end
    end)

    :ok
  end

  test "resolve_opal_sender_id/0 returns the configured id" do
    System.put_env(@env, "bot-opal-1")

    assert Executor.resolve_opal_sender_id() == {:ok, "bot-opal-1"}
  end

  test "resolve_opal_sender_id/0 has no default: unset refuses" do
    System.delete_env(@env)

    assert Executor.resolve_opal_sender_id() == {:error, :opal_sender_not_configured}
  end

  test "resolve_opal_sender_id/0 has no default: empty refuses" do
    System.put_env(@env, "")

    assert Executor.resolve_opal_sender_id() == {:error, :opal_sender_not_configured}
  end

  test "ensure_safe_sender/1 allows exactly the configured bot id" do
    System.put_env(@env, "bot-opal-1")

    assert Executor.ensure_safe_sender("bot-opal-1") == :ok
  end

  test "ensure_safe_sender/1 refuses a real-human sender id" do
    System.put_env(@env, "bot-opal-1")

    assert Executor.ensure_safe_sender("user-human-9") == {:error, :unsafe_sender}
  end

  test "ensure_safe_sender/1 refuses when the sender is not configured" do
    System.delete_env(@env)

    assert Executor.ensure_safe_sender("bot-opal-1") == {:error, :unsafe_sender}
  end

  test "ensure_safe_sender/1 refuses non-binary ids" do
    System.put_env(@env, "bot-opal-1")

    assert Executor.ensure_safe_sender(nil) == {:error, :unsafe_sender}
    assert Executor.ensure_safe_sender(123) == {:error, :unsafe_sender}
  end
end
