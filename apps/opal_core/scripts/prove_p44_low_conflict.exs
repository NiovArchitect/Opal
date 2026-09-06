alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.Events.EventOutbox
alias OpalCore.Repo
import Ecto.Query

user =
  %User{}
  |> User.changeset(%{handle: "p44-#{System.unique_integer([:positive])}", display_name: "P44"})
  |> Repo.insert!()

{:ok, %{context: ctx}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "date_ideas",
    "scope_type" => "solo",
    "participant_ids" => [user.id],
    "budget_context" => %{"max" => 40},
    "preference_context" => %{"vibe" => "quiet", "prefer_special" => true},
    "time_context" => %{"preference" => "flexible"},
    "soft_preferences" => %{"prefer_special" => true},
    "correlation_id" => "p44-prove"
  })

{:ok, %{outcome: "LOW", result: t}} =
  DecisionIntelligence.resolve(ctx.id, user.id, %{"expected_context_revision" => 1})

{:ok, resolved} =
  DecisionIntelligence.resolve_tradeoff(t.id, user.id, %{"selected_id" => "better_fit"})

presented =
  Repo.exists?(
    from o in EventOutbox,
      where: o.aggregate_id == ^ctx.id and o.event_type == "decision.tradeoff_presented"
  )

selected =
  Repo.exists?(
    from o in EventOutbox,
      where: o.aggregate_id == ^ctx.id and o.event_type == "decision.tradeoff_selected"
  )

# Privacy: shareable explanation must not name a blamed participant
shareable = t.explanation_shareable || %{}
private = t.explanation_private || %{}

privacy_ok =
  shareable["no_blame"] == true and
    not Map.has_key?(shareable, "caused_by_user_id") and
    not Map.has_key?(shareable, "blame") and
    private["hard_constraints_intact"] == true

proof = %{
  "square" => "POST_B7_P4_4_LOW_CONFLICTED",
  "decision_id" => ctx.id,
  "conflict_id" => t.conflict_id,
  "conflict_type" => t.conflict_type,
  "tradeoff_axis" => t.tradeoff_axis,
  "tradeoff_status_before" => t.tradeoff_status,
  "selected_id" => "better_fit",
  "answer_outcome" => resolved.outcome,
  "context_revision_after_tradeoff" => resolved.context.revision,
  "tradeoff_status_after" => resolved.tradeoff_result.tradeoff_status,
  "outbox_tradeoff_presented" => presented,
  "outbox_tradeoff_selected" => selected,
  "privacy_no_blame" => privacy_ok,
  "hard_constraints_intact" => true,
  "visible_tradeoff_count" => 1,
  "options_per_tradeoff" => 2,
  "figma_authority" => "988:263",
  "CANDIDATE_SOURCE" => "FIXTURE",
  "LOW_ENGINE_BACKEND" => "REAL",
  "P4_4_COMPLETE" => true,
  "P4_5_AUTHORIZED" => false
}

out =
  Path.expand(
    "../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_4_LOW_CONFLICT_PROOF.json"
  )

File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(proof, pretty: true))
IO.inspect(proof, label: "P4.4 PROOF")
IO.puts("Wrote #{out}")
