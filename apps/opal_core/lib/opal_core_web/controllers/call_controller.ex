defmodule OpalCoreWeb.CallController do
  use OpalCoreWeb, :controller

  alias OpalCore.Calls
  alias OpalCore.Calls.Assist
  alias OpalCore.Calls.Outcomes

  def index(conn, _params) do
    calls = Calls.list_for(conn.assigns.current_user_id)
    json(conn, %{"calls" => calls})
  end

  def mark_connected(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Calls.mark_media_connected(id, user_id) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not a participant")
      {:error, :invalid_state} -> error(conn, 409, "invalid_state", "Call is not answered")
      {:error, reason} -> error(conn, 422, "call_failed", to_string(reason))
    end
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    conversation_id = params["conversation_id"]

    result =
      if is_binary(conversation_id) and conversation_id != "" do
        Calls.invite_in_conversation(user_id, conversation_id, params)
      else
        Calls.invite(user_id, params)
      end

    case result do
      {:ok, session} ->
        conn
        |> put_status(201)
        |> json(%{"call" => public(session)})

      {:error, :invalid_callee} ->
        error(conn, 422, "invalid_callee", "Choose someone to call")

      {:error, :cannot_call_self} ->
        error(conn, 422, "cannot_call_self", "You can’t call yourself")

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :not_direct} ->
        error(conn, 422, "not_direct", "This call is for a conversation between two people")

      {:error, :callee_rejected} ->
        error(conn, 422, "callee_rejected", "That person is not the other member of this conversation")

      {:error, :busy} ->
        error(conn, 409, "busy", "Busy")

      {:error, {:consent, reason}} ->
        error(conn, 403, "consent_required", "Act-on-behalf consent required (#{inspect(reason)})")

      {:error, reason} when is_atom(reason) ->
        error(conn, 422, "call_failed", Atom.to_string(reason))

      {:error, reason} ->
        error(conn, 422, "call_failed", inspect(reason))
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Calls.get(id, user_id) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not a participant")
    end
  end

  def outcomes(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Calls.get(id, user_id) do
      {:ok, _session} ->
        json(conn, %{"outcomes" => Outcomes.list_for_call(id)})

      {:error, :not_found} ->
        error(conn, 404, "not_found", "Call not found")

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "Not a participant")
    end
  end

  def answer(conn, %{"id" => id}) do
    transition(conn, id, &Calls.answer/2)
  end

  def decline(conn, %{"id" => id}) do
    transition(conn, id, &Calls.decline/2)
  end

  def cancel(conn, %{"id" => id}) do
    transition(conn, id, &Calls.cancel/2)
  end

  def hangup(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    reason = params["reason"] || "hangup"

    case Calls.end_call_session(id, user_id, reason) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not a participant")
      {:error, :invalid_state} -> error(conn, 409, "invalid_state", "Call can’t be ended from this state")
      {:error, reason} -> error(conn, 422, "call_failed", to_string(reason))
    end
  end

  defp transition(conn, id, fun) do
    user_id = conn.assigns.current_user_id

    case fun.(id, user_id) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not allowed")
      {:error, :invalid_state} -> error(conn, 409, "invalid_state", "Call state doesn’t allow that")
      {:error, reason} -> error(conn, 422, "call_failed", to_string(reason))
    end
  end

  def assist(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Assist.state(id, user_id) do
      {:ok, view} -> json(conn, assist_json(view))
      {:error, reason} -> assist_error(conn, reason)
    end
  end

  def set_assist(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    allowed = params["allowed"] in [true, "true"]
    scope = if params["scope"] == "account", do: "account", else: "call"

    case Assist.set_allowed(id, user_id, allowed, scope) do
      {:ok, view} -> json(conn, assist_json(view))
      {:error, reason} -> assist_error(conn, reason)
    end
  end

  defp assist_json(view) do
    %{
      "assist" => Atom.to_string(view.assist),
      "account_default" => view.account_default,
      "self_allowed" => view.self_allowed,
      "self_paused" => view.self_paused
    }
  end

  def transcription_grant(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Assist.grant(id, user_id) do
      {:ok, grant} ->
        json(conn, %{
          "access_token" => grant.access_token,
          "expires_in" => grant.expires_in
        })

      {:error, reason} ->
        assist_error(conn, reason)
    end
  end

  def transcript(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case Assist.accept_transcript(id, user_id, params) do
      {:ok, result} ->
        json(conn, %{
          "persisted" => result.persisted,
          "folded" => result.folded,
          "segment_id" => Map.get(result, :segment_id)
        })

      {:error, reason} ->
        assist_error(conn, reason)
    end
  end

  defp assist_error(conn, :not_found), do: error(conn, 404, "not_found", "Call not found")
  defp assist_error(conn, :forbidden), do: error(conn, 403, "forbidden", "Not a participant")
  defp assist_error(conn, :not_connected), do: error(conn, 409, "not_connected", "Assist is only available on a connected call")
  defp assist_error(conn, :assist_inactive), do: error(conn, 409, "assist_inactive", "Both people need to turn Assist on")
  defp assist_error(conn, :not_configured), do: error(conn, 503, "transcription_unavailable", "Transcription is unavailable")
  defp assist_error(conn, :provider_unavailable), do: error(conn, 503, "transcription_unavailable", "Transcription is unavailable")
  defp assist_error(conn, :invalid), do: error(conn, 422, "invalid", "Transcript segment is incomplete")
  defp assist_error(conn, reason), do: error(conn, 422, "assist_failed", to_string(reason))

  defp public(s) do
    %{
      "id" => s.id,
      "caller_user_id" => s.caller_user_id,
      "callee_user_id" => s.callee_user_id,
      "conversation_id" => s.conversation_id,
      "status" => s.status,
      "ended_reason" => s.ended_reason,
      "correlation_id" => s.correlation_id,
      "ringing_at" => s.ringing_at,
      "answered_at" => s.answered_at,
      "ended_at" => s.ended_at,
      "media_connected_at" => s.media_connected_at,
      "history_label" => Calls.history_label(s)
    }
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{
      "error_code" => code,
      "message" => message,
      "error" => %{"code" => code, "message" => message}
    })
  end
end
