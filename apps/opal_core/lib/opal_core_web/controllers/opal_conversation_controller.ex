defmodule OpalCoreWeb.OpalConversationController do
  @moduledoc """
  Phase OC-1 — Opal Center conversational shell API.

  GET  /api/v1/product/opal/conversation
  POST /api/v1/product/opal/conversation/messages
  POST /api/v1/product/opal/plans — Paste J Phase 1 Center "Go with this"
  GET  /api/v1/product/opal/plans — F12-06/07 owner-scoped plan listing
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
    client_context = Map.get(params, "client_context")

    # Optional conversation_id: if present and foreign → 404 (auth isolation).
    # Repair #17 (W4-7) — an owned session id targets that session (an
    # archived one is switched to first) instead of the active one.
    case Map.get(params, "conversation_id") do
      id when is_binary(id) and id != "" ->
        case OpalConversations.get_conversation_for_user(user_id, id) do
          {:ok, _} -> do_create_message(conn, user_id, body, client_context, id)
          {:error, :not_found} -> not_found(conn)
        end

      _ ->
        do_create_message(conn, user_id, body, client_context, nil)
    end
  end

  @doc """
  Repair #17 (W4-7) — list the caller's Opal chat sessions (active first).
  Owner-scoped: only the caller's own sessions are ever returned.
  """
  def list_sessions(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, %{"conversations" => OpalConversations.list_sessions(user_id)})
  end

  @doc """
  Repair #17 (W4-7) — switch the active Opal session to one of the
  caller's own sessions. Foreign/unknown ids → 404.
  """
  def switch_session(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.switch_conversation(user_id, id) do
      {:ok, conversation} ->
        messages = OpalConversations.list_messages(conversation.id)

        json(conn, %{
          "ok" => true,
          "conversation" => OpalConversations.to_conversation_contract(conversation, messages)
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  New Chat — clear visible Center history + transient planning.
  SharedPlans / Graph / human chats are preserved.
  """
  def new_chat(conn, _params) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.start_new_chat(user_id) do
      {:ok, %{conversation: c, deleted_messages: n}} ->
        json(conn, %{
          "ok" => true,
          "cleared" => true,
          "deleted_messages" => n,
          "conversation" => OpalConversations.to_conversation_contract(c, [])
        })

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  Clear Conversation — same durable retention rules as New Chat.
  With a `conversation_id` param, clears that one of the caller's own
  sessions (Repair #17, W4-7); foreign/unknown ids → 404.
  """
  def clear_conversation(conn, params) do
    user_id = conn.assigns.current_user_id

    result =
      case Map.get(params, "conversation_id") do
        id when is_binary(id) and id != "" ->
          OpalConversations.clear_conversation_by_id(user_id, id)

        _ ->
          OpalConversations.clear_visible_conversation(user_id)
      end

    case result do
      {:ok, %{conversation: c, deleted_messages: n}} ->
        json(conn, %{
          "ok" => true,
          "cleared" => true,
          "deleted_messages" => n,
          "conversation" => OpalConversations.to_conversation_contract(c, [])
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  defp do_create_message(conn, user_id, body, client_context, conversation_id)
       when is_binary(body) do
    opts =
      if is_map(client_context) do
        [client_context: client_context]
      else
        []
      end

    opts =
      if is_binary(conversation_id),
        do: Keyword.put(opts, :conversation_id, conversation_id),
        else: opts

    # Repair #13 (W4-3) — client-supplied idempotency key; duplicate POSTs
    # return the original pair instead of duplicating the turn.
    opts =
      case conn.params["client_message_id"] do
        id when is_binary(id) and id != "" -> Keyword.put(opts, :client_message_id, id)
        _ -> opts
      end

    case OpalConversations.create_user_message(user_id, body, opts) do
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

  defp do_create_message(conn, _user_id, _body, _client_context, _conversation_id) do
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
        # F12-05 — drive to completion: calendar, restaurant discovery (when
        # no venue chosen), ride/directions next-steps.
        completion =
          case SocialFlow.PlanCompletion.drive(plan.id, user_id) do
            {:ok, c} -> c
            _ -> %{plan_id: plan.id, steps: []}
          end

        conn
        |> put_status(201)
        |> json(%{
          "plan" => SharedPlan.to_contract(plan),
          "participants" => Enum.map(participants, &PlanParticipant.to_contract/1),
          "completion" => %{
            "steps" => completion.steps,
            "next_steps" => next_step_copies(completion.steps)
          },
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

  @doc """
  Repair #16 (W1) — durable GraphCreateFlow completion.

  POST /api/v1/product/opal/plans/graph-create — persists the non-post
  graph draft (Graphs / Repeat / plan-from-chat) as a SharedPlan through
  SocialFlow.create_plan_from_graph_create/2, the same plan authority
  Center uses. Before this, those drafts landed in write-only web state
  and vanished. A replay with the same idempotency_key returns the
  existing plan with "deduplicated": true instead of a duplicate.
  """
  def create_graph_plan(conn, params) do
    user_id = conn.assigns.current_user_id

    case SocialFlow.create_plan_from_graph_create(user_id, params) do
      {:ok, plan, participants, deduplicated} ->
        completion =
          case SocialFlow.PlanCompletion.drive(plan.id, user_id) do
            {:ok, c} -> c
            _ -> %{plan_id: plan.id, steps: []}
          end

        conn
        |> put_status(201)
        |> json(%{
          "plan" => SharedPlan.to_contract(plan),
          "participants" => Enum.map(participants, &PlanParticipant.to_contract/1),
          "deduplicated" => deduplicated,
          "completion" => %{
            "steps" => completion.steps,
            "next_steps" => next_step_copies(completion.steps)
          },
          "message" => "It's on your Graph."
        })

      {:error, :invalid_title} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid_title", "message" => "title or place is required"})

      {:error, :unsupported_audience} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "unsupported_audience",
          "message" => "Plans are visible only to the people in them - that audience isn't available for a plan."
        })

      {:error, :invalid_media} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_media",
          "message" => "That photo can't be attached to this plan."
        })

      {:error, :invalid_participant} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_participant",
          "message" => "One of the people on this plan couldn't be found."
        })

      {:error, :source_plan_not_found} ->
        conn
        |> put_status(404)
        |> json(%{
          "error_code" => "source_plan_not_found",
          "message" => "The plan you're repeating couldn't be found."
        })

      {:error, :forbidden} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "forbidden",
          "message" => "You can't repeat a plan you aren't part of."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  F12-06/F12-07 — owner-scoped plan listing for Graphs/Timeline projections.

  GET /api/v1/product/opal/plans — returns the caller's SharedPlans including
  conversation-less Center plans (source "center"), newest first. Cancelled
  plans excluded unless `?status=all`.
  """
  def list_plans(conn, params) do
    user_id = conn.assigns.current_user_id
    opts = if params["status"] == "all", do: [status: :all], else: []

    case SocialFlow.list_plans_for_user(user_id, opts) do
      {:ok, plans} ->
        json(conn, %{"plans" => plans})

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  # F12-05 — surface the completion driver's suggested asks/offers.
  defp next_step_copies(steps) when is_list(steps) do
    steps
    |> Enum.filter(&(&1["status"] == "suggested" and is_binary(&1["copy"])))
    |> Enum.map(& &1["copy"])
  end

  defp next_step_copies(_), do: []

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
