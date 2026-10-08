defmodule Mix.Tasks.Opal.BackfillMemory do
  @shortdoc "Backfill per-user social memory from historical messages"
  @moduledoc """
  Idempotent memory backfill. Not a web endpoint.

      mix opal.backfill_memory
      mix opal.backfill_memory --dry-run
  """

  use Mix.Task

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.Intelligence.Extractor
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{Commitment, ConversationIndex, PersonMemory, PlanMemory}

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")
    dry? = "--dry-run" in args

    account_ids =
      from(m in ConversationMember, distinct: true, select: m.user_id)
      |> Repo.all()

    Mix.shell().info("accounts=#{length(account_ids)} dry_run=#{dry?}")

    before = counts()

    Enum.each(account_ids, fn account_id ->
      convs =
        from(m in ConversationMember,
          where: m.user_id == ^account_id,
          select: m.conversation_id
        )
        |> Repo.all()

      Enum.each(convs, fn conv_id ->
        msgs =
          from(msg in Message,
            where: msg.conversation_id == ^conv_id,
            order_by: [asc: msg.server_seq],
            limit: 500
          )
          |> Repo.all()

        Enum.each(msgs, fn msg ->
          {intent, entities, vibe, _src, _meta} = Extractor.extract_message(msg.body || "", %{})

          unless dry? do
            _ =
              SocialMemory.ingest(
                account_id,
                conv_id,
                msg.id,
                %{intent: intent, entities: entities, vibe: vibe},
                %{
                  sender_id: msg.sender_user_id,
                  body: msg.body || "",
                  timestamp: msg.inserted_at || DateTime.utc_now(),
                  participant_ids: convs
                }
              )
          end
        end)

        Mix.shell().info(
          "account=#{account_id} conversation=#{conv_id} messages=#{length(msgs)}"
        )
      end)
    end)

    afterc = if dry?, do: before, else: counts()
    Mix.shell().info("before=#{inspect(before)} after=#{inspect(afterc)}")
    :ok
  end

  defp counts do
    %{
      person_memories: Repo.aggregate(PersonMemory, :count, :id),
      plan_memories: Repo.aggregate(PlanMemory, :count, :id),
      commitments: Repo.aggregate(Commitment, :count, :id),
      conversation_index: Repo.aggregate(ConversationIndex, :count, :id)
    }
  end
end
