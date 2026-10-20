defmodule OpalCore.SocialFlow.NonResponseEtiquetteWiringTest do
  @moduledoc """
  I2 etiquette wiring pins (DataCase level): the production caller,
  the plan-contract carriage, and the group chain - all through the
  real SocialFlow paths live traffic uses. The HTTP-level chain lives
  in OpalCoreWeb.EtiquetteWiringApiTest. Time is driven ONLY through
  `NonResponseEtiquette.advance/2` - the exact entry the Oban stage
  job calls - with clocks pinned from the loop's own requested_at.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.SocialFlow

  alias OpalCore.SocialFlow.{
    FollowThrough,
    NonResponseEtiquette,
    PlanParticipant,
    SharedPlan,
    TemporalFollowThroughLoop
  }

  @hour 3600

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "i2-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp set_mode(user, level) do
    {:ok, _} =
      FollowThrough.update_preferences(user.id, %{
        assistance_level: level,
        timezone: "UTC",
        quiet_hours_start: "12:00",
        quiet_hours_end: "12:00"
      })

    :ok
  end

  defp make_circle(creator, recipient) do
    %RelationshipType{}
    |> RelationshipType.changeset(%{
      user_id: creator.id,
      contact_user_id: recipient.id,
      type: "friend"
    })
    |> Repo.insert!()
  end

  defp loop_for(plan_id, recipient_id) do
    from(l in TemporalFollowThroughLoop,
      where: l.plan_id == ^plan_id and l.kind == "invitation_response",
      where: fragment("? ->> 'recipient_user_id' = ?", l.metadata, ^recipient_id)
    )
    |> Repo.one()
  end

  defp requested_at(loop) do
    {:ok, dt, _} = DateTime.from_iso8601(loop.metadata["requested_at"])
    dt
  end

  defp participant(plan_id, user_id),
    do: Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_id)

  # -------------------------------------------------------------------
  # The production caller: plan creation opens the lifecycle
  # -------------------------------------------------------------------

  test "graph create opens the lifecycle for each pending invitee (and nobody else)" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    other = fresh_user("Jo Friend")

    {:ok, plan, participants, false} =
      SocialFlow.create_plan_from_graph_create(creator.id, %{
        "title" => "Wiring graph dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient.id, other.id]
      })

    assert loop_for(plan.id, recipient.id).status == "open"
    assert loop_for(plan.id, other.id).status == "open"
    assert loop_for(plan.id, recipient.id).metadata["stage"] == "awaiting"
    # The creator is accepted, never awaiting their own answer.
    assert is_nil(loop_for(plan.id, creator.id))
    assert length(participants) == 3
  end

  test "center create with a subject opens the lifecycle; a solo center plan opens none" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")

    {:ok, plan, _participants} =
      SocialFlow.create_tentative_plan_from_center(creator.id, %{
        "title" => "Wiring center plan #{System.unique_integer([:positive])}",
        "subject_user_id" => recipient.id
      })

    assert loop_for(plan.id, recipient.id).status == "open"

    {:ok, solo, _} =
      SocialFlow.create_tentative_plan_from_center(creator.id, %{
        "title" => "Wiring solo plan #{System.unique_integer([:positive])}"
      })

    assert from(l in TemporalFollowThroughLoop, where: l.plan_id == ^solo.id)
           |> Repo.all() == []
  end

  test "conversation plan create opens the lifecycle for the pending peers" do
    creator = fresh_user("Cara Creator")
    peer = fresh_user("Sam Guest")

    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "i2-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- [creator.id, peer.id] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    {:ok, plan, _participants} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, creator.id, %{
        "title" => "Wiring chat dinner #{System.unique_integer([:positive])}"
      })

    assert loop_for(plan.id, peer.id).status == "open"
    assert is_nil(loop_for(plan.id, creator.id))
  end

  test "the caller is a creation hook, not a scanner: the create paths name it" do
    source = File.read!(Path.join(File.cwd!(), "lib/opal_core/social_flow.ex"))
    # One hook definition + one call per creation door (conversation,
    # center, graph-create).
    assert length(String.split(source, "open_etiquette_requests(plan, user_id, participants)")) >=
             4

    refute source =~ "Process.sleep"
  end

  # -------------------------------------------------------------------
  # The contract carriage: window + limbo for both viewers
  # -------------------------------------------------------------------

  test "plan_payload carries window, limbo and fork facts for both viewers" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    make_circle(creator, recipient)

    {:ok, plan, _participants, false} =
      SocialFlow.create_plan_from_graph_create(creator.id, %{
        "title" => "Wiring contract dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient.id]
      })

    # Before any window: the fallback projection still carries the
    # window truth (available, unset) so the creator control can render.
    before_window = SocialFlow.plan_payload(plan, creator.id)["etiquette"]
    assert before_window["lifecycle_open"] == true
    assert before_window["window"]["set"] == false
    assert before_window["window"]["available"] == true
    assert before_window["recipient_user_id"] == recipient.id

    assert {:ok, _plan} =
             SocialFlow.set_plan_response_window(%{
               plan_id: plan.id,
               user_id: creator.id,
               recipient_id: recipient.id,
               window_seconds: 48 * @hour
             })

    plan = Repo.get!(SharedPlan, plan.id)
    sender = SocialFlow.plan_payload(plan, creator.id)["etiquette"]
    assert sender["window"]["set"] == true
    assert sender["window"]["seconds"] == 48 * @hour
    assert sender["viewer_role"] == "requester"

    loop = loop_for(plan.id, recipient.id)
    t0 = requested_at(loop)
    # The window runs from when it was SET (after the loop opened -
    # the production order), so the stage instants derive from the
    # loop's own window_closes_at, never from t0 + 48h by assumption.
    {:ok, closes, _} = DateTime.from_iso8601(loop.metadata["window_closes_at"])
    total = DateTime.diff(closes, t0, :second)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, div(total, 2) + 60, :second),
        stage: "awaiting"
      )

    mid = DateTime.add(closes, -div(total, 4), :second)

    sender = NonResponseEtiquette.viewer_projection(plan.id, creator.id, now: mid)
    recipient_view = NonResponseEtiquette.viewer_projection(plan.id, recipient.id, now: mid)

    # Through the contract builder itself (real clock: stage is nudged,
    # so limbo reads back; the fraction is time-relative and unpinned).
    contract_sender = SocialFlow.plan_payload(plan, creator.id)["etiquette"]
    contract_recipient = SocialFlow.plan_payload(plan, recipient.id)["etiquette"]

    for {view, role, copy} <- [
          {sender, "requester", NonResponseEtiquette.limbo_sender_copy(plan.title)},
          {recipient_view, "recipient", NonResponseEtiquette.limbo_recipient_copy(plan.title)}
        ] do
      assert view["viewer_role"] == role
      assert view["limbo"]["state"] == "limbo"
      assert view["limbo"]["treatment"] == "cooling"
      assert view["limbo"]["pattern_channel"] == "cooling-lines"
      assert view["limbo"]["copy"] == copy
      assert view["fork"]["state"] == "upcoming"
      assert view["window"]["set"] == true
    end

    assert sender["limbo"]["window_fraction_remaining"] == 0.25
    assert contract_sender["limbo"]["state"] == "limbo"
    assert contract_recipient["limbo"]["state"] == "limbo"
    assert contract_sender["limbo"]["copy"] != contract_recipient["limbo"]["copy"]

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(closes, 1, :second),
        stage: "nudged"
      )

    forked = SocialFlow.plan_payload(Repo.get!(SharedPlan, plan.id), recipient.id)["etiquette"]
    assert forked["stage"] == "forked"
    assert forked["fork"]["state"] == "presented"
    assert forked["fork"]["available"] == true
    assert forked["fork_available"] == true
  end

  test "an outsider's payload carries no etiquette fact" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    outsider = fresh_user("Ollie Outsider")

    {:ok, plan, _participants, false} =
      SocialFlow.create_plan_from_graph_create(creator.id, %{
        "title" => "Wiring outsider dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient.id]
      })

    assert SocialFlow.plan_payload(plan, outsider.id)["etiquette"] == nil
  end

  # -------------------------------------------------------------------
  # Group chain through the real create path
  # -------------------------------------------------------------------

  test "group chain: one member's silence closes kindly, the group proceeds, all parties noticed" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    other = fresh_user("Jo Friend")
    set_mode(recipient, "proactive")

    {:ok, plan, _participants, false} =
      SocialFlow.create_plan_from_graph_create(creator.id, %{
        "title" => "Wiring group dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient.id, other.id]
      })

    loop = loop_for(plan.id, recipient.id)
    t0 = requested_at(loop)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, 25 * @hour, :second),
        stage: "awaiting"
      )

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, 73 * @hour, :second),
        stage: "nudged"
      )

    {:ok, :closed, %{hold_released: false}} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, 98 * @hour, :second),
        stage: "forked"
      )

    # The group proceeds: the plan is untouched, the silent member is
    # a plain decline, the other member is still on the plan.
    assert Repo.get!(SharedPlan, plan.id).status == "tentative"
    assert participant(plan.id, recipient.id).response_state == "declined"
    assert participant(plan.id, other.id).response_state == "pending"

    # Both remaining parties read the group closure through the real
    # needs-you path; the non-responder reads their own kind closure.
    group_copy = NonResponseEtiquette.group_closure_copy("Sam Guest", plan.title)

    assert Enum.any?(
             NonResponseEtiquette.needs_you(creator.id),
             &(&1["copy"] == group_copy)
           )

    assert Enum.any?(
             NonResponseEtiquette.needs_you(other.id),
             &(&1["copy"] == group_copy)
           )

    assert Enum.any?(
             NonResponseEtiquette.needs_you(recipient.id),
             &(&1["copy"] == NonResponseEtiquette.recipient_closure_copy(plan.title))
           )

    # The closure rides the inbox as quiet information, never action.
    assert OpalCore.SocialFlow.ProductShell.signal_family("non_response_closure") ==
             "quiet_information"
  end
end
