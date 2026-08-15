defmodule OpalCore.SocialFlow.ExperiencePropagation do
  @moduledoc """
  Experience propagation across the social network (Pass 23 add-on).

  Tracks structural generations:

  Creator A Moment
  → Follower B Reality → B Experience → B Moment
  → Follower C Reality → C Experience

  This is EXPERIENCE PROPAGATION — not share count, not MLM recruitment.

  Different from recruitment: no reward for recruiting people.
  Network depth = experience generations, not downline levels.
  """

  alias OpalCore.SocialFlow.ExperienceGraph

  @doc """
  Record one hop of propagation and return generation metrics.

  steps: list of maps with keys:
  - moment_id, author_user_id
  - reality_id, actor_user_id
  - experience_id (optional)
  - generation (0 = origin creator)
  """
  def record_chain(steps) when is_list(steps) do
    {graph, edges} =
      Enum.reduce(Enum.with_index(steps), {ExperienceGraph.new(), []}, fn {step, idx}, {g, acc} ->
        s = stringify(step)
        gen = s["generation"] || idx
        moment_id = s["moment_id"]
        reality_id = s["reality_id"]
        experience_id = s["experience_id"] || (if reality_id, do: "exp-#{reality_id}", else: nil)

        g =
          if moment_id && reality_id do
            case ExperienceGraph.link_moment_to_reality(g, moment_id, reality_id, %{
                   "generation" => gen,
                   "actor" => s["actor_user_id"],
                   "author" => s["author_user_id"]
                 }) do
              {:ok, g2} -> g2
              _ -> g
            end
          else
            g
          end

        g =
          if reality_id && experience_id do
            case ExperienceGraph.link_reality_to_experience(g, reality_id, experience_id, %{
                   "generation" => gen
                 }) do
              {:ok, g2} -> g2
              _ -> g
            end
          else
            g
          end

        # Next moment from experience if provided
        next_moment = s["captured_moment_id"]

        g =
          if experience_id && next_moment do
            case ExperienceGraph.link_experience_to_moment(g, experience_id, next_moment, %{
                   "generation" => gen
                 }) do
              {:ok, g2} -> g2
              _ -> g
            end
          else
            g
          end

        edge = %{
          "generation" => gen,
          "moment_id" => moment_id,
          "reality_id" => reality_id,
          "experience_id" => experience_id,
          "author_user_id" => s["author_user_id"],
          "actor_user_id" => s["actor_user_id"]
        }

        {g, acc ++ [edge]}
      end)

    %{
      "kind" => "experience_propagation",
      "schema" => "experience_propagation.v1",
      "generations" => length(edges),
      "max_generation" => edges |> Enum.map(& &1["generation"]) |> Enum.max(fn -> 0 end),
      "chain" => edges,
      "experience_graph" => graph,
      "not_share_count" => true,
      "not_mlm" => true,
      "not_recruitment" => true,
      "recruitment_reward" => false,
      "metric" => "experience_generations",
      "is_payout" => false
    }
  end

  def record_chain(_), do: %{"generations" => 0, "not_mlm" => true}

  @doc "Diagnostic metrics — not engagement vanity."
  def network_metrics(propagation) when is_map(propagation) do
    p = stringify(propagation)

    %{
      "experience_generations" => p["generations"] || p["max_generation"] || 0,
      "not_views" => true,
      "not_follower_count" => true,
      "not_recruitment_levels" => true,
      "inspired_experiences" => p["generations"] || 0,
      "north_star_candidate" => "real_experiences_created_per_moment",
      "is_payout" => false
    }
  end

  def network_metrics(_), do: %{"experience_generations" => 0}

  def recruitment_rewarded?, do: false

  def is_mlm?, do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
