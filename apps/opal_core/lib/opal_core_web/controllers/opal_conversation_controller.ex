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
  alias OpalCore.SocialFlow.PlanParticipant

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
  def list_sessions(conn, params) do
    user_id = conn.assigns.current_user_id
    # Repair #19 — ?person_id= narrows to that person's orbit only.
    # Repair #19 FIX-A (BS-09) — ?limit= / ?offset= page the bounded
    # sessions list server-side; the response shape is unchanged
    # ("conversations" is the page) with one additive field,
    # "sessions_total", carrying the unpaged total under the same
    # filters so the web log can page without guessing. No params =
    # the default page, exactly what existing clients already read.
    opts =
      case Map.get(params, "person_id") do
        id when is_binary(id) and id != "" -> [person_id: id]
        _ -> []
      end

    opts =
      opts
      |> maybe_page_opt(:limit, Map.get(params, "limit"))
      |> maybe_page_opt(:offset, Map.get(params, "offset"))

    json(conn, %{
      "conversations" => OpalConversations.list_sessions(user_id, opts),
      "sessions_total" => OpalConversations.count_sessions(user_id, opts)
    })
  end

  defp maybe_page_opt(opts, _key, value) when not is_binary(value), do: opts

  defp maybe_page_opt(opts, key, value) do
    case Integer.parse(value) do
      {n, ""} when n >= 0 -> Keyword.put(opts, key, n)
      _ -> opts
    end
  end

  @doc """
  Repair #19 (W14 + Orbits) — start a NEW Opal session scoped to a
  person (doorway / orbit-index birth; also the landing path for
  ingestion-born Opal chats). Body: {person_id, plan_id?,
  conversation_id?}. Scope mismatches are fail-closed 422
  invalid_scope; an unknown person is 404 (existence across
  accounts is never revealed).
  """
  def create_scoped_session(conn, params) do
    user_id = conn.assigns.current_user_id
    scope = Map.take(params, ["person_id", "plan_id", "conversation_id"])

    case OpalConversations.create_scoped_session(user_id, scope) do
      {:ok, %{conversation: c}} ->
        conn
        |> put_status(201)
        |> json(%{
          "ok" => true,
          "conversation" => OpalConversations.to_conversation_contract(c, [])
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid_scope"})
    end
  end

  @doc """
  Repair #19 (Orbits) — accept / redirect / clear the primary anchor
  of ONE of the caller's own sessions. Body: {anchor: {type, id,
  label?} | null}. Anchoring is an explicit user action only; this
  endpoint is its one write path.
  """
  def set_anchor(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.set_anchor(user_id, id, Map.get(params, "anchor")) do
      {:ok, conversation} ->
        json(conn, %{
          "ok" => true,
          "conversation" => OpalConversations.session_summary(user_id, conversation)
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid_anchor"})
    end
  end

  @doc """
  Repair #19 (Addition A clear-out) — remove ONE of the caller's own
  Opal sessions for real: messages + session row deleted; person
  threads, plans and graph records untouched.
  """
  def remove_session(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.remove_session(user_id, id) do
      {:ok, %{deleted_messages: n}} ->
        json(conn, %{"ok" => true, "removed" => true, "deleted_messages" => n})

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  Repair #19 (chrome) — pin/unpin one of the caller's own sessions.
  Body: {pinned: boolean}. The response is the updated session
  summary (the one sessions-list shape), so every listing re-renders
  from this single write.
  """
  def set_pinned(conn, %{"id" => id} = params) do
    chrome_write(conn, id, fn user_id ->
      OpalConversations.set_pinned(user_id, id, Map.get(params, "pinned") == true)
    end)
  end

  @doc """
  Repair #19 (chrome) — archive/unarchive one of the caller's own
  sessions. Body: {archived: boolean}. This is the ONE archive the
  overflow menu and the orbit sheet both use.
  """
  def set_archived(conn, %{"id" => id} = params) do
    chrome_write(conn, id, fn user_id ->
      OpalConversations.set_user_archived(user_id, id, Map.get(params, "archived") == true)
    end)
  end

  defp chrome_write(conn, _id, write) do
    user_id = conn.assigns.current_user_id

    case write.(user_id) do
      {:ok, conversation} ->
        json(conn, %{
          "ok" => true,
          "conversation" => OpalConversations.session_summary(user_id, conversation)
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  Repair #19 (Orbits privacy seam) — set the private flag for a
  whole orbit. Body: {anchor_type, anchor_id, private}. Stores the
  flag only; the item-9 verification gate is wired at integration.
  """
  def set_orbit_private(conn, params) do
    user_id = conn.assigns.current_user_id

    result =
      OpalConversations.set_orbit_private(
        user_id,
        Map.get(params, "anchor_type"),
        Map.get(params, "anchor_id"),
        Map.get(params, "private") == true
      )

    case result do
      {:ok, count} -> json(conn, %{"ok" => true, "updated" => count})
      {:error, _} -> conn |> put_status(422) |> json(%{"error_code" => "invalid_anchor"})
    end
  end

  @doc """
  Repair #19 FIX-A (BS-02) — verify the caller's graph-lock passcode
  to unlock ONE of the caller's own orbits. Body: {anchor_type,
  anchor_id, code}. Same response pattern as POST /opal/graph-lock/
  verify (200 unlocked:true; 403 wrong code), plus the orbit scope:
  an orbit the caller does not hold is a 404 — another account's
  orbit can never be unlocked, or probed, by this verification.
  The passcode is the ONE graph lock (GraphLock); no orbit-specific
  code exists.
  """
  def verify_orbit_unlock(conn, params) do
    user_id = conn.assigns.current_user_id

    result =
      OpalConversations.verify_orbit_unlock(
        user_id,
        Map.get(params, "anchor_type"),
        Map.get(params, "anchor_id"),
        Map.get(params, "code")
      )

    case result do
      :ok ->
        json(conn, %{
          "unlocked" => true,
          "anchor_type" => Map.get(params, "anchor_type"),
          "anchor_id" => Map.get(params, "anchor_id")
        })

      {:error, :not_found} ->
        conn
        |> put_status(404)
        |> json(%{"unlocked" => false, "error_code" => "not_found", "error" => "not_found"})

      {:error, :wrong_code} ->
        conn |> put_status(403) |> json(%{"unlocked" => false, "error" => "wrong_code"})

      {:error, _} ->
        conn |> put_status(422) |> json(%{"unlocked" => false, "error_code" => "invalid_anchor"})
    end
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
  Repair #18 (G-IA3) - rename one of the caller's own Opal sessions.
  Foreign/unknown ids → 404. The response carries the updated session
  summary in the same shape the sessions list uses, so the client can
  re-render without a second fetch.
  """
  def rename_session(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case OpalConversations.rename_conversation(user_id, id, Map.get(params, "title")) do
      {:ok, conversation} ->
        json(conn, %{
          "ok" => true,
          "conversation" => OpalConversations.session_summary(user_id, conversation)
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, :empty_title} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "errors" => %{"title" => ["can't be blank"]}})

      {:error, :title_too_long} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid",
          "errors" => %{
            "title" => [
              "should be at most #{OpalCore.OpalConversations.OpalConversation.max_title()} character(s)"
            ]
          }
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "errors" => %{"title" => ["is invalid"]}})
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
        |> json(%{
          "error_code" => "invalid",
          "errors" => %{"body" => ["must be valid UTF-8 text"]}
        })

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
        # Repair #18 (A-center) - same explicit not-sent shape as the
        # human-thread send path: nothing was stored, tap to retry.
        conn
        |> put_status(429)
        |> json(%{
          "error_code" => "rate_limited",
          "message" => "Too many messages. Your message was not sent - try again shortly.",
          "sent" => false,
          "retryable" => true,
          "client_action" => "retry_send"
        })

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
          "plan" => SocialFlow.plan_payload(plan),
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
          "plan" => SocialFlow.plan_payload(plan),
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
          "message" =>
            "Plans are visible only to the people in them - that audience isn't available for a plan."
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

  @doc """
  Repair #18 (Walk #4, W4-04) — edit ONE plan's title / core details.

  PATCH /api/v1/product/opal/plans/:id with any of
  `{title, location, caption}`. The write flows through
  SocialFlow.edit_plan_details/1 (PlanTransition :edit gate, lead-only
  authority, validated inputs, one atomic row write). The response
  carries the updated plan in the SAME plan_payload shape the listing
  uses, so the client re-renders from it with no second fetch — the
  conversation-rename precedent. Unknown or foreign plan ids → 404
  (existence is never revealed across accounts); a participant
  without lead rights → 403 not_authorized; schedule-bearing fields
  → 422 schedule_field_requires_revision (schedule changes are
  revisions, not edits); terminal plans → 422 invalid_status.
  """
  @doc """
  Repair #18 fix wave — cancel ONE plan over HTTP.

  POST /api/v1/product/opal/plans/:id/cancel with an empty body (no
  fields are read). The write flows through SocialFlow.cancel_plan/1:
  the ONE SharedPlan row transitions to "cancelled" through the
  PlanTransition :cancel gate (legal only from tentative / agreed /
  changed), so every surface that reads the row — the plans list,
  plan detail, thread alignment, the chats-list projection — reads
  the cancellation back identically.

  Authority (the gate's own law): the plan's lead or co_lead
  (creator fallback where no lead row exists) cancels directly.
  Responses follow the PATCH edit conventions in this controller:
  success 200 `{"ok": true, "plan": <plan_payload>}` (the cancelled
  row, status "cancelled"); unknown or foreign plan ids → 404
  not_found (existence is never revealed across accounts); a
  participant without lead rights → 403 not_authorized; an already
  cancelled plan → 409 already_cancelled; a terminal plan the gate
  refuses (completed / expired) → 422 illegal_transition.
  """
  def cancel_plan(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    result =
      SocialFlow.cancel_plan(%{
        plan_id: id,
        user_id: user_id,
        trace_id: "trace-plan-cancel-1"
      })

    case result do
      {:ok, %{plan: plan}} ->
        json(conn, %{"ok" => true, "plan" => SocialFlow.plan_payload(plan)})

      {:error, :not_found} ->
        not_found(conn)

      {:error, :not_a_member} ->
        not_found(conn)

      {:error, :not_authorized} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "not_authorized",
          "message" => "Only the plan's lead can cancel it."
        })

      {:error, :already_cancelled} ->
        conn
        |> put_status(409)
        |> json(%{
          "error_code" => "already_cancelled",
          "message" => "That plan is already cancelled."
        })

      {:error, :illegal_transition} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "illegal_transition",
          "message" => "A finished plan can't be cancelled."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc """
  I2 etiquette wiring - set a creator-opt-in response window on one
  pending invitation of one of the caller's plans.

  POST /api/v1/product/opal/plans/:id/response-window
       body { recipient_id, window_seconds }
       -> 200 { ok, plan } where plan is the SAME plan_payload the
          listing serves, now carrying the per-viewer etiquette
          projection with the window set.

  Gates are the etiquette machinery's own (creator-only, the P14
  relationship gate at set time, the consequential/mode gate, the
  1-hour to 14-day dosed bounds) - this action translates them, it
  does not re-decide them. Every refusal carries the machinery's
  finished plain line in "message" - never a silent drop: unknown or
  foreign plans 404; a non-creator on the plan 403; gate refusals
  422 with the gate's own words.
  """
  def set_response_window(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    recipient_id = Map.get(params, "recipient_id")
    window_seconds = Map.get(params, "window_seconds")

    result =
      if is_binary(recipient_id) do
        SocialFlow.set_plan_response_window(%{
          plan_id: id,
          user_id: user_id,
          recipient_id: recipient_id,
          window_seconds: window_seconds
        })
      else
        {:error, :not_found}
      end

    case result do
      {:ok, plan} ->
        json(conn, %{"ok" => true, "plan" => SocialFlow.plan_payload(plan, user_id)})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        line =
          OpalCore.SocialFlow.NonResponseEtiquette.window_refusal_line(
            id,
            user_id,
            recipient_id,
            reason
          )

        status = if reason == :not_creator, do: 403, else: 422

        conn
        |> put_status(status)
        |> json(%{"error_code" => Atom.to_string(reason), "message" => line})
    end
  end

  @doc """
  I2 etiquette wiring - answer an etiquette fork or escalation for
  one of the caller's plans.

  POST /api/v1/product/opal/plans/:id/etiquette/respond
       body { action } - "decline" / "ask_another_time" (the
       recipient's fork answers) or "nudge_again" / "extend" /
       "let_it_go" (the requester's escalation answers)
       -> 200 { ok, plan, outcome } with the updated plan contract.

  The machinery decides whose answer an action is and whether that
  answer is the caller's to give; a foreign plan is 404, an answer
  that belongs to someone else is 403 with a plain line, and an
  answer with nothing waiting behind it is 422 with a plain line.
  """
  def respond_etiquette(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    action = Map.get(params, "action")

    result =
      if is_binary(action) do
        SocialFlow.respond_to_plan_etiquette(%{
          plan_id: id,
          user_id: user_id,
          action: action
        })
      else
        {:error, :invalid_action}
      end

    alias OpalCore.SocialFlow.NonResponseEtiquette

    case result do
      {:ok, plan, outcome} ->
        json(conn, %{
          "ok" => true,
          "plan" => SocialFlow.plan_payload(plan, user_id),
          "outcome" => Atom.to_string(outcome)
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, :forbidden} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "forbidden",
          "message" => NonResponseEtiquette.respond_not_yours_copy()
        })

      {:error, :not_escalated} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "not_escalated",
          "message" => NonResponseEtiquette.respond_nothing_waiting_copy()
        })

      {:error, :invalid_action} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_action",
          "message" => NonResponseEtiquette.respond_nothing_waiting_copy()
        })

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def edit_plan(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    changes =
      Map.take(params, [
        "title",
        "location",
        "caption",
        "time_label",
        "date_label",
        "start_at",
        "end_at"
      ])

    result =
      SocialFlow.edit_plan_details(%{
        plan_id: id,
        user_id: user_id,
        changes: changes,
        trace_id: "trace-plan-edit-1"
      })

    case result do
      {:ok, %{plan: plan}} ->
        json(conn, %{"ok" => true, "plan" => SocialFlow.plan_payload(plan)})

      {:error, :not_found} ->
        not_found(conn)

      {:error, :not_a_member} ->
        not_found(conn)

      {:error, :not_authorized} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "not_authorized",
          "message" => "Only the plan's lead can edit its details."
        })

      {:error, :empty_title} ->
        field_error(conn, "title", "can't be blank")

      {:error, :title_too_long} ->
        field_error(
          conn,
          "title",
          "should be at most #{SocialFlow.plan_edit_title_max()} character(s)"
        )

      {:error, :invalid_title} ->
        field_error(conn, "title", "is invalid")

      {:error, :empty_location} ->
        field_error(conn, "location", "can't be blank")

      {:error, :location_too_long} ->
        field_error(
          conn,
          "location",
          "should be at most #{SocialFlow.plan_edit_location_max()} character(s)"
        )

      {:error, :invalid_location} ->
        field_error(conn, "location", "is invalid")

      {:error, :location_not_editable} ->
        field_error(conn, "location", "can't be changed for an online plan")

      {:error, :caption_too_long} ->
        field_error(
          conn,
          "caption",
          "should be at most #{SocialFlow.plan_edit_caption_max()} character(s)"
        )

      {:error, :invalid_caption} ->
        field_error(conn, "caption", "is invalid")

      {:error, :schedule_field_requires_revision} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "schedule_field_requires_revision",
          "message" =>
            "Changing when a plan happens is a revision, not an edit - propose the new time so the plan's people can confirm it."
        })

      {:error, :invalid_status} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_status",
          "message" => "A finished or cancelled plan can't be edited."
        })

      {:error, :no_changes} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "no_changes",
          "message" => "Nothing to change - send a title, location or caption."
        })

      {:error, :unknown_field} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "unknown_field",
          "message" => "Only title, location and caption can be edited here."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  defp field_error(conn, field, message) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => "invalid", "errors" => %{field => [message]}})
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
