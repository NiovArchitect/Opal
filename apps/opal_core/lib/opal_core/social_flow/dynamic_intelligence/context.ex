defmodule OpalCore.SocialFlow.DynamicIntelligence.Context do
  @moduledoc """
  Detect forming social contexts from conversation messages.

  Proposals only in spirit: returns confidence, never forces a surface.
  """

  @dinner_terms ~w(dinner restaurant eat food bistro)
  @plan_verbs ~w(should get let's plan friday saturday tonight)

  @doc """
  Classify conversation context for experience opportunities.
  """
  def detect(messages) when is_list(messages) do
    combined =
      messages
      |> Enum.map(&message_body/1)
      |> Enum.join(" ")
      |> String.downcase()

    cond do
      weak_vague_hangout?(combined) ->
        %{
          "kind" => "weak_social",
          "activity" => nil,
          "confidence" => 0.2,
          "forming?" => false,
          "signals" => ["vague_hangout"]
        }

      ordinary_chat?(combined) ->
        %{
          "kind" => "ordinary",
          "activity" => nil,
          "confidence" => 0.05,
          "forming?" => false,
          "signals" => ["ordinary_chat"]
        }

      dinner_forming?(combined) ->
        %{
          "kind" => "dinner_forming",
          "activity" => "dinner",
          "confidence" => dinner_confidence(combined),
          "forming?" => true,
          "signals" => dinner_signals(combined)
        }

      true ->
        %{
          "kind" => "unknown",
          "activity" => nil,
          "confidence" => 0.1,
          "forming?" => false,
          "signals" => []
        }
    end
  end

  def detect(_), do: detect([])

  defp message_body(%{"body" => body}) when is_binary(body), do: body
  defp message_body(%{body: body}) when is_binary(body), do: body
  defp message_body(_), do: ""

  defp dinner_forming?(text) do
    has_dinner = Enum.any?(@dinner_terms, &String.contains?(text, &1))

    has_plan =
      Enum.any?(@plan_verbs, &String.contains?(text, &1)) or String.contains?(text, "we should")

    has_dinner and has_plan
  end

  defp dinner_confidence(text) do
    base = 0.55
    quiet_bonus = if String.contains?(text, "quiet"), do: 0.15, else: 0.0

    time_bonus =
      if String.contains?(text, "7") or String.contains?(text, "friday"), do: 0.15, else: 0.0

    buy_in =
      if String.contains?(text, "might be down") or String.contains?(text, "i can go"),
        do: 0.1,
        else: 0.0

    min(0.95, base + quiet_bonus + time_bonus + buy_in)
  end

  defp dinner_signals(text) do
    []
    |> maybe_signal(String.contains?(text, "dinner"), "dinner_language")
    |> maybe_signal(String.contains?(text, "quiet"), "quiet_preference")
    |> maybe_signal(String.contains?(text, "friday") or String.contains?(text, "7"), "timing")
    |> maybe_signal(
      String.contains?(text, "might be down") or String.contains?(text, "i can go"),
      "soft_buy_in"
    )
  end

  defp maybe_signal(list, true, signal), do: list ++ [signal]
  defp maybe_signal(list, false, _), do: list

  defp weak_vague_hangout?(text) do
    (String.contains?(text, "hang out") or String.contains?(text, "sometime")) and
      not Enum.any?(@dinner_terms, &String.contains?(text, &1))
  end

  defp ordinary_chat?(text) do
    String.contains?(text, "how are you") or
      (String.contains?(text, "long day") and
         not Enum.any?(@dinner_terms, &String.contains?(text, &1)))
  end
end
