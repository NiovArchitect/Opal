defmodule OpalCore.Center.IntelligenceOrchestrator do
  @moduledoc """
  Coordinates specialized Center engines — not a second source of truth.

  Flow (conceptual):
  Intent → Context → Permission → Participants → Temporal/Location →
  Constraints → QuestionEconomy → DependencyPlanner → Provider → Elixir authority.

  Python proposes; Elixir authorizes. LLM drafts language around domain truth.
  Fixture names are never special-cased.
  """

  alias OpalCore.Center.{
    PlanningContext,
    PlanContextPatch,
    QuestionEconomy,
    DependencyPlanner,
    SurprisePlanning,
    ScheduleFeasibility,
    AvailabilityUse,
    ActionOrchestrator
  }

  alias OpalCore.Places.Gateway

  @doc """
  Build a structured response plan for LLM expression / Center overrides.
  Domain state owns truth — LLM must not invent provider/permission facts.
  """
  def response_plan(user_id, raw_text, opts \\ []) when is_binary(user_id) and is_binary(raw_text) do
    prior = PlanningContext.get_for_user(user_id)
    patch = PlanContextPatch.extract_from_text(raw_text, prior) |> Map.merge(SurprisePlanning.detect(raw_text))
    composed = PlanContextPatch.apply(prior, patch) |> then(&SurprisePlanning.enrich(user_id, &1, opts))
    deps = DependencyPlanner.build(composed)
    next = DependencyPlanner.next_after(composed)
    q = QuestionEconomy.decide(composed)

    provider = Gateway.registry()

    %{
      "current_intent" => opts[:intent] || "plan",
      "known_context" => composed,
      "participant_set" => List.wrap(composed["who"] || composed["participants"]),
      "plan_state" => %{
        "plan_id" => composed["plan_id"],
        "visibility_mode" => composed["visibility_mode"] || "normal"
      },
      "known_slots" => known_slots(composed),
      "unresolved_slots" => unresolved(deps),
      "safe_assumptions" => soft_assumptions(q),
      "permissions" => %{
        "RELATIONSHIP_TYPE_AUTO_GRANTS_CALENDAR" => false,
        "OTHER_PARTY_EVENT_TITLES_EXPOSED" => false,
        "USE_NEQ_DISCLOSE" => true
      },
      "action_ceiling" => opts[:action_ceiling] || "prepare",
      "provider_state" => provider,
      "next_best_action" => next,
      "question_if_needed" =>
        case q do
          {:ask, _, question} -> question
          _ -> nil
        end,
      "tone" => if(composed["surprise"] == true, do: "discreet", else: "warm_direct"),
      "PERSON_AGNOSTIC" => true,
      "LLM_CAN_INVENT_PROVIDER_TRUTH" => false
    }
  end

  @doc "Trace skeleton for observability (no secrets / raw private content)."
  def trace_skeleton(user_id, raw_text) do
    %{
      "INPUT" => %{
        "user_id" => user_id,
        "text_len" => String.length(raw_text || ""),
        "has_surprise" => Regex.match?(~r/\bsurprise\b/i, raw_text || "")
      },
      "INTENT" => nil,
      "CONTEXT_USED" => Map.keys(PlanningContext.get_for_user(user_id)),
      "PERMISSIONS" => ["calendar.availability.use?"],
      "PYTHON_PROPOSALS" => [],
      "ELIXIR_DECISION" => nil,
      "PROVIDER_JOB" => nil,
      "RESULT" => nil,
      "DURABLE_MUTATION" => nil,
      "SURFACE_PROJECTIONS" => [],
      "CONSUMER_PAINT" => nil
    }
  end

  @doc "Delegate turn handling to ActionOrchestrator (single authority path)."
  def after_classify(user_id, raw_text, intent, ctx) do
    ActionOrchestrator.after_classify(user_id, raw_text, intent, ctx)
  end

  @doc "Work-conflict helper for Center planning (substrate)."
  def evaluate_work(opts), do: ScheduleFeasibility.evaluate_work_conflict(opts)

  @doc "Private mutual availability helper."
  def mutual_availability(organizer_id, invitee_id, start_at, end_at, opts \\ []) do
    AvailabilityUse.mutual_clear?(organizer_id, invitee_id, start_at, end_at, opts)
  end

  defp known_slots(c) do
    %{
      "who" => present?(c["who"] || c["primary_person"]),
      "when" => present?(c["when"]),
      "destination" => present?(c["destination"]),
      "venue" => present?(c["venue"]),
      "plan_id" => present?(c["plan_id"])
    }
  end

  defp unresolved(deps) when is_map(deps) do
    deps
    |> Enum.filter(fn {_k, v} -> v == "pending" end)
    |> Enum.map(fn {k, _} -> k end)
  end

  defp unresolved(_), do: []

  defp soft_assumptions({:soft_assume, _, copy}), do: [copy]
  defp soft_assumptions(_), do: []

  defp present?(v) when is_binary(v), do: String.trim(v) != ""
  defp present?(v) when is_list(v), do: v != []
  defp present?(_), do: false
end
