defmodule OpalCore.SocialFlow.DynamicIntelligence.PythonProposal do
  @moduledoc """
  Validates Python collective-fit proposals. Python never publishes directly.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.{Audience, CollectiveFit}

  @doc """
  Accept a Python proposal only if structure is valid and private fields are absent.
  """
  def validate_and_admit(proposal, venues, participants, time_window)
      when is_map(proposal) do
    proposal = stringify(proposal)
    result_type = proposal["result_type"]

    cond do
      result_type == "no_insight" ->
        {:ok, :no_proposal}

      result_type != "collective_fit_ranking" ->
        {:error, :unsupported_result_type}

      true ->
        ranking = proposal["collective_fit_ranking"] || %{}
        ranked_ids = ranking["ranked_candidate_ids"] || []

        if length(ranked_ids) > CollectiveFit.max_options() do
          {:error, :too_many_options}
        else
          admit_ranked(ranked_ids, ranking, venues, participants, time_window)
        end
    end
  end

  def validate_and_admit(nil, _, _, _), do: {:ok, :no_proposal}
  def validate_and_admit(_, _, _, _), do: {:error, :invalid_proposal}

  defp admit_ranked(ranked_ids, ranking, venues, participants, time_window) do
    venue_by_id =
      venues
      |> Enum.map(&stringify/1)
      |> Map.new(&{&1["id"], &1})

    hard = CollectiveFit.aggregate_hard_constraints(participants, time_window)
    soft = CollectiveFit.aggregate_soft_preferences(participants)

    explanations = ranking["explanations"] || []

    admitted =
      ranked_ids
      |> Enum.reduce_while([], fn id, acc ->
        case Map.get(venue_by_id, id) do
          nil ->
            {:halt, {:error, :unknown_candidate}}

          venue ->
            if CollectiveFit.hard_pass?(venue, hard) do
              exp =
                explanations
                |> Enum.find(fn e -> stringify(e)["candidate_id"] == id end)
                |> case do
                  nil -> CollectiveFit.group_safe_explanation(venue, hard, soft)
                  e -> Audience.sanitize_explanation(stringify(e)["text"])
                end

              opt = %{
                "id" => venue["id"],
                "display_name" => venue["display_name"],
                "hard_constraints_satisfied" => true,
                "group_safe_explanation" => exp
              }

              case Audience.validate_shared_payload(%{"explanation" => exp}) do
                :ok -> {:cont, acc ++ [opt]}
                {:error, _} -> {:halt, {:error, :private_leak_in_explanation}}
              end
            else
              # Drop candidates that fail Elixir hard constraints.
              {:cont, acc}
            end
        end
      end)

    case admitted do
      {:error, _} = err ->
        err

      options when is_list(options) ->
        options = Enum.take(options, CollectiveFit.max_options())
        {:ok, {options, List.first(options)}}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v) when is_list(v), do: Enum.map(v, &stringify_value/1)
  defp stringify_value(v), do: v
end
