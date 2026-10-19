defmodule OpalCore.Repair18HuntfixTest do
  @moduledoc """
  Repair #18 hunt-fix wave (back end) — regression pins for Hunt A
  finds HA-01, HA-02, HA-06, HA-07. Each test names the find it pins;
  several of these fail on the pre-fix tip (invented arrival label,
  laundered travel provenance, erased simulation provenance,
  mislabeled push outcome).
  """
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.Intelligence.{Decision, Event, Executor}
  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Collective, LiveExperience}
  alias OpalCore.SocialFlow.Physical.DeviceMoment
  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  setup do
    FixturesHelper.seed!()
    :ok
  end

  # --- HA-02: no invented arrival label --------------------------------

  defp open_exp! do
    ids = %{
      alex: Fixtures.user_alex_id(),
      jordan: Fixtures.user_jordan_id(),
      maya: Fixtures.user_maya_id(),
      chris: Fixtures.user_chris_id(),
      conv: Fixtures.conv_group_friends_id()
    }

    {:ok, %{options: options}, :created} =
      Collective.create_group_proposal(%{
        conversation_id: ids.conv,
        created_by_user_id: ids.alex,
        options: ["Saturday at 8:00 PM"],
        idempotency_key: "hf-plan-#{System.unique_integer([:positive])}"
      })

    opt = hd(options)

    for {uid, k} <- [{ids.alex, "a"}, {ids.jordan, "j"}, {ids.maya, "m"}, {ids.chris, "c"}] do
      Collective.respond_to_group_option(%{
        option_id: opt.id,
        user_id: uid,
        response_state: "accepted",
        idempotency_key: "hf-acc-#{k}-#{System.unique_integer([:positive])}"
      })
    end

    {:ok, sync} = Collective.sync_group(ids.alex, ids.conv)
    plan_id = hd(sync["plans"])["id"]

    {:ok, exp, :created} =
      LiveExperience.open_experience(%{
        conversation_id: ids.conv,
        user_id: ids.alex,
        plan_id: plan_id,
        reservation_handled: true,
        transport_owner_user_id: ids.jordan,
        idempotency_key: "hf-exp-#{System.unique_integer([:positive])}"
      })

    {exp, ids}
  end

  test "HA-02: sharing a late notice without an arrival label is refused, nothing broadcast as explicit" do
    {exp, ids} = open_exp!()

    assert {:error, :arrival_label_required} =
             LiveExperience.propose_late_notice(%{
               experience_id: exp.id,
               user_id: ids.chris,
               delay_minutes: 20,
               share: true,
               idempotency_key: "hf-late-nolabel"
             })
  end

  test "HA-02: unshared late prompt never invents a clock time" do
    {exp, ids} = open_exp!()

    assert {:ok, private, :private_only} =
             LiveExperience.propose_late_notice(%{
               experience_id: exp.id,
               user_id: ids.chris,
               share: false
             })

    refute private.private_prompt =~ "8:20"
    assert private.private_prompt =~ "running late"
  end

  test "HA-02: explicit label still shares exactly as before" do
    {exp, ids} = open_exp!()

    assert {:ok, shared, :shared} =
             LiveExperience.propose_late_notice(%{
               experience_id: exp.id,
               user_id: ids.chris,
               delay_minutes: 20,
               arrival_label: "around 8:20",
               share: true,
               idempotency_key: "hf-late-labeled"
             })

    assert shared.group_copy =~ "8:20"
    assert shared.state.source == "explicit"
  end

  # --- HA-06: DeviceMoment travel provenance ---------------------------

  test "HA-06: schedule_leave_by without travel is labeled assumed_default, not measured" do
    start =
      DateTime.utc_now() |> DateTime.add(3 * 3600, :second) |> DateTime.truncate(:microsecond)

    commitment = %{
      "id" => "hf-commit-1",
      "start_at" => DateTime.to_iso8601(start),
      "owner_user_id" => Fixtures.user_alex_id()
    }

    assert {:ok, result} = DeviceMoment.schedule_leave_by(commitment, queue: false)
    assert result["travel_minutes"] == 20
    assert result["travel_minutes_source"] == "assumed_default"
    assert result["travel_minutes_estimated"] == true
  end

  test "HA-06: schedule_leave_by with supplied travel is labeled measured" do
    start =
      DateTime.utc_now() |> DateTime.add(3 * 3600, :second) |> DateTime.truncate(:microsecond)

    commitment = %{
      "id" => "hf-commit-2",
      "start_at" => DateTime.to_iso8601(start),
      "owner_user_id" => Fixtures.user_alex_id()
    }

    assert {:ok, result} =
             DeviceMoment.schedule_leave_by(commitment, queue: false, travel_minutes: 25)

    assert result["travel_minutes"] == 25
    assert result["travel_minutes_source"] == "measured"
    assert result["travel_minutes_estimated"] == false
  end

  # --- HA-01: simulated connection provenance --------------------------

  test "HA-01: a simulated connection reads back as simulated, never plain connected" do
    user_id = Fixtures.user_alex_id()

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
               access_token: "test-access-token",
               refresh_token: "test-refresh-token",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()],
               metadata: %{"calendar_ids" => ["primary"], "simulated" => true}
             })

    pub = ProviderConnections.public_status(user_id, "google_calendar")
    assert pub["simulated"] == true
    assert pub["status"] == "connected_simulated"

    listed = ProviderConnections.list_for_user(user_id)
    sim = Enum.find(listed, &(&1["provider"] == "google_calendar"))
    assert sim["simulated"] == true
    assert sim["status"] == "connected_simulated"
  end

  test "HA-01: a real connection reads back not simulated" do
    user_id = Fixtures.user_jordan_id()

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
               access_token: "ya29.real",
               refresh_token: "1//real",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()],
               metadata: %{"calendar_ids" => ["primary"]}
             })

    pub = ProviderConnections.public_status(user_id, "google_calendar")
    assert pub["simulated"] == false
    assert pub["status"] == "connected"
  end

  # --- HA-07: executor reports the real push outcome -------------------

  test "HA-07: an in-app-only push outcome is not reported as queued" do
    user_id = Fixtures.user_alex_id()
    conv_id = Fixtures.conv_alex_jordan_id()
    NotificationIntelligence.touch_active(user_id)

    event =
      %Event{}
      |> Event.changeset(%{
        type: "message.received",
        actor_id: user_id,
        conversation_id: conv_id,
        occurred_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        payload: %{"body" => "hi"}
      })
      |> Repo.insert!()

    decision =
      %Decision{}
      |> Decision.changeset(%{
        event_id: event.id,
        action: "notify.push",
        reason: "huntfix test",
        confidence: 0.9,
        payload: %{"user_id" => user_id, "title" => "Opal", "body" => "Update"},
        context_snapshot: %{"conversation_id" => conv_id}
      })
      |> Repo.insert!()

    assert {:ok, log} = Executor.execute(decision)
    assert log.result["push"] == "in_app_only"
  end
end
