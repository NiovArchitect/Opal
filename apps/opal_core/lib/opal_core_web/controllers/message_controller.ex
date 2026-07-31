defmodule OpalCoreWeb.MessageController do
  use OpalCoreWeb, :controller

  alias OpalCore.{Contracts, Messages}
  alias OpalCore.Messaging.Message

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      conversation_id: params["conversation_id"],
      sender_user_id: user_id,
      client_message_id: params["client_message_id"],
      message_type: params["message_type"] || "text",
      body: params["body"] || "",
      source_language: params["source_language"]
    }

    case Messages.accept_message(attrs) do
      {:ok, %Message{} = message, origin} ->
        contract = Message.to_contract(message)

        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{"message" => contract, "origin" => to_string(origin)})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "User is not a conversation member")

      {:error, :conversation_not_found} ->
        error(conn, 404, "conversation_not_found", "Conversation not found")

      {:error, %Ecto.Changeset{} = cs} ->
        error(conn, 422, "invalid_message", inspect(cs.errors))

      {:error, reason} ->
        error(conn, 422, "message_error", inspect(reason))
    end
  end

  def create_ai_job(conn, %{"message_id" => message_id} = params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      message_id: message_id,
      requester_user_id: user_id,
      capability: params["capability"] || "ai_echo",
      consent_proof_id: params["consent_proof_id"],
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"]
    }

    case OpalCore.AI.request_job(attrs) do
      {:ok, job, origin} ->
        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 202))
        |> json(%{"job" => OpalCore.AI.job_to_api(job), "origin" => to_string(origin)})

      {:error, :message_not_found} ->
        error(conn, 404, "message_not_found", "Message not found for user")

      {:error, :not_found} ->
        error(conn, 403, "consent_not_found", "Consent proof not found")

      {:error, reason}
      when reason in [
             :denied,
             :revoked,
             :expired,
             :not_granted,
             :capability_mismatch,
             :user_mismatch,
             :conversation_mismatch,
             :policy_version_rejected
           ] ->
        error(conn, 403, "consent_#{reason}", "Consent validation failed: #{reason}")

      {:error, :capability_not_executable} ->
        error(conn, 422, "capability_not_executable", "Capability is not executable in Slice 1")

      {:error, :idempotency_conflict} ->
        error(conn, 409, "idempotency_conflict", "Idempotency key conflicts with another job")

      {:error, reason} ->
        error(conn, 422, "ai_job_error", inspect(reason))
    end
  end

  defp error(conn, status, code, message) do
    envelope =
      Contracts.error_envelope(code, message,
        trace_id: get_req_header(conn, "x-trace-id") |> List.first() || "trace-http-error-0001"
      )

    conn
    |> put_status(status)
    |> json(envelope)
  end
end
