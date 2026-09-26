defmodule OpalCoreWeb.ConversationController do
  use OpalCoreWeb, :controller

  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.SocialFlow.Chronology
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.PrivateParticipation
  alias OpalCore.SocialFlow.ProductSignals
  alias OpalCore.SocialFlow.TrustSafety

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    conversations = Messages.list_conversations(user_id)
    home_signals = ProductSignals.signals_for_user_home(user_id)

    json(conn, %{
      "conversations" => conversations,
      "signals" => home_signals
    })
  end

  def alignment(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    if user_id in OpalCore.Messages.member_user_ids(conversation_id) do
      json(conn, %{"alignment" => ConversationAlignment.sync_conversation(conversation_id)})
    else
      conn |> put_status(403) |> json(%{"error_code" => "not_a_member"})
    end
  end

  def set_alignment_activity(conn, %{"id" => conversation_id, "activity" => activity}) do
    user_id = conn.assigns.current_user_id

    case ConversationAlignment.set_activity(conversation_id, user_id, activity) do
      {:ok, state} -> json(conn, %{"alignment" => state})
      {:error, :not_a_member} -> conn |> put_status(403) |> json(%{"error_code" => "not_a_member"})
      {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  def confirm_alignment(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    case ConversationAlignment.confirm_exact_time(conversation_id, user_id) do
      {:ok, state} -> json(conn, %{"alignment" => state})
      {:error, :not_a_member} -> conn |> put_status(403) |> json(%{"error_code" => "not_a_member"})
      {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  def messages(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    limit = parse_limit(params["limit"])

    case Messages.list_messages(conversation_id, user_id, limit: limit) do
      {:ok, messages} ->
        signals =
          case ProductSignals.signals_for_conversation(conversation_id, user_id) do
            {:ok, s} -> s
            _ -> []
          end

        # Durable Opal history — survives refresh/logout (not recompute-only).
        chronology =
          case Chronology.list_for_viewer(conversation_id, user_id) do
            list when is_list(list) -> list
            {:error, _} -> []
            _ -> []
          end

        json(conn, %{
          "messages" => messages,
          "signals" => signals,
          "chronology" => chronology,
          "durable_chronology" => true
        })

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This connection is blocked")
    end
  end

  def mark_read(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    result =
      case params["server_seq"] do
        nil ->
          Messages.mark_read_to_latest(conversation_id, user_id)

        seq when is_integer(seq) ->
          Messages.mark_read(conversation_id, user_id, seq)

        seq when is_binary(seq) ->
          case Integer.parse(seq) do
            {n, _} -> Messages.mark_read(conversation_id, user_id, n)
            :error -> Messages.mark_read_to_latest(conversation_id, user_id)
          end

        _ ->
          Messages.mark_read_to_latest(conversation_id, user_id)
      end

    case result do
      {:ok, payload} ->
        json(conn, payload)

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This connection is blocked")

      {:error, _} ->
        error(conn, 422, "mark_read_failed", "Could not update read state")
    end
  end

  def create_message(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      conversation_id: conversation_id,
      sender_user_id: user_id,
      client_message_id:
        params["client_message_id"] || "http-#{System.unique_integer([:positive])}",
      message_type: params["message_type"] || "text",
      body: params["body"] || ""
    }

    case Messages.accept_message(attrs) do
      {:ok, %Message{} = message, origin} ->
        contract = Message.to_contract(message)

        # HTTP send is primary for product web; broadcast so Channel subscribers
        # receive the authoritative message without reloading (SF17).
        if origin == :created do
          OpalCoreWeb.Endpoint.broadcast(
            "conversation:#{conversation_id}",
            "message:new",
            %{
              "schema_version" => "0.1.0",
              "message" => contract,
              "trace_id" => "trace-http-product"
            }
          )
        end

        signals =
          case ProductSignals.signals_for_conversation(conversation_id, user_id) do
            {:ok, s} -> s
            _ -> []
          end

        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{
          "message" => contract,
          "origin" => to_string(origin),
          "signals" => signals
        })

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This connection is blocked")

      {:error, reason} ->
        error(conn, 422, "message_failed", inspect(reason))
    end
  end

  def private_participation(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    case PrivateParticipation.record(%{
           conversation_id: conversation_id,
           user_id: user_id,
           response_key: params["response_key"] || params["response"],
           proposal_key: params["proposal_key"] || "default"
         }) do
      {:ok, shared_safe} ->
        PrivateParticipation.assert_shared_safe!(shared_safe)

        # Shared-safe live update only — never response_key, user_id, or private reason.
        OpalCoreWeb.Endpoint.broadcast(
          "conversation:#{conversation_id}",
          "alignment:participation",
          %{
            "schema_version" => "0.1.0",
            "shared_safe" => shared_safe,
            "private_reason_hidden" => true
          }
        )

        # Never echo response_key or private reason to the client HTTP body either.
        json(conn, %{
          "shared_safe" => shared_safe,
          "private_reason_hidden" => true,
          "not_in_message_history" => true
        })

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :invalid_response} ->
        error(conn, 422, "invalid_response", "That answer is not available")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Please wait a moment and try again.")

      {:error, _} ->
        error(conn, 422, "participation_failed", "Could not save that answer")
    end
  end

  def block_peer(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    blocked = params["blocked_user_id"]

    case TrustSafety.create_block(%{
           blocker_user_id: user_id,
           blocked_user_id: blocked,
           conversation_id: conversation_id,
           scope: "relationship",
           idempotency_key: params["idempotency_key"]
         }) do
      {:ok, result, origin} ->
        json(conn, %{
          "blocked" => true,
          "block_id" => result.block.id,
          "origin" => to_string(origin)
        })

      {:error, :cannot_block_self} ->
        error(conn, 422, "cannot_block_self", "You cannot block yourself")

      {:error, reason} ->
        error(conn, 422, "block_failed", inspect(reason))
    end
  end

  @doc """
  Ensure a direct 1:1 conversation with peer_user_id (P31-PATCH-01).

  Body: `{ "peer_user_id": "..." }`
  Reuses existing dyad when present; never returns a multi-party group.
  """
  def ensure_direct(conn, params) do
    user_id = conn.assigns.current_user_id
    peer = params["peer_user_id"] || params["user_id"]

    cond do
      not is_binary(peer) or peer == "" ->
        error(conn, 422, "missing_peer_user_id", "peer_user_id is required")

      true ->
        case Messages.ensure_direct_conversation(user_id, peer) do
          {:ok, result} ->
            status = if result.origin == :created, do: 201, else: 200

            conn
            |> put_status(status)
            |> json(%{
              "conversation_id" => result.conversation_id,
              "member_ids" => result.member_ids,
              "member_count" => result.member_count,
              "composition" => "dyad",
              "origin" => to_string(result.origin),
              "direct" => true,
              "shared_group_must_not_widen_dyadic_invitation" => true
            })

          {:error, :self} ->
            error(conn, 422, "cannot_direct_self", "Cannot open a direct chat with yourself")

          {:error, :blocked} ->
            error(conn, 403, "blocked", "This connection is blocked")

          {:error, reason} ->
            error(conn, 422, "direct_ensure_failed", inspect(reason))
        end
    end
  end

  @doc """
  Create a multi-member conversation (3–8 members including creator).

  Body: `{ "member_user_ids": [...], "label"?: string }`
  Uses ConversationMember only — no parallel messaging system.
  """
  def create_group(conn, params) do
    user_id = conn.assigns.current_user_id
    member_ids = List.wrap(params["member_user_ids"] || params["member_ids"] || [])
    label = params["label"]

    opts = if is_binary(label) and label != "", do: [label: label], else: []

    case Messages.create_group_conversation(user_id, member_ids, opts) do
      {:ok, result} ->
        conn
        |> put_status(201)
        |> json(%{
          "conversation_id" => result.conversation_id,
          "member_ids" => result.member_ids,
          "member_count" => result.member_count,
          "composition" => "group"
        })

      {:error, :group_too_small} ->
        error(conn, 422, "group_too_small", "A group needs at least 3 people")

      {:error, :group_too_large} ->
        error(conn, 422, "group_too_large", "Groups are limited to 8 people")

      {:error, reason} ->
        error(conn, 422, "group_create_failed", inspect(reason))
    end
  end

  @doc """
  Add a member to an existing conversation. Actor must already be a member.
  """
  def add_member(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    new_user_id = params["user_id"] || params["member_user_id"]

    cond do
      not is_binary(new_user_id) or new_user_id == "" ->
        error(conn, 422, "missing_user_id", "user_id is required")

      true ->
        case Messages.add_conversation_member(conversation_id, user_id, new_user_id) do
          {:ok, _member, origin} ->
            members = Messages.member_user_ids(conversation_id)

            json(conn, %{
              "conversation_id" => conversation_id,
              "member_ids" => members,
              "member_count" => length(members),
              "origin" => to_string(origin),
              "composition" => if(length(members) >= 3, do: "group", else: "dyad")
            })

          {:error, :not_a_member} ->
            error(conn, 403, "not_a_member", "You are not in this conversation")

          {:error, reason} ->
            error(conn, 422, "add_member_failed", inspect(reason))
        end
    end
  end

  defp parse_limit(nil), do: 100

  defp parse_limit(v) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> min(max(n, 1), 200)
      :error -> 100
    end
  end

  defp parse_limit(v) when is_integer(v), do: min(max(v, 1), 200)
  defp parse_limit(_), do: 100

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
