defmodule OpalCore.SocialFlow.Execution.BackgroundPrepare do
  @moduledoc """
  Private proactive preparation — zero user-visible output by default.

  May: refresh feasibility, zone, travel, leave-by, execution requirements,
  cheap provider preflight, group viability.

  Must not: surface cards, ask questions, call live providers without tier,
  invent urgency, treat prep as certainty forever.

  Prepared state ages via Freshness / PlanVersion.
  Sunk cost has zero privilege over user attention.
  """

  alias OpalCore.SocialFlow.Ambient.{Freshness, ProviderTier}
  alias OpalCore.SocialFlow.Execution.{AttentionTier, ExecutionRequirements}

  @doc """
  Run private preparation for a plan given attention evaluation.
  """
  def run(attrs, awareness \\ %{})

  def run(attrs, awareness) when is_map(attrs) do
    a = stringify(attrs)
    aw = stringify(awareness)
    tier = aw["attention_tier"] || "dormant"
    allowed = aw["allowed_work"] || AttentionTier.allowed_work(tier)
    now = a["now"] || DateTime.utc_now()

    if tier in ~w(dormant) or allowed == [] do
      {:ok, empty_prep(tier, "no_work_justified")}
    else
      provider = ProviderTier.authorize(Map.merge(a, %{"set" => a["set"]}))
      {:ok, req} = ExecutionRequirements.infer(a)

      items =
        []
        |> maybe(allowed, "execution_requirements", fn ->
          %{"kind" => "execution_requirements", "result" => req, "cost" => "cheap"}
        end)
        |> maybe(allowed, "opportunity_zone", fn ->
          zone_item(a)
        end)
        |> maybe(allowed, "travel_estimate", fn ->
          travel_item(a)
        end)
        |> maybe(allowed, "leave_by_context", fn ->
          leave_item(a, now)
        end)
        |> maybe(allowed, "provider_preflight_cheap", fn ->
          preflight_item(a, provider)
        end)
        |> maybe(allowed, "group_viability", fn ->
          group_item(a)
        end)
        |> maybe(allowed, "freshness_check", fn ->
          freshness_item(a, now)
        end)

      # Never surface preparation
      aged = Enum.map(items, &age_mark(&1, now, a))

      {:ok,
       %{
         "attention_tier" => tier,
         "prepared" => aged,
         "prepared_count" => length(aged),
         "surface" => false,
         "ask" => false,
         "notify" => false,
         "feed" => false,
         "prefetch_visible" => false,
         "sunk_cost_privilege" => false,
         "provider_tier" => provider["tier"],
         "live_provider_called" => false,
         "model_called" => false,
         "deterministic_elixir_first" => true,
         "private" => true,
         "authorizes_set" => false,
         "prepared_at" => now,
         "plan_version" => a["plan_version"]
       }}
    end
  end

  def run(_, _), do: {:error, :invalid}

  @doc """
  Revalidate prepared bag before surface. Stale prep is not certainty.
  """
  def revalidate_for_surface(prep, plan_now, opts \\ [])

  def revalidate_for_surface(prep, plan_now, opts) when is_map(prep) and is_map(plan_now) do
    p = stringify(prep)
    n = stringify(plan_now)
    now = Keyword.get(opts, :now) || n["now"] || DateTime.utc_now()
    max_age_min = Keyword.get(opts, :max_age_minutes, 45)

    prepared_at = p["prepared_at"]
    age_ok? = age_minutes(prepared_at, now) <= max_age_min

    version_ok? =
      is_nil(p["plan_version"]) or is_nil(n["plan_version"]) or
        to_string(p["plan_version"]) == to_string(n["plan_version"])

    direction_changed? =
      n["topic_changed"] == true or n["humans_changed_direction"] == true or
        (is_binary(n["desired_category"]) and is_binary(p["category"]) and
           n["desired_category"] != p["category"])

    cond do
      n["cancelled"] == true ->
        {:ok, %{"usable" => false, "reason" => "plan_cancelled", "surface" => false}}

      not version_ok? ->
        {:ok, %{"usable" => false, "reason" => "plan_version_mismatch", "surface" => false}}

      direction_changed? ->
        {:ok,
         %{
           "usable" => false,
           "reason" => "humans_changed_direction",
           "surface" => false,
           "discard_quietly" => true,
           "sunk_cost_privilege" => false
         }}

      not age_ok? ->
        {:ok, %{"usable" => false, "reason" => "prepared_stale", "surface" => false}}

      n["venue_still_open"] == false ->
        {:ok, %{"usable" => false, "reason" => "venue_closed", "surface" => false}}

      n["required_participants_viable"] == false ->
        {:ok, %{"usable" => false, "reason" => "participants_not_viable", "surface" => false}}

      true ->
        {:ok,
         %{
           "usable" => true,
           "reason" => "valid",
           "surface" => false,
           "prep_still_private" => true,
           "revalidated_at" => now
         }}
    end
  end

  def revalidate_for_surface(_, _, _), do: {:error, :invalid}

  defp empty_prep(tier, reason) do
    %{
      "attention_tier" => tier,
      "prepared" => [],
      "prepared_count" => 0,
      "surface" => false,
      "ask" => false,
      "notify" => false,
      "reason" => reason,
      "private" => true,
      "sunk_cost_privilege" => false
    }
  end

  defp maybe(list, allowed, work, fun) do
    if work in allowed, do: [fun.() | list], else: list
  end

  defp zone_item(a) do
    %{
      "kind" => "opportunity_zone",
      "result" => %{
        "zone" => a["zone"] || a["area"] || a["city"] || "known",
        "live_search" => false,
        "precompute_only" => true
      },
      "cost" => "cheap",
      "source_class" => "tonight_opening"
    }
  end

  defp travel_item(a) do
    mins = a["travel_minutes"] || a["estimated_travel_minutes"]

    %{
      "kind" => "travel_estimate",
      "result" => %{
        "travel_minutes" => mins,
        "precise" => false,
        "os_location_ne_social_share" => true
      },
      "cost" => "cheap",
      "source_class" => "expected_location"
    }
  end

  defp leave_item(a, now) do
    leave =
      case a["leave_by"] do
        %DateTime{} = dt ->
          dt

        _ ->
          case a["when"] || a["plan_start"] do
            %DateTime{} = start ->
              travel = a["travel_minutes"] || 30
              DateTime.add(start, -trunc(travel) * 60, :second)

            _ ->
              nil
          end
      end

    %{
      "kind" => "leave_by_context",
      "result" => %{
        "leave_by" => leave,
        "computed_at" => now,
        "surface" => false
      },
      "cost" => "cheap",
      "source_class" => "native_commitment"
    }
  end

  defp preflight_item(a, provider) do
    %{
      "kind" => "provider_preflight_cheap",
      "result" => %{
        "tier" => provider["tier"],
        "live_provider_ok" => provider["live_provider_ok"],
        "metadata_only" => true,
        "inventory_queried" => false,
        "venue_hint" => a["place"] || a["destination"]
      },
      "cost" => "medium_or_low",
      "source_class" => "provider_inventory"
    }
  end

  defp group_item(a) do
    %{
      "kind" => "group_viability",
      "result" => %{
        "viable" => a["group_viable"] != false,
        "required_ok" => a["required_participant_unresolved"] != true,
        "silence_ne_decline" => true,
        "optional_not_nagged" => true
      },
      "cost" => "cheap"
    }
  end

  defp freshness_item(a, now) do
    {:ok, f} =
      Freshness.confidence(%{
        "source_class" => "conversation_evidence",
        "observed_at" => a["intent_observed_at"] || a["last_message_at"],
        "now" => now
      })

    %{"kind" => "freshness_check", "result" => f, "cost" => "cheap"}
  end

  defp age_mark(item, now, a) do
    Map.merge(item, %{
      "prepared_at" => now,
      "plan_version" => a["plan_version"],
      "trustworthy_forever" => false,
      "surface" => false
    })
  end

  defp age_minutes(%DateTime{} = from, %DateTime{} = now),
    do: DateTime.diff(now, from, :second) / 60.0

  defp age_minutes(_, _), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
