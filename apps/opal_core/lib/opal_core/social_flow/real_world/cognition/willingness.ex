defmodule OpalCore.SocialFlow.RealWorld.Cognition.Willingness do
  @moduledoc """
  Separates **technically free** from **socially willing**.

  A blank calendar does not mean someone wants to go on a date.
  Prevents creepy/socially wrong recommendations.

  free?  — calendar/manual availability capacity
  willing? — social/intent willingness signal
  """

  @willingness_levels ~w(unknown unwilling soft_yes willing explicit_yes)

  def levels, do: @willingness_levels

  @doc """
  Compose capacity + willingness into coordination readiness.

  Returns map:
  - free
  - willing
  - ready_to_propose  (both sufficiently true)
  - reason
  """
  def readiness(attrs) when is_map(attrs) do
    a = stringify(attrs)
    free? = truthy?(a["free"]) or truthy?(a["technically_free"])
    level = normalize_level(a["willingness"] || a["willingness_level"])

    willing? = level in ~w(soft_yes willing explicit_yes)

    cond do
      not free? and not willing? ->
        pack(false, level, false, "not_free_not_willing")

      not free? ->
        pack(false, level, false, "willing_but_not_free")

      not willing? and level == "unwilling" ->
        pack(true, level, false, "free_but_unwilling")

      not willing? ->
        # free but unknown willingness — may soft-probe, not hard-propose social date
        pack(true, level, false, "free_willingness_unknown")

      true ->
        pack(true, level, true, "free_and_willing")
    end
  end

  def readiness(_), do: pack(false, "unknown", false, "invalid")

  @doc "Bounded classifier from natural language (not authority)."
  def classify_text(text) when is_binary(text) do
    t = String.downcase(String.trim(text))

    cond do
      t == "" ->
        "unknown"

      String.contains?(t, "can't") or String.contains?(t, "cannot") or
        String.contains?(t, "not interested") or String.contains?(t, "no thanks") ->
        "unwilling"

      String.contains?(t, "would love") or String.contains?(t, "let's do") or
        String.contains?(t, "i'm in") or String.contains?(t, "count me in") ->
        "explicit_yes"

      String.contains?(t, "sounds good") or String.contains?(t, "down") or
        String.contains?(t, "works for me") or String.contains?(t, "yes") ->
        "willing"

      String.contains?(t, "maybe") or String.contains?(t, "might") or
          String.contains?(t, "not sure") ->
        "soft_yes"

      true ->
        "unknown"
    end
  end

  def classify_text(_), do: "unknown"

  defp pack(free, level, ready, reason) do
    %{
      "free" => free,
      "willingness" => level,
      "willing" => level in ~w(soft_yes willing explicit_yes),
      "ready_to_propose" => ready,
      "reason" => reason,
      "authorizes_set" => false
    }
  end

  defp normalize_level(l) when is_binary(l) and l in @willingness_levels, do: l
  defp normalize_level(_), do: "unknown"

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
