defmodule OpalCore.SocialFlow.Ambient.Convergence do
  @moduledoc """
  Detect meaningful convergence — "this got easy" — not content volume.

  Before: many unknowns. After: few unknowns + viable opening + optional world fit.
  Does not expose a metric. Does not create visual primitives.
  """

  alias OpalCore.SocialFlow.Ambient.Actionability
  alias OpalCore.SocialFlow.Ambient.Momentum

  @doc """
  Detect if uncertainty collapsed enough for a proactive moment.

  attrs may include unknowns_before, current actionability attrs, opening exists.
  """
  def detect(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, action} <- Actionability.classify(a),
         {:ok, mom} <-
           Momentum.assess(%{
             "unknown_count" => action["unknown_count"],
             "unknowns_before" => a["unknowns_before"] || action["unknown_count"] + 4,
             "in_count" => a["in_count"] || length(List.wrap(a["viable_participant_ids"])),
             "viable" => a["social_opening"] == true or a["viable"] == true,
             "actionable" => action["actionable"],
             "density" => a["density"] || 0.5
           }) do
      collapsed? = mom["this_got_easy"] == true or Actionability.unknowns_collapsed?(a, 2)

      # Volume of candidates alone is NOT convergence
      volume_only? =
        to_i(a["candidate_count"]) > 5 and action["unknown_count"] > 3

      deserves? =
        collapsed? and not volume_only? and a["trust_ok"] != false and
          (action["deserves_attention"] or mom["this_got_easy"])

      {:ok,
       %{
         "converged" => deserves?,
         "this_got_easy" => mom["this_got_easy"],
         "unknowns_collapsed" => mom["unknowns_collapsed"],
         "volume_only_rejected" => volume_only?,
         "semantic_trigger" =>
           if(deserves?,
             do: "convergence_event",
             else: nil
           ),
         # Existing UI may listen; we do not create Motion/CSS
         "creates_visual_primitive" => false,
         "authorizes_set" => false,
         "private" => true
       }}
    end
  end

  def detect(_), do: {:ok, %{"converged" => false}}

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
