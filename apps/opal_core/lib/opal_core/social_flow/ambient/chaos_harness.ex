defmodule OpalCore.SocialFlow.Ambient.ChaosHarness do
  @moduledoc """
  Synthetic multi-user chaos journeys for Ambient Opportunity.

  Smoke-tests messy humans: late replies, maybe, decline, required missing,
  provider failure, topic change, block — without perfect demos.

  Explicitly synthetic for tests only.
  """

  alias OpalCore.SocialFlow.Ambient.{
    AmbientOpportunity,
    ExecutionReadiness,
    GroupViability,
    OpportunityExpiry,
    PaymentReadiness,
    SocialOpening,
    StaleSuppression
  }

  alias OpalCore.SocialFlow.Physical.LocationPolicy

  @journeys ~w(
    courtship
    friends_now
    group_partial
    group_required_failure
    group_late_join
    group_late_drop
    private_budget
    private_location
    provider_failure
    topic_change
    block
    solo
    hard_constraint_block
    stale_suppression
  )

  def journeys, do: @journeys

  @doc "Run all golden chaos journeys; returns pass/fail per journey."
  def run_all(opts \\ []) do
    results =
      Enum.map(@journeys, fn j ->
        {j, run(j, opts)}
      end)

    failed = Enum.reject(results, fn {_, r} -> r["pass"] == true end)

    %{
      "results" => Map.new(results),
      "passed" => length(results) - length(failed),
      "failed" => Enum.map(failed, &elem(&1, 0)),
      "all_pass" => failed == [],
      "synthetic" => true
    }
  end

  def run("courtship", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["j", "m"],
          required_ids: ["j", "m"],
          in_ids: ["j"],
          maybe_ids: ["m"],
          purpose: "date",
          relationship_context: "date",
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          opening_hours: 2.0,
          confidence: 0.7,
          forming?: true,
          option_count: 2,
          options: [%{"name" => "A"}, %{"name" => "B"}]
        })

      # Low pressure: not viable until both in; no Set
      r["viability"]["viable"] == false and r["authorizes_set"] == false and
        r["surface"]["surface"] == :silence
    end)
  end

  def run("friends_now", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          opening_hours: 2.5,
          place_resolved: true,
          travel_ok: true,
          confidence: 0.9,
          option_count: 2,
          options: [%{"name" => "Night market"}, %{"name" => "Rooftop"}],
          forming?: true,
          unknowns_before: 6
        })

      r["opening"]["exists"] and r["viability"]["viable"] and r["feed"] == false and
        r["heat_map_ui"] == false
    end)
  end

  def run("group_partial", _) do
    assert_journey(fn ->
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "1", role: "optional", response: "im_in"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"},
            %{user_id: "5", role: "optional", response: "maybe"},
            %{user_id: "6", role: "optional", response: "not_this_time"}
          ],
          purpose: "friends",
          min_viable: 3
        )

      v["viable"] and v["optional_veto"] == false and v["shame_holdout"] == false
    end)
  end

  def run("group_required_failure", _) do
    assert_journey(fn ->
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "bday", role: "required", response: "not_this_time"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"}
          ],
          purpose: "birthday",
          min_viable: 2
        )

      v["viable"] == false and "bday" in v["required_missing"]
    end)
  end

  def run("group_late_join", _) do
    assert_journey(fn ->
      {:ok, j} =
        GroupViability.late_join(%{"viable" => true}, "late",
          provider_capacity_remaining: 1,
          plan_confirmed: true
        )

      j["can_join"] and j["breaks_confirmed_plan"] == false
    end)
  end

  def run("group_late_drop", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "1", role: "optional", response: "im_in"},
        %{user_id: "2", role: "optional", response: "im_in"},
        %{user_id: "3", role: "optional", response: "im_in"},
        %{user_id: "4", role: "optional", response: "im_in"}
      ]

      {:ok, d} = GroupViability.late_decline(people, "4", purpose: "friends", min_viable: 3)
      d["viable"] and d["restart_entire_plan"] == false and d["graceful_miss"]
    end)
  end

  def run("private_budget", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          fetch_places: true,
          max_price_band: "$",
          category: "dinner",
          relationship_context: "date",
          area_label: "Carlsbad",
          confidence: 0.8,
          forming?: true
        })

      r["private_budget_leaked"] == false and not String.contains?(inspect(r), "can't afford")
    end)
  end

  def run("private_location", _) do
    assert_journey(fn ->
      proj = LocationPolicy.shared_projection("Carlsbad")
      not LocationPolicy.routine_leak?(proj["benefit_copy"]) and proj["no_coordinates"]
    end)
  end

  def run("provider_failure", _) do
    assert_journey(fn ->
      {:ok, e} = ExecutionReadiness.assess(%{set: true, provider_failed: true})
      e["social_truth_intact"] and e["execution_ready"] == false
    end)
  end

  def run("topic_change", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          place_resolved: true,
          travel_ok: true,
          confidence: 0.95,
          topic_changed: true,
          option_count: 1,
          options: [%{"name" => "Stale"}],
          forming?: true
        })

      r["surface"]["surface"] == :silence and r["surface"]["reason"] == "topic_changed"
    end)
  end

  def run("block", _) do
    assert_journey(fn ->
      r = AmbientOpportunity.on_block("o", "p")
      r["ambient_opportunity_sharing"] == :stopped and r["lingering_plan_permission"] == false
    end)
  end

  def run("solo", _) do
    assert_journey(fn ->
      {:ok, o} =
        SocialOpening.detect(%{
          participant_ids: ["solo"],
          viable_participant_ids: ["solo"],
          opening_hours: 2.0,
          willingness_ok: true,
          proximity_ok: true,
          world_opportunity: true
        })

      o["exists"] and o["kind"] == "personal"
    end)
  end

  def run("hard_constraint_block", _) do
    assert_journey(fn ->
      # Numeric majority wants plan; hard accessibility fails → not viable
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "1", role: "optional", response: "im_in"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"}
          ],
          purpose: "friends",
          min_viable: 3,
          hard_constraints: [
            %{"kind" => "accessibility_missing", "blocks_plan" => true}
          ]
        )

      v["viable"] == false and v["hard_constraint_block"] == true and
        v["majority_override_hard"] == false
    end)
  end

  def run("stale_suppression", _) do
    assert_journey(fn ->
      StaleSuppression.reset()

      attrs = %{
        conversation_id: "chaos-stale",
        participant_ids: ["a", "b"],
        in_ids: ["a", "b"],
        time_compatible: true,
        proximity_ok: true,
        willingness_ok: true,
        place_resolved: true,
        travel_ok: true,
        confidence: 0.9,
        option_count: 1,
        options: [%{"name" => "Night market"}],
        forming?: true,
        opening_hours: 2.0,
        unknowns_before: 5
      }

      {:ok, first} = AmbientOpportunity.evaluate(attrs)
      {:ok, second} = AmbientOpportunity.evaluate(attrs)

      first["recomputed"] == true and second["suppressed"] == true and
        second["recomputed"] == false and second["surface"]["surface"] == :silence
    end)
  end

  def run(_, _), do: %{"pass" => false, "error" => :unknown_journey}

  @doc "Payment end-of-funnel smoke (not a full journey id)."
  def payment_smoke do
    assert_journey(fn ->
      {:ok, early} =
        PaymentReadiness.assess(%{
          set: false,
          participant_ids: ["a"],
          venue_id: "x",
          price_each: 10
        })

      {:ok, late} =
        PaymentReadiness.assess(%{
          set: true,
          provider_checked: true,
          provider_available: true,
          participant_ids: ["a", "b"],
          venue_id: "x",
          price_each: 28,
          all_agreed: true
        })

      early["payment_prompt_ok"] == false and late["payment_prompt_ok"] == true and
        late["individual_details_shared"] == false
    end)
  end

  @doc "Expiry never manufactures urgency."
  def expiry_smoke do
    assert_journey(fn ->
      {:ok, fake} = OpportunityExpiry.evaluate(%{force_urgency: true})
      fake["may_surface_urgency"] == false
    end)
  end

  defp assert_journey(fun) do
    if fun.() do
      %{"pass" => true}
    else
      %{"pass" => false, "error" => :assertion}
    end
  rescue
    e -> %{"pass" => false, "error" => Exception.message(e)}
  end
end
