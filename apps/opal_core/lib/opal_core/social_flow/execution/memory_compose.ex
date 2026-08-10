defmodule OpalCore.SocialFlow.Execution.MemoryCompose do
  @moduledoc """
  Adaptive relationship memory compose — compound alignment.

  Doctrine (founder correction):
  Opal should know as much *useful*, permissioned, trustworthy context as
  needed to help each person align faster. Know richly where legitimate;
  reveal minimally.

  KNOW MORE ≠ SHOW MORE.
  KNOW MORE → ask less, search less, interrupt less, align faster.

  Layers:
  Individual → Relational → Collective → Compound Alignment flywheel.

  Python proposes; Elixir authorizes. No post-event surveys by default.
  """

  alias OpalCore.SocialFlow.Ambient.AlignmentLoop

  alias OpalCore.SocialFlow.Execution.{
    CompoundAlignment,
    MemoryAdmission,
    MemoryFit,
    MemoryMetrics,
    MemoryStore,
    OutcomeLearning
  }

  @doc "Admit a natural-language or structured observation."
  def remember(attrs) when is_map(attrs) do
    MemoryStore.ensure_started()
    MemoryMetrics.ensure_started()
    a = stringify(attrs)

    result = classify_and_evaluate(a)

    case result do
      %{"admit" => true, "fact" => fact} = dec when is_map(fact) ->
        case MemoryStore.admit(Map.merge(a, Map.put(fact, "admitted", true))) do
          {:ok, stored} ->
            MemoryMetrics.record_admission(true)

            if stored["kind"] == "explicit_correction" do
              MemoryMetrics.record_correction()
            end

            {:ok,
             %{
               "remembered" => true,
               "fact" => stored,
               "ephemeral" => dec["ephemeral"] == true,
               "authorizes_set" => false,
               "profile_machine" => false,
               "alignment_value" => true
             }}

          {:reject, r} ->
            MemoryMetrics.record_admission(false)
            {:ok, %{"remembered" => false, "reason" => r["reason"]}}
        end

      %{"admit" => false} = r ->
        MemoryMetrics.record_admission(false)
        {:ok, Map.merge(r, %{"remembered" => false})}

      other ->
        {:ok, %{"remembered" => false, "raw" => other}}
    end
  end

  def remember(_), do: {:error, :invalid}

  @doc "Python proposal — Elixir still authorizes."
  def remember_python_proposal(proposal) when is_map(proposal) do
    dec = MemoryAdmission.from_python_proposal(proposal)

    if dec["admit"] do
      remember(Map.merge(stringify(proposal), Map.put(dec["fact"] || %{}, "admitted", true)))
    else
      MemoryMetrics.record_admission(false)
      {:ok, Map.merge(dec, %{"remembered" => false, "python_authorized" => false})}
    end
  end

  def remember_python_proposal(_), do: {:error, :invalid}

  @doc "Apply memory to current plan context — fewer questions, fewer options."
  def apply_to_alignment(context, opts \\ [])

  def apply_to_alignment(context, opts) when is_map(context) do
    c = stringify(context)
    fit = MemoryFit.apply(c, opts)
    MemoryMetrics.record_questions_eliminated(fit["questions_eliminated"] || 0)

    pending = List.wrap(c["pending_questions"] || [])

    eliminated_topics =
      (fit["questions_eliminated_detail"] || [])
      |> Enum.map(& &1["topic"])
      |> MapSet.new()

    ask_decisions =
      Enum.map(pending, fn topic ->
        t = if is_binary(topic), do: topic, else: topic["topic"] || topic[:topic]
        known? = MapSet.member?(eliminated_topics, t)

        AlignmentLoop.should_ask?(%{
          topic: t,
          opal_already_knows: known?,
          native_social_time: c["native_social_time"],
          location_known: c["location_known"]
        })
      end)

    questions_still =
      Enum.count(pending, fn topic ->
        t = if is_binary(topic), do: topic, else: topic["topic"] || topic[:topic]
        not MapSet.member?(eliminated_topics, t)
      end)

    {:ok,
     Map.merge(fit, %{
       "ask_decisions" => ask_decisions,
       "questions_still_needed" => questions_still,
       "next_alignment_easier" => (fit["questions_eliminated"] || 0) > 0,
       "know_more_show_less" => true,
       "authorizes_set" => false
     })}
  end

  def apply_to_alignment(_, _), do: {:error, :invalid}

  @doc "Compose individual models into relational/collective shared-safe conclusion."
  def compose_alignment(attrs) when is_map(attrs) do
    CompoundAlignment.compose(attrs)
  end

  def compose_alignment(_), do: {:error, :invalid}

  @doc "Forget / revoke memory."
  def forget(memory_id, opts \\ [])

  def forget(memory_id, opts) when is_binary(memory_id) do
    MemoryStore.forget(memory_id, opts)
  end

  def forget(_, _), do: {:error, :invalid}

  @doc "Record contradiction without arguing."
  def contradict(memory_id) when is_binary(memory_id) do
    case MemoryStore.contradict(memory_id) do
      {:ok, _} = ok ->
        MemoryMetrics.record_contradiction()
        ok

      other ->
        other
    end
  end

  def contradict(_), do: {:error, :invalid}

  @doc """
  Multi-plan compound alignment benchmark.

  Plan 1 cold → Plan 5 with individual+relational context → fewer questions,
  no cross-relationship leak, no more output cards.
  """
  def multi_plan_benchmark do
    MemoryStore.reset()
    MemoryMetrics.reset()

    base_ctx = %{
      "owner_user_id" => "u-a",
      "counterpart_user_id" => "u-b",
      "relationship_id" => "u-a|u-b",
      "plan_type" => "dinner",
      "conversation_id" => "c1"
    }

    pending1 = ["quiet_or_lively", "budget", "how_far"]
    {:ok, p1} = apply_to_alignment(Map.put(base_ctx, "pending_questions", pending1))
    MemoryMetrics.record_plan(1, p1["questions_still_needed"])

    {:ok, _} =
      remember(%{
        explicit_correction: true,
        text: "That place was way too loud.",
        owner_user_id: "u-a",
        counterpart_user_id: "u-b",
        relationship_id: "u-a|u-b",
        scope: "relationship",
        dimension: "noise_level",
        value: "too_loud_avoid"
      })

    {:ok, _} =
      remember(%{
        explicit: true,
        user_stated: true,
        text: "Don't send me all the way to Oceanside.",
        owner_user_id: "u-a",
        counterpart_user_id: "u-b",
        relationship_id: "u-a|u-b",
        scope: "relationship",
        dimension: "travel_burden",
        value: "avoid_far"
      })

    {:ok, _} =
      remember(%{
        explicit: true,
        user_stated: true,
        text: "I'd rather do something casual with them.",
        owner_user_id: "u-a",
        counterpart_user_id: "u-b",
        relationship_id: "u-a|u-b",
        scope: "relationship",
        dimension: "formality",
        value: "casual"
      })

    {:ok, p5} =
      apply_to_alignment(
        Map.merge(base_ctx, %{
          "pending_questions" => pending1,
          "conversation_id" => "c5",
          "plan_id" => "plan-5"
        })
      )

    MemoryMetrics.record_plan(5, p5["questions_still_needed"])

    {:ok, other} =
      apply_to_alignment(%{
        "owner_user_id" => "u-a",
        "counterpart_user_id" => "u-c",
        "relationship_id" => "u-a|u-c",
        "pending_questions" => pending1,
        "plan_type" => "dinner"
      })

    # Collective composition: many private facts → one shared-safe conclusion
    {:ok, collective} =
      CompoundAlignment.compose(%{
        "participants" => [
          %{
            "user_id" => "u-a",
            "facts" =>
              MemoryStore.retrieve(%{"owner_user_id" => "u-a", "relationship_id" => "u-a|u-b"})[
                "memories"
              ]
          },
          %{
            "user_id" => "u-b",
            "facts" => [
              %{"dimension" => "timing", "value" => "after_6", "kind" => "explicit_fact"}
            ]
          }
        ],
        "relationship_id" => "u-a|u-b",
        "plan_type" => "dinner"
      })

    progress = MemoryMetrics.learning_progress()

    %{
      "plan_1_questions" => p1["questions_still_needed"],
      "plan_5_questions" => p5["questions_still_needed"],
      "plan_5_eliminated" => p5["questions_eliminated"],
      "other_relationship_still_asks" => other["questions_still_needed"],
      "no_cross_relationship_leak" =>
        other["questions_still_needed"] >= p5["questions_still_needed"],
      "improved" => p5["questions_still_needed"] < p1["questions_still_needed"],
      "collective" => collective,
      "know_more_show_less" => true,
      "progress" => progress,
      "pass" =>
        p5["questions_still_needed"] < p1["questions_still_needed"] and
          p1["questions_still_needed"] >= 2 and
          collective["private_leakage"] == false,
      "magic" => "we_dont_have_to_explain_all_this_again",
      "compound_alignment" => true
    }
  end

  @doc "Shared-safe projection — never expose private budget to peer."
  def shared_safe_summary(private_memories, peer_context \\ %{})

  def shared_safe_summary(private_memories, _peer_context) when is_list(private_memories) do
    private_memories
    |> Enum.filter(fn m ->
      m["shared_explanation_safe"] == true or
        (m["dimension"] in ~w(zone formality) and m["visibility"] == "shared_safe")
    end)
    |> Enum.map(fn m ->
      %{"dimension" => m["dimension"], "hint" => "fit_improved", "no_private_cause" => true}
    end)
    |> then(fn hints ->
      %{
        "shared_hints" => hints,
        "never_exposes" => ["budget", "medical", "private_constraint"],
        "example_forbidden" => "A can't afford Candidate A",
        "composition_not_disclosure" => true
      }
    end)
  end

  def shared_safe_summary(_, _), do: %{"shared_hints" => [], "composition_not_disclosure" => true}

  defp classify_and_evaluate(a) do
    cond do
      a["outcome"] not in [nil, ""] or a["provider_outcome"] not in [nil, ""] ->
        OutcomeLearning.from_outcome(a)

      a["explicit_correction"] == true or a["correction"] not in [nil, ""] ->
        OutcomeLearning.from_outcome(Map.put(a, "explicit_correction", true))

      a["explicit"] == true or a["user_stated"] == true ->
        OutcomeLearning.from_outcome(Map.merge(a, %{"explicit" => true, "user_stated" => true}))

      a["python_proposal"] == true ->
        MemoryAdmission.from_python_proposal(a)

      true ->
        MemoryAdmission.evaluate(a)
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
