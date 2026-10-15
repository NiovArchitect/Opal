defmodule OpalCore.OpalResponseRepair11Test do
  @moduledoc """
  Repair #11 — Center re-engagement:
  (a) :named_venue renders a truthful, non-inventing fallback;
  (b) render_chat clears the sticky recent_who re-engagement when the current
      turn carries an explicit new direction (new search, switch_topic, new chat),
      and keeps it otherwise (regression lock).

  Pure unit tests (no DB).

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/opal_response_repair11_test.exs`
  """

  use ExUnit.Case, async: true

  alias OpalCore.OpalResponse

  defp sticky_context(raw) do
    %{
      user: %{id: "u1", display_name: "Alex"},
      social: %{
        frequent_contacts: [%{user_id: "c1", display_name: "Maya Chen"}]
      },
      conversation_history: [
        %{role: "user", body: "Maya and I want dinner Friday"}
      ],
      message: %{text: raw}
    }
  end

  defp generate!(intent_map, ctx) do
    assert {:ok, text} = OpalResponse.generate(intent_map, ctx)
    text
  end

  test ":named_venue with locality renders a truthful lookup line" do
    text =
      generate!(
        %{intent: :named_venue, entities: %{venue_name: "Nighthawk", locality: "Coronado"},
          raw_text: "Find Nighthawk in Coronado"},
        %{}
      )

    assert String.contains?(text, "Nighthawk")
    assert String.contains?(text, "Coronado")
  end

  test ":named_venue without locality asks one focused question" do
    text =
      generate!(
        %{intent: :named_venue, entities: %{venue_name: "Nighthawk"},
          raw_text: "Find Nighthawk"},
        %{}
      )

    assert text == "Which city is Nighthawk in?"
  end

  test ":named_venue with no name asks for the name" do
    text =
      generate!(
        %{intent: :named_venue, entities: %{}, raw_text: "Find"},
        %{}
      )

    assert text == "Tell me the place name and I'll look it up."
  end

  test "sticky re-engagement still fires on a neutral turn (regression lock)" do
    text =
      generate!(
        %{intent: :chat, entities: %{}, raw_text: "hmm interesting"},
        sticky_context("hmm interesting")
      )

    assert String.contains?(text, "You mentioned Maya earlier")
  end

  test "something new clears the sticky re-engagement" do
    text =
      generate!(
        %{intent: :chat, entities: %{}, raw_text: "something new"},
        sticky_context("something new")
      )

    refute String.contains?(text, "You mentioned")
  end

  test "start over clears the sticky re-engagement" do
    text =
      generate!(
        %{intent: :chat, entities: %{}, raw_text: "let's start over"},
        sticky_context("let's start over")
      )

    refute String.contains?(text, "You mentioned")
  end

  test "a find turn clears the sticky re-engagement" do
    text =
      generate!(
        %{intent: :chat, entities: %{}, raw_text: "Find Nighthawk in Coronado"},
        sticky_context("Find Nighthawk in Coronado")
      )

    refute String.contains?(text, "You mentioned")
  end
end
