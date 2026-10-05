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
  """
  def create_user_message(user_id, body)
      when is_binary(user_id) and is_binary(body) do
    trimmed = String.trim(body)

    cond do
      trimmed == "" ->
        {:error, :empty_body}

      String.length(trimmed) > OpalMessage.max_body() ->
        {:error, :body_too_long}

      true ->
        with {:ok, conversation} <- get_or_create_conversation(user_id) do
          {context_snapshot, intent_snapshot, response_text} =
            assemble_classify_generate(user_id, trimmed)

          Repo.transaction(fn ->
            user_msg =
              %OpalMessage{}
              |> OpalMessage.changeset(%{
                "conversation_id" => conversation.id,
                "role" => "user",
                "body" => trimmed
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
        end
    end
  end

  def create_user_message(_, _), do: {:error, :invalid}

  def to_conversation_contract(%OpalConversation{} = c, messages \\ nil) do
    msgs = if is_list(messages), do: messages, else: list_messages(c.id)
    OpalConversation.to_contract(c, msgs)
  end

  def to_message_contract(%OpalMessage{} = m), do: OpalMessage.to_contract(m)

  def message_limit, do: @message_limit

  defp assemble_classify_generate(user_id, trimmed) do
    case OpalContext.assemble(user_id, trimmed) do
      {:ok, ctx} ->
        intent =
          case OpalIntent.classify(trimmed, ctx) do
            {:ok, intent_map} -> intent_map
            _ -> nil
          end

        text =
          cond do
            is_map(intent) ->
              case OpalResponse.generate(intent, ctx) do
                {:ok, response_text} -> response_text
                _ -> OpalResponse.fallback_text()
              end

            true ->
              OpalResponse.fallback_text()
          end

        {ctx, intent, text}

      _ ->
        {nil, nil, OpalResponse.fallback_text()}
    end
  end

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
