defmodule OpalCore.Messages do
  @moduledoc """
  Authoritative messaging boundary for Slice 1.

  Assigns server_seq under row lock; enforces client_message_id idempotency.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.Events.Publisher
  alias OpalCore.SocialFlow.{
    ConversationAlignment,
    HomeProjection,
    SeedFixtureLeak,
    SharedPlan,
    SmokeResidue,
    TrustSafety
  }

  @doc """
  Accepts a minimal message for a conversation member.

  Idempotent on `{conversation_id, client_message_id}`.
  """
  def accept_message(attrs) when is_map(attrs) do
    conversation_id = fetch_attr!(attrs, :conversation_id)
    sender_user_id = fetch_attr!(attrs, :sender_user_id)
    client_message_id = fetch_attr!(attrs, :client_message_id)

    with :ok <- ensure_member(conversation_id, sender_user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, sender_user_id),
         :ok <- ensure_message_rate_limit(sender_user_id),
         :ok <- ensure_spam_throttle(sender_user_id, conversation_id) do
      case get_by_client_id(conversation_id, client_message_id) do
        %Message{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          insert_message(attrs, conversation_id, sender_user_id, client_message_id)
      end
    end
  end

  # Phase 3.2 — 60 messages / minute per user.
  defp ensure_message_rate_limit(user_id) do
    case OpalCore.SocialFlow.RateLimitBucket.hit("msg:#{user_id}", "message_send",
           max: 60,
           window_sec: 60
         ) do
      :ok -> :ok
      {:error, :rate_limited} -> {:error, :rate_limited}
    end
  end

  # Phase 3.3 — >10 messages to non-contacts in 5 min → throttle.
  defp ensure_spam_throttle(user_id, conversation_id) do
    peer_ids =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id != ^user_id,
        select: cm.user_id
      )
      |> Repo.all()

    # Soft contact heuristic: if no approved relationship, count toward spam bucket.
    non_contact? =
      Enum.any?(peer_ids, fn peer ->
        not OpalCore.SocialFlow.TrustSafety.soft_contact?(user_id, peer)
      end)

    if non_contact? do
      case OpalCore.SocialFlow.RateLimitBucket.hit("spam:#{user_id}", "non_contact_message",
             max: 10,
             window_sec: 300
           ) do
        :ok -> :ok
        {:error, :rate_limited} -> {:error, :rate_limited}
      end
    else
      :ok
    end
  end

  defp fetch_attr!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end

  def get_message(id), do: Repo.get(Message, id)
  def get_message!(id), do: Repo.get!(Message, id)

  def get_message_for_user(id, user_id) do
    from(m in Message,
      join: cm in ConversationMember,
      on: cm.conversation_id == m.conversation_id,
      where: m.id == ^id and cm.user_id == ^user_id
    )
    |> Repo.one()
  end

  def get_by_client_id(conversation_id, client_message_id) do
    Repo.get_by(Message, conversation_id: conversation_id, client_message_id: client_message_id)
  end

  @doc """
  Lists conversations for a user with latest message preview.
  """
  def list_conversations(user_id) do
    member_ids =
      from(cm in ConversationMember,
        where: cm.user_id == ^user_id,
        select: cm.conversation_id
      )
      |> Repo.all()

    Enum.map(member_ids, fn cid ->
      conversation = Repo.get!(Conversation, cid)

      recent =
        from(m in Message,
          where: m.conversation_id == ^cid,
          order_by: [desc: m.server_seq],
          limit: 20
        )
        |> Repo.all()

      latest = List.first(recent)

      preview_msg =
        Enum.find(recent, fn m ->
          body = m.body || ""
          not SmokeResidue.smoke_body?(body) and not SeedFixtureLeak.seed_fixture_body?(body)
        end)

      peers =
        from(cm in ConversationMember,
          join: u in OpalCore.Accounts.User,
          on: u.id == cm.user_id,
          where: cm.conversation_id == ^cid and cm.user_id != ^user_id,
          select: %{id: u.id, display_name: u.display_name, handle: u.handle}
        )
        |> Repo.all()

      member_count =
        from(cm in ConversationMember,
          where: cm.conversation_id == ^cid,
          select: count(cm.id)
        )
        |> Repo.one() || 0

      membership =
        Repo.get_by(ConversationMember, conversation_id: cid, user_id: user_id)

      last_read = (membership && membership.last_read_server_seq) || 0
      unread_count = unread_count(cid, user_id)

      # Multiple SharedPlans per conversation are lawful (history + new tentative).
      # Never Repo.one/0 without limit — that 500s the Chats list.
      plan_alignment = current_plan_alignment(cid)

      %{
        "id" => conversation.id,
        "title" => conversation_title(peers, conversation),
        "peers" =>
          Enum.map(peers, fn p ->
            %{"id" => p.id, "display_name" => p.display_name, "handle" => p.handle}
          end),
        "member_count" => member_count,
        "composition" => if(member_count >= 3, do: "group", else: "dyad"),
        "preview" => (preview_msg && preview_msg.body) || "",
        "updated_at" =>
          (latest && DateTime.to_iso8601(latest.inserted_at)) ||
            DateTime.to_iso8601(conversation.updated_at),
        "latest_server_seq" => (latest && latest.server_seq) || 0,
        "last_read_server_seq" => last_read,
        "unread_count" => unread_count,
        "notifications_muted" => (membership && membership.notifications_muted) || false,
        "plan_projection" => HomeProjection.from_alignment(plan_alignment, cid, member_count)
      }
    end)
    |> Enum.sort_by(& &1["updated_at"], :desc)
  end

  # Prefer the newest active plan for list projection; cancelled/completed stay in history.
  defp current_plan_alignment(conversation_id) do
    from(p in SharedPlan,
      where: p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
      order_by: [desc: p.updated_at, desc: p.inserted_at],
      limit: 1,
      select: p.alignment
    )
    |> Repo.one()
  end

  @doc """
  Unread is messages from other people with server_seq above this member's cursor.
  """
  def unread_count(conversation_id, user_id)
      when is_binary(conversation_id) and is_binary(user_id) do
    last_read =
      case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
        %ConversationMember{last_read_server_seq: seq} when is_integer(seq) -> seq
        _ -> 0
      end

    from(m in Message,
      where:
        m.conversation_id == ^conversation_id and m.server_seq > ^last_read and
          m.sender_user_id != ^user_id,
      select: count(m.id)
    )
    |> Repo.one() || 0
  end

  def set_notifications_muted(conversation_id, user_id, muted)
      when is_binary(conversation_id) and is_binary(user_id) and is_boolean(muted) do
    with :ok <- ensure_member(conversation_id, user_id) do
      case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
        %ConversationMember{} = member ->
          member
          |> ConversationMember.changeset(%{notifications_muted: muted})
          |> Repo.update()

        nil ->
          {:error, :not_a_member}
      end
    end
  end

  @doc """
  Mark conversation read through `server_seq` for this member (durable unread).
  """
  def mark_read(conversation_id, user_id, server_seq)
      when is_binary(conversation_id) and is_binary(user_id) and is_integer(server_seq) do
    with :ok <- ensure_member(conversation_id, user_id) do
      case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
        %ConversationMember{} = m ->
          next = max(m.last_read_server_seq || 0, server_seq)

          m
          |> ConversationMember.changeset(%{last_read_server_seq: next})
          |> Repo.update()
          |> case do
            {:ok, updated} ->
              {:ok,
               %{
                 "conversation_id" => conversation_id,
                 "last_read_server_seq" => updated.last_read_server_seq,
                 "unread_count" => unread_count(conversation_id, user_id)
               }}

            err ->
              err
          end

        nil ->
          {:error, :not_a_member}
      end
    end
  end

  def mark_read_to_latest(conversation_id, user_id)
      when is_binary(conversation_id) and is_binary(user_id) do
    latest =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        select: max(m.server_seq)
      )
      |> Repo.one() || 0

    mark_read(conversation_id, user_id, latest)
  end

  @doc """
  Message history for a conversation member, ascending by server_seq.
  """
  def list_messages(conversation_id, user_id, opts \\ []) do
    with :ok <- ensure_member(conversation_id, user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, user_id) do
      limit = Keyword.get(opts, :limit, 100)

      messages =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [asc: m.server_seq],
          limit: ^limit
        )
        |> Repo.all()
        # Defense in depth: hide engineering smoke residue from product clients.
        # Cleanup task removes rows; filter protects preview accounts between cleanups.
        |> Enum.reject(fn message ->
          body = message.body || ""
          SmokeResidue.smoke_body?(body) or SeedFixtureLeak.seed_fixture_body?(body)
        end)

      {:ok, Enum.map(messages, &Message.to_contract/1)}
    end
  end

  defp conversation_title(peers, conversation) do
    label = conversation && Map.get(conversation, :label)

    cond do
      peers == [] and not human_conversation_label?(label) ->
        "Conversation"

      human_conversation_label?(label) ->
        label

      true ->
        peers
        |> Enum.map(& &1.display_name)
        |> Enum.reject(&is_nil/1)
        |> case do
          [] -> "Conversation"
          names -> Enum.join(names, ", ")
        end
    end
  end

  defp human_conversation_label?(label) when is_binary(label) and label != "" do
    not String.starts_with?(label, "group-") and
      not String.starts_with?(label, "direct-") and
      not String.starts_with?(label, "connection-")
  end

  defp human_conversation_label?(_), do: false

  @ai_states ~w(not_requested consent_required queued processing completed refused failed)

  def update_ai_state(%Message{} = message, state) when state in @ai_states do
    message
    |> Ecto.Changeset.change(ai_processing_state: state)
    |> Repo.update()
  end

  @doc """
  Find or create a direct 1:1 conversation (dyad).

  P31-PATCH-01: person selection must route to a direct channel, never a
  multi-party group that happens to share membership.

  Idempotent: reuses existing Conversation with exactly these two members.
  Does not invent a second messaging system — uses ConversationMember.
  """
  def ensure_direct_conversation(user_a, user_b)
      when is_binary(user_a) and is_binary(user_b) do
    cond do
      user_a == user_b ->
        {:error, :self}

      TrustSafety.blocked?(user_a, user_b) or TrustSafety.blocked?(user_b, user_a) ->
        {:error, :blocked}

      true ->
        case find_direct_conversation_id(user_a, user_b) do
          cid when is_binary(cid) ->
            {:ok,
             %{
               conversation_id: cid,
               member_ids: [user_a, user_b],
               member_count: 2,
               composition: "dyad",
               origin: :existing
             }}

          nil ->
            create_direct_conversation(user_a, user_b)
        end
    end
  end

  def ensure_direct_conversation(_, _), do: {:error, :invalid_users}

  defp find_direct_conversation_id(user_a, user_b) do
    # Prefer oldest exact dyad when historical duplicates exist (S1.1 repair).
    # A shared group with only these two would also match; exact size == 2 is required.
    from(cm1 in ConversationMember,
      join: cm2 in ConversationMember,
      on: cm1.conversation_id == cm2.conversation_id,
      join: c in Conversation,
      on: c.id == cm1.conversation_id,
      where: cm1.user_id == ^user_a and cm2.user_id == ^user_b,
      group_by: [cm1.conversation_id, c.inserted_at],
      having:
        fragment(
          "(select count(*) from conversation_members cm where cm.conversation_id = ?) = 2",
          cm1.conversation_id
        ),
      order_by: [asc: c.inserted_at],
      select: cm1.conversation_id,
      limit: 1
    )
    |> Repo.one()
  end

  defp create_direct_conversation(user_a, user_b) do
    label = "direct-#{String.slice(user_a, 0, 8)}-#{String.slice(user_b, 0, 8)}"

    case Repo.transaction(fn ->
           # Re-check inside the transaction to avoid duplicate dyads under concurrency.
           case find_direct_conversation_id(user_a, user_b) do
             cid when is_binary(cid) ->
               %{
                 conversation_id: cid,
                 member_ids: [user_a, user_b],
                 member_count: 2,
                 composition: "dyad",
                 origin: :existing
               }

             nil ->
               {:ok, conv} =
                 %Conversation{}
                 |> Conversation.changeset(%{label: label})
                 |> Repo.insert()

               Enum.each([user_a, user_b], fn uid ->
                 %ConversationMember{}
                 |> ConversationMember.changeset(%{
                   conversation_id: conv.id,
                   user_id: uid
                 })
                 |> Repo.insert!()
               end)

               %{
                 conversation_id: conv.id,
                 member_ids: [user_a, user_b],
                 member_count: 2,
                 composition: "dyad",
                 origin: :created
               }
           end
         end) do
      {:ok, result} -> {:ok, result}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Create a multi-member conversation (trusted group path).

  Requires at least 3 unique members including creator.
  Does not invent a second messaging system — uses ConversationMember.
  """
  def create_group_conversation(creator_user_id, member_user_ids, opts \\ [])
      when is_binary(creator_user_id) and is_list(member_user_ids) do
    members =
      ([creator_user_id | member_user_ids]
       |> Enum.filter(&is_binary/1)
       |> Enum.uniq())

    n = length(members)

    cond do
      n < 3 ->
        {:error, :group_too_small}

      n > 8 ->
        {:error, :group_too_large}

      true ->
        label =
          Keyword.get(opts, :label) ||
            "group-#{String.slice(creator_user_id, 0, 8)}-#{n}"

        Repo.transaction(fn ->
          {:ok, conv} =
            %Conversation{}
            |> Conversation.changeset(%{label: label})
            |> Repo.insert()

          Enum.each(members, fn uid ->
            %ConversationMember{}
            |> ConversationMember.changeset(%{
              conversation_id: conv.id,
              user_id: uid
            })
            |> Repo.insert!()
          end)

          %{
            conversation_id: conv.id,
            member_ids: members,
            member_count: n
          }
        end)
    end
  end

  @doc """
  Add a member to an existing conversation. Actor must already be a member.
  Idempotent if already a member.
  """
  def add_conversation_member(conversation_id, actor_user_id, new_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_binary(new_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id) do
      case Repo.get_by(ConversationMember,
             conversation_id: conversation_id,
             user_id: new_user_id
           ) do
        %ConversationMember{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          case %ConversationMember{}
               |> ConversationMember.changeset(%{
                 conversation_id: conversation_id,
                 user_id: new_user_id
               })
               |> Repo.insert() do
            {:ok, m} -> {:ok, m, :created}
            {:error, cs} -> {:error, cs}
          end
      end
    end
  end

  @doc "Member user ids for a conversation (membership-oracle only)."
  def member_user_ids(conversation_id) when is_binary(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: cm.user_id
    )
    |> Repo.all()
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  # Either direction active block between conversation members freezes messaging.
  defp ensure_not_blocked_in_conversation(conversation_id, user_id) do
    peers =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id != ^user_id,
        select: cm.user_id
      )
      |> Repo.all()

    blocked? =
      Enum.any?(peers, fn peer ->
        TrustSafety.blocked?(user_id, peer) or TrustSafety.blocked?(peer, user_id)
      end)

    if blocked?, do: {:error, :blocked}, else: :ok
  end

  defp insert_message(attrs, conversation_id, sender_user_id, client_message_id) do
    message_type = Map.get(attrs, :message_type) || Map.get(attrs, "message_type") || "text"
    body = Map.get(attrs, :body) || Map.get(attrs, "body") || ""
    source_language = Map.get(attrs, :source_language) || Map.get(attrs, "source_language")

    result =
      Repo.transaction(fn ->
        conversation =
          from(c in Conversation, where: c.id == ^conversation_id, lock: "FOR UPDATE")
          |> Repo.one()

        if is_nil(conversation) do
          Repo.rollback(:conversation_not_found)
        else
          seq = conversation.next_server_seq

          conversation
          |> Ecto.Changeset.change(next_server_seq: seq + 1)
          |> Repo.update!()

          %Message{}
          |> Message.create_changeset(%{
            conversation_id: conversation_id,
            sender_user_id: sender_user_id,
            client_message_id: client_message_id,
            message_type: message_type,
            body: body,
            source_language: source_language,
            server_seq: seq,
            delivery_state: "persisted",
            ai_processing_state: "not_requested",
            schema_version: "0.1.0"
          })
          |> Repo.insert()
          |> case do
            {:ok, message} ->
              {:created, message}

            {:error, %Ecto.Changeset{errors: errors} = changeset} ->
              if unique_client_id_error?(errors) do
                Repo.rollback(:idempotent_race)
              else
                Repo.rollback(changeset)
              end
          end
        end
      end)

    case result do
      {:ok, {:created, %Message{} = message}} ->
        # Real membership path: "Can Sam come?" → ConversationMember if User exists.
        _ =
          OpalCore.SocialFlow.GroupMembership.maybe_add_from_message(
            conversation_id,
            sender_user_id,
            body
          )

        # Durable Opal chronology — consequential transitions only.
        _ = OpalCore.SocialFlow.Chronology.record_after_message(message)
        _ = publish_message_accepted(message)

        # Real-time intelligence: write-ahead event → extract → reason → act.
        # Never fails the primary message write.
        _ =
          try do
            OpalCore.Intelligence.Pipeline.on_message_created(message, %{
              conversation_id: conversation_id
            })
          rescue
            e ->
              require Logger
              Logger.warning("intelligence.pipeline.rescue #{Exception.message(e)}")
              {:error, :pipeline_rescue}
          end

        {:ok, message, :created}

      {:error, :idempotent_race} ->
        case get_by_client_id(conversation_id, client_message_id) do
          %Message{} = existing -> {:ok, existing, :idempotent}
          nil -> {:error, :idempotent_race_unresolved}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp publish_message_accepted(%Message{} = message) do
    body = message.body || ""

    if ConversationAlignment.consequential?(body) do
      _ =
        Publisher.record(%{
          event_type: "conversation.message_accepted",
          aggregate_type: "conversation",
          aggregate_id: message.conversation_id,
          partition_key: message.conversation_id,
          purpose: "alignment",
          privacy_class: "shared_authorized",
          relationship_scope: message.conversation_id,
          payload: %{
            "conversation_id" => message.conversation_id,
            "message_id" => message.id,
            "sender_user_id" => message.sender_user_id,
            "consequential" => true
          }
        })

      _ = ConversationAlignment.sync_conversation(message.conversation_id)
    end

    :ok
  rescue
    _ -> :ok
  end

  defp unique_client_id_error?(errors) do
    Enum.any?(errors, fn
      {:client_message_id, {_, opts}} when is_list(opts) ->
        opts[:constraint] == :unique

      {_, {_, opts}} when is_list(opts) ->
        opts[:constraint] == :unique

      _ ->
        false
    end)
  end
end
