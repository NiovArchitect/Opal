defmodule OpalCore.SocialFlow.TemporalFollowThroughTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{AttentionAuthority, Clock, TemporalFollowThroughLoop}
  alias OpalCore.SocialFlow.TemporalFollowThrough, as: TFT

  setup do
    Clock.unfreeze()

    on_exit(fn ->
      Clock.unfreeze()
    end)

    :ok
  end

  # --- Laws ---

  test "laws: no fake travel, no memory timers, restart durable, no real sleep" do
    refute TFT.age_alone_causes_attention?()
    refute TFT.old_plan_time_reminder_fires?()
    refute TFT.canceled_plan_generates_future_attention?()
    refute TFT.completed_commitment_reminder?()
    refute TFT.weak_intent_creates_reminder?()
    refute TFT.memory_fact_schedules_attention?()
    refute TFT.historical_pattern_auto_schedule?()
    refute TFT.fake_distance?()
    refute TFT.fake_eta?()
    refute TFT.fake_leave_by?()
    refute TFT.location_tracking_without_permission?()
    refute TFT.graph_membership_implies_location_share?()
    refute TFT.temporal_reevaluation_duplicates?()
    refute TFT.server_restart_loses_due_state?()
    refute TFT.temporal_tests_use_real_sleep?()
    refute TFT.stale_provider_data_presented_as_current?()
    refute TFT.old_owner_receives_reminder_after_reassignment?()
    refute TFT.stale_background_job_mutates_current_state?()
  end

  # --- 1 WAITING UNTIL FRIDAY ---

  test "TEMPORAL_WAITING_ON — silent before Friday daypart; attention at due window" do
    # Freeze to Thursday afternoon LA
    Clock.freeze(~U[2026-09-24 20:00:00.000000Z])

    assert {:ok, loop, :created} =
             TFT.register(%{
               "kind" => "waiting_on",
               "source_id" => "w-friday",
               "owner_user_id" => "walk-b",
               "responsibility_user_id" => "walk-b",
               "participant_ids" => ["walk-a", "walk-b"],
               "timezone" => "America/Los_Angeles",
               "precision" => "date_only",
               "semantic_deadline_date" => ~D[2026-09-25],
               "metadata" => %{"owner_display" => "Walk B", "copy" => "I'll know Friday."},
               "idempotency_key" => "wait-fri-1"
             })

    before = TFT.evaluate(loop)
    assert before["maturity"] == "not_yet"
    by = Map.new(before["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-b"]["level"] == "silent"
    assert by["walk-a"]["level"] == "ambient"

    # Friday 15:00 LA = 22:00 UTC
    Clock.freeze(~U[2026-09-25 22:00:00.000000Z])
    at_due = TFT.evaluate(loop)
    assert at_due["maturity"] == "due"
    by2 = Map.new(at_due["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by2["walk-b"]["level"] == "attention"
    assert by2["walk-a"]["level"] == "ambient"

    # Midnight Friday UTC (still Thursday evening LA) — not invented 8am fire
    Clock.freeze(~U[2026-09-25 07:00:00.000000Z])
    early = TFT.evaluate(loop)
    assert early["maturity"] == "not_yet"
  end

  # --- 2 COMMITMENT APPROACHING ---

  test "TEMPORAL_COMMITMENT — far silent; near attention to owner only" do
    plan_start = ~U[2026-09-30 03:00:00.000000Z]

    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-tickets",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "plan_start_at" => plan_start,
               "plan_id" => "plan-1",
               "plan_version" => "1",
               "metadata" => %{"copy" => "I'll bring the tickets."},
               "idempotency_key" => "commit-1"
             })

    Clock.freeze(~U[2026-09-26 03:00:00.000000Z])
    far = TFT.evaluate(loop)
    assert far["maturity"] == "not_yet"
    a = Enum.find(far["attention"]["items"], &(&1["recipient_user_id"] == "walk-a"))
    assert a["level"] == "silent"

    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])
    near = TFT.evaluate(loop)
    assert near["maturity"] == "due"
    by = Map.new(near["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-a"]["level"] == "attention"
    refute by["walk-b"]["level"] == "attention"
  end

  # --- 3 COMPLETED ---

  test "TEMPORAL_COMPLETION — completed commitment never reminds" do
    plan_start = ~U[2026-09-30 03:00:00.000000Z]

    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-done",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "plan_start_at" => plan_start,
               "idempotency_key" => "commit-done"
             })

    assert {:ok, _} = TFT.complete(loop)
    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])
    result = TFT.evaluate(Repo.get!(TemporalFollowThroughLoop, loop.id))
    assert result["maturity"] == "resolved"
    assert result["attention"]["actionable_count"] == 0
    refute TFT.completed_commitment_reminder?()
  end

  # --- 4 RESCHEDULE ---

  test "TEMPORAL_RESCHEDULE — old plan version invalidated" do
    assert {:ok, old, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-resched",
               "owner_user_id" => "walk-a",
               "plan_id" => "plan-x",
               "plan_version" => "v1",
               "plan_start_at" => ~U[2026-09-30 03:00:00.000000Z],
               "idempotency_key" => "resched-v1"
             })

    {count, _} = TFT.invalidate_plan_version("plan-x", "v1", "rescheduled")
    assert count >= 1

    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])
    result = TFT.evaluate(Repo.get!(TemporalFollowThroughLoop, old.id))
    assert result["maturity"] == "resolved"
    refute TFT.old_plan_time_reminder_fires?()

    assert {:ok, _new, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-resched",
               "owner_user_id" => "walk-a",
               "plan_id" => "plan-x",
               "plan_version" => "v2",
               "plan_start_at" => ~U[2026-10-01 02:00:00.000000Z],
               "idempotency_key" => "resched-v2"
             })
  end

  # --- 5 PROVIDER FAILURE ---

  test "TEMPORAL_EXECUTION_FAILURE — actor gets attention; plan not mutated" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "execution",
               "source_id" => "exec-fail",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "execution_status" => "failed",
               "idempotency_key" => "exec-fail-1"
             })

    result = TFT.evaluate(loop)
    assert result["maturity"] == "due"
    assert result["mutates_plan"] == false
    by = Map.new(result["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-a"]["level"] == "attention"
    assert by["walk-b"]["level"] == "ambient"
  end

  # --- 6 CONFIRMATION ---

  test "TEMPORAL_EXECUTION_CONFIRMATION — resolves; no action badge" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "execution",
               "source_id" => "exec-ok",
               "owner_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "execution_status" => "confirmed",
               "idempotency_key" => "exec-ok-1"
             })

    result = TFT.evaluate(loop)
    assert result["maturity"] == "resolved"
    assert AttentionAuthority.actionable_badge_count(result["attention"], "walk-a") == 0
  end

  # --- 7 STALE PROVIDER ---

  test "TEMPORAL_PROVIDER_FRESHNESS — stale observation not presented as current" do
    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])

    m =
      TFT.mature_at(%{
        "kind" => "execution",
        "execution_status" => "submitted",
        "provider_observed_at" => ~U[2026-09-28 12:00:00.000000Z],
        "provider_fresh_hours" => 6,
        "metadata" => %{"availability" => "open at 8"}
      })

    assert m["provider_fresh"] == false
    assert m["availability_claim"]["current"] == false
    refute TFT.stale_provider_data_presented_as_current?()
  end

  # --- 8 MEMORY SILENCE ---

  test "TEMPORAL_MEMORY_SILENCE — likes jazz does not schedule Friday" do
    Clock.freeze(~U[2026-09-25 22:00:00.000000Z])

    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "memory_silence",
               "source_id" => "mem-jazz",
               "owner_user_id" => "walk-a",
               "participant_ids" => ["walk-a"],
               "idempotency_key" => "mem-jazz-1"
             })

    result = TFT.evaluate(loop)
    assert result["maturity"] == "not_yet"
    assert Enum.all?(result["attention"]["items"], &(&1["level"] == "silent"))
    refute TFT.memory_fact_schedules_attention?()
  end

  # --- 9 PATTERN SILENCE ---

  test "TEMPORAL_PATTERN_SILENCE — past Fridays do not auto-schedule" do
    Clock.freeze(~U[2026-09-25 22:00:00.000000Z])

    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "pattern_silence",
               "source_id" => "pat-fri",
               "owner_user_id" => "walk-a",
               "idempotency_key" => "pat-1"
             })

    result = TFT.evaluate(loop)
    assert Enum.all?(result["attention"]["items"], &(&1["level"] == "silent"))
    refute TFT.historical_pattern_auto_schedule?()
  end

  # --- 10 REASSIGNMENT ---

  test "TEMPORAL_REASSIGNMENT — attention follows new owner" do
    plan_start = ~U[2026-09-30 03:00:00.000000Z]

    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-reassign",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "plan_start_at" => plan_start,
               "idempotency_key" => "reassign-1"
             })

    assert {:ok, loop} = TFT.reassign(loop, "walk-b")
    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])
    result = TFT.evaluate(loop)
    by = Map.new(result["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-b"]["level"] == "attention"
    refute by["walk-a"]["level"] == "attention"
    refute TFT.old_owner_receives_reminder_after_reassignment?()
  end

  # --- 11 DEDUPE ---

  test "TEMPORAL_DEDUPE — repeated evaluation same identity" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "waiting_on",
               "source_id" => "w-dedupe",
               "owner_user_id" => "walk-b",
               "semantic_deadline_date" => ~D[2026-09-25],
               "timezone" => "America/Los_Angeles",
               "precision" => "date_only",
               "participant_ids" => ["walk-a", "walk-b"],
               "idempotency_key" => "dedupe-1",
               "attention_dedupe_key" => "tft:waiting_on:w-dedupe"
             })

    Clock.freeze(~U[2026-09-25 22:00:00.000000Z])
    a = TFT.evaluate(loop)
    b = TFT.evaluate(loop)
    assert a["dedupe_key"] == b["dedupe_key"]
    assert a["dedupe_key"] == "tft:waiting_on:w-dedupe"

    assert {:ok, _, :idempotent} =
             TFT.register(%{
               "kind" => "waiting_on",
               "source_id" => "w-dedupe",
               "owner_user_id" => "walk-b",
               "idempotency_key" => "dedupe-1"
             })

    refute TFT.temporal_reevaluation_duplicates?()
  end

  # --- 12 RESTART ---

  test "TEMPORAL_RESTART_DURABILITY — due state survives process (DB)" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-restart",
               "owner_user_id" => "walk-a",
               "plan_start_at" => ~U[2026-09-30 03:00:00.000000Z],
               "idempotency_key" => "restart-1"
             })

    id = loop.id
    # Simulate "restart": drop process clock freeze, reload from DB
    Clock.unfreeze()
    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])
    reloaded = Repo.get!(TemporalFollowThroughLoop, id)
    result = TFT.evaluate(reloaded)
    assert result["server_restart_durable"] == true
    assert result["maturity"] == "due"
    refute TFT.server_restart_loses_due_state?()
  end

  # --- 13 NO FAKE LEAVE-BY ---

  test "TEMPORAL_NO_FAKE_TRAVEL — Fort Oak without coords never leave-by" do
    m =
      TFT.mature_at(%{
        "kind" => "plan_approach",
        "plan_start_at" => ~U[2026-09-29 20:30:00.000000Z],
        "destination_coords_known" => false,
        "travel_known" => false,
        "location_permission" => false,
        "metadata" => %{"place" => "Fort Oak"}
      })

    assert m["travel"]["leave_by_allowed"] == false
    assert m["travel"]["fake_leave_by"] == false
    assert m["travel"]["fake_distance"] == false
    assert m["travel"]["fake_eta"] == false
    refute TFT.fake_leave_by?()
  end

  # --- 14 EXPLICIT TIMED ---

  test "TEMPORAL explicit Friday 2pm — attention to owner only at window" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "explicit_timed",
               "source_id" => "call-hotel",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "precision" => "datetime",
               "semantic_deadline_at" => ~U[2026-09-25 21:00:00.000000Z],
               "metadata" => %{"copy" => "Call the hotel"},
               "idempotency_key" => "explicit-2pm"
             })

    Clock.freeze(~U[2026-09-24 21:00:00.000000Z])
    before = TFT.evaluate(loop)
    assert before["maturity"] == "not_yet"

    Clock.freeze(~U[2026-09-25 21:05:00.000000Z])
    due = TFT.evaluate(loop)
    assert due["maturity"] == "due"
    by = Map.new(due["attention"]["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-a"]["level"] == "attention"
    refute by["walk-b"]["level"] == "attention"
  end

  test "attention_for_user buckets needs_you without scanning Outcomes" do
    Clock.freeze(~U[2026-09-29 20:00:00.000000Z])

    assert {:ok, _, _} =
             TFT.register(%{
               "kind" => "commitment",
               "source_id" => "c-bucket",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "participant_ids" => ["walk-a", "walk-b"],
               "plan_start_at" => ~U[2026-09-30 03:00:00.000000Z],
               "idempotency_key" => "bucket-1"
             })

    feed = TFT.attention_for_user("walk-a")
    assert is_list(feed["needs_you"])
    assert feed["actionable_count"] >= 1
  end

  test "Clock freeze advances without real sleep" do
    Clock.freeze(~U[2026-09-29 12:00:00.000000Z])
    assert :ok = Clock.advance(3600)
    assert DateTime.compare(Clock.utc_now(), ~U[2026-09-29 13:00:00.000000Z]) == :eq
    refute TFT.temporal_tests_use_real_sleep?()
  end
end
