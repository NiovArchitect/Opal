defmodule OpalCore.SocialFlow.Execution.MemoryScope do
  @moduledoc """
  Memory scope — do not overgeneralize.

  user | relationship | conversation | group | plan | activity_type | zone | time_horizon

  Relationship-scoped prefs do not leak across relationships.
  Plan-scoped truths expire with the plan.
  """

  @scopes ~w(user relationship conversation group plan activity_type zone time_horizon)

  def scopes, do: @scopes

  def normalize(s) when s in @scopes, do: s
  def normalize("personal"), do: "user"
  def normalize("counterpart"), do: "relationship"
  def normalize("experience_type"), do: "activity_type"
  def normalize("area"), do: "zone"
  def normalize(_), do: "plan"

  @doc "Build scope identity for storage/retrieval."
  def identity(attrs) when is_map(attrs) do
    a = stringify(attrs)
    scope = normalize(a["scope"] || a["scope_kind"] || "plan")
    id = scope_id_for(scope, a)

    %{
      "scope" => scope,
      "scope_id" => id && to_string(id),
      "owner_user_id" => a["owner_user_id"] || a["user_id"],
      "relationship_id" => a["relationship_id"] || pair_key(a),
      "conversation_id" => a["conversation_id"],
      "plan_id" => a["plan_id"],
      "group_id" => a["group_id"] || a["participant_set_key"],
      "activity_type" => a["activity_type"] || a["plan_type"],
      "zone" => a["zone"] || a["area"]
    }
  end

  def identity(_), do: %{"scope" => "plan", "scope_id" => nil}

  @doc "May this memory be used in the current alignment context?"
  def applicable?(memory, context) when is_map(memory) and is_map(context) do
    m = stringify(memory)
    c = stringify(context)

    cond do
      inactive?(m) -> false
      owner_blocked?(m, c) -> false
      true -> scope_matches?(normalize(m["scope"] || "plan"), m, c)
    end
  end

  def applicable?(_, _), do: false

  @doc "Narrow interpretation helper — correction dimensions stay narrow."
  def narrow_dimension(text) when is_binary(text) do
    t = String.downcase(text)

    cond do
      contains_any?(t, ~w(loud noisy)) -> "noise_level"
      contains_any?(t, ~w(expensive pricey)) -> "cost"
      contains_any?(t, ~w(drive far oceanside)) -> "travel_burden"
      String.contains?(t, "casual") -> "formality"
      String.contains?(t, "parking") -> "parking"
      contains_any?(t, ~w(thursday evening)) -> "timing"
      String.contains?(t, "never again") -> "hard_avoid"
      true -> "generic_preference"
    end
  end

  def narrow_dimension(_), do: "generic_preference"

  defp scope_id_for("user", a), do: a["user_id"] || a["owner_user_id"]
  defp scope_id_for("relationship", a), do: a["relationship_id"] || pair_key(a)
  defp scope_id_for("conversation", a), do: a["conversation_id"]
  defp scope_id_for("group", a), do: a["group_id"] || a["participant_set_key"]
  defp scope_id_for("plan", a), do: a["plan_id"] || a["commitment_id"]

  defp scope_id_for("activity_type", a),
    do: a["activity_type"] || a["plan_type"] || a["experience_type"]

  defp scope_id_for("zone", a), do: a["zone"] || a["area"] || a["city"]
  defp scope_id_for("time_horizon", a), do: a["time_horizon"] || "default"
  defp scope_id_for(_, a), do: a["scope_id"]

  defp inactive?(m),
    do: m["revoked"] == true or m["forgotten"] == true or m["superseded"] == true

  defp owner_blocked?(m, c) do
    m["owner_user_id"] && c["owner_user_id"] && m["owner_user_id"] != c["owner_user_id"] and
      m["visibility"] != "shared_safe"
  end

  defp scope_matches?("relationship", m, c),
    do: same_id?(m["scope_id"] || m["relationship_id"], c["relationship_id"] || pair_key(c))

  defp scope_matches?("conversation", m, c),
    do: same_id?(m["scope_id"] || m["conversation_id"], c["conversation_id"])

  defp scope_matches?("plan", m, c),
    do: same_id?(m["scope_id"] || m["plan_id"], c["plan_id"]) or c["include_plan_history"] == true

  defp scope_matches?("group", m, c), do: group_applicable?(m, c)

  defp scope_matches?("activity_type", m, c) do
    same_id?(m["scope_id"] || m["activity_type"], c["plan_type"] || c["activity_type"]) or
      c["activity_type"] in [nil, ""]
  end

  defp scope_matches?("zone", _, _), do: true
  defp scope_matches?("user", _, _), do: true
  defp scope_matches?(_, _, _), do: true

  defp group_applicable?(m, c) do
    same_id?(m["scope_id"] || m["group_id"], c["group_id"] || c["participant_set_key"]) and
      c["group_composition_changed"] != true
  end

  defp pair_key(a) do
    owner = a["owner_user_id"] || a["user_id"]
    other = a["counterpart_user_id"] || a["peer_user_id"]

    if owner && other do
      [owner, other] |> Enum.map(&to_string/1) |> Enum.sort() |> Enum.join("|")
    end
  end

  defp same_id?(nil, _), do: false
  defp same_id?(_, nil), do: false
  defp same_id?(a, b), do: to_string(a) == to_string(b)

  defp contains_any?(t, words), do: Enum.any?(words, &String.contains?(t, &1))

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
