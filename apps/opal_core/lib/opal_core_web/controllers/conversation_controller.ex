defmodule OpalCoreWeb.ConversationController do
  use OpalCoreWeb, :controller

  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
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

        json(conn, %{"messages" => messages, "signals" => signals})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This connection is blocked")
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
