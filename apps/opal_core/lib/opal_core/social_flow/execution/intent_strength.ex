defmodule OpalCore.SocialFlow.Execution.IntentStrength do
  @moduledoc """
  Differentiate conversation intent strength — drives how much proactive work is justified.

  casual_mention < should_sometime < active_desire < forming_plan < strong_commitment

  Weaker intent → less world/provider work.
  Recent intent decays via Freshness (conversation_evidence / explicit_willingness).
  """

  alias OpalCore.SocialFlow.Ambient.Freshness

  @levels ~w(none casual_mention should_sometime active_desire forming_plan strong_commitment)

  def levels, do: @levels

  @doc """
  Classify intent and whether proactive world work is justified.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    raw = a["intent_strength"] || a["intent"] || infer(a)
    level = normalize(raw)
    now = a["now"] || DateTime.utc_now()

    {:ok, fresh} =
      Freshness.confidence(%{
        "source_class" => intent_freshness_class(level),
        "observed_at" => a["intent_observed_at"] || a["last_intent_at"] || a["observed_at"],
        "now" => now,
        "lifecycle_active" => a["set"] == true or level in ~w(forming_plan strong_commitment)
      })

    # Stale casual/"sometime" must not drive opportunity work
    effective =
      cond do
        level in ~w(casual_mention should_sometime) and fresh["stale"] == true ->
          "none"

        level in ~w(casual_mention should_sometime) and fresh["usable"] != true ->
          "none"

        true ->
          level
      end

    %{
      "intent_strength" => effective,
      "raw_intent_strength" => level,
      "freshness" => fresh,
      "proactive_world_ok" => world_ok?(effective),
      "proactive_live_provider_ok" => live_ok?(effective, a),
      "proactive_prepare_ok" => prepare_ok?(effective),
      "authorizes_set" => false,
      "private" => true
    }
  end

  def assess(_),
    do: %{
      "intent_strength" => "none",
      "proactive_world_ok" => false,
      "proactive_prepare_ok" => false
    }

  defp infer(a) do
    cond do
      a["set"] == true or a["strong_commitment"] == true ->
        "strong_commitment"

      a["forming"] == true or a["plan_forming"] == true or a["socially_aligned"] == true ->
        "forming_plan"

      a["active_desire"] == true or a["want_to"] == true ->
        "active_desire"

      a["should_sometime"] == true or a["sometime"] == true ->
        "should_sometime"

      a["casual_mention"] == true or a["mentioned"] == true ->
        "casual_mention"

      a["social_opening"] == true or a["opening_exists"] == true ->
        "active_desire"

      true ->
        "none"
    end
  end

  defp normalize(l) when l in @levels, do: l
  defp normalize("committed"), do: "strong_commitment"
  defp normalize("commitment"), do: "strong_commitment"
  defp normalize("forming"), do: "forming_plan"
  defp normalize("desire"), do: "active_desire"
  defp normalize("sometime"), do: "should_sometime"
  defp normalize("casual"), do: "casual_mention"
  defp normalize(_), do: "none"

  defp intent_freshness_class("strong_commitment"), do: "native_commitment"
  defp intent_freshness_class("forming_plan"), do: "explicit_willingness"
  defp intent_freshness_class("active_desire"), do: "conversation_evidence"
  defp intent_freshness_class("should_sometime"), do: "conversation_evidence"
  defp intent_freshness_class(_), do: "conversation_evidence"

  defp world_ok?(l), do: l in ~w(active_desire forming_plan strong_commitment)
  defp prepare_ok?(l), do: l in ~w(forming_plan strong_commitment active_desire)

  defp live_ok?("strong_commitment", a), do: a["need_live_inventory"] == true or a["set"] == true

  defp live_ok?("forming_plan", a),
    do: a["need_live_inventory"] == true and a["zone_known"] == true

  defp live_ok?(_, _), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
