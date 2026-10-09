defmodule OpalCoreWeb.OpalConversationController do
  @moduledoc """
  Phase OC-1 — Opal Center conversational shell API.

  GET  /api/v1/product/opal/conversation
  POST /api/v1/product/opal/conversation/messages
  POST /api/v1/product/opal/plans — Paste J Phase 1 Center "Go with this"
  """

  use OpalCoreWeb, :controller

  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.get_or_create_conversation(user_id) do
      {:ok, conversation} ->
        messages = OpalConversations.list_messages(conversation.id)

        json(conn, %{
          "conversation" => OpalConversations.to_conversation_contract(conversation, messages)
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def create_message(conn, params) do
    user_id = conn.assigns.current_user_id
    body = Map.get(params, "body")

    # Optional conversation_id: if present and foreign → 404 (auth isolation).
    case Map.get(params, "conversation_id") do
      id when is_binary(id) and id != "" ->
        case OpalConversations.get_conversation_for_user(user_id, id) do
          {:ok, _} -> do_create_message(conn, user_id, body)
          {:error, :not_found} -> not_found(conn)
        end

      _ ->
        do_create_message(conn, user_id, body)
    end
  end

  defp do_create_message(conn, user_id, body) when is_binary(body) do
    case OpalConversations.create_user_message(user_id, body) do
      {:ok, {_conversation, user_msg, opal_msg}} ->
        conn
        |> put_status(201)
        |> json(%{
          "messages" => [
            OpalConversations.to_message_contract(user_msg),
            OpalConversations.to_message_contract(opal_msg)
          ]
        })

      {:error, :empty_body} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "errors" => %{"body" => ["can't be blank"]}})

      {:error, :invalid_body} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "errors" => %{"body" => ["must be valid UTF-8 text"]}})

      {:error, :body_too_long} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid",
          "errors" => %{
            "body" => ["should be at most #{OpalMessage.max_body()} character(s)"]
          }
        })

      {:error, :rate_limited} ->
        conn
        |> put_status(429)
        |> json(%{"error_code" => "rate_limited", "message" => "Too many messages. Try again shortly."})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  defp do_create_message(conn, _user_id, _body) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => "invalid", "errors" => %{"body" => ["can't be blank"]}})
  end

  @doc """
  Paste J — create a durable solo SharedPlan from Center DI accept.
  Body: title (required), location/area/time_label/decision_id optional.
  """
  def create_plan(conn, params) do
    user_id = conn.assigns.current_user_id

    case SocialFlow.create_tentative_plan_from_center(user_id, params) do
      {:ok, plan, participants} ->
        conn
        |> put_status(201)
        |> json(%{
          "plan" => SharedPlan.to_contract(plan),
          "participants" => Enum.map(participants, &PlanParticipant.to_contract/1),
          "message" => "It's on your day. Invite someone when you're ready."
        })

      {:error, :invalid_title} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid_title", "message" => "title or place is required"})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" =>
        Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
          Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
            opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
          end)
        end)
    })
  end
end
