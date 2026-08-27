defmodule OpalCore.SocialFlow.FounderCommunicationSeed do
  @moduledoc """
  Deterministic founder-review communication data via the EXISTING messaging owner.

  Opt-in only. Never runs as production default.
  Does not invent a parallel chat system — uses Messages.ensure_direct_conversation /
  Messages.create_group_conversation / Messages.accept_message.

  Stable peer identities (display names match Home founder fixture people).
  """

  import Ecto.Query
  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  # Stable UUIDs — Jordan/Maya reuse Fixtures synthetic IDs when present in seeds.
  @chanelle_id "f0c4a4e1-1111-4111-8111-c4a4e1100001"
  @maya_id "a4444444-4444-4444-8444-444444444444"
  @jordan_id "a2222222-2222-4222-8222-222222222222"
  @sabrina_id "f0c4a4e1-1111-4111-8111-c4a4e1100004"

  @group_label "Saturday Crew"

  def allowed? do
    Application.get_env(:opal_core, :allow_founder_communication_seed, false) == true
  end

  def peer_ids do
    %{
      chanelle: @chanelle_id,
      maya: @maya_id,
      jordan: @jordan_id,
      sabrina: @sabrina_id
    }
  end

  @doc """
  Idempotent. Ensures peer users + Direct(Chanelle) + Group(Saturday Crew) + sample messages
  for the authenticated founder viewer.
  """
  def ensure!(viewer_user_id, opts \\ []) when is_binary(viewer_user_id) do
    unless allowed?() do
      {:error, :founder_seed_disabled}
    else
      if opts[:explicit_opt_in] != true do
        {:error, :explicit_opt_in_required}
      else
        do_ensure(viewer_user_id)
      end
    end
  end

  defp do_ensure(viewer_user_id) do
    peers = ensure_peers!()

    {:ok, direct} =
      Messages.ensure_direct_conversation(viewer_user_id, peers.chanelle.id)

    seed_direct_messages!(direct.conversation_id, viewer_user_id, peers.chanelle.id)

    group = ensure_saturday_crew!(viewer_user_id, peers)
    seed_group_messages!(group.conversation_id, peers)

    {:ok,
     %{
       "viewer_user_id" => viewer_user_id,
       "peers" => %{
         "chanelle" => peer_contract(peers.chanelle),
         "maya" => peer_contract(peers.maya),
         "jordan" => peer_contract(peers.jordan),
         "sabrina" => peer_contract(peers.sabrina)
       },
       "direct" => %{
         "conversation_id" => direct.conversation_id,
         "peer_user_id" => peers.chanelle.id,
         "peer_display_name" => peers.chanelle.display_name,
         "origin" => to_string(direct.origin)
       },
       "group" => %{
         "conversation_id" => group.conversation_id,
         "label" => @group_label,
         "member_ids" => group.member_ids,
         "origin" => to_string(group.origin)
       },
       "parallel_chat_owner" => false,
       "via" => "Messages"
     }}
  end

  defp peer_contract(%User{} = u) do
    %{"id" => u.id, "display_name" => u.display_name, "handle" => u.handle}
  end

  defp ensure_peers! do
    chanelle = upsert_user!(@chanelle_id, "founder-chanelle", "Chanelle")
    maya = upsert_user!(@maya_id, "user-maya", "Maya")
    jordan = upsert_user!(@jordan_id, "user-jordan", "Jordan")
    sabrina = upsert_user!(@sabrina_id, "founder-sabrina", "Sabrina")
    %{chanelle: chanelle, maya: maya, jordan: jordan, sabrina: sabrina}
  end

  defp upsert_user!(id, handle, display_name) do
    case Repo.get(User, id) do
      %User{} = u ->
        # Keep founder-walk display names stable even if synthetic seed used a different label.
        if u.display_name != display_name do
          u
          |> User.changeset(%{display_name: display_name})
          |> Repo.update!()
        else
          u
        end

      nil ->
        %User{}
        |> User.changeset(%{id: id, handle: handle, display_name: display_name})
        |> Repo.insert!()
    end
  end

  defp ensure_saturday_crew!(viewer_user_id, peers) do
    member_ids = [
      viewer_user_id,
      peers.chanelle.id,
      peers.maya.id,
      peers.jordan.id
    ]

    case find_group_by_label_for_viewer(viewer_user_id, @group_label) do
      cid when is_binary(cid) ->
        %{conversation_id: cid, member_ids: member_ids, origin: :existing}

      nil ->
        case Messages.create_group_conversation(viewer_user_id, tl(member_ids),
               label: @group_label
             ) do
          {:ok, result} ->
            Map.put(result, :origin, :created)

          {:error, reason} ->
            raise "founder group seed failed: #{inspect(reason)}"
        end
    end
  end

  defp find_group_by_label_for_viewer(viewer_user_id, label) do
    from(c in Conversation,
      join: cm in ConversationMember,
      on: cm.conversation_id == c.id,
      where: cm.user_id == ^viewer_user_id and c.label == ^label,
      select: c.id,
      limit: 1
    )
    |> Repo.one()
  end

  defp seed_direct_messages!(conversation_id, viewer_id, chanelle_id) do
    seed_msg(conversation_id, viewer_id, "founder-direct-you-1", "Juniper tonight?")
    seed_msg(conversation_id, chanelle_id, "founder-direct-peer-1", "I can do 7:30.")
  end

  defp seed_group_messages!(conversation_id, peers) do
    seed_msg(conversation_id, peers.maya.id, "founder-group-maya-1", "I can do Saturday.")
    seed_msg(conversation_id, peers.jordan.id, "founder-group-jordan-1", "Running a little behind.")
    seed_msg(conversation_id, peers.chanelle.id, "founder-group-chanelle-1", "I'm in.")
  end

  defp seed_msg(conversation_id, sender_user_id, client_message_id, body) do
    _ =
      Messages.accept_message(%{
        conversation_id: conversation_id,
        sender_user_id: sender_user_id,
        client_message_id: client_message_id,
        message_type: "text",
        body: body
      })

    :ok
  end
end
