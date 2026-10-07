defmodule OpalCore.Messaging.Inbox do
  @moduledoc """
  User inbox notices.

  The conversation topic stays thread-local. `user:<id>` tells that member
  their Chats row changed even when the thread is closed. Phoenix is the
  fast path. The conversation list API remains the truth path after
  reconnect or relaunch. Kafka is not on this path.
  """

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.HomeProjection
  alias OpalCoreWeb.Endpoint

  @preview_limit 180

  def fanout_message(%Message{} = message) do
    message.conversation_id
    |> Messages.member_user_ids()
    |> Enum.each(fn user_id ->
      notice = message_notice(message, user_id)
      Endpoint.broadcast("user:#{user_id}", "inbox:message", notice)

      # Phase 2.2 — push when recipient is not the sender and notifications allow.
      if user_id != message.sender_user_id and notice["in_app"] == true do
        _ = maybe_enqueue_message_push(user_id, message, notice)
      end
    end)

    :ok
  end

  defp maybe_enqueue_message_push(user_id, %Message{} = message, notice) do
    sender_name =
      case Repo.get(User, message.sender_user_id) do
        %User{display_name: name} when is_binary(name) and name != "" -> name
        _ -> "Someone"
      end

    title = sender_name
    body = notice["preview"] || "sent you a message"

    # Phase 4 — tier:normal (new message). Mute absolute via NotificationIntelligence.
    OpalCore.Push.NotificationIntelligence.enqueue(
      user_id,
      title,
      body,
      %{
        "conversation_id" => message.conversation_id,
        "message_id" => message.id,
        "sender_user_id" => message.sender_user_id,
        "deep_link" => "opal://conversation/#{message.conversation_id}",
        "kind" => "message.new",
        "tier" => "normal"
      },
      tier: :normal
    )
  rescue
    e ->
      require Logger
      Logger.warning("push.message_enqueue_failed #{Exception.message(e)}")
      {:error, :enqueue_failed}
  end

  def message_notice(%Message{} = message, user_id) when is_binary(user_id) do
    %{
      "event_id" => Ecto.UUID.generate(),
      "event" => "conversation.updated",
      "conversation_id" => message.conversation_id,
      "message_id" => message.id,
      "server_seq" => message.server_seq,
      "sender_user_id" => message.sender_user_id,
      "preview" => preview(message.body),
      "last_message_at" => iso(message.inserted_at),
      "unread_count" => Messages.unread_count(message.conversation_id, user_id),
      "acceptance" => "sent_to_server",
      "in_app" => in_app?(user_id, message.sender_user_id, message.conversation_id),
      "visibility" => "participants"
    }
  end

  @doc """
  Internal read cursor always updates. Peer-visible receipts are a separate
  preference and are omitted when that user has turned them off.
  """
  def fanout_read(conversation_id, reader_user_id, last_read_server_seq)
      when is_binary(conversation_id) and is_binary(reader_user_id) and
             is_integer(last_read_server_seq) do
    Endpoint.broadcast(
      "user:#{reader_user_id}",
      "inbox:read",
      %{
        "event" => "unread.changed",
        "conversation_id" => conversation_id,
        "reader_user_id" => reader_user_id,
        "last_read_server_seq" => last_read_server_seq,
        "unread_count" => Messages.unread_count(conversation_id, reader_user_id),
        "peer_visible" => false,
        "self" => true
      }
    )

    if read_receipts_enabled?(reader_user_id) do
      conversation_id
      |> Messages.member_user_ids()
      |> Enum.each(fn user_id ->
        if user_id != reader_user_id do
          Endpoint.broadcast(
            "user:#{user_id}",
            "inbox:read",
            peer_read_notice(conversation_id, reader_user_id, last_read_server_seq)
          )
        end
      end)
    end

    :ok
  end

  def peer_read_notice(conversation_id, reader_user_id, last_read_server_seq) do
    %{
      "event" => "read_receipt",
      "conversation_id" => conversation_id,
      "reader_user_id" => reader_user_id,
      "last_read_server_seq" => last_read_server_seq,
      "peer_visible" => true,
      "self" => false
    }
  end

  def fanout_plan(conversation_id, alignment) when is_binary(conversation_id) and is_map(alignment) do
    members = Messages.member_user_ids(conversation_id)
    projection = HomeProjection.from_alignment(alignment, conversation_id, length(members))

    Enum.each(members, fn user_id ->
      Endpoint.broadcast("user:#{user_id}", "inbox:plan", %{
        "event_id" => Ecto.UUID.generate(),
        "event" => "plan.projected",
        "conversation_id" => conversation_id,
        "visibility" => "participants",
        "projection" => projection
      })
    end)

    # Meaningful Attention: pending proposal → Needs You / Waiting; settled → resolve.
    # Reuses AttentionAuthority — no parallel notification truth.
    _ = project_attention_from_alignment(conversation_id, alignment, members)

    :ok
  end

  def fanout_plan(_, _), do: :ok

  defp project_attention_from_alignment(conversation_id, alignment, members)
       when is_binary(conversation_id) and is_map(alignment) and is_list(members) do
    alias OpalCore.SocialFlow.AttentionCenter

    case alignment["change_proposal"] do
      %{"value" => value, "proposal_id" => proposal_id} = proposal
      when is_binary(value) and is_binary(proposal_id) ->
        proposer = proposal["proposed_by_user_id"]
        responders = Enum.reject(members, &(&1 == proposer))

        place =
          get_in(alignment, ["place", "value"]) ||
            get_in(alignment, ["activity", "value"]) ||
            "Plan"

        AttentionCenter.ingest(%{
          "source_type" => "proposal",
          "source_id" => proposal_id,
          "proposal_key" => proposal_id,
          "proposal_id" => proposal_id,
          "conversation_id" => conversation_id,
          "plan_id" => alignment["lineage_id"],
          "title" => place,
          "plan_name" => place,
          "proposer_user_id" => proposer,
          "required_responder_ids" => responders,
          "participants" => members,
          "copy" => "#{value} instead?"
        })

      _ ->
        AttentionCenter.resolve_conversation_actions(conversation_id)
    end
  rescue
    _ -> :ok
  end

  defp project_attention_from_alignment(_, _, _), do: :ok

  defp in_app?(user_id, sender_id, _conversation_id) when user_id == sender_id, do: false

  defp in_app?(user_id, _sender_id, conversation_id) do
    message_notifications_enabled?(user_id) and not notifications_muted?(conversation_id, user_id)
  end

  defp message_notifications_enabled?(user_id) do
    case Repo.get(User, user_id) do
      %User{message_notifications_enabled: false} -> false
      _ -> true
    end
  end

  defp read_receipts_enabled?(user_id) do
    case Repo.get(User, user_id) do
      %User{read_receipts_enabled: false} -> false
      _ -> true
    end
  end

  defp notifications_muted?(conversation_id, user_id) do
    case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
      %ConversationMember{notifications_muted: true} -> true
      _ -> false
    end
  end

  defp preview(body) when is_binary(body) do
    body
    |> String.replace(~r/[\r\n\t]+/u, " ")
    |> String.trim()
    |> String.slice(0, @preview_limit)
  end

  defp preview(_), do: ""

  defp iso(%DateTime{} = at), do: DateTime.to_iso8601(at)
  defp iso(_), do: nil
end
