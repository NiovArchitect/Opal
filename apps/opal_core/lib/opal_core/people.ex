defmodule OpalCore.People do
  @moduledoc """
  Repair #20 (F-6 / F-8) — THE one people projection for search,
  pickers, and start-a-chat.

  Why this exists (F-6 root cause): people reached the surfaces by
  UNIONING independent source projections — conversation peers,
  relationship contacts, and establishment-connected people
  (`Onboarding.people_summary/1`) — with no identity resolution at
  the seam. `people_summary` made it worse: its connected rows
  carried NO identity key at all (no peer user id) and were never
  deduplicated, so the same person could surface once per source,
  and a downstream union had nothing stable to dedupe on. In the
  founder's staging world that is exactly how "Maya Torres" — the
  seed-world person and the real second account's connected record —
  rendered twice under People.

  The law this module enforces (HARD ISOLATION, applied to identity
  itself):

    * The identity key is the account/person id (the User id). Two
      source records with the same identity key are ONE person and
      project as exactly one row.
    * When both a non-account-backed record (an establishment /
      seed-world person record) and an account-backed record (the
      person reached through a real account-owned surface — a
      conversation membership, or an active verified phone
      identifier) exist for the same identity, the account-backed
      record wins for the display name and the conversation link.
      Data is never blended across identities: fields are taken
      from the winning record of the SAME identity only.
    * Genuinely distinct people who share a display name are
      DIFFERENT identities (different ids). They both appear, as
      separate rows, with their own data unmixed. A name is never
      an identity key, and nothing here ever merges by name.

  Ordering (F-8a): most-talked-to first, derived from the viewer's
  real conversation record — the person's most recent conversation
  activity, then their conversation message volume — never
  alphabetical and never seed order. People with no conversation
  yet follow, by name, so the list stays deterministic.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{RelationshipEstablishment, VerifiedCommunicationIdentifier}

  @source_rank %{conversation: 0, contact: 1, establishment: 2}

  @doc """
  Pure identity resolution over source entries. Each entry is a map
  with `:identity_id` (required — entries without one are dropped:
  a person record with no identity key can never be resolved, only
  duplicated), `:display_name`, `:account_backed`, `:source`
  (:conversation | :contact | :establishment), and optionally
  `:conversation_id`, `:last_talked_at` (DateTime), `:talk_count`,
  and `:relationship_type`. Returns one merged person per identity,
  ordered most-talked-to first.
  """
  def resolve(entries) when is_list(entries) do
    entries
    |> Enum.filter(fn e -> is_binary(e[:identity_id]) and e[:identity_id] != "" end)
    |> Enum.group_by(fn e -> e[:identity_id] end)
    |> Enum.map(fn {identity_id, group} -> merge_group(identity_id, group) end)
    |> Enum.reject(fn p -> is_nil(p.display_name) or String.trim(p.display_name) == "" end)
    |> sort_people()
  end

  def resolve(_), do: []

  defp merge_group(identity_id, group) do
    ranked =
      Enum.sort_by(group, fn e ->
        {if(e[:account_backed], do: 0, else: 1), Map.get(@source_rank, e[:source], 9)}
      end)

    named =
      Enum.find(ranked, fn e ->
        is_binary(e[:display_name]) and String.trim(e[:display_name]) != ""
      end)

    conversation_entries = Enum.filter(group, fn e -> is_binary(e[:conversation_id]) end)

    latest_conversation =
      Enum.max_by(
        conversation_entries,
        fn e ->
          if e[:last_talked_at],
            do: DateTime.to_unix(e[:last_talked_at], :microsecond),
            else: 0
        end,
        fn -> nil end
      )

    %{
      identity_id: identity_id,
      # Repair #23 (F-1): the account user id behind this identity,
      # resolved against the accounts store in `for_viewer/1` (nil
      # until then, and nil for an identity with no account row).
      # Kept DISTINCT from `identity_id`: the identity key is
      # assembled from several sources (conversation user ids,
      # contact `contact_user_id`s, establishment participant ids)
      # and is not, by itself, the key the membership machinery
      # speaks - `ConversationMember.user_id` is an account id.
      account_user_id: nil,
      display_name: named && String.trim(named[:display_name]),
      account_backed: Enum.any?(group, fn e -> e[:account_backed] == true end),
      conversation_id: latest_conversation && latest_conversation[:conversation_id],
      last_talked_at:
        group
        |> Enum.map(fn e -> e[:last_talked_at] end)
        |> Enum.reject(&is_nil/1)
        |> Enum.max_by(fn dt -> DateTime.to_unix(dt, :microsecond) end, fn -> nil end),
      talk_count:
        group
        |> Enum.filter(fn e -> e[:source] == :conversation end)
        |> Enum.map(fn e -> e[:talk_count] || 0 end)
        |> Enum.sum(),
      relationship_type: Enum.find_value(group, fn e -> e[:relationship_type] end)
    }
  end

  defp sort_people(people) do
    Enum.sort_by(people, fn p ->
      unix = if p.last_talked_at, do: DateTime.to_unix(p.last_talked_at, :microsecond), else: 0

      {
        if(p.last_talked_at, do: 0, else: 1),
        -unix,
        -p.talk_count,
        String.downcase(p.display_name || "")
      }
    end)
  end

  @doc """
  The viewer's people, resolved and ordered, from the real stores:
  conversation peers (account-backed, with talk stats), relationship
  contacts, and establishment-connected people.
  """
  def for_viewer(viewer_id) when is_binary(viewer_id) do
    conversation_ids =
      from(cm in ConversationMember,
        where: cm.user_id == ^viewer_id,
        select: cm.conversation_id
      )
      |> Repo.all()

    verified_ids = verified_account_ids(viewer_id, conversation_ids)

    entries =
      conversation_entries(viewer_id, conversation_ids, verified_ids) ++
        contact_entries(viewer_id, verified_ids) ++
        establishment_entries(viewer_id, verified_ids)

    people = resolve(entries)

    # Repair #23 (F-1): stamp each resolved person with the account
    # user id behind their identity, looked up in the accounts
    # store itself - the one key space `ConversationMember.user_id`
    # and the membership projection speak. An identity with no
    # account row keeps nil: it cannot be added to a conversation,
    # and consumers must not fall back to the assembled identity
    # key for membership decisions.
    identity_ids = Enum.map(people, fn p -> p.identity_id end)

    account_ids =
      from(u in User, where: u.id in ^identity_ids, select: u.id)
      |> Repo.all()
      |> MapSet.new()

    Enum.map(people, fn p ->
      Map.put(
        p,
        :account_user_id,
        if(MapSet.member?(account_ids, p.identity_id), do: p.identity_id, else: nil)
      )
    end)
  end

  def for_viewer(_), do: []

  defp verified_account_ids(viewer_id, conversation_ids) do
    candidate_ids =
      from(cm in ConversationMember,
        where: cm.conversation_id in ^conversation_ids and cm.user_id != ^viewer_id,
        select: cm.user_id
      )
      |> Repo.all()

    ids = Enum.uniq([viewer_id | candidate_ids])

    from(v in VerifiedCommunicationIdentifier,
      where:
        v.human_account_id in ^ids and v.verification_state == "active" and
          is_nil(v.detached_at),
      select: v.human_account_id
    )
    |> Repo.all()
    |> MapSet.new()
  end

  # Conversation peers are account-backed by membership itself (a
  # real account sits in a real conversation); the verified set is
  # consulted for the contact/establishment legs, not this one.
  defp conversation_entries(viewer_id, conversation_ids, _verified_ids) do
    if conversation_ids == [] do
      []
    else
      stats =
        from(m in Message,
          where: m.conversation_id in ^conversation_ids,
          group_by: m.conversation_id,
          select: %{
            conversation_id: m.conversation_id,
            count: count(m.id),
            last_at: max(m.inserted_at)
          }
        )
        |> Repo.all()
        |> Map.new(fn s -> {s.conversation_id, s} end)

      conversation_updated =
        from(c in Conversation,
          where: c.id in ^conversation_ids,
          select: {c.id, c.updated_at}
        )
        |> Repo.all()
        |> Map.new()

      from(cm in ConversationMember,
        join: u in User,
        on: u.id == cm.user_id,
        where: cm.conversation_id in ^conversation_ids and cm.user_id != ^viewer_id,
        select: %{
          identity_id: u.id,
          display_name: u.display_name,
          conversation_id: cm.conversation_id
        }
      )
      |> Repo.all()
      |> Enum.map(fn row ->
        stat = Map.get(stats, row.conversation_id)

        %{
          identity_id: row.identity_id,
          display_name: row.display_name,
          account_backed: true,
          source: :conversation,
          conversation_id: row.conversation_id,
          last_talked_at:
            (stat && stat.last_at) || Map.get(conversation_updated, row.conversation_id),
          talk_count: (stat && stat.count) || 0
        }
      end)
    end
  end

  defp contact_entries(viewer_id, verified_ids) do
    viewer_id
    |> Relationships.contacts_with_types()
    |> Enum.map(fn c ->
      %{
        identity_id: c.contact_user_id,
        display_name: c.display_name,
        account_backed: MapSet.member?(verified_ids, c.contact_user_id),
        source: :contact,
        conversation_id: nil,
        last_talked_at: nil,
        talk_count: 0,
        relationship_type: c.type
      }
    end)
  end

  defp establishment_entries(viewer_id, verified_ids) do
    from(e in RelationshipEstablishment,
      where: e.status == "active",
      order_by: [desc: e.established_at],
      limit: 100
    )
    |> Repo.all()
    |> Enum.filter(fn e -> viewer_id in (e.participant_ids || []) end)
    |> Enum.map(fn e ->
      peer_id = Enum.find(e.participant_ids || [], fn id -> id != viewer_id end)
      peer = peer_id && Repo.get(User, peer_id)

      %{
        identity_id: peer_id,
        display_name: peer && peer.display_name,
        account_backed: MapSet.member?(verified_ids, peer_id),
        source: :establishment,
        conversation_id: e.conversation_id,
        last_talked_at: nil,
        talk_count: 0,
        relationship_type: nil
      }
    end)
  end

  def to_contract(person) when is_map(person) do
    %{
      "id" => person.identity_id,
      "person_id" => person.identity_id,
      # Repair #23 (F-1): the account user id, emitted distinctly
      # from the assembled identity key above. Membership surfaces
      # key exclusion, dedupe, and the add call on THIS field -
      # never on `id` / `person_id`.
      "account_user_id" => Map.get(person, :account_user_id),
      "display_name" => person.display_name,
      "name" => person.display_name,
      "account_backed" => person.account_backed,
      "conversation_id" => person.conversation_id,
      "last_talked_at" => person.last_talked_at && DateTime.to_iso8601(person.last_talked_at),
      "talk_count" => person.talk_count,
      "relationship_type" => person.relationship_type
    }
  end
end
