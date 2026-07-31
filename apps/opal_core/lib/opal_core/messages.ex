defmodule OpalCore.Messages do
  @moduledoc """
  Authoritative messaging boundary for Slice 1.

  Assigns server_seq under row lock; enforces client_message_id idempotency.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo

  @doc """
  Accepts a minimal message for a conversation member.

  Idempotent on `{conversation_id, client_message_id}`.
  """
  def accept_message(attrs) when is_map(attrs) do
    conversation_id = fetch_attr!(attrs, :conversation_id)
    sender_user_id = fetch_attr!(attrs, :sender_user_id)
    client_message_id = fetch_attr!(attrs, :client_message_id)

    with :ok <- ensure_member(conversation_id, sender_user_id) do
      case get_by_client_id(conversation_id, client_message_id) do
        %Message{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          insert_message(attrs, conversation_id, sender_user_id, client_message_id)
      end
    end
  end

  defp fetch_attr!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end

  def get_message(id), do: Repo.get(Message, id)
  def get_message!(id), do: Repo.get!(Message, id)

  def get_message_for_user(id, user_id) do
    from(m in Message,
      join: cm in ConversationMember,
      on: cm.conversation_id == m.conversation_id,
      where: m.id == ^id and cm.user_id == ^user_id
    )
    |> Repo.one()
  end

  def get_by_client_id(conversation_id, client_message_id) do
    Repo.get_by(Message, conversation_id: conversation_id, client_message_id: client_message_id)
  end

  @ai_states ~w(not_requested consent_required queued processing completed refused failed)

  def update_ai_state(%Message{} = message, state) when state in @ai_states do
    message
    |> Ecto.Changeset.change(ai_processing_state: state)
    |> Repo.update()
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp insert_message(attrs, conversation_id, sender_user_id, client_message_id) do
    message_type = Map.get(attrs, :message_type) || Map.get(attrs, "message_type") || "text"
    body = Map.get(attrs, :body) || Map.get(attrs, "body") || ""
    source_language = Map.get(attrs, :source_language) || Map.get(attrs, "source_language")

    result =
      Repo.transaction(fn ->
        conversation =
          from(c in Conversation, where: c.id == ^conversation_id, lock: "FOR UPDATE")
          |> Repo.one()

        if is_nil(conversation) do
          Repo.rollback(:conversation_not_found)
        else
          seq = conversation.next_server_seq

          conversation
          |> Ecto.Changeset.change(next_server_seq: seq + 1)
          |> Repo.update!()

          %Message{}
          |> Message.create_changeset(%{
            conversation_id: conversation_id,
            sender_user_id: sender_user_id,
            client_message_id: client_message_id,
            message_type: message_type,
            body: body,
            source_language: source_language,
            server_seq: seq,
            delivery_state: "persisted",
            ai_processing_state: "not_requested",
            schema_version: "0.1.0"
          })
          |> Repo.insert()
          |> case do
            {:ok, message} ->
              {:created, message}

            {:error, %Ecto.Changeset{errors: errors} = changeset} ->
              if unique_client_id_error?(errors) do
                Repo.rollback(:idempotent_race)
              else
                Repo.rollback(changeset)
              end
          end
        end
      end)

    case result do
      {:ok, {:created, %Message{} = message}} ->
        {:ok, message, :created}

      {:error, :idempotent_race} ->
        case get_by_client_id(conversation_id, client_message_id) do
          %Message{} = existing -> {:ok, existing, :idempotent}
          nil -> {:error, :idempotent_race_unresolved}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp unique_client_id_error?(errors) do
    Enum.any?(errors, fn
      {:client_message_id, {_, opts}} when is_list(opts) ->
        opts[:constraint] == :unique

      {_, {_, opts}} when is_list(opts) ->
        opts[:constraint] == :unique

      _ ->
        false
    end)
  end
end
