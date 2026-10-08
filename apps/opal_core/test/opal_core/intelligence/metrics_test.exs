defmodule OpalCore.Intelligence.MetricsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, Metrics}
  alias OpalCore.Intelligence.Workers.{LlmVerifyBaselineWorker, MetricsDailyWorker}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.SurfacedNudge

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "met_" <> String.slice(account_id, 0, 8),
        display_name: "Met"
      })
      |> Repo.insert()

    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: account_id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "for_account / global aggregate and alert thresholds", %{account_id: aid} do
    for i <- 1..3 do
      assert {:granted, _} =
               AttentionBudget.request_slot(aid, "nudge", "reminder", %{
                 person_id: Ecto.UUID.generate(),
                 topic: "m#{i}",
                 provenance: "stated"
               })
    end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for _ <- 1..2 do
      {:ok, _} =
        %SurfacedNudge{}
        |> SurfacedNudge.changeset(%{
          account_id: aid,
          type: "cooling_relationship",
          priority: 1,
          reason: "x",
          message_draft: "x",
          surfaced_at: now,
          status: "dismissed",
          dismissed_count: 1
        })
        |> Repo.insert()
    end

    {:ok, _} =
      %SurfacedNudge{}
      |> SurfacedNudge.changeset(%{
        account_id: aid,
        type: "cooling_relationship",
        priority: 1,
        reason: "y",
        message_draft: "y",
        surfaced_at: now,
        status: "active"
      })
      |> Repo.insert()

    result = Metrics.for_account(aid)
    assert result.metrics["slots_granted"] >= 3
    assert result.metrics["nudges"] == 3
    assert_in_delta result.metrics["dismiss_rate"], 2 / 3, 0.01

    # Force alert evaluation
    alerts =
      Metrics.evaluate_alerts(%{
        "fallback_rate" => 0.4,
        "dismiss_rate" => 0.7,
        "proactive_reply_rate" => 0.1,
        "hallucination_count" => 1,
        "estimated_cost_usd" => 3.0,
        "baseline_cost_usd" => 1.0
      })

    assert length(alerts) >= 4

    g = Metrics.global()
    assert is_map(g.metrics)

    assert :ok = MetricsDailyWorker.perform(%Oban.Job{args: %{"day" => Date.to_iso8601(Date.utc_today())}})
    assert :ok = LlmVerifyBaselineWorker.perform(%Oban.Job{args: %{}})
  end
end
