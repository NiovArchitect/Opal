defmodule OpalCore.Intelligence.ActionIntent do
  @moduledoc """
  In-memory action intent emitted by EventSubscriber (brain, not hand).

  Types: :nudge | :plan_update_suggestion | :conflict_alert | :commitment_reminder | :presence_nudge

  Draft copy may be LLM-written; the DECISION is rules-derived.
  Logs must carry IDs/types only — never private memory content.
  """

  @enforce_keys [:type, :account_id, :reason, :priority]
  defstruct [
    :type,
    :account_id,
    :ref_ids,
    :reason,
    :priority,
    :suggested_copy_draft,
    :conversation_id,
    :plan_id,
    :person_id
  ]

  @types ~w(nudge plan_update_suggestion conflict_alert commitment_reminder presence_nudge)a

  def types, do: @types

  def new(attrs) when is_map(attrs) do
    type = attrs[:type] || attrs["type"]

    if type in @types do
      {:ok,
       %__MODULE__{
         type: type,
         account_id: attrs[:account_id] || attrs["account_id"],
         ref_ids: List.wrap(attrs[:ref_ids] || attrs["ref_ids"]),
         reason: attrs[:reason] || attrs["reason"],
         priority: attrs[:priority] || attrs["priority"] || 50,
         suggested_copy_draft: attrs[:suggested_copy_draft] || attrs["suggested_copy_draft"],
         conversation_id: attrs[:conversation_id] || attrs["conversation_id"],
         plan_id: attrs[:plan_id] || attrs["plan_id"],
         person_id: attrs[:person_id] || attrs["person_id"]
       }}
    else
      {:error, :invalid_type}
    end
  end
end
