defmodule OpalCore.SocialFlow.GroupMembership do
  @moduledoc """
  Real multi-member membership transitions — not projected guest counts.

  When conversation evidence asks "Can Sam come?", this module resolves Sam
  to a real User (by display_name / handle) and adds them via ConversationMember
  on the same product path as create_group / add_member.

  No second shadow participant store.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Chronology

  @guest_ask ~r/\bcan\s+([A-Za-z][A-Za-z\-']{1,24})\s+come\b/i
  @bring_ask ~r/\bbring\s+([A-Za-z][A-Za-z\-']{1,24})\b/i
  @invite_ask ~r/\binvite\s+([A-Za-z][A-Za-z\-']{1,24})\b/i

  @doc """
  After a human message is accepted, if it invites a named person who already
  has an Opal account, add them as a real ConversationMember.

  Returns:
  - `{:ok, :added, user, membership_meta}` when newly added
  - `{:ok, :already_member, user}` when already in conversation
  - `{:ok, :no_invite}` when message is not a guest ask
  - `{:ok, :unresolved, name}` when name mentioned but no User exists
  - `{:error, reason}`
  """
  def maybe_add_from_message(conversation_id, actor_user_id, body)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_binary(body) do
    case extract_invite_name(body) do
      nil ->
        {:ok, :no_invite}

      name ->
        resolve_and_add(conversation_id, actor_user_id, name)
    end
  end

  def maybe_add_from_message(_, _, _), do: {:ok, :no_invite}

  @doc "Resolve display name / handle to user and add as ConversationMember."
  def resolve_and_add(conversation_id, actor_user_id, name)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_binary(name) do
    with :ok <- ensure_actor_member(conversation_id, actor_user_id),
         {:ok, user} <- find_user_by_name(name) do
      case Messages.add_conversation_member(conversation_id, actor_user_id, user.id) do
        {:ok, _member, :created} ->
          members = Messages.member_user_ids(conversation_id)

          Chronology.record_consequential(conversation_id, %{
            kind: "member_added",
            label: "#{user.display_name} is in the conversation",
            detail: "#{length(members)} people",
            evidence_message_id: nil,
            source_message_ids: [],
            after_server_seq: last_seq(conversation_id),
            created_from: "group_membership",
            composition_snapshot: %{
              "member_count" => length(members),
              "added_user_display" => user.display_name
            },
            idempotency_key: "member-add-#{conversation_id}-#{user.id}"
          })

          {:ok, :added, user,
           %{
             "member_count" => length(members),
             "member_ids" => members,
             "added_user_id" => user.id,
             "added_display_name" => user.display_name,
             "composition" => if(length(members) >= 3, do: "group", else: "dyad")
           }}

        {:ok, _member, :idempotent} ->
          {:ok, :already_member, user}

        {:error, reason} ->
          {:error, reason}
      end
    else
      {:error, :not_found} ->
        {:ok, :unresolved, String.trim(name)}

      {:error, :ambiguous_name} ->
        # Do not invent membership when multiple users share a first name.
        {:ok, :unresolved, String.trim(name)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Remove member (decline / out). Actor must be member; cannot remove last two required easily."
  def remove_member(conversation_id, actor_user_id, target_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_binary(target_user_id) do
    with :ok <- ensure_actor_member(conversation_id, actor_user_id) do
      case Repo.get_by(ConversationMember,
             conversation_id: conversation_id,
             user_id: target_user_id
           ) do
        nil ->
          {:error, :not_a_member}

        %ConversationMember{} = m ->
          {:ok, _} = Repo.delete(m)
          members = Messages.member_user_ids(conversation_id)

          Chronology.record_consequential(conversation_id, %{
            kind: "member_removed",
            label: "Someone stepped out of the plan",
            detail: "#{length(members)} people remain",
            after_server_seq: last_seq(conversation_id),
            created_from: "group_membership",
            composition_snapshot: %{"member_count" => length(members)},
            idempotency_key:
              "member-rm-#{conversation_id}-#{target_user_id}-#{System.unique_integer([:positive])}"
          })

          {:ok, %{member_count: length(members), member_ids: members}}
      end
    end
  end

  def extract_invite_name(body) when is_binary(body) do
    cond do
      m = Regex.run(@guest_ask, body) -> clean_name(Enum.at(m, 1))
      m = Regex.run(@bring_ask, body) -> clean_name(Enum.at(m, 1))
      m = Regex.run(@invite_ask, body) -> clean_name(Enum.at(m, 1))
      true -> nil
    end
  end

  def extract_invite_name(_), do: nil

  defp clean_name(name) do
    n = String.trim(name || "")

    if String.downcase(n) in ~w(i we you they someone anyone us him her me) do
      nil
    else
      n
    end
  end

  defp find_user_by_name(name) do
    needle = String.downcase(String.trim(name))

    candidates =
      from(u in User,
        where:
          fragment("lower(?)", u.display_name) == ^needle or
            fragment("lower(?)", u.handle) == ^needle or
            fragment("lower(?)", u.handle) == ^(needle <> "_rev") or
            fragment("lower(?)", u.handle) == ^(needle <> "-rev")
      )
      |> Repo.all()

    # Prefer exact handle match (product seed handles end in _rev). Never ilike-prefix
    # multiple "Sam" rows into the same group (smoke-found duplicate membership).
    user =
      Enum.find(candidates, fn u -> String.downcase(u.handle || "") == needle end) ||
        Enum.find(candidates, fn u -> String.downcase(u.handle || "") == needle <> "_rev" end) ||
        case candidates do
          [only] -> only
          _ -> nil
        end

    cond do
      user -> {:ok, user}
      candidates == [] -> {:error, :not_found}
      true -> {:error, :ambiguous_name}
    end
  end

  defp ensure_actor_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp last_seq(conversation_id) do
    from(m in OpalCore.Messaging.Message,
      where: m.conversation_id == ^conversation_id,
      select: max(m.server_seq)
    )
    |> Repo.one() || 0
  end
end
