defmodule OpalCore.Intelligence.Pipeline do
  @moduledoc """
  event → extract → reason → execute (auditable chain).

  Called after message persist / RSVP change. Failures never roll back the
  primary product write — intelligence is best-effort beside the write-ahead event.
  """

  require Logger

  alias OpalCore.Intelligence.{
    EventIngestor,
    Executor,
    Extractor,
    Reasoner
  }

  alias OpalCore.SocialMemory

  # The dedicated Opal/bot sender. Only this id may carry Opal-authored text;
  # anything else is a human sender and must flow through extraction.
  @bot_sender_env "OPAL_INTELLIGENCE_SENDER_USER_ID"

  @doc "Full chain for a message.sent event attrs or Message struct."
  def on_message_created(message, context \\ %{}) do
    if bot_authored?(message) do
      # Repair #11 — self-trigger guard: Opal's own posts must never re-enter
      # extraction, or LLM output becomes de-facto state (and loops).
      Logger.info("intelligence.pipeline.skipped_bot_authored")
      {:ok, %{skipped: true, reason: :bot_authored}}
    else
      run_message_pipeline(message, context)
    end
  end

  @doc """
  True when a message was authored by Opal/the bot rather than a human:
  sender id is the configured Opal intelligence sender, or message_type is
  "system". Public so tests and other pipeline entry points can share it.
  """
  def bot_authored?(message) when is_map(message) do
    sender = Map.get(message, :sender_user_id) || Map.get(message, "sender_user_id")
    bot_id = System.get_env(@bot_sender_env)
    type = Map.get(message, :message_type) || Map.get(message, "message_type")

    (is_binary(sender) and is_binary(bot_id) and bot_id != "" and sender == bot_id) or
      type == "system"
  end

  def bot_authored?(_), do: false

  defp run_message_pipeline(message, context) do
    with {:ok, event} <- EventIngestor.ingest_message_sent(message),
         {:ok, extraction} <- Extractor.extract(event),
         :ok <- memory_ingest_fanout(message, event, extraction, context),
         ctx <- Map.put(context, :conversation_id, event.conversation_id),
         ctx <- Map.put(ctx, "conversation_id", event.conversation_id),
         ctx <- Map.put(ctx, :account_id, memory_account_id(message, event, context)),
         ctx <- Map.put(ctx, "account_id", memory_account_id(message, event, context)),
         {:ok, decision} <- Reasoner.reason(event, extraction, ctx),
         {:ok, action} <- Executor.execute(decision) do
      {:ok,
       %{
         event: event,
         extraction: extraction,
         decision: decision,
         action: action
       }}
    else
      {:error, reason} = err ->
        Logger.warning("intelligence.pipeline.message_failed reason=#{inspect(reason)}")
        err
    end
  end

  defp memory_account_id(message, event, context) do
    context[:account_id] || context["account_id"] ||
      Map.get(message, :sender_user_id) || Map.get(message, "sender_user_id") || event.actor_id
  end

  defp memory_ingest_fanout(message, event, extraction, context) do
    conversation_id = event.conversation_id
    message_id = Map.get(message, :id) || Map.get(message, "id") || event.id
    sender_id = event.actor_id
    body = get_in(event.payload, ["body"]) || ""

    account_ids =
      ([memory_account_id(message, event, context)] ++ member_ids(conversation_id))
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()

    Enum.each(account_ids, fn account_id ->
      _ =
        SocialMemory.ingest(account_id, conversation_id, message_id, extraction, %{
          sender_id: sender_id,
          body: body,
          timestamp: event.occurred_at || DateTime.utc_now(),
          plan_label: context[:plan_label] || context["plan_label"],
          plan_id: context[:plan_id] || context["plan_id"],
          participant_ids: account_ids
        })
    end)

    :ok
  rescue
    e ->
      Logger.warning("intelligence.memory_ingest_rescue #{Exception.message(e)}")
      :ok
  end

  defp member_ids(nil), do: []

  defp member_ids(conversation_id) when is_binary(conversation_id) do
    import Ecto.Query

    from(m in OpalCore.Messaging.ConversationMember,
      where: m.conversation_id == ^conversation_id,
      select: m.user_id
    )
    |> OpalCore.Repo.all()
  rescue
    _ -> []
  end

  @doc "RSVP change chain."
  def on_rsvp_changed(attrs, context \\ %{}) when is_map(attrs) do
    with {:ok, event} <- EventIngestor.ingest_rsvp_changed(attrs),
         {:ok, extraction} <- Extractor.extract(event),
         {:ok, decision} <- Reasoner.reason(event, extraction, context),
         {:ok, action} <- Executor.execute(decision) do
      {:ok,
       %{
         event: event,
         extraction: extraction,
         decision: decision,
         action: action
       }}
    else
      {:error, reason} = err ->
        Logger.warning("intelligence.pipeline.rsvp_failed reason=#{inspect(reason)}")
        err
    end
  end
end
