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
    case Repo.get_by(OpalConversation, user_id: user_id) do
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
            # Race: unique user_id — re-fetch winner.
            if Keyword.has_key?(errors, :user_id) do
              case Repo.get_by(OpalConversation, user_id: user_id) do
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
             {:ok, conversation} <- get_or_create_conversation(user_id) do
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

  def to_conversation_contract(%OpalConversation{} = c, messages \\ nil) do
    msgs = if is_list(messages), do: messages, else: list_messages(c.id)
    OpalConversation.to_contract(c, msgs)
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
  Start a fresh Center turn surface: clear visible history + transient planning.
  Same durable conversation row (one Opal conversation per user) with empty
  visible log — New Chat for the consumer.
  """
  def start_new_chat(user_id) when is_binary(user_id) do
    clear_visible_conversation(user_id)
  end

  def start_new_chat(_), do: {:error, :invalid}

  defp assemble_classify_generate(user_id, trimmed, client_context) do
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
