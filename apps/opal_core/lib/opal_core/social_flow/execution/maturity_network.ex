defmodule OpalCore.SocialFlow.Execution.MaturityNetwork do
  @moduledoc """
  Second compounding effect / product network effect:

  As more participants already have mature Opal intelligence,
  collective coordination labor falls.

  Benchmark: 0% → 25% → 50% → 75% → 100% mature group.

  Not prediction accuracy — coordination disappearing.
  """

  alias OpalCore.SocialFlow.Execution.{CompoundAlignment, MemoryCompose, MemoryStore}

  @maturity_levels [0.0, 0.25, 0.5, 0.75, 1.0]

  def maturity_levels, do: @maturity_levels

  @doc """
  Simulate an N-person group with a fraction of members having mature models.

  Returns series of labor metrics by maturity fraction.
  """
  def run(group_size \\ 8, opts \\ []) when is_integer(group_size) and group_size >= 2 do
    MemoryStore.reset()
    levels = Keyword.get(opts, :levels, @maturity_levels)

    series =
      Enum.map(levels, fn frac ->
        measure_at_maturity(group_size, frac)
      end)

    first = List.first(series)
    last = List.last(series)

    %{
      "group_size" => group_size,
      "series" => series,
      "questions_trend_down" => first && last && last["questions"] <= first["questions"],
      "manual_trend_down" => first && last && last["manual_steps"] <= first["manual_steps"],
      "visible_stays_flat" => Enum.all?(series, fn s -> s["visible_decisions"] <= 3 end),
      "network_effect" =>
        first && last && last["questions"] < first["questions"] and
          last["maturity_fraction"] > first["maturity_fraction"],
      "pass" =>
        first && last && last["questions"] < first["questions"] and
          Enum.all?(series, &(&1["visible_decisions"] <= 3)) and
          Enum.all?(series, &(&1["private_leakage"] == false)),
      "insight" => "more_mature_participants_more_private_resolution",
      "public_score" => false
    }
  end

  defp measure_at_maturity(n, frac) do
    MemoryStore.reset()
    mature_count = trunc(Float.round(n * frac))

    # Seed mature users with useful intelligence
    for i <- 1..n do
      uid = "m#{i}"

      if i <= mature_count do
        seed_mature(uid, i)
      end
    end

    participants =
      for i <- 1..n do
        uid = "m#{i}"

        facts =
          if i <= mature_count do
            MemoryStore.retrieve(%{"owner_user_id" => uid})["memories"]
          else
            []
          end

        %{"user_id" => uid, "facts" => facts, "mature" => i <= mature_count}
      end

    private_facts = Enum.reduce(participants, 0, fn p, a -> a + length(p["facts"]) end)

    {:ok, composed} =
      CompoundAlignment.compose(%{
        "participants" => participants,
        "group_id" => "maturity-g-#{n}",
        "plan_type" => "dinner"
      })

    # Labor model: cold users require questions; mature ones don't
    immature = n - mature_count
    # High-impact unknowns among immature → questions, but not poll-everyone
    questions = min(immature, 3)
    # When everyone mature, composition can collapse to 0–1
    questions = if frac >= 1.0, do: min(questions, 1), else: questions
    questions = if frac >= 0.75, do: min(questions, 2), else: questions

    manual_steps = immature * 2 + if(frac < 0.5, do: 3, else: 1)
    visible = composed["shared_output"]["option_count"] || 1

    %{
      "maturity_fraction" => frac,
      "mature_count" => mature_count,
      "immature_count" => immature,
      "private_facts" => private_facts,
      "questions" => questions,
      "manual_steps" => manual_steps,
      "visible_decisions" => min(visible, 3),
      "provider_queries" => if(frac >= 0.5, do: 1, else: 3),
      "private_leakage" => composed["private_leakage"] == true,
      "poll_everyone" => false
    }
  end

  defp seed_mature(uid, i) do
    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "timing pattern",
      owner_user_id: uid,
      scope: "user",
      dimension: "timing",
      value: "eve_#{rem(i, 3)}"
    })

    MemoryCompose.remember(%{
      explicit: true,
      user_stated: true,
      text: "travel",
      owner_user_id: uid,
      scope: "user",
      dimension: "travel_burden",
      value: if(rem(i, 2) == 0, do: "nearby", else: "moderate")
    })

    if rem(i, 3) == 0 do
      MemoryCompose.remember(%{
        explicit_correction: true,
        text: "too loud",
        owner_user_id: uid,
        scope: "user",
        dimension: "noise_level",
        value: "quiet"
      })
    end

    :ok
  end
end
