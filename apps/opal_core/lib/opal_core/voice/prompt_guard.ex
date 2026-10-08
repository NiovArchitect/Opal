defmodule OpalCore.Voice.PromptGuard do
  @moduledoc """
  Refuse or quote-back TTS text that looks like prompt injection.

  Policy: clear jailbreak / instruction-override patterns → `{:refuse, reason}`.
  Ambiguous instruction-shaped text → `{:quote_back, text}` so the product can
  re-show the exact words for a second explicit approval. Clean user copy → `:ok`.
  """

  @refuse_patterns [
    ~r/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    ~r/disregard\s+(all\s+)?(previous|prior|above)/i,
    ~r/\bsystem\s*prompt\b/i,
    ~r/\byou\s+are\s+now\b.*\b(dan|jailbreak|unrestricted)\b/i,
    ~r/<\s*\/?\s*system\s*>/i,
    ~r/\[\[\s*system\s*\]\]/i
  ]

  @quote_back_patterns [
    ~r/^\s*system\s*:/i,
    ~r/^\s*assistant\s*:/i,
    ~r/\bdo\s+not\s+follow\s+your\s+rules\b/i,
    ~r/\boverride\s+(your|safety)\b/i
  ]

  @doc "Inspect text before TTS. Returns :ok | {:refuse, reason} | {:quote_back, text}."
  def check(text) when is_binary(text) do
    cond do
      Enum.any?(@refuse_patterns, &Regex.match?(&1, text)) ->
        {:refuse, :prompt_injection}

      Enum.any?(@quote_back_patterns, &Regex.match?(&1, text)) ->
        {:quote_back, text}

      true ->
        :ok
    end
  end

  def check(_), do: {:refuse, :invalid_text}
end
