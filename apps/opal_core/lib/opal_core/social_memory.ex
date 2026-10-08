defmodule OpalCore.SocialMemory do
  @moduledoc """
  Per-user social memory — cross-conversation intelligence with hard account isolation.

  Hooks into `OpalCore.Intelligence.Pipeline.on_message_created/2` after
  `OpalCore.Intelligence.Extractor.extract/1` (and again from Reasoner/Llm paths via
  `OpalCore.Intelligence.PromptBuilder`). Reads from `person_memories`, `plan_memories`,
  `commitment_ledger`, `conversation_index`, `social_patterns` (all `account_id`-scoped).
  Feeds into `OpalCore.Intelligence.PromptBuilder.build/4` → `LlmExtract` /
  `LlmRespond` → existing `LlmAdapter.chat/2` (adapter unchanged).

  Account identity: `Messages.accept_message` authenticated `sender_user_id` becomes
  `Event.actor_id`. Memory ingest fans out to each `conversation_members.user_id` as
  `account_id` (memory owner). Prompt builds use an explicit `%SocialMemory.Scoped{}`
  so unscoped reads are a shape error.

  Kill switch: `OPAL_MEMORY_ENABLED=false` makes ingest a no-op and skips recall injection.
  """

  alias OpalCore.SocialMemory.{Ingest, Recall, Scoped}

  defdelegate enabled?(), to: Ingest

  @doc "Return a scoped handle. Required for all reads."
  def for_account(account_id) when is_binary(account_id) do
    %Scoped{account_id: account_id}
  end

  def for_account(_), do: raise(ArgumentError, "account_id required")

  @doc """
  Ingest extraction into memory for one account. Failure-isolated.
  """
  def ingest(account_id, conversation_id, message_id, extraction, metadata \\ %{}) do
    Ingest.ingest(account_id, conversation_id, message_id, extraction, metadata)
  end

  def recall_for_conversation(%Scoped{} = scoped, conversation_id) do
    Recall.recall_for_conversation(scoped, conversation_id)
  end

  def detect_conflicts(%Scoped{} = scoped), do: Recall.detect_conflicts(scoped)

  def surface_nudges(%Scoped{} = scoped), do: Recall.surface_nudges(scoped)

  @doc "Dismiss a surfaced nudge; 2 dismissals → 30-day suppression."
  def dismiss_nudge(account_id, nudge_id) when is_binary(account_id) and is_binary(nudge_id) do
    alias OpalCore.Repo
    alias OpalCore.SocialMemory.SurfacedNudge

    case Repo.get(SurfacedNudge, nudge_id) do
      %SurfacedNudge{account_id: ^account_id} = row ->
        count = (row.dismissed_count || 0) + 1

        attrs = %{
          dismissed_count: count,
          status: "dismissed"
        }

        attrs =
          if count >= 2 do
            Map.put(
              attrs,
              :suppressed_until,
              DateTime.utc_now() |> DateTime.add(30 * 86_400, :second) |> DateTime.truncate(:microsecond)
            )
          else
            attrs
          end

        row |> SurfacedNudge.changeset(attrs) |> Repo.update()

      %SurfacedNudge{} ->
        {:error, :wrong_account}

      nil ->
        {:error, :not_found}
    end
  end
end
