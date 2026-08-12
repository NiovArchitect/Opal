defmodule OpalCore.SocialFlow.AlignmentAuthority do
  @moduledoc """
  Single production authority for Still open → Set.

  ProductSignals may recognize plan/proposal evidence. Only this module may
  elevate shared state to Set, using AlignmentState.set_gate_satisfied?/1 and
  PrivateParticipation.invalidates_set?/2 against *current* membership.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember

  alias OpalCore.SocialFlow.{
    AlignmentState,
    GroupComposition,
    PrivateParticipation,
    TrustSafety
  }

  @doc """
  Authoritative Set decision for a conversation.

  `messages` are conversation messages used only as plan/affirmative evidence.
  Affirmatives from non-members are dropped. Private invalidation for the
  active proposal blocks Set without leaking private content.

  Group: required participants from GroupComposition (optional late arrivals
  do not block). Dyad: both members required.
  """
  def authorize_set?(conversation_id, messages, proposal_key \\ nil)
      when is_binary(conversation_id) and is_list(messages) do
    proposal_key = proposal_key || default_proposal_key(messages)
    member_ids = current_member_ids(conversation_id)
    required_ids = GroupComposition.required_participant_ids(conversation_id, messages)
    # Affirmatives must target the active proposal version — not a superseded plan.
    active_from_seq = active_proposal_min_seq(messages, proposal_key)

    message_affirmatives =
      messages
      |> affirmative_message_user_ids(active_from_seq)
      |> Enum.filter(&(&1 in member_ids))

    private_affirmatives =
      PrivateParticipation.affirmative_user_ids(conversation_id, proposal_key)
      |> Enum.filter(&(&1 in member_ids))

    affirmatives = Enum.uniq(message_affirmatives ++ private_affirmatives)

    plan? = plan_evidence?(messages)
    canceled? = cancel_evidence?(messages)
    blocked? = any_pair_blocked?(member_ids)
    private_inv? = PrivateParticipation.invalidates_set?(conversation_id, proposal_key)

    AlignmentState.set_gate_satisfied?(%{
      member_user_ids: member_ids,
      required_participant_ids: required_ids,
      affirmative_user_ids: affirmatives,
      plan_evidence?: plan?,
      canceled?: canceled?,
      blocked?: blocked?,
      private_invalidates?: private_inv?
    })
  end

  def current_member_ids(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: cm.user_id
    )
    |> Repo.all()
    |> Enum.uniq()
  end

  defp any_pair_blocked?(member_ids) when length(member_ids) < 2, do: false

  defp any_pair_blocked?(member_ids) do
    member_ids
    |> Enum.flat_map(fn a ->
      Enum.map(member_ids, fn b ->
        a != b and (TrustSafety.blocked?(a, b) or TrustSafety.blocked?(b, a))
      end)
    end)
    |> Enum.any?()
  end

  # Mirror ProductSignals ready patterns for message-path affirmatives only.
  @ready_patterns [
    ~r/\bi'?m in\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bwe('?re| are) set\b/i,
    ~r/\bit'?s a plan\b/i,
    ~r/\bagreed\b/i,
    ~r/\bsee you (there|then|at)\b/i
  ]

  # Keep aligned with ProductSignals plan-forming set (proposal identity).
  @plan_patterns [
    ~r/\bwe should\b/i,
    ~r/\bstudy together\b/i,
    ~r/\bdinner\b/i,
    ~r/\blunch\b/i,
    ~r/\blet'?s (meet|get|do|plan|study)\b/i,
    ~r/\bdoes .* work\b/i,
    ~r/\bmeet up\b/i,
    ~r/\bget together\b/i
  ]

  @cancel_patterns [
    ~r/\bnot this time\b/i,
    ~r/\bcancel\b/i,
    ~r/\bnot happening\b/i
  ]

  defp affirmative_message_user_ids(messages, min_seq) do
    messages
    |> Enum.filter(fn m ->
      seq = Map.get(m, :server_seq) || Map.get(m, "server_seq")
      seq_ok? = is_nil(min_seq) or (is_integer(seq) and seq >= min_seq)
      seq_ok? and match_any?(m.body || "", @ready_patterns)
    end)
    |> Enum.map(& &1.sender_user_id)
    |> Enum.uniq()
  end

  defp plan_evidence?(messages) do
    Enum.any?(messages, fn m -> match_any?(m.body || "", @plan_patterns) end)
  end

  defp cancel_evidence?(messages) do
    Enum.any?(messages, fn m -> match_any?(m.body || "", @cancel_patterns) end)
  end

  defp match_any?(body, patterns), do: Enum.any?(patterns, &Regex.match?(&1, body))

  # Latest plan-forming message defines the active proposal (mirrors ProductSignals).
  defp default_proposal_key(messages) do
    case active_plan_message(messages) do
      nil -> "prop-default"
      plan_msg -> "prop-" <> to_string(plan_msg.id)
    end
  end

  defp active_plan_message(messages) do
    messages
    |> Enum.filter(fn m -> match_any?(m.body || "", @plan_patterns) end)
    |> List.last()
  end

  # Affirmatives before the active proposal message are stale (superseded plan).
  defp active_proposal_min_seq(messages, proposal_key) do
    plan_msg =
      Enum.find(messages, fn m ->
        "prop-" <> to_string(m.id) == proposal_key
      end) || active_plan_message(messages)

    case plan_msg do
      %{server_seq: seq} when is_integer(seq) -> seq
      _ -> nil
    end
  end
end
