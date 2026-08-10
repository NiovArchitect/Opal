defmodule OpalCore.SocialFlow.Ambient.AlignmentLoop do
  @moduledoc """
  Opal behavioral operating system — not a wizard.

  KNOW WHAT HAPPENED
  → KNOW WHAT IS STILL POSSIBLE
  → NOTICE WHAT JUST BECAME EASY
  → COMPRESS THE WORLD
  → HUMANS MAKE ONE MEANINGFUL CHOICE
  → EXECUTE OR GET OUT OF THE WAY
  → QUIET → REMEMBER NEW REALITY

  Continuously revisable under conversation. Chat stays human.
  Ambient maintains alignment state underneath.

  AI does more work; user experiences less software.
  Does not Set. Does not create UI.
  """

  alias OpalCore.SocialFlow.Ambient.{
    Convergence,
    OpportunityFormation,
    OpportunityLayers,
    SmallestOutput,
    TrustFact
  }

  @truth_classes ~w(
    active historical expired superseded private shared derived provider inferred
  )

  def truth_classes, do: @truth_classes

  @possibility ~w(impossible possible tentative viable strong actionable execution_ready)

  def possibility_levels, do: @possibility

  @doc """
  Run one pass of the alignment loop.

  Returns smallest human-facing result + private loop diagnostics.
  """
  def step(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with :ok <- gate(a),
         {:ok, known} <- know_what_happened(a),
         {:ok, possible} <- know_what_is_possible(a, known),
         {:ok, easy} <- notice_what_became_easy(a, possible),
         {:ok, formed} <- compress_world(a, known, possible, easy) do
      smallest = formed["smallest"] || silence("no_result")
      phase = phase_after(smallest, a)

      {:ok,
       %{
         "smallest" => smallest,
         "loop" => %{
           "known" => known,
           "possible" => possible,
           "became_easy" => easy,
           "phase" => phase,
           "human_job" => human_job(smallest),
           "opal_job" => "coordinate_compare_filter_recover_compress",
           "quiet_after" => phase in ~w(calm quiet),
           "remember_after" => true
         },
         "authorizes_set" => false,
         "feed" => false,
         "heat_map_ui" => false,
         "wizard" => false,
         "user_experiences_less_software" => true
       }}
    end
  end

  def step(_), do: {:error, :invalid}

  @doc """
  Classify a fact token into truth class for active reasoning.
  """
  def classify_truth(attrs) when is_map(attrs) do
    a = stringify(attrs)

    class =
      cond do
        a["superseded"] == true -> "superseded"
        a["expired"] == true or a["window_ended"] == true -> "expired"
        a["historical"] == true -> "historical"
        a["inferred"] == true -> "inferred"
        a["provider"] == true -> "provider"
        a["derived"] == true -> "derived"
        a["private"] == true -> "private"
        a["shared"] == true -> "shared"
        true -> "active"
      end

    active? = class == "active" and a["superseded"] != true and a["expired"] != true

    {:ok,
     %{
       "class" => class,
       "active_for_decisions" => active?,
       "must_not_influence_if_not_active" => not active?
     }}
  end

  def classify_truth(_), do: {:ok, %{"class" => "historical", "active_for_decisions" => false}}

  @doc "Supersession: Friday replaces Thursday as active truth."
  def apply_correction(old_statement, new_statement) when is_map(old_statement) do
    TrustFact.supersede(old_statement, new_statement)
  end

  # --- loop stages ---

  defp know_what_happened(a) do
    {:ok,
     %{
       "participants" => List.wrap(a["participant_ids"]),
       "relationship_context" => a["relationship_context"],
       "intent" => a["intent"] || a["conversation_intent"],
       "set" => a["set"] == true,
       "native_commitments_known" => a["native_commitments_known"] == true,
       "plan_version" => a["plan_version"] || 0,
       "who_opted_out" => List.wrap(a["out_ids"]),
       "what_was_rejected" => List.wrap(a["rejected"]),
       "provider_outcome" => a["provider_outcome"],
       "still_valid_dimensions" => List.wrap(a["resolved_dimensions"]),
       "remembers_result_not_only_strings" => true,
       "native_memory_special_authority" => a["native_commitments_known"] == true
     }}
  end

  defp know_what_is_possible(a, known) do
    with {:ok, layers} <-
           OpportunityLayers.classify(
             Map.merge(a, %{
               "viable_participant_ids" => a["viable_participant_ids"] || a["in_ids"],
               "native_commitments_known" => known["native_commitments_known"]
             })
           ) do
      level =
        cond do
          a["impossible"] == true or (layers["must_stay_quiet"] and not layers["social_opening"]) ->
            "impossible"

          layers["actionable_opportunity"] ->
            "actionable"

          layers["social_opening"] and layers["world_opportunity"] ->
            "strong"

          layers["social_opening"] ->
            "viable"

          layers["world_opportunity"] ->
            "possible"

          true ->
            "tentative"
        end

      # free ≠ socially possible
      free_not_enough = a["calendar_free"] == true and a["willingness_ok"] == false

      {:ok,
       %{
         "level" => level,
         "social_opening" => layers["social_opening"],
         "world_opportunity" => layers["world_opportunity"],
         "partial_group_ok" => layers["social_opening_detail"]["perfect_group_not_required"],
         "calendar_free_not_sufficient" => free_not_enough,
         "layers" => layers,
         "binary_possibility" => false
       }}
    end
  end

  defp notice_what_became_easy(a, possible) do
    with {:ok, conv} <-
           Convergence.detect(
             Map.merge(a, %{
               "social_opening" => possible["social_opening"],
               "viable" => possible["social_opening"],
               "in_count" => length(List.wrap(a["in_ids"] || a["viable_participant_ids"])),
               "trust_ok" => a["trust_ok"] != false
             })
           ) do
      # Slight improvements alone are not "easy"
      slight? =
        a["drive_minutes_delta"] in [1, -1] or a["rating_micro_shift"] == true

      {:ok,
       %{
         "became_easy" => conv["converged"] and not slight?,
         "this_got_easy" => conv["this_got_easy"],
         "volume_only_rejected" => conv["volume_only_rejected"],
         "slight_improvement_rejected" => slight?,
         "semantic_trigger" => if(conv["converged"] and not slight?, do: "convergence_event"),
         "convergence" => conv
       }}
    end
  end

  defp compress_world(a, known, possible, easy) do
    # Prefer full formation when we want world candidates; else layers-only
    if a["form_full"] == false and not possible["social_opening"] do
      smallest =
        if possible["level"] in ~w(impossible tentative) do
          silence("not_possible")
        else
          SmallestOutput.question_from(%{
            "viability" => %{"viable" => possible["social_opening"]},
            "actionability" => get_in(possible, ["layers", "actionability"]) || %{}
          })
        end

      {:ok,
       %{
         "smallest" => smallest,
         "known" => known,
         "possible" => possible,
         "easy" => easy
       }}
    else
      case OpportunityFormation.form(
             Map.merge(a, %{
               "opening_alone_ok" => a["opening_alone_ok"] != false,
               "unknowns_before" => a["unknowns_before"]
             })
           ) do
        {:ok, formed} ->
          # Gate: only surface opportunity if became easy or strong actionable
          smallest = formed["smallest"]

          smallest =
            if smallest["kind"] == "opportunity" and easy["became_easy"] == false and
                 a["require_convergence"] == true do
              silence("not_yet_easy")
            else
              smallest
            end

          {:ok, Map.put(formed, "smallest", smallest)}

        err ->
          err
      end
    end
  end

  defp gate(a) do
    cond do
      a["blocked"] == true -> {:error, :blocked}
      a["peer_location_query"] == true -> {:error, :peer_location_query_forbidden}
      true -> :ok
    end
  end

  defp phase_after(%{"kind" => "opportunity"}, _), do: "human_choice"
  defp phase_after(%{"kind" => "minimum_question"}, _), do: "human_choice"
  defp phase_after(%{"kind" => "nothing"}, %{"set" => true}), do: "calm"
  defp phase_after(%{"kind" => "nothing"}, _), do: "quiet"
  defp phase_after(_, _), do: "quiet"

  defp human_job(%{"kind" => "opportunity"}), do: ~w(yes no not_that_one book_it)
  defp human_job(%{"kind" => "minimum_question"}), do: ~w(answer_one_thing)
  defp human_job(_), do: []

  defp silence(reason) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "feed" => false,
      "heat_map" => false,
      "authorizes_set" => false,
      "then_get_quiet" => true
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
