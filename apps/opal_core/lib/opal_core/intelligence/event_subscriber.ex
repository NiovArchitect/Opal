defmodule OpalCore.Intelligence.EventSubscriber do
  @moduledoc """
  GenServer: LLM watches the life of the app via PubSub (Paste B).

  ## Paste B Phase 0 — real-time stack (ground truth)

  **PubSub topics subscribed (narrow — social signals only):**
  - `domain_events:opal.plan.events` — plan changes via Outbox/LocalAdapter
    (`{:domain_event, envelope}`). WHY: plan cancel/change → conflict/nudge intents.
  - `domain_events:opal.action.events` — action.* intents already on the bus.
    WHY: avoid double-acting; rules can short-circuit.
  - `domain_events:all` — NOT subscribed (too broad; auth/billing noise).
  - `social_flow:conversation:*` — NOT globally subscribed (per-conversation;
    would require dynamic joins). Plan path uses domain_events instead.
  - Auth/billing topics — NEVER subscribed (cost + privacy).

  **Topic catalog (publishers → subscribers) — do not invent new client buses:**
  | Topic | Publishers | Subscribers |
  |---|---|---|
  | `social_flow:conversation:<id>` | SocialFlow / Collective / FollowThrough / Meaning | ConversationChannel |
  | `domain_events:<family>` + `domain_events:all` | LocalAdapter (after PublishOutboxWorker) | DecisionRecompositionConsumer; this module (plan+action only) |
  | `ai_jobs:<user>` / `ai_jobs:conversation:<id>` | OpalCore.AI | EventProbe / tests |
  | `social_moments:user:<id>` | SocialMomentRealtime | PubSub fanout |
  | Endpoint `user:<id>` | Inbox / AttentionCenter / Calls | UserChannel |
  | Endpoint `conversation:<id>` | Alignment / Family / Discovery | joined ConversationChannel |
  | Endpoint `call:<id>` | Calls | CallChannel |
  | Presence on `conversation:<id>` | ConversationChannel after_join | Presence state/diff |

  **Channels:** `conversation:*`, `user:*`, `call:*` — subscriber never pushes
  directly; emits ActionIntents → Outbox → BroadcastChoreography → Channel.

  **Presence:** `OpalCoreWeb.Presence` on `conversation:<id>` with metas
  user_id/device_id/connected_at/app_state/client_version. Join/leave handled
  via `PresenceAware` — leaves never nudge.

  **Outbox:** `event_outbox` + `OpalCore.Events.Publisher.record/1` +
  `PublishOutboxWorker` — REUSE, do not duplicate. Statuses:
  pending|publishing|published|failed|dead.

  **Oban crons:** TFT tick, TemporalHabitMiner, CelebrationReminder, Digest,
  TripReminder, MemoryHourly, RoutineDetector — do not duplicate.

  **Kafka:** `KafkaAdapter` exists but `operational?` is false by default.
  Event schemas stay versioned/stable for future Kafka consumers. No new
  producers/consumers in this paste.

  Account scoping: every event must carry account_id; processing uses
  `SocialMemory.for_account(account_id)` only.
  """

  use GenServer
  require Logger

  alias OpalCore.Events.Publisher
  alias OpalCore.Intelligence.{ActionIntent, BroadcastChoreography}
  alias OpalCore.SocialMemory

  @pubsub OpalCore.PubSub
  @mailbox_bound 1000
  @priority_types ~w(conflict_alert presence_nudge)

  # Public API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def ingest(event), do: GenServer.cast(__MODULE__, {:event, event})

  def stats, do: GenServer.call(__MODULE__, :stats)

  def mailbox_bound, do: @mailbox_bound

  def priority_types, do: @priority_types

  @doc "Synchronous process path for tests (bypasses GenServer mailbox)."
  def process_now(event), do: handle_event(event, %{drops: 0, processed: 0, rules: 0, llm: 0})

  # GenServer

  @impl true
  def init(_opts) do
    :ok = Phoenix.PubSub.subscribe(@pubsub, "domain_events:opal.plan.events")
    :ok = Phoenix.PubSub.subscribe(@pubsub, "domain_events:opal.action.events")

    Logger.info(
      "intelligence.event_subscriber.booted topics=opal.plan.events,opal.action.events bound=#{@mailbox_bound}"
    )

    {:ok, %{queue: :queue.new(), size: 0, drops: 0, processed: 0, rules: 0, llm: 0}}
  end

  @impl true
  def handle_info({:domain_event, envelope}, state) when is_map(envelope) do
    enqueue(envelope, state)
  end

  def handle_info(_, state), do: {:noreply, state}

  @impl true
  def handle_cast({:event, event}, state), do: enqueue(event, state)

  @impl true
  def handle_call(:stats, _from, state) do
    {:reply,
     %{
       size: state.size,
       drops: state.drops,
       processed: state.processed,
       rules: state.rules,
       llm: state.llm,
       bound: @mailbox_bound
     }, state}
  end

  @impl true
  def handle_cast(:drain, state) do
    {state, _} = drain(state, 100)
    {:noreply, state}
  end

  defp enqueue(event, state) do
    priority? = priority_event?(event)

    {queue, size, drops} =
      cond do
        state.size < @mailbox_bound ->
          q =
            if priority?,
              do: :queue.in_r(event, state.queue),
              else: :queue.in(event, state.queue)

          {q, state.size + 1, state.drops}

        priority? ->
          case :queue.out(state.queue) do
            {{:value, _dropped}, q2} ->
              Logger.warning("intelligence.event_subscriber.drop reason=burst_shed")
              {:queue.in_r(event, q2), state.size, state.drops + 1}

            {:empty, q2} ->
              {:queue.in_r(event, q2), 1, state.drops}
          end

        true ->
          case :queue.out(state.queue) do
            {{:value, _}, q2} ->
              Logger.warning("intelligence.event_subscriber.drop reason=burst_shed")
              {:queue.in(event, q2), state.size, state.drops + 1}

            {:empty, q2} ->
              {:queue.in(event, q2), 1, state.drops}
          end
      end

    state = %{state | queue: queue, size: size, drops: drops}
    {state, _} = drain(state, 10)
    {:noreply, state}
  end

  defp drain(state, 0), do: {state, :budget}

  defp drain(%{size: 0} = state, _), do: {state, :empty}

  defp drain(state, n) do
    case :queue.out(state.queue) do
      {{:value, event}, q2} ->
        {_intent, tier} = handle_event(event, state)

        state = %{
          state
          | queue: q2,
            size: max(state.size - 1, 0),
            processed: state.processed + 1,
            rules: state.rules + if(tier == :rules, do: 1, else: 0),
            llm: state.llm + if(tier == :llm, do: 1, else: 0)
        }

        drain(state, n - 1)

      {:empty, q2} ->
        {%{state | queue: q2, size: 0}, :empty}
    end
  end

  defp priority_event?(event) when is_map(event) do
    type = event["event_type"] || event[:event_type] || ""
    String.contains?(to_string(type), "conflict") or String.contains?(to_string(type), "cancel")
  end

  defp priority_event?(_), do: false

  defp handle_event(event, _state) when is_map(event) do
    account_id = account_id_from(event)
    type = event["event_type"] || event[:event_type] || ""

    if is_binary(account_id) do
      _scoped = SocialMemory.for_account(account_id)
      {intent, tier} = reason(type, event, account_id)
      Logger.info("intelligence.event_tier=#{tier} type=#{type} account=#{account_id}")

      if intent do
        _ = persist_intent(intent, event)
      end

      {intent, tier}
    else
      Logger.info("intelligence.event_tier=skip reason=no_account_id type=#{type}")
      {nil, :rules}
    end
  rescue
    e ->
      Logger.warning("intelligence.event_subscriber.error #{Exception.message(e)}")
      {nil, :rules}
  end

  defp handle_event(_, _), do: {nil, :rules}

  defp account_id_from(event) do
    payload = event["payload"] || event[:payload] || %{}

    event["account_id"] || event[:account_id] || payload["account_id"] ||
      payload[:account_id] || payload["owner_user_id"] || payload["user_id"] ||
      event["partition_key"]
  end

  # Rules first — LLM only for nuanced cases
  defp reason(type, event, account_id) do
    cond do
      String.contains?(to_string(type), "cancel") or type in ["plan.cancelled", "plan.canceled"] ->
        payload = event["payload"] || %{}
        plan_id = payload["plan_id"] || payload[:plan_id]
        _ = maybe_cancel_plan_memory(account_id, plan_id)

        {:ok, intent} =
          ActionIntent.new(%{
            type: :commitment_reminder,
            account_id: account_id,
            ref_ids: [plan_id],
            reason: "plan_cancelled",
            priority: 70,
            plan_id: plan_id,
            suggested_copy_draft: "A plan was cancelled — check open commitments."
          })

        {intent, :rules}

      String.contains?(to_string(type), "plan") and
          (String.contains?(to_string(type), "change") or
             String.contains?(to_string(type), "revised") or
             type in ["plan.updated", "plan.version_revised"]) ->
        scoped = SocialMemory.for_account(account_id)
        conflicts = SocialMemory.detect_conflicts(scoped)

        if conflicts != [] do
          {:ok, intent} =
            ActionIntent.new(%{
              type: :conflict_alert,
              account_id: account_id,
              ref_ids: Enum.flat_map(conflicts, & &1.involved),
              reason: "plan_change_conflict",
              priority: 90,
              suggested_copy_draft: hd(conflicts).description
            })

          {intent, :rules}
        else
          {nil, :rules}
        end

      true ->
        {nil, :rules}
    end
  end

  defp maybe_cancel_plan_memory(account_id, plan_id) when is_binary(plan_id) do
    import Ecto.Query
    alias OpalCore.Repo
    alias OpalCore.SocialMemory.PlanMemory

    case Repo.get_by(PlanMemory, account_id: account_id, plan_id: plan_id) do
      %PlanMemory{} = row ->
        row |> PlanMemory.changeset(%{status: "cancelled"}) |> Repo.update()

      _ ->
        :ok
    end
  end

  defp maybe_cancel_plan_memory(_, _), do: :ok

  defp persist_intent(%ActionIntent{} = intent, source_event) do
    event_id = idempotent_event_id(intent, source_event)

    result =
      Publisher.record(%{
        event_type: "action.intelligence_intent",
        event_id: event_id,
        aggregate_type: "intelligence_intent",
        aggregate_id: event_id,
        partition_key: intent.account_id,
        privacy_class: "private_authorized",
        purpose: "intelligence_choreography",
        payload: %{
          "intent_type" => to_string(intent.type),
          "account_id" => intent.account_id,
          "ref_ids" => Enum.reject(intent.ref_ids || [], &is_nil/1),
          "reason" => intent.reason,
          "priority" => intent.priority,
          "conversation_id" => intent.conversation_id,
          "plan_id" => intent.plan_id,
          "suggested_summary" => intent.suggested_copy_draft,
          "schema_version" => 1
        }
      })

    case result do
      {:ok, _row} ->
        _ = BroadcastChoreography.broadcast(intent)
        result

      other ->
        other
    end
  end

  defp idempotent_event_id(intent, source_event) do
    source_id =
      source_event["event_id"] || source_event[:event_id] ||
        source_event["causation_id"] || Ecto.UUID.generate()

    "intel:#{intent.type}:#{intent.account_id}:#{source_id}"
  end
end
