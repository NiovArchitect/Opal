defmodule OpalCore.SocialFlow.Ambient.HardConstraints do
  @moduledoc """
  Hard constraints cannot be majority-voted away.

  Safety / accessibility / legal age / capacity impossibility block viability
  even if numeric majority wants the plan.

  Soft preferences (ambience, novelty) never appear here.
  """

  @hard_kinds ~w(
    accessibility_missing
    age_restriction
    capacity_impossible
    safety_block
    legal_block
  )

  def hard_kinds, do: @hard_kinds

  @doc """
  Evaluate hard constraints against a plan candidate.

  attrs:
  - hard_constraints: list of %{kind, participant_id?, blocks_plan?}
  - or failed_hard: list of kind strings already known failed
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    failed =
      a
      |> collect_failures()
      |> Enum.uniq()

    blocks? = failed != []

    {:ok,
     %{
       "hard_ok" => not blocks?,
       "failed" => failed,
       "majority_cannot_override" => true,
       "soft_preferences_excluded" => true,
       "authorizes_set" => false,
       "shared_safe" =>
         if(blocks?,
           do: %{
             "shared_safe" => true,
             "benefit_copy" => "This option may not work for everyone.",
             "no_medical_detail" => true,
             "no_names" => true
           },
           else: nil
         )
     }}
  end

  def evaluate(_), do: {:ok, %{"hard_ok" => true, "failed" => []}}

  @doc "Apply hard gate to a viability map."
  def apply_to_viability(viability, hard) when is_map(viability) and is_map(hard) do
    v = stringify(viability)
    h = stringify(hard)

    if h["hard_ok"] == false do
      v
      |> Map.put("viable", false)
      |> Map.put("hard_constraint_block", true)
      |> Map.put("hard_failed", h["failed"] || [])
      |> Map.put("optional_veto", false)
      |> Map.put("majority_override_hard", false)
    else
      v
      |> Map.put("hard_constraint_block", false)
      |> Map.put("hard_failed", [])
    end
  end

  defp collect_failures(a) do
    from_list =
      List.wrap(a["failed_hard"] || a["hard_failures"])
      |> Enum.map(&to_string/1)
      |> Enum.filter(&(&1 in @hard_kinds))

    from_structs =
      List.wrap(a["hard_constraints"])
      |> Enum.flat_map(fn c ->
        c = if is_map(c), do: stringify(c), else: %{"kind" => to_string(c)}
        kind = c["kind"] || c["type"]

        blocked =
          c["blocks_plan"] != false and c["satisfied"] != true and c["ok"] != true

        if is_binary(kind) and kind in @hard_kinds and blocked, do: [kind], else: []
      end)

    from_list ++ from_structs
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
