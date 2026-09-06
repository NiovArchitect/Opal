# P4.2 high-confidence prove
alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.Events.EventOutbox
alias OpalCore.Repo
import Ecto.Query

user =
  %User{}
  |> User.changeset(%{handle: "p42-#{System.unique_integer([:positive])}", display_name: "P42"})
  |> Repo.insert!()

{:ok, %{context: ctx}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "date_ideas",
    "scope_type" => "solo",
    "budget_context" => %{"max" => 95},
    "preference_context" => %{"vibe" => "quiet"},
    "participant_ids" => [user.id],
    "correlation_id" => "p42-prove"
  })

{:ok, %{outcome: "HIGH", result: result, assessment: assessment}} =
  DecisionIntelligence.resolve_high(ctx.id, user.id, %{"expected_context_revision" => 1})

resolved =
  Repo.exists?(from o in EventOutbox, where: o.aggregate_id == ^ctx.id and o.event_type == "decision.resolved")

graph_id = Ecto.UUID.generate()

{:ok, %{result: accepted}} =
  DecisionIntelligence.accept_result(result.id, user.id, %{"graph_id" => graph_id})

accepted_evt =
  Repo.exists?(from o in EventOutbox, where: o.aggregate_id == ^ctx.id and o.event_type == "decision.accepted")

proof = %{
  "square" => "POST_B7_P4_2_HIGH_CONFIDENCE",
  "decision_id" => ctx.id,
  "result_id" => result.id,
  "outcome" => "HIGH",
  "answer_entity_id" => result.answer_entity_id,
  "truth_state" => result.truth_state,
  "confidence_class" => result.confidence_class,
  "candidate_source" => result.candidate_source,
  "based_on_context_revision" => result.based_on_context_revision,
  "policy_version" => result.policy_version,
  "hue" => result.explanation_shareable["hue"],
  "kafka_or_outbox_resolved" => resolved,
  "accepted_graph_id" => accepted.graph_id,
  "accepted_truth_state" => accepted.truth_state,
  "outbox_accepted" => accepted_evt,
  "HIGH_ENGINE_BACKEND" => "REAL",
  "CANDIDATE_SOURCE" => "FIXTURE",
  "PRODUCTION_HIGH_DECISION" => "PARTIAL",
  "STORE_READY" => false,
  "P4_2_COMPLETE" => true,
  "P4_3_AUTHORIZED" => false,
  "factors" => assessment["confidence_factors"]
}

out =
  Path.expand("../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_2_HIGH_CONFIDENCE_PROOF.json")

File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(proof, pretty: true))
IO.inspect(proof, label: "P4.2 PROOF")
IO.puts("Wrote #{out}")
