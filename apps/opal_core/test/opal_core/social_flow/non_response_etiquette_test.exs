defmodule OpalCore.SocialFlow.NonResponseEtiquetteTest do
  @moduledoc """
  Founder Polish Wave, Cluster I (P13) + P14 pins.

  Time is controlled ONLY through explicit `now` arguments (the repo's
  pinned-clock pattern - `advance/2` is the exact entry the Oban stage
  job calls). No real sleeps, no polling anywhere in the feature.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AssistancePreference,
    AttentionSignal,
    AuditEvent,
    FollowThrough,
    NonResponseEtiquette,
    PlanParticipant,
    SharedPlan,
    TemporalFollowThroughLoop
  }

  @t0 ~U[2026-11-02 18:00:00.000000Z]
  @hour 3600

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "nre-#{suffix}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp make_plan(creator, attrs \\ %{}) do
    %SharedPlan{}
    |> SharedPlan.changeset(
      Map.merge(
        %{
          title: "Dinner at Juniper",
          status: "tentative",
          timezone: "UTC",
          created_by_user_id: creator.id,
          source: "center",
          conversation_id: nil,
          alignment: %{}
        },
        attrs
      )
    )
    |> Repo.insert!()
  end

  defp add_participant(plan, user, state \\ "pending") do
    %PlanParticipant{}
    |> PlanParticipant.changeset(%{plan_id: plan.id, user_id: user.id, response_state: state})
    |> Repo.insert!()
  end

  # The recipient's proactivity mode (governs auto-decline on their
  # behalf) + quiet hours OFF (start == end) so pinned clocks judge
  # delivery, not the quiet window - the quiet pin sets its own window.
  defp set_mode(user, level, quiet \\ {"12:00", "12:00"}) do
    {:ok, _} =
      FollowThrough.update_preferences(user.id, %{
        assistance_level: level,
        timezone: "UTC",
        quiet_hours_start: elem(quiet, 0),
        quiet_hours_end: elem(quiet, 1)
      })

    :ok
  end

  defp open!(plan, requester, recipient, opts \\ []) do
    {:ok, loop, _origin} =
      NonResponseEtiquette.open_request(
        %{plan_id: plan.id, requester_id: requester.id, recipient_id: recipient.id},
        Keyword.merge([now: @t0], opts)
      )

    loop
  end

  defp signals_for(user_id, plan_id) do
    from(s in AttentionSignal, where: s.owner_user_id == ^user_id and s.plan_id == ^plan_id)
    |> Repo.all()
  end

  defp audit_types(plan_id) do
    from(a in AuditEvent, where: a.plan_id == ^plan_id, select: a.event_type) |> Repo.all()
  end

  defp loop_for(participant_id) do
    Repo.get_by!(TemporalFollowThroughLoop,
      idempotency_key: "invitation-response:participant:#{participant_id}"
    )
  end

  defp participant(plan_id, user_id),
    do: Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_id)

  # -------------------------------------------------------------------
  # P13 - the 1:1 lifecycle
  # -------------------------------------------------------------------

  test "nudge fires at the grace interval via the stage entry, not before" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    assert {:ok, :not_due} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 23 * @hour, :second),
               stage: "awaiting"
             )

    assert signals_for(recipient.id, plan.id) == []

    assert {:ok, :nudged} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 25 * @hour, :second),
               stage: "awaiting"
             )

    [nudge] = signals_for(recipient.id, plan.id)
    assert nudge.signal_type == "needs_answer"
    assert nudge.copy == NonResponseEtiquette.nudge_copy(plan.title)
    assert nudge.privacy_class == "private"
    assert loop_for(pp.id).metadata["stage"] == "nudged"
    assert "non_response.nudged" in audit_types(plan.id)
    assert "non_response.request_opened" in audit_types(plan.id)

    # The nudge is visible through the existing needs-you read path.
    assert Enum.any?(NonResponseEtiquette.needs_you(recipient.id), &(&1["id"] == nudge.id))
  end

  test "fork presents both honorable choices; decline resolves plainly" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    assert {:ok, :not_due} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 30 * @hour, :second),
               stage: "nudged"
             )

    assert {:ok, :forked} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 73 * @hour, :second),
               stage: "nudged"
             )

    fork =
      signals_for(recipient.id, plan.id)
      |> Enum.find(&(&1.copy == NonResponseEtiquette.fork_copy(plan.title)))

    assert fork
    action_ids = Enum.map(fork.actions["items"], & &1["id"])
    assert action_ids == ["decline", "ask_another_time"]
    assert "non_response.fork_presented" in audit_types(plan.id)

    assert {:ok, :closed, %{hold_released: false}} =
             NonResponseEtiquette.respond_as_recipient(%{
               plan_id: plan.id,
               user_id: recipient.id,
               action: "decline"
             })

    assert participant(plan.id, recipient.id).response_state == "declined"
    # A recipient's own decline does not cancel the plan and never
    # carries an on-behalf marker anywhere on the row.
    assert Repo.get!(SharedPlan, plan.id).status == "tentative"
    assert participant(plan.id, recipient.id).authority_source == "user_action"

    requester_signals = signals_for(requester.id, plan.id)
    assert Enum.any?(requester_signals, &(&1.signal_type == "non_response_closure"))
    assert loop_for(pp.id).status == "completed"
    assert loop_for(pp.id).metadata["outcome"] == "declined_by_recipient"
    assert "non_response.closed" in audit_types(plan.id)
  end

  test "fork: ask for another time resolves kindly and declines nothing" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    assert {:ok, :another_time} =
             NonResponseEtiquette.respond_as_recipient(%{
               plan_id: plan.id,
               user_id: recipient.id,
               action: "ask_another_time"
             })

    assert participant(plan.id, recipient.id).response_state == "pending"
    assert loop_for(pp.id).metadata["outcome"] == "another_time"

    assert Enum.any?(
             signals_for(requester.id, plan.id),
             &(&1.copy == NonResponseEtiquette.another_time_copy("Sam Guest", plan.title))
           )

    assert "non_response.another_time_requested" in audit_types(plan.id)
  end

  test "silence past the fork: auto-decline fires, requester closure exists, hold released through the gate" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    assert {:ok, :closed, %{hold_released: true, source: "auto_decline_on_behalf"}} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 98 * @hour, :second),
               stage: "forked"
             )

    assert participant(plan.id, recipient.id).response_state == "declined"
    # 1:1 hold release: the tentative plan was cancelled THROUGH the gate.
    assert Repo.get!(SharedPlan, plan.id).status == "cancelled"

    requester_closure =
      signals_for(requester.id, plan.id)
      |> Enum.find(&(&1.signal_type == "non_response_closure"))

    assert requester_closure.copy ==
             NonResponseEtiquette.requester_closure_copy("Sam Guest", plan.title)

    recipient_closure =
      signals_for(recipient.id, plan.id)
      |> Enum.find(&(&1.signal_type == "non_response_closure"))

    assert recipient_closure.copy == NonResponseEtiquette.recipient_closure_copy(plan.title)

    # No surface copy anywhere marks the recipient as auto-declined.
    for signal <- signals_for(requester.id, plan.id) ++ signals_for(recipient.id, plan.id) do
      refute signal.copy =~ "auto"
      refute signal.copy =~ "silence"
      refute signal.copy =~ "did not respond"
    end

    # The private truth lives in the ledger + loop metadata only.
    closed_audit =
      from(a in AuditEvent,
        where: a.plan_id == ^plan.id and a.event_type == "non_response.closed"
      )
      |> Repo.one!()

    assert closed_audit.payload["source"] == "auto_decline_on_behalf"
    assert closed_audit.payload["hold_released"] == true
    assert loop_for(pp.id).metadata["outcome"] == "auto_declined"

    # Expiry chain fires exactly once: a replayed stage job is stale.
    assert {:ok, :stale_job} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 120 * @hour, :second),
               stage: "forked"
             )

    assert Repo.aggregate(
             from(s in AttentionSignal,
               where: s.plan_id == ^plan.id and s.signal_type == "non_response_closure"
             ),
             :count
           ) == 2
  end

  test "group variant: silence resolves for the group, the plan proceeds, nobody is hostage" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    other = fresh_user("Jo Friend")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    add_participant(plan, recipient)
    add_participant(plan, other, "accepted")
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    assert {:ok, :closed, %{hold_released: false}} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 98 * @hour, :second),
               stage: "forked"
             )

    assert participant(plan.id, recipient.id).response_state == "declined"
    # The group plan is untouched - it proceeds without the non-responder.
    assert Repo.get!(SharedPlan, plan.id).status == "tentative"
    assert participant(plan.id, other.id).response_state == "accepted"

    group_notice =
      signals_for(other.id, plan.id) |> Enum.find(&(&1.signal_type == "non_response_closure"))

    assert group_notice.copy == NonResponseEtiquette.group_closure_copy("Sam Guest", plan.title)
  end

  # -------------------------------------------------------------------
  # P13 - mode gating
  # -------------------------------------------------------------------

  test "check-with-me-first never auto-declines: escalates to the requester queue, whose choices resolve" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "balanced")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    assert {:ok, :escalated} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 98 * @hour, :second),
               stage: "forked"
             )

    # Nothing was declined on anyone's behalf.
    assert participant(plan.id, recipient.id).response_state == "pending"
    assert Repo.get!(SharedPlan, plan.id).status == "tentative"

    escalation =
      signals_for(requester.id, plan.id)
      |> Enum.find(&(&1.copy == NonResponseEtiquette.escalation_copy(plan.title)))

    assert escalation

    assert Enum.map(escalation.actions["items"], & &1["id"]) == [
             "nudge_again",
             "extend",
             "let_it_go"
           ]

    assert "non_response.escalated_to_requester" in audit_types(plan.id)
    assert loop_for(pp.id).metadata["stage"] == "escalated"

    # Extend: more time, no new disturbance to the recipient.
    recipient_signal_count = length(signals_for(recipient.id, plan.id))

    assert {:ok, :extended} =
             NonResponseEtiquette.respond_as_requester(%{
               plan_id: plan.id,
               user_id: requester.id,
               action: "extend"
             })

    assert length(signals_for(recipient.id, plan.id)) == recipient_signal_count
    assert loop_for(pp.id).metadata["stage"] == "forked"
  end

  test "check-with-me-first: requester let-it-go closes with hold release; nudge-again re-forks" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "minimal")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    {:ok, :escalated} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 98 * @hour, :second))

    assert {:ok, :nudged_again} =
             NonResponseEtiquette.respond_as_requester(%{
               plan_id: plan.id,
               user_id: requester.id,
               action: "nudge_again"
             })

    # Escalate once more after the fresh fork window, then let it go.
    {:ok, :escalated} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(@t0, 200 * @hour, :second),
        stage: "forked"
      )

    assert {:ok, :closed, %{hold_released: true, source: "requester_let_go"}} =
             NonResponseEtiquette.respond_as_requester(%{
               plan_id: plan.id,
               user_id: requester.id,
               action: "let_it_go"
             })

    assert participant(plan.id, recipient.id).response_state == "declined"
    assert Repo.get!(SharedPlan, plan.id).status == "cancelled"
  end

  test "consequential requests never auto-decline even in handle-the-small-things mode" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    # An agreed plan is a commitment - consequential by definition.
    plan = make_plan(requester, %{status: "agreed"})
    add_participant(plan, requester, "accepted")
    add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    assert NonResponseEtiquette.consequential?(plan, @t0)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

    assert {:ok, :escalated} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 98 * @hour, :second),
               stage: "forked"
             )

    assert participant(plan.id, recipient.id).response_state == "pending"
    assert Repo.get!(SharedPlan, plan.id).status == "agreed"
  end

  test "quiet hours defer a stage instead of disturbing the recipient" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    # Quiet 00:00-23:59 in UTC: the pinned nudge instant is inside it.
    set_mode(recipient, "proactive", {"00:00", "23:59"})
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    assert {:ok, :deferred_quiet_hours} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 25 * @hour, :second),
               stage: "awaiting"
             )

    assert signals_for(recipient.id, plan.id) == []
    assert loop_for(pp.id).metadata["stage"] == "awaiting"
    assert "non_response.deferred_quiet_hours" in audit_types(plan.id)
  end

  test "a recipient who answered elsewhere resolves the loop silently at the next stage job" do
    requester = fresh_user("Rae Requester")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    pp = add_participant(plan, recipient)
    loop = open!(plan, requester, recipient)

    participant(plan.id, recipient.id)
    |> PlanParticipant.changeset(%{response_state: "accepted", responded_at: @t0})
    |> Repo.update!()

    assert {:ok, :resolved_responded} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 25 * @hour, :second),
               stage: "awaiting"
             )

    assert signals_for(recipient.id, plan.id) == []
    assert loop_for(pp.id).status == "completed"
  end

  # -------------------------------------------------------------------
  # P14 - response windows, relationship gate, limbo
  # -------------------------------------------------------------------

  defp make_circle(creator, recipient) do
    %RelationshipType{}
    |> RelationshipType.changeset(%{
      user_id: creator.id,
      contact_user_id: recipient.id,
      type: "friend"
    })
    |> Repo.insert!()
  end

  test "relationship gate: a non-circle recipient cannot be windowed; a circle recipient can" do
    creator = fresh_user("Cara Creator")
    outsider = fresh_user("Ollie Outsider")
    insider = fresh_user("Ina Insider")
    set_mode(outsider, "proactive")
    set_mode(insider, "proactive")

    plan = make_plan(creator)
    add_participant(plan, creator, "accepted")
    add_participant(plan, outsider)
    add_participant(plan, insider)

    assert {:error, :outside_creator_circle} =
             NonResponseEtiquette.set_response_window(%{
               plan_id: plan.id,
               creator_id: creator.id,
               recipient_id: outsider.id,
               window_seconds: 48 * @hour
             })

    assert participant(plan.id, outsider.id).response_window_closes_at == nil

    make_circle(creator, insider)

    assert {:ok, windowed} =
             NonResponseEtiquette.set_response_window(
               %{
                 plan_id: plan.id,
                 creator_id: creator.id,
                 recipient_id: insider.id,
                 window_seconds: 48 * @hour
               },
               now: @t0
             )

    assert windowed.response_window_seconds == 48 * @hour
    assert windowed.response_window_closes_at == DateTime.add(@t0, 48 * @hour, :second)
    assert "non_response.window_set" in audit_types(plan.id)

    # Creator-only + dosed bounds are honest refusals too.
    assert {:error, :not_creator} =
             NonResponseEtiquette.set_response_window(%{
               plan_id: plan.id,
               creator_id: insider.id,
               recipient_id: insider.id,
               window_seconds: 48 * @hour
             })

    assert {:error, :invalid_window} =
             NonResponseEtiquette.set_response_window(%{
               plan_id: plan.id,
               creator_id: creator.id,
               recipient_id: insider.id,
               window_seconds: 60
             })
  end

  test "consequential plan + check-with-me-first recipient: window unavailable, declared in the projection" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "balanced")
    make_circle(creator, recipient)
    plan = make_plan(creator, %{status: "agreed"})
    add_participant(plan, creator, "accepted")
    pp = add_participant(plan, recipient)

    assert {:error, :window_unavailable_consequential_mode} =
             NonResponseEtiquette.set_response_window(%{
               plan_id: plan.id,
               creator_id: creator.id,
               recipient_id: recipient.id,
               window_seconds: 48 * @hour
             })

    assert participant(plan.id, recipient.id).response_window_closes_at == nil

    window =
      NonResponseEtiquette.window_projection(plan, pp, creator.id, recipient.id)

    assert window["available"] == false

    assert window["unavailable_reason"] ==
             NonResponseEtiquette.window_unavailable_mode_copy("Sam Guest")
  end

  test "window is the timing source: nudge at half the window, fork exactly at window close" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    make_circle(creator, recipient)
    plan = make_plan(creator)
    add_participant(plan, creator, "accepted")
    add_participant(plan, recipient)

    {:ok, _} =
      NonResponseEtiquette.set_response_window(
        %{
          plan_id: plan.id,
          creator_id: creator.id,
          recipient_id: recipient.id,
          window_seconds: 48 * @hour
        },
        now: @t0
      )

    loop = open!(plan, creator, recipient)

    assert {:ok, :not_due} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 23 * @hour, :second),
               stage: "awaiting"
             )

    assert {:ok, :nudged} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 24 * @hour, :second),
               stage: "awaiting"
             )

    assert {:ok, :not_due} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 47 * @hour, :second),
               stage: "nudged"
             )

    # Expiry = the fork, exactly at window close.
    assert {:ok, :forked} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(@t0, 48 * @hour, :second),
               stage: "nudged"
             )
  end

  test "limbo projection: both parties see limbo, each with their own copy and the cooling treatment" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    make_circle(creator, recipient)
    plan = make_plan(creator)
    add_participant(plan, creator, "accepted")
    add_participant(plan, recipient)

    {:ok, _} =
      NonResponseEtiquette.set_response_window(
        %{
          plan_id: plan.id,
          creator_id: creator.id,
          recipient_id: recipient.id,
          window_seconds: 48 * @hour
        },
        now: @t0
      )

    loop = open!(plan, creator, recipient)
    mid = DateTime.add(@t0, 36 * @hour, :second)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 24 * @hour, :second))

    sender = NonResponseEtiquette.projection_for(plan.id, creator.id, now: mid)
    recipient_view = NonResponseEtiquette.projection_for(plan.id, recipient.id, now: mid)

    for view <- [sender, recipient_view] do
      assert view["limbo"]["state"] == "limbo"
      assert view["limbo"]["treatment"] == "cooling"
      assert view["limbo"]["pattern_channel"] == "cooling-lines"
      # Half the window remains at 36h of a 48h window from request.
      assert view["limbo"]["window_fraction_remaining"] == 0.25
      assert view["window"]["set"] == true
    end

    assert sender["viewer_role"] == "requester"
    assert sender["limbo"]["copy"] == NonResponseEtiquette.limbo_sender_copy(plan.title)
    assert sender["decline_available"] == false

    assert recipient_view["viewer_role"] == "recipient"

    assert recipient_view["limbo"]["copy"] ==
             NonResponseEtiquette.limbo_recipient_copy(plan.title)

    assert recipient_view["decline_available"] == true
  end

  test "decline instantly is available before limbo, in limbo, and after the fork" do
    for stage_advances <- [0, 1, 2] do
      requester = fresh_user("Rae Requester")
      recipient = fresh_user("Sam Guest")
      set_mode(recipient, "proactive")
      plan = make_plan(requester)
      add_participant(plan, requester, "accepted")
      add_participant(plan, recipient)
      loop = open!(plan, requester, recipient)

      if stage_advances >= 1,
        do:
          {:ok, :nudged} =
            NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 25 * @hour, :second))

      if stage_advances >= 2,
        do:
          {:ok, :forked} =
            NonResponseEtiquette.advance(loop.id, now: DateTime.add(@t0, 73 * @hour, :second))

      assert {:ok, :closed, %{source: "recipient_decline"}} =
               NonResponseEtiquette.respond_as_recipient(%{
                 plan_id: plan.id,
                 user_id: recipient.id,
                 action: "decline"
               })

      assert participant(plan.id, recipient.id).response_state == "declined"
    end
  end

  test "group projection: the second recipient is judged by their own loop, not the first" do
    requester = fresh_user("Rae Requester")
    first = fresh_user("Fia First")
    second = fresh_user("Sid Second")
    set_mode(first, "proactive")
    set_mode(second, "proactive")
    plan = make_plan(requester)
    add_participant(plan, requester, "accepted")
    add_participant(plan, first)
    add_participant(plan, second)

    loop_first = open!(plan, requester, first)
    loop_second = open!(plan, requester, second)

    # Only the SECOND recipient's request has entered limbo.
    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop_second.id,
        now: DateTime.add(@t0, 25 * @hour, :second),
        stage: "awaiting"
      )

    assert loop_first.id != loop_second.id

    second_view =
      NonResponseEtiquette.projection_for(plan.id, second.id,
        now: DateTime.add(@t0, 30 * @hour, :second)
      )

    assert second_view["viewer_role"] == "recipient"
    assert second_view["decline_available"] == true
    assert second_view["limbo"]["state"] == "limbo"
    assert second_view["stage"] == "nudged"

    first_view =
      NonResponseEtiquette.projection_for(plan.id, first.id,
        now: DateTime.add(@t0, 30 * @hour, :second)
      )

    assert first_view["viewer_role"] == "recipient"
    assert first_view["stage"] == "awaiting"
    assert first_view["limbo"] == nil
  end

  # -------------------------------------------------------------------
  # Copy scan + no-polling proof
  # -------------------------------------------------------------------

  test "copy scan: no shame, blame, alarm, or panic words in any emitted string" do
    banned = [
      "shame",
      "lazy",
      "ignored",
      "ghost",
      "blame",
      "guilt",
      "rude",
      "selfish",
      "overdue",
      "alarm",
      "hurry",
      "panic",
      "urgent",
      "warning",
      "failed",
      "silence",
      "auto-declined",
      "auto declined"
    ]

    for copy <- NonResponseEtiquette.all_copy(), word <- banned do
      refute String.downcase(copy) =~ word,
             "copy #{inspect(copy)} contains banned word #{inspect(word)}"
    end

    # Plain hyphens only - no em dashes anywhere in the deck.
    for copy <- NonResponseEtiquette.all_copy() do
      refute copy =~ "—"
    end
  end

  test "no polling: the feature source contains no poll loop primitives" do
    for file <- [
          "lib/opal_core/social_flow/non_response_etiquette.ex",
          "lib/opal_core/social_flow/non_response_etiquette_worker.ex"
        ] do
      source = File.read!(Path.join(File.cwd!(), file))
      refute source =~ "Process.sleep"
      refute source =~ ":timer.send_interval"
      refute source =~ "send_interval"
      refute source =~ "while true"
    end

    # The mechanism IS a scheduled Oban job per stage.
    worker =
      File.read!(
        Path.join(File.cwd!(), "lib/opal_core/social_flow/non_response_etiquette_worker.ex")
      )

    assert worker =~ "Oban.Worker"

    source =
      File.read!(Path.join(File.cwd!(), "lib/opal_core/social_flow/non_response_etiquette.ex"))

    assert source =~ "scheduled_at"
  end

  test "preferences helper sanity: mode mapping follows the real assistance record" do
    user = fresh_user("Pat Mode")
    assert NonResponseEtiquette.mode_for(user.id) == :check_with_me_first
    set_mode(user, "proactive")
    assert NonResponseEtiquette.mode_for(user.id) == :handle_small_things
    set_mode(user, "minimal")
    assert NonResponseEtiquette.mode_for(user.id) == :check_with_me_first

    pref = Repo.get_by!(AssistancePreference, user_id: user.id)
    assert pref.assistance_level == "minimal"
  end
end
