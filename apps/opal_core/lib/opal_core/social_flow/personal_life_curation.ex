defmodule OpalCore.SocialFlow.PersonalLifeCuration do
  @moduledoc """
  Quiet personal life curation for solo / creator modes (Pass 23 add-on).

  Extends PersonalFlow spirit without replacing SharedReality.

  Composes private signals into minimal suggestions:
  calendar gap, location area, preferences, budget fit, past experiences.

  NOT: task manager, calendar dashboard, AI life-coach monologue.
  No fake friend required for solo creator.
  """

  alias OpalCore.SocialFlow.FinancialFit

  @doc """
  Propose at most a few quiet possibilities for a personal Reality.

  context keys (all optional):
  - available_time_label
  - area_label
  - preferences (list)
  - discretionary_budget / estimated_costs
  - energy (low|medium|high)
  - past_place_ids
  - weather_unknown (true until live)
  """
  def suggest(context) when is_map(context) do
    c = stringify(context)
    budget = c["discretionary_budget"] || c["budget"]

    raw_candidates = List.wrap(c["candidates"] || default_candidates(c))

    scored =
      raw_candidates
      |> Enum.map(fn cand ->
        cand = stringify(cand)
        fit = FinancialFit.assess(%{
          "discretionary_budget" => budget,
          "estimated_cost" => cand["estimated_cost"]
        })

        %{
          "candidate" => cand,
          "financial_fit" => fit,
          "suppressed" => fit["suppress_suggestion"] == true,
          "authorizes_payment" => false,
          "authorizes_set" => false
        }
      end)
      |> Enum.reject(& &1["suppressed"])
      |> Enum.take(3)

    %{
      "kind" => "personal_life_curation",
      "mode" => "quiet_possibility",
      "not_task_manager" => true,
      "not_life_coach_monologue" => true,
      "not_calendar_dashboard" => true,
      "solo_ok" => true,
      "fake_friend_required" => false,
      "suggestions" => Enum.map(scored, &humanize/1),
      "suggestion_count" => length(scored),
      "financial_private" => true,
      "extends_personal_flow" => true,
      "replaces_shared_reality" => false,
      "is_payout" => false
    }
  end

  def suggest(_), do: %{"suggestions" => [], "solo_ok" => true}

  def fake_friend_required?, do: false

  def replaces_shared_reality?, do: false

  defp default_candidates(c) do
    area = c["area_label"] || "nearby"
    time = c["available_time_label"] || "open time"

    [
      %{
        "label" => "Quiet #{time} near #{area}",
        "kind" => "experience_possibility",
        "estimated_cost" => 40
      },
      %{
        "label" => "Walk + coffee",
        "kind" => "experience_possibility",
        "estimated_cost" => 15
      },
      %{
        "label" => "Solo dinner somewhere unhurried",
        "kind" => "experience_possibility",
        "estimated_cost" => 55
      }
    ]
  end

  defp humanize(%{"candidate" => cand, "financial_fit" => fit}) do
    %{
      "text" => cand["label"],
      "kind" => "possibility",
      "financial_fit" => fit["fit"],
      "authorizes_payment" => false,
      "cta" => nil
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
