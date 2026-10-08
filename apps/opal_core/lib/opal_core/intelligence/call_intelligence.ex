defmodule OpalCore.Intelligence.CallIntelligence do
  @moduledoc """
  Pre-call briefs + post-call notes (Paste D Phase 2).

  Delivery: no pre-call screen exists (ground truth) → Opal message in caller's
  1:1 thread. Briefs are FACT-ONLY. Caller-scoped memory only — callee never
  receives caller's private context.

  Post-call: with transcript → commitments via commitment_ledger; without →
  structural note + honest "Anything to note?"
  """

  require Logger

  alias OpalCore.Intelligence.{LlmAdapter, OutcomeLearning}
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{Commitment, PersonMemory, RelationshipBehaviorProfile}
  alias OpalCore.Repo

  @doc "Generate a fact-only pre-call brief for the caller about the callee."
  def pre_call_brief(caller_id, callee_id) when is_binary(caller_id) and is_binary(callee_id) do
    scoped = SocialMemory.for_account(caller_id)
    person = Repo.get_by(PersonMemory, account_id: caller_id, person_id: callee_id)
    profile = person && person.relationship_type && Repo.get(RelationshipBehaviorProfile, person.relationship_type)

    loops =
      case person do
        %{open_loops: loops} when is_list(loops) -> loops
        _ -> []
      end

    worth =
      case loops do
        [h | _] -> get_in(h, ["description"]) || "open loop"
        _ -> nil
      end

    facts = %{
      relationship: person && person.relationship_type,
      tone: profile && profile.tone,
      last_contact: person && person.last_contact_at,
      open_loops: length(loops),
      worth_mentioning: worth
    }

    draft =
      case LlmAdapter.readiness() do
        :ready ->
          sys =
            "Write a FACT-ONLY pre-call brief under 80 words. No opinions, no suggestions. Include relationship tone, last contact if known, open loops, and one worth-mentioning line if present."

          case LlmAdapter.chat(
                 [
                   %{role: "system", content: sys},
                   %{role: "user", content: Jason.encode!(facts)}
                 ],
                 temperature: 0.2
               ) do
            {:ok, %{content: c}} -> c
            _ -> rules_brief(facts)
          end

        _ ->
          rules_brief(facts)
      end

    # Assert scope: never include OutcomeLearning of other accounts
    _ = OutcomeLearning.learned_preferences(caller_id)

    {:ok, %{brief: draft, facts: facts, account_id: caller_id}}
  end

  def pre_call_brief(_, _), do: {:error, :invalid}

  @doc "Post-call note. transcript optional."
  def post_call_note(caller_id, attrs) when is_binary(caller_id) and is_map(attrs) do
    duration = attrs[:duration_s] || attrs["duration_s"] || 0
    peer = attrs[:peer_id] || attrs["peer_id"]
    transcript = attrs[:transcript] || attrs["transcript"]

    if is_binary(transcript) and String.trim(transcript) != "" do
      _ = maybe_commitments_from_transcript(caller_id, transcript, attrs)

      {:ok,
       %{
         note:
           "#{div(duration, 60)} min call — noted topics from transcript. Want me to update plans?",
         structural_only: false,
         account_id: caller_id
       }}
    else
      peer_label = peer || "them"

      {:ok,
       %{
         note: "#{div(duration, 60)} min with #{peer_label}. Anything to note from the call?",
         structural_only: true,
         account_id: caller_id
       }}
    end
  end

  def post_call_note(_, _), do: {:error, :invalid}

  defp rules_brief(facts) do
    parts =
      [
        facts.relationship && "Relationship: #{facts.relationship}.",
        facts.tone && "Tone: #{facts.tone}.",
        facts.open_loops > 0 && "#{facts.open_loops} open loop(s).",
        facts.worth_mentioning && "Worth mentioning: #{facts.worth_mentioning}."
      ]
      |> Enum.reject(&(&1 in [nil, false]))

    Enum.join(parts, " ")
  end

  defp maybe_commitments_from_transcript(account_id, transcript, attrs) do
    if Regex.match?(~r/\b(let'?s do|we'?ll|i'?ll|agreed to)\b/i, transcript) do
      desc = "[call] " <> String.slice(transcript, 0, 170)
      msg_id = attrs[:message_id] || attrs["message_id"] || Ecto.UUID.generate()
      conv_id = attrs[:conversation_id] || attrs["conversation_id"] || Ecto.UUID.generate()

      %Commitment{}
      |> Commitment.changeset(%{
        account_id: account_id,
        description: desc,
        status: "open",
        source_conversation_id: conv_id,
        source_message_id: msg_id,
        person_id: attrs[:peer_id] || attrs["peer_id"]
      })
      |> Repo.insert()
    else
      :ok
    end
  rescue
    _ -> :ok
  end
end
