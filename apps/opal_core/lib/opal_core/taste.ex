defmodule OpalCore.Taste do
  @moduledoc """
  Phase OC-2 — thin taste profile read for Opal context assembly.

  Reads durable preference memory only. Never invents vibes/cuisines/price.
  """

  alias OpalCore.SocialFlow.DurablePreferenceMemory

  @doc """
  Returns `%{vibes: [...], cuisines: [...], price_comfort: string | nil}` or `nil`
  when the user has no durable taste rows at all.
  """
  def profile_for(user_id) when is_binary(user_id) do
    memories = DurablePreferenceMemory.list_for_owners([user_id])

    if memories == [] do
      nil
    else
      {vibes, cuisines, price} =
        Enum.reduce(memories, {[], [], nil}, fn m, {vs, cs, price} ->
          summary = m.summary || ""

          cond do
            match = Regex.run(~r/^taste:vibe:(.+)$/i, summary) ->
              {[Enum.at(match, 1) | vs], cs, price}

            match = Regex.run(~r/^taste:cuisine:(.+)$/i, summary) ->
              {vs, [Enum.at(match, 1) | cs], price}

            match = Regex.run(~r/^taste:price:(.+)$/i, summary) ->
              {vs, cs, price || Enum.at(match, 1)}

            purpose_vibe?(m.purpose) and String.trim(summary) != "" ->
              {[String.trim(summary) | vs], cs, price}

            purpose_food?(m.purpose) and String.trim(summary) != "" ->
              {vs, [String.trim(summary) | cs], price}

            true ->
              {vs, cs, price}
          end
        end)

      %{
        vibes: vibes |> Enum.reverse() |> Enum.uniq() |> Enum.take(5),
        cuisines: cuisines |> Enum.reverse() |> Enum.uniq() |> Enum.take(5),
        price_comfort: price
      }
    end
  end

  def profile_for(_), do: nil

  defp purpose_vibe?(purpose) when is_binary(purpose),
    do: String.contains?(purpose, "place_vibe")

  defp purpose_vibe?(_), do: false

  defp purpose_food?(purpose) when is_binary(purpose),
    do: String.contains?(purpose, "food_preference")

  defp purpose_food?(_), do: false
end
