defmodule OpalCore.SocialFlow.FounderCommunicationSeed do
  @moduledoc """
  Deterministic founder-review communication data via the EXISTING messaging owner.

  Opt-in only. Never runs as production default.
  Does not invent a parallel chat system — uses Messages.ensure_direct_conversation /
  Messages.create_group_conversation / Messages.accept_message.

  Stable peer identities (display names match Home founder fixture people).
  Physical founder path: provisions ALL five walk directs + Juniper/Saturday group
  so FE remap binds live ids (not seed-chat-* only).
  """

  import Ecto.Query
  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{JourneyAuthority, PlanParticipant, SharedPlan}

  # Stable UUIDs — Jordan/Maya reuse Fixtures synthetic IDs when present in seeds.
  @chanelle_id "f0c4a4e1-1111-4111-8111-c4a4e1100001"
  @maya_id "a4444444-4444-4444-8444-444444444444"
  @jordan_id "a2222222-2222-4222-8222-222222222222"
  @sabrina_id "f0c4a4e1-1111-4111-8111-c4a4e1100004"
  @alex_id "f0c4a4e1-1111-4111-8111-c4a4e1100005"

  @group_label "Saturday Crew"

  def allowed? do
    Application.get_env(:opal_core, :allow_founder_communication_seed, false) == true
  end

  def peer_ids do
    %{
      chanelle: @chanelle_id,
      maya: @maya_id,
      jordan: @jordan_id,
      sabrina: @sabrina_id,
      alex: @alex_id
    }
  end

  @doc """
  Idempotent. Ensures peer users + Directs (Chanelle/Maya/Sabrina/Alex) +
  Group(Saturday Crew) + sample messages for the authenticated founder viewer.
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

    directs =
      [
        {"chanelle", :chanelle, peers.chanelle},
        {"maya", :maya, peers.maya},
        {"sabrina", :sabrina, peers.sabrina},
        {"alex", :alex, peers.alex}
      ]
      |> Enum.map(fn {key, msg_key, peer} ->
        {:ok, direct} = Messages.ensure_direct_conversation(viewer_user_id, peer.id)
        seed_direct_messages!(msg_key, direct.conversation_id, viewer_user_id, peer.id)

        {key,
         %{
           "conversation_id" => direct.conversation_id,
           "peer_user_id" => peer.id,
           "peer_display_name" => peer.display_name,
           "origin" => to_string(direct.origin)
         }}
      end)
      |> Map.new()

    group = ensure_saturday_crew!(viewer_user_id, peers)
    seed_group_messages!(group.conversation_id, peers)
    juniper_plan = ensure_juniper_plan!(group.conversation_id, group.member_ids, viewer_user_id)

    {:ok,
     %{
       "viewer_user_id" => viewer_user_id,
       "peers" => %{
         "chanelle" => peer_contract(peers.chanelle),
         "maya" => peer_contract(peers.maya),
         "jordan" => peer_contract(peers.jordan),
         "sabrina" => peer_contract(peers.sabrina),
         "alex" => peer_contract(peers.alex)
       },
       "direct" => directs["chanelle"],
       "directs" => directs,
       "group" => %{
         "conversation_id" => group.conversation_id,
         "label" => @group_label,
         "member_ids" => group.member_ids,
         "origin" => to_string(group.origin)
       },
       "group_plan" => %{
         "shared_plan_id" => juniper_plan.id,
         "conversation_id" => group.conversation_id,
         "going_count" => JourneyAuthority.participation_counts(juniper_plan.id).going,
         "total_count" => JourneyAuthority.participation_counts(juniper_plan.id).total,
         "via" => "SharedPlan+PlanParticipant"
       },
       "parallel_chat_owner" => false,
       "via" => "Messages",
       "founder_phone_chat_rows" => 5
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
    alex = upsert_user!(@alex_id, "founder-alex", "Alex")
    %{chanelle: chanelle, maya: maya, jordan: jordan, sabrina: sabrina, alex: alex}
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

  defp seed_direct_messages!(:chanelle, conversation_id, viewer_id, peer_id) do
    seed_msg(conversation_id, viewer_id, "founder-direct-you-1", "Juniper tonight?")
    seed_msg(conversation_id, peer_id, "founder-direct-peer-1", "I can do 7:30.")
    seed_msg(conversation_id, viewer_id, "founder-direct-you-2", "Perfect. I'll grab a table.")
  end

  defp seed_direct_messages!(:maya, conversation_id, viewer_id, peer_id) do
    seed_msg(conversation_id, peer_id, "founder-maya-1", "Saturday morning. farmers market?")
    seed_msg(conversation_id, viewer_id, "founder-maya-2", "Yes. then the coast if it's clear.")
    seed_msg(conversation_id, peer_id, "founder-maya-3", "I'm free after 10")
  end

  defp seed_direct_messages!(:sabrina, conversation_id, viewer_id, peer_id) do
    seed_msg(
      conversation_id,
      peer_id,
      "founder-sabrina-1",
      "Okay this place just opened two blocks away"
    )

    seed_msg(conversation_id, viewer_id, "founder-sabrina-2", "Send it")
    seed_msg(conversation_id, peer_id, "founder-sabrina-3", "Sent a photo")
  end

  defp seed_direct_messages!(:alex, conversation_id, viewer_id, peer_id) do
    seed_msg(conversation_id, peer_id, "founder-alex-1", "Still thinking about that week")
    seed_msg(conversation_id, viewer_id, "founder-alex-2", "The rooftop at dusk?")
    seed_msg(conversation_id, peer_id, "founder-alex-3", "Mexico City was unreal")
  end

  defp seed_group_messages!(conversation_id, peers) do
    seed_msg(
      conversation_id,
      peers.maya.id,
      "founder-group-maya-1",
      "Table for four at Juniper Saturday?"
    )

    seed_msg(conversation_id, peers.jordan.id, "founder-group-jordan-1", "I can make 7:30")
    seed_msg(conversation_id, peers.chanelle.id, "founder-group-chanelle-1", "I'm in.")
  end

  # Repair #18 (Division A): the Juniper crew scenario gets REAL plan rows.
  # Before this, the seed wrote attendance talk ("Table for four", "I can
  # make 7:30", "I'm in.") with no SharedPlan and no PlanParticipant rows,
  # so every surface invented its own going number (walk evidence: ZERO
  # participant rows DB-wide). The three attendance messages are the RSVP
  # evidence; the group creator (viewer) convened the crew, so all four
  # members materialize as accepted participants of one agreed plan.
  # Idempotent: an existing active plan is reused and only MISSING
  # participant rows are inserted - an existing RSVP is never rewritten.
  defp ensure_juniper_plan!(conversation_id, member_ids, viewer_user_id) do
    plan =
      case from(p in SharedPlan,
             where:
               p.conversation_id == ^conversation_id and
                 p.status in ^~w(tentative agreed changed),
             order_by: [desc: p.updated_at, desc: p.inserted_at],
             limit: 1
           )
           |> Repo.one() do
        %SharedPlan{} = existing ->
          existing

        nil ->
          {:ok, created} =
            %SharedPlan{}
            |> SharedPlan.changeset(%{
              conversation_id: conversation_id,
              title: "Meetup",
              status: "agreed",
              location: "Juniper",
              time_label: "Saturday · 7:30 PM",
              timezone: "America/Los_Angeles",
              created_by_user_id: viewer_user_id,
              source: "conversation",
              alignment: juniper_alignment(member_ids)
            })
            |> Repo.insert()

          # The fold reads lineage_id as the plan id; stamp it now that
          # the row exists so projections resolve this plan directly.
          {:ok, stamped} =
            created
            |> SharedPlan.changeset(%{
              alignment: Map.put(created.alignment, "lineage_id", created.id)
            })
            |> Repo.update()

          stamped
      end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for uid <- Enum.uniq(member_ids), is_binary(uid) do
      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        %PlanParticipant{} ->
          :ok

        nil ->
          %PlanParticipant{}
          |> PlanParticipant.changeset(%{
            plan_id: plan.id,
            user_id: uid,
            role: if(uid == viewer_user_id, do: "lead", else: "participant"),
            response_state: "accepted",
            responded_at: now,
            authority_source: "founder_communication_seed"
          })
          |> Repo.insert!()
      end
    end

    plan
  end

  # Alignment in the fold's field shape, grounded in the seeded messages:
  # Maya's Juniper/Saturday proposal, Jordan's 7:30, Chanelle's "I'm in."
  defp juniper_alignment(member_ids) do
    locked = fn value ->
      %{"state" => "locked", "value" => value, "truth" => "locked", "explicit" => true}
    end

    %{
      "schema_version" => 1,
      "participants" => locked.(member_ids),
      "activity" => %{
        "state" => "candidate",
        "value" => "Dinner",
        "truth" => "candidate",
        "explicit" => true
      },
      "date" => locked.("Saturday"),
      "exact_time" => locked.("7:30 PM"),
      "place" => locked.("Juniper"),
      "commitment" => "aligned",
      "plan_version" => 1
    }
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
