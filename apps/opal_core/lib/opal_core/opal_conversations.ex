defmodule OpalCore.OpalConversations do
  @moduledoc """
  Phase OC-1 — Opal Center conversational shell (one conversation per user).

  GET get-or-create + last 50 messages. POST user message + OC-1 placeholder Opal reply.
  """

  import Ecto.Query

  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo

  @message_limit 50

  @doc "Get or create the user's single active Opal conversation."
  def get_or_create_conversation(user_id) when is_binary(user_id) do
    case Repo.get_by(OpalConversation, user_id: user_id) do
      %OpalConversation{} = c ->
        {:ok, c}

      nil ->
        %OpalConversation{}
        |> OpalConversation.changeset(%{"user_id" => user_id})
        |> Repo.insert()
        |> case do
          {:ok, c} ->
            {:ok, c}

          {:error, %Ecto.Changeset{errors: errors} = cs} ->
            # Race: unique user_id — re-fetch winner.
            if Keyword.has_key?(errors, :user_id) do
              case Repo.get_by(OpalConversation, user_id: user_id) do
                %OpalConversation{} = c -> {:ok, c}
                nil -> {:error, cs}
              end
            else
              {:error, cs}
            end
        end
    end
  end

  def get_or_create_conversation(_), do: {:error, :invalid}

  @doc "Owner-only fetch by id. Foreign → :not_found."
  def get_conversation_for_user(user_id, id)
      when is_binary(user_id) and is_binary(id) do
    case Repo.get(OpalConversation, id) do
      %OpalConversation{user_id: ^user_id} = c -> {:ok, c}
      %OpalConversation{} -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  def get_conversation_for_user(_, _), do: {:error, :not_found}

  @doc "Last #{@message_limit} messages ascending by inserted_at."
  def list_messages(conversation_id, limit \\ @message_limit)
      when is_binary(conversation_id) and is_integer(limit) and limit > 0 do
    # Fetch newest `limit`, then reverse to ascending for the client.
    newest =
      from(m in OpalMessage,
        where: m.conversation_id == ^conversation_id,
        order_by: [desc: m.inserted_at, desc: m.id],
        limit: ^limit
      )
      |> Repo.all()

    Enum.reverse(newest)
  end

  @doc """
  Create user message + OC-1 placeholder Opal reply in one transaction.
  Auto-sets conversation title from first user message when title is nil.
  """
  def create_user_message(user_id, body)
      when is_binary(user_id) and is_binary(body) do
    trimmed = String.trim(body)

    cond do
      trimmed == "" ->
        {:error, :empty_body}

      String.length(trimmed) > OpalMessage.max_body() ->
        {:error, :body_too_long}

      true ->
        with {:ok, conversation} <- get_or_create_conversation(user_id) do
          Repo.transaction(fn ->
            user_msg =
              %OpalMessage{}
              |> OpalMessage.changeset(%{
                "conversation_id" => conversation.id,
                "role" => "user",
                "body" => trimmed
              })
              |> Repo.insert!()

            # OC-1 PLACEHOLDER — replaced by OC-4 response generation.
            opal_msg =
              %OpalMessage{}
              |> OpalMessage.changeset(%{
                "conversation_id" => conversation.id,
                "role" => "opal",
                "body" => OpalMessage.oc1_placeholder_body()
              })
              |> Repo.insert!()

            conversation =
              if is_nil(conversation.title) do
                conversation
                |> OpalConversation.title_changeset(trimmed)
                |> Repo.update!()
              else
                conversation
                |> Ecto.Changeset.change(%{updated_at: DateTime.utc_now(:microsecond)})
                |> Repo.update!()
              end

            {conversation, user_msg, opal_msg}
          end)
        end
    end
  end

  def create_user_message(_, _), do: {:error, :invalid}

  def to_conversation_contract(%OpalConversation{} = c, messages \\ nil) do
    msgs = if is_list(messages), do: messages, else: list_messages(c.id)
    OpalConversation.to_contract(c, msgs)
  end

  def to_message_contract(%OpalMessage{} = m), do: OpalMessage.to_contract(m)

  def message_limit, do: @message_limit
end
