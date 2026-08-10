defmodule OpalCore.SocialFlow.Ambient.CapacityGap do
  @moduledoc """
  Provider capacity vs social participation.

  Do NOT silently drop participants when capacity < in_count.
  Creates an unresolved gap for MinimumQuestion.
  """

  @doc """
  Evaluate capacity against current in-count.

  Returns gap kind if humans must choose (smaller group vs different place).
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    capacity = to_i(a["capacity"] || a["provider_capacity"] || a["seats"])
    in_count = to_i(a["in_count"] || length(List.wrap(a["in_ids"])))
    set? = a["set"] == true

    cond do
      capacity <= 0 ->
        {:ok,
         %{
           "ok" => false,
           "gap" => :capacity_unknown_or_zero,
           "hard" => false,
           "silently_dropped" => false,
           "minimum_question" => nil,
           "social_set_intact" => set?,
           "execution_ready" => false
         }}

      in_count > capacity ->
        {:ok,
         %{
           "ok" => false,
           "gap" => :capacity_overflow,
           "hard" => true,
           "in_count" => in_count,
           "capacity" => capacity,
           "silently_dropped" => false,
           "minimum_question" => "different_place_or_smaller_group",
           "shared_safe_copy" => "That place may not fit the whole group.",
           "social_set_intact" => set?,
           "execution_ready" => false,
           "authorizes_set" => false
         }}

      true ->
        {:ok,
         %{
           "ok" => true,
           "gap" => :none,
           "in_count" => in_count,
           "capacity" => capacity,
           "silently_dropped" => false,
           "execution_ready" => set?,
           "authorizes_set" => false
         }}
    end
  end

  def evaluate(_), do: {:ok, %{"ok" => true, "gap" => :none}}

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
