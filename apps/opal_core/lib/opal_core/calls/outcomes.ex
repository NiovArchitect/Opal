defmodule OpalCore.Calls.Outcomes do
  @moduledoc """
  Records that a final call transcript proposed or accepted a shared-plan change.
  """

  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Repo

  def record(attrs) when is_map(attrs) do
    case %CallOutcome{} |> CallOutcome.changeset(attrs) |> Repo.insert() do
      {:ok, row} -> {:ok, row}
      {:error, _} -> :error
    end
  end

  def record_proposal(call, segment, state) when is_map(state) do
    proposal = state["change_proposal"]

    if is_map(proposal) and proposal["source_segment_id"] == segment.id do
      record(%{
        call_id: call.id,
        conversation_id: call.conversation_id,
        source_segment_ids: [segment.id],
        outcome_type: proposal_type(proposal["field"]),
        entity_id: proposal["value"]
      })
    else
      :skipped
    end
  end

  def record_proposal(_, _, _), do: :skipped

  def record_acceptance(conversation_id, proposal) when is_map(proposal) do
    call_id = proposal["source_call_id"]
    segment_id = proposal["source_segment_id"]

    if proposal["source_type"] == "call_transcript" and is_binary(call_id) and is_binary(segment_id) do
      record(%{
        call_id: call_id,
        conversation_id: conversation_id,
        source_segment_ids: [segment_id],
        outcome_type: acceptance_type(proposal["field"]),
        entity_id: proposal["value"]
      })
    else
      :skipped
    end
  end

  def record_acceptance(_, _), do: :skipped

  defp proposal_type("activity"), do: "activity_proposal"
  defp proposal_type(_), do: "plan_time_proposal"

  defp acceptance_type("activity"), do: "activity_accepted"
  defp acceptance_type(_), do: "plan_time_accepted"
end
