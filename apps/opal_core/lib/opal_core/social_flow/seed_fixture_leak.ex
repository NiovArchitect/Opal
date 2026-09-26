defmodule OpalCore.SocialFlow.SeedFixtureLeak do
  @moduledoc """
  Messages copied out of founder-seed fixtures into a real thread.

  Fixture rows may remain in seed conversations. These bodies are not
  social content of a no-seed direct chat.
  """

  @patterns [
    ~r/Forwarded Memory:/i,
    ~r/\[seed-/i,
    ~r/Golden hour hike with the crew/i
  ]

  def seed_fixture_body?(body) when is_binary(body) do
    trimmed = String.trim(body)
    trimmed != "" and Enum.any?(@patterns, &Regex.match?(&1, trimmed))
  end

  def seed_fixture_body?(_), do: false
end
