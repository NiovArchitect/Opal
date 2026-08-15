defmodule OpalCore.SocialFlow.RelationshipGraph do
  @moduledoc """
  Relationship graph authority for Social Moment audience (Pass 18).

  Owner of: who is eligible for FRIENDS visibility.

  Hard laws:
  - CONTACT MATCH ≠ FRIEND
  - INVITED/PENDING ≠ FRIEND
  - INFERENCE cannot expand audience
  - ATTRIBUTION cannot expand visibility
  - PROVIDER cannot expand visibility
  - Block overrides friend edges

  Friend authority (server):
  mutual connection via active RelationshipEstablishment OR
  shared active dyad conversation membership (exactly 2 members).

  Group membership alone is NOT friend authority.

  Historical policy (FRIENDS / GROUP): DYNAMIC current authority at view time.
  - New friend may see older FRIENDS Moments.
  - Removed friend loses future and historical FRIENDS access.
  - Group: current ConversationMember required at view time.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.{RelationshipEstablishment, RelationshipInvitation, TrustSafety}

  @doc "Default Moment visibility remains friends — only after precise semantics."
  def default_visibility, do: "friends"

  @doc """
  Friend visibility authorized between author and viewer?

  Mutual, relationship-based — not Instagram followers, not contact import.
  """
  def friend_visibility_authorized?(author_user_id, viewer_user_id)
      when is_binary(author_user_id) and is_binary(viewer_user_id) do
    cond do
      author_user_id == viewer_user_id ->
        true

      safety_blocked?(author_user_id, viewer_user_id) ->
        false

      true ->
        establishment_active?(author_user_id, viewer_user_id) or
          dyad_peers?(author_user_id, viewer_user_id)
    end
  end

  def friend_visibility_authorized?(_, _), do: false

  @doc "Group Moment visibility: current ConversationMember only."
  def group_visibility_authorized?(group_conversation_id, viewer_user_id)
      when is_binary(group_conversation_id) and is_binary(viewer_user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^group_conversation_id and cm.user_id == ^viewer_user_id
    )
    |> Repo.exists?()
  end

  def group_visibility_authorized?(_, _), do: false

  @doc """
  Contact match does not imply friend access.
  Phone/contact graphs are discovery aids only.
  """
  def contact_match_implies_friend?, do: false

  @doc "Invite pending does not grant friend visibility."
  def invite_pending_grants_friend?, do: false

  @doc "Inference cannot expand social audience authority."
  def inference_expands_audience?, do: false

  @doc "Attribution edges cannot expand social visibility."
  def attribution_expands_visibility?, do: false

  @doc """
  Historical access policy (deliberate).

  friends: :dynamic — current friend edge at view time
  group: :dynamic — current membership at view time
  """
  def historical_access_policy do
    %{
      "friends" => "dynamic_current_edge",
      "group" => "dynamic_current_membership",
      "specific_people" => "explicit_id_list",
      "private" => "author_only",
      "new_friend_sees_old_friends_moments" => true,
      "removed_friend_loses_old_friends_moments" => true,
      "new_group_member_sees_old_group_moments" => true,
      "removed_group_member_loses_group_moments" => true
    }
  end

  @doc "Explain friend decision for debug (never product UI)."
  def explain_friend(author_user_id, viewer_user_id) do
    blocked = safety_blocked?(author_user_id, viewer_user_id)
    est = establishment_active?(author_user_id, viewer_user_id)
    dyad = dyad_peers?(author_user_id, viewer_user_id)
    pending = invite_pending?(author_user_id, viewer_user_id)

    authorized = friend_visibility_authorized?(author_user_id, viewer_user_id)

    %{
      "author_user_id" => author_user_id,
      "viewer_user_id" => viewer_user_id,
      "authorized" => authorized,
      "blocked" => blocked,
      "establishment_active" => est,
      "dyad_peers" => dyad,
      "invite_pending" => pending,
      "contact_match_implies_friend" => false,
      "reason" =>
        cond do
          author_user_id == viewer_user_id -> "author"
          blocked -> "blocked"
          est -> "relationship_establishment_active"
          dyad -> "dyad_conversation_peer"
          pending -> "invite_pending_not_friend"
          true -> "no_friend_authority"
        end
    }
  end

  @doc "List user ids currently authorized as friends of author (for preview counts)."
  def current_friend_ids(author_user_id) when is_binary(author_user_id) do
    est_ids = establishment_peer_ids(author_user_id)
    dyad_ids = dyad_peer_ids(author_user_id)

    (est_ids ++ dyad_ids)
    |> Enum.uniq()
    |> Enum.reject(&(&1 == author_user_id))
    |> Enum.reject(&safety_blocked?(author_user_id, &1))
  end

  def current_friend_ids(_), do: []

  @doc "Human audience preview labels."
  def audience_preview(visibility, opts \\ %{}) do
    v = to_string(visibility || default_visibility())
    o = stringify(opts)

    case v do
      "private" ->
        %{"label" => "Only me", "count" => 1}

      "specific_people" ->
        n = length(List.wrap(o["audience_user_ids"]))
        %{"label" => if(n == 0, do: "Selected people", else: "#{n} people"), "count" => n}

      "group" ->
        %{"label" => o["group_label"] || "Group", "count" => o["group_count"]}

      "friends" ->
        n = length(current_friend_ids(o["author_user_id"] || ""))
        %{"label" => "Friends", "count" => n, "subtitle" => if(n > 0, do: "#{n} people", else: nil)}

      _ ->
        %{"label" => "Only me", "count" => 1}
    end
  end

  # --- internals ---

  def safety_blocked?(a, b) do
    TrustSafety.blocked?(a, b) or TrustSafety.blocked?(b, a)
  rescue
    _ -> false
  end

  defp establishment_active?(a, b) do
    from(e in RelationshipEstablishment,
      where: e.status == "active" and ^a in e.participant_ids and ^b in e.participant_ids
    )
    |> Repo.exists?()
  rescue
    _ -> false
  end

  defp establishment_peer_ids(author) do
    from(e in RelationshipEstablishment,
      where: e.status == "active" and ^author in e.participant_ids,
      select: e.participant_ids
    )
    |> Repo.all()
    |> List.flatten()
    |> Enum.uniq()
  rescue
    _ -> []
  end

  defp dyad_peers?(a, b) do
    # Share at least one conversation with exactly 2 members (dyad peer).
    shared =
      from(cm1 in ConversationMember,
        join: cm2 in ConversationMember,
        on: cm1.conversation_id == cm2.conversation_id,
        where: cm1.user_id == ^a and cm2.user_id == ^b,
        select: cm1.conversation_id,
        distinct: true
      )
      |> Repo.all()

    Enum.any?(shared, fn cid ->
      count =
        from(cm in ConversationMember, where: cm.conversation_id == ^cid, select: count(cm.id))
        |> Repo.one()

      count == 2
    end)
  rescue
    _ -> false
  end

  defp dyad_peer_ids(author) do
    conv_ids =
      from(cm in ConversationMember, where: cm.user_id == ^author, select: cm.conversation_id)
      |> Repo.all()

    Enum.flat_map(conv_ids, fn cid ->
      members =
        from(cm in ConversationMember, where: cm.conversation_id == ^cid, select: cm.user_id)
        |> Repo.all()

      if length(members) == 2, do: members, else: []
    end)
    |> Enum.uniq()
  rescue
    _ -> []
  end

  defp invite_pending?(a, b) do
    from(i in RelationshipInvitation,
      where:
        i.status in ~w(sent delivered viewed) and
          ((i.inviter_user_id == ^a and i.intended_recipient_user_id == ^b) or
             (i.inviter_user_id == ^b and i.intended_recipient_user_id == ^a))
    )
    |> Repo.exists?()
  rescue
    _ -> false
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
