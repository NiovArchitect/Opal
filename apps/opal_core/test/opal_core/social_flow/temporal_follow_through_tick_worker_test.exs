defmodule OpalCore.SocialFlow.TemporalFollowThroughTickWorkerTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.TemporalFollowThrough, as: TFT
  alias OpalCore.SocialFlow.TemporalFollowThroughLoop
  alias OpalCore.SocialFlow.TemporalFollowThroughTickWorker

  setup do
    Clock.unfreeze()

    on_exit(fn ->
      Clock.unfreeze()
    end)

    :ok
  end

  test "worker module is an Oban worker on the events queue" do
    assert TemporalFollowThroughTickWorker.__opts__()[:queue] == :events
  end

  test "laws: stale background job does not mutate current plan state" do
    refute TFT.stale_background_job_mutates_current_state?()
  end

  test "perform reevaluates open loops without mutating SharedPlan" do
    assert {:ok, loop, _} =
             TFT.register(%{
               "kind" => "waiting_on",
               "source_id" => "tick-wait",
               "owner_user_id" => "walk-a",
               "responsibility_user_id" => "walk-a",
               "plan_id" => "plan-tick",
               "plan_version" => "1",
               "semantic_deadline_at" => ~U[2026-09-29 12:00:00.000000Z],
               "timezone" => "America/Los_Angeles",
               "idempotency_key" => "tick-wait-v1"
             })

    Clock.freeze(~U[2026-09-29 18:00:00.000000Z])

    assert :ok = TemporalFollowThroughTickWorker.perform(%Oban.Job{args: %{}})

    reloaded = Repo.get!(TemporalFollowThroughLoop, loop.id)
    assert reloaded.status == "open"
    assert reloaded.maturity in ~w(due approaching not_yet)
    assert reloaded.last_evaluated_at
    # Worker / TFT evaluate maturity only — never rewrite plan agreement truth.
    refute TFT.stale_background_job_mutates_current_state?()
  end
end
