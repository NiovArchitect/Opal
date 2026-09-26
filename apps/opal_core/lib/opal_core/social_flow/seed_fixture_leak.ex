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

  # Tokens that must appear in the live message text if a chronology label uses them.
  # Otherwise the label is prior harness or catalog fiction.
  @entailed_tokens ~w(coffee tuesday harbor herb 10:30 saturday juniper)

  def label_supported_by_messages?(label, bodies) when is_binary(label) and is_list(bodies) do
    text = bodies |> Enum.join(" ") |> String.downcase()
    label_l = String.downcase(label)

    Enum.all?(@entailed_tokens, fn token ->
      if String.contains?(label_l, token), do: String.contains?(text, token), else: true
    end)
  end

  def label_supported_by_messages?(_, _), do: true
end
