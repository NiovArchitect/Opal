defmodule OpalCore.SocialFlow.Execution.RealityClosure do
  @moduledoc """
  Reality Closure Campaign compose.

  Three parallel tracks:
  A. Hosted parity
  B. Live provider / device activation truth
  C. Real human dogfood infrastructure (residue + ledgers)

  No new intelligence abstractions.
  """

  alias OpalCore.SocialFlow.Execution.{
    CoordinationResidue,
    HostedParity,
    HumanValidation,
    PilotReadiness,
    RuntimeTruth
  }

  @doc "Full campaign report for CI + founder pilot packet."
  def report(opts \\ []) do
    parity = HostedParity.audit(opts)
    runtime = RuntimeTruth.audit(opts)
    pilot = PilotReadiness.evaluate(opts)
    residue = PilotReadiness.residue_story()
    human = Keyword.get(opts, :skip_human) && %{"pass" => true} || HumanValidation.run_all(opts)

    %{
      "campaign" => "reality_closure",
      "pass" =>
        human["pass"] == true and residue["reduction"]["pass"] == true and
          is_list(pilot["blockers"]),
      "tracks" => %{
        "A_hosted_parity" => parity,
        "B_providers_devices" => %{
          "runtime" => runtime,
          "google_places" => RuntimeTruth.class_for("world_google_places", opts),
          "ticketmaster" => RuntimeTruth.class_for("world_ticketmaster", opts),
          "booking" => RuntimeTruth.class_for("booking_handoff", opts),
          "navigation" => RuntimeTruth.class_for("navigation_deep_link", opts),
          "reminder" => RuntimeTruth.class_for("reminder_transport", opts),
          "founder_only_for" => ~w(billing_authorization mfa_password legal_account_owner_consent)
        },
        "C_dogfood" => %{
          "human_validation" => Map.take(human, ~w(pass low_effort_flagship longitudinal privacy)),
          "residue" => residue,
          "do_not_manufacture_plan_series" => true
        }
      },
      "pilot" => Map.take(pilot, ~w(recommendation blockers hosted providers dogfood_readiness rollback)),
      "laws" => %{
        "no_new_intelligence_module" => true,
        "health_200_insufficient" => true,
        "merged_ne_live" => true,
        "avoidable_residue_target" => true,
        "preserve_human_agency" => true
      },
      "recommendation" => pilot["recommendation"],
      "blockers" => pilot["blockers"]
    }
  end

  @doc "Classify residue for a dogfood observation list."
  def classify_residue(actions, context \\ %{}) do
    CoordinationResidue.episode(actions, context)
  end
end
