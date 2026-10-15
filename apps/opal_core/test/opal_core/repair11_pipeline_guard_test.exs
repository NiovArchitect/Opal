defmodule OpalCore.Intelligence.Repair11PipelineGuardTest do
  @moduledoc """
  Repair #11 — self-trigger guard: Opal's own posts must never re-enter the
  intelligence pipeline (LLM output must not become de-facto state, or loop).

  Pure unit tests (no DB): the guard returns before any pipeline stage runs.

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/repair11_pipeline_guard_test.exs`
  """

  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.Pipeline

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

  test "bot_authored?/1 is true when sender matches the configured Opal sender id" do
    System.put_env(@env, "bot-opal-1")

    assert Pipeline.bot_authored?(%{sender_user_id: "bot-opal-1", message_type: "text"})
    assert Pipeline.bot_authored?(%{"sender_user_id" => "bot-opal-1", "message_type" => "text"})
  end

  test "bot_authored?/1 is false for a human sender" do
    System.put_env(@env, "bot-opal-1")

    refute Pipeline.bot_authored?(%{sender_user_id: "user-human-9", message_type: "text"})
  end

  test "bot_authored?/1 is false when the env var is unset, even for any sender" do
    System.delete_env(@env)

    refute Pipeline.bot_authored?(%{sender_user_id: "bot-opal-1", message_type: "text"})
    refute Pipeline.bot_authored?(%{sender_user_id: "user-human-9", message_type: "text"})
  end

  test "bot_authored?/1 treats message_type system as bot-authored (forward-compatible)" do
    System.delete_env(@env)

    assert Pipeline.bot_authored?(%{sender_user_id: "user-human-9", message_type: "system"})
  end

  test "bot_authored?/1 is false for non-maps" do
    System.put_env(@env, "bot-opal-1")

    refute Pipeline.bot_authored?(nil)
    refute Pipeline.bot_authored?("bot-opal-1")
  end

  test "on_message_created skips bot-authored messages without touching the pipeline" do
    System.put_env(@env, "bot-opal-1")

    assert {:ok, %{skipped: true, reason: :bot_authored}} =
             Pipeline.on_message_created(
               %{sender_user_id: "bot-opal-1", message_type: "text", body: "Locked in!"},
               %{}
             )
  end
end
