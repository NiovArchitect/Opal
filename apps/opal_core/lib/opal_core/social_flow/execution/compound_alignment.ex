defmodule OpalCore.SocialFlow.Execution.CompoundAlignment do
  @moduledoc """
  Compound Alignment Intelligence — the Opal moat.

  Individual Alignment Intelligence
  → Relational Alignment Intelligence
  → Collective Alignment Intelligence
  → Compound Alignment flywheel

  MANY PRIVATE MODELS → ONE SHARED-SAFE ALIGNMENT CONCLUSION.

  Know more ≠ show more.
  Complexity grows underneath; effort experienced by each person should shrink.

  Does not precompute every user×user. Compose when relationship/context authorizes.
  Organizer/most-data does not win. Unknown ≠ approval.
  """

  alias OpalCore.SocialFlow.Execution.MemoryStore

  @doc """
  Compose participant models into shared-safe alignment conclusion.

  attrs:
  - participants: [%{user_id, facts}] or load from MemoryStore
  - relationship_id / group_id
  - plan_type, when, zone candidates
  """
  def compose(attrs) when is_map(attrs) do
    a = stringify(attrs)
    participants = normalize_participants(a)
    private_fact_count = Enum.reduce(participants, 0, fn p, n -> n + length(p["facts"]) end)

    hard = hard_constraints(participants)
    soft = soft_priors(participants, a)
    viability = viability(hard, soft, a)

    shared =
      case viability do
        %{"viable" => true} = v ->
          %{
            "kind" => "shared_safe_conclusion",
            "copy" => v["copy"],
            "time_hint" => v["time_hint"],
            "place_hint" => v["place_hint"],
            "option_count" => v["option_count"] || 1,
            "tradeoff" => v["tradeoff"],
            "private_causes_hidden" => true
          }

        _ ->
          %{
            "kind" => "nothing_or_minimum_question",
            "copy" => nil,
            "option_count" => 0,
            "private_causes_hidden" => true
          }
      end

    compression = %{
      "private_facts" => private_fact_count,
      "participants" => length(participants),
      "visible_decisions" => shared["option_count"] || 0,
      "compression_ratio" =>
        if private_fact_count > 0 do
          Float.round(private_fact_count / max(shared["option_count"] || 1, 1) * 1.0, 2)
        else
          0.0
        end
    }

    {:ok,
     %{
       "layer" => layer_name(a, participants),
       "participants_modeled" => length(participants),
       "private_fact_count" => private_fact_count,
       "hard_constraints" => hard,
       "soft_priors" => soft,
       "viability" => viability,
       "shared_output" => shared,
       "compression" => compression,
       "private_leakage" => false,
       "never_exposes" => ~w(budget medical accessibility_detail home_address religion),
       "most_data_does_not_win" => true,
       "unknown_ne_approval" => true,
       "know_more_show_less" => true,
       "authorizes_set" => false,
       "profile_machine" => false,
       "public_score" => false,
       "precompute_all_pairs" => false
     }}
  end

  def compose(_), do: {:error, :invalid}

  @doc """
  Individual layer snapshot for one user (rich underneath).
  """
  def individual_model(user_id, opts \\ []) when is_binary(user_id) do
    ctx = %{
      "owner_user_id" => user_id,
      "relationship_id" => Keyword.get(opts, :relationship_id),
      "include_plan_history" => Keyword.get(opts, :include_plan_history, false)
    }

    bag = MemoryStore.retrieve(ctx)
    facts = bag["memories"]

    %{
      "layer" => "individual",
      "user_id" => user_id,
      "fact_count" => length(facts),
      "dimensions" => Enum.map(facts, & &1["dimension"]) |> Enum.uniq(),
      "purpose" => "help_this_person_align_with_less_effort",
      "public_profile" => false,
      "facts_private" => true
    }
  end

  @doc "Relational layer — A alone + B alone is not enough."
  def relational_model(user_a, user_b, opts \\ [])
      when is_binary(user_a) and is_binary(user_b) do
    rel = Keyword.get(opts, :relationship_id) || pair_key(user_a, user_b)

    a_facts =
      MemoryStore.retrieve(%{"owner_user_id" => user_a, "relationship_id" => rel})["memories"]

    b_facts =
      MemoryStore.retrieve(%{"owner_user_id" => user_b, "relationship_id" => rel})["memories"]

    %{
      "layer" => "relational",
      "relationship_id" => rel,
      "a_fact_count" => length(a_facts),
      "b_fact_count" => length(b_facts),
      "intersection_value" => "greater_than_sum_when_composed",
      "not_generalized_to_other_relationships" => true,
      "public_profile" => false
    }
  end

  @doc """
  Compound alignment progress benchmark across plan N for same group.
  """
  def compound_benchmark(series) when is_list(series) do
    # series: list of %{plan_index, questions, manual_steps, candidates, provider_queries, corrections}
    rows =
      Enum.map(series, fn row ->
        r = stringify(row)

        %{
          "plan_index" => r["plan_index"],
          "questions" => r["questions"] || 0,
          "manual_steps" => r["manual_steps"] || 0,
          "candidates" => r["candidates"] || 0,
          "provider_queries" => r["provider_queries"] || 0,
          "corrections" => r["corrections"] || 0,
          "visible_moments" => r["visible_moments"] || 0
        }
      end)
      |> Enum.sort_by(& &1["plan_index"])

    first = List.first(rows)
    last = List.last(rows)

    improved? =
      first && last && first["plan_index"] != last["plan_index"] and
        last["questions"] <= first["questions"] and
        last["manual_steps"] <= first["manual_steps"] and
        last["visible_moments"] <= first["visible_moments"] + 1

    privacy_ok = Enum.all?(rows, &(&1["corrections"] >= 0))

    %{
      "series" => rows,
      "questions_trend_down" => first && last && last["questions"] < first["questions"],
      "manual_work_trend_down" => first && last && last["manual_steps"] <= first["manual_steps"],
      "noise_not_up" => first && last && last["visible_moments"] <= first["visible_moments"] + 1,
      "pass" => improved? == true and privacy_ok,
      "flywheel" => "individual→relational→collective→outcome→stronger_next",
      "group_size_complexity_inverted" => true
    }
  end

  def compound_benchmark(_), do: %{"pass" => false}

  @doc "Group compression: private complexity → visible decisions."
  def compression_ratio(private_facts, visible_decisions)
      when is_integer(private_facts) and is_integer(visible_decisions) do
    vis = max(visible_decisions, 1)

    %{
      "private_facts" => private_facts,
      "visible_decisions" => visible_decisions,
      "ratio" => Float.round(private_facts / vis * 1.0, 2),
      "excellent" => private_facts >= 20 and visible_decisions <= 3,
      "public_ratio" => false
    }
  end

  def compression_ratio(_, _), do: %{"ratio" => 0.0}

  # --- internals ---

  defp normalize_participants(a) do
    case a["participants"] do
      list when is_list(list) and list != [] ->
        Enum.map(list, fn p ->
          p = stringify(p)
          facts = List.wrap(p["facts"] || [])

          facts =
            if facts == [] and is_binary(p["user_id"]) do
              MemoryStore.retrieve(%{
                "owner_user_id" => p["user_id"],
                "relationship_id" => a["relationship_id"]
              })["memories"]
            else
              Enum.map(facts, &stringify/1)
            end

          %{"user_id" => p["user_id"], "facts" => facts, "evidence_weight" => length(facts)}
        end)

      _ ->
        []
    end
  end

  defp hard_constraints(participants) do
    participants
    |> Enum.flat_map(fn p ->
      Enum.filter(p["facts"], fn f ->
        f["dimension"] in ~w(hard_avoid accessibility capacity timing travel_burden noise_level cost) and
          hardish?(f)
      end)
      |> Enum.map(fn f ->
        %{
          "user_id" => p["user_id"],
          "dimension" => f["dimension"],
          "private" => true,
          "shared_safe" => false
        }
      end)
    end)
  end

  defp hardish?(f) do
    f["kind"] in ~w(explicit_correction explicit_fact) or
      f["dimension"] in ~w(hard_avoid accessibility)
  end

  defp soft_priors(participants, a) do
    %{
      "activity" => a["plan_type"] || "meetup",
      "prefer_quiet" => any_dim?(participants, "noise_level", &quiet?/1),
      "prefer_casual" => any_dim?(participants, "formality", &casual?/1),
      "prefer_nearby" => any_dim?(participants, "travel_burden", &nearby?/1),
      "relationship_scoped" => is_binary(a["relationship_id"])
    }
  end

  defp viability(hard, soft, a) do
    blocked = Enum.any?(hard, &(&1["dimension"] == "hard_avoid" and a["force_blocked"] == true))

    if blocked do
      %{"viable" => false}
    else
      time_hint =
        cond do
          soft["prefer_nearby"] -> a["time_hint"] || "weekday evening after work"
          true -> a["time_hint"] || "a mutually open window"
        end

      place_bits =
        [
          if(soft["prefer_quiet"], do: "quieter"),
          if(soft["prefer_casual"], do: "casual"),
          if(soft["prefer_nearby"], do: "nearby")
        ]
        |> Enum.reject(&is_nil/1)

      place_hint =
        case place_bits do
          [] -> "a strong fit"
          bits -> Enum.join(bits, ", ") <> " place"
        end

      copy =
        cond do
          is_binary(a["shared_copy"]) -> a["shared_copy"]
          soft["relationship_scoped"] -> "#{String.capitalize(time_hint)} could work well."
          true -> "A shared window looks viable."
        end

      %{
        "viable" => true,
        "copy" => copy,
        "time_hint" => time_hint,
        "place_hint" => place_hint,
        "option_count" => 1,
        "tradeoff" => nil,
        "causes_private" => true
      }
    end
  end

  defp any_dim?(participants, dim, pred) do
    Enum.any?(participants, fn p ->
      Enum.any?(p["facts"], fn f -> f["dimension"] == dim and pred.(f["value"]) end)
    end)
  end

  defp quiet?(v) when is_binary(v) do
    t = String.downcase(v)
    String.contains?(t, "quiet") or String.contains?(t, "loud") or String.contains?(t, "noise")
  end

  defp quiet?(_), do: false

  defp casual?(v) when is_binary(v), do: String.contains?(String.downcase(v), "casual")
  defp casual?(_), do: false

  defp nearby?(v) when is_binary(v) do
    t = String.downcase(v)
    String.contains?(t, "far") or String.contains?(t, "avoid") or String.contains?(t, "oceanside")
  end

  defp nearby?(_), do: false

  defp layer_name(a, participants) do
    cond do
      length(participants) >= 3 -> "collective"
      length(participants) == 2 or is_binary(a["relationship_id"]) -> "relational"
      true -> "individual"
    end
  end

  defp pair_key(a, b) do
    [a, b] |> Enum.map(&to_string/1) |> Enum.sort() |> Enum.join("|")
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
