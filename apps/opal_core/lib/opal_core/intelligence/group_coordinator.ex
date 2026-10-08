defmodule OpalCore.Intelligence.GroupCoordinator do
  @moduledoc """
  Group coordination surface (Paste C) — facade over GroupDecision + mediation +
  proactive/weekly briefing hooks.

  ## Ground truth (from paste_cd_ground_truth.md)

  **Groups:** Same `conversations` + `conversation_members` for dyads and groups.
  `composition` is `"group"` when `member_count >= 3`, else `"dyad"`.
  Create: `Messages.create_group_conversation/3` (3–8 humans) /
  `Messages.ensure_direct_conversation/2`.

  **Opal does NOT post as a participant in group threads.** Membership is human
  `user_id` only. Opal speaks as Opal only in Opal Center (`OpalConversations`).
  Mediation drafts go to the **owner 1:1**; owner sends OR drafts the group message.
  NEVER unprompted group posts (founder trust decision).

  **Nudge engine today** surfaces Attention Center cards (`message_draft`) —
  does not open proactive threads. Phase C3 (`ProactiveConversation`) fills that
  gap with a closed trigger list + Opal Center delivery.

  **Graphs Timeline** exists (seed-first); classic week/calendar grid is forbidden.

  **Consensus rules** (see `GroupDecision.compute_consensus/2`):
  reached / emerging / blocked / abandoned / open.

  **Mediation:** on `blocked` → draft to owner Opal Center; dismiss 7d;
  on `reached` → lock-in prompt to owner.
  """

  alias OpalCore.Intelligence.{AttentionBudget, GroupDecision}
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.GroupDecisionState

  defdelegate ingest(account_id, conversation_id, attrs), to: GroupDecision
  defdelegate summarize(state), to: GroupDecision
  defdelegate mediate(state), to: GroupDecision
  defdelegate dismiss_mediation(account_id, id), to: GroupDecision
  defdelegate compute_consensus(row, participants), to: GroupDecision

  @doc """
  When consensus is blocked and not dismissed, draft mediation and deliver to
  owner Opal Center 1:1. Never posts into the group conversation.
  """
  def maybe_mediate_to_owner(%GroupDecisionState{consensus_status: "blocked"} = state) do
    now = DateTime.utc_now()

    cond do
      match?(%DateTime{}, state.mediation_dismissed_until) and
          DateTime.compare(state.mediation_dismissed_until, now) == :gt ->
        {:suppressed, :dismissed}

      true ->
        ref = %{
          topic: state.topic || "mediation",
          date: Date.to_iso8601(Date.utc_today()),
          provenance: "observed"
        }

        case AttentionBudget.request_slot(state.account_id, "mediation", "mediation", ref) do
          {:granted, _} ->
            with {:ok, draft} <- GroupDecision.mediate(state),
                 {:ok, msg} <- post_opal_center(state.account_id, mediation_body(state, draft)) do
              _ = persist_mediation_draft(state, draft)

              _ =
                OpalCore.Intelligence.BroadcastChoreography.broadcast_named(
                  "intelligence:group_blocked",
                  state.account_id,
                  %{
                    "decision_id" => state.id,
                    "conversation_id" => state.conversation_id,
                    "topic" => state.topic,
                    "summary" => draft,
                    "card_state" => "pending"
                  }
                )

              {:ok, %{draft: draft, opal_message_id: msg.id, delivery: :owner_center}}
            end

          {:denied, reason} ->
            {:suppressed, {:attention_budget, reason}}
        end
    end
  end

  def maybe_mediate_to_owner(%GroupDecisionState{consensus_status: "reached"} = state) do
    body =
      "Looks like the group landed on a plan for #{state.topic}. Want me to lock it in?"

    with {:ok, msg} <- post_opal_center(state.account_id, body) do
      _ =
        OpalCore.Intelligence.BroadcastChoreography.broadcast_named(
          "intelligence:group_consensus",
          state.account_id,
          %{
            "decision_id" => state.id,
            "conversation_id" => state.conversation_id,
            "topic" => state.topic,
            "summary" => body
          }
        )

      {:ok, %{lock_in_prompt: true, opal_message_id: msg.id, delivery: :owner_center}}
    end
  end

  def maybe_mediate_to_owner(_), do: {:ok, :noop}

  defp persist_mediation_draft(%GroupDecisionState{} = state, draft) do
    meta =
      (state.mediation_meta || %{})
      |> Map.put("draft", draft)
      |> Map.put_new("card_state", "pending")

    state
    |> GroupDecisionState.changeset(%{mediation_meta: meta})
    |> Repo.update()
  rescue
    _ -> :ok
  end

  defp mediation_body(state, draft) do
    "Your group is split on #{state.topic}. Draft you can send:\n\n#{draft}"
  end

  defp post_opal_center(user_id, body) when is_binary(user_id) and is_binary(body) do
    with {:ok, conversation} <- OpalConversations.get_or_create_conversation(user_id) do
      %OpalMessage{}
      |> OpalMessage.changeset(%{
        "conversation_id" => conversation.id,
        "role" => "opal",
        "body" => String.slice(body, 0, OpalMessage.max_body()),
        "metadata" => %{"source" => "group_coordinator", "generated_at" => DateTime.to_iso8601(DateTime.utc_now())}
      })
      |> Repo.insert()
    end
  end
end
