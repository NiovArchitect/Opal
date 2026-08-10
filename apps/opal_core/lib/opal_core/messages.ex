defmodule OpalCore.Messages do
  @moduledoc """
  Authoritative messaging boundary for Slice 1.

  Assigns server_seq under row lock; enforces client_message_id idempotency.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{SmokeResidue, TrustSafety}

  @doc """
  Accepts a minimal message for a conversation member.

  Idempotent on `{conversation_id, client_message_id}`.
  """
  def accept_message(attrs) when is_map(attrs) do
    conversation_id = fetch_attr!(attrs, :conversation_id)
    sender_user_id = fetch_attr!(attrs, :sender_user_id)
    client_message_id = fetch_attr!(attrs, :client_message_id)

    with :ok <- ensure_member(conversation_id, sender_user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, sender_user_id) do
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

  @doc """
  Lists conversations for a user with latest message preview.
  """
  def list_conversations(user_id) do
    member_ids =
      from(cm in ConversationMember,
        where: cm.user_id == ^user_id,
        select: cm.conversation_id
      )
      |> Repo.all()

    Enum.map(member_ids, fn cid ->
      conversation = Repo.get!(Conversation, cid)

      recent =
        from(m in Message,
          where: m.conversation_id == ^cid,
          order_by: [desc: m.server_seq],
          limit: 20
        )
        |> Repo.all()

      latest = List.first(recent)

      preview_msg =
        Enum.find(recent, fn m -> not SmokeResidue.smoke_body?(m.body || "") end)

      peers =
        from(cm in ConversationMember,
          join: u in OpalCore.Accounts.User,
          on: u.id == cm.user_id,
          where: cm.conversation_id == ^cid and cm.user_id != ^user_id,
          select: %{id: u.id, display_name: u.display_name, handle: u.handle}
        )
        |> Repo.all()

      %{
        "id" => conversation.id,
        "title" => conversation_title(peers),
        "peers" =>
          Enum.map(peers, fn p ->
            %{"id" => p.id, "display_name" => p.display_name, "handle" => p.handle}
          end),
        "preview" => (preview_msg && preview_msg.body) || "",
        "updated_at" =>
          (latest && DateTime.to_iso8601(latest.inserted_at)) ||
            DateTime.to_iso8601(conversation.updated_at),
        "latest_server_seq" => (latest && latest.server_seq) || 0
      }
    end)
    |> Enum.sort_by(& &1["updated_at"], :desc)
  end

  @doc """
  Message history for a conversation member, ascending by server_seq.
  """
  def list_messages(conversation_id, user_id, opts \\ []) do
    with :ok <- ensure_member(conversation_id, user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, user_id) do
      limit = Keyword.get(opts, :limit, 100)

      messages =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [asc: m.server_seq],
          limit: ^limit
        )
        |> Repo.all()
        # Defense in depth: hide engineering smoke residue from product clients.
        # Cleanup task removes rows; filter protects preview accounts between cleanups.
        |> Enum.reject(&SmokeResidue.smoke_body?(&1.body || ""))

      {:ok, Enum.map(messages, &Message.to_contract/1)}
    end
  end

  defp conversation_title([]), do: "Conversation"

  defp conversation_title(peers) do
    peers
    |> Enum.map(& &1.display_name)
    |> Enum.reject(&is_nil/1)
    |> case do
      [] -> "Conversation"
      names -> Enum.join(names, ", ")
    end
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

  # Either direction active block between conversation members freezes messaging.
  defp ensure_not_blocked_in_conversation(conversation_id, user_id) do
    peers =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id != ^user_id,
        select: cm.user_id
      )
      |> Repo.all()

    blocked? =
      Enum.any?(peers, fn peer ->
        TrustSafety.blocked?(user_id, peer) or TrustSafety.blocked?(peer, user_id)
      end)

    if blocked?, do: {:error, :blocked}, else: :ok
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
