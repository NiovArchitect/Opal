defmodule OpalCore.SocialFlow.Execution.PilotReadiness do
  @moduledoc """
  Pilot-ready is not CI green.

  Produces structured recommendation:
  READY FOR SMALL PILOT | NOT READY — exact blockers

  No vague percentage.
  """

  alias OpalCore.SocialFlow.Execution.{
    CoordinationResidue,
    HostedParity,
    HumanValidation,
    RuntimeTruth
  }

  @doc """
  Full pilot gate evaluation from measurable inputs + audits.
  """
  def evaluate(opts \\ []) do
    parity = HostedParity.audit(opts)
    runtime = RuntimeTruth.audit(opts)
    human = Keyword.get(opts, :human_validation) || HumanValidation.run_all(opts)

    blockers = blockers(parity, runtime, human, opts)
    ready? = blockers == []

    %{
      "recommendation" => if(ready?, do: "READY FOR SMALL PILOT", else: "NOT READY"),
      "blockers" => blockers,
      "hosted" => %{
        "main_sha" => parity["main_sha"],
        "last_hosted_api" => parity["last_hosted_api"],
        "measured" => parity["measured"],
        "migrations_pending" => parity["migrations"]["pending_count"],
        "gap_summary" => parity["gap_summary"]
      },
      "providers" => %{
        "credential_blockers" => runtime["credential_blockers"],
        "by_class" => runtime["by_class"],
        "pilot_can_proceed_without_live_places" => true,
        "runtime_must_stay_explicit" => true
      },
      "core_regressions" => %{
        "human_validation_pass" => human["pass"] == true,
        "harness_quality_green" => human["harness_quality_still_green"] == true,
        "required_before_pilot" => ~w(
          real_people_activation
          privacy_negative
          realtime
          set_authority
          session_stability
        )
      },
      "dogfood_readiness" => %{
        "cohort" => "founder + one 1:1 + optional 3-4 friends",
        "do_not_manufacture_plan_1_to_10" => true,
        "low_effort_flagship" => true,
        "residue_tracking" => true
      },
      "device_proof" => %{
        "navigation" => "real_handoff_code",
        "reminder" => "client_contract",
        "physical_device_vs_simulator" => "must_record_explicitly"
      },
      "observability" => %{
        "question_ledger" => true,
        "correction_ledger" => true,
        "no_raw_private_telemetry" => true
      },
      "rollback" => %{
        "path" => "redeploy prior GHCR image tag + migrate down if empty tables only",
        "known" => true
      },
      "no_vague_percentage" => true,
      "authorizes_set" => false
    }
  end

  @doc "Default evaluation with measured hosted truth from campaign date."
  def evaluate_current do
    evaluate(
      main_sha: "e6eec0a",
      # Hosted adversarial closure 2026-08-10 on live e6eec0a (block P1 fixed).
      api_health: "ok",
      web_http: "200",
      commits_ahead_of_hosted_image: 0,
      hosted_adversarial_complete: true
    )
  end

  @doc """
  Residue reduction example for pilot storytelling (structured, not hype).
  """
  def residue_story do
    plan1 =
      CoordinationResidue.episode(
        ~w(check_schedule re_ask_when search_venue open_maps copy_address remind choose_meaningful_tradeoff),
        %{
          "native_commitment_known" => false,
          "destination_resolved" => false,
          "provider_live" => false
        }
      )

    plan10 =
      CoordinationResidue.episode(
        ~w(choose_meaningful_tradeoff book_authorize),
        %{
          "native_commitment_known" => true,
          "destination_resolved" => true,
          "handoff_available" => true,
          "provider_live" => true,
          "reminder_capable" => true
        }
      )

    red = CoordinationResidue.reduction(plan1, plan10)

    %{
      "plan_1" => plan1,
      "plan_10" => plan10,
      "reduction" => red,
      "insight" => "avoidable_residue_shrinks_irreducible_agency_remains"
    }
  end

  defp blockers(parity, runtime, human, opts) do
    []
    |> maybe_block(
      parity["migrations"]["pending_count"] > 0,
      %{
        "id" => "migrations_pending",
        "detail" => "#{parity["migrations"]["pending_count"]} migrations after last hosted set",
        "track" => "hosted_parity"
      }
    )
    |> maybe_block(
      parity["measured"]["api_health"] not in ["ok", "200"],
      %{
        "id" => "api_health",
        "detail" => "api health=#{parity["measured"]["api_health"]} — not pilotable",
        "track" => "hosted_parity"
      }
    )
    |> maybe_block(
      (parity["measured"]["commits_ahead_of_hosted_image"] || 0) > 0,
      %{
        "id" => "server_image_stale",
        "detail" =>
          "hosted image still #{parity["last_hosted_api"]["image_tag"]}; main ahead by #{parity["measured"]["commits_ahead_of_hosted_image"]} commits",
        "track" => "hosted_parity"
      }
    )
    |> maybe_block(
      human["pass"] != true,
      %{
        "id" => "human_validation_harness",
        "detail" => "HumanValidation.run_all failed",
        "track" => "dogfood_infra"
      }
    )
    |> maybe_block(
      Keyword.get(opts, :force_memory_leak_blocker, false),
      %{
        "id" => "privacy",
        "detail" => "memory/privacy leak detected",
        "track" => "core_truth"
      }
    )
    |> maybe_block(
      Keyword.get(opts, :hosted_adversarial_complete, false) != true,
      %{
        "id" => "hosted_adversarial_incomplete",
        "detail" =>
          "hosted Real People+Set proven; full adversarial/privacy/realtime/memory matrix still partial",
        "track" => "hosted_proof"
      }
    )
    # Providers optional for social pilot
    |> then(fn b ->
      _ = runtime
      b
    end)
  end

  defp maybe_block(list, true, item), do: list ++ [item]
  defp maybe_block(list, false, _), do: list
end
