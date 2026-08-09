defmodule OpalCore.SocialFlow.PythonIntelligenceBoundary do
  @moduledoc """
  Bounded Python proposal interfaces.

  Python may propose:
  - time evidence
  - plan intent
  - preference evidence
  - place evidence
  - minimum-question proposal
  - future ranking

  Python **proposes**. Elixir **authorizes**.

  Model output must never directly:
  - share
  - Set
  - book
  - pay
  - change permission
  - expose private information
  """

  alias OpalCore.SocialFlow.ConversationTimeEvidence
  alias OpalCore.SocialFlow.DynamicIntelligence.PythonProposal
  alias OpalCore.SocialFlow.PlaceGap

  @allowed_result_types ~w(
    time_evidence
    plan_intent
    preference_evidence
    place_evidence
    minimum_question
    collective_fit_ranking
    no_insight
  )

  @forbidden_actions ~w(share set book pay change_permission expose_private auto_share)

  @doc "Admit a Python proposal envelope. Returns authorized structure or reject."
  def admit(proposal, context \\ %{})

  def admit(proposal, context) when is_map(proposal) do
    p = stringify(proposal)
    result_type = p["result_type"] || p["type"]

    cond do
      result_type == "no_insight" ->
        {:ok, :no_proposal}

      result_type not in @allowed_result_types ->
        {:error, :unsupported_result_type}

      has_forbidden_action?(p) ->
        {:error, :forbidden_model_action}

      true ->
        admit_typed(result_type, p, stringify(context || %{}))
    end
  end

  def admit(_, _), do: {:error, :invalid_proposal}

  @doc "True if payload tries to execute authority actions."
  def has_forbidden_action?(proposal) when is_map(proposal) do
    p = stringify(proposal)
    action = p["action"] || p["execute"] || p["authority_action"]

    cond do
      is_binary(action) and action in @forbidden_actions -> true
      p["auto_share"] == true -> true
      p["authorizes_set"] == true -> true
      p["book"] == true -> true
      p["pay"] == true -> true
      true -> false
    end
  end

  def has_forbidden_action?(_), do: true

  def allowed_result_types, do: @allowed_result_types

  defp admit_typed("time_evidence", p, _ctx) do
    candidate = p["candidate"] || p["time_evidence"] || p

    case ConversationTimeEvidence.admit(candidate) do
      {:usable, fact} ->
        {:ok, %{type: :time_evidence, status: :usable, fact: fact}}

      {:needs_confirmation, fact} ->
        {:ok, %{type: :time_evidence, status: :needs_confirmation, fact: fact}}

      {:reject, reason} ->
        {:error, reason}
    end
  end

  defp admit_typed("collective_fit_ranking", p, ctx) do
    venues = ctx["venues"] || []
    participants = ctx["participants"] || []
    time_window = ctx["time_window"] || %{}

    case PythonProposal.validate_and_admit(p, venues, participants, time_window) do
      {:ok, :no_proposal} ->
        {:ok, :no_proposal}

      {:ok, {options, preferred}} ->
        {:ok, %{type: :place_ranking, options: options, preferred: preferred}}

      {:error, _} = err ->
        err
    end
  end

  defp admit_typed("place_evidence", p, ctx) do
    venues = p["venues"] || ctx["venues"] || []
    participants = ctx["participants"] || []
    time_window = ctx["time_window"] || %{}

    {:ok,
     %{
       type: :place_evidence,
       ranking: PlaceGap.rank_candidates(venues, participants, time_window)
     }}
  end

  defp admit_typed("plan_intent", p, _ctx) do
    intent = p["intent"] || p["plan_intent"]

    if is_binary(intent) and String.trim(intent) != "" do
      conf = to_float(p["confidence"])

      if conf >= 0.5 do
        {:ok,
         %{
           type: :plan_intent,
           intent: intent,
           confidence: conf,
           requires_confirmation: conf < 0.75,
           authorizes_set: false
         }}
      else
        {:error, :confidence_too_low}
      end
    else
      {:error, :invalid_intent}
    end
  end

  defp admit_typed("preference_evidence", p, _ctx) do
    pref = p["preference"] || p["label"]

    if is_binary(pref) do
      {:ok,
       %{
         type: :preference_evidence,
         preference: pref,
         confidence: to_float(p["confidence"]),
         permission_scope: "owner_private",
         authorizes_set: false
       }}
    else
      {:error, :invalid_preference}
    end
  end

  defp admit_typed("minimum_question", p, _ctx) do
    topic = p["topic"] || p["question_topic"]

    if topic in ["time_share", "time_confirm", "time_input", "time_pick", "place_pick"] do
      {:ok,
       %{
         type: :minimum_question,
         topic: topic,
         proposed_prompt: p["proposed_prompt"],
         # Elixir must still choose whether to ask
         authorizes_ask: false
       }}
    else
      {:error, :invalid_topic}
    end
  end

  defp admit_typed(_, _, _), do: {:error, :unsupported_result_type}

  defp to_float(nil), do: 0.0
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp to_float(_), do: 0.0

  defp stringify(%{__struct__: _} = struct), do: struct

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_value(%{__struct__: _} = struct), do: struct
  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v) when is_list(v), do: Enum.map(v, &stringify_value/1)
  defp stringify_value(v), do: v
end
