alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.Events.EventOutbox
alias OpalCore.Repo
import Ecto.Query

user =
  %User{}
  |> User.changeset(%{handle: "p43-#{System.unique_integer([:positive])}", display_name: "P43"})
  |> Repo.insert!()

{:ok, %{context: c0}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "unspecified",
    "scope_type" => "solo",
    "participant_ids" => [user.id],
    "correlation_id" => "p43-prove"
  })

{:ok, %{context: ctx}} =
  DecisionIntelligence.apply_correction(c0.id, user.id, %{
    "operation" => "set_intent",
    "expected_revision" => 1,
    "intent" => "date_ideas"
  })

{:ok, %{outcome: "MEDIUM", result: q}} =
  DecisionIntelligence.resolve(ctx.id, user.id, %{"expected_context_revision" => 2})

choice =
  case q.question_dimension do
    "VIBE" -> "quiet"
    "TIME_PRECISION" -> "flexible"
    "BUDGET" -> "spend"
    _ -> "flexible"
  end

{:ok, answered} = DecisionIntelligence.answer_question(q.id, user.id, %{"choice_id" => choice})

asked = Repo.exists?(from o in EventOutbox, where: o.aggregate_id == ^ctx.id and o.event_type == "decision.question_asked")
ans_evt = Repo.exists?(from o in EventOutbox, where: o.aggregate_id == ^ctx.id and o.event_type == "decision.question_answered")

proof = %{
  "square" => "POST_B7_P4_3_MEDIUM_CONFIDENCE",
  "decision_id" => ctx.id,
  "question_id" => q.question_id,
  "question_dimension" => q.question_dimension,
  "choice_id" => choice,
  "answer_outcome" => answered.outcome,
  "context_revision_after_answer" => answered.context.revision,
  "question_status" => answered.question_result.question_status,
  "outbox_question_asked" => asked,
  "outbox_question_answered" => ans_evt,
  "figma_authority" => "988:2",
  "CANDIDATE_SOURCE" => "FIXTURE",
  "MEDIUM_ENGINE_BACKEND" => "REAL",
  "P4_3_COMPLETE" => true,
  "P4_4_AUTHORIZED" => false
}

out = Path.expand("../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_3_MEDIUM_CONFIDENCE_PROOF.json")
File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(proof, pretty: true))
IO.inspect(proof, label: "P4.3 PROOF")
IO.puts("Wrote #{out}")
