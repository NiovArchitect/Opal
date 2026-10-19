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
    PlanTransition,
    SharedPlan
  }

  @card_id "seed-jordan-market"
  # Repair #19 (W1): human title — this plan is the viewer's needs-you
  # item (viewer stays pending below), so its title is what the reveal
  # and the deck render. Internal card_id binding is unchanged.
  @plan_title "Saturday morning at Oceanside Farmers Market"
  @location "Oceanside Farmers Market"
  @time_label "Saturday · Oceanside"
  @lock_in_label "Lock-in Friday · 6 PM"
  @group_label "Jordan Saturday Graph"

  # Extra peers beyond FounderCommunicationSeed for 4 interested baseline.
  # Repair #14 (D5) — Alex MUST reuse FounderCommunicationSeed's stable ID
  # (...0005, handle "founder-alex"): the two IDs were transposed, so Nina's
  # upsert renamed the communication seed's Alex and Alex's re-insert then
  # collided on the unique handle. Nina takes the previously unused ...0006.
  @nina_id "f0c4a4e1-1111-4111-8111-c4a4e1100006"
  @alex_id "f0c4a4e1-1111-4111-8111-c4a4e1100005"

  def allowed? do
    Application.get_env(:opal_core, :allow_founder_communication_seed, false) == true
  end

  @doc """
  Idempotent. Ensures SharedPlan lineage for Home Graph commitment walk.
  Viewer starts as pending (interested) so I'm going can accept current user only.
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
    nina = upsert_user!(@nina_id, "founder-nina", "Nina Patel")
    alex = upsert_user!(@alex_id, "founder-alex", "Alex Rivera")

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
        [viewer_user_id | interested_pool] |> Enum.uniq() |> Enum.take(4)
      end

    ensure_participants!(plan, jordan.id, going_ids, interested_ids)

    # Repair #19 (W1): layer the believable human seed world (state
    # distribution across forming / ready / happening / past, calls,
    # stories) onto the same viewer. Seed-gated by this module's own
    # allowed?/explicit_opt_in gate — HumanSeedWorld has no other caller.
    world =
      OpalCore.SocialFlow.HumanSeedWorld.ensure!(viewer_user_id, %{
        chanelle: chanelle.id,
        maya: maya.id,
        jordan: jordan.id,
        sabrina: sabrina.id,
        alex: alex.id,
        nina: nina.id
      })

    me = Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: viewer_user_id)
    counts = JourneyAuthority.participation_counts(plan.id, viewer_user_id)
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
       # Repair #18: canonical vocabulary out (accepted / pending /
       # declined) - the seed no longer speaks "proposed" / "tentative".
       "viewer_response_state" =>
         (me && PlanParticipant.canonical_response_state(me.response_state)) || "pending",
       "viewer_state" => counts.viewer_state,
       "going_count" => counts.going,
       "interested_count" => counts.interested,
       "total_count" => counts.total,
       "commitment_phase" => commitment?,
       "journey_available" => eligible?,
       "participation_phase" => phase,
       "world" => world,
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
      %ConversationMember{} ->
        :ok

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
        plan = restore_terminal_plan_for_seed(plan)

        plan
        |> SharedPlan.changeset(%{
          status: plan.status,
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

  # Repair #18 FALSE-fix F-10: a terminal seed plan is restored ONLY
  # through the PlanTransition gate's explicit, seed-only :seed_restore
  # exception, and the restore is logged with plan id + prior status.
  # The old code silently rewrote cancelled/completed back to "agreed"
  # inline — exactly the move the gyroscope exists to forbid. If the
  # gate ever refuses, the seed fails loudly instead of resurrecting.
  defp restore_terminal_plan_for_seed(%SharedPlan{status: status} = plan)
       when status in ~w(cancelled completed) do
    require Logger

    case PlanTransition.transition(:plan, status, :seed_restore) do
      {:ok, restored} ->
        Logger.warning(
          "founder_seed.seed_restore plan_id=#{plan.id} from_status=#{status} to_status=#{restored} (explicit PlanTransition seed exception, F-10)"
        )

        # Write from the DB-state struct so the changeset sees the change.
        plan
        |> SharedPlan.changeset(%{status: restored})
        |> Repo.update!()

      {:error, :illegal_transition} ->
        raise "founder seed: PlanTransition refused :seed_restore from #{inspect(status)} for plan #{plan.id}"
    end
  end

  defp restore_terminal_plan_for_seed(%SharedPlan{} = plan), do: plan

  defp friday_lock_in_start do
    DateTime.utc_now()
    |> DateTime.add(52 * 3600, :second)
    |> DateTime.truncate(:microsecond)
  end

  defp ensure_participants!(plan, jordan_id, going_ids, interested_ids) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for uid <- going_ids do
      upsert_participant!(
        plan.id,
        uid,
        "accepted",
        if(uid == jordan_id, do: "lead", else: "participant"),
        now
      )
    end

    for uid <- interested_ids do
      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        %PlanParticipant{response_state: "accepted"} ->
          :ok

        %PlanParticipant{} = pp ->
          if PlanParticipant.pending_state?(pp.response_state) do
            :ok
          else
            pp
            |> PlanParticipant.changeset(%{
              response_state: "pending",
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
            response_state: "pending",
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
