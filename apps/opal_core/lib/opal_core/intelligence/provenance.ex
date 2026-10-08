defmodule OpalCore.Intelligence.Provenance do
  @moduledoc """
  Provenance tags for memory (Paste E Phase 4).

  Values: `:stated` | `:observed` | `:inferred`

  HARD RULE: nudge / proactive / mediation NEVER trigger on `:inferred` alone
  (enforced in AttentionBudget via ref.provenance).
  """

  @values ~w(stated observed inferred)

  def values, do: @values

  def normalize(v) when v in @values, do: v
  def normalize(:stated), do: "stated"
  def normalize(:observed), do: "observed"
  def normalize(:inferred), do: "inferred"
  def normalize(_), do: "observed"

  def tag(prov) do
    case normalize(prov) do
      "stated" -> "[stated]"
      "observed" -> "[observed]"
      "inferred" -> "[inferred]"
    end
  end

  @doc "System instruction: never be proactive on inferred alone."
  def system_instruction do
    "Provenance tags: [stated]=user told you; [observed]=seen in behavior; [inferred]=guess. Never start proactive outreach or nudges based on [inferred] alone — confirm first."
  end

  def from_fact_entry(entry) when is_map(entry) do
    normalize(entry["provenance"] || entry[:provenance] || "observed")
  end

  def from_fact_entry(_), do: "observed"

  @doc "Annotate a fact value string with provenance tag for prompts."
  def format_fact(key, entry) when is_map(entry) do
    prov = from_fact_entry(entry)
    val = entry["value"] || entry[:value] || inspect(entry)
    "#{tag(prov)} #{key}=#{val}"
  end

  def format_fact(key, other), do: "[observed] #{key}=#{inspect(other)}"
end
