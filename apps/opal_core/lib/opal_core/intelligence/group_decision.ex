defmodule OpalCore.Intelligence.GroupDecision do
  @moduledoc """
  Group decision state tracking + mediation (Paste C).

  ## Ground truth (Phase 0)
  - Groups: same `conversations` + `conversation_members`; composition `"group"` when
    member_count >= 3 (`Messages.list_conversations/1`).
  - Create: `Messages.create_group_conversation/3`, `Messages.ensure_direct_conversation/2`.
  - Opal is NOT a conversation_members row in social groups — posts only in Opal Center
    (`OpalConversations`). Mediation delivery: draft to owner 1:1; owner approves send.
  - Trust decision: LLM NEVER posts to a group unprompted (founder — not tunable without approval).

  Consensus (rules counting):
  - reached: one proposal >60% active supporters AND zero opponents
  - emerging: plurality supporters AND no proposal >30% opponents
  - blocked: two+ proposals each >30% supporters
  - abandoned: no activity 7 days
  - open: else
  Active participants: sent ≥1 message in last 14 days.
  """

  require Logger

  alias OpalCore.Intelligence.LlmAdapter
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.GroupDecisionState

  @doc "Ingest a group message signal into decision state."
  def ingest(account_id, conversation_id, attrs) when is_binary(account_id) do
    topic = attrs[:topic] || attrs["topic"] || "group plan"
    intent = attrs[:intent] || attrs["intent"]
    body = attrs[:body] || attrs["body"] || ""
    sender_id = attrs[:sender_id] || attrs["sender_id"]
    participants = List.wrap(attrs[:participant_ids] || attrs["participant_ids"])
    option = attrs[:option] || attrs["option"]

    row = get_or_create(account_id, conversation_id, topic)

    row =
      cond do
        intent in ["plan.propose", "plan_proposal", "plan.propose"] and is_binary(option) and
            option != "" ->
          add_proposal(row, option, sender_id, participants)

        true ->
          maybe_stance(row, body, sender_id, participants)
      end

    message_count = attrs[:message_count] || attrs["message_count"] || 0
    row = maybe_silence(row, participants, message_count)
    status = compute_consensus(row, participants)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    row
    |> GroupDecisionState.changeset(%{
      proposals: row.proposals || [],
      silent_participants: row.silent_participants || [],
      consensus_status: status,
      last_activity_at: now
    })
    |> Repo.update()
  end

  def ingest(_, _, _), do: {:error, :invalid}

  def summarize(%GroupDecisionState{} = s) do
    props =
      Enum.map(s.proposals || [], fn p ->
        text = p["proposal_text"] || p[:proposal_text]
        sup = length(p["supporters"] || [])
        opp = length(p["opponents"] || [])
        "#{text} (#{sup} supporters, #{opp} opponents)"
      end)

    silent = Enum.join(s.silent_participants || [], ", ")

    "#{s.topic}: #{Enum.join(props, "; ")}. Silent: #{silent}. Status: #{s.consensus_status}."
  end

  def summarize(_), do: nil

  @doc "Generate mediation draft when status is blocked. Owner delivery only."
  def mediate(%GroupDecisionState{consensus_status: "blocked"} = s) do
    # Founder: mediation requires owner approval — never post to group unprompted.
    props = s.proposals || []

    if length(props) < 2 do
      {:error, :not_split}
    else
      prompt = mediation_prompt(props, s.silent_participants || [])

      case LlmAdapter.readiness() do
        :ready ->
          case LlmAdapter.chat(
                 [
                   %{role: "system", content: prompt},
                   %{role: "user", content: "Draft the mediation message."}
                 ],
                 temperature: 0.4
               ) do
            {:ok, %{content: content}} ->
              {:ok, String.slice(content, 0, 500)}

            _ ->
              {:ok, rules_mediation(props)}
          end

        _ ->
          {:ok, rules_mediation(props)}
      end
    end
  end

  def mediate(_), do: {:error, :not_blocked}

  def dismiss_mediation(account_id, id) do
    case Repo.get_by(GroupDecisionState, id: id, account_id: account_id) do
      %GroupDecisionState{} = row ->
        until = DateTime.add(DateTime.utc_now(), 7 * 86_400, :second) |> DateTime.truncate(:microsecond)

        row
        |> GroupDecisionState.changeset(%{mediation_dismissed_until: until})
        |> Repo.update()

      nil ->
        {:error, :not_found}
    end
  end

  defp get_or_create(account_id, conversation_id, topic) do
    case Repo.get_by(GroupDecisionState,
           account_id: account_id,
           conversation_id: conversation_id,
           topic: topic
         ) do
      %GroupDecisionState{} = row ->
        row

      nil ->
        {:ok, row} =
          %GroupDecisionState{}
          |> GroupDecisionState.changeset(%{
            account_id: account_id,
            conversation_id: conversation_id,
            topic: topic,
            proposals: [],
            consensus_status: "open",
            silent_participants: [],
            last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
          })
          |> Repo.insert()

        row
    end
  end

  defp add_proposal(row, text, sender_id, participants) do
    props = row.proposals || []

    case Enum.find_index(props, fn p ->
           String.downcase(p["proposal_text"] || "") == String.downcase(text)
         end) do
      nil ->
        prop = %{
          "proposal_text" => text,
          "proposed_by_person_id" => sender_id,
          "proposed_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "supporters" => Enum.uniq([sender_id | []]),
          "opponents" => [],
          "undecided" => Enum.reject(participants, &(&1 == sender_id))
        }

        %{row | proposals: props ++ [prop]}

      idx ->
        prop = Enum.at(props, idx)
        supporters = Enum.uniq([sender_id | prop["supporters"] || []])
        prop = %{prop | "supporters" => supporters}
        %{row | proposals: List.replace_at(props, idx, prop)}
    end
  end

  defp maybe_stance(row, body, sender_id, _participants) when is_binary(body) do
    agree? = Regex.match?(~r/\b(sounds good|\+1|yes|i'm in|im in|works for me|love it)\b/i, body)
    disagree? = Regex.match?(~r/\b(not feeling|rather|nope|prefer|against|hate that)\b/i, body)

    cond do
      agree? and row.proposals != [] ->
        update_stance(row, sender_id, :support)

      disagree? and row.proposals != [] ->
        update_stance(row, sender_id, :oppose)

      true ->
        # LLM stance for nuanced — rules-only fallback already applied
        row
    end
  end

  defp maybe_stance(row, _, _, _), do: row

  defp update_stance(row, sender_id, :support) do
    props =
      case row.proposals do
        [first | rest] ->
          supporters = Enum.uniq([sender_id | first["supporters"] || []])
          opponents = Enum.reject(first["opponents"] || [], &(&1 == sender_id))
          [%{first | "supporters" => supporters, "opponents" => opponents} | rest]

        _ ->
          row.proposals
      end

    %{row | proposals: props}
  end

  defp update_stance(row, sender_id, :oppose) do
    props =
      case row.proposals do
        [first | rest] ->
          opponents = Enum.uniq([sender_id | first["opponents"] || []])
          supporters = Enum.reject(first["supporters"] || [], &(&1 == sender_id))
          [%{first | "supporters" => supporters, "opponents" => opponents} | rest]

        _ ->
          row.proposals
      end

    %{row | proposals: props}
  end

  defp maybe_silence(row, participants, message_count) when message_count >= 10 do
    stanced =
      (row.proposals || [])
      |> Enum.flat_map(fn p -> (p["supporters"] || []) ++ (p["opponents"] || []) end)
      |> MapSet.new()

    silent = Enum.reject(participants, &MapSet.member?(stanced, &1))
    %{row | silent_participants: silent}
  end

  defp maybe_silence(row, _, _), do: row

  def compute_consensus(row, participants) do
    active = Enum.uniq(participants)
    n = max(length(active), 1)
    props = row.proposals || []

    scores =
      Enum.map(props, fn p ->
        %{
          supporters: length(p["supporters"] || []),
          opponents: length(p["opponents"] || []),
          pct_sup: length(p["supporters"] || []) / n,
          pct_opp: length(p["opponents"] || []) / n
        }
      end)

    split? = length(Enum.filter(scores, &(&1.pct_sup > 0.3))) >= 2

    cond do
      # Genuine split takes precedence even if one side also clears 60%
      split? ->
        "blocked"

      Enum.any?(scores, &(&1.pct_sup > 0.6 and &1.opponents == 0)) ->
        "reached"

      scores != [] and Enum.max_by(scores, & &1.supporters).supporters > 0 and
          not Enum.any?(scores, &(&1.pct_opp > 0.3)) ->
        "emerging"

      abandoned?(row) ->
        "abandoned"

      true ->
        "open"
    end
  end

  defp abandoned?(%{last_activity_at: %DateTime{} = t}) do
    DateTime.diff(DateTime.utc_now(), t, :second) > 7 * 86_400
  end

  defp abandoned?(_), do: false

  defp mediation_prompt(props, silent) do
    labeled =
      Enum.map_join(props, "\n", fn p ->
        "- #{p["proposal_text"]} supported by #{inspect(p["supporters"])}"
      end)

    """
    Two proposals have split the group:
    #{labeled}
    Silent: #{inspect(silent)}.
    Propose a specific compromise or a fair decision mechanism (vote, try-one-then-the-other,
    split the difference on time). Be concrete — name the actual compromise, not 'find middle ground.'
    Consider: do the proposals actually conflict, or could both happen? Keep it under 80 words.
    Warm, decisive, not wishy-washy.
    """
  end

  defp rules_mediation([a, b | _]) do
    "The group's split between #{a["proposal_text"]} and #{b["proposal_text"]}. " <>
      "Try #{a["proposal_text"]} this time and #{b["proposal_text"]} next — or vote in the thread."
  end

  defp rules_mediation(_), do: "Let's pick a fair way through — vote or try one then the other."
end
