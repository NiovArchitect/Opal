defmodule OpalCore.SocialFlow.FounderGraphCommitmentSeed do
  @moduledoc """
  Deterministic founder-review Graph commitment backing via EXISTING owners.

  Creates SharedPlan + PlanParticipant rows for the Home Jordan Saturday Graph
  (`seed-jordan-market`) so runtime can exercise:

  Interested → lock-in / I'm going → Going ✓ → Open Journey

  Opt-in only (`?opal_founder_seed=1` + explicit_opt_in). Never production default.
  Does not invent a parallel Graph / SharedPlan / Journey owner.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    FounderCommunicationSeed,
    JourneyAuthority,
    PlanParticipant,
    SharedPlan
  }

  @card_id "seed-jordan-market"
  @plan_title "Saturday opens like this"
  @location "Oceanside Farmers Market"
  @time_label "Saturday · Oceanside"
  @lock_in_label "Lock-in Friday · 6 PM"
  @group_label "Jordan Saturday Graph"

  # Extra peers beyond FounderCommunicationSeed for 4 interested baseline
  @nina_id "f0c4a4e1-1111-4111-8111-c4a4e1100005"
  @alex_id "f0c4a4e1-1111-4111-8111-c4a4e1100006"

  def allowed? do
    Application.get_env(:opal_core, :allow_founder_communication_seed, false) == true
  end

  @doc """
  Idempotent. Ensures SharedPlan lineage for Home Graph commitment walk.
  Viewer starts as tentative (interested) so I'm going can accept current user only.
  Baseline: 2 going · 4 interested (viewer included in interested).
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
    {:ok, _} = FounderCommunicationSeed.ensure!(viewer_user_id, explicit_opt_in: true)
    peers = FounderCommunicationSeed.peer_ids()
    jordan = Repo.get!(User, peers.jordan)
    maya = Repo.get!(User, peers.maya)
    chanelle = Repo.get!(User, peers.chanelle)
    sabrina = Repo.get!(User, peers.sabrina)
    nina = upsert_user!(@nina_id, "founder-nina", "Nina")
    alex = upsert_user!(@alex_id, "founder-alex", "Alex")

    member_ids =
      Enum.uniq([
        viewer_user_id,
        jordan.id,
        maya.id,
        chanelle.id,
        sabrina.id,
        nina.id,
        alex.id
      ])

    conv = ensure_graph_conversation!(viewer_user_id, member_ids, jordan.id)
    plan = ensure_shared_plan!(conv.id, jordan.id, viewer_user_id)

    # Going: Jordan + Maya. Interested: Chanelle + Sabrina + Nina + viewer (or Alex if viewer is Jordan).
    going_ids = [jordan.id, maya.id]

    interested_pool =
      [chanelle.id, sabrina.id, nina.id, alex.id, viewer_user_id]
      |> Enum.reject(&(&1 in going_ids))
      |> Enum.uniq()
      |> Enum.take(4)

    # Ensure viewer is always among interested (or already going if previously accepted)
    interested_ids =
      if viewer_user_id in going_ids do
        interested_pool
      else
        ([viewer_user_id | interested_pool] |> Enum.uniq() |> Enum.take(4))
      end

    ensure_participants!(plan, jordan.id, going_ids, interested_ids)

    me = Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: viewer_user_id)
    counts = JourneyAuthority.participation_counts(plan.id)
    eligible? = JourneyAuthority.journey_eligible?(plan)
    commitment? = JourneyAuthority.commitment_phase?(plan)

    phase =
      cond do
        me && me.response_state == "accepted" and eligible? -> "going_journey"
        me && me.response_state == "accepted" -> "going"
        commitment? -> "lock_in"
        true -> "soft_interest"
      end

    {:ok,
     %{
       "viewer_user_id" => viewer_user_id,
       "card_id" => @card_id,
       "conversation_id" => conv.id,
       "shared_plan_id" => plan.id,
       "title" => plan.title,
       "location" => plan.location,
       "time_label" => plan.time_label,
       "lock_in_label" => @lock_in_label,
       "status" => plan.status,
       "viewer_response_state" => (me && me.response_state) || "proposed",
       "going_count" => counts.going,
       "interested_count" => counts.interested,
       "commitment_phase" => commitment?,
       "journey_available" => eligible?,
       "participation_phase" => phase,
       "shared_plan_duplicated" => false,
       "reality_duplicated" => false,
       "parallel_graph_owner" => false,
       "parallel_shared_plan" => false,
       "parallel_journey" => false,
       "production_fixture_leak" => false,
       "via" => "SharedPlan+PlanParticipant"
     }}
  end

  defp upsert_user!(id, handle, display_name) do
    case Repo.get(User, id) do
      %User{} = u ->
        if u.display_name != display_name do
          u |> User.changeset(%{display_name: display_name}) |> Repo.update!()
        else
          u
        end

      nil ->
        %User{}
        |> User.changeset(%{id: id, handle: handle, display_name: display_name})
        |> Repo.insert!()
    end
  end

  defp ensure_graph_conversation!(viewer_user_id, member_ids, _jordan_id) do
    existing =
      from(c in Conversation,
        join: m in ConversationMember,
        on: m.conversation_id == c.id,
        where: c.label == ^@group_label and m.user_id == ^viewer_user_id,
        select: c,
        limit: 1
      )
      |> Repo.one()

    case existing do
      %Conversation{} = c ->
        for uid <- member_ids, do: ensure_member!(c.id, uid)
        c

      nil ->
        others = Enum.reject(member_ids, &(&1 == viewer_user_id))

        case Messages.create_group_conversation(viewer_user_id, others, label: @group_label) do
          {:ok, result} ->
            cid = result.conversation_id || result[:conversation_id]
            for uid <- member_ids, do: ensure_member!(cid, uid)
            Repo.get!(Conversation, cid)

          {:error, reason} ->
            raise "founder graph commitment conversation failed: #{inspect(reason)}"
        end
    end
  end

  defp ensure_member!(conversation_id, user_id) do
    case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
      %ConversationMember{} -> :ok
      nil ->
        %ConversationMember{}
        |> ConversationMember.changeset(%{conversation_id: conversation_id, user_id: user_id})
        |> Repo.insert!()
    end
  end

  defp ensure_shared_plan!(conversation_id, jordan_id, _viewer_user_id) do
    case from(p in SharedPlan,
           where: p.conversation_id == ^conversation_id and p.title == ^@plan_title,
           order_by: [desc: p.inserted_at],
           limit: 1
         )
         |> Repo.one() do
      %SharedPlan{} = plan ->
        plan
        |> SharedPlan.changeset(%{
          status: if(plan.status in ~w(cancelled completed), do: "agreed", else: plan.status),
          location: @location,
          time_label: @time_label,
          start_at: plan.start_at || friday_lock_in_start()
        })
        |> Repo.update!()

      nil ->
        {:ok, plan} =
          %SharedPlan{}
          |> SharedPlan.changeset(%{
            conversation_id: conversation_id,
            title: @plan_title,
            status: "agreed",
            location: @location,
            time_label: @time_label,
            start_at: friday_lock_in_start(),
            timezone: "America/Los_Angeles",
            created_by_user_id: jordan_id
          })
          |> Repo.insert()

        plan
    end
  end

  defp friday_lock_in_start do
    DateTime.utc_now()
    |> DateTime.add(52 * 3600, :second)
    |> DateTime.truncate(:microsecond)
  end

  defp ensure_participants!(plan, jordan_id, going_ids, interested_ids) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for uid <- going_ids do
      upsert_participant!(plan.id, uid, "accepted", if(uid == jordan_id, do: "lead", else: "participant"), now)
    end

    for uid <- interested_ids do
      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        %PlanParticipant{response_state: "accepted"} ->
          :ok

        %PlanParticipant{} = pp ->
          if pp.response_state in ~w(proposed tentative) do
            :ok
          else
            pp
            |> PlanParticipant.changeset(%{
              response_state: "tentative",
              responded_at: now,
              authority_source: "founder_graph_commitment_seed"
            })
            |> Repo.update!()
          end

        nil ->
          %PlanParticipant{}
          |> PlanParticipant.changeset(%{
            plan_id: plan.id,
            user_id: uid,
            role: "participant",
            response_state: "tentative",
            responded_at: now,
            authority_source: "founder_graph_commitment_seed"
          })
          |> Repo.insert!()
      end
    end
  end

  defp upsert_participant!(plan_id, user_id, state, role, now) do
    case Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id) do
      %PlanParticipant{response_state: "accepted"} = pp ->
        if pp.role != role and role == "lead" do
          pp |> PlanParticipant.changeset(%{role: role}) |> Repo.update!()
        else
          pp
        end

      %PlanParticipant{} = pp ->
        pp
        |> PlanParticipant.changeset(%{
          response_state: state,
          role: role,
          responded_at: now,
          authority_source: "founder_graph_commitment_seed"
        })
        |> Repo.update!()

      nil ->
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan_id,
          user_id: user_id,
          role: role,
          response_state: state,
          responded_at: now,
          authority_source: "founder_graph_commitment_seed"
        })
        |> Repo.insert!()
    end
  end
end
