defmodule OpalCore.SocialFlow.Ambient.TrustFact do
  @moduledoc """
  Trust = authority × freshness × scope (principle, not a public score).

  A fact only influences decisions when authoritative enough, fresh enough,
  and within intended scope. High confidence can still be stale.
  """

  alias OpalCore.SocialFlow.Ambient.Freshness

  @authority %{
    "native_commitment" => 1.0,
    "explicit_willingness" => 0.95,
    "provider_inventory" => 0.85,
    "current_location" => 0.8,
    "conversation_evidence" => 0.7,
    "inferred_preference" => 0.4,
    "popularity" => 0.25
  }

  @doc """
  Evaluate whether a fact may influence a decision.

  attrs: source_class, observed_at, scope (plan_id/conversation_id),
  active_plan_id, active_conversation_id, authority_override, lifecycle_active
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    class = a["source_class"] || a["kind"] || "conversation_evidence"
    auth = a["authority"] || Map.get(@authority, class, 0.5)

    {:ok, fresh} = Freshness.confidence(a)
    scope_ok? = scope_matches?(a)
    superseded? = a["superseded"] == true
    past_useful? = a["window_ended"] == true

    usable? =
      not superseded? and not past_useful? and scope_ok? and fresh["usable"] and auth >= 0.35

    {:ok,
     %{
       "source_class" => class,
       "authority" => auth,
       "freshness" => fresh["confidence"],
       "scope_ok" => scope_ok?,
       "usable" => usable?,
       "stale" => fresh["stale"],
       "superseded" => superseded?,
       "high_confidence_but_stale" => auth >= 0.8 and fresh["stale"],
       "may_influence" => usable?,
       "must_not_surface_from" => not usable?,
       "private" => true
     }}
  end

  def evaluate(_), do: {:ok, %{"usable" => false, "may_influence" => false}}

  @doc "Apply explicit correction supersession."
  def supersede(old_fact, correction) when is_map(old_fact) and is_map(correction) do
    o = stringify(old_fact)
    c = stringify(correction)

    {:ok,
     %{
       "active" =>
         Map.merge(c, %{
           "supersedes" => o["id"],
           "superseded" => false,
           "observed_at" =>
             c["observed_at"] || DateTime.utc_now() |> DateTime.truncate(:microsecond)
         }),
       "retired" => Map.put(o, "superseded", true),
       "active_uses_current_only" => true
     }}
  end

  defp scope_matches?(a) do
    plan = a["scope_plan_id"] || a["plan_id"]
    conv = a["scope_conversation_id"] || a["conversation_id"]
    active_plan = a["active_plan_id"]
    active_conv = a["active_conversation_id"]

    plan_ok = is_nil(active_plan) or is_nil(plan) or plan == active_plan
    conv_ok = is_nil(active_conv) or is_nil(conv) or conv == active_conv
    plan_ok and conv_ok
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
