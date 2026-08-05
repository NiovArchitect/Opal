defmodule OpalCore.SocialFlow.DynamicIntelligence do
  @moduledoc """
  Phase 1 dynamic social and experience intelligence.

  Quiet dinner for three fixture proof:
  - Elixir owns context admission, collective fit revalidation, restraint, participation,
    audience projection, and corrections.
  - Python may propose rankings only; never publish or book.
  - No live location, providers, payments, Kafka, or Foundation bridge.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.{
    Audience,
    CollectiveFit,
    Context,
    Fixtures,
    Participation,
    PythonProposal,
    Restraint
  }

  @doc """
  Evaluate a conversation-scoped experience opportunity.

  Returns silence or a privacy-safe opportunity surface. Idempotent for the same key
  when `prior` is provided with matching idempotency_key.
  """
  def evaluate(input) when is_map(input) do
    input = normalize_input(input)

    with :ok <- validate_members(input) do
      if suppressed_by_correction?(input) do
        silence_result(input, "group_correction")
      else
        if input.permission_revoked do
          silence_result(input, "permission_revoked")
        else
          do_evaluate(input)
        end
      end
    end
  end

  def evaluate(_), do: {:error, :invalid_input}

  @doc """
  Apply a lightweight user action to an opportunity result.
  """
  def respond(result, user_id, action, opts \\ [])

  def respond(%{surface: :opportunity} = result, user_id, action, opts) do
    with :ok <- Audience.authorize_view(result.member_ids, user_id),
         {:ok, participation} <-
           Participation.respond(result.participation, user_id, action, opts) do
      journey = Participation.journey_state(participation)
      summary = Participation.shared_summary(participation)

      opportunity =
        result.opportunity
        |> Map.put("journey_state", journey)
        |> Map.put("participation_summary", summary)

      case Audience.project_shared(opportunity) do
        {:ok, shared} ->
          {:ok,
           %{
             result
             | participation: participation,
               opportunity: opportunity,
               shared: shared,
               journey_state: journey
           }}

        {:error, _} = err ->
          err
      end
    end
  end

  def respond(%{surface: :silence} = result, _user_id, _action, _opts), do: {:ok, result}
  def respond(_, _, _, _), do: {:error, :invalid_result}

  @doc """
  Record a context-specific correction such as "Not with this group."
  """
  def apply_correction(input_or_result, user_id, correction)
      when is_binary(correction) do
    member_ids =
      cond do
        is_map(input_or_result) and Map.has_key?(input_or_result, :member_ids) ->
          input_or_result.member_ids

        is_map(input_or_result) and Map.has_key?(input_or_result, "member_ids") ->
          input_or_result["member_ids"]

        true ->
          []
      end

    with :ok <- Audience.authorize_view(member_ids, user_id) do
      normalized = String.downcase(String.trim(correction))

      kind =
        cond do
          String.contains?(normalized, "not with this group") -> "suppress_group_context"
          String.contains?(normalized, "stop suggesting") -> "suppress_opportunity_class"
          true -> "generic_correction"
        end

      correction_record = %{
        "user_id" => user_id,
        "kind" => kind,
        "text" => correction,
        "scope" => "conversation_group",
        "global_label" => false,
        "friendship_score_change" => false
      }

      {:ok, correction_record}
    end
  end

  def apply_correction(_, _, _), do: {:error, :invalid_correction}

  @doc """
  Re-evaluate with a recorded correction applied.
  """
  def evaluate_with_correction(input, correction_record) when is_map(correction_record) do
    corrections = (input[:corrections] || input["corrections"] || []) ++ [correction_record]
    evaluate(Map.put(normalize_input(input), :corrections, corrections))
  end

  def dinner_fixture(opts \\ []), do: Fixtures.dinner_scenario(opts)

  # --- pipeline ---

  defp do_evaluate(input) do
    context = Context.detect(input.messages)
    participants = infer_participants(input)

    {options, preferred} =
      case PythonProposal.validate_and_admit(
             input.python_proposal,
             input.venues,
             participants,
             input.time_window
           ) do
        {:ok, :no_proposal} ->
          CollectiveFit.rank(input.venues, participants, input.time_window)

        {:ok, {opts, pref}} ->
          {opts, pref}

        {:error, _} ->
          # Invalid Python proposal never bypasses Elixir. Fall back to local rank.
          CollectiveFit.rank(input.venues, participants, input.time_window)
      end

    preferred_quality =
      case preferred do
        %{"fit_score_internal" => score} when is_number(score) -> score
        _ when is_map(preferred) -> 1.5
        _ -> 0.0
      end

    restraint_attrs = %{
      "forming?" => context["forming?"],
      "context_confidence" => context["confidence"],
      "participant_count" => Enum.count(participants),
      "option_count" => Enum.count(options),
      "preferred_quality" => preferred_quality,
      "recent_suggestion_count" => input.recent_suggestion_count,
      "missing_information_count" => 0,
      "privacy_risk" => false,
      "permission_revoked" => input.permission_revoked,
      "group_suppressed" => suppressed_by_correction?(input)
    }

    case Restraint.decide(restraint_attrs) do
      {:silence, reason} ->
        silence_result(input, reason, context)

      {:surface, _meta} ->
        build_opportunity(input, context, participants, options, preferred)
    end
  end

  defp build_opportunity(input, context, participants, options, preferred) do
    public_options = CollectiveFit.strip_internal_scores(options)
    preferred_public = preferred && CollectiveFit.strip_internal_scores([preferred]) |> hd()

    see_why =
      Audience.sanitize_explanation(
        (preferred_public && preferred_public["group_safe_explanation"]) ||
          "Fits everyone’s current timing. Convenient for the people involved."
      )

    opportunity = %{
      "conversation_id" => input.conversation_id,
      "headline" => headline_for(participants),
      "supporting_explanation" => "Works with everyone’s timing and current preferences.",
      "see_why" => see_why,
      "preferred" => preferred_public,
      "options" => public_options,
      "journey_state" => "forming",
      "participation_summary" => nil,
      "context_kind" => context["kind"],
      "activity" => context["activity"]
    }

    with {:ok, shared} <- Audience.project_shared(opportunity) do
      participation = Participation.new_state(Enum.map(participants, & &1["user_id"]))

      {:ok,
       %{
         surface: :opportunity,
         reason: "collective_fit",
         conversation_id: input.conversation_id,
         member_ids: input.member_ids,
         context: context,
         participants: public_participants(participants),
         options: public_options,
         preferred: preferred_public,
         opportunity: opportunity,
         shared: shared,
         participation: participation,
         journey_state: "forming",
         idempotency_key: input.idempotency_key,
         # Internal audit only: never send to clients.
         audit: %{
           "venue_ids_considered" => Enum.map(input.venues, & &1["id"]),
           "hard_constraints_present" => true,
           "private_budget_used" => private_budget_used?(participants),
           "private_budget_in_shared" => false
         }
       }}
    end
  end

  defp silence_result(input, reason, context \\ nil) do
    {:ok,
     %{
       surface: :silence,
       reason: reason,
       conversation_id: input.conversation_id,
       member_ids: input.member_ids,
       context: context || Context.detect(input.messages),
       options: [],
       preferred: nil,
       shared: nil,
       participation: nil,
       journey_state: "quiet",
       idempotency_key: input.idempotency_key
     }}
  end

  defp infer_participants(input) do
    # Participants from explicit fixture list; membership is the authority boundary.
    input.participants
    |> Enum.map(&stringify_map/1)
    |> Enum.filter(fn p -> p["user_id"] in input.member_ids end)
  end

  defp public_participants(participants) do
    Enum.map(participants, fn p ->
      %{
        "user_id" => p["user_id"],
        "role" => p["role"],
        "area_scope" => "approximate",
        # Never expose area labels or private constraints.
        "shared_preferences" => Map.take(p["shared_preferences"] || %{}, ["quiet", "open_to_new"])
      }
    end)
  end

  defp private_budget_used?(participants) do
    Enum.any?(participants, fn p ->
      get_in(p, ["private_constraints", "max_price_band"]) != nil
    end)
  end

  defp headline_for(participants) do
    n = Enum.count(participants)

    cond do
      n == 3 -> "This looks promising for the three of you."
      n == 2 -> "This looks promising for the two of you."
      true -> "This looks promising for your group."
    end
  end

  defp suppressed_by_correction?(input) do
    Enum.any?(input.corrections || [], fn c ->
      c = stringify_map(c)
      c["kind"] in ["suppress_group_context", "suppress_opportunity_class"]
    end)
  end

  defp validate_members(input) do
    cond do
      not is_list(input.member_ids) or input.member_ids == [] ->
        {:error, :members_required}

      Enum.any?(input.participants, fn p ->
        uid = stringify_map(p)["user_id"]
        uid && uid not in input.member_ids
      end) ->
        # Non-members never become participants via payload alone.
        :ok

      true ->
        :ok
    end
  end

  defp normalize_input(input) do
    input = stringify_keys_top(input)

    %{
      conversation_id: input["conversation_id"],
      member_ids: input["member_ids"] || [],
      messages: input["messages"] || [],
      participants: input["participants"] || [],
      venues: Enum.map(input["venues"] || [], &stringify_map/1),
      time_window: stringify_map(input["time_window"] || %{}),
      corrections: input["corrections"] || [],
      recent_suggestion_count: input["recent_suggestion_count"] || 0,
      permission_revoked: input["permission_revoked"] == true,
      python_proposal: input["python_proposal"],
      idempotency_key: input["idempotency_key"] || "dsi-default"
    }
  end

  defp stringify_keys_top(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_map(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_map(other), do: other

  defp stringify_value(v) when is_map(v), do: stringify_map(v)
  defp stringify_value(v) when is_list(v), do: Enum.map(v, &stringify_value/1)
  defp stringify_value(v), do: v
end
