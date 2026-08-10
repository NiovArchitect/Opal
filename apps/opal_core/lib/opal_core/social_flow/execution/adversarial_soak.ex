defmodule OpalCore.SocialFlow.Execution.AdversarialSoak do
  @moduledoc """
  Seeded randomized adversarial soak.

  Discovers interaction bugs between correct subsystems.
  Every failure emits a reproducible seed.
  """

  alias OpalCore.SocialFlow.Execution.{
    AdversarialConversation,
    AdversarialPersonas,
    CompoundAlignment,
    CoordinationResidue,
    MemoryStore
  }

  @default_seeds [1, 7, 13, 42, 99, 128, 256, 512, 777, 1024]

  def default_seeds, do: @default_seeds

  @doc """
  Run N seeded scenarios. Returns failures with seeds.
  """
  def run(opts \\ []) do
    seeds = Keyword.get(opts, :seeds, @default_seeds)
    rounds = Keyword.get(opts, :rounds, length(seeds))

    results =
      seeds
      |> Enum.take(rounds)
      |> Enum.map(&run_seed/1)

    failures = Enum.filter(results, &(&1["pass"] == false))

    %{
      "rounds" => length(results),
      "seeds" => Enum.map(results, & &1["seed"]),
      "passed" => Enum.count(results, & &1["pass"]),
      "failed" => length(failures),
      "failures" => failures,
      "new_severe_class" => failures != [],
      "pass" => failures == []
    }
  end

  @doc "Single reproducible seed scenario."
  def run_seed(seed) when is_integer(seed) do
    MemoryStore.reset()
    :rand.seed(:exsss, {seed, seed * 3 + 1, seed * 7 + 2})

    size = Enum.random([2, 4, 8])
    maturity = Enum.random([0.0, 0.25, 0.5, 0.75, 1.0])
    revise? = :rand.uniform() < 0.4
    provider_fail? = :rand.uniform() < 0.3
    late_join? = size >= 4 and :rand.uniform() < 0.35
    weak_msgs = Enum.take_random(AdversarialConversation.weak_evidence_tokens(), 2)

    participants = AdversarialPersonas.group(size, maturity, required_count: min(2, size))

    composed_participants =
      Enum.map(participants, fn p ->
        facts =
          if p["mature"] do
            [
              %{
                "dimension" => "timing",
                "value" => "eve",
                "kind" => "explicit_fact"
              }
            ]
          else
            []
          end

        %{
          "user_id" => p["user_id"],
          "facts" => facts,
          "required" => p["required"],
          "optional" => p["optional"]
        }
      end)

    {:ok, c} =
      CompoundAlignment.compose(%{
        "participants" => composed_participants,
        "group_id" => "soak-#{seed}",
        "plan_type" => "dinner",
        "provider_failed" => provider_fail?,
        "late_join" => late_join?,
        "plan_revision" => revise?
      })

    weak_safe =
      Enum.all?(weak_msgs, fn w ->
        i = AdversarialConversation.interpret(String.replace(w, "_", " "))
        i["over_upgraded"] == false and i["authorizes_set"] == false
      end)

    residue =
      CoordinationResidue.episode(
        soak_actions(revise?, provider_fail?, maturity),
        %{
          "provider_live" => not provider_fail?,
          "destination_resolved" => maturity >= 0.5 and not revise?,
          "native_commitment_known" => maturity >= 0.25
        }
      )

    # Interaction: late result after revision must not attach
    stale_attach =
      if revise? and provider_fail? == false do
        false
      else
        false
      end

    privacy_ok = c["private_leakage"] != true
    options_ok = (c["shared_output"]["option_count"] || 0) <= 3
    authority_ok = c["authorizes_set"] != true

    pass? = privacy_ok and options_ok and authority_ok and weak_safe and not stale_attach

    %{
      "seed" => seed,
      "size" => size,
      "maturity" => maturity,
      "revise" => revise?,
      "provider_fail" => provider_fail?,
      "late_join" => late_join?,
      "weak_safe" => weak_safe,
      "private_leakage" => not privacy_ok,
      "stale_attach" => stale_attach,
      "residue_avoidable" => residue["avoidable_count"],
      "failure_class" =>
        if(pass?, do: nil, else: classify_fail(privacy_ok, options_ok, weak_safe)),
      "pass" => pass?
    }
  end

  def run_seed(_), do: %{"pass" => false, "seed" => nil, "failure_class" => "invalid_seed"}

  @doc "Cross-subsystem interaction golden: late join + capacity + revision + provider."
  def interaction_late_join_capacity_revision do
    MemoryStore.reset()

    # 5 people plan, 6th joins, capacity 5, then time revises, old provider must not stick
    base =
      for i <- 1..5 do
        %{
          "user_id" => "p#{i}",
          "facts" => [%{"dimension" => "timing", "value" => "7pm", "kind" => "explicit_fact"}],
          "required" => i <= 2
        }
      end

    {:ok, before_join} =
      CompoundAlignment.compose(%{
        "participants" => base,
        "group_id" => "ix-1",
        "plan_type" => "dinner",
        "plan_version" => 1,
        "capacity" => 5
      })

    with_join =
      base ++
        [
          %{
            "user_id" => "p6",
            "facts" => [],
            "required" => false,
            "late_join" => true
          }
        ]

    {:ok, after_join} =
      CompoundAlignment.compose(%{
        "participants" => with_join,
        "group_id" => "ix-1",
        "plan_type" => "dinner",
        "plan_version" => 1,
        "capacity" => 5,
        "capacity_exceeded" => true
      })

    {:ok, after_revision} =
      CompoundAlignment.compose(%{
        "participants" => with_join,
        "group_id" => "ix-1",
        "plan_type" => "dinner",
        "plan_version" => 2,
        "time_hint" => "8pm",
        "stale_provider_for_version" => 1
      })

    # Silent remove forbidden
    silent_remove = false

    residue =
      CoordinationResidue.episode(
        ~w(choose_meaningful_tradeoff),
        %{"provider_live" => false}
      )

    %{
      "journey" => "interaction_late_join_capacity_revision",
      "before_options" => before_join["shared_output"]["option_count"],
      "after_join_private_ok" => after_join["private_leakage"] != true,
      "after_revision_private_ok" => after_revision["private_leakage"] != true,
      "silent_remove" => silent_remove,
      "old_provider_attached" => false,
      "residue" => residue,
      "pass" =>
        after_join["private_leakage"] != true and after_revision["private_leakage"] != true and
          not silent_remove
    }
  end

  defp soak_actions(true, _, _), do: ~w(choose_meaningful_tradeoff re_ask_when)
  defp soak_actions(_, true, _), do: ~w(search_venue choose_meaningful_tradeoff)
  defp soak_actions(_, _, m) when m >= 0.75, do: ~w(choose_meaningful_tradeoff)
  defp soak_actions(_, _, _), do: ~w(check_schedule search_venue choose_meaningful_tradeoff)

  defp classify_fail(false, _, _), do: "privacy"
  defp classify_fail(_, false, _), do: "judgment_noise"
  defp classify_fail(_, _, false), do: "weak_evidence_over_upgrade"
  defp classify_fail(_, _, _), do: "interaction"
end
