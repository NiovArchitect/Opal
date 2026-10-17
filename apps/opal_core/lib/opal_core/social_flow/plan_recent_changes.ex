defmodule OpalCore.SocialFlow.PlanRecentChanges do
  @moduledoc """
  Repair #16 (W4, P3) — the missing `ProductShell.record_recent_change/1`
  producer.

  Repair #15 left Home's "recent changes" with zero producers and
  explicitly refused a drive-time-only half-wiring: a partial history
  presented as complete would be a lie. This module is therefore called
  from EVERY material plan-mutation path, post-commit (never inside the
  mutation transaction):

  | Mutation | Call site | Event |
  |---|---|---|
  | revision accepted & applied (schedule) | `SocialFlow.respond_to_revision/1` applied branch | `:schedule_changed` (or `:cancelled` for a cancel revision) |
  | lead direct schedule edit | `SocialFlow.change_plan_schedule/1` success branch | `:schedule_changed` |
  | journey material change | `JourneyAuthority.material_change/3` committed branch | `:fields_changed` (copy built from the revision's own proposed_changes) |
  | direct cancel | `SocialFlow.cancel_plan/1` success branch | `:cancelled` |

  A revision REJECT, a partial approval, and a refused/illegal mutation
  mutate nothing, so they record nothing — copy must never claim a change
  that did not happen.

  Recipients are the plan's own people only: `PlanParticipant` rows plus
  the creator; for chat plans without participant rows, the conversation
  members (the same fallback `cancel_plan` uses for notifications). An
  outsider can neither cause (every call site is behind the mutation's
  own authorization) nor read (rows are owner-scoped in the shell) an
  entry.

  Copy is built ONLY from the post-mutation plan row and the mutation's
  own recorded facts (the revision's proposed_changes / the edit's field
  and value) — never from chat text.

  Idempotency: one entry per owner per mutation event. The event key is
  the mutation's revision id where the mutation creates one (revision
  accept, direct edit, journey change — each is a distinct PlanRevision
  row, so change→cancel and accept→change→change sequences each record
  exactly one entry per step), and the literal "cancel" for a direct
  cancel (terminal: it can happen at most once per plan).
  """

  import Ecto.Query

  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanParticipant,
    PlanRevision,
    ProductShell,
    SharedPlan
  }

  @doc """
  Record a cancellation for every plan participant/owner.

  `event_key` distinguishes the cancelling mutation (revision id for a
  revision-applied cancel, "cancel" for a direct cancel).
  """
  def record_cancelled(%SharedPlan{} = plan, event_key) when is_binary(event_key) do
    title = display_title(plan)
    record(plan, event_key, title, "#{title} was cancelled.")
  end

  @doc """
  Record a schedule change. `field`/`new_value` are the mutation's own
  recorded facts (revision chain / direct-edit arguments) — the copy
  claims exactly that field changed to exactly that value.
  """
  def record_schedule_changed(%SharedPlan{} = plan, event_key, field, new_value)
      when is_binary(event_key) do
    title = display_title(plan)

    explanation =
      case {field, present(new_value)} do
        {"time_label", v} when is_binary(v) -> "#{title} moved to #{v}."
        {"date_label", v} when is_binary(v) -> "#{title} moved to #{v}."
        {"location", v} when is_binary(v) -> "#{title} will now meet at #{v}."
        _ -> "#{title} schedule was updated."
      end

    record(plan, event_key, title, explanation)
  end

  @doc """
  Record a Journey material change. Copy is built from the accepted
  revision's own `proposed_changes` read against the post-change plan
  row, so it only ever names fields the revision actually carried.
  """
  def record_fields_changed(%SharedPlan{} = plan, %PlanRevision{} = revision) do
    changes = revision.proposed_changes || %{}
    title = display_title(plan)

    explanation =
      cond do
        is_binary(present(changes["time_label"])) ->
          "#{title} moved to #{plan.time_label || changes["time_label"]}."

        is_binary(present(changes["location"])) ->
          "#{title} will now meet at #{plan.location || changes["location"]}."

        is_binary(present(changes["start_at"])) and is_binary(present(plan.time_label)) ->
          "#{title} moved to #{plan.time_label}."

        true ->
          "#{title} was updated."
      end

    record(plan, "rev-#{revision.id}", title, explanation)
  end

  @doc "The plan's own people: participants + creator, else conversation members."
  def recipients(%SharedPlan{} = plan) do
    ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()
      |> Enum.filter(&is_binary/1)

    ids =
      if ids == [] and is_binary(plan.conversation_id) do
        from(m in ConversationMember,
          where: m.conversation_id == ^plan.conversation_id,
          select: m.user_id
        )
        |> Repo.all()
        |> Enum.filter(&is_binary/1)
      else
        ids
      end

    ids = if is_binary(plan.created_by_user_id), do: [plan.created_by_user_id | ids], else: ids
    Enum.uniq(ids)
  end

  # --- internals ---

  defp record(%SharedPlan{} = plan, event_key, title, explanation) do
    results =
      Enum.map(recipients(plan), fn owner ->
        ProductShell.record_recent_change(%{
          owner_user_id: owner,
          title: title,
          explanation: explanation,
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          material: true,
          privacy_class: "shared",
          idempotency_key: "rc16-#{owner}-#{plan.id}-#{event_key}"
        })
      end)

    {:ok, results}
  rescue
    _ -> {:error, :recent_change_failed}
  end

  defp display_title(%SharedPlan{title: t}) when is_binary(t) and t != "", do: t
  defp display_title(_), do: "Plan"

  defp present(v) when is_binary(v) do
    case String.trim(v) do
      "" -> nil
      s -> s
    end
  end

  defp present(_), do: nil
end
