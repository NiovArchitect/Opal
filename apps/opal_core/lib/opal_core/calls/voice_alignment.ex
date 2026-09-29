defmodule OpalCore.Calls.VoiceAlignment do
  @moduledoc """
  Turns one final authenticated utterance into the existing alignment fold.
  Spoken number words are normalized so the chat time rules can read them.
  This is not a second planner.
  """

  alias OpalCore.SocialFlow.ConversationAlignment

  @numbers %{
    "one" => "1",
    "two" => "2",
    "three" => "3",
    "four" => "4",
    "five" => "5",
    "six" => "6",
    "seven" => "7",
    "eight" => "8",
    "nine" => "9",
    "ten" => "10",
    "eleven" => "11",
    "twelve" => "12"
  }

  @low_confidence 0.55

  def normalize(text) when is_binary(text) do
    Enum.reduce(@numbers, text, fn {word, digit}, acc ->
      Regex.replace(~r/\b#{word}\b/i, acc, digit)
    end)
  end

  def normalize(_), do: ""

  def confident?(nil), do: true

  def confident?(value) when is_number(value), do: value >= @low_confidence

  def confident?(_), do: true

  def record(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    text = attrs["text"] || attrs[:text] || ""

    if confident?(attrs["confidence"] || attrs[:confidence]) do
      ConversationAlignment.record_voice_utterance(conversation_id, %{
        "speaker_user_id" => attrs["speaker_user_id"] || attrs[:speaker_user_id],
        "text" => text,
        "normalized" => normalize(text),
        "call_id" => attrs["call_id"] || attrs[:call_id],
        "source_segment_id" => attrs["source_segment_id"] || attrs[:source_segment_id],
        "confidence" => attrs["confidence"] || attrs[:confidence]
      })
    else
      {:ok, :low_confidence}
    end
  end
end
