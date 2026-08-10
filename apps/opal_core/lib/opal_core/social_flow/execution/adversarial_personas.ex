defmodule OpalCore.SocialFlow.Execution.AdversarialPersonas do
  @moduledoc """
  Operational synthetic behavior profiles — not stereotypes.

  Labels describe participation patterns only.
  Never: lazy / flaky / cheap / difficult.
  """

  @personas ~w(
    high_planning_participation
    low_planning_participation
    fast_responder
    delayed_responder
    concrete_choice_responder
    open_ended_responder
    organizer
    non_organizer
    late_joiner
    frequent_maybe
    spontaneous
    plan_ahead
    low_data_new_user
    mature_opal_user
  )

  @relationship_types ~w(
    courtship
    close_friends
    casual_friends
    friend_group
    family_like
    coworker_social
    new_relationship
    mature_relationship
  )

  def personas, do: @personas
  def relationship_types, do: @relationship_types

  @doc "Behavior traits for a persona id (privacy-safe, no moral labels)."
  def profile(id) when is_binary(id) or is_atom(id) do
    id = to_string(id)

    base = %{
      "persona" => id,
      "planning_labor" => "medium",
      "response_latency" => "medium",
      "choice_style" => "mixed",
      "organizes" => false,
      "join_timing" => "on_time",
      "maybe_rate" => "low",
      "horizon" => "mixed",
      "opal_maturity" => "new",
      "data_density" => "medium"
    }

    Map.merge(base, traits(id))
  end

  def profile(_), do: profile("open_ended_responder")

  @doc "Pair personas into a relationship context."
  def dyad(a, b, relationship_type) do
    %{
      "a" => profile(a),
      "b" => profile(b),
      "relationship_type" => normalize_rel(relationship_type),
      "same_user_cross_rel_isolation" => true
    }
  end

  @doc "Build N participant profiles with maturity fraction."
  def group(n, maturity_frac, opts \\ []) when is_integer(n) and n >= 2 do
    organizer_idx = Keyword.get(opts, :organizer_idx, 1)
    mature_count = trunc(Float.round(n * maturity_frac))

    for i <- 1..n do
      mature? = i <= mature_count

      persona =
        cond do
          i == organizer_idx -> "organizer"
          mature? -> "mature_opal_user"
          rem(i, 5) == 0 -> "late_joiner"
          rem(i, 4) == 0 -> "frequent_maybe"
          rem(i, 3) == 0 -> "low_planning_participation"
          true -> "concrete_choice_responder"
        end

      profile(persona)
      |> Map.put("user_id", "u#{i}")
      |> Map.put("mature", mature?)
      |> Map.put("required", i <= Keyword.get(opts, :required_count, 0))
      |> Map.put("optional", i > Keyword.get(opts, :required_count, 0))
    end
  end

  defp traits("high_planning_participation"),
    do: %{"planning_labor" => "high", "horizon" => "plan_ahead"}

  defp traits("low_planning_participation"),
    do: %{"planning_labor" => "low", "choice_style" => "minimal_authority"}

  defp traits("fast_responder"), do: %{"response_latency" => "fast"}
  defp traits("delayed_responder"), do: %{"response_latency" => "delayed"}
  defp traits("concrete_choice_responder"), do: %{"choice_style" => "concrete"}
  defp traits("open_ended_responder"), do: %{"choice_style" => "open_ended"}
  defp traits("organizer"), do: %{"organizes" => true, "planning_labor" => "high"}
  defp traits("non_organizer"), do: %{"organizes" => false, "planning_labor" => "low"}
  defp traits("late_joiner"), do: %{"join_timing" => "late"}
  defp traits("frequent_maybe"), do: %{"maybe_rate" => "high", "choice_style" => "weak_evidence"}
  defp traits("spontaneous"), do: %{"horizon" => "spontaneous"}
  defp traits("plan_ahead"), do: %{"horizon" => "plan_ahead"}

  defp traits("low_data_new_user"),
    do: %{"opal_maturity" => "new", "data_density" => "low", "planning_labor" => "low"}

  defp traits("mature_opal_user"),
    do: %{"opal_maturity" => "mature", "data_density" => "high"}

  defp traits(_), do: %{}

  defp normalize_rel(t) when is_binary(t) or is_atom(t) do
    s = to_string(t)
    if s in @relationship_types, do: s, else: "casual_friends"
  end
end
