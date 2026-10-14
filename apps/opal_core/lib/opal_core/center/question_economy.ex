defmodule OpalCore.Center.QuestionEconomy do
  @moduledoc """
  Elixir authority gate for Minimum Question Engine + Question Economy Law.

  Python may propose questions; only Elixir decides to surface one.
  One question max. Prefer safe assumptions over interrogation.
  """

  @type assumption_class :: :safe | :soft | :consequential

  @doc """
  Decide whether to ask, soft-assume, or proceed.

  Returns:
  - `{:proceed, planning}`
  - `{:soft_assume, planning, soft_copy}`
  - `{:ask, planning, question}` — at most one question
  - `{:block, planning, reason}` — consequential without authority
  """
  def decide(planning, opts \\ []) when is_map(planning) do
    c = stringify(planning)
    proposed = Keyword.get(opts, :proposed_question)
    action = Keyword.get(opts, :pending_action)
    known = known_slots(c)

    cond do
      # Consequential actions need authority or confirmation.
      consequential_action?(action) and not standing_authority?(c, action) ->
        {:block, c, :need_authority}

      # Already know the thing a proposed question would ask.
      is_binary(proposed) and question_already_answered?(proposed, known) ->
        {:proceed, c}

      # Safe temporal defaults.
      is_binary(c["when"]) and is_nil(c["when_resolved"]) ->
        resolved = OpalCore.Center.PlanningContext.resolve_when(c["when"])
        soft = Map.put(c, "when_resolved", resolved)
        {:proceed, soft}

      # Soft dinner time if restaurant intent and no clock.
      restaurant?(c) and is_nil(c["when_time"]) and is_binary(c["when"]) ->
        soft = Map.put(c, "when_time", "19:30")
        {:soft_assume, soft, "I'll aim for around 7:30 unless you want later."}

      # Only ask if proposed and consequential gap remains.
      is_binary(proposed) and proposed != "" and material_gap?(c) ->
        {:ask, c, single_question(proposed)}

      true ->
        {:proceed, c}
    end
  end

  @doc "Classify an assumption for evidence / traces."
  def classify_assumption(kind) when kind in [:safe, :soft, :consequential], do: kind
  def classify_assumption("safe"), do: :safe
  def classify_assumption("soft"), do: :soft
  def classify_assumption("consequential"), do: :consequential
  def classify_assumption(_), do: :soft

  defp known_slots(c) do
    %{
      who: present?(c["who"] || c["primary_person"]),
      when: present?(c["when"]),
      destination: present?(c["destination"]),
      venue: present?(c["venue"]),
      surprise: c["visibility_mode"] == "surprise" or c["surprise"] == true
    }
  end

  defp question_already_answered?(q, known) do
    down = String.downcase(q)

    cond do
      String.contains?(down, "who") and known.who -> true
      String.contains?(down, "when") and known.when -> true
      (String.contains?(down, "where") or String.contains?(down, "destination")) and
          known.destination ->
        true

      true ->
        false
    end
  end

  defp material_gap?(c) do
    # Solo is first-class — who is optional. Ask only for destination/when gaps.
    restaurant?(c) and
      (not present?(c["destination"]) or not present?(c["when"]))
  end

  defp restaurant?(c) do
    c["wants_restaurant"] == true or c["category"] in ["restaurant", "dinner", "food"]
  end

  defp consequential_action?(a) when a in [:pto_submit, :calendar_write, :pay, :reveal_surprise, :message_as_user],
    do: true

  defp consequential_action?(a) when a in ["pto_submit", "calendar_write", "pay", "reveal_surprise", "message_as_user"],
    do: true

  defp consequential_action?(_), do: false

  defp standing_authority?(c, action) do
    grants = c["standing_grants"] || []
    action_s = to_string(action)
    is_list(grants) and Enum.any?(grants, &(&1 == action_s or &1["capability"] == action_s))
  end

  defp single_question(q) when is_binary(q) do
    q
    |> String.trim()
    |> String.split(~r/[?\n]/)
    |> List.first()
    |> Kernel.<>("?")
  end

  defp present?(v) when is_binary(v), do: String.trim(v) != ""
  defp present?(v) when is_list(v), do: v != []
  defp present?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
