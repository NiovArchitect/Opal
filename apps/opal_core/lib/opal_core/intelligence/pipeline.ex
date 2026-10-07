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

  @doc "Full chain for a message.sent event attrs or Message struct."
  def on_message_created(message, context \\ %{}) do
    with {:ok, event} <- EventIngestor.ingest_message_sent(message),
         {:ok, extraction} <- Extractor.extract(event),
         ctx <- Map.put(context, :conversation_id, event.conversation_id),
         ctx <- Map.put(ctx, "conversation_id", event.conversation_id),
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
