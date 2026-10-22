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
    Chronology,
    ConversationAlignment,
    HomeProjection,
    NextPlan,
    SeedFixtureLeak,
    SharedPlan,
    SmokeResidue,
    TrustSafety
  }

  # Repair #18 (W4-01) - no-key duplicate window: a send that carries
  # NO client_message_id and repeats a message the same sender already
  # stored in this conversation with an identical body inside this
  # many seconds is a transport duplicate (double-tap / retry storm),
  # not a new message. It returns the original delivery and applies
  # no state twice. The window is deliberately tight: an intentional
  # repeat of the same words seconds apart in the same thread is
  # indistinguishable from a duplicate delivery, and the honest
  # surface for it is the original message, once.
  @no_key_dedupe_window_seconds 10

  @doc "Seconds within which an identical no-key send collapses to the original delivery (W4-01)."
  def no_key_dedupe_window_seconds, do: @no_key_dedupe_window_seconds

  @doc """
  Accepts a minimal message for a conversation member.

  Idempotent on `{conversation_id, client_message_id}` when the
  caller supplies a key (the key is scoped to the conversation AND
  the sender: a key another sender already used in this conversation
  is an `{:error, :idempotency_conflict}`, never a replay of their
  message). When NO key is supplied, an identical send by the same
  sender in the same conversation inside the no-key dedupe window
  collapses to the original delivery the same way. Keyless sends
  outside that signature insert under a server-minted key.
  """
  def accept_message(attrs) when is_map(attrs) do
    conversation_id = fetch_attr!(attrs, :conversation_id)
    sender_user_id = fetch_attr!(attrs, :sender_user_id)

    client_message_id =
      Map.get(attrs, :client_message_id) || Map.get(attrs, "client_message_id")

    with :ok <- ensure_member(conversation_id, sender_user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, sender_user_id) do
      # Repair #18 (A-center) - idempotency BEFORE the throttles: a client
      # re-send of a message the server already stored (same
      # client_message_id) returns the stored row and consumes no rate or
      # spam budget. Previously the throttles ran first, so a retry after
      # a throttle rejection could be throttled again on a message that
      # was already safely stored - the user's words lost silently.
      # Repair #18 (W4-01) extends the same rule to keyless rapid
      # duplicates and scopes the key lookup to the sender.
      case dedupe_existing(conversation_id, sender_user_id, client_message_id, attrs) do
        {:existing, %Message{} = existing} ->
          {:ok, existing, :idempotent}

        :conflict ->
          {:error, :idempotency_conflict}

        :none ->
          with :ok <- ensure_message_rate_limit(sender_user_id),
               :ok <- ensure_spam_throttle(sender_user_id, conversation_id) do
            insert_message(
              attrs,
              conversation_id,
              sender_user_id,
              client_message_id || "srv-#{Ecto.UUID.generate()}"
            )
          end
      end
    end
  end

  # W4-01 dedupe lookup. With a caller key: the stored row under
  # (conversation, key) is this sender's original delivery, another
  # sender's row (a collision - never replayed across accounts), or
  # nothing. Without a key: the sender's own identical message inside
  # the rapid-duplicate window, or nothing.
  defp dedupe_existing(conversation_id, sender_user_id, client_message_id, _attrs)
       when is_binary(client_message_id) and client_message_id != "" do
    case get_by_client_id(conversation_id, client_message_id) do
      %Message{sender_user_id: ^sender_user_id} = existing -> {:existing, existing}
      %Message{} -> :conflict
      nil -> :none
    end
  end

  defp dedupe_existing(conversation_id, sender_user_id, _no_key, attrs) do
    body = Map.get(attrs, :body) || Map.get(attrs, "body") || ""
    message_type = Map.get(attrs, :message_type) || Map.get(attrs, "message_type") || "text"

    if body == "" or message_type != "text" do
      :none
    else
      cutoff =
        DateTime.utc_now()
        |> DateTime.add(-@no_key_dedupe_window_seconds, :second)

      existing =
        from(m in Message,
          where:
            m.conversation_id == ^conversation_id and m.sender_user_id == ^sender_user_id and
              m.body == ^body and m.inserted_at >= ^cutoff,
          order_by: [desc: m.server_seq],
          limit: 1
        )
        |> Repo.one()

      case existing do
        %Message{} = message -> {:existing, message}
        nil -> :none
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
  #
  # Repair #18 (A-center) - the bucket is scoped per conversation, not
  # per user globally. The global bucket counted a user's ordinary
  # messages across every thread toward one 10-in-5-minutes cap, so
  # normal multi-thread use (the founder's walk) throttled a legitimate
  # first message in a thread he had barely touched. Per conversation,
  # a normal single send in a fresh thread always passes (count 1 of
  # 10), while a genuine burst into one non-contact thread still
  # throttles at the same threshold.
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
      case OpalCore.SocialFlow.RateLimitBucket.hit(
             "spam:#{user_id}:#{conversation_id}",
             "non_contact_message",
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
      current_plan = current_plan(cid)
      plan_alignment = current_plan && current_plan.alignment

      %{
        "id" => conversation.id,
        "title" => conversation_title(peers, conversation),
        "peers" =>
          Enum.map(peers, fn p ->
            %{
              "id" => p.id,
              "display_name" => p.display_name,
              "handle" => p.handle,
              # DIR-1: the peer's stable entity tint (L9) - the person
              # element's color on every plan-awareness rendering.
              "entity_tint" => NextPlan.entity_tint(p.id)
            }
          end),
        # DIR-1: the conversation entity's own tint - the sole peer's
        # tint for a dyad; a stable conversation tint for a group.
        "entity_tint" =>
          if(member_count == 2 and length(peers) == 1,
            do: NextPlan.entity_tint(hd(peers).id),
            else: NextPlan.entity_tint(conversation.id)
          ),
        # DIR-1: the ONE shared upcoming plan fact for this
        # conversation (NextPlan.for_conversation/2), or nil - never
        # an empty painted pill. The front end renders it; it never
        # re-derives shared/upcoming/next itself.
        "next_plan" => NextPlan.for_conversation(user_id, cid),
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
        # Repair #18: viewer-scoped so the card carries viewer_state (the
        # viewer's own canonical response state) beside the one counter.
        "plan_projection" =>
          HomeProjection.from_alignment(plan_alignment, cid, member_count, viewer_id: user_id) ||
            HomeProjection.from_plan_row(current_plan, cid, member_count, viewer_id: user_id)
      }
    end)
    |> Enum.sort_by(& &1["updated_at"], :desc)
  end

  # Prefer the newest active plan for list projection; cancelled/completed stay in history.
  # Repair #18 (W4-01): the Chats list projects the thread's fold
  # plan, never a separate new-plan lineage the intent gate created
  # alongside it (same preference as
  # ConversationAlignment.active_plan_for_conversation/1) - the
  # surfaces must agree about which plan is the thread's current one.
  defp current_plan(conversation_id) do
    plans =
      from(p in SharedPlan,
        where:
          p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at]
      )
      |> Repo.all()

    Enum.find(plans, fn plan ->
      get_in(plan.alignment || %{}, ["origin"]) != "chat_new_plan"
    end) || List.first(plans)
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

  Fetches the newest `limit` rows then reverses so the client always receives
  chronological oldest→newest reading order (Repair #7 P0-E).
  """
  def list_messages(conversation_id, user_id, opts \\ []) do
    with :ok <- ensure_member(conversation_id, user_id),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, user_id) do
      limit = Keyword.get(opts, :limit, 100)

      newest =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [desc: m.server_seq, desc: m.inserted_at],
          limit: ^limit
        )
        |> Repo.all()

      messages =
        newest
        |> Enum.reverse()
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
                 |> Conversation.changeset(%{label: label, created_by_user_id: user_a})
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
      [creator_user_id | member_user_ids]
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()

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
            |> Conversation.changeset(%{label: label, created_by_user_id: creator_user_id})
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

  Repair #21 (W-5b): a real addition (origin `:created`) is recorded
  into the conversation's durable record - a Chronology
  `member_added` moment (the orbit's history; the idempotency key is
  the same one `GroupMembership` uses, so the message-invite path
  and this path can never double-record one addition) - plus an
  AccountActivity entry for both the actor and the person added.
  An idempotent re-add records nothing: nothing happened.
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
            {:ok, m} ->
              record_member_added(conversation_id, actor_user_id, new_user_id)
              {:ok, m, :created}

            {:error, cs} ->
              {:error, cs}
          end
      end
    end
  end

  @doc """
  Repair #21 (W-5b) - add SEVERAL people to a conversation in one
  action (multi-select). Actor must already be a member. Each person
  goes through the same `add_conversation_member/3` path (same
  recording, same idempotency), so a person already in the
  conversation is reported in `already_member_ids`, never duplicated
  and never re-recorded. The conversation id never changes: adding
  people widens THIS conversation, it never mints a new one.
  """
  def add_conversation_members(conversation_id, actor_user_id, new_user_ids)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_list(new_user_ids) do
    ids =
      new_user_ids
      |> Enum.filter(&is_binary/1)
      |> Enum.reject(&(&1 == ""))
      |> Enum.uniq()

    with :ok <- ensure_member(conversation_id, actor_user_id) do
      results =
        Enum.map(ids, fn uid ->
          case add_conversation_member(conversation_id, actor_user_id, uid) do
            {:ok, _m, :created} -> {uid, :added}
            {:ok, _m, :idempotent} -> {uid, :already_member}
            {:error, reason} -> {uid, {:error, reason}}
          end
        end)

      case Enum.find(results, fn {_uid, r} -> match?({:error, _}, r) end) do
        {_uid, {:error, reason}} ->
          {:error, reason}

        nil ->
          members = member_user_ids(conversation_id)

          {:ok,
           %{
             conversation_id: conversation_id,
             added_ids: for({uid, :added} <- results, do: uid),
             already_member_ids: for({uid, :already_member} <- results, do: uid),
             member_ids: members,
             member_count: length(members)
           }}
      end
    end
  end

  @doc """
  Repair #21 (W-5b) - the conversation's creator, from the record:
  the `created_by_user_id` written at creation; for a row that does
  not carry one, the earliest member on record (every creation path
  inserts the creator's membership first - the migration backfill
  used the same rule). Nil when the conversation has no members and
  no recorded creator: honestly nobody, and then only self-removal
  is permitted below.
  """
  def conversation_creator_id(conversation_id) when is_binary(conversation_id) do
    if OpalCore.IdShape.uuid?(conversation_id) do
      case Repo.get(Conversation, conversation_id) do
        %Conversation{created_by_user_id: creator} when is_binary(creator) ->
          creator

        _ ->
          from(cm in ConversationMember,
            where: cm.conversation_id == ^conversation_id,
            order_by: [asc: cm.inserted_at, asc: cm.id],
            limit: 1,
            select: cm.user_id
          )
          |> Repo.one()
      end
    end
  end

  def conversation_creator_id(_), do: nil

  @doc """
  Repair #21 (W-5b) - remove a member, under the admin rule:

  - anyone may remove THEMSELVES (leave);
  - removing SOMEONE ELSE is the creator's alone - there is no
    admin concept in the Conversation model, so no one else is
    invented as one;
  - the actor and the target must both be members.

  The conversation id never changes and no new conversation is
  minted: the same conversation continues with fewer people. A real
  removal is recorded as a Chronology `member_removed` moment (the
  orbit's history) plus AccountActivity entries.
  """
  def remove_conversation_member(conversation_id, actor_user_id, target_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) and
             is_binary(target_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id),
         :ok <- ensure_removal_authority(conversation_id, actor_user_id, target_user_id) do
      case Repo.get_by(ConversationMember,
             conversation_id: conversation_id,
             user_id: target_user_id
           ) do
        nil ->
          {:error, :target_not_a_member}

        %ConversationMember{} = member ->
          {:ok, _} = Repo.delete(member)
          record_member_removed(conversation_id, actor_user_id, target_user_id)
          members = member_user_ids(conversation_id)

          {:ok,
           %{
             conversation_id: conversation_id,
             removed_user_id: target_user_id,
             left: actor_user_id == target_user_id,
             member_ids: members,
             member_count: length(members)
           }}
      end
    end
  end

  defp ensure_removal_authority(conversation_id, actor_user_id, target_user_id) do
    cond do
      actor_user_id == target_user_id ->
        :ok

      conversation_creator_id(conversation_id) == actor_user_id ->
        :ok

      true ->
        {:error, :not_creator}
    end
  end

  @doc """
  Repair #21 (W-5b) - the membership events in a conversation's
  durable record (Chronology `member_added` / `member_removed`
  moments), newest first, as finished lines: this is how the orbit
  knows who came and went. Shared moments only - the membership
  record is a fact about the whole conversation.
  """
  def membership_events(conversation_id, limit \\ 20)

  def membership_events(conversation_id, limit)
      when is_binary(conversation_id) and is_integer(limit) do
    if OpalCore.IdShape.uuid?(conversation_id) do
      from(m in OpalCore.SocialFlow.OpalChronologyMoment,
        where:
          m.conversation_id == ^conversation_id and
            m.kind in ["member_added", "member_removed"] and m.visibility == "shared",
        order_by: [desc: m.inserted_at],
        limit: ^limit
      )
      |> Repo.all()
      |> Enum.map(fn m ->
        snapshot = m.composition_snapshot || %{}

        %{
          "kind" => m.kind,
          "label" => m.label,
          "detail" => m.detail,
          "actor_user_id" => snapshot["actor_user_id"],
          "target_user_id" => snapshot["target_user_id"],
          "at" => m.inserted_at && DateTime.to_iso8601(m.inserted_at)
        }
      end)
    else
      []
    end
  end

  def membership_events(_, _), do: []

  @doc """
  Repair #21 (W-5b) - the viewer-scoped membership projection the
  group thread's manage surface renders: the creator truth, every
  member with their finished flags (creator / viewer / whether THIS
  viewer may remove them under the admin rule), and the recorded
  membership events. A non-member gets `{:error, :not_a_member}` -
  there is no membership view into a conversation you are not in.
  """
  def membership_projection(conversation_id, viewer_id)
      when is_binary(conversation_id) and is_binary(viewer_id) do
    with :ok <- ensure_member(conversation_id, viewer_id) do
      creator_id = conversation_creator_id(conversation_id)

      rows =
        from(cm in ConversationMember,
          join: u in OpalCore.Accounts.User,
          on: u.id == cm.user_id,
          where: cm.conversation_id == ^conversation_id,
          order_by: [asc: cm.inserted_at, asc: cm.id],
          select: %{user_id: u.id, display_name: u.display_name, handle: u.handle}
        )
        |> Repo.all()
        # Repair #23 (F-1): the members projection dedupes by user
        # id - one member, one row, whatever the join produced.
        |> Enum.uniq_by(fn row -> row.user_id end)

      members =
        Enum.map(rows, fn row ->
          is_viewer = row.user_id == viewer_id
          is_creator = row.user_id == creator_id

          %{
            "user_id" => row.user_id,
            "display_name" => row.display_name,
            "handle" => row.handle,
            "is_creator" => is_creator,
            "is_viewer" => is_viewer,
            # The admin rule, decided HERE from the record: you may
            # always remove yourself; the creator may remove others;
            # nobody else may remove anyone.
            "can_remove" => is_viewer or (viewer_id == creator_id and not is_viewer)
          }
        end)

      {:ok,
       %{
         "conversation_id" => conversation_id,
         "creator_user_id" => creator_id,
         "viewer_is_creator" => creator_id == viewer_id,
         "composition" => if(length(members) >= 3, do: "group", else: "dyad"),
         "members" => members,
         "membership_events" => membership_events(conversation_id)
       }}
    end
  end

  defp record_member_added(conversation_id, actor_user_id, new_user_id) do
    name = display_name_of(new_user_id)
    members = member_user_ids(conversation_id)

    Chronology.record_consequential(conversation_id, %{
      kind: "member_added",
      label: "#{name} joined the conversation",
      detail: "#{length(members)} people",
      evidence_message_id: nil,
      source_message_ids: [],
      after_server_seq: last_server_seq(conversation_id),
      created_from: "group_membership",
      composition_snapshot: %{
        "member_count" => length(members),
        "actor_user_id" => actor_user_id,
        "target_user_id" => new_user_id
      },
      idempotency_key: "member-add-#{conversation_id}-#{new_user_id}"
    })

    record_membership_activity(actor_user_id, "conversation_member_added", conversation_id, %{
      "target_user_id" => new_user_id
    })

    record_membership_activity(new_user_id, "conversation_member_added", conversation_id, %{
      "actor_user_id" => actor_user_id
    })

    :ok
  end

  defp record_member_removed(conversation_id, actor_user_id, target_user_id) do
    name = display_name_of(target_user_id)
    members = member_user_ids(conversation_id)
    left? = actor_user_id == target_user_id

    Chronology.record_consequential(conversation_id, %{
      kind: "member_removed",
      label:
        if(left?,
          do: "#{name} left the conversation",
          else: "#{name} was removed from the conversation"
        ),
      detail: "#{length(members)} people remain",
      evidence_message_id: nil,
      source_message_ids: [],
      after_server_seq: last_server_seq(conversation_id),
      created_from: "group_membership",
      composition_snapshot: %{
        "member_count" => length(members),
        "actor_user_id" => actor_user_id,
        "target_user_id" => target_user_id,
        "left" => left?
      },
      idempotency_key:
        "member-rm-#{conversation_id}-#{target_user_id}-#{System.unique_integer([:positive])}"
    })

    record_membership_activity(
      actor_user_id,
      if(left?, do: "conversation_member_left", else: "conversation_member_removed"),
      conversation_id,
      %{"target_user_id" => target_user_id}
    )

    if not left? do
      record_membership_activity(target_user_id, "conversation_member_removed", conversation_id, %{
        "actor_user_id" => actor_user_id
      })
    end

    :ok
  end

  defp record_membership_activity(user_id, kind, conversation_id, detail) do
    _ = OpalCore.Accounts.AccountActivity.record(user_id, kind, conversation_id, detail)
    :ok
  end

  defp display_name_of(user_id) do
    case Repo.get(OpalCore.Accounts.User, user_id) do
      %OpalCore.Accounts.User{display_name: name} when is_binary(name) and name != "" -> name
      _ -> "Someone"
    end
  end

  defp last_server_seq(conversation_id) do
    from(m in Message,
      where: m.conversation_id == ^conversation_id,
      select: max(m.server_seq)
    )
    |> Repo.one() || 0
  end

  @doc "Member user ids for a conversation (membership-oracle only)."
  # Repair #18 fix wave (RF-1) — a conversation-less record (a
  # Center-born plan) has no member context at all: that is an empty
  # member list, a legal state, never a FunctionClauseError for the
  # callers that read membership off a plan row.
  def member_user_ids(nil), do: []

  def member_user_ids(conversation_id) when is_binary(conversation_id) do
    # FR-11-08: a junk conversation id has no members - the query
    # below would raise a CastError against :binary_id instead.
    if OpalCore.IdShape.uuid?(conversation_id) do
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id,
        select: cm.user_id
      )
      |> Repo.all()
    else
      []
    end
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      OpalCore.IdShape.uuid?(conversation_id) and
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

        # Repair #18 residuals #2 - by now every synchronous
        # acceptance path for this turn has run (the fold sync in
        # publish_message_accepted/1, the intelligence pipeline, and
        # the acceptance paths' own chronology hooks). If any of them
        # settled a revision, its time_resolved moment must exist
        # before this turn returns, anchored at THIS message - never
        # waiting for a later message to run the recorder, which made
        # the read-after-confirm stale by one message
        # (FR-18-02-revision). Idempotent per revision.
        _ = OpalCore.SocialFlow.Chronology.record_revision_moment(message)

        {:ok, message, :created}

      {:error, :idempotent_race} ->
        case get_by_client_id(conversation_id, client_message_id) do
          # W4-01: the race winner is only this sender's duplicate when
          # the sender matches; another sender's row under the same key
          # is a conflict, never a cross-account replay.
          %Message{sender_user_id: ^sender_user_id} = existing ->
            {:ok, existing, :idempotent}

          %Message{} ->
            {:error, :idempotency_conflict}

          nil ->
            {:error, :idempotent_race_unresolved}
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
