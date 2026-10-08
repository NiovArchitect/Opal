defmodule OpalCore.Intelligence.PresenceAware do
  @moduledoc """
  Presence-aware reasoning (Paste B Phase 3).

  Product decision: LEAVES are never nudged — someone going offline is not an
  opportunity. Only JOINs trigger open-loop evaluation.

  Debounce: minimum 24h between presence_nudges per (account_id, person_id)
  regardless of join flaps. Flaps within 60s collapse to one evaluation.

  Privacy: presence of person X is visible to account A only when X shares a
  conversation with A (existing Presence semantics on conversation:<id>).
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Events.Publisher
  alias OpalCore.Intelligence.{ActionIntent, BroadcastChoreography, LlmRespond}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{PersonMemory, SurfacedNudge}

  @debounce_ms 60_000
  @min_hours 24

  # ETS for flap debounce: {account_id, person_id} => last_eval_ms
  @table :opal_presence_aware_debounce

  def ensure_table! do
    case :ets.whereis(@table) do
      :undefined ->
        :ets.new(@table, [:named_table, :public, :set, read_concurrency: true])

      _ ->
        @table
    end
  end

  @doc """
  Handle a presence JOIN for `joining_user_id` on a conversation visible to `account_id`.
  Leaves must not call this.
  """
  def on_join(account_id, joining_user_id, conversation_id)
      when is_binary(account_id) and is_binary(joining_user_id) do
    ensure_table!()

    if account_id == joining_user_id do
      {:ok, :self}
    else
      # 24h product cap checked before flap debounce so a successful nudge
      # suppresses subsequent joins as :suppressed_24h (not flap).
      if recent_presence_nudge?(account_id, joining_user_id) do
        Logger.info(
          "presence_aware.suppressed reason=24h account=#{account_id} person=#{joining_user_id}"
        )

        {:ok, :suppressed_24h}
      else
        now_ms = System.system_time(:millisecond)
        key = {account_id, joining_user_id}

        case :ets.lookup(@table, key) do
          [{^key, last}] when now_ms - last < @debounce_ms ->
            Logger.info(
              "presence_aware.suppressed reason=flap account=#{account_id} person=#{joining_user_id}"
            )

            {:ok, :suppressed_flap}

          _ ->
            :ets.insert(@table, {key, now_ms})
            evaluate(account_id, joining_user_id, conversation_id)
        end
      end
    end
  end

  def on_join(_, _, _), do: {:error, :invalid}

  @doc "Leaves never evaluate — documented product decision."
  def on_leave(_account_id, _leaving_user_id, _conversation_id) do
    {:ok, :ignored_leave}
  end

  defp evaluate(account_id, person_id, conversation_id) do
    if recent_presence_nudge?(account_id, person_id) do
      Logger.info(
        "presence_aware.suppressed reason=24h account=#{account_id} person=#{person_id}"
      )

      {:ok, :suppressed_24h}
    else
      scoped = SocialMemory.for_account(account_id)

      case open_loop?(scoped, person_id) do
        {true, reason} ->
          {:ok, intent} =
            ActionIntent.new(%{
              type: :presence_nudge,
              account_id: account_id,
              person_id: person_id,
              conversation_id: conversation_id,
              ref_ids: [person_id],
              reason: reason,
              priority: 75,
              suggested_copy_draft: reason
            })

          _ = persist_and_broadcast(intent)
          {:ok, intent}

        false ->
          {:ok, :no_open_loop}
      end
    end
  end

  defp persist_and_broadcast(%ActionIntent{} = intent) do
    event_id =
      "presence:#{intent.account_id}:#{intent.person_id}:#{System.system_time(:second)}"

    _ =
      Publisher.record(%{
        event_type: "action.presence_nudge",
        event_id: event_id,
        aggregate_type: "intelligence_intent",
        aggregate_id: event_id,
        partition_key: intent.account_id,
        privacy_class: "private_authorized",
        purpose: "presence_open_loop",
        payload: %{
          "intent_type" => "presence_nudge",
          "account_id" => intent.account_id,
          "person_id" => intent.person_id,
          "conversation_id" => intent.conversation_id,
          "reason" => intent.reason,
          "suggested_summary" => intent.suggested_copy_draft,
          "schema_version" => 1
        }
      })

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    _ =
      %SurfacedNudge{}
      |> SurfacedNudge.changeset(%{
        account_id: intent.account_id,
        type: "presence_nudge",
        ref_id: intent.person_id,
        priority: intent.priority,
        reason: intent.reason,
        message_draft: intent.suggested_copy_draft,
        conversation_id: intent.conversation_id,
        surfaced_at: now
      })
      |> Repo.insert()

    BroadcastChoreography.broadcast(intent)
  end

  defp recent_presence_nudge?(account_id, person_id) do
    since = DateTime.add(DateTime.utc_now(), -@min_hours * 3600, :second)

    from(n in SurfacedNudge,
      where:
        n.account_id == ^account_id and n.type == "presence_nudge" and n.ref_id == ^person_id and
          n.surfaced_at >= ^since
    )
    |> Repo.exists?()
  end

  defp open_loop?(%SocialMemory.Scoped{account_id: account_id}, person_id) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      %PersonMemory{open_loops: loops} when is_list(loops) and loops != [] ->
        desc = get_in(hd(loops), ["description"]) || "an open loop"
        template = "They're online — want to close the loop on #{desc}?"

        {text, _source} =
          LlmRespond.draft_or_template(%{
            action: "nudge.presence",
            template_message: template,
            account_id: account_id,
            entities: %{"person_id" => person_id, "loop" => desc},
            instruction:
              "Warm presence nudge. Keep the open-loop fact. One short sentence. No markdown.",
            recent_messages: []
          })

        {true, if(is_binary(text) and text != "", do: text, else: template)}

      _ ->
        false
    end
  end
end
