defmodule OpalCore.SocialMemory.Workers.SummarizeConversationWorker do
  use Oban.Worker, queue: :ai, max_attempts: 2

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Intelligence.LlmAdapter
  alias OpalCore.Messaging.Message
  alias OpalCore.SocialMemory.ConversationIndex

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"account_id" => account_id, "conversation_id" => conversation_id}}) do
    case Repo.get_by(ConversationIndex, account_id: account_id, conversation_id: conversation_id) do
      nil ->
        :ok

      %ConversationIndex{} = index ->
        msgs =
          from(m in Message,
            where: m.conversation_id == ^conversation_id,
            order_by: [asc: m.server_seq],
            limit: 40,
            select: %{body: m.body, sender_user_id: m.sender_user_id}
          )
          |> Repo.all()

        prev = index.rolling_summary || ""

        system = """
        Update this conversation summary. Keep it under 150 words. Preserve: key decisions,
        open questions, commitments made, tone. Return ONLY the updated summary text.
        """

        user =
          Jason.encode!(%{
            previous_summary: prev,
            recent_messages:
              Enum.map(msgs, fn m ->
                %{"sender" => m.sender_user_id, "body" => String.slice(m.body || "", 0, 280)}
              end)
          })

        case LlmAdapter.chat([%{role: "system", content: system}, %{role: "user", content: user}],
               temperature: 0.2
             ) do
          {:ok, %{content: content}} when is_binary(content) and content != "" ->
            index
            |> ConversationIndex.changeset(%{
              rolling_summary: String.slice(content, 0, 2000),
              message_count_at_summary: index.message_count || 0
            })
            |> Repo.update()

            :ok

          {:disabled, _} ->
            :ok

          {:error, reason} ->
            Logger.info("social_memory.summary_failed reason=#{inspect(reason)}")
            # Keep old summary; retry on next threshold
            :ok
        end
    end
  end

  def perform(_), do: :ok
end
