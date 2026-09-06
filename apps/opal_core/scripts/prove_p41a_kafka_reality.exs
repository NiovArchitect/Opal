# P4.1a — Live Kafka reality proof
# Requires: Redpanda on OPAL_KAFKA_BROKERS (default 127.0.0.1:19092)
#   export DOCKER_HOST=unix://$HOME/.colima/docker.sock
#   docker compose -f infra/local/docker-compose.yml up -d redpanda
#   OPAL_KAFKA_ENABLED=true OPAL_KAFKA_BROKERS=127.0.0.1:19092 mix run scripts/prove_p41a_kafka_reality.exs

alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.Events.Adapters.{KafkaAdapter, LocalAdapter}
alias OpalCore.Events.EventOutbox
alias OpalCore.Events.Publisher
alias OpalCore.Repo
import Ecto.Query

System.put_env("OPAL_KAFKA_ENABLED", System.get_env("OPAL_KAFKA_ENABLED") || "true")
System.put_env("OPAL_KAFKA_BROKERS", System.get_env("OPAL_KAFKA_BROKERS") || "127.0.0.1:19092")

proof = %{
  square: "POST_B7_P4_1A_KAFKA_REALITY_CLOSURE",
  started_at: DateTime.utc_now() |> DateTime.to_iso8601(),
  broker: System.get_env("OPAL_KAFKA_BROKERS"),
  checks: []
}

add = fn proof, name, ok, extra ->
  IO.puts("#{if ok, do: "OK", else: "FAIL"} #{name} #{inspect(extra)}")
  update_in(proof, [:checks], &(&1 ++ [%{check: name, ok: ok, detail: extra}]))
end

# --- health ---
health = KafkaAdapter.health()
proof = add.(proof, "kafka_operational", KafkaAdapter.operational?() and health[:ok] == true, health)

unless KafkaAdapter.operational?() and health[:ok] == true do
  IO.puts("ABORT: Kafka not operational — cannot claim LOCAL_PROOF GREEN")
  out = Path.expand("../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_1A_KAFKA_REALITY_PROOF.json")
  File.mkdir_p!(Path.dirname(out))
  File.write!(out, Jason.encode!(Map.put(proof, :P4_1A_COMPLETE, false), pretty: true))
  System.halt(1)
end

user =
  %User{}
  |> User.changeset(%{handle: "p41a-#{System.unique_integer([:positive])}", display_name: "P41A"})
  |> Repo.insert!()

# --- baseline create with private evidence ---
{:ok, %{context: ctx}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "date_ideas",
    "scope_type" => "solo",
    "budget_context" => %{"max" => 90},
    "correlation_id" => "p41a-corr",
    "evidence" => [
      %{
        "dimension" => "budget",
        "claim" => %{"max" => 90, "private_note" => "SECRET_BUDGET_SHOULD_NOT_REACH_KAFKA"},
        "privacy_class" => "private_user",
        "source_type" => "user",
        "owner_user_id" => user.id,
        "constraint_kind" => "hard"
      }
    ],
    "invalidation_conditions" => [%{"type" => "budget_maximum", "version" => 1, "max" => 90}]
  })

row =
  Repo.one!(
    from o in EventOutbox,
      where: o.aggregate_id == ^ctx.id and o.event_type == "decision.created",
      order_by: [desc: o.inserted_at],
      limit: 1
  )

proof =
  add.(proof, "baseline_persist", ctx.revision == 1 and row.partition_key == ctx.id, %{
    decision_id: ctx.id,
    revision: ctx.revision,
    outbox_id: row.id,
    event_id: row.event_id,
    topic: row.topic_family,
    partition_key: row.partition_key
  })

# Publish via same path as worker
:ok = LocalAdapter.publish(row.envelope)
pub = KafkaAdapter.publish(row.envelope)
{:ok, _} = Publisher.mark_published(row)

proof = add.(proof, "baseline_kafka_publish", pub == :ok, %{publish: inspect(pub)})

# Consume from broker via brod fetch
topic = "opal.decision.events"
{:ok, {_hw, msgs}} = :brod.fetch([{String.to_charlist("127.0.0.1"), 19092}], topic, 0, 0, %{max_bytes: 5_000_000})

decode_msg = fn
  {:kafka_message, _off, _key, v, _, _, _} when is_binary(v) ->
    case Jason.decode(v) do
      {:ok, m} -> m
      _ -> nil
    end

  {_off, %{value: v}} when is_binary(v) ->
    case Jason.decode(v) do
      {:ok, m} -> m
      _ -> nil
    end

  msg when is_tuple(msg) and tuple_size(msg) >= 4 ->
    v = elem(msg, 3)

    if is_binary(v) do
      case Jason.decode(v) do
        {:ok, m} -> m
        _ -> nil
      end
    else
      nil
    end

  _ ->
    nil
end

decoded = msgs |> Enum.map(decode_msg) |> Enum.reject(&is_nil/1)

found = Enum.find(decoded, fn m -> m["event_id"] == row.event_id end)

proof =
  add.(proof, "broker_consumed_event", is_map(found), %{
    event_id: found && found["event_id"],
    event_type: found && found["event_type"],
    payload_keys: found && Map.keys(found["payload"] || %{}),
    consumed_count: length(decoded)
  })

payload_bin = if found, do: Jason.encode!(found), else: ""
leak? = String.contains?(payload_bin, "SECRET_BUDGET_SHOULD_NOT_REACH_KAFKA")
has_private_claim = found && get_in(found, ["payload", "evidence"]) != nil

proof =
  add.(proof, "private_evidence_not_in_kafka", not leak? and not has_private_claim, %{
    leak: leak?,
    evidence_in_payload: has_private_claim
  })

# --- revision publish ---
{:ok, %{context: rev2}} =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_budget",
    "expected_revision" => 1,
    "budget_max" => 55
  })

row2 =
  Repo.one!(
    from o in EventOutbox,
      where: o.aggregate_id == ^ctx.id and o.event_type == "decision.revised",
      order_by: [desc: o.inserted_at],
      limit: 1
  )

:ok = LocalAdapter.publish(row2.envelope)
:ok = KafkaAdapter.publish(row2.envelope)
{:ok, _} = Publisher.mark_published(row2)

proof =
  add.(proof, "revised_same_partition_key", row2.partition_key == ctx.id and rev2.revision == 2, %{
    partition_key: row2.partition_key,
    revision: rev2.revision,
    event_id: row2.event_id
  })

# --- no-op ---
before_outbox = Repo.aggregate(from(o in EventOutbox, where: o.aggregate_id == ^ctx.id), :count)

{:ok, %{context: same}} =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_budget",
    "expected_revision" => 2,
    "budget_max" => 55
  })

after_outbox = Repo.aggregate(from(o in EventOutbox, where: o.aggregate_id == ^ctx.id), :count)

proof =
  add.(proof, "noop_no_event", same.revision == 2 and after_outbox == before_outbox, %{
    revision: same.revision,
    outbox_before: before_outbox,
    outbox_after: after_outbox
  })

# --- broker outage: stop redpanda, mutate, expect pending outbox, DB commit OK ---
{_stop_out, 0} =
  System.cmd("docker", ["compose", "-f", "infra/local/docker-compose.yml", "stop", "redpanda"],
    cd: Path.expand("../.."),
    env: [{"DOCKER_HOST", System.get_env("DOCKER_HOST") || "unix://#{System.user_home!()}/.colima/docker.sock"}]
  )

Process.sleep(2000)

# Stop brod client so reconnect is forced against dead broker
_ = :brod.stop_client(:opal_kafka_client)
Process.sleep(500)

rev_before = same.revision

outage_result =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_vibe",
    "expected_revision" => rev_before,
    "vibe" => "quiet"
  })

{:ok, %{context: outage_ctx}} = outage_result

pending =
  from(o in EventOutbox,
    where: o.aggregate_id == ^ctx.id and o.status == "pending",
    order_by: [desc: o.inserted_at]
  )
  |> Repo.all()

pending_row = hd(pending)
pending_event_id = pending_row.event_id

# Attempt publish while down — should fail; leave pending
pub_down =
  try do
    KafkaAdapter.publish(pending_row.envelope)
  rescue
    e -> {:error, Exception.message(e)}
  catch
    kind, reason -> {:error, {kind, reason}}
  end

proof =
  add.(proof, "outage_db_commit_ok", outage_ctx.revision == rev_before + 1, %{
    revision: outage_ctx.revision,
    pending_count: length(pending),
    pending_event_id: pending_event_id,
    kafka_publish_while_down: inspect(pub_down)
  })

proof =
  add.(proof, "outage_outbox_pending", length(pending) >= 1 and pub_down != :ok, %{
    status: pending_row.status
  })

# --- recovery ---
{_, 0} =
  System.cmd("docker", ["compose", "-f", "infra/local/docker-compose.yml", "start", "redpanda"],
    cd: Path.expand("../.."),
    env: [{"DOCKER_HOST", System.get_env("DOCKER_HOST") || "unix://#{System.user_home!()}/.colima/docker.sock"}]
  )

# wait healthy
Enum.reduce_while(1..30, :wait, fn _, _ ->
  Process.sleep(1000)

  {out, _} =
    System.cmd("docker", ["compose", "-f", "infra/local/docker-compose.yml", "exec", "-T", "redpanda", "rpk", "cluster", "health"],
      cd: Path.expand("../.."),
      env: [{"DOCKER_HOST", System.get_env("DOCKER_HOST") || "unix://#{System.user_home!()}/.colima/docker.sock"}]
    )

  if String.contains?(out, "Healthy:") and String.contains?(out, "true"), do: {:halt, :ok}, else: {:cont, :wait}
end)

Process.sleep(2000)
_ = :brod.stop_client(:opal_kafka_client)
Process.sleep(500)

reload = Repo.get!(EventOutbox, pending_row.id)
:ok = LocalAdapter.publish(reload.envelope)
rec_pub = KafkaAdapter.publish(reload.envelope)
{:ok, published} = Publisher.mark_published(reload)

proof =
  add.(proof, "broker_recovery_publish", rec_pub == :ok and published.event_id == pending_event_id, %{
    event_id: published.event_id,
    same_event_id: published.event_id == pending_event_id,
    status: published.status,
    publish: inspect(rec_pub)
  })

# no extra revision from recovery
{:ok, %{context: after_rec}} = DecisionIntelligence.get_context(ctx.id, user.id)

proof =
  add.(proof, "recovery_no_extra_revision", after_rec.revision == outage_ctx.revision, %{
    revision: after_rec.revision
  })

# stale write
stale =
  DecisionIntelligence.apply_correction(ctx.id, user.id, %{
    "operation" => "set_vibe",
    "expected_revision" => 1,
    "vibe" => "loud"
  })

proof = add.(proof, "stale_rejected", stale == {:error, :stale_decision_revision}, %{})

all_ok = Enum.all?(proof.checks, & &1.ok)

clean_detail = fn detail ->
  detail
  |> Map.new(fn {k, v} ->
    {k,
     cond do
       is_binary(v) or is_number(v) or is_boolean(v) or is_nil(v) -> v
       is_atom(v) -> Atom.to_string(v)
       is_list(v) and Enum.all?(v, &is_binary/1) -> v
       true -> inspect(v)
     end}
  end)
end

export = %{
  "square" => "POST_B7_P4_1A_KAFKA_REALITY_CLOSURE",
  "started_at" => proof.started_at,
  "finished_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
  "broker" => System.get_env("OPAL_KAFKA_BROKERS"),
  "broker_type" => "redpanda",
  "broker_image" => "docker.redpanda.com/redpandadata/redpanda:v24.2.4",
  "checks" =>
    Enum.map(proof.checks, fn c ->
      %{"check" => c.check, "ok" => c.ok, "detail" => clean_detail.(c.detail)}
    end),
  "P4_1A_COMPLETE" => all_ok,
  "KAFKA_LOCAL_PROOF" => if(all_ok, do: "GREEN", else: "RED"),
  "KAFKA_ARCHITECTURE_IMPLEMENTED" => true,
  "KAFKA_PRODUCTION_DEPLOYED" => false,
  "KAFKA_IS_SOURCE_OF_TRUTH" => false,
  "POSTGRES_IS_SOURCE_OF_TRUTH" => true,
  "P4_1_IMPLEMENTATION_COMPLETE" => true,
  "P4_1_COMPLETE" => all_ok,
  "P4_2_AUTHORIZED" => false
}

out =
  Path.expand(
    "../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_1A_KAFKA_REALITY_PROOF.json"
  )

File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(export, pretty: true))
IO.puts("\nWrote #{out}")
IO.puts("KAFKA_LOCAL_PROOF=#{export["KAFKA_LOCAL_PROOF"]} P4_1A_COMPLETE=#{all_ok}")
unless all_ok, do: System.halt(1)
