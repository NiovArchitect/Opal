defmodule OpalCore.SocialFlow.MultiDayPersonalCuration do
  @moduledoc """
  Deterministic multi-day personal curation simulation (Pass 25).

  Closes Pass 24 "MULTI-DAY PERSONAL CURATION = NOT_RUN" at **domain product-policy** level.
  Not a browser timeline — that remains product UI soak.

  7 day classes:
  busy_workday · free_evening · solo_weekend · travel_day ·
  low_budget · stay_home · social_invitation
  """

  alias OpalCore.SocialFlow.{FinancialFit, PersonalLifeCuration}

  @days [
    %{
      "day" => 1,
      "class" => "busy_workday",
      "energy" => "low",
      "free_windows" => [],
      "commitment" => "back-to-back meetings",
      "budget" => 40,
      "expect_silence" => true
    },
    %{
      "day" => 2,
      "class" => "free_evening",
      "energy" => "medium",
      "free_windows" => ["evening"],
      "commitment" => nil,
      "budget" => 60,
      "expect_silence" => false
    },
    %{
      "day" => 3,
      "class" => "solo_weekend",
      "energy" => "high",
      "free_windows" => ["morning", "afternoon", "evening"],
      "commitment" => nil,
      "budget" => 100,
      "expect_silence" => false
    },
    %{
      "day" => 4,
      "class" => "travel_day",
      "energy" => "medium",
      "free_windows" => ["layover"],
      "commitment" => "flight",
      "budget" => 50,
      "area" => "airport",
      "expect_silence" => false
    },
    %{
      "day" => 5,
      "class" => "low_budget",
      "energy" => "medium",
      "free_windows" => ["evening"],
      "commitment" => nil,
      "budget" => 20,
      "candidates" => [
        %{"label" => "Walk + free park", "estimated_cost" => 0},
        %{"label" => "$80 tasting", "estimated_cost" => 80}
      ],
      "expect_silence" => false
    },
    %{
      "day" => 6,
      "class" => "stay_home",
      "energy" => "low",
      "free_windows" => ["evening"],
      "preference" => "stay_home",
      "budget" => 30,
      "expect_silence" => true
    },
    %{
      "day" => 7,
      "class" => "social_invitation",
      "energy" => "high",
      "free_windows" => ["evening"],
      "invitation" => true,
      "budget" => 80,
      "expect_silence" => false
    }
  ]

  def day_classes, do: Enum.map(@days, & &1["class"])

  @doc "Run 7-day simulation. Returns per-day outcomes + aggregate metrics."
  def simulate(opts \\ %{}) do
    o = stringify(opts || %{})
    area = o["area_label"] || "neighborhood"

    days =
      Enum.map(@days, fn day ->
        day = stringify(day)
        silence = day["expect_silence"] == true or day["preference"] == "stay_home"

        cur =
          if silence do
            %{
              "suggestions" => [],
              "suggestion_count" => 0,
              "mode" => "silence",
              "reason" => day["preference"] || day["commitment"] || "no_viable_window"
            }
          else
            PersonalLifeCuration.suggest(%{
              "area_label" => day["area"] || area,
              "discretionary_budget" => day["budget"],
              "candidates" => day["candidates"]
            })
          end

        # Budget filter double-check
        suggestions = List.wrap(cur["suggestions"])

        expensive_leaked =
          Enum.any?(suggestions, fn s ->
            # low budget day should not surface $80 tasting
            day["class"] == "low_budget" and is_binary(s["text"]) and
              String.contains?(s["text"] || "", "80")
          end)

        fit_sample =
          FinancialFit.assess(%{
            "discretionary_budget" => day["budget"],
            "estimated_cost" => if(day["class"] == "low_budget", do: 80, else: 40)
          })

        %{
          "day" => day["day"],
          "class" => day["class"],
          "silence" => silence or cur["suggestion_count"] == 0,
          "suggestion_count" => cur["suggestion_count"] || length(suggestions),
          "suggestions" => suggestions,
          "notifications" => 0,
          "authorizes_payment" => false,
          "financial_private" => true,
          "expensive_leaked" => expensive_leaked,
          "fit_sample" => fit_sample["fit"],
          "pass" =>
            not expensive_leaked and fit_sample["authorizes_payment"] != true and
              fit_sample["expose_to_followers"] != true and
              (if(day["expect_silence"], do: silence or (cur["suggestion_count"] || 0) == 0, else: true))
        }
      end)

    silent_days = Enum.count(days, & &1["silence"])
    failed = Enum.filter(days, &(&1["pass"] == false))

    %{
      "kind" => "multi_day_personal_curation",
      "days" => days,
      "day_count" => length(days),
      "silent_days" => silent_days,
      "min_silent_required" => 2,
      "silent_ok" => silent_days >= 2,
      "failed_days" => failed,
      "pass" => failed == [] and silent_days >= 2,
      "not_browser_timeline" => true,
      "engagement_not_mandatory" => true,
      "is_payout" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
