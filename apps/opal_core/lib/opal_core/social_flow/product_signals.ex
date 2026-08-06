defmodule OpalCore.SocialFlow.ProductSignals do
  @moduledoc """
  Elixir-owned conversation journey signals for the product shell.

  Signals describe **current social meaning of the conversation**, not a person's
  identity. They are proposal-class until users act. Python may later propose
  candidates; Elixir decides eligibility, visibility, and lifecycle.

  Lifecycle (Real People first alignment + SF17):

  - quiet → no signal
  - plan-forming language → "Becoming a plan" (recognized)
  - partial availability / needs another time → "Still open"
  - mutual lightweight agreement → "Set" (not booked / not provider)
  - deferred → "Will know later"
  - canceled → "Not happening"

  Never use booking or provider language unless a real provider action exists.
  Smoke-test message bodies never count as evidence.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SmokeResidue

  @plan_patterns [
    ~r/\bwe should\b/i,
    ~r/\bstudy together\b/i,
    ~r/\bdinner\b/i,
    ~r/\blunch\b/i,
    ~r/\bthursday\b/i,
    ~r/\bwednesday\b/i,
    ~r/\bsaturday\b/i,
    ~r/\blet'?s (meet|get|do|plan|study)\b/i,
    ~r/\bfree after\b/i,
    ~r/\bdoes .* work\b/i,
    ~r/\bmeet up\b/i,
    ~r/\bget together\b/i,
    ~r/\bthis week\b/i
  ]

  @availability_patterns [
    ~r/\bfree after\b/i,
    ~r/\bi('?m| am) free\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bi can do\b/i,
    ~r/\bafter \d/i,
    ~r/\bwednesday works\b/i,
    ~r/\bnot too late\b/i,
    ~r/\bneed another time\b/i,
    ~r/\bi'?m in\b/i
  ]

  # Public "Set" — mutual agreement only, never "booked"
  @ready_patterns [
    ~r/\bi'?m in\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bwe('?re| are) set\b/i,
    ~r/\bit'?s a plan\b/i,
    ~r/\bagreed\b/i,
    ~r/\bsee you (there|then|at)\b/i,
    ~r/\bconfirmed\b/i
  ]

  # Legacy "handled" only for real execution language — map carefully in build_signals
  @handled_patterns [
    ~r/\breservation (is )?confirm/i,
    ~r/\bpickup is confirm/i
  ]

  @later_patterns [
    ~r/\bwill know (after|later)\b/i,
    ~r/\bafter work\b/i,
    ~r/\bnot sure yet\b/i,
    ~r/\blet me check\b/i,
    ~r/\bi'?ll know\b/i,
    ~r/\bneed another time\b/i
  ]

  @cancel_patterns [
    ~r/\bnot this time\b/i,
    ~r/\bcancel\b/i,
    ~r/\bnot happening\b/i
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
        |> Enum.reject(&SmokeResidue.smoke_body?(&1.body))

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
    social =
      messages
      |> Enum.filter(fn m ->
        body = m.body || ""
        not SmokeResidue.smoke_body?(body) and String.trim(body) != ""
      end)

    if social == [] do
      {:ok, []}
    else
      stage = classify_stage(social)
      signals = stage_to_signals(stage, social)
      {:ok, signals}
    end
  end

  defp classify_stage(messages) do
    bodies = Enum.map(messages, &(&1.body || ""))
    last = List.last(bodies) || ""

    cond do
      Enum.any?(bodies, &match_any?(&1, @cancel_patterns)) ->
        :canceled

      Enum.any?(bodies, &match_any?(&1, @handled_patterns)) ->
        # Real execution language only — never generic "done"
        :handled

      # Mutual agreement: at least one "I'm in" / set-class and plan evidence
      plan?(bodies) and Enum.count(bodies, &match_any?(&1, @ready_patterns)) >= 1 and
          Enum.any?(bodies, &match_any?(&1, @availability_patterns)) ->
        :set

      Enum.any?(bodies, &match_any?(&1, @ready_patterns)) and plan?(bodies) ->
        :set

      Enum.any?(bodies, &match_any?(&1, @later_patterns)) or
          match_any?(last, @later_patterns) ->
        :will_know_later

      plan?(bodies) and availability?(bodies) ->
        :still_open

      plan?(bodies) ->
        :plan_forming

      true ->
        :quiet
    end
  end

  defp plan?(bodies), do: Enum.any?(bodies, &match_any?(&1, @plan_patterns))
  defp availability?(bodies), do: Enum.any?(bodies, &match_any?(&1, @availability_patterns))

  defp match_any?(body, patterns), do: Enum.any?(patterns, &Regex.match?(&1, body))

  defp stage_to_signals(:quiet, _messages), do: []

  defp stage_to_signals(stage, messages) do
    sample = evidence_sample(stage, messages)

    {kind, label, status} =
      case stage do
        :plan_forming ->
          {"plan_forming", "Becoming a plan", "possibility"}

        :still_open ->
          {"open_loop", "Still open", "possibility"}

        :will_know_later ->
          {"open_loop", "Will know later", "possibility"}

        :set ->
          {"set", "Set", "forming"}

        :ready ->
          {"set", "Set", "forming"}

        :handled ->
          # Only when reservation/pickup language is real execution evidence
          {"follow_through", "Handled", "resolved"}

        :canceled ->
          {"canceled", "Not happening", "resolved"}
      end

    [
      %{
        "kind" => kind,
        "label" => label,
        "status" => status,
        "authority" => "proposal_only",
        "visibility" => "shared_when_authorized",
        "audience" => "conversation_members",
        "privacy_class" => "shared_progress",
        "requires_user_action" => status != "resolved",
        "not_shared_plan" => status != "resolved",
        "not_identity_label" => true,
        "evidence_message_id" => sample.id,
        "evidence_preview" => String.slice(sample.body || "", 0, 120),
        "python_required" => false,
        "created_from" => "conversation_evidence",
        "lifecycle_stage" => Atom.to_string(stage)
      }
    ]
  end

  defp evidence_sample(:plan_forming, messages) do
    Enum.find(messages, List.last(messages), fn m ->
      match_any?(m.body || "", @plan_patterns)
    end)
  end

  defp evidence_sample(:still_open, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @availability_patterns) or match_any?(m.body || "", @plan_patterns)
    end)
  end

  defp evidence_sample(:will_know_later, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @later_patterns)
    end)
  end

  defp evidence_sample(:set, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @ready_patterns)
    end)
  end

  defp evidence_sample(:ready, messages), do: evidence_sample(:set, messages)

  defp evidence_sample(:handled, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @handled_patterns)
    end)
  end

  defp evidence_sample(:canceled, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @cancel_patterns)
    end)
  end

  defp evidence_sample(_, messages), do: List.last(messages)

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end
end
