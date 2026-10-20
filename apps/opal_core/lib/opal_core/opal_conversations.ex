defmodule OpalCore.OpalConversations do
  @moduledoc """
  Opal Center conversational shell (one conversation per user).

  POST flow: user message → OC-2 context → OC-3 intent → OC-4 response.
  """

  import Ecto.Query

  alias OpalCore.OpalContext
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.OpalIntent
  alias OpalCore.OpalResponse
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RateLimitBucket
  alias OpalCore.TrustTiers

  @message_limit 50

  @doc "Get or create the user's single active Opal conversation."
  def get_or_create_conversation(user_id) when is_binary(user_id) do
    case Repo.one(OpalConversation.active_query(user_id)) do
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
            # Race: one-active partial unique index — re-fetch winner.
            if Keyword.has_key?(errors, :user_id) do
              case Repo.one(OpalConversation.active_query(user_id)) do
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

  @doc "The user's active Opal session, or nil."
  def get_active_conversation(user_id) when is_binary(user_id) do
    Repo.one(OpalConversation.active_query(user_id))
  end

  def get_active_conversation(_), do: nil

  # --- Repair #17 (W4-7): Opal chat sessions --------------------------------

  @doc """
  List the user's Opal chat sessions (active first, then most recently
  updated), each as a conversation contract plus "message_count" and
  "active". Owner-scoped by construction: the query is keyed on user_id.
  """
  def list_sessions(user_id), do: list_sessions(user_id, [])

  # Repair #19 FIX-A (BS-09) — the sessions payload is bounded:
  # at most this many session rows cross the wire per call (the
  # Center log / rail / orbit index pages with :limit + :offset).
  @sessions_default_limit 200
  @sessions_max_limit 500

  def sessions_default_limit, do: @sessions_default_limit

  @doc """
  Sessions list with Repair #19 filters. Opts:
  - `:person_id` — only sessions scoped to exactly that person (the
    person-orbit index query; equality on the session's own scope,
    never a looser match).
  - `:limit` / `:offset` — BS-09 bound: server-side pagination over
    the sessions ordering (active first, then most recently
    updated). Default limit #{@sessions_default_limit}, clamped to
    #{@sessions_max_limit}; the unfiltered total is available from
    `count_sessions/2` so a client can page without guessing.
  """
  def list_sessions(user_id, opts) when is_binary(user_id) and is_list(opts) do
    limit = sessions_limit(opts)
    offset = sessions_offset(opts)

    query =
      user_id
      |> sessions_base_query(opts)
      |> limit(^limit)
      |> offset(^offset)

    sessions = Repo.all(query)

    counts =
      from(m in OpalMessage,
        where: m.conversation_id in ^Enum.map(sessions, & &1.id),
        group_by: m.conversation_id,
        select: {m.conversation_id, count(m.id)}
      )
      |> Repo.all()
      |> Map.new()

    previews = last_message_previews(Enum.map(sessions, & &1.id))

    Enum.map(sessions, fn c ->
      c
      |> OpalConversation.to_contract([])
      |> Map.delete("messages")
      |> Map.put("message_count", Map.get(counts, c.id, 0))
      |> Map.put("last_message_preview", Map.get(previews, c.id))
      |> Map.put("active", is_nil(c.archived_at))
      |> with_live_context_names(user_id)
    end)
  end

  def list_sessions(_, _), do: []

  @doc """
  Total number of the user's sessions under the same filters
  `list_sessions/2` accepts (`:person_id`) — the pagination total
  the bounded list is a page of (BS-09).
  """
  def count_sessions(user_id, opts \\ [])

  def count_sessions(user_id, opts) when is_binary(user_id) and is_list(opts) do
    user_id
    |> sessions_base_query(opts)
    |> Repo.aggregate(:count, :id)
  end

  def count_sessions(_, _), do: 0

  defp sessions_base_query(user_id, opts) do
    base =
      case Keyword.get(opts, :person_id) do
        person_id when is_binary(person_id) and person_id != "" ->
          from(c in OpalConversation.sessions_query(user_id),
            where: c.context_person_id == ^person_id
          )

        _ ->
          OpalConversation.sessions_query(user_id)
      end

    case Keyword.get(opts, :conversation_id) do
      conversation_id when is_binary(conversation_id) and conversation_id != "" ->
        from(c in base, where: c.id == ^conversation_id)

      _ ->
        base
    end
  end

  defp sessions_limit(opts) do
    case Keyword.get(opts, :limit) do
      n when is_integer(n) and n > 0 -> min(n, @sessions_max_limit)
      _ -> @sessions_default_limit
    end
  end

  defp sessions_offset(opts) do
    case Keyword.get(opts, :offset) do
      n when is_integer(n) and n >= 0 -> n
      _ -> 0
    end
  end

  # BS-09 — last-message preview per session, bounded in SQL: a
  # row_number() window picks exactly ONE row per conversation and
  # `left(ltrim(body), 81)` ships at most the characters the preview
  # can display (session_preview/1 needs 80 + the ellipsis decision).
  # The old query selected EVERY message body in EVERY conversation
  # and reduced in memory — a full-history body scan per list open.
  defp last_message_previews([]), do: %{}

  defp last_message_previews(conversation_ids) do
    ranked =
      from(m in OpalMessage,
        where: m.conversation_id in ^conversation_ids,
        select: %{
          conversation_id: m.conversation_id,
          preview: fragment("left(ltrim(?), 81)", m.body),
          rn:
            row_number()
            |> over(
              partition_by: m.conversation_id,
              order_by: [desc: m.inserted_at, desc: m.id]
            )
        }
      )

    from(r in subquery(ranked),
      where: r.rn == 1,
      select: {r.conversation_id, r.preview}
    )
    |> Repo.all()
    |> Map.new(fn {cid, body} -> {cid, session_preview(body)} end)
  end

  # Repair #19 — fill the context/anchor display names LIVE from the
  # records they name (the person record, the plan row through the
  # sanctioned plan reader), so a renamed person or retitled plan
  # reads correctly on every scoped surface. Place anchors keep their
  # stored label (no owner-side place record exists to derive from).
  defp with_live_context_names(contract, user_id) do
    context = contract["context"]
    anchor = contract["anchor"]

    person_name =
      case context do
        %{"person_id" => pid} when is_binary(pid) -> user_display_name(pid)
        _ -> nil
      end

    plan_title =
      case context do
        %{"plan_id" => pid} when is_binary(pid) -> plan_title_for(user_id, pid)
        _ -> nil
      end

    # Repair #20 (F-19): a conversation-scoped context names its
    # party live — the thread's other members, from the membership
    # records themselves (never a stored snapshot of names).
    party =
      case context do
        %{"conversation_id" => cid} when is_binary(cid) ->
          cid
          |> OpalCore.Messages.member_user_ids()
          |> Enum.reject(&(&1 == user_id))
          |> Enum.map(fn member_id ->
            %{"id" => member_id, "display_name" => user_display_name(member_id)}
          end)

        _ ->
          nil
      end

    contract
    |> then(fn c ->
      if is_map(context) do
        Map.put(
          c,
          "context",
          context
          |> Map.put("person_name", person_name || context["person_name"])
          |> Map.put("plan_title", plan_title || context["plan_title"])
          |> Map.put("party", party || context["party"])
        )
      else
        c
      end
    end)
    |> then(fn c ->
      if is_map(anchor) do
        label =
          case anchor["type"] do
            "person" -> person_name || anchor["label"]
            "plan" -> plan_title || anchor["label"]
            _ -> anchor["label"]
          end

        Map.put(c, "anchor", Map.put(anchor, "label", label))
      else
        c
      end
    end)
  end

  defp user_display_name(user_id) do
    case Repo.get(OpalCore.Accounts.User, user_id) do
      %OpalCore.Accounts.User{display_name: name} when is_binary(name) -> name
      _ -> nil
    end
  rescue
    Ecto.Query.CastError -> nil
  end

  defp plan_title_for(user_id, plan_id) do
    case OpalCore.SocialFlow.get_plan_for_user(plan_id, user_id) do
      {:ok, plan} -> plan.title
      _ -> nil
    end
  end

  @doc """
  One of the user's sessions in the exact shape `list_sessions/1`
  returns (contract plus "message_count", "last_message_preview" and
  "active"), or nil when the user holds no such session.
  """
  def session_summary(user_id, %OpalConversation{id: id}),
    do: session_summary(user_id, id)

  def session_summary(user_id, conversation_id)
      when is_binary(user_id) and is_binary(conversation_id) do
    # BS-09: fetch the ONE session through the bounded list path
    # (filtered to this id) instead of paging the whole list in —
    # a summary must stay correct even past the list's page bound.
    user_id
    |> list_sessions(conversation_id: conversation_id)
    |> Enum.find(&(&1["id"] == conversation_id))
  end

  def session_summary(_, _), do: nil

  @doc """
  Rename ONE of the user's own Opal sessions (Repair #18, G-IA3): the
  Center chat header shows the conversation title, and this is the
  write path for it. Foreign or unknown ids → {:error, :not_found}
  (existence is never revealed across accounts). The title is trimmed;
  empty after trim → {:error, :empty_title}; longer than the schema
  title limit (`OpalConversation.max_title/0`) →
  {:error, :title_too_long}; a non-string title → {:error, :invalid_title}.
  """
  def rename_conversation(user_id, conversation_id, title)
      when is_binary(user_id) and is_binary(conversation_id) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id),
         {:ok, trimmed} <- validate_title(title) do
      conversation
      |> Ecto.Changeset.change(%{
        title: trimmed,
        updated_at: DateTime.utc_now(:microsecond)
      })
      |> Repo.update()
    end
  end

  def rename_conversation(_, _, _), do: {:error, :not_found}

  defp validate_title(title) when is_binary(title) do
    trimmed = String.trim(title)

    cond do
      trimmed == "" -> {:error, :empty_title}
      not String.valid?(trimmed) -> {:error, :invalid_title}
      String.length(trimmed) > OpalConversation.max_title() -> {:error, :title_too_long}
      true -> {:ok, trimmed}
    end
  end

  defp validate_title(_), do: {:error, :invalid_title}

  defp session_preview(body) when is_binary(body) do
    trimmed = String.trim(body)
    if String.length(trimmed) > 80, do: String.slice(trimmed, 0, 80) <> "…", else: trimmed
  end

  defp session_preview(_), do: nil

  @doc """
  Switch the active Opal session to one of the user's own archived
  sessions: the current active session is archived (retained) and the
  target is reactivated. Foreign or unknown ids → {:error, :not_found}
  (existence is never revealed across accounts).

  Idempotent (Repair #18): switching to the already-active session is a
  no-op success with zero writes.
  """
  def switch_conversation(user_id, conversation_id)
      when is_binary(user_id) and is_binary(conversation_id) do
    with {:ok, target} <- get_conversation_for_user(user_id, conversation_id) do
      case Repo.one(OpalConversation.active_query(user_id)) do
        # Repair #18 (A-center) - idempotent switch: switching to the
        # already-active session is a no-op success. No transaction, no
        # archived_at write, no updated_at bump - so a client that calls
        # switch repeatedly (or a poll that re-reads through it) cannot
        # churn the session list order or mutate any state.
        %OpalConversation{id: active_id} when active_id == target.id ->
          {:ok, target}

        current ->
          Repo.transaction(fn ->
            if match?(%OpalConversation{}, current) do
              current
              |> Ecto.Changeset.change(%{archived_at: DateTime.utc_now(:microsecond)})
              |> Repo.update!()
            end

            if is_nil(target.archived_at) do
              target
            else
              target
              |> Ecto.Changeset.change(%{archived_at: nil})
              |> Repo.update!()
            end
          end)
          |> case do
            {:ok, updated} -> {:ok, updated}
            {:error, reason} -> {:error, reason}
          end
      end
    end
  end

  def switch_conversation(_, _), do: {:error, :not_found}

  @doc """
  Clear ONE of the user's own Opal sessions by id: its messages are
  deleted (gone from user surfaces). Foreign or unknown ids →
  {:error, :not_found}. SharedPlans / Graph / human chats are untouched.
  """
  def clear_conversation_by_id(user_id, conversation_id)
      when is_binary(user_id) and is_binary(conversation_id) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id) do
      {deleted, _} =
        from(m in OpalMessage, where: m.conversation_id == ^conversation.id)
        |> Repo.delete_all()

      conversation =
        conversation
        |> Ecto.Changeset.change(%{
          title: nil,
          updated_at: DateTime.utc_now(:microsecond)
        })
        |> Repo.update!()

      {:ok, %{conversation: conversation, deleted_messages: deleted}}
    end
  end

  def clear_conversation_by_id(_, _), do: {:error, :not_found}

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
  Create user message + OC-4 generated Opal reply in one transaction.
  Auto-sets conversation title from first user message when title is nil.

  Opts:
  - `:client_context` — optional map from FE (e.g. share-gated Fit slice).
    Applied only for the requesting user; never unlocks Pass 2 inference.
  """
  def create_user_message(user_id, body, opts \\ [])

  def create_user_message(user_id, body, opts)
      when is_binary(user_id) and is_binary(body) and is_list(opts) do
    trimmed = String.trim(body)
    client_context = Keyword.get(opts, :client_context)
    # Repair #13 (W4-3) — client-supplied idempotency key for chat POSTs.
    client_message_id = Keyword.get(opts, :client_message_id)

    cond do
      trimmed == "" ->
        {:error, :empty_body}

      not String.valid?(trimmed) ->
        {:error, :invalid_body}

      String.length(trimmed) > OpalMessage.max_body() ->
        {:error, :body_too_long}

      true ->
        with :ok <- ensure_opal_rate_limit(user_id),
             {:ok, conversation} <- resolve_message_conversation(user_id, opts) do
          # Idempotent retry: a repeated POST carrying the same
          # client_message_id returns the original triple instead of
          # duplicating the message and re-running the pipeline.
          case find_idempotent_pair(conversation, client_message_id) do
            {:ok, _} = ok ->
              ok

            :miss ->
              {context_snapshot, intent_snapshot, response_text, draft_meta, action_meta} =
                assemble_classify_generate(user_id, trimmed, client_context)

              result =
                try do
                  Repo.transaction(fn ->
                    user_msg =
                      %OpalMessage{}
                      |> OpalMessage.changeset(%{
                        "conversation_id" => conversation.id,
                        "role" => "user",
                        "body" => trimmed,
                        "client_message_id" => client_message_id
                      })
                      |> Repo.insert!()

              generated_at = DateTime.utc_now() |> DateTime.to_iso8601()

              opal_meta =
                %{}
                |> then(fn m ->
                  if is_map(context_snapshot) do
                    Map.put(m, "context_snapshot", stringify_context(context_snapshot))
                  else
                    m
                  end
                end)
                |> then(fn m ->
                  if is_map(intent_snapshot) do
                    Map.put(m, "intent", stringify_intent(intent_snapshot))
                  else
                    m
                  end
                end)
                |> Map.put("generated_at", generated_at)
                # Non-secret draft correlation (provider/model/source). Never prompts or keys.
                |> then(fn m ->
                  if is_map(draft_meta) and map_size(draft_meta) > 0 do
                    Map.merge(m, draft_meta)
                  else
                    m
                  end
                end)
                |> then(fn m ->
                  if is_map(action_meta) and map_size(action_meta) > 0 do
                    Map.merge(m, stringify_context(action_meta))
                  else
                    m
                  end
                end)
                |> case do
                  m when map_size(m) == 0 -> nil
                  m -> m
                end

              opal_msg =
                %OpalMessage{}
                |> OpalMessage.changeset(%{
                  "conversation_id" => conversation.id,
                  "role" => "opal",
                  "body" => response_text,
                  "metadata" => opal_meta
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
              rescue
                e in Ecto.InvalidChangesetError ->
                  if idempotent_conflict?(e.changeset) do
                    # Lost the insert race: the winner's triple is committed;
                    # return it instead of raising.
                    case find_idempotent_pair(conversation, client_message_id) do
                      {:ok, _} = ok -> ok
                      :miss -> reraise e, __STACKTRACE__
                    end
                  else
                    reraise e, __STACKTRACE__
                  end
              end

              # RU-2 — promote from activity after the message is persisted.
              case result do
                {:ok, _} = ok ->
                  _ = TrustTiers.maybe_promote(user_id)
                  ok

                other ->
                  other
              end
          end
        end
    end
  end

  def create_user_message(_, _, _), do: {:error, :invalid}

  # Repair #17 (W4-7) — posting to a specific session: it must be the
  # user's own (foreign → :not_found, existence never revealed). An
  # archived target is switched to (reactivated) first, preserving the
  # one-active-session law.
  defp resolve_message_conversation(user_id, opts) do
    case Keyword.get(opts, :conversation_id) do
      id when is_binary(id) and id != "" ->
        case get_conversation_for_user(user_id, id) do
          {:ok, %OpalConversation{archived_at: nil} = c} -> {:ok, c}
          {:ok, %OpalConversation{}} -> switch_conversation(user_id, id)
          {:error, :not_found} -> {:error, :not_found}
        end

      _ ->
        get_or_create_conversation(user_id)
    end
  end

  # Repair #13 (W4-3) — idempotent Center POSTs. Returns the original
  # {conversation, user_msg, opal_msg} triple when this conversation already
  # holds a user message with the given client_message_id (and the opal reply
  # that followed it). :miss when there is no key or no complete pair yet.
  defp find_idempotent_pair(_conversation, nil), do: :miss
  defp find_idempotent_pair(_conversation, ""), do: :miss

  defp find_idempotent_pair(%{id: conversation_id} = conversation, client_message_id)
       when is_binary(client_message_id) do
    user_msg =
      from(m in OpalMessage,
        where: m.conversation_id == ^conversation_id,
        where: m.role == "user",
        where: m.client_message_id == ^client_message_id,
        order_by: [asc: m.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case user_msg do
      nil ->
        :miss

      %OpalMessage{} = um ->
        opal_msg =
          from(m in OpalMessage,
            where: m.conversation_id == ^conversation_id,
            where: m.role == "opal",
            where: m.inserted_at > ^um.inserted_at,
            order_by: [asc: m.inserted_at],
            limit: 1
          )
          |> Repo.one()

        case opal_msg do
          nil -> :miss
          %OpalMessage{} = om -> {:ok, {conversation, um, om}}
        end
    end
  end

  # The partial unique index on (conversation_id, client_message_id) fired:
  # a concurrent request won the insert race.
  defp idempotent_conflict?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:client_message_id,
       {_msg, [constraint: :unique, constraint_name: name]}} ->
        to_string(name) == "opal_messages_conversation_client_msg_uidx"

      _ ->
        false
    end)
  end

  defp idempotent_conflict?(_), do: false

  # Paste J 3.3 — 90 Center messages / minute per user (never crash on flood).
  defp ensure_opal_rate_limit(user_id) do
    case RateLimitBucket.hit("opal_center:#{user_id}", "opal_message",
           max: 90,
           window_sec: 60
         ) do
      :ok -> :ok
      {:error, :rate_limited} -> {:error, :rate_limited}
    end
  end

  # --- Repair #19 (W14 + Orbits): scope, anchor, removal -----------

  @doc """
  Start a NEW Opal session SCOPED to a person — the doorway/index
  birth path, and the landing rule for ingestion-born Opal chats
  (a chat born from a meeting/transcript enters through here with
  its plan/person binding, so it is anchored at birth).

  Scope (map, string or atom keys): "person_id" (required),
  "plan_id" and "conversation_id" (optional). Validation is
  fail-closed — any mismatch is {:error, :invalid_scope} and
  NOTHING is created:
  - the person must be a real user;
  - a given person-thread conversation must have BOTH the caller
    and the person as members (Messages.member_user_ids/1);
  - a given plan must be readable by the caller through the
    sanctioned plan reader AND the person must be a participant
    of it (SocialFlow.plan_participant_ids/1) — so a doorway in
    thread A can never scope a session to plan B or person X.
  The primary anchor is the plan when a plan is given, else the
  person. The previous active session is archived and retained,
  exactly as start_new_chat/1.
  """
  def create_scoped_session(user_id, scope) when is_binary(user_id) and is_map(scope) do
    person_id = scope_val(scope, "person_id")
    plan_id = scope_val(scope, "plan_id")
    conversation_id = scope_val(scope, "conversation_id")

    cond do
      is_binary(person_id) ->
        create_person_scoped_session(user_id, person_id, plan_id, conversation_id)

      is_binary(conversation_id) ->
        create_conversation_scoped_session(user_id, conversation_id, plan_id)

      true ->
        {:error, :invalid_scope}
    end
  end

  def create_scoped_session(_, _), do: {:error, :invalid_scope}

  defp create_person_scoped_session(user_id, person_id, plan_id, conversation_id) do
    with {:ok, person} <- fetch_person(person_id),
         :ok <- validate_conversation_binding(user_id, person_id, conversation_id),
         {:ok, plan} <- validate_plan_binding(user_id, person_id, plan_id) do
      anchor =
        if plan do
          %{anchor_type: "plan", anchor_id: plan.id, anchor_label: plan.title}
        else
          %{anchor_type: "person", anchor_id: person.id, anchor_label: person.display_name}
        end

      fields =
        Map.merge(anchor, %{
          context_person_id: person.id,
          context_plan_id: if(plan, do: plan.id),
          context_conversation_id: conversation_id
        })

      insert_scoped_session(user_id, fields)
    end
  end

  # Repair #20 (F-19) — the GROUP doorway birth: a scoped session
  # anchored to the conversation itself, because a group thread's
  # orbit is the full party set and no single person scopes it
  # honestly. Validation is the same fail-closed discipline:
  # - the caller must be a member of the conversation;
  # - the conversation must be a GROUP (3+ members) — a dyad keeps
  #   the person scope above, never a duplicate conversation scope;
  # - a given plan must be readable by the caller AND belong to
  #   this conversation (bound to it, or its party set is exactly
  #   the conversation's members).
  # The anchor is the conversation; the birth scope carries the
  # conversation id (and the plan, when given) and NO person.
  defp create_conversation_scoped_session(user_id, conversation_id, plan_id) do
    member_ids = OpalCore.Messages.member_user_ids(conversation_id)

    with :ok <- validate_group_binding(user_id, member_ids),
         {:ok, plan} <- validate_group_plan_binding(user_id, member_ids, conversation_id, plan_id) do
      anchor =
        if plan do
          %{anchor_type: "plan", anchor_id: plan.id, anchor_label: plan.title}
        else
          %{
            anchor_type: "conversation",
            anchor_id: conversation_id,
            anchor_label: conversation_anchor_label(conversation_id)
          }
        end

      fields =
        Map.merge(anchor, %{
          context_person_id: nil,
          context_plan_id: if(plan, do: plan.id),
          context_conversation_id: conversation_id
        })

      insert_scoped_session(user_id, fields)
    end
  end

  defp validate_group_binding(user_id, member_ids) do
    cond do
      user_id not in member_ids -> {:error, :invalid_scope}
      length(member_ids) < 3 -> {:error, :invalid_scope}
      true -> :ok
    end
  end

  defp validate_group_plan_binding(_user_id, _member_ids, _conversation_id, nil), do: {:ok, nil}

  defp validate_group_plan_binding(user_id, member_ids, conversation_id, plan_id) do
    case OpalCore.SocialFlow.get_plan_for_user(plan_id, user_id) do
      {:ok, plan} ->
        parties = MapSet.new(OpalCore.SocialFlow.plan_participant_ids(plan))

        if plan.conversation_id == conversation_id or
             MapSet.equal?(parties, MapSet.new(member_ids)) do
          {:ok, plan}
        else
          {:error, :invalid_scope}
        end

      _ ->
        {:error, :invalid_scope}
    end
  end

  # A conversation anchor's label snapshot: the conversation's own
  # human label when it carries one; machine labels (group-/direct-/
  # connection-) are not names, so the snapshot stays nil and
  # surfaces name the orbit from its party instead.
  defp conversation_anchor_label(conversation_id) do
    case OpalCore.Repo.get(OpalCore.Messaging.Conversation, conversation_id) do
      %OpalCore.Messaging.Conversation{label: label} when is_binary(label) ->
        if String.starts_with?(label, ["group-", "direct-", "connection-"]),
          do: nil,
          else: label

      _ ->
        nil
    end
  end

  defp insert_scoped_session(user_id, fields) do
    with {:ok, current} <- get_or_create_conversation(user_id) do
      _ = OpalCore.Center.ProviderAction.cancel_inflight_for_user(user_id)

      Repo.transaction(fn ->
        current
        |> Ecto.Changeset.change(%{archived_at: DateTime.utc_now(:microsecond)})
        |> Repo.update!()

        %OpalConversation{user_id: user_id}
        |> Map.merge(fields)
        |> OpalConversation.changeset(%{"user_id" => user_id})
        |> Repo.insert!()
      end)
      |> case do
        {:ok, fresh} ->
          _ = OpalCore.Center.PlanningContext.clear_transient(user_id)
          {:ok, %{conversation: fresh, archived_conversation_id: current.id}}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  Set (accept / redirect) or clear (unanchor) ONE of the user's own
  sessions' primary anchor. Anchoring is proposed, never silently
  filed — this is the ONLY write path, and every caller is an
  explicit user action; the previous value is returned in the
  contract so a one-tap undo re-issues this call with it.
  `anchor` is %{"type" => "person"|"plan"|"place", "id" => id,
  "label" => optional snapshot} or nil to unanchor. Person/plan
  anchors validate against the real records (plan: caller must be
  a participant-reader); a place anchor carries its provider id +
  label (no owner-side place record exists to validate against).
  Setting a person/plan anchor also syncs the matching birth-scope
  slot, keeping one filing truth.
  """
  def set_anchor(user_id, conversation_id, anchor)
      when is_binary(user_id) and is_binary(conversation_id) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id),
         {:ok, fields} <- anchor_fields(user_id, anchor) do
      conversation
      |> OpalConversation.scope_changeset(fields)
      |> Repo.update()
    end
  end

  def set_anchor(_, _, _), do: {:error, :not_found}

  @doc """
  Remove ONE of the user's own Opal sessions for real (Addition A
  clear-out): its messages and the session row are deleted, so it
  leaves every listing (Center log, person orbit, sessions list).
  Person threads, plans, and graph records are untouched — they are
  different tables and this function never reads them. If the
  removed session was the active one, the next conversation read
  creates a fresh active session (get_or_create_conversation/1),
  never a resurrection of the removed one.
  """
  def remove_session(user_id, conversation_id)
      when is_binary(user_id) and is_binary(conversation_id) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id) do
      Repo.transaction(fn ->
        {deleted, _} =
          from(m in OpalMessage, where: m.conversation_id == ^conversation.id)
          |> Repo.delete_all()

        Repo.delete!(conversation)
        deleted
      end)
      |> case do
        {:ok, deleted} -> {:ok, %{deleted_messages: deleted}}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  def remove_session(_, _), do: {:error, :not_found}

  @doc """
  Set the private flag for a WHOLE orbit (every one of the caller's
  sessions anchored to anchor_type+anchor_id). The flag is the
  item-9 gate SEAM: the Center log hides a private orbit's contents
  behind the gate interface until unlocked; verification itself is
  wired by the coordinator (W7) — this function stores truth only.
  Returns {:ok, updated_count}.
  """
  def set_orbit_private(user_id, anchor_type, anchor_id, private?)
      when is_binary(user_id) and is_binary(anchor_type) and is_binary(anchor_id) and
             is_boolean(private?) do
    if anchor_type in OpalConversation.anchor_types() do
      {count, _} =
        from(c in OpalConversation,
          where:
            c.user_id == ^user_id and c.anchor_type == ^anchor_type and
              c.anchor_id == ^anchor_id
        )
        |> Repo.update_all(set: [orbit_private: private?])

      {:ok, count}
    else
      {:error, :invalid_anchor}
    end
  end

  def set_orbit_private(_, _, _, _), do: {:error, :invalid_anchor}

  @doc """
  Repair #19 FIX-A (BS-02) — verify the caller's graph-lock passcode
  for ONE of the caller's OWN orbits (the backend half of the orbit
  unlock gate; W14 stored the flag with no verification behind it).

  ONE lock truth: the passcode is the account's existing graph lock
  (`OpalCore.SocialFlow.GraphLock`, the W7 store) — there is no
  second passcode, hash, or store for orbits. Verification is scoped
  to the caller's own orbits by construction: the orbit must exist
  among the CALLER's sessions (anchor_type + anchor_id under the
  caller's user_id) before any code is checked, so one account's
  verification can never unlock — or even probe — another account's
  orbit; an orbit the caller does not hold is `:not_found`, exactly
  like a foreign session id everywhere else in this module.

  Returns `:ok` | `{:error, :not_found}` | `{:error, :wrong_code}` |
  `{:error, :invalid_anchor}`. A caller with no graph-lock passcode
  set gets `:wrong_code` (GraphLock.verify/2 answers the same false
  for unset and wrong, so nothing leaks about which).
  """
  def verify_orbit_unlock(user_id, anchor_type, anchor_id, code)
      when is_binary(user_id) and is_binary(anchor_type) and is_binary(anchor_id) and
             is_binary(code) do
    cond do
      anchor_type not in OpalConversation.anchor_types() ->
        {:error, :invalid_anchor}

      not orbit_owned?(user_id, anchor_type, anchor_id) ->
        {:error, :not_found}

      OpalCore.SocialFlow.GraphLock.verify(user_id, code) ->
        :ok

      true ->
        {:error, :wrong_code}
    end
  end

  def verify_orbit_unlock(_, _, _, _), do: {:error, :invalid_anchor}

  defp orbit_owned?(user_id, anchor_type, anchor_id) do
    from(c in OpalConversation,
      where:
        c.user_id == ^user_id and c.anchor_type == ^anchor_type and
          c.anchor_id == ^anchor_id
    )
    |> Repo.exists?()
  end

  @doc """
  Conversation chrome (Repair #19 addition) — pin / unpin ONE of
  the user's own sessions. The pin is a timestamp: pinned rows hold
  the top of the log (the web log's Pinned zone under Continuing,
  ordered by pinned_at desc) regardless of recency, and a pinned
  row sorts first inside its orbit sheet. Filing (anchor) is never
  changed by a pin.
  """
  def set_pinned(user_id, conversation_id, pinned?)
      when is_binary(user_id) and is_binary(conversation_id) and is_boolean(pinned?) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id) do
      conversation
      |> Ecto.Changeset.change(%{
        pinned_at: if(pinned?, do: DateTime.utc_now(:microsecond), else: nil)
      })
      |> Repo.update()
    end
  end

  def set_pinned(_, _, _), do: {:error, :not_found}

  @doc """
  Conversation chrome — the ONE user archive. Archiving a session
  (from the overflow menu or the orbit sheet — the same write)
  stamps user_archived_at: the session leaves the log's orbit
  groups and unanchored list for the log's Archived section, is
  retained in full, and unarchiving restores it exactly. This is
  NOT session rotation (archived_at) and NOT removal: messages,
  scope, and anchor are all preserved.
  """
  def set_user_archived(user_id, conversation_id, archived?)
      when is_binary(user_id) and is_binary(conversation_id) and is_boolean(archived?) do
    with {:ok, conversation} <- get_conversation_for_user(user_id, conversation_id) do
      conversation
      |> Ecto.Changeset.change(%{
        user_archived_at: if(archived?, do: DateTime.utc_now(:microsecond), else: nil)
      })
      |> Repo.update()
    end
  end

  def set_user_archived(_, _, _), do: {:error, :not_found}

  defp scope_val(scope, key) do
    value = Map.get(scope, key) || Map.get(scope, String.to_existing_atom(key))
    if is_binary(value) and String.trim(value) != "", do: value, else: nil
  rescue
    ArgumentError -> nil
  end

  defp fetch_person(person_id) when is_binary(person_id) do
    case Repo.get(OpalCore.Accounts.User, person_id) do
      %OpalCore.Accounts.User{} = user -> {:ok, user}
      _ -> {:error, :not_found}
    end
  rescue
    Ecto.Query.CastError -> {:error, :not_found}
  end

  defp fetch_person(_), do: {:error, :invalid_scope}

  defp validate_conversation_binding(_user_id, _person_id, nil), do: :ok

  defp validate_conversation_binding(user_id, person_id, conversation_id) do
    members = OpalCore.Messages.member_user_ids(conversation_id)
    if user_id in members and person_id in members, do: :ok, else: {:error, :invalid_scope}
  end

  defp validate_plan_binding(_user_id, _person_id, nil), do: {:ok, nil}

  defp validate_plan_binding(user_id, person_id, plan_id) do
    case OpalCore.SocialFlow.get_plan_for_user(plan_id, user_id) do
      {:ok, plan} ->
        if person_id in OpalCore.SocialFlow.plan_participant_ids(plan) do
          {:ok, plan}
        else
          {:error, :invalid_scope}
        end

      _ ->
        {:error, :invalid_scope}
    end
  end

  defp anchor_fields(_user_id, nil) do
    {:ok, %{anchor_type: nil, anchor_id: nil, anchor_label: nil}}
  end

  defp anchor_fields(user_id, %{"type" => "person", "id" => id}) when is_binary(id) do
    case fetch_person(id) do
      {:ok, person} ->
        {:ok,
         %{
           anchor_type: "person",
           anchor_id: person.id,
           anchor_label: person.display_name,
           context_person_id: person.id
         }}

      err ->
        err
    end
  end

  defp anchor_fields(user_id, %{"type" => "plan", "id" => id}) when is_binary(id) do
    case OpalCore.SocialFlow.get_plan_for_user(id, user_id) do
      {:ok, plan} ->
        fields = %{anchor_type: "plan", anchor_id: plan.id, anchor_label: plan.title}
        fields = Map.put(fields, :context_plan_id, plan.id)

        fields =
          case OpalCore.SocialFlow.plan_participant_ids(plan) -- [user_id] do
            [only_other] -> Map.put(fields, :context_person_id, only_other)
            _ -> fields
          end

        {:ok, fields}

      _ ->
        {:error, :invalid_scope}
    end
  end

  defp anchor_fields(_user_id, %{"type" => "place", "id" => id, "label" => label})
       when is_binary(id) and id != "" and is_binary(label) and label != "" do
    {:ok, %{anchor_type: "place", anchor_id: id, anchor_label: label}}
  end

  # Repair #20 (F-19): a conversation anchor validates against the
  # caller's own membership — a session may be filed under a group
  # conversation's orbit only by someone in that conversation.
  defp anchor_fields(user_id, %{"type" => "conversation", "id" => id})
       when is_binary(id) and id != "" do
    if user_id in OpalCore.Messages.member_user_ids(id) do
      {:ok,
       %{
         anchor_type: "conversation",
         anchor_id: id,
         anchor_label: conversation_anchor_label(id),
         context_conversation_id: id
       }}
    else
      {:error, :invalid_scope}
    end
  end

  defp anchor_fields(_, _), do: {:error, :invalid_anchor}

  def to_conversation_contract(%OpalConversation{} = c, messages \\ nil) do
    msgs = if is_list(messages), do: messages, else: list_messages(c.id)
    OpalConversation.to_contract(c, msgs) |> with_live_context_names(c.user_id)
  end

  def to_message_contract(%OpalMessage{} = m), do: OpalMessage.to_contract(m)

  def message_limit, do: @message_limit

  @doc """
  Clear visible Center messages + transient planning for this user.

  Does not delete SharedPlans, Graph records, human-to-human chats, or
  relationship data. Cancels in-flight provider jobs so sticky searches
  cannot monopolize the next turn.
  """
  def clear_visible_conversation(user_id) when is_binary(user_id) do
    with {:ok, conversation} <- get_or_create_conversation(user_id) do
      {deleted, _} =
        from(m in OpalMessage, where: m.conversation_id == ^conversation.id)
        |> Repo.delete_all()

      _ = OpalCore.Center.ProviderAction.cancel_inflight_for_user(user_id)
      _ = OpalCore.Center.PlanningContext.clear_transient(user_id)

      conversation =
        conversation
        |> Ecto.Changeset.change(%{
          title: nil,
          updated_at: DateTime.utc_now(:microsecond)
        })
        |> Repo.update!()

      {:ok, %{conversation: conversation, deleted_messages: deleted}}
    end
  end

  def clear_visible_conversation(_), do: {:error, :invalid}

  @doc """
  Start a NEW Opal chat session (Repair #17, W4-7): the current active
  session is archived — retained in the session list, messages intact —
  and a fresh empty session becomes active. Transient planning is cleared
  and in-flight provider jobs are cancelled, so nothing sticky leaks into
  the new session. SharedPlans / Graph / human chats are preserved.
  """
  def start_new_chat(user_id) when is_binary(user_id) do
    with {:ok, current} <- get_or_create_conversation(user_id) do
      _ = OpalCore.Center.ProviderAction.cancel_inflight_for_user(user_id)

      Repo.transaction(fn ->
        current
        |> Ecto.Changeset.change(%{archived_at: DateTime.utc_now(:microsecond)})
        |> Repo.update!()

        fresh =
          %OpalConversation{}
          |> OpalConversation.changeset(%{"user_id" => user_id})
          |> Repo.insert!()

        fresh
      end)
      |> case do
        {:ok, fresh} ->
          _ = OpalCore.Center.PlanningContext.clear_transient(user_id)

          {:ok,
           %{
             conversation: fresh,
             archived_conversation_id: current.id,
             deleted_messages: 0
           }}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def start_new_chat(_), do: {:error, :invalid}

  defp assemble_classify_generate(user_id, trimmed, client_context) do
    # Repair #18 adoption wave 1 (4.C1) - "what are you holding for
    # me?" is answered deterministically from the ONE holding counter
    # set (GraphPeople.holding/1), read at answer time. It never goes
    # to the LLM and never estimates; the counters ride the message
    # metadata so the surface can link each figure into its home.
    if OpalCore.GraphPeople.holding_question?(trimmed) do
      holding = OpalCore.GraphPeople.holding(user_id)
      {nil, nil, holding["answer_text"], %{}, %{"holding" => holding}}
    else
      do_assemble_classify_generate(user_id, trimmed, client_context)
    end
  end

  defp do_assemble_classify_generate(user_id, trimmed, client_context) do
    case OpalContext.assemble(user_id, trimmed, client_context) do
      {:ok, ctx} ->
        intent =
          case OpalIntent.classify(trimmed, ctx) do
            {:ok, intent_map} -> intent_map
            _ -> nil
          end

        {intent, override, action_meta} =
          OpalCore.Center.ActionOrchestrator.after_classify(user_id, trimmed, intent, ctx)

        {intent, text} =
          if is_binary(override) and String.trim(override) != "" do
            # Promise language only after job creation (override includes action_job_id).
            {intent, override}
          else
            generate_with_side_effects(user_id, intent, ctx)
          end

        planning =
          (is_map(action_meta) && (action_meta["planning_context"] || action_meta[:planning_context])) ||
            OpalCore.Center.PlanningContext.get_for_user(user_id)

        {text, fact_repairs} =
          OpalCore.Center.ResponseFactContract.validate(text || "", planning, action_meta || %{})

        action_meta =
          if fact_repairs != [] and is_map(action_meta) do
            Map.put(action_meta, "fact_contract_repairs", Enum.map(fact_repairs, &to_string/1))
          else
            action_meta
          end

        draft_meta = OpalResponse.last_draft_meta()

        {ctx, intent, text, draft_meta, action_meta}

      _ ->
        {nil, nil, OpalResponse.fallback_text(), %{}, %{}}
    end
  end

  defp generate_with_side_effects(user_id, %{intent: :plan_confirm} = intent, ctx) do
    entities = intent[:entities] || %{}

    case OpalCore.OpalPlanConfirm.execute(user_id, entities, ctx) do
      {:ok, result} ->
        # Repair #13 (W4-1) — persist the sticky plan_id on a successful
        # confirm so follow-ups ("move it to 8pm", "cancel it") resolve to
        # the just-created plan instead of going stale.
        _ =
          OpalCore.Center.PlanningContext.merge(
            user_id,
            %{"plan_id" => result.plan_id},
            %{}
          )

        enriched = %{
          intent
          | entities:
              Map.merge(entities, %{
                confirmed: true,
                title: result.title,
                plan_id: result.plan_id,
                what: result.what,
                when: result.when,
                who: result.who
              })
              |> then(fn e ->
                # RF-3 — the confirmed record's venue/clock ride into
                # the Done copy when the confirm carried them.
                e
                |> then(fn x ->
                  if is_binary(result[:venue] || result["venue"]),
                    do: Map.put(x, :venue, result[:venue] || result["venue"]),
                    else: x
                end)
                |> then(fn x ->
                  if is_binary(result[:when_time] || result["when_time"]),
                    do: Map.put(x, :when_time, result[:when_time] || result["when_time"]),
                    else: x
                end)
              end)
        }

        text =
          case OpalResponse.generate(enriched, ctx) do
            {:ok, response_text} -> response_text
            _ -> confirm_success_fallback(result)
          end

        {enriched, text}

      {:error, :need_who} ->
        enriched = %{intent | entities: Map.put(entities, :confirmed, false)}
        {enriched, "I can set that up — who should I include?"}

      {:error, _} ->
        text =
          "I couldn't finish setting that up just now. Try again in a moment, or say who and when again."

        {intent, text}
    end
  end

  defp generate_with_side_effects(_user_id, intent, ctx) when is_map(intent) do
    text =
      case OpalResponse.generate(intent, ctx) do
        {:ok, response_text} -> response_text
        _ -> OpalResponse.fallback_text()
      end

    {intent, text}
  end

  defp generate_with_side_effects(_user_id, _, _ctx) do
    {nil, OpalResponse.fallback_text()}
  end

  defp confirm_success_fallback(%{what: what, when: when_s, who: who}) do
    with_who =
      case who do
        [n | _] when is_binary(n) and n != "" -> " with #{n}"
        _ -> ""
      end

    when_bit = if is_binary(when_s) and when_s != "", do: " #{when_s}", else: ""
    "Done — #{what}#{when_bit}#{with_who} is set up. It's on your Graph."
  end

  defp confirm_success_fallback(_),
    do: "Done — that plan is set up. It's on your Graph."

  # JSONB stores string keys; normalize atoms from OpalContext for durable snapshot.
  defp stringify_context(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_context(v)}
      {k, v} -> {to_string(k), stringify_context(v)}
    end)
  end

  defp stringify_context(list) when is_list(list), do: Enum.map(list, &stringify_context/1)
  defp stringify_context(other), do: other

  # Intent atoms (intent/confidence) become strings for JSONB.
  defp stringify_intent(%{intent: intent, confidence: conf, entities: ents, raw_text: raw}) do
    %{
      "intent" => Atom.to_string(intent),
      "confidence" => Atom.to_string(conf),
      "entities" => stringify_context(ents || %{}),
      "raw_text" => raw
    }
  end

  defp stringify_intent(map) when is_map(map), do: stringify_context(map)
end
