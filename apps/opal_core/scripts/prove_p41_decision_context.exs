# P4.1 prove — DecisionContext persistence + optional Kafka publish foundation
# Run: cd apps/opal_core && mix run scripts/prove_p41_decision_context.exs
# Kafka: OPAL_KAFKA_ENABLED=true OPAL_KAFKA_BROKERS=127.0.0.1:19092

alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.Events.Adapters.KafkaAdapter
alias OpalCore.Events.EventOutbox
alias OpalCore.Repo
import Ecto.Query

proof = %{
  square: "POST_B7_P4_1_DECISION_CONTEXT",
  started_at: DateTime.utc_now() |> DateTime.to_iso8601(),
  kafka_enabled: KafkaAdapter.operational?(),
  results: []
}

put = fn proof, k, ok, extra ->
  entr = Map.merge(%{check: k, ok: ok}, extra)
  IO.puts("#{if ok, do: "OK", else: "FAIL"} #{k} #{inspect(extra)}")
  update_in(proof.results, &(&1 ++ [entr]))
end

user =
  %User{}
  |> User.changeset(%{
    handle: "p41-#{System.unique_integer([:positive])}",
    display_name: "P41"
  })
  |> Repo.insert!()

{:ok, %{context: ctx}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "date_ideas",
    "scope_type" => "solo",
    "budget_context" => %{"max" => 75},
    "invalidation_conditions" => [%{"type" => "budget_maximum", "version" => 1, "max" => 75}],
    "correlation_id" => "p41-prove"
  })

row =
  Repo.one!(from o in EventOutbox, where: o.aggregate_id == ^ctx.id, order_by: [desc: o.inserted_at], limit: 1)

proof =
  put.(proof, "persist_context", match?(%{revision: 1}, ctx), %{
    decision_id: ctx.id,
    revision: ctx.revision
  })

proof =
  put.(proof, "outbox_created", row.event_type == "decision.created" and row.partition_key == ctx.id, %{
    event_id: row.event_id,
    topic: row.topic_family
  })

{:ok, %{context: rev2}} =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_budget",
    "expected_revision" => 1,
    "budget_max" => 50
  })

proof = put.(proof, "revision_bump", rev2.revision == 2, %{revision: rev2.revision})

{:ok, %{context: noop}} =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_budget",
    "expected_revision" => 2,
    "budget_max" => 50
  })

proof = put.(proof, "noop_no_bump", noop.revision == 2, %{revision: noop.revision})

stale =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_vibe",
    "expected_revision" => 1,
    "vibe" => "x"
  })

proof = put.(proof, "stale_rejected", stale == {:error, :stale_decision_revision}, %{})

alias OpalCore.Events.Adapters.LocalAdapter
alias OpalCore.Events.Publisher

# Deliver outbox (Local always; Kafka when enabled) — same path as worker
deliver =
  Enum.map(Repo.all(from o in EventOutbox, where: o.aggregate_id == ^ctx.id), fn o ->
    with :ok <- LocalAdapter.publish(o.envelope),
         :ok <-
           (if KafkaAdapter.operational?() do
              KafkaAdapter.publish(o.envelope)
            else
              :ok
            end) do
      Publisher.mark_published(o)
      :ok
    else
      err -> err
    end
  end)

proof = put.(proof, "outbox_deliver", Enum.all?(deliver, &(&1 == :ok)), %{results: deliver})

kafka_health = KafkaAdapter.health()

proof =
  put.(
    proof,
    "kafka_foundation",
    if(KafkaAdapter.operational?(), do: kafka_health.ok == true, else: true),
    %{
      operational: KafkaAdapter.operational?(),
      health: kafka_health,
      note:
        if(KafkaAdapter.operational?(),
          do: "broker publish attempted via outbox worker",
          else: "Kafka not enabled this run — architecture present; enable with OPAL_KAFKA_*"
        )
    }
  )

all_ok = Enum.all?(proof.results, & &1.ok)
proof = Map.merge(proof, %{P4_1_DOMAIN_GREEN: all_ok, finished_at: DateTime.utc_now() |> DateTime.to_iso8601()})

out =
  Path.expand("../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_1_DECISION_CONTEXT_PROOF.json")

File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(proof, pretty: true))
IO.puts("\nWrote #{out}")
IO.puts("P4_1_DOMAIN_GREEN=#{all_ok}")
unless all_ok, do: System.halt(1)
