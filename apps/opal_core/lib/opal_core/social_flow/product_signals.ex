defmodule OpalCore.SocialFlow.ProductSignals do
  @moduledoc """
  Bounded first-signal surface for SF15.

  Detects conversation evidence that a plan may be forming.
  Does not create shared plans. Proposal-class only until users act.
  Elixir-owned; no Python required for this vertical.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.Repo

  @plan_patterns [
    ~r/\bwe should\b/i,
    ~r/\bdinner\b/i,
    ~r/\blunch\b/i,
    ~r/\bthursday\b/i,
    ~r/\bsaturday\b/i,
    ~r/\blet'?s (meet|get|do|plan)\b/i,
    ~r/\bfree after\b/i,
    ~r/\bdoes .* work\b/i
  ]

  @doc """
  Returns signals visible to a conversation member. Empty if not a member.
  """
  def signals_for_conversation(conversation_id, user_id) do
    if member?(conversation_id, user_id) do
      messages =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [desc: m.server_seq],
          limit: 40
        )
        |> Repo.all()
        |> Enum.reverse()

      build_signals(messages)
    else
      {:error, :not_a_member}
    end
  end

  def signals_for_user_home(user_id) do
    conv_ids =
      from(cm in ConversationMember,
        where: cm.user_id == ^user_id,
        select: cm.conversation_id
      )
      |> Repo.all()

    Enum.flat_map(conv_ids, fn cid ->
      case signals_for_conversation(cid, user_id) do
        {:ok, signals} ->
          Enum.map(signals, &Map.put(&1, "conversation_id", cid))

        _ ->
          []
      end
    end)
  end

  defp build_signals(messages) do
    evidence =
      messages
      |> Enum.filter(fn m -> Enum.any?(@plan_patterns, &Regex.match?(&1, m.body || "")) end)
      |> Enum.take(-3)

    signals =
      if evidence == [] do
        []
      else
        sample = List.last(evidence)

        [
          %{
            "kind" => "plan_forming",
            "label" => "Becoming a plan",
            "status" => "possibility",
            "authority" => "proposal_only",
            "requires_user_action" => true,
            "not_shared_plan" => true,
            "evidence_message_id" => sample.id,
            "evidence_preview" => String.slice(sample.body || "", 0, 120),
            "python_required" => false
          }
        ]
      end

    {:ok, signals}
  end

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end
end
