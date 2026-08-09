defmodule OpalCore.SocialFlow.RealWorld.GroupFit do
  @moduledoc """
  Group real-world fit beyond simple intersection.

  Optimizes toward viable agreement, not mathematical perfection.
  """

  alias OpalCore.SocialFlow.AsymmetricParticipation
  alias OpalCore.SocialFlow.RealWorld.Proximity.TravelBurden

  @doc """
  Evaluate whether a group plan candidate is viable.
  """
  def viable?(attrs) when is_map(attrs) do
    a = stringify(attrs)
    participants = List.wrap(a["participants"] || [])
    required = List.wrap(a["required_user_ids"] || [])
    optional = List.wrap(a["optional_user_ids"] || [])
    engagements = Enum.map(participants, &engagement/1)

    can_proceed = AsymmetricParticipation.can_proceed?(engagements, agreement_policy: a["policy"] || "majority_or_organizer")

    required_ok =
      Enum.all?(required, fn id ->
        Enum.any?(participants, fn p ->
          user_id(p) == id and engagement(p) not in ~w(unwilling declined)
        end)
      end)

    travels = a["travels"] || %{}
    burden = if map_size(stringify_map(travels)) > 0, do: TravelBurden.score(travels), else: 0.0
    burden_ok = burden < 80.0

    %{
      "viable" => can_proceed and required_ok and burden_ok,
      "can_proceed_participation" => can_proceed,
      "required_ok" => required_ok,
      "burden_score_internal" => burden,
      "optional_count" => length(optional),
      "shame_holdout" => false,
      "authorizes_set" => false
    }
  end

  def viable?(_), do: %{"viable" => false}

  defp engagement(%{"engagement" => e}) when is_binary(e), do: e
  defp engagement(%{engagement: e}) when is_binary(e), do: e
  defp engagement(e) when is_binary(e), do: e
  defp engagement(_), do: "silent"

  defp user_id(%{"user_id" => id}), do: id
  defp user_id(%{user_id: id}), do: id
  defp user_id(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_map(map) when is_map(map), do: stringify(map)
  defp stringify_map(_), do: %{}
end
